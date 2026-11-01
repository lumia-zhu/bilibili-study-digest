/* Tab-bound playback reads. No caption, provider, or storage access. */
var DIGEST_PLAYBACK = (() => {
  const videos = typeof DIGEST_VIDEO !== 'undefined' ? DIGEST_VIDEO : require('./platforms.js');
  function classify(error) {
    const detail = String(error?.message || error || '').replace(/https?:\/\/[^\s"'<>]+/g, '[页面地址]').slice(0, 160);
    const known = ['PAGE_ACCESS_REQUIRED','PAGE_ACCESS_BLOCKED','CONTENT_NOT_CONNECTED','PLAYER_TIME_UNAVAILABLE','PLAYBACK_TIMEOUT','VIDEO_CHANGED','VIDEO_TAB_CLOSED'];
    let code = error?.code || (known.includes(detail) ? detail : 'PLAYBACK_CONNECTION');
    if (/VIDEO_CHANGED/.test(detail)) code = 'VIDEO_CHANGED';
    else if (/Blocked|Cannot access|permission|denied|not allowed/i.test(detail)) code = 'PAGE_ACCESS_BLOCKED';
    else if (/Receiving end does not exist|Could not establish connection/i.test(detail)) code = 'CONTENT_NOT_CONNECTED';
    else if (/No tab|tab was closed/i.test(detail)) code = 'VIDEO_TAB_CLOSED';
    return {success: false, error: code, detail};
  }
  async function bounded(promise, timeoutMs) {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('播放页响应超时'), {code: 'PLAYBACK_TIMEOUT'})), timeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  }
  async function read(tabId, videoId, {api = chrome, timeoutMs = 1500} = {}) {
    try {
      if (!Number.isInteger(tabId)) return {success: false, error: 'VIDEO_TAB_CLOSED'};
      const tab = await bounded(api.tabs.get(tabId), timeoutMs);
      if (videos.parse(tab.url)?.id !== videoId) return {success: false, error: 'VIDEO_CHANGED'};
      const payload = {action: 'getCurrentTime', videoId};
      try {
        // A healthy page does not need a service-worker round trip every tick.
        const response = await bounded(api.tabs.sendMessage(tabId, payload, {frameId: 0}), timeoutMs);
        if (!response) throw new Error('Could not establish connection');
        if (response.videoId && response.videoId !== videoId) return {success: false, error: 'VIDEO_CHANGED'};
        return {success: true, response, transport: 'direct'};
      } catch (directError) {
        if (videos.fromId(videoId)?.platform === 'bilibili' && api.permissions &&
            !await bounded(api.permissions.contains({origins: ['https://www.bilibili.com/*']}), timeoutMs)) {
          return {success: false, error: 'PAGE_ACCESS_REQUIRED'};
        }
        // The existing worker can restore a missing page receiver once.
        const result = await bounded(api.runtime.sendMessage({action: 'relayToContent', tabId, videoId, payload}), timeoutMs);
        if (!result?.success) return classify(result?.error || directError);
        return {...result, transport: 'relay'};
      }
    } catch (error) { return classify(error); }
  }
  return {read, classify, bounded};
})();
if (typeof module !== 'undefined') module.exports = DIGEST_PLAYBACK;
