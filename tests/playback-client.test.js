const test=require('node:test');
const assert=require('node:assert/strict');
const client=require('../playback-client.js');
const id='bili:BV11eHF6vE86:p1';
function harness(){
 const calls=[];
 const api={tabs:{get:async()=>({url:'https://www.bilibili.com/video/BV11eHF6vE86/'}),sendMessage:async(tabId,payload,options)=>{calls.push({tabId,payload,options});return {success:true,currentTime:23.5,videoId:id};}},
  runtime:{sendMessage:async()=>{calls.push('relay');return {success:true,response:{currentTime:24}};}},permissions:{contains:async()=>true}};
 return {api,calls};
}
test('a healthy page reads playback directly from the bound top frame without a worker hop',async()=>{
 const h=harness();const r=await client.read(7,id,h);
 assert.equal(r.response.currentTime,23.5);assert.equal(r.transport,'direct');assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].options.frameId,0);assert.equal(h.calls[0].payload.videoId,id);
});
test('missing receivers can use the worker repair path; withheld page access is actionable',async()=>{
 const h=harness();h.api.tabs.sendMessage=async()=>{throw Error('Receiving end does not exist.');};
 assert.equal((await client.read(7,id,h)).transport,'relay');
 h.api.permissions.contains=async()=>false;h.calls.length=0;
 assert.equal((await client.read(7,id,h)).error,'PAGE_ACCESS_REQUIRED');assert.equal(h.calls.length,0);
});
test('Blocked and missing receiver details survive classification without URL query leakage',async()=>{
 const h=harness();h.api.tabs.sendMessage=async()=>{throw Error('Receiving end does not exist.');};
 h.api.runtime.sendMessage=async()=>({success:false,error:'Blocked'});
 const r=await client.read(7,id,h);assert.equal(r.error,'PAGE_ACCESS_BLOCKED');assert.equal(r.detail,'Blocked');
 assert.equal(client.classify('PAGE_ACCESS_REQUIRED').error,'PAGE_ACCESS_REQUIRED');
 assert.doesNotMatch(client.classify('Cannot access https://www.bilibili.com/video/BV11eHF6vE86/?token=private').detail,/private|token=/);
});
test('different tabs and stale video responses cannot update the highlight',async()=>{
 const h=harness();h.api.tabs.get=async()=>({url:'https://www.bilibili.com/video/BV1a6Yx62EH4/'});
 assert.equal((await client.read(7,id,h)).error,'VIDEO_CHANGED');assert.equal(h.calls.length,0);
 h.api.tabs.get=async()=>({url:'https://www.bilibili.com/video/BV11eHF6vE86/'});
 h.api.tabs.sendMessage=async()=>({success:true,currentTime:30,videoId:'bili:BV11eHF6vE86:p2'});
 assert.equal((await client.read(7,id,h)).error,'VIDEO_CHANGED');
});
test('a stalled worker does not leave playback waiting indefinitely',async()=>{
 const h=harness();h.api.tabs.sendMessage=async()=>{throw Error('Receiving end does not exist.');};
 h.api.runtime.sendMessage=()=>new Promise(()=>{});
 assert.equal((await client.read(7,id,{...h,timeoutMs:10})).error,'PLAYBACK_TIMEOUT');
});
