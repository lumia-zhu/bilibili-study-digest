const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../study-core');
const rows = S.captions([{text:'收益 12.5%',start:0,duration:3},{text:'需要核对风险',start:4,duration:2},{text:'不能只看数字',start:9,duration:4}]);
test('raw captions preserve wording and source times, including hour timestamps', () => {
  assert.equal(rows[0].text, '收益 12.5%'); assert.equal(rows[1].start,4); assert.equal(S.time(3661),'1:01:01');
});
test('long transcript batching does not truncate source, including one oversized caption', () => {
  const source = [...rows, {id:'long',text:'很长的字幕'.repeat(5000),start:15,end:4000}];
  const batches = S.batches(source,1400);
  assert.ok(batches.length>10);
  assert.equal(batches.flat().map(x=>x.text).join(''), source.map(x=>x.text).join(''));
  assert.equal(new Set(batches.flat().map(x=>x.id)).size,batches.flat().length);
  assert.ok(batches.every(b=>b.reduce((n,r)=>n+r.text.length+60,0)<=1400));
});
test('cleanup permits punctuation but rejects changed numbers, omissions, and reordering', () => {
  const output = S.validateCleanup({groups:[{ids:['s0','s1','s2'],text:'收益 12.5%，需要核对风险，不能只看数字。'}]},rows);
  assert.equal(output[0].start,0); assert.equal(output[0].end,13);
  for (const groups of [
    [{ids:['s0','s1','s2'],text:'收益 120.5%，需要核对风险，不能只看数字。'}],
    [{ids:['s0','s1','s2'],text:'收益 125%，需要核对风险，不能只看数字。'}],
    [{ids:['s0','s1','s2'],text:'收益 12.5，需要核对风险，不能只看数字。'}],
    [{ids:['s0'],text:'收益 12.5%'}],
    [{ids:['s1','s0','s2'],text:rows.map(x=>x.text).join('')}]
  ]) assert.throws(()=>S.validateCleanup({groups},rows));
});
test('overview requires full continuous coverage and uses exact source for quotes', () => {
  const result = {topic:'主题',takeaways:['要点'],chapters:[{startId:'s0',endId:'s2',title:'章节',summary:'结论'}],keyQuotes:[{sourceId:'s0',quote:'12.5%'},{sourceId:'s1',quote:'模型虚构引文'}]};
  const value = S.validateOverview(result,rows);
  assert.equal(value.chapters[0].endSeconds,13); assert.equal(value.keyQuotes.length,1); assert.equal(value.keyQuotes[0].quote,rows[0].text);
  for (const changes of [{startId:'s1'},{endId:'s1'},{endId:'missing'}]) assert.throws(()=>S.validateOverview({...result,chapters:[{...result.chapters[0],...changes}]},rows));
  const merged = S.mergeOverview([undefined,value]); assert.equal(merged.chapters.length,1);
});
test('incomplete translations must be explicitly exported as partial with labels', () => {
  const input = {title:'测试',url:'https://www.bilibili.com/',segments:rows,mode:'bilingual',translated:new Map([['s0','译文']])};
  assert.equal(S.exportText(input).text,null); assert.equal(S.exportText(input).missing,2);
  assert.match(S.exportText({...input,partial:true}).text,/部分结果，2 段未翻译/);
  assert.match(S.exportText({...input,partial:true}).text,/尚未翻译/);
  assert.doesNotMatch(S.exportText({...input,mode:'original',timestamps:false}).text,/\[0:00\]/);
});
