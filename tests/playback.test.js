const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function harness(){
 const row=(start,end)=>{
  const classes=new Set(),attributes={};
  return {dataset:{seconds:String(start),endSeconds:String(end)},classes,attributes,
   classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},
   setAttribute:(k,v)=>attributes[k]=v,removeAttribute:k=>delete attributes[k],scrollIntoView(){this.scrolled=true;}};
 };
 const entries=[row(1.25,2.5),row(2.75,3.9),row(6,8)];
 const status={classList:{toggle(){}}};
 const listener={addListener(){}};
 const pending=[];
 const sandbox={console,URL,CSS:{escape:s=>s},setTimeout,clearTimeout,DIGEST_VIDEO:require('../platforms.js'),
  document:{addEventListener(){},querySelector:()=>({}),querySelectorAll:()=>entries,
   getElementById:id=>id==='transcriptList'?{querySelectorAll:()=>entries}:id==='playbackStatus'?status:{style:{}}},
  window:{close(){}},
  chrome:{runtime:{onMessage:listener,sendMessage:m=>new Promise(resolve=>pending.push({m,resolve}))},tabs:{onUpdated:listener,onActivated:listener},windows:{getCurrent:async()=>({id:1})}}
 };
 sandbox.DIGEST_PLAYBACK={read:()=>sandbox.chrome.runtime.sendMessage({action:'relayToContent'}),classify:require('../playback-client.js').classify};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../sidepanel.js'),'utf8'),sandbox);
 vm.runInContext("currentVideoId='bili:BV1a6Yx62EH4:p1';youtubeTabId=7;autoScrollEnabled=false;",sandbox);
 return {sandbox,entries,pending,status,eval:code=>vm.runInContext(code,sandbox),active:()=>entries.findIndex(e=>e.classes.has('active-playback'))};
}

test('highlight respects fractional starts, gaps, the last end, and backward seeks',()=>{
 const h=harness();
 for(const [seconds,index] of [[1.24,-1],[1.25,0],[2.5,-1],[2.74,-1],[2.75,1],[7,2],[8,-1],[1.5,0],[0,-1],[NaN,-1]]){
  h.sandbox.highlightActiveEntry(seconds);assert.equal(h.active(),index,`at ${seconds}`);
 }
});

test('manual scroll disables movement while playback highlight keeps updating',()=>{
 const h=harness();h.eval('autoScrollInterval=1;autoScrollEnabled=true;');
 h.sandbox.pausePlaybackScroll();h.sandbox.highlightActiveEntry(3);
 assert.equal(h.active(),1);assert.equal(h.entries[1].scrolled,undefined);
 assert.equal(h.entries[1].attributes['aria-current'],'true');
});

test('time polling is serialized and late replies from another part are discarded',async()=>{
 const h=harness();const first=h.sandbox.playbackTrackingTick();await h.sandbox.playbackTrackingTick();
 assert.equal(h.pending.length,1);
 h.eval("currentVideoId='bili:BV1a6Yx62EH4:p2'");
 h.pending[0].resolve({success:true,response:{currentTime:7}});await first;
 assert.equal(h.active(),-1);
});

test('failed player reads clear stale highlights and show recovery guidance',async()=>{
 const h=harness();h.sandbox.highlightActiveEntry(3);
 const call=h.sandbox.playbackTrackingTick();
 h.pending[0].resolve({success:true,response:{success:false,error:'PLAYER_TIME_UNAVAILABLE'}});await call;
 assert.equal(h.active(),-1);assert.match(h.status.textContent,/刷新视频页/);
 await h.sandbox.playbackTrackingTick();assert.equal(h.pending.length,1);
 h.eval('playbackRetryAfter=0');const retry=h.sandbox.playbackTrackingTick();
 h.pending[1].resolve({success:true,response:{currentTime:7,paused:true}});await retry;
 assert.equal(h.active(),2);assert.equal(h.status.textContent,'已暂停 · 0:07');
});

test('tab detection is scoped to the panel window instead of the last focused window',async()=>{
 const h=harness();h.eval('panelWindowId=19');let query;
 h.sandbox.chrome.tabs.query=async options=>{query=options;return [];};
 await h.sandbox.checkCurrentTab();
 assert.equal(query.windowId,19);assert.equal(query.active,true);assert.equal(query.lastFocusedWindow,undefined);
});
