## UI 一致性修复 Skill

### 目标
当需求涉及以下问题时，先检索本 Skill，再决定如何修改：

- 规范相关问题
- header 间距不一致
- 返回按钮、标题、版本号之间距离不对
- 版本号从椭圆改矩形，或矩形被改坏
- 同类型按钮、容器、输入框样式不一致
- 预览文档左上角版本号被误改

### 触发关键词

- 规范
- 一致性
- 间距
- 留白
- padding
- gap
- border-radius
- 版本号
- 椭圆
- 矩形
- 返回按钮
- 标题
- header
- 预览文档
- 左上角
- 回滚

### 先检索，再修改

1. 先看 `references/search-index.md`
2. 命中关键词后，优先看 `references/recent-ui-fixes.md` 的对应案例
3. 再看 `references/ui-consistency-rules.md` 的通用规则
4. 找到当前页面中已经正确的同类组件，作为对照基线
5. 只做局部最小修改，优先调整 `padding`、`gap`、`border-radius`、`width`
6. 修改后同时检查展示态、编辑态、hover 态、预览态
7. 如果问题出在 `DocumentPreview`，不要直接套用编辑器 header 规则；预览文档是独立视觉体系

### 强制规则

- 同类型按钮间距一致
- 同类型容器的文字大小、样式、间距一致
- 输入框或底板内部上下左右留白一致
- 修改新问题时，不要破坏已有已修好的功能

### 当前基线

| 场景 | 基线文件 | 当前规则 |
| --- | --- | --- |
| 列表表格模版 header | `src/components/TemplateEditor.css` | `header-left` 用 `gap: 12px`，`template-badge` 用 `gap: 4px`，版本号使用紧凑矩形 |
| 击杀图标模版 header | `src/components/KillIconEditor.css` | 视觉上对齐列表表格模版 header |
| 发包模版总模版页顶栏 | `src/components/TemplateLibrary.css` | 标题使用 `padding: 0 4px`，与编辑页保持一致 |
| 预览文档版头 | `src/components/DocumentPreview.css` + `src/components/DocumentPreview.tsx` | 独立视觉体系，左上角版本号不要直接套编辑器规则 |

### 快速命中

- `版本号 + 椭圆 + 矩形 + 留白`：优先看 `CASE-001`、`CASE-002`
- `返回按钮 + 标题 + 间距`：优先看 `CASE-003`
- `预览文档 + 左上角 + 版本号 + 回滚`：优先看 `CASE-004`
- `按钮/容器/输入框 一致性`：优先看 `references/ui-consistency-rules.md`

### 文件导航

- `references/search-index.md`：关键词索引
- `references/ui-consistency-rules.md`：通用规则与检查清单
- `references/recent-ui-fixes.md`：最近问题复盘与已验证解法

### 标准执行顺序

1. 先命中关键词
2. 再找最近相同案例
3. 对照当前正确组件
4. 做最小修改
5. 检查是否误伤别的已修好区域

### 注意

- `DocumentPreview` 的头部版式和编辑器 header 不是同一个体系
- 不要因为“统一”而误改预览文档原稿布局
- `gap` 数值一致，不代表视觉间距一定一致；要同时检查组件自身 `padding`
- 版本号看起来过宽时，优先排查 `padding` 和 `width`，再考虑外层 `gap`
