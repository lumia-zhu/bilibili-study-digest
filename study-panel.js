/* Explicit-cost study controls layered on the upstream reader. */
// Keep the implementation available for a future iteration, but expose no
// cleanup controls or paid cleanup path in this reading-focused release.
const STUDY_CLEANUP_ENABLED = false;
const studyState = { key: '', epoch: 0, cleaned: [], useCleaned: false, busy: false, stop: false, fullTranslation: false, parts: {}, failures: [], status: '', kind: '' };
let subtitleReloadRequest = null;
const studyEl = id => document.getElementById(id);
const studyKey = () => `${currentVideoId}:${currentTranscriptSource?.trackId || currentTranscriptLanguage || ''}`;
const upstreamFrontTabUrl = handleFrontTabUrl;
handleFrontTabUrl = function (url) {
  if (extractVideoId(url) !== currentVideoId) {
    subtitleReloadRequest = null;
    studyState.epoch++; studyState.stop = true; studyState.busy = false;
    translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null;
  }
  return upstreamFrontTabUrl(url);
};
const upstreamShowState = showState;
showState = function (state) {
  upstreamShowState(state);
  studyEl('studyToolbar').hidden = state !== 'results';
};
function studyStatus(text) {
  studyState.status = text;
  const status = studyEl('studyStatus');
  if (status) { status.textContent = text; status.hidden = !text; }
}
function studyReset() {
  if (studyState.key === studyKey()) return;
  studyState.key = studyKey(); studyState.epoch++; studyState.stop = true; studyState.busy = false;
  studyState.cleaned = []; studyState.useCleaned = false; studyState.parts = {}; studyState.failures = []; studyState.fullTranslation = false;
  studyStatus('');
  if (studyEl('overviewSummary')) studyEl('overviewSummary').replaceChildren();
  if (studyEl('chapterList')) studyEl('chapterList').replaceChildren();
  if (studyEl('quotesList')) studyEl('quotesList').replaceChildren();
}
const upstreamSegments = getActiveTranscriptSegments;
getActiveTranscriptSegments = function () {
  studyReset();
  if (STUDY_CLEANUP_ENABLED && studyState.useCleaned && studyState.cleaned.length) return studyState.cleaned;
  // Segment IDs carry source identity/content via the translation cache key.
  return STUDY.captions(currentTranscript);
};
transcriptTranslationCacheKey = function (segment) {
  return `${currentVideoId}:zh:${currentTranscriptSource?.trackId || currentTranscriptLanguage || ''}:${segment.id}:${segment.text}`;
};
const upstreamRenderTranscript = renderTranscript;
renderTranscript = function () {
  if (!currentTranscript) return;
  studyReset();
  const rows = getActiveTranscriptSegments();
  renderTranscriptModeRows(rows, currentTranscriptMode);
  studyMount();
};
// Reopening a page must not unexpectedly submit unfinished paid work.
loadDisplayLanguageMode = async function () { currentTranscriptMode = 'original'; setTranscriptModeButtons('original'); return 'original'; };
// Overview is generated in Chinese directly. Language buttons apply to subtitles.
translateOverviewContent = async function () {};
translateNotesContent = async function () {};

