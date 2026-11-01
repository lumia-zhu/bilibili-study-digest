const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const S = require('../study-core');
function harness() {
  let calls=0, fail=false;
  const storage={}, settings={aiBaseUrl:'https://example.test/v1',aiModel:'test-model'};
  const ctx=vm.createContext({STUDY:S,DIGEST_VIDEO:{fromId:()=>true},crypto:webcrypto,TextEncoder,
    getSettings:async()=>settings,parseLooseJson:JSON.parse,
    chrome:{storage:{local:{get:async k=>k===null?{...storage}:{[k]:storage[k]},set:async v=>Object.assign(storage,v),remove:async keys=>keys.forEach(k=>delete storage[k])}}},
    requestAiCompletion:async args=>{calls++; await new Promise(r=>setTimeout(r,10)); if(fail) throw Error('429 test');
      const rows=JSON.parse(args.messages[1].content).captions;
      return {text:JSON.stringify({groups:rows.map(r=>({ids:[r.id],text:r.text+'。'}))})};}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../study-ai'),'utf8'),ctx);
  return {run:ctx.studyAiBatch,calls:()=>calls,settings,fail:v=>fail=v};
}
const task={kind:'cleanup',videoId:'bili:BV1a6Yx62EH4:p1',rows:S.captions([{text:'测试字幕',start:0,duration:2}])};
test('AI cache deduplicates concurrent calls and is invalidated by model and source changes',async()=>{
  const h=harness(); await Promise.all([h.run(task),h.run(task)]); assert.equal(h.calls(),1);
  assert.equal((await h.run(task)).cached,true); assert.equal(h.calls(),1);
  h.settings.aiModel='another-model'; await h.run(task); assert.equal(h.calls(),2);
  await h.run({...task,rows:[{...task.rows[0],text:'另一个字幕'}]}); assert.equal(h.calls(),3);
  await h.run({...task,force:true}); assert.equal(h.calls(),4);
});
test('failed AI work is not cached or automatically retried',async()=>{
  const h=harness(); h.fail(true); await assert.rejects(h.run(task),/429/); assert.equal(h.calls(),1);
  h.fail(false); await h.run(task); assert.equal(h.calls(),2);
});
