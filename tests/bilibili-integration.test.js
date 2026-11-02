const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const DIGEST_VIDEO = require("../platforms.js");
const id = "bili:BV1a6Yx62EH4:p2";
const {fixture}=require('./bili-fixture.cjs');

function backgroundHarness(url = DIGEST_VIDEO.url(id)) {
  const store = {};
  const scripts = [];
  const http=fixture();
  const listener = { addListener() {} };
  const sandbox = {
    URL, console, setTimeout, clearTimeout, AbortController, AbortSignal, TextEncoder, TextDecoder,
    fetch: http.fetchImpl,
    chrome: {
      storage: { local: {
        setAccessLevel: async () => {}, get: async (key) => ({ [key]: store[key] }),
        set: async (values) => Object.assign(store, values),
      } },
      runtime: { onMessage: listener, onInstalled: listener, sendMessage: async () => {} },
      action: { onClicked: listener },
      sidePanel: { setPanelBehavior() {} },
      tabs: { onUpdated: listener, onActivated: listener,
        get: async (tabId) => ({ id: tabId, url }), query: async () => [{ id: 7, url }] },
      scripting: { executeScript: async (request) => {
        scripts.push(request);
        return [{ result: { success: true, transcript: [{ start: 0, duration: 2, text: "字幕" }] } }];
      } },
    },
  };
  vm.createContext(sandbox);
  sandbox.importScripts = (file) => vm.runInContext(read(file), sandbox);
  vm.runInContext(read("background.js"), sandbox);
  return { sandbox, store, scripts, http };
}

test("Bilibili transcript routing works with empty settings and binds the supplied tab", async () => {
  const h = backgroundHarness();
  assert.equal((await h.sandbox.handleFetchTranscript(id, 7)).success, true);
  assert.equal(h.scripts.length,0);
  assert.ok(h.http.calls.some(call=>call.url.pathname==='/x/player/wbi/v2'));
});

test('background forwards explicit refresh through to all subtitle HTTP requests', async () => {
  const h=backgroundHarness();
  const result=await h.sandbox.handleFetchTranscript(id,7,null,true);
  assert.equal(result.success,true);
  assert.ok(h.http.calls.length>=3);
  for(const call of h.http.calls) assert.equal(call.options.cache,'no-store');
});

test("background rejects mismatched part rather than fetching another open video", async () => {
  const h = backgroundHarness(DIGEST_VIDEO.url("bili:BV1a6Yx62EH4:p1"));
  assert.equal((await h.sandbox.handleFetchTranscript(id, 7)).error, "VIDEO_CHANGED");
  assert.equal(h.scripts.length, 0);
});

test('a missing Bilibili receiver is reinjected once before the message is retried', async () => {
  const h=backgroundHarness(); let calls=0;
  h.sandbox.chrome.tabs.sendMessage=async (_tab,message)=>{
    assert.equal(message.videoId,id); calls++;
    if(calls===1)throw Error('Could not establish connection. Receiving end does not exist.');
    return {title:'恢复后的标题'};
  };
  const result=await h.sandbox.sendToVideoContent(7,{action:'getVideoInfo'},id);
  assert.equal(result.title,'恢复后的标题');assert.equal(calls,2);assert.equal(h.scripts.length,1);
  assert.deepEqual(Array.from(h.scripts[0].files),['platforms.js','bilibili-content.js']);
});

test('receiver recovery cannot loop or act on a different video', async () => {
  const h=backgroundHarness();let calls=0;
  h.sandbox.chrome.tabs.sendMessage=async()=>{calls++;throw Error('Receiving end does not exist.');};
  await assert.rejects(h.sandbox.sendToVideoContent(7,{action:'getVideoInfo'},id),/Receiving end/);
  assert.equal(calls,2);assert.equal(h.scripts.length,1);
  await assert.rejects(h.sandbox.sendToVideoContent(7,{action:'seekTo',seconds:90},'bili:BV1a6Yx62EH4:p1'),/VIDEO_CHANGED/);
  assert.equal(calls,2);
});

test('playback injection errors retain diagnosis and strip tracking parameters', async () => {
  const h=backgroundHarness();
  const result=h.sandbox.biliConnectionFailure(Error('Cannot access contents of url "https://www.bilibili.com/video/BV1a6Yx62EH4/?token=private". Extension must request permission.'));
  assert.equal(result.error,'BILI_PAGE_PERMISSION');assert.match(result.detail,/Cannot access/);assert.doesNotMatch(result.detail,/private|token=/);
  assert.doesNotMatch(result.message,/没有字幕|未返回.*字幕/);
});

test('Blocked page scripts cannot prevent background caption reading', async () => {
  const h=backgroundHarness();h.sandbox.chrome.scripting.executeScript=async()=>{throw Error('Blocked');};
  const result=await h.sandbox.handleFetchTranscript(id,7);
  assert.equal(result.success,true);assert.equal(result.source.transport,'background');
});

test('withheld API permissions return an actionable code without making requests', async () => {
  const h=backgroundHarness();h.sandbox.chrome.permissions={contains:async()=>false};
  const result=await h.sandbox.handleFetchTranscript(id,7);
  assert.equal(result.error,'BILI_SERVICE_PERMISSION');assert.equal(h.http.calls.length,0);
});

