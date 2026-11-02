# 来源、修改与许可证 / Attribution and licensing

本项目 **BiliMemo**（原名 B 站学习 Digest / Bilibili Study Digest） 由 [lumia-zhu](https://github.com/lumia-zhu) 维护，基于下列开源项目进行二次开发。它不是 Zara Zhang 的官方版本，也不代表原作者为本项目背书。

This is an independently maintained derivative, not an official release or endorsement by Zara Zhang or the other upstream contributors.

| 来源 / Source | 基线 / Revision | 使用范围 / Scope | 授权 / License |
|---|---|---|---|
| [zarazhangrui/youtube-digest](https://github.com/zarazhangrui/youtube-digest) — Zara Zhang | [`bb2f7b1aedb6b50c261c0cf35b0acc7ed631d833`](https://github.com/zarazhangrui/youtube-digest/commit/bb2f7b1aedb6b50c261c0cf35b0acc7ed631d833), v1.2.0 | 扩展架构、侧栏、字幕与 AI 工作流、设置、样式及既有测试；原仓库历史保留 | [MIT](LICENSE)，保留 Copyright (c) 2026 Zara Zhang |
| [youtube-digest PR #17](https://github.com/zarazhangrui/youtube-digest/pull/17) — Clawborn | [`2fffd55`](https://github.com/zarazhangrui/youtube-digest/commit/2fffd55) | 社区 B 站适配，作为本项目 B 站支持的早期参考与集成来源 | 沿用 youtube-digest 的 MIT 许可证 |
| [biuworks/bilibili-digest](https://github.com/biuworks/bilibili-digest) — k1234567 | [`e1fab3eca9810dd3bb11308b6fec658270e1ff43`](https://github.com/biuworks/bilibili-digest/commit/e1fab3eca9810dd3bb11308b6fec658270e1ff43), v0.4.6 | `vendor/bilibili-digest/wbi.js`、`bili-api.js`：WBI 签名与平台字幕 API 客户端 | [完整 MIT 许可证](vendor/bilibili-digest/LICENSE)；含 k1234567 与 Zara Zhang 版权声明 |

## 本项目的修改

- 优先支持 B 站视频、分 P 和字幕轨；核对字幕来源与视频身份。
- 默认读取平台原始字幕；本地段落/逐句排版、段内播放高亮、搜索与时间跳转。
- 显式开启 AI 整理、翻译与概览；加入分批处理、内容保真检查、覆盖检查、缓存与失败重试。
- 0.1.7 暂时隐藏 AI 整理入口，保留本地原文段落阅读；侧栏更新为雾蓝、白底与精简控件。
- 播放连接恢复与错误诊断、原文摘录、复制导出、可配置 AI 服务。
- 单元、浏览器交互、扩展集成测试，以及跨平台发布检查与打包。

第三方 API 客户端的具体修改另见 [vendor/bilibili-digest/NOTICE.md](vendor/bilibili-digest/NOTICE.md)。测试边界与未完成项见 [VALIDATION.md](VALIDATION.md)。

## MIT 说明

本项目继续以 [MIT License](LICENSE) 发布；根许可证保留 Zara Zhang 的原始版权声明，并增加本项目修改部分的版权声明。再分发本项目或其中实质性代码时，请一并保留相关版权声明和完整许可文本，包括 `vendor/` 下的第三方许可证。本说明不替代许可证正文。

The project remains MIT licensed. Original copyright and permission notices are retained, including the vendored license. Keep those notices with redistributed copies or substantial portions. The software is provided "AS IS", as stated in the full license.

许可证适用于仓库中的代码，不代表授予第三方视频、字幕、商标或 AI 服务的使用权。相关内容和服务仍受各自权利与条款约束。
