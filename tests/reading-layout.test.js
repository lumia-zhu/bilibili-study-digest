const test = require('node:test');
const assert = require('node:assert/strict');
const {readingPlan, readingParagraphs, readingSeparator, exportText} = require('../study-core.js');
const caption = (text, start, end) => Object.freeze({id: `s${start}`, text, start, end});

test('reading paragraphs preserve every original caption, character, timestamp and order', () => {
  const source = Object.freeze(Array.from({length: 1310}, (_, i) => caption(`原始字幕 ${i}，不添加标点`, i * 1.3, i * 1.3 + 1.2)));
  const grouped = readingParagraphs(source);
  assert.ok(grouped.length < source.length / 3);
  assert.deepEqual(grouped.flat(), source);
  grouped.flat().forEach((row, i) => assert.equal(row, source[i]));
  for (const group of grouped) assert.ok(group.at(-1).end - group[0].start <= 24);
});

test('punctuation and meaningful pauses define reading boundaries without short-row fragmentation', () => {
  const source = [caption('甲'.repeat(35), 0, 8), caption('乙'.repeat(35) + '。', 8, 18),
    caption('下一段', 18, 20), caption('停顿后的段落', 22, 23)];
  assert.deepEqual(readingParagraphs(source).map(g => g.map(r => r.start)), [[0, 8], [18], [22]]);
});

test('long unpunctuated speech is bounded; an oversized source item and AI paragraphs stay intact', () => {
  const source = Array.from({length: 40}, (_, i) => caption('没有标点的连续字幕内容'.repeat(2), i * 0.5, (i + 1) * 0.5));
  for (const group of readingParagraphs(source)) assert.ok(group.map(r => r.text).join('').length <= 90);
  const long = caption('长'.repeat(1000), 0, 180);
  const ai = Object.freeze({...caption('整理后段落', 181, 182), ids: ['s1', 's2']});
  assert.deepEqual(readingParagraphs([long, ai, caption('后文', 182, 183)]).map(g => g.length), [1, 1, 1]);
});

test('reading joins keep Latin word boundaries without adding punctuation to Chinese', () => {
  assert.equal(readingSeparator('人工', '智能'), '');
  assert.equal(readingSeparator('第一句。', '下一句'), '');
  assert.equal(readingSeparator('an AI', 'agent'), ' ');
  assert.equal(readingSeparator('a sentence.', 'Another sentence'), ' ');
  assert.deepEqual(readingParagraphs([]), []);
});

test('micro-gaps are separate display hints and never change source or exported text', () => {
  const source = Object.freeze([caption('学习的时候可以先看完整的段落', 0, 4),
    caption('遇到重要的内容再回到视频核对', 4.6, 8)]);
  const plan = readingPlan(source);
  assert.deepEqual([...plan.spaceBefore], [1]);
  assert.deepEqual(plan.groups.flat(), source);
  plan.groups.flat().forEach((row, i) => assert.equal(row, source[i]));
  const output = exportText({title: '测试', url: '', segments: plan.groups.flat(), mode: 'original'}).text;
  assert.ok(output.includes(source[0].text));
  assert.ok(output.includes(source[1].text));
  assert.doesNotMatch(output, /[，。]/);
});

test('short cue groups without pauses stay together', () => {
  const text = '学习的时候可以先看完整的段落';
  for (const [end, nextStart] of [[4,4],[4,3.8],[4,4.3],[0,4.6],[undefined,4.6],[NaN,4.6]]) {
    const plan = readingPlan([caption(text, 0, end), caption('遇到重要内容再回看', nextStart, 8)]);
    assert.equal(plan.spaceBefore.size, 0, `${end} -> ${nextStart}`);
    assert.equal(plan.groups.length, 1);
  }
});

