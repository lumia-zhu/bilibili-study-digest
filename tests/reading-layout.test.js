const test = require('node:test');
const assert = require('node:assert/strict');
const {readingParagraphs, readingSeparator} = require('../study-core.js');
const caption = (text, start, end) => Object.freeze({id: `s${start}`, text, start, end});

test('reading paragraphs preserve every original caption, character, timestamp and order', () => {
  const source = Object.freeze(Array.from({length: 1310}, (_, i) => caption(`原始字幕 ${i}，不添加标点`, i * 1.3, i * 1.3 + 1.2)));
  const grouped = readingParagraphs(source);
  assert.ok(grouped.length < source.length / 3);
  assert.deepEqual(grouped.flat(), source);
  grouped.flat().forEach((row, i) => assert.equal(row, source[i]));
  for (const group of grouped) assert.ok(group.at(-1).end - group[0].start <= 30);
});

test('punctuation and meaningful pauses define reading boundaries without short-row fragmentation', () => {
  const source = [caption('甲'.repeat(35), 0, 8), caption('乙'.repeat(35) + '。', 8, 18),
    caption('下一段', 18, 20), caption('停顿后的段落', 22, 23)];
  assert.deepEqual(readingParagraphs(source).map(g => g.map(r => r.start)), [[0, 8], [18], [22]]);
});

test('long unpunctuated speech is bounded; an oversized source item and AI paragraphs stay intact', () => {
  const source = Array.from({length: 40}, (_, i) => caption('没有标点的连续字幕内容'.repeat(2), i * 0.5, (i + 1) * 0.5));
  for (const group of readingParagraphs(source)) assert.ok(group.map(r => r.text).join('').length <= 150);
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
