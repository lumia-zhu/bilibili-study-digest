/* Shared pure helpers. Original caption text and source timestamps are immutable. */
var STUDY = (() => {
  const VERSION = 1;
  const time = (value) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    return n >= 3600 ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
      : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  };
  function captions(rows) {
    return (Array.isArray(rows) ? rows : []).filter(r => typeof r.text === 'string' && r.text.trim() && Number.isFinite(r.start) && r.start >= 0)
      .map((r, i) => ({ id: `s${i}`, text: r.text.trim(), start: r.start, end: r.start + Math.max(0, Number(r.duration) || 0) }));
  }
  // A single linear pass produces a display plan, never a rewritten transcript.
  // pauseBefore contains source indices for optional, visual-only commas.
  function readingPlan(segments) {
    const groups = [], pauseBefore = new Set();
    let group = [], size = 0, clauseSize = 0, previousText = '', previousHan = 0;
    const flush = () => { if (group.length) groups.push(group); group = []; size = 0; clauseSize = 0; };
    const han = /\p{Script=Han}/u;
    const punctuation = /[，。！？；：、,.!?;:…]/u;
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index], text = String(segment.text || '').trim();
      let units = 0, tailUnits = 0, hanCount = 0, hasPunctuation = false;
      for (const char of text) {
        const isHan = han.test(char), weight = isHan ? 1 : 0.25;
        units += weight;
        if (isHan) hanCount++;
        if (punctuation.test(char)) { tailUnits = 0; hasPunctuation = true; }
        else tailUnits += weight;
      }
      const previous = group.at(-1);
      // Missing/zero durations and overlapping cues do not prove a spoken pause.
      const gap = previous && Number.isFinite(previous.start) && Number.isFinite(previous.end) &&
        previous.end > previous.start && Number.isFinite(segment.start)
        ? segment.start - previous.end : 0;
      const end = Number.isFinite(segment.end) ? segment.end : segment.start;
      if (group.length && (segment.ids?.length || size + units > 90 ||
          end - group[0].start > 24 || gap >= 1.5 || (size >= 60 && gap >= 0.45))) flush();
      if (group.length && gap >= 0.45 && gap < 1.5 && clauseSize >= 10 &&
          previousHan >= 4 && hanCount >= 3 &&
          /\p{Script=Han}$/u.test(previousText) && /^\p{Script=Han}/u.test(text) &&
          // Conservative exclusions for short fragments, numbers and joiners.
          !/[的地得和与及或把被对向从在为是不没将让给零〇一二三四五六七八九十百千万亿兆两]$/u.test(previousText) &&
          !/[零〇一二三四五六七八九十百千万亿兆两]点$/u.test(previousText) &&
          !/^[的地得着了过吗呢吧啊零〇一二三四五六七八九十百千万亿兆两]/u.test(text)) {
        pauseBefore.add(index); clauseSize = 0;
      }
      group.push(segment); size += units;
      clauseSize = hasPunctuation ? tailUnits : clauseSize + units;
      if (segment.ids?.length || (/[。！？.!?…][”’"'）)\]]*$/u.test(text) &&
          (size >= 60 || end - group[0].start >= 18))) flush();
      previousText = text; previousHan = hanCount;
    }
    flush();
    return { groups, pauseBefore };
  }
  function readingParagraphs(segments) { return readingPlan(segments).groups; }
  function readingSeparator(previous, next) {
    const left = String(previous || '').trimEnd(), right = String(next || '').trimStart();
    if (!left || !right) return '';
    // Chinese fragments flow together; preserve word separation for Latin text.
    return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(left) ||
      /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，。！？；：、]/u.test(right) ||
      /[，。！？；：、]$/u.test(left) ? '' : ' ';
  }
  function batches(rows, maxChars = 9000) {
    if (!Number.isFinite(maxChars) || maxChars < 200) throw new Error('Invalid batch size');
    const out = []; let batch = [], size = 0;
    for (const row of rows) {
      // Split pathological single captions while retaining the real time range.
      for (let offset = 0; offset < row.text.length; offset += maxChars - 100) {
        const piece = { ...row, id: offset ? `${row.id}_${offset}` : row.id, text: row.text.slice(offset, offset + maxChars - 100) };
        const cost = piece.text.length + 60;
        if (batch.length && size + cost > maxChars) { out.push(batch); batch = []; size = 0; }
        batch.push(piece); size += cost;
      }
    }
    if (batch.length) out.push(batch);
    return out;
  }
  const words = s => String(s || '').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  function validateCleanup(result, rows) {
    const groups = result?.groups;
    if (!Array.isArray(groups) || !groups.length) throw new Error('整理结果缺少段落，原文已保留。');
    let index = 0;
    const output = groups.map(g => {
      if (!Array.isArray(g.ids) || !g.ids.length || typeof g.text !== 'string') throw new Error('整理结果格式错误。');
      const source = rows.slice(index, index + g.ids.length);
      if (source.length !== g.ids.length || source.some((r, i) => r.id !== g.ids[i])) throw new Error('整理遗漏或打乱字幕顺序，已拒绝该批结果。');
      index += source.length;
      const raw = source.map(r => r.text).join(' ');
      const numeric = text => JSON.stringify(String(text).normalize('NFKC').match(/\d+(?:[.,]\d+)*|[%‰$€£¥+−=<>]/g) || []);
      if (g.text.length > raw.length * 2 + 100 || words(raw) !== words(g.text) || numeric(raw) !== numeric(g.text)) throw new Error('整理改动了原文文字或数字，已保留原文；可重试。');
      return { id: source[0].id, ids: source.map(r => r.id), start: source[0].start, end: source.at(-1).end, text: g.text.trim(), rawText: raw };
    });
    if (index !== rows.length) throw new Error('整理缺少后续字幕，已拒绝该批结果。');
    return output;
  }
  function validateOverview(result, rows) {
    const byId = new Map(rows.map(r => [r.id, r]));
    const sections = Array.isArray(result?.chapters) ? result.chapters : [];
    let index = 0;
    const chapters = sections.map(c => {
      const start = rows.findIndex(r => r.id === c.startId), end = rows.findIndex(r => r.id === c.endId);
      if (start !== index || end < start || !c.title?.trim() || !c.summary?.trim()) throw new Error('章节未连续覆盖该段字幕，请重试缺失部分。');
      index = end + 1;
      return { title: String(c.title).slice(0, 300), summary: String(c.summary).slice(0, 2000), timestampSeconds: rows[start].start,
        timestamp: time(rows[start].start), endSeconds: rows[end].end, startId: c.startId, endId: c.endId };
    });
    if (!chapters.length || index !== rows.length) throw new Error('章节遗漏字幕末尾，请重试该部分。');
    const keyQuotes = (Array.isArray(result.keyQuotes) ? result.keyQuotes : []).flatMap(q => {
      const row = byId.get(q.sourceId);
      if (!row || typeof q.quote !== 'string' || !q.quote.trim() || !words(row.text).includes(words(q.quote)) || !words(q.quote)) return [];
      // Display the exact source, rather than silently endorsing a rewritten quote.
      return [{ quote: row.text, timestamp: time(row.start), timestampSeconds: row.start, sourceId: row.id, rawText: row.text }];
    }).slice(0, 5);
    return { topic: String(result.topic || '').slice(0, 500), takeaways: (Array.isArray(result.takeaways) ? result.takeaways : []).filter(t => typeof t === 'string').slice(0, 4).map(t => t.slice(0, 800)), chapters, keyQuotes };
  }
  function mergeOverview(parts) {
    const valid = parts.filter(Boolean);
    const chapters = valid.flatMap(p => p.chapters).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    const quotes = valid.flatMap(p => p.keyQuotes).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    return { studyVersion: VERSION, chapters, keyQuotes: [...new Map(quotes.map(q => [q.timestampSeconds + q.quote, q])).values()],
      keyMoments: chapters.map(c => c.timestampSeconds), summaries: valid.map(p => ({ topic: p.topic, takeaways: p.takeaways, start: p.chapters[0]?.timestampSeconds || 0 })) };
  }
  function exportText({ title, url, segments, mode, translated = new Map(), timestamps = true, partial = false }) {
    let missing = 0;
    const lines = segments.map(s => {
      const target = translated.get(s.id);
      const stamp = timestamps ? `[${time(s.start)}] ` : '';
      if (mode === 'original') return stamp + s.text;
      if (!target) { missing++; return `${stamp}${s.text}\n[尚未翻译：以上保留原文]`; }
      return stamp + (mode === 'bilingual' ? `${s.text}\n${target}` : target);
    });
    if (missing && !partial) return { missing, text: null };
    return { missing, text: `${title}\n${url}\n模式：${mode}${missing ? `（部分结果，${missing} 段未翻译）` : ''}\n\n${lines.join('\n\n')}` };
  }
  return { VERSION, time, captions, readingPlan, readingParagraphs, readingSeparator, batches, words, validateCleanup, validateOverview, mergeOverview, exportText };
})();
if (typeof module !== 'undefined') module.exports = STUDY;