function studyMount() {
  if (!studyEl('studyToolbar')) return;
  const isChinese = /^(zh|ai-zh)/i.test(currentTranscriptLanguage || '');
  const reloading = Boolean(subtitleReloadRequest);
  document.querySelectorAll('[data-transcript-mode]').forEach(b => {
    b.disabled = reloading || (isChinese && b.dataset.transcriptMode !== 'original');
    b.title = reloading ? '正在刷新字幕' : isChinese && b.disabled ? '当前字幕已是中文，无需重复翻译' : b.dataset.transcriptMode === 'original' ? '阅读原文，不调用 AI' : '按需翻译可见字幕，将调用你配置的 AI 服务';
  });
  studyEl('rawModeBtn').classList.toggle('active', !studyState.useCleaned);
  studyEl('cleanModeBtn').classList.toggle('active', studyState.useCleaned);
  for (const id of ['rawModeBtn', 'cleanModeBtn', 'cleanTranscriptBtn']) {
    studyEl(id).hidden = !STUDY_CLEANUP_ENABLED;
    studyEl(id).disabled = !STUDY_CLEANUP_ENABLED || studyState.busy || (id === 'cleanModeBtn' && !studyState.cleaned.length);
  }
  ['generateOverviewBtn','regenerateOverviewBtn','translateAllBtn'].forEach(id => studyEl(id).disabled = studyState.busy || reloading);
  studyEl('refreshTranscriptBtn').disabled = studyState.busy || reloading;
  studyEl('refreshTranscriptBtn').textContent = reloading ? '刷新中…' : '刷新字幕';
  studyEl('stopStudyBtn').disabled = !studyState.busy;
  studyEl('stopStudyBtn').hidden = !studyState.busy;
  studyEl('translateAllBtn').hidden = isChinese;
  studyEl('studyTaskControls').hidden = !STUDY_CLEANUP_ENABLED && isChinese && !studyState.busy;
  studyStatus(studyState.status);
  const tracks = currentTranscriptTracks || [];
  const select = studyEl('subtitleTrack');
  select.replaceChildren();
  for (const t of tracks) {
    const option = document.createElement('option'); option.value = t.id; option.textContent = `${t.name} · ${t.ai ? '平台 AI 字幕' : '字幕轨'}`;
    option.selected = t.id === currentTranscriptSource?.trackId; select.append(option);
  }
  select.hidden = tracks.length < 2;
  select.disabled = studyState.busy || reloading;
  const language = isChinese ? '中文' : /^en/i.test(currentTranscriptLanguage || '') ? '英文' : tracks.find(t => t.id === currentTranscriptSource?.trackId)?.name || currentTranscriptLanguage || '原语言';
  const platform = currentTranscriptSource ? 'B 站' : 'YouTube';
  const isPlatformAi = tracks.find(t => t.id === currentTranscriptSource?.trackId)?.ai || /^ai-/i.test(currentTranscriptLanguage || '');
  studyEl('subtitleSource').textContent = `${language} · ${currentTranscript?.length || 0} 条字幕 · ${platform}${isPlatformAi ? ' AI 字幕' : '字幕'}`;
}

