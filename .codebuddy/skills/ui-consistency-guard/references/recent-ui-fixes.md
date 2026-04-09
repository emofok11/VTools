## 最近 UI 规范问题复盘

### CASE-001 列表表格模版 header：版本号从椭圆收敛为矩形，并统一留白

- **触发问题**：header 中版本号是椭圆形，标题是矩形；后续又发现版本号左右留白比标题更大
- **影响文件**：`src/components/TemplateEditor.css`
- **根因**：
  - `.version-tag` 和 `.header-version-input` 的圆角过大，视觉上像胶囊
  - 版本号左右 `padding` 过大
  - 编辑态设置了偏宽的固定 `width`
- **最终解法**：
  - `.template-editor .version-tag`：`padding: 4px`、`border-radius: 4px`
  - `.template-editor .header-version-input`：`padding: 4px`、`border-radius: 4px`、`width: 72px`
  - 标题基线保持：`.template-editor .badge-text-editable` 使用 `padding: 0 4px`
  - 外层结构保持：`.template-editor .header-left` 用 `gap: 12px`，`.template-editor .template-badge` 用 `gap: 4px`
- **结果**：版本号变为紧凑矩形，标题与版本号的视觉节奏一致
- **复用结论**：先收敛标签自身 `padding` 和 `width`，不要先动外层 `gap`

### CASE-002 击杀图标模版 header：与列表表格模版对齐

- **触发问题**：击杀图标模版的 `返回 -> 标题 -> 版本号` 与列表表格模版骨架类似，但视觉间距不一致
- **影响文件**：`src/components/KillIconEditor.css`
- **根因**：
  - `.badge-text` 没有左右 `padding`
  - `.version-tag` 仍然是偏宽的胶囊风格
- **最终解法**：
  - `.badge-text`：补齐 `padding: 0 4px`
  - `.version-tag`：改为 `padding: 4px`、`border-radius: 4px`
- **结果**：击杀图标模版 header 的视觉间距与列表表格模版保持一致
- **复用结论**：如果两个页面外层 `gap` 相同但效果不同，要先排查子元素内部留白

### CASE-003 发包模版总模版页：返回按钮与标题间距调整

- **触发问题**：总模版页中返回按钮和标题之间，看起来比编辑页更紧
- **影响文件**：`src/components/TemplateLibrary.css`
- **根因**：`.module-page-title` 缺少与编辑页标题一致的左右留白
- **最终解法**：
  - `.module-page-title`：增加 `padding: 0 4px`
- **结果**：总模版页的返回按钮与标题间距，与编辑页顶栏更一致
- **复用结论**：遇到“按钮到标题太紧”的问题，先查标题自身是否缺少左右 `padding`

### CASE-004 预览文档左上角版本号：误改后的定点回滚

- **触发问题**：之前统一版本号样式时，把预览文档左上角版本号改坏了，需要恢复到最初版本
- **影响文件**：`src/components/DocumentPreview.css`、`src/components/DocumentPreview.tsx`
- **根因**：
  - 把预览文档当成编辑器 header 统一处理
  - 左上角版本号所在红条的顶部间距被压缩
  - 默认版本回退值被替换成动态日期
- **最终解法**：
  - `DocumentPreview.css`
    - `.preview-chip-row`：恢复为 `padding: 16px 40px 0`
    - `.preview-header-main`：恢复为 `padding: 8px 40px 24px`
  - `DocumentPreview.tsx`
    - 默认回退值恢复为 `V / 2025.10.09`
- **结果**：左上角版本号的位置和默认内容恢复到最初版本
- **复用结论**：预览文档是独立视觉体系，不能直接沿用编辑器 badge 的统一规则

### 统一经验

- 视觉不一致时，优先看元素自身 `padding`、`border-radius`、`width`
- 展示态与编辑态必须同时处理
- 已修好的页面可以作为基线，但不能跨视觉体系盲目同步
- 回滚时要精确到目标区域，只恢复被误改的那一小块
