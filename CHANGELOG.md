# Changelog

## v0.1.16 — 2026-11-03（开发预览）

- 将视频操作栏入口从英文 `digest` 改为中文「字幕」，更直接地说明用途。
- 参照 B 站发送按钮，调整为 36px 高、10px 圆角、至少 64px 宽的圆角矩形，使用中文字体与更舒展的留白。
- 同步更新中英文安装说明、B 站支持说明、开发验收清单和验证记录，修正文档中旧的浮动入口与辅助逗号描述；保留 MIT 许可证和完整来源说明。

Renames the video action-bar entry to 字幕 (Captions) and refines its rounded rectangle, Chinese typography and padding to fit Bilibili's native controls. Updates the bilingual installation guide, Bilibili support notes and validation checklist to match the current toolbar entry and reading layouts. MIT attribution is preserved. Development preview.

## v0.1.15 — 2026-11-03（开发预览）

- 将 B 站页面入口移到「点赞、投币、收藏、转发」旁，文案简化为 `digest`；使用参考发送按钮的天蓝色、小圆角与无阴影样式。
- 保存摘录保留为入口旁的小书签按钮，支持提示文字与键盘焦点。操作栏延迟加载、页面切换或操作栏重建后自动恢复入口，避免重复添加；不再覆盖视频画面。
- 一并发布 0.1.13 / 0.1.14 的天蓝图标和白底蓝色设置页更新：隐藏 YouTube / Supadata 配置并保留代码与已有密钥，明确先保存设置再测试连接。
- 保留中英文说明、MIT 许可证及 Zara Zhang 和第三方来源声明。

Moves the sky-blue `digest` entry beside Bilibili's native video actions, with a compact bookmark shortcut for saving excerpts. The entry recovers when the action bar mounts or is replaced. This preview also includes the blue icon and redesigned Settings from 0.1.13 / 0.1.14, with hidden but retained YouTube settings and save-before-test behavior.

## v0.1.14 — 2026-11-03（本地预览）

- 设置页改为白底、天蓝色按钮、细分隔线和简洁分区；沿用天蓝图标，保留中英文界面与窄窗口适配。
- 完全隐藏 YouTube / Supadata 设置，保留代码与已有密钥；保存 AI 配置时继续保留隐藏字段。
- 明确「保存设置 → 测试连接」顺序。未保存修改、缺少密钥、保存失败或测试进行中不发起新测试；编辑期间到达的旧测试结果不显示为当前配置结果。
- 模型与服务地址可展开修改；删除摘录和重置操作收进折叠区域，保留确认提示。

Redesigns Settings as a white and sky-blue page. YouTube / Supadata settings are hidden but retained. Connection testing requires a saved configuration; unsaved edits, storage failures and stale test results are handled explicitly. Local preview only.

## v0.1.13 — 2026-11-03（本地预览）

- 将插件图标替换为用户确认的天蓝色底，沿用圆角形状、白色播放三角与透明外缘；更新 16 / 48 / 128 / 512 像素图标，与侧栏蓝色配色呼应。
- 本次仅更新图标与版本说明，字幕、播放同步、设置和摘录功能不变。

Replaces the pink icon with the approved sky-blue variant in all four sizes, preserving the white play mark and transparent corners. No functional changes. Local preview only.

## v0.1.12 — 2026-11-02（开发预览）

- 将「逐句」升级为「跟读」：保留原始片段，使用 16 px 字号、紧凑间距与浅蓝播放高亮，时间入口约每 15 秒显示一次；每条字幕仍可点击和使用键盘跳转。
- 保留「段落」选项。新视频默认跟读，已有视频恢复保存的排版；切换时保留可见阅读位置。
- 两种排版均不调用 AI、不改写源文字；播放跟随逻辑保持不变。
- 一并发布 0.1.10 / 0.1.11 的本地迭代：字幕刷新、滚动遮挡修复和段内细间距。保留中英文说明、MIT 许可证与完整来源声明。

Adds compact Follow reading with original cues, 16 px text and sparse time markers alongside the existing Paragraph layout. Both layouts use no AI. Saved layouts, source text and playback-follow behavior are preserved. This development preview also includes the caption refresh, sticky-layout fix and inline spacing from the local 0.1.10 / 0.1.11 iterations.

## v0.1.11 — 2026-11-02（本地预览）

- 用约 3 px 的段内细间距替换自动辅助逗号和强制短行，文字按侧栏宽度自然折行，保留段落间距。
- 适度合并短碎片，尽量避开已有标点、拆开的数字与连接词；视觉间距不写入字幕，搜索、选择、摘录、复制与导出保持原文。
- 本地计算，不调用 AI；播放跟随与高亮逻辑保持不变。暂未同步 GitHub。

Replaces helper commas and forced short lines with subtle, display-only inline spacing. Natural wrapping, original text and playback-follow behavior are preserved. Local preview only.

## v0.1.10 — 2026-11-02

- 修复滚动后排版切换栏上方露出半行字幕的问题；窄侧栏与宽侧栏均对齐滚动区域顶部。
- 为时间连续、缺少停顿的中文字幕加入显示层短行，沿用原始片段边界，不调用 AI、不改写原文。已有的停顿逗号、播放高亮和逐句跳转继续保留。
- 在字幕条数旁新增「刷新字幕」，重新获取当前字幕轨并绕过本地及 HTTP 缓存；刷新时保留当前内容，防止重复提交，失败或超时不清空字幕，切换视频后丢弃迟到结果。
- 内容未变化时保留概览；字幕文字、时间或轨道变化时清除旧概览。刷新回到原文模式，不自动发起翻译或概览请求，摘录保持不变。

Fixes clipped text above the sticky layout controls, adds visual short lines for continuous captions, and provides an explicit caption refresh with cache bypass, failure retention and stale-response protection. No automatic model calls.

## v0.1.9 — 2026-11-02

- 原始字幕改用较短段落，通常约 60～90 个汉字；优先利用已有标点与停顿分段。
- 仅根据可靠停顿和保守边界规则显示少量辅助逗号，不补句号、不调用 AI。
- 辅助逗号只存在于显示层；选中文字、搜索、摘录、复制与导出保持原文，原有时间戳及播放高亮继续对应源片段。
- 段落计算按字幕数组缓存，播放和段落／逐句切换不重复计算。保留单条超长字幕，不截断原文。

Shorter local paragraphs and conservative visual pause commas, with no AI calls. Source text, excerpts and exports remain unchanged; layout planning is reused during playback and layout switches.

## v0.1.8 — 2026-11-02

- 侧栏蓝色减少灰感，调整为更清亮的天蓝；同步微调选中指示线、按钮、浅色表面和字幕高亮。
- 小字号与白字按钮使用较深的同色系蓝色，保留清晰对比。布局与功能沿用 0.1.7。

Brighter sky-blue accents and softer blue highlights, preserving the existing layout and behavior.

## v0.1.7 — 2026-11-02

- 侧栏改为雾蓝与白底，保留原有布局；统一中文字体、细线标签和轻量按钮，减少阴影与装饰。
- 暂时隐藏 AI 整理断句、原始／整理结果切换和空闲任务提示，侧栏整理入口不再发起请求。原文段落排版继续在本地完成。
- 字幕来源改为易读的语言名称；翻译与概览运行时才显示停止按钮，保留进度、失败与重试提示。
- 保留播放高亮、搜索、翻译、概览、摘录与导出；同步更新中英文使用说明。

A slate-blue sidebar with quieter reading controls. AI cleanup is temporarily unavailable; local paragraph layout, playback synchronization, translation and overview generation remain available.

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