async function runStudyTask(kind, force = false) {
  if (kind === 'cleanup' && !STUDY_CLEANUP_ENABLED) return;
  if (studyState.busy || subtitleReloadRequest || !currentTranscript?.length) return;
  if (force && !confirm('重新生成会再次调用模型。确认重新生成？')) return;
  studyReset();
  const epoch = studyState.epoch, videoId = currentVideoId, title = currentVideoTitle;
  translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null;
  const rows = STUDY.captions(currentTranscript);
  const batches = STUDY.batches(rows, kind === 'cleanup' ? 1400 : 9000);
  // Worker cache includes model, endpoint and source text; do not bypass it via stale memory.
  const parts = [];
  studyState.parts[kind] = parts; studyState.busy = true; studyState.stop = false; studyState.kind = kind; studyState.failures = [];
  let cacheHits = 0, requests = 0, failedRequests = 0;
  studyMount();
  for (let i = 0; i < batches.length; i++) {
    if (epoch !== studyState.epoch || studyState.stop || videoId !== currentVideoId) break;
    if (parts[i]) continue;
    studyStatus(`${kind === 'cleanup' ? '整理' : '概览'}：${i + 1}/${batches.length} 段，${STUDY.time(batches[i][0].start)} 起`);
    try {
      const result = await sendTranslationMessage({ action: 'studyAiBatch', kind, rows: batches[i], videoId, title, sourceKey: studyState.key, force });
      if (epoch !== studyState.epoch || videoId !== currentVideoId) return;
      if (!result?.success) throw new Error(result?.error || '任务失败，请重试');
      parts[i] = result.value; result.cached ? cacheHits++ : requests++;
      if (result.cacheWarning) studyState.failures.push(result.cacheWarning);
      if (kind === 'overview') {
        currentAnalysis = { ...STUDY.mergeOverview(parts), completed: parts.filter(Boolean).length, total: batches.length };
        renderAnalysisResults(currentAnalysis); await saveToCache(videoId);
      }
    } catch (error) {
      if (epoch !== studyState.epoch) return;
      failedRequests++;
      studyState.failures.push(`${STUDY.time(batches[i][0].start)}–${STUDY.time(batches[i].at(-1).end)}：${error.message}`);
      // Configuration errors should not generate one failing request per batch.
      if (/key|密钥|401|403|配置|permission/i.test(error.message)) break;
    }
  }
  if (epoch !== studyState.epoch || videoId !== currentVideoId) return;
  const done = parts.filter(Boolean).length;
  if (kind === 'cleanup' && done === batches.length) {
    studyState.cleaned = parts.flat(); studyState.useCleaned = true;
    translationGeneration++; currentTranscriptMode = 'original'; setTranscriptModeButtons('original');
    renderTranscript();
  }
  const missing = batches.flatMap((b, i) => parts[i] ? [] : [`${STUDY.time(b[0].start)}–${STUDY.time(b.at(-1).end)}`]);
  const state = done === batches.length ? '完成' : studyState.stop ? '已停止后续处理' : '部分完成';
  studyStatus(`${state} · ${done}/${batches.length} 段 · ${requests} 次生成 · ${cacheHits} 次缓存${failedRequests ? ` · 失败 ${failedRequests}（可能计费）` : ''}${missing.length ? `\n待处理：${missing.join('、')}。再次点击可续做。` : ''}${studyState.failures.length ? '\n' + studyState.failures.join('\n') : ''}`);
  studyState.busy = false; studyMount();
}
triggerAnalysis = () => runStudyTask('overview');

renderAnalysisResults = function (analysis) {
  const summary = studyEl('overviewSummary'); summary.replaceChildren();
  for (const part of analysis.summaries || []) {
    const block = document.createElement('div'); block.className = 'summary-card';
    const label = document.createElement('strong'); label.textContent = `${STUDY.time(part.start)} · ${part.topic}`; block.append(label);
    const list = document.createElement('ul');
    for (const t of part.takeaways || []) { const li = document.createElement('li'); li.textContent = t; list.append(li); }
    block.append(list); summary.append(block);
  }
  const badge = document.createElement('p'); badge.className = 'help';
  badge.textContent = analysis.total ? `字幕分段处理：${analysis.completed}/${analysis.total}${analysis.completed < analysis.total ? '，尚未完整生成，请点击继续生成。' : '。章节范围已检查，内容仍请对照原视频核对。'}` : '已缓存的概览';
  summary.prepend(badge);
  const list = studyEl('chapterList'); list.replaceChildren();
  for (const chapter of analysis.chapters || []) {
    const li = document.createElement('li'); li.className = 'study-chapter';
    const details = document.createElement('details'); details.open = true;
    const header = document.createElement('summary'); header.textContent = chapter.title;
    const jump = document.createElement('button'); jump.className = 'enhance-btn'; jump.textContent = STUDY.time(chapter.timestampSeconds); jump.addEventListener('click', () => seekTo(chapter.timestampSeconds));
    const description = document.createElement('p'); description.textContent = chapter.summary;
    details.append(header, jump, description); li.append(details); list.append(li);
  }
  const quotes = studyEl('quotesList'); quotes.replaceChildren();
  for (const quote of analysis.keyQuotes || []) {
    const card = document.createElement('div'); card.className = 'quote-item';
    const text = document.createElement('p'); text.className = 'quote-text'; text.textContent = quote.quote;
    const jump = document.createElement('button'); jump.className = 'enhance-btn'; jump.textContent = `${STUDY.time(quote.timestampSeconds)} 原文`; jump.addEventListener('click', () => seekTo(quote.timestampSeconds));
    const save = document.createElement('button'); save.className = 'enhance-btn'; save.textContent = '保存摘录'; save.addEventListener('click', () => saveQuoteAsNote(quote, save));
    card.append(text, jump, save); quotes.append(card);
  }
  if (!analysis.keyQuotes?.length) quotes.textContent = '本次没有可核对的金句原文。';
};

