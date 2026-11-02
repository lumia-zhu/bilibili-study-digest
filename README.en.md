# BiliMemo

<img src="icons/icon128.png" alt="BiliMemo" width="80" height="80">

[简体中文](README.md) · **English**

A browser extension for reading captions, finding passages and reviewing key points alongside Bilibili videos. Useful for courses, interviews and other long videos.

**Start with original captions in a paragraph layout. Use AI only when you choose to.** Reading, search and playback highlighting require no AI key and make no model calls.

[Download](https://github.com/lumia-zhu/bilibili-study-digest/releases/tag/v0.1.7) · [Installation](#installation) · [FAQ](#faq) · [Changelog](CHANGELOG.md)

Current version: **v0.1.7 development preview** for Edge / Chrome. Not published in extension stores. Independently maintained and MIT licensed; see [attribution and license](#attribution-and-mit-license) below.

## Features

| Feature | What it does | Uses AI? |
|---|---|---|
| Caption reader | Paragraph layout by default, sentence layout toggle and available caption tracks | No |
| Playback synchronization | Highlights the current cue within its paragraph; click captions or timestamps to seek | No |
| Search and review | Find caption keywords and return to the current playback position after scrolling | No |
| Excerpts and export | Save timestamped original excerpts; copy or export TXT captions and Markdown excerpts | No |
| Translation and explanation | Read English captions in Chinese or bilingually; explain selected text | On request |
| Chapter overview | Generate chapters, key points and original quotes; process long captions in batches | On request |

Local paragraph layout does not rewrite the text. Each original cue retains its timing and highlight. It does not add missing punctuation. AI cleanup is temporarily hidden in this release.

## Installation

### 1. Download and load the extension

1. Open the [release page](https://github.com/lumia-zhu/bilibili-study-digest/releases/tag/v0.1.7) and download **`bilimemo-v0.1.7.zip`** from the assets.
2. Extract it into a permanent folder containing `manifest.json`. Do not select the ZIP itself.
3. Open `edge://extensions` in Edge or `chrome://extensions` in Chrome.
4. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.

### 2. Open a Bilibili video

Refresh existing video tabs. Open the side panel using the floating **BiliMemo · 字幕** button or the extension's toolbar icon.

Try original captions, keyword search, click-to-seek and saving an excerpt first. These features require no AI key. Some platform captions require signing into Bilibili. Grant caption-service access if prompted.

### 3. Configure AI when needed

To use translation or overview generation, enter your own API key, service URL and model in Settings. DeepSeek is the default configuration; compatible Chat Completions services can also be configured. Model availability depends on your provider and account.

This step is optional for original-caption reading. Testing the connection sends one short request to the configured service.

After updating, reload the extension and refresh video tabs. Keep the installation folder in place. Edge may install an independent unpacked copy, so make sure you update the folder it actually loads.

## AI usage and costs

- Opening a video, reading original captions, changing the paragraph/sentence layout or opening the overview tab does not invoke AI. Overview generation requires an explicit action.
- Chinese/bilingual mode, full translation, explanations, overview generation and connection tests call the configured provider after a user action and may incur charges.
- Cache hits avoid model calls. Retry can reuse successful batches; regenerating may incur further charges.
- Stopping prevents later batches. Requests already sent, including failed requests, may still be billed.
- Reopening a video starts in Original mode. No keys ship with the project. See the [privacy notice](PRIVACY.md) for data flows.

## FAQ

### Why do captions load without playback highlighting or the floating button?

Caption fetching and the video-page connection use separate paths. Successful caption loading does not prove that playback synchronization is connected.

For `PAGE_ACCESS_BLOCKED / Blocked` in Edge, keep the Bilibili tab open and check the site-level **Allow extensions on bilibili.com** switch at the top of the browser's extensions menu. Enable it, refresh the video page, then use the panel's reconnect button. This switch is separate from the extension's own site permissions.

If it still fails, inspect the version and error code in the panel's synchronization diagnostics. Other browser policies can also block access; the code alone does not identify the cause.

### Why are captions unavailable for some videos?

The extension reads captions that Bilibili supplies and your current session can access. Some require login; others are unavailable. There is no automatic speech-recognition fallback or access-restriction bypass.

### Does the overview cover the whole video?

Long captions are processed in batches with checks for continuous source coverage. Failed batches show their range and can be retried. Coverage validation is not fact-checking; review AI summaries against the original.

### Does it support YouTube?

The inherited YouTube workflow requires a separate Supadata key. Development and testing currently focus on Bilibili; the real YouTube workflow has not completed validation.

## Current scope

- Standard Bilibili BV video pages and multipart videos are supported. Live streams and series pages are outside the current scope.
- Original captions, translations and different tracks are handled separately. Incomplete translation exports are explicitly identified.
- Original excerpts can be saved and exported; a personal interpretation editor is not included.
- Local layout rules do not guarantee topic boundaries. The fallback player clock has whole-second precision.
- This is a development preview. The full real-video, login, live-model and store-installation matrix remains incomplete. See the [validation record](VALIDATION.md).

## Development

Node.js 22 or later. The core extension and Node tests require no third-party dependencies.

```sh
npm test
npm run check
npm run package
```

Optional browser tests:

```sh
npm install
npx playwright install chromium
npm run test:browser
npm run test:extension
```

Set `BROWSER_EXECUTABLE` to use an existing test browser. Browser tests use isolated temporary contexts and mock captions/model responses, without reading personal browser profiles or keys. Release packages use an explicit file allowlist and exclude test fixtures and local settings.

See the [development plan](DEVELOPMENT.md), [validation record](VALIDATION.md) and [changelog](CHANGELOG.md).

## Attribution and MIT license

Maintained independently by [lumia-zhu](https://github.com/lumia-zhu). Based on **[youtube-digest by Zara Zhang](https://github.com/zarazhangrui/youtube-digest)** v1.2.0 (`bb2f7b1`), retaining its commit history and `Copyright (c) 2026 Zara Zhang`. This is not an official Zara release or an endorsement by the upstream authors.

- Early Bilibili adaptation references and integrates [Clawborn's PR #17](https://github.com/zarazhangrui/youtube-digest/pull/17), commit `2fffd55`.
- The background caption API client and WBI signer are adapted from [biuworks/bilibili-digest](https://github.com/biuworks/bilibili-digest), commit `e1fab3e`, retaining the k1234567 and Zara Zhang copyright notices.
- This project remains [MIT licensed](LICENSE). Preserve the relevant copyright and permission notices when redistributing, including the vendored license.

See [NOTICE.md](NOTICE.md) and the [vendor attribution](vendor/bilibili-digest/NOTICE.md) for provenance, scope and modifications.
