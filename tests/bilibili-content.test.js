const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const DIGEST_VIDEO = require("../platforms.js");
const source = fs.readFileSync(path.join(__dirname, "../bilibili-content.js"), "utf8");

function harness({ hasToolbar = true } = {}) {
  class Element {
    constructor() { this.children = []; this.listeners = {}; }
    get isConnected() { return this === body || !!this.parentElement?.isConnected; }
    get nextElementSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1] || null; }
    append(...children) { for(const c of children) { c.remove(); this.children.push(c); c.parentElement = this; } }
    after(child) { child.remove(); this.parentElement.children.splice(this.parentElement.children.indexOf(this) + 1, 0, child); child.parentElement = this.parentElement; }
    attachShadow() { return this.shadow = new Element(); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    setAttribute() {}
    remove() { if(this.parentElement) this.parentElement.children = this.parentElement.children.filter(c => c !== this); this.parentElement = null; }
  }
  const body = new Element();
  const toolbar = new Element(), actions = new Element(); toolbar.append(actions);
  if (hasToolbar) body.append(toolbar);
  const sent = [];
  const player = { currentTime: 45, duration: 300, paused: true, play() { this.paused = false; return Promise.resolve(); } };
  let onMessage, tick;
  const sandbox = {
    DIGEST_VIDEO, URL, location: new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=2"),
    document: { body, createElement: () => new Element(), querySelector: (selector) => {
      if (selector === '.video-toolbar-left') return actions.isConnected ? actions : null;
      if (selector.includes("bwp-video")) return player;
      if (selector.includes("h1")) return { textContent: "第二课" };
      return null;
    } },
    chrome: { runtime: {
      onMessage: { addListener: fn => onMessage = fn },
      sendMessage: async message => { sent.push(message); return { success: true }; },
    } },
    setInterval: fn => tick = fn, setTimeout: () => 0, clearTimeout() {},
  };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return { sandbox, body, toolbar, actions, player, sent, tick: () => tick(), message: (message) => {
    let response; onMessage(message, {}, r => response = r); return response;
  } };
}

test("Bilibili controls open the panel and save current-part timestamp notes", async () => {
  const h = harness();
  const controls = h.actions.nextElementSibling.shadow.children[1];
  assert.equal(controls.children[0].textContent, "字幕");
  await controls.children[0].listeners.click();
  assert.equal(h.sent.at(-1).action, "openSidePanel");
  await controls.children[1].listeners.click();
  assert.equal(h.sent.at(-1).action, "saveNote");
  assert.equal(h.sent.at(-1).videoId, "bili:BV1a6Yx62EH4:p2");
  assert.equal(h.sent.at(-1).timestamp, 42);
});

test("custom Bilibili media elements support seek, playback state and stale-part guards", () => {
  const h = harness();
  assert.equal(h.message({ action: "getCurrentTime" }).currentTime, 45);
  assert.equal(h.message({ action: "seekTo", seconds: 12.5, videoId: "bili:BV1a6Yx62EH4:p2" }).success, true);
  assert.equal(h.player.currentTime, 12.5);
  assert.equal(h.player.paused, false);
  assert.equal(h.message({ action: "seekTo", seconds: 90, videoId: "bili:BV1a6Yx62EH4:p1" }).error, "VIDEO_CHANGED");
  assert.equal(h.player.currentTime, 12.5);
  assert.equal(h.message({ action: "seekTo", seconds: -3 }).success, false);
});

test('an unreadable custom player uses its displayed clock, never a fake zero', () => {
  const h=harness();
  delete h.player.currentTime;
  const query=h.sandbox.document.querySelector;
  let clock='01:02:03';
  h.sandbox.document.querySelector=selector=>selector.includes('ctrl-time-current')?{textContent:clock}:query(selector);
  assert.equal(h.message({action:'getCurrentTime'}).currentTime,3723);
  clock='00:17';assert.equal(h.message({action:'getCurrentTime'}).currentTime,17);
  clock='--:--';assert.equal(h.message({action:'getCurrentTime'}).error,'PLAYER_TIME_UNAVAILABLE');
  clock='01:99:00';assert.equal(h.message({action:'getCurrentTime'}).error,'PLAYER_TIME_UNAVAILABLE');
});

test('a loading native player uses the clock instead of reporting time zero', () => {
  const h=harness();h.player.readyState=0;h.player.currentTime=0;
  const query=h.sandbox.document.querySelector;
  h.sandbox.document.querySelector=selector=>selector.includes('ctrl-time-current')?{textContent:'03:45'}:query(selector);
  assert.equal(h.message({action:'getCurrentTime'}).currentTime,225);
});

test("SPA part changes notify once and controls disappear off video pages", () => {
  const h = harness();
  h.tick(); h.tick();
  assert.equal(h.toolbar.children.length, 2);
  assert.equal(h.sent.length, 1);
  h.sandbox.location = new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=3");
  h.tick();
  assert.equal(h.sent.at(-1).videoId, "bili:BV1a6Yx62EH4:p3");
  h.sandbox.location = new URL("https://www.bilibili.com/");
  h.tick();
  assert.equal(h.toolbar.children.length, 1);
});

test('entry waits for the action bar, reattaches after replacement and never floats on the body', () => {
  const h = harness({hasToolbar:false});
  assert.equal(h.body.children.length, 0);
  assert.equal(h.message({action:'getCurrentTime'}).currentTime, 45);
  h.body.append(h.toolbar); h.tick();
  const entry = h.actions.nextElementSibling;
  assert.ok(entry?.isConnected);
  entry.remove(); h.tick();
  assert.equal(h.actions.nextElementSibling, entry);
  h.toolbar.remove(); h.tick();
  assert.equal(h.body.children.length, 0);
  h.body.append(h.toolbar); h.tick(); h.tick();
  assert.equal(h.toolbar.children.length, 2);
  assert.equal(h.actions.nextElementSibling, entry);
  h.sandbox.__digestBiliController.dispose();
  assert.equal(h.toolbar.children.length, 1);
});
