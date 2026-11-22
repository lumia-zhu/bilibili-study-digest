const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const DIGEST_VIDEO = require("../platforms.js");
const source = fs.readFileSync(path.join(__dirname, "../bilibili-content.js"), "utf8");

function harness({ hasToolbar = true } = {}) {
  class Element {
    constructor() { this.children = []; this.listeners = {}; this.attributes = new Set(); this.style = {}; this.rect = {left:0,top:100,width:114,height:36}; }
    toggleAttribute(name,on) { if(on)this.attributes.add(name);else this.attributes.delete(name); }
    getBoundingClientRect() { const rect={...this.rect};if(this.attributes.has('data-compact'))rect.width=64;return {...rect,right:rect.left+rect.width,bottom:rect.top+rect.height}; }
    querySelector() { return null; }
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
  toolbar.rect.width = 668; actions.rect.width = 400; actions.rect.height = 28;
  if (hasToolbar) body.append(toolbar);
  const sent = [];
  const player = { currentTime: 45, duration: 300, paused: true, play() { this.paused = false; return Promise.resolve(); } };
  let onMessage, tick, frame;
  const listeners = new Map();
  const addEventListener = (name, fn) => listeners.set(name, fn);
  const removeEventListener = name => listeners.delete(name);
  const sandbox = {
    DIGEST_VIDEO, URL, location: new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=2"),
    innerWidth:1440, innerHeight:1000, getComputedStyle:()=>({visibility:'visible',display:'block'}),
    window:{addEventListener,removeEventListener},
    document: { body, addEventListener, removeEventListener, createElement: () => new Element(), querySelector: (selector) => {
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
    requestAnimationFrame: fn => {frame=fn;return 1;}, cancelAnimationFrame: () => {frame=null;},
  };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return { sandbox, body, toolbar, actions, player, sent, listeners,
    get entry() {return body.children.find(el=>el.id==='bili-digest-controls');},
    event(name) {listeners.get(name)?.();const pending=frame;frame=null;pending?.();},
    tick: () => tick(), message: (message) => {
    let response; onMessage(message, {}, r => response = r); return response;
  } };
}

test("Bilibili controls open the panel and save current-part timestamp notes", async () => {
  const h = harness();
  const controls = h.entry.shadow.children[1];
  assert.equal(controls.children[0].textContent, "AI总结");
  await controls.children[0].listeners.click();
  assert.equal(h.sent.at(-1).action, "openSidePanel");
  h.player.currentTime = 45.625;
  await controls.children[1].listeners.click();
  assert.equal(h.sent.at(-1).action, "saveNote");
  assert.equal(h.sent.at(-1).videoId, "bili:BV1a6Yx62EH4:p2");
  assert.equal(h.sent.at(-1).timestamp, 45.625);
  assert.equal(h.sent.at(-1).timeSource, "media");
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

test('an unreadable custom player uses its displayed clock, never a fake zero', async () => {
  const h=harness();
  delete h.player.currentTime;
  const query=h.sandbox.document.querySelector;
  let clock='01:02:03';
  h.sandbox.document.querySelector=selector=>selector.includes('ctrl-time-current')?{textContent:clock}:query(selector);
  assert.equal(h.message({action:'getCurrentTime'}).currentTime,3723);
  const bookmark = h.entry.shadow.children[1].children[1];
  await bookmark.listeners.click();
  assert.equal(h.sent.at(-1).timestamp,3723);
  assert.equal(h.sent.at(-1).timeSource,'clock');
  let seekUrl;
  h.sandbox.location.assign = url => {seekUrl=url;};
  assert.equal(h.message({action:'seekTo',seconds:12.75}).success,true);
  assert.equal(new URL(seekUrl).searchParams.get('t'),'12.75');
  assert.equal(h.player.currentTime,undefined);
  clock='00:17';assert.equal(h.message({action:'getCurrentTime'}).currentTime,17);
  clock='--:--';assert.equal(h.message({action:'getCurrentTime'}).error,'PLAYER_TIME_UNAVAILABLE');
  const count=h.sent.length;
  await bookmark.listeners.click();
  assert.equal(h.sent.length,count);
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
  assert.equal(h.toolbar.children.length, 1);
  assert.equal(h.body.children.length, 2);
  assert.equal(h.sent.length, 1);
  h.sandbox.location = new URL("https://www.bilibili.com/video/BV1a6Yx62EH4/?p=3");
  h.tick();
  assert.equal(h.sent.at(-1).videoId, "bili:BV1a6Yx62EH4:p3");
  h.sandbox.location = new URL("https://www.bilibili.com/");
  h.tick();
  assert.equal(h.toolbar.children.length, 1);
  assert.equal(h.entry, undefined);
});

test('entry waits for the action bar and never mutates the native action row', () => {
  const h = harness({hasToolbar:false});
  assert.equal(h.body.children.length, 0);
  assert.equal(h.message({action:'getCurrentTime'}).currentTime, 45);
  h.body.append(h.toolbar); h.tick();
  const entry = h.entry;
  assert.ok(entry?.isConnected);
  assert.equal(entry.parentElement,h.body);
  assert.deepEqual(h.toolbar.children,[h.actions]);
  entry.remove(); h.tick();
  assert.equal(h.entry, entry);
  h.toolbar.remove(); h.tick();
  assert.equal(h.body.children.length, 0);
  h.body.append(h.toolbar); h.tick(); h.tick();
  assert.equal(h.toolbar.children.length, 1);
  assert.equal(h.entry, entry);
  h.sandbox.__digestBiliController.dispose();
  assert.equal(h.toolbar.children.length, 1);
  assert.equal(h.entry, undefined);
  assert.equal(h.listeners.size,0);
});

test('entry tracks the native row and stays hidden offscreen or in fullscreen', () => {
  const h=harness();
  assert.equal(h.entry.hidden,false);
  assert.equal(h.entry.style.left,'412px');
  h.actions.rect.top=400; h.event('scroll');
  assert.equal(h.entry.style.top,'396px');
  h.actions.rect.top=-100; h.event('scroll');
  assert.equal(h.entry.hidden,true);
  h.actions.rect.top=100;h.event('scroll');
  assert.equal(h.entry.hidden,false);
  h.sandbox.document.fullscreenElement=h.player;h.event('fullscreenchange');
  assert.equal(h.entry.hidden,true);
  h.sandbox.document.fullscreenElement=null;h.event('fullscreenchange');
  assert.equal(h.entry.hidden,false);
});

test('entry leaves native controls unobstructed when the row has no spare room', () => {
  const h=harness();
  h.toolbar.rect.width=460;h.event('resize');
  assert.equal(h.entry.hidden,true);
  h.toolbar.rect.width=480;h.event('resize');
  assert.equal(h.entry.hidden,false);
  assert.equal(h.entry.attributes.has('data-compact'),true);
  assert.equal(h.entry.style.left,'404px');
  h.toolbar.rect.width=668;h.event('resize');
  assert.equal(h.entry.hidden,false);
  assert.equal(h.entry.attributes.has('data-compact'),false);
  assert.deepEqual(h.toolbar.children,[h.actions]);
});