test('explicit playback reconnect checks page permission before injecting a fresh receiver',async()=>{
 const h=backgroundHarness();h.sandbox.chrome.permissions={contains:async()=>false};
 assert.equal((await h.sandbox.repairPlaybackConnection(7,id)).error,'PAGE_ACCESS_REQUIRED');
 assert.equal(h.scripts.length,0);
 h.sandbox.chrome.permissions.contains=async()=>true;
 h.sandbox.chrome.tabs.sendMessage=async (_tab,message,options)=>{
   assert.equal(message.videoId,id);assert.equal(options.frameId,0);return {success:true,currentTime:12};
 };
 const result=await h.sandbox.repairPlaybackConnection(7,id);
 assert.equal(result.response.currentTime,12);assert.equal(h.scripts.length,1);
});

test('reconnect cannot inject into a different video',async()=>{
 const h=backgroundHarness();
 assert.equal((await h.sandbox.repairPlaybackConnection(7,'bili:BV11eHF6vE86:p1')).error,'VIDEO_CHANGED');
 assert.equal(h.scripts.length,0);
});

test('navigation while the API loads discards the old transcript', async () => {
  const h=backgroundHarness();let reads=0;
  h.sandbox.chrome.tabs.get=async()=>({id:7,url:++reads===1?DIGEST_VIDEO.url(id):DIGEST_VIDEO.url('bili:BV1a6Yx62EH4:p1')});
  const result=await h.sandbox.handleFetchTranscript(id,7);
  assert.equal(result.error,'VIDEO_CHANGED');assert.equal(result.transcript,undefined);
});

test("selected Bilibili notes persist exact text and part-aware URLs without API keys", async () => {
  const h = backgroundHarness();
  const result = await h.sandbox.handleSaveNote(id, 91, "课程 P2", "老师", "关键观点");
  assert.equal(result.success, true);
  assert.equal(result.note.timestampedUrl, "https://www.bilibili.com/video/BV1a6Yx62EH4/?p=2&t=91");
  assert.equal(result.note.text, "关键观点");
  assert.equal(h.scripts.length, 0);
  assert.ok(Object.values(h.store).some(value => JSON.stringify(value).includes("关键观点")));
});

test('concurrent excerpt writes keep every note and never silently truncate at 100', async () => {
  const h=backgroundHarness();
  h.store.ytd_notes=Array.from({length:100},(_,i)=>({id:`old-${i}`,videoId:id,timestamp:i,text:`旧摘录${i}`}));
  const results=await Promise.all([h.sandbox.handleSaveNote(id,101,'课','作者','新原文一'),h.sandbox.handleSaveNote(id,102,'课','作者','新原文二')]);
  assert.ok(results.every(r=>r.success));assert.equal(h.store.ytd_notes.length,102);
  assert.ok(h.store.ytd_notes.some(n=>n.id==='old-0'));
});

test("a late P1 transcript cannot overwrite the P2 panel or its cache", async () => {
  const listener = { addListener() {} };
  const requests = [];
  const stored = [];
  const element = { style: {}, classList: { toggle() {} } };
  const sandbox = {
    URL, console, DIGEST_VIDEO, setTimeout, clearTimeout,
    window: { close() {} },
    document: { addEventListener() {}, getElementById: () => element },
    chrome: { runtime: { onMessage: listener, sendMessage: (message) => new Promise(resolve => requests.push({ message, resolve })) },
      tabs: { onUpdated: listener, onActivated: listener }, windows: { getCurrent: async () => ({ id: 1 }) } },
    stored,
  };
  vm.createContext(sandbox); vm.runInContext(read("sidepanel.js"), sandbox);
  vm.runInContext(`
    loadTranscriptViewState = async () => null;
    loadDisplayLanguageMode = async () => "original";
    loadFromCache = async () => null;
    resetTranscriptSearch = renderTranscript = showState = updateLoading =
      restorePendingTranscriptViewState = loadNotes = setupExplainFeature = () => {};
    saveToCache = async id => stored.push({ id, text: currentTranscriptText });
  `, sandbox);
  const id1 = "bili:BV1a6Yx62EH4:p1";
  const first = sandbox.startDigest(id1, DIGEST_VIDEO.url(id1));
  await new Promise(setImmediate);
  const second = sandbox.startDigest(id, DIGEST_VIDEO.url(id));
  await new Promise(setImmediate);
  assert.equal(requests.length, 2);
  requests[1].resolve({ success: true, source: {version: 2, videoId: id, part: 2, bvid: "BV1a6Yx62EH4", aid: "123", cid: "222", endpoint: "wbi/v2"}, transcript: [{ start: 0, text: "P2" }], transcriptText: "P2" });
  await second;
  requests[0].resolve({ success: true, transcript: [{ start: 0, text: "P1" }], transcriptText: "P1" });
  await first;
  assert.equal(vm.runInContext("currentTranscriptText", sandbox), "P2");
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, id);
});