async function studyFullTranslation() {
  if (studyState.busy || subtitleReloadRequest || !currentTranscript?.length) return;
  studyReset();
  const epoch = studyState.epoch;
  studyState.busy = true; studyState.stop = false; studyState.fullTranslation = true;
  translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null;
  currentTranscriptMode = 'bilingual'; setTranscriptModeButtons('bilingual');
  const segments = getActiveTranscriptSegments(), generation = translationGeneration, videoId = currentVideoId;
  renderTranscriptModeRows(segments, 'bilingual'); studyMount();
  for (let start = 0; start < segments.length; start += TRANSLATION_BATCH_SIZE) {
    if (studyState.stop || epoch !== studyState.epoch || generation !== translationGeneration) break;
    const indices = Array.from({ length: Math.min(TRANSLATION_BATCH_SIZE, segments.length - start) }, (_, i) => start + i)
      .filter(i => !transcriptParagraphCache.has(transcriptTranslationCacheKey(segments[i])));
    if (indices.length) {
      const result = await requestTranscriptTranslationBatch(indices, segments, generation, videoId, 'bilingual');
      if (result?.error && /key|密钥|401|403|配置|permission/i.test(result.error)) {
        studyStatus('翻译已停止：' + result.error); break;
      }
    }
    if (epoch !== studyState.epoch) return;
    const done = segments.filter(s => transcriptParagraphCache.has(transcriptTranslationCacheKey(s))).length;
    studyStatus(`全文翻译：${done}/${segments.length} 段；失败段可重试。`);
  }
  if (epoch !== studyState.epoch) return;
  studyState.busy = false; studyState.fullTranslation = false; studyMount();
}

function studyExport(copy = false) {
  const segments = getActiveTranscriptSegments();
  const translated = new Map(segments.map(s => [s.id, transcriptParagraphCache.get(transcriptTranslationCacheKey(s))]));
  const options = { title: currentVideoTitle, url: DIGEST_VIDEO.url(currentVideoId), segments, mode: currentTranscriptMode,
    translated, timestamps: studyEl('exportTimestamps').checked };
  let output = STUDY.exportText(options);
  if (output.missing && !confirm(`还有 ${output.missing} 段未翻译。确定导出明确标注缺失的部分结果？取消后可点击“翻译全文”。`)) return;
  if (output.missing) output = STUDY.exportText({ ...options, partial: true });
  if (copy) { copyToClipboardWithFeedback(output.text, 'copyTranscriptBtn'); return; }
  downloadTextFile(output.text, `${sanitizeFilename(currentVideoTitle)}-${currentTranscriptMode}.txt`);
}
exportTranscript = () => studyExport(false);
copyTranscript = () => studyExport(true);

