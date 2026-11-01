# Security

Do not commit API keys, browser profiles, cookies or local storage dumps. Keys are entered only in the extension Settings page. Custom provider addresses accept HTTPS or loopback HTTP and disallow embedded credentials, query strings and fragments. They are supplied by the user; use providers you trust.

Video captions and model output are untrusted. The study overview renderer uses DOM textContent; cleanup output must preserve source words, numeric tokens, order and coverage. Quote text is copied from source captions. Source coverage checks do not prove factual accuracy. No model output is executed as code.

The extension needs access to supported video pages for playback controls. Bilibili caption reads use named API/CDN host permissions, validated URLs and video/part identity, bounded requests, and no redirects. Signed caption URLs are not sent to the panel or to AI providers. Optional custom-domain permission is requested only on saving that provider. The release packager checks referenced assets and includes only explicit public files. See VALIDATION.md for test scope. This is an experimental development preview.