test('long pauses and a natural pause after 60 characters create paragraphs, not extra gaps', () => {
  const a = caption('学习的时候可以先看完整的段落', 0, 4);
  let plan = readingPlan([a, caption('遇到重要内容再回看', 5.6, 8)]);
  assert.equal(plan.groups.length, 2);
  assert.equal(plan.spaceBefore.size, 0);
  plan = readingPlan([caption('甲'.repeat(30), 0, 4), caption('乙'.repeat(30), 4, 8), caption('新的内容', 8.6, 12)]);
  assert.deepEqual(plan.groups.map(g=>g.length), [2,1]);
  assert.deepEqual([...plan.spaceBefore], [1]); // No leading gap in the next paragraph.
});

test('punctuation, short clauses, particles and split numbers are not supplemented blindly', () => {
  for (const [left,right] of [
    ['学习的时候可以先看完整的段落，','遇到重要内容再回看'],
    ['学习的时候可以先看完整的段落。','遇到重要内容再回看'],
    ['学习的时候可以先看完整的段落','，遇到重要内容再回看'],
    ['学习的时候可以先看完整的段落，然后','回到视频核对原文'],
    ['人工','智能是一项技术'],
    ['学习的时候可以先看完整段落中的','重要内容再回到视频核对'],
    ['学习的时候可以先看完整的段落','的时候可以保存摘录'],
    ['这个课程现在需要的费用是一百','二十三元可以在线报名'],
    ['这个项目现在的收益预期为十二点','五个百分点需要核对'],
    ['这个课程现在需要支付的费用为12','500元可以在线报名'],
    ['这个课程现在需要支付的费用为三百','元人民币可以在线报名'],
    ['这个项目现在的收益预期为百分之','二十左右需要核对'],
    ['这个项目目前一共有300','平方米可以使用'],
    ['Read the original transcript','before drawing a conclusion'],
  ]) {
    assert.equal(readingPlan([caption(left,0,4),caption(right,4.6,8)]).spaceBefore.size,0,`${left} / ${right}`);
  }
});

test('several short cues can accumulate a clause while nearby pauses do not get a gap each', () => {
  const plan = readingPlan([caption('学习的时候',0,1),caption('可以先看完整的段落',1,3),
    caption('遇到重要内容',3.6,5),caption('再回到视频核对',5.6,7)]);
  assert.deepEqual([...plan.spaceBefore], [2]);
});

test('ordinary words ending in 点 are not mistaken for a split decimal', () => {
  const plan = readingPlan([caption('我们收藏了很多视频也记下了很多观点',0,4),caption('但过了一段时间内容就忘记了',4.6,8)]);
  assert.deepEqual([...plan.spaceBefore], [1]);
});

test('gapless unpunctuated captions get visual micro-gaps without changing source', () => {
  const rows=Object.freeze(Array.from({length:610},(_,i)=>caption('这是平台提供的连续字幕内容',i*2,(i+1)*2)));
  const plan=readingPlan(rows);
  assert.ok(plan.spaceBefore.size>100);
  assert.deepEqual(plan.groups.flat(),rows);
  const starts=new Set(plan.groups.map(g=>rows.indexOf(g[0])));
  for(const index of plan.spaceBefore) assert.equal(starts.has(index),false);
});

test('tiny Chinese fragments stay joined until there is a readable cue group', () => {
  const texts=['我','觉得','这是','一个','很好的','机会','我们可以先把核心功能做好','然后根据反馈慢慢调整'];
  const plan=readingPlan(texts.map((text,i)=>caption(text,i,i+1)));
  assert.deepEqual([...plan.spaceBefore],[7]);
});

test('micro-gaps respect source punctuation and do not split Latin words', () => {
  const chinese=Array.from({length:8},(_,i)=>caption('这是已经带有标点的字幕。',i*2,(i+1)*2));
  assert.equal(readingPlan(chinese).spaceBefore.size,0);
  const latin=Array.from({length:8},(_,i)=>caption('Continuous English captions retain their natural word boundaries',i*2,(i+1)*2));
  assert.equal(readingPlan(latin).spaceBefore.size,0);
});