async function reloadStudyTranscript(trackId, forceRefresh = false) {
  if (studyState.busy || subtitleReloadRequest || !currentVideoId) return;
  const videoId = currentVideoId, tabId = youtubeTabId, generation = ++digestGeneration;
  const request = subtitleReloadRequest = { videoId, tabId, generation };
  const isCurrent = () => subtitleReloadRequest === request && videoId === currentVideoId &&
    tabId === youtubeTabId && generation === digestGeneration;
  translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null;
  studyStatus(forceRefresh ? '正在重新获取字幕，当前内容仍可阅读…' : '正在切换字幕轨…');
  studyMount();
  let timeout;
  try {
    // Go directly to the provider; never satisfy an explicit refresh from the
    // local digest/overview cache. Keep the old result until a valid one arrives.
    const result = await Promise.race([
      chrome.runtime.sendMessage({ action: 'fetchTranscript', videoId, tabId, trackId, forceRefresh }),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('字幕请求超时，请稍后重试。')), 30000); }),
    ]);
    if (!isCurrent()) return;
    if (!result?.success) throw new Error(result?.message || result?.error || '未收到字幕结果，请重试。');
    if (!DIGEST_VIDEO.validTranscriptSource(videoId, result.source)) throw new Error('字幕来源与当前视频不一致，请重试。');
    if (!Array.isArray(result.transcript) || !result.transcript.length ||
        result.transcript.some(row => !row || typeof row.text !== 'string' || !row.text.trim() || !Number.isFinite(row.start) || row.start < 0)) {
      throw new Error('平台未返回有效字幕，请稍后重试。');
    }
    const changed = currentTranscriptSource?.trackId !== result.source?.trackId ||
      currentTranscriptLanguage !== result.language || currentTranscript?.length !== result.transcript.length ||
      result.transcript.some((row, i) => row.text !== currentTranscript[i]?.text || row.start !== currentTranscript[i]?.start || row.duration !== currentTranscript[i]?.duration);
    const area = studyEl('contentArea'), scrollTop = area.scrollTop;
    currentTranscript = result.transcript; currentTranscriptText = result.transcriptText; currentTranscriptTimestamped = result.transcriptTextTimestamped;
    currentTranscriptSource = result.source || null; currentTranscriptLanguage = result.language || null; currentTranscriptTracks = result.tracks || [];
    if (changed) { currentAnalysis = null; studyState.key = ''; }
    currentTranscriptMode = 'original'; setTranscriptModeButtons('original'); renderTranscript();
    if (forceRefresh) { lastAutoScrollTime = Date.now(); area.scrollTop = scrollTop; }
    studyStatus(`${forceRefresh ? '字幕已刷新' : '已切换字幕轨'} · ${currentTranscript.length} 条${changed ? ' · 概览可按需重新生成' : ''}`);
    await saveToCache(videoId);
  } catch (e) {
    if (isCurrent()) studyStatus(`${forceRefresh ? '刷新失败' : '切换失败'}，已保留当前字幕。${e.message}`);
  } finally {
    clearTimeout(timeout);
    if (subtitleReloadRequest === request) { subtitleReloadRequest = null; studyMount(); }
  }
}
const studyChangeTrack = () => reloadStudyTranscript(studyEl('subtitleTrack').value);
const refreshStudyTranscript = () => reloadStudyTranscript(currentTranscriptSource?.trackId || null, true);

document.addEventListener('DOMContentLoaded', () => {
  if (STUDY_CLEANUP_ENABLED) studyEl('cleanTranscriptBtn').addEventListener('click', () => runStudyTask('cleanup'));
  studyEl('generateOverviewBtn').addEventListener('click', () => runStudyTask('overview'));
  studyEl('regenerateOverviewBtn').addEventListener('click', () => runStudyTask('overview', true));
  studyEl('translateAllBtn').addEventListener('click', studyFullTranslation);
  studyEl('stopStudyBtn').addEventListener('click', () => { studyState.stop = true; if (!studyState.fullTranslation) translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null; studyStatus('停止安排后续请求；已发出的请求可能仍产生费用，完成结果会缓存。'); });
  studyEl('rawModeBtn').addEventListener('click', () => { if (studyState.busy) return; studyState.useCleaned = false; currentTranscriptMode = 'original'; translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null; setTranscriptModeButtons('original'); renderTranscript(); });
  studyEl('cleanModeBtn').addEventListener('click', () => { if (studyState.busy) return; studyState.useCleaned = true; currentTranscriptMode = 'original'; translationGeneration++; transcriptScrollObserver?.disconnect(); transcriptScrollObserver = null; setTranscriptModeButtons('original'); renderTranscript(); });
  studyEl('subtitleTrack').addEventListener('change', studyChangeTrack);
  studyEl('refreshTranscriptBtn').addEventListener('click', refreshStudyTranscript);
  studyEl('exportNotesBtn').addEventListener('click', () => {
    const text = currentNotes.map(n => `## ${n.videoTitle}\n\n[${n.timestamp}](${n.timestampedUrl})\n\n${n.text}`).join('\n\n');
    downloadTextFile(text || '暂无摘录', '视频摘录.md');
  });
});
