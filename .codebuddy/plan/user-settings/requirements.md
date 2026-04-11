# 需求文档：用户设置

## 引言
为 VTools（VALM OS）添加用户名体系和用户设置页面。核心变更包括：注册时增加用户名输入、登录后顶栏显示用户名、用户设置页面管理账户信息（用户名/邮箱/密码/安全等）。当前系统仅在 Dashboard 顶栏展示邮箱和登出按钮，缺少用户名概念和用户资料管理能力。本功能将补全这一空白，同时遵循现有 Supabase Auth 认证体系和 VALM OS 视觉规范（红 #FF4655 / 黑 #0f1923 / 白 #ECE8E1）。

**用户名唯一性机制**：由于 Supabase `user_metadata` 不保证数据唯一性，需在 Supabase 数据库中创建 `profiles` 表（字段：`id` 主键关联 auth.users、`username` 唯一约束、`last_name_change_at`），通过数据库唯一约束 + 前端查询双重保障用户名唯一性。注册和修改用户名时均需校验唯一性。本功能**不支持删除账户**（Supabase 客户端 SDK 无法直接删除用户）。

---

## 需求

### 需求 1：注册时输入用户名

**用户故事：** 作为一名新用户，我希望在注册时可以设置用户名，以便拥有个性化的账户标识。

#### 验收标准
1. WHEN 用户进入注册模式 THEN 系统 SHALL 显示用户名输入框，位于邮箱输入框之前
2. WHEN 用户提交注册 THEN 系统 SHALL 验证用户名为必填项，长度在 2-20 个字符之间，且仅包含中英文、数字和下划线
3. WHEN 用户名验证失败 THEN 系统 SHALL 显示具体错误原因（"请输入用户名"、"用户名长度需在2-20个字符之间"、"用户名只能包含中英文、数字和下划线"）
4. WHEN 用户输入用户名时（失焦或提交时） THEN 系统 SHALL 通过查询 Supabase `profiles` 表校验用户名是否已被占用
5. IF 用户名已被其他用户占用 THEN 系统 SHALL 提示"该用户名已被占用，请换一个"
6. WHEN 用户名验证通过（格式+唯一性） AND 注册成功 THEN 系统 SHALL 将用户名保存到 Supabase `user_metadata.username` 和 `profiles` 表中
7. WHEN 注册表单渲染 THEN 系统 SHALL 在用户名输入框下方显示格式提示"2-20位，中英文、数字、下划线"
8. IF 用户处于登录模式 THEN 系统 SHALL 不显示用户名输入框

---

### 需求 2：登录后显示用户名

**用户故事：** 作为一名已登录用户，我希望在顶栏看到我的用户名而非邮箱，以便快速识别当前账户。

#### 验收标准
1. WHEN 用户已登录 AND `user_metadata.username` 存在 THEN 系统 SHALL 在 Dashboard 顶栏右侧显示用户名
2. WHEN 用户已登录 AND `user_metadata.username` 不存在 THEN 系统 SHALL 在顶栏显示邮箱前缀（@之前的部分）作为回退显示
3. WHEN 用户名或邮箱更新 THEN 系统 SHALL 即时刷新顶栏显示
4. WHEN 顶栏用户名区域被点击 THEN 系统 SHALL 打开用户设置页面

---

### 需求 3：用户设置页面入口

**用户故事：** 作为一名已登录用户，我希望从顶栏快速进入用户设置页面，以便管理我的账户信息。

#### 验收标准
1. WHEN 用户点击 Dashboard 顶栏右侧的用户名区域 THEN 系统 SHALL 打开用户设置页面
2. WHEN 用户设置页面打开 THEN 系统 SHALL 显示当前用户的资料信息（用户名、邮箱、注册时间等）
3. WHEN 用户点击设置页面的返回按钮 THEN 系统 SHALL 返回 Dashboard 页面
4. IF 用户未登录 THEN 系统 SHALL 不显示用户设置入口

---

### 需求 4：用户名修改

**用户故事：** 作为一名用户，我希望可以修改我的用户名，以便在需要时更新我的账户标识。

#### 验收标准
1. WHEN 用户进入设置页面且未设置过用户名 THEN 系统 SHALL 显示用户名设置引导，提示用户设置用户名
2. WHEN 用户提交新用户名 THEN 系统 SHALL 验证用户名长度在 2-20 个字符之间，且仅包含中英文、数字和下划线
3. WHEN 用户名格式验证通过 THEN 系统 SHALL 通过查询 Supabase `profiles` 表校验新用户名是否已被其他用户占用
4. IF 新用户名已被其他用户占用 THEN 系统 SHALL 提示"该用户名已被占用，请换一个"
5. WHEN 用户名验证通过（格式+唯一性） THEN 系统 SHALL 调用 Supabase `updateUser({ data: { username, last_name_change_at } })` 更新用户名，并同步更新 `profiles` 表
6. IF 用户名已存在 AND 距上次修改不足 30 天 THEN 系统 SHALL 拒绝修改并提示"用户名每 30 天只能修改一次，下次可修改时间为 XXXX-XX-XX"
7. IF 用户名已存在 AND 距上次修改已满 30 天 THEN 系统 SHALL 允许修改，并更新 `last_name_change_at` 时间戳
8. WHEN 用户名修改成功 THEN 系统 SHALL 在顶栏和设置页面即时反映新用户名
9. WHEN 用户名验证失败 THEN 系统 SHALL 显示具体错误原因（长度不符、包含非法字符、已被占用等）

