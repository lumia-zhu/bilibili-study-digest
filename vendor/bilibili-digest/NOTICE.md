# Bilibili Digest API client

`wbi.js` and `bili-api.js` originate from [biuworks/bilibili-digest](https://github.com/biuworks/bilibili-digest), commit `e1fab3eca9810dd3bb11308b6fec658270e1ff43`, paths `lib/wbi.js` and `lib/bili-api.js` (version 0.4.6).

Copyright (c) 2026 k1234567. Portions copyright (c) 2026 Zara Zhang. Licensed under the MIT license; the complete upstream license is included in this directory.

Local changes in `bili-api.js`: support AV identifiers; require an exact video/part and player identity match; report the subtitle list endpoint in source metadata; reject invalid caption times and sort captions chronologically. The separate `bilibili-background.js` adapter restricts network destinations, credentials and redirects, bounds request duration, and preserves our panel's source validation and explicit track selection.

These modules retrieve platform-provided CC captions; they do not generate AI transcripts or invoke an LLM.
