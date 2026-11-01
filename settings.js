/**
 * Shared, non-secret configuration helpers.
 *
 * API keys are stored in chrome.storage.local by options.js. This file contains
 * defaults and validation only, so it is safe to publish.
 */
var YTD_SETTINGS = (() => {
  const STORAGE_KEY = "ytd_settings";
  const DEFAULTS = Object.freeze({
    provider: "deepseek",
    aiApiKey: "",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
    supadataApiKey: "",
  });

  function isLegacyCustom(input) {
    return !!input && input.provider === "custom" && input.schemaVersion !== 2;
  }

  function safeBaseUrl(value) {
    const url = new URL(value || DEFAULTS.aiBaseUrl);
    if (url.username || url.password || url.search || url.hash ||
        !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) {
      throw new Error('服务地址须为 HTTPS，或本机 HTTP；不能包含密钥、查询参数或账号。');
    }
    return url.href.replace(/\/$/, '').replace(/\/chat\/completions$/, '');
  }

  function normalize(input = {}) {
    return {
      provider: input.schemaVersion === 2 ? 'custom' : DEFAULTS.provider,
      schemaVersion: input.schemaVersion === 2 ? 2 : 1,
      aiApiKey: isLegacyCustom(input)
        ? ""
        : typeof input.aiApiKey === "string"
          ? input.aiApiKey.trim()
          : "",
      aiBaseUrl: input.schemaVersion === 2 ? safeBaseUrl(input.aiBaseUrl) : DEFAULTS.aiBaseUrl,
      aiModel: input.schemaVersion === 2 && input.aiModel?.trim() ? input.aiModel.trim().slice(0, 200) : DEFAULTS.aiModel,
      supadataApiKey:
        typeof input.supadataApiKey === "string"
          ? input.supadataApiKey.trim()
          : "",
    };
  }

  function migrateLegacyCustom(input = {}) {
    return {
      settings: normalize(input),
      migrated: isLegacyCustom(input),
    };
  }

  function chatCompletionsUrl(settings = DEFAULTS) {
    return `${safeBaseUrl(settings.aiBaseUrl)}/chat/completions`;
  }

  function canonicalYouTubeUrl(videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
      throw new Error("Invalid YouTube video ID.");
    }
    return `https://www.youtube.com/watch?v=${normalized}`;
  }

  return {
    STORAGE_KEY,
    DEFAULTS,
    isLegacyCustom,
    normalize,
    migrateLegacyCustom,
    chatCompletionsUrl,
    canonicalYouTubeUrl,
    safeBaseUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_SETTINGS;
}