---

### 需求 5：修改密码

**用户故事：** 作为一名用户，我希望可以修改我的登录密码，以便保障账户安全。

#### 验收标准
1. WHEN 用户点击"修改密码"按钮 THEN 系统 SHALL 显示修改密码表单，包含当前密码、新密码、确认新密码三个输入框
2. WHEN 用户提交修改密码请求 THEN 系统 SHALL 先验证当前密码是否正确（通过 Supabase `signInWithPassword` 验证）
3. IF 当前密码验证通过 THEN 系统 SHALL 调用 Supabase `updateUser({ password })` 更新密码
4. IF 当前密码验证失败 THEN 系统 SHALL 提示"当前密码错误"
5. IF 新密码与确认密码不一致 THEN 系统 SHALL 提示"两次输入的密码不一致"
6. WHEN 密码修改成功 THEN 系统 SHALL 提示"密码修改成功"并自动登出，要求用户重新登录

---

### 需求 6：更换绑定邮箱

**用户故事：** 作为一名用户，我希望可以更换我的绑定邮箱，以便使用我最常用的邮箱接收通知。

#### 验收标准
1. WHEN 用户点击"更换邮箱"按钮 THEN 系统 SHALL 显示新邮箱输入框和当前密码输入框
2. WHEN 用户提交新邮箱 THEN 系统 SHALL 验证新邮箱格式合法且不与当前邮箱相同
3. IF 验证通过 THEN 系统 SHALL 调用 Supabase `updateUser({ email })` 发起邮箱变更
4. WHEN Supabase 发送确认邮件到新邮箱 THEN 系统 SHALL 提示"确认邮件已发送至新邮箱，请前往确认"
5. WHEN 用户在新邮箱中点击确认链接 THEN 系统 SHALL 完成邮箱变更，并更新顶栏显示
6. IF 新邮箱已被其他账户注册 THEN 系统 SHALL 提示"该邮箱已被其他账户使用"
7. IF 当前密码验证失败 THEN 系统 SHALL 提示"密码错误，请重新输入"

---

### 需求 7：账户信息展示

**用户故事：** 作为一名用户，我希望在设置页面看到我的完整账户信息，以便了解我的账户状态。

#### 验收标准
1. WHEN 用户进入设置页面 THEN 系统 SHALL 展示以下信息：用户名、邮箱、注册时间、上次登录时间、用户名最后修改时间
2. IF 用户名从未设置 THEN 系统 SHALL 显示"未设置"并提供设置引导
3. IF 用户名在 30 天冷却期内 THEN 系统 SHALL 显示距下次可修改的天数
4. WHEN Supabase session 中的用户信息更新 THEN 系统 SHALL 实时刷新展示内容

---

### 需求 8：账户安全——登出其他设备

**用户故事：** 作为一名用户，我希望可以登出其他设备上的会话，以便在设备丢失或怀疑账号泄露时保护账户。

#### 验收标准
1. WHEN 用户点击"登出其他设备"按钮 THEN 系统 SHALL 弹出确认对话框
2. WHEN 用户确认操作 THEN 系统 SHALL 调用 Supabase `signOut({ scope: 'others' })` 使其他设备会话失效
3. WHEN 操作成功 THEN 系统 SHALL 提示"已登出其他设备"且当前设备会话保持有效
4. IF 操作失败 THEN 系统 SHALL 提示"操作失败，请重试"

---

### 需求 9：界面一致性

**用户故事：** 作为一名用户，我希望用户设置页面的视觉风格与现有 VALM OS 系统一致，以便获得统一的体验。

#### 验收标准
1. WHEN 用户设置页面渲染 THEN 系统 SHALL 使用 VALM OS 配色规范（红 #FF4655 / 黑 #0f1923 / 白 #ECE8E1）
2. WHEN 表单输入框、按钮等组件渲染 THEN 系统 SHALL 与现有 AuthGate 登录/注册表单样式保持一致
3. WHEN 页面在移动端显示 THEN 系统 SHALL 支持响应式布局
4. WHEN 操作进行中 THEN 系统 SHALL 显示加载状态（按钮 disabled + loading 指示器）
