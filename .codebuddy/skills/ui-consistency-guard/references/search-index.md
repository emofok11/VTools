## 检索索引

### 使用方式

- 先按问题描述中的关键词命中本索引
- 再打开对应的案例或规则文件
- 若一个问题命中多个关键词，优先看最近案例，再回看通用规则

### 关键词到案例映射

| 关键词 | 优先查看 | 相关文件 | 说明 |
| --- | --- | --- | --- |
| 版本号；椭圆；矩形；header；留白；左右间距 | `CASE-001`、`CASE-002` | `TemplateEditor.css`、`KillIconEditor.css` | 编辑器 header 对齐问题 |
| 返回按钮；标题；间距；总模版页；顶栏 | `CASE-003` | `TemplateLibrary.css` | 顶栏按钮与标题间距问题 |
| 预览文档；左上角；版本号；改坏；回滚 | `CASE-004` | `DocumentPreview.css`、`DocumentPreview.tsx` | 预览文档独立体系，优先定点回滚 |
| 同类型按钮；同类型容器；输入框；底板；上下左右留白 | `ui-consistency-rules.md` | `references/ui-consistency-rules.md` | 通用设计法则 |
| 展示态；编辑态；hover；focus | `ui-consistency-rules.md` | `references/ui-consistency-rules.md` | 状态一致性检查 |
| gap 一样但看起来不一样 | `CASE-001`、`CASE-002` + `RULE-007` | `recent-ui-fixes.md`、`ui-consistency-rules.md` | 先查子元素自身留白 |
| 回滚；恢复最初版本；误伤已修好功能 | `CASE-004` + `RULE-005` | `recent-ui-fixes.md`、`ui-consistency-rules.md` | 定点恢复，不做扩大化修改 |

### 案例编号速览

- `CASE-001`：列表表格模版 header 版本号矩形化与留白收敛
- `CASE-002`：击杀图标模版 header 与列表表格模版对齐
- `CASE-003`：发包模版总模版页返回按钮与标题间距修复
- `CASE-004`：预览文档左上角版本号误改后的定点回滚

### 推荐检索顺序

1. 如果是规范类问题：先看 `ui-consistency-rules.md`
2. 如果是同类问题复现：先看 `recent-ui-fixes.md`
3. 如果同时涉及“统一”和“回滚”：先确认问题属于编辑器体系还是预览体系
4. 找到基线后，再去目标文件做最小修改

### 当前知识入口

- 主入口：`.codebuddy/skills/ui-consistency-guard/SKILL.md`
- 规则库：`.codebuddy/skills/ui-consistency-guard/references/ui-consistency-rules.md`
- 案例库：`.codebuddy/skills/ui-consistency-guard/references/recent-ui-fixes.md`
- 索引：`.codebuddy/skills/ui-consistency-guard/references/search-index.md`
