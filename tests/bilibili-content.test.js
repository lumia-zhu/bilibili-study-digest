const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const DIGEST_VIDEO = require("../platforms.js");
const source = fs.readFileSync(path.join(__dirname, "../bilibili-content.js"), "utf8");

function harness() {
  class Element {
    constructor() { this.children = []; this.listeners = {}; this.isConnected = false; }
    append(...children) { for(const c of children) { if(c.parentElement) c.parentElement.children = c.parentElement.children.filter(x => x !== c); this.children.push(c); c.isConnected = true; c.parentElement = this; } }
    attachShadow() { return this.shadow = new Element(); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    setAttribute() {}
    remove() { this.isConnected = false; }
  }
  const body = new Element();
  const sent = [];
  const player = { currentTime: 45, duration: 300, paused: true, play() { this.paused = false; return Promise.resolve(); } };
  let onMessage, tick;
  const sandbox = {
    DIGEST_VIDEO, URL, location: new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=2"),
    document: { body, createElement: () => new Element(), querySelector: (selector) => {
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
  return { sandbox, body, player, sent, tick: () => tick(), message: (message) => {
    let response; onMessage(message, {}, r => response = r); return response;
  } };
}

test("Bilibili controls open the panel and save current-part timestamp notes", async () => {
  const h = harness();
  const controls = h.body.children[0].shadow.children[1];
  assert.equal(controls.children[0].textContent, "BiliMemo · 字幕");
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
  assert.equal(h.body.children.length, 1);
  assert.equal(h.sent.length, 1);
  h.sandbox.location = new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=3");
  h.tick();
  assert.equal(h.sent.at(-1).videoId, "bili:BV1a6Yx62EH4:p3");
  h.sandbox.location = new URL("https://www.bilibili.com/");
  h.tick();
  assert.equal(h.body.children[0].isConnected, false);
});
