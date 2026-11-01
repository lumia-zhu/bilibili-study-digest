const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const adapter=require('../bilibili-background.js');
const wbi=require('../vendor/bilibili-digest/wbi.js');
const video=require('../platforms.js');
const {fixture,bvid}=require('./bili-fixture.cjs');
const id=`bili:${bvid}:p2`;

test('WBI digest matches MD5 for Unicode and multi-block inputs; signatures encode deterministically',()=>{
  for(const value of ['', 'abc', '中文', 'abcd'.repeat(40)])assert.equal(wbi.md5(value),createHash('md5').update(value).digest('hex'));
  const keys={imgKey:'a'.repeat(32),subKey:'b'.repeat(32)};
  const signed=wbi.signedUrl('https://api.bilibili.com/x/player/wbi/v2',{cid:456,bvid,extra:"a b!'()*"},keys,123);
  assert.match(signed,/extra=a%20b/);assert.match(signed,/wts=123/);assert.match(signed,/w_rid=[a-f0-9]{32}/);
});

test('background returns verified P2 captions, isolates credentials and hides signed URLs',async()=>{
  wbi.clearKeyCache();const h=fixture();const result=await adapter.read(id,true,null,h);
  assert.equal(result.success,true);assert.equal(result.source.part,2);assert.equal(result.source.cid,'456');
  assert.equal(video.validTranscriptSource(id,result.source),true);
  assert.equal(result.transcript[0].text,'字幕');assert.doesNotMatch(JSON.stringify(result),/auth_key|https:/);
  assert.ok(h.calls.some(c=>c.url.searchParams.has('w_rid')));
  for(const c of h.calls){assert.equal(c.options.credentials,c.url.hostname==='api.bilibili.com'?'include':'omit');assert.equal(c.options.redirect,'error');assert.ok(c.options.signal);}
});

test('a wrong video, wrong CID or missing P2 never yields substituted captions',async()=>{
  for(const options of [{view:{bvid:'BV1cJxy6bEDF'}},{view:{pages:[{page:1,cid:456}]}},{player:{cid:789}}]){
    const result=await adapter.read(id,true,null,fixture(options));assert.equal(result.error,'BILI_IDENTITY_MISMATCH');assert.equal(result.transcript,undefined);
  }
});

test('AV links resolve to verified BV metadata',async()=>{
  const h=fixture();const result=await adapter.read('bili:av123:p2',true,null,h);
  assert.equal(result.success,true);assert.equal(video.validTranscriptSource('bili:av123:p2',result.source),true);
  assert.equal(h.calls[0].url.searchParams.get('aid'),'123');
});

test('explicit track choice never silently falls back to another language',async()=>{
  const h=fixture();const result=await adapter.read(id,true,'nonexistent',h);
  assert.equal(result.error,'BILI_TRACK_MISSING');assert.ok(h.calls.every(c=>c.url.hostname==='api.bilibili.com'));
});

test('background rejects arbitrary caption hosts and malformed times',async()=>{
  const tracks=[{id:1,lan:'zh',subtitle_url:'https://evil.test/steal?auth_key=fixture'}];
  const h=fixture({tracks});assert.equal((await adapter.read(id,true,null,h)).error,'BILI_SUBTITLE_HOST');
  assert.ok(h.calls.every(c=>c.url.hostname==='api.bilibili.com'));
  const result=await adapter.read(id,true,null,fixture({body:[{from:NaN,to:3,content:'bad'},{from:2,to:1,content:'bad'},{from:-1,to:3,content:'bad'},{from:3,to:4,content:'later'},{from:0,to:2,content:'first'}]}));
  assert.deepEqual(result.transcript.map(r=>r.text),['first','later']);
});

test('empty primary track list falls back to the signed protobuf subtitle endpoint',async()=>{
  // Encode one real protobuf track envelope with string fields.
  const field=(n,value)=>{const b=Buffer.from(value);assert.ok(b.length<128);return Buffer.concat([Buffer.from([n*8+2,b.length]),b]);};
  const track=Buffer.concat([field(3,'zh-CN'),field(4,'中文'),field(5,'https://aisubtitle.hdslb.com/fallback.json')]);
  const payload=Buffer.concat([Buffer.from([10,track.length]),track]);
  const h=fixture({tracks:[],player:{need_login_subtitle:true},fallback:payload});
  const result=await adapter.read(id,true,null,h);
  assert.equal(result.success,true);assert.equal(result.source.endpoint,'subtitle/web/view');
  assert.equal(video.validTranscriptSource(id,result.source),true);
  const request=h.calls.find(c=>c.url.pathname==='/x/v2/subtitle/web/view');
  assert.equal(request.url.searchParams.get('oid'),'456');assert.equal(request.url.searchParams.get('pid'),'123');assert.ok(request.url.searchParams.has('w_rid'));
});

test('no caption and login-required responses remain distinct from a failed connection',async()=>{
  assert.equal((await adapter.read(id,true,null,fixture({tracks:[]}))).error,'BILI_NO_SUBTITLE');
  assert.equal((await adapter.read(id,true,null,fixture({tracks:[],player:{need_login_subtitle:true}}))).error,'BILI_NEED_LOGIN');
  assert.equal((await adapter.read(id,true,null,{fetchImpl:async()=>{throw Error('Blocked');}})).error,'BILI_NETWORK_ERROR');
});
