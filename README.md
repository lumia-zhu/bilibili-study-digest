# Bilibili Study Digest

An independent, experimental Bilibili-first fork of [YouTube Digest by Zara Zhang](https://github.com/zarazhangrui/youtube-digest). MIT licensed; not an official Zara release. Version 0.1.5.

[Download v0.1.5 preview](https://github.com/lumia-zhu/bilibili-study-digest/releases/tag/v0.1.5) · [中文说明](README.zh-CN.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE) · [Attribution](NOTICE.md)

Read the [Chinese guide](README.zh-CN.md) for setup and scope. This fork starts with raw captions and makes AI cleanup and overview generation explicit. It adds full-coverage chapter validation, source-checked quotes, chunk caching and retry, track selection, timestamp excerpts and configurable Chat Completions providers. YouTube support remains inherited from upstream and requires a Supadata key.

## Install

Keep the extracted folder in a permanent location. Open `edge://extensions` in Edge or `chrome://extensions` in Chrome, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Refresh existing video tabs. Open the floating Digest button or the toolbar extension icon. Bilibili raw captions do not require an AI key; some captions require signing into Bilibili normally. Enter your own AI key in Settings only when you want AI features. No keys ship with the extension.

Version 0.1.2 reads Bilibili metadata and captions directly from the extension background using signed Bilibili APIs. It no longer requires dynamic page-script injection for these reads. Reload the extension after updating; if prompted, allow access to the Bilibili API and caption CDN domains. Playback controls still use a content script.

Version 0.1.3 highlights the current caption range, shows playback synchronization status, and follows playback automatically. Manual scrolling pauses scrolling while highlighting continues; use the return-to-playback button to resume. The content script prioritizes the main player and falls back to its displayed clock if a custom player's time is unreadable. This fallback has whole-second precision. Missing time is reported instead of treated as zero. No AI request is needed for playback highlighting.

Version 0.1.4 reads playback time directly from the bound tab, uses the worker only for recovery, and scopes video detection to the panel's own window. A reconnect button requests Bilibili page access when needed and restores the page receiver. Specific error codes and expandable diagnostics replace the generic synchronization warning. The panel header displays the installed version. Caption API access and video-page access are separate permissions.

## Costs and limitations

Version 0.1.5 defaults to a local paragraph layout with a sentence-layout toggle. It groups source cues using pauses, existing punctuation and length limits without rewriting their text. Individual cues retain their playback highlight, click-to-seek time and search identity; a search phrase can span multiple original cues in a paragraph. Layout switching preserves the visible reading anchor and does not start AI tasks. Each video's layout is saved with its reading position. AI cleanup remains explicit and keeps its own paragraph boundaries; exports retain their existing source granularity.

Opening a video or overview tab does not invoke AI. Chinese/bilingual mode, cleanup, overview generation, explanations, full translation and connection tests invoke the configured provider after a user action. Cache hits do not call the model. Stopping prevents later batches; already sent requests can still be billed. Failed responses can also incur charges. Reopening starts in Original mode.

Only standard BV video pages and multipart videos are supported for Bilibili. No automatic ASR fallback is provided. Chapter validation checks source coverage, not factual accuracy. This build is not store-published. See [validation results](VALIDATION.md) for tested and untested scope, and [development plan](DEVELOPMENT.md).

## Development

Node.js 22+: `npm test`, `npm run check`, `npm run package`. Optional browser smoke tests: `npm install`, `npx playwright install chromium`, `npm run test:browser`. Set `BROWSER_EXECUTABLE` to use an existing browser in an isolated test context. The release ZIP uses an explicit allowlist and contains no test fixtures or local settings.

## Credits

Maintained independently by [lumia-zhu](https://github.com/lumia-zhu/bilibili-study-digest). Based on Zara Zhang's MIT-licensed youtube-digest v1.2.0 (`bb2f7b1`), with Bilibili adaptation from [PR #17 by Clawborn](https://github.com/zarazhangrui/youtube-digest/pull/17), commit `2fffd55`. Original copyright is preserved in [LICENSE](LICENSE), with an additional notice for this project's modifications. See [NOTICE.md](NOTICE.md) for the complete provenance and redistribution notices. This project does not imply endorsement by its upstream authors.

The background Bilibili API client and WBI signer are adapted from [biuworks/bilibili-digest](https://github.com/biuworks/bilibili-digest), commit `e1fab3e` (MIT, k1234567; portions Zara Zhang). See [vendor attribution and changes](vendor/bilibili-digest/NOTICE.md) and the [included MIT license](vendor/bilibili-digest/LICENSE).
