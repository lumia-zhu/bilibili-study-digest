# Changelog

## v0.1.6 — 2026-11-02

- 产品更名为 **BiliMemo**，同步更新扩展名称、设置、浮动按钮、导出署名和中英文说明。
- 使用粉色圆角底与白色播放三角图标；外侧为真正透明背景，提供 16 / 48 / 128 像素安装图标及 512 像素设计稿。
- 简短介绍聚焦字幕阅读、播放同步、概览与摘录；上游来源和完整 MIT 版权说明保留在 README、NOTICE 和许可证中。
- 保留原有数据存储标识；在同一个已安装扩展目录中更新时继续使用现有设置、缓存和摘录。仓库地址保持不变。

The product is now BiliMemo. This release updates branding and documentation; the original project credits and MIT notices remain included.

## v0.1.5 — 2026-11-01

首个 GitHub 开发预览版本。版本号沿用本地开发迭代，不表示此前已有公开 Release。

- B 站原始字幕、字幕轨切换与分 P 来源校验。
- 默认段落阅读，可切回逐句；段内字幕高亮、时间跳转与跨片段搜索。
- 按需 AI 整理、翻译、分批概览；成功批次缓存、失败续做和停止后续处理。
- 原文摘录、复制与导出；自定义 Chat Completions 服务设置。
- 播放连接恢复和错误诊断。
- 保留 Zara Zhang 及第三方 MIT 版权与许可证，记录来源和修改。

验证：125 项 Node 回归及独立 Edge 浏览器/扩展测试通过；具体范围见 [VALIDATION.md](VALIDATION.md)。未完成全部真实视频与登录配置验收，尚未上架扩展商店。

This is the first GitHub development preview. The version follows local iterations. YouTube compatibility is inherited; this release focuses on Bilibili. AI actions may incur provider charges. No automatic speech-recognition fallback is included.
