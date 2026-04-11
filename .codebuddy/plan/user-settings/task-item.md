# 实施计划

- [ ] 1. 创建 Supabase `profiles` 表与前端查询工具函数
   - 在 Supabase Dashboard 中创建 `profiles` 表：`id`（UUID 主键，关联 auth.users.id）、`username`（TEXT，UNIQUE 约束）、`last_name_change_at`（TIMESTAMPTZ，可为空）
   - 启用 RLS 行级安全策略：用户可读所有行，仅可写自己的行
   - 在 `src/lib/profileService.ts` 中封装 profiles 表操作：`checkUsernameUnique`、`createProfile`、`updateUsername`
   - _需求：1.4、1.5、1.6、4.3、4.4、4.5_

- [ ] 2. AuthGate 注册表单增加用户名输入与唯一性校验
   - 修改 `AuthGate.tsx`，在注册模式的邮箱输入框之前添加用户名输入框，下方显示格式提示"2-20位，中英文、数字、下划线"
   - 添加用户名验证逻辑：必填、2-20字符、仅中英文/数字/下划线，失焦时调用 `checkUsernameUnique` 校验唯一性
   - 注册提交时将用户名通过 `options.data.username` 存入 `user_metadata`，同时调用 `createProfile` 写入 profiles 表
   - 登录模式下隐藏用户名输入框
   - _需求：1.1、1.2、1.3、1.4、1.5、1.6、1.7、1.8_

- [ ] 3. Dashboard 顶栏显示用户名与点击入口
   - 修改 `Dashboard.tsx` 顶栏 `topbar-user` 区域，优先显示 `user_metadata.username`，回退显示邮箱前缀
   - 将用户名区域改为可点击，点击后调用 `onOpenSettings` 回调导航到用户设置页面
   - 修改 `Dashboard.css` 添加用户名区域 hover/cursor 样式
   - _需求：2.1、2.2、2.3、2.4_

- [ ] 4. App 视图路由扩展与 UserSettings 页面骨架
   - 在 `App.tsx` 的 `AppView` 类型中新增 `'user-settings'`，添加视图切换逻辑，传递 `onOpenSettings` 给 Dashboard
   - 创建 `UserSettings.tsx` 组件骨架：页面布局（返回按钮、标题"用户设置"、内容区），接收 `onBack` 回调
   - 创建 `UserSettings.css`，遵循 VALM OS 配色规范（红 #FF4655 / 黑 #0f1923 / 白 #ECE8E1）
   - _需求：3.1、3.2、3.3、3.4、9.1、9.2_

- [ ] 5. 账户信息展示与用户名修改
   - 在 `UserSettings.tsx` 中添加账户信息展示区域：用户名、邮箱、注册时间（`created_at`）、上次登录时间（`last_sign_in_at`）、用户名最后修改时间
   - 处理用户名"未设置"状态，显示设置引导
   - 添加用户名修改表单（输入框 + 保存按钮），实现30天冷却期校验（读取 `user_metadata.last_name_change_at`）
   - 提交时校验格式 + 调用 `checkUsernameUnique` 校验唯一性，通过后调用 `updateUser` 和 `updateUsername` 更新
   - 修改成功后即时刷新顶栏和设置页显示
   - _需求：4.1~4.9、7.1~7.4_

- [ ] 6. 修改密码功能
   - 在设置页面添加"修改密码"区域，包含当前密码、新密码、确认新密码三个输入框
   - 先通过 `signInWithPassword` 验证当前密码，再调用 `updateUser({ password })` 更新
   - 新密码与确认密码不一致时提示错误；修改成功后提示并自动登出
   - _需求：5.1~5.6_

- [ ] 7. 更换绑定邮箱功能
   - 在设置页面添加"更换邮箱"区域，包含新邮箱和当前密码输入框
   - 验证新邮箱格式合法且不与当前邮箱相同，调用 `updateUser({ email })` 发起邮箱变更
   - 处理确认邮件发送提示和邮箱已注册的错误
   - _需求：6.1~6.7_

- [ ] 8. 登出其他设备
   - 添加"登出其他设备"按钮，调用 `supabase.auth.signOut({ scope: 'others' })`
   - 含确认对话框，操作成功提示"已登出其他设备"，失败提示"操作失败，请重试"
   - _需求：8.1~8.4_

- [ ] 9. 全局样式与交互优化
   - 确保所有表单输入框、按钮与 `AuthGate` 风格一致（VALM OS 配色）
   - 所有异步操作添加 loading 状态（按钮 disabled + 指示器）
   - 响应式布局适配移动端
   - _需求：9.1~9.4_

- [ ] 10. 构建验证与回归测试
   - 运行 `npm run build:check` 确保 TypeScript 编译无报错
   - 验证注册流程（含用户名+唯一性校验）端到端可用
   - 验证登录后顶栏显示用户名、点击进入设置页面
   - 验证现有功能（登录、登出、邮箱确认）未受影响
   - _需求：1.4、2.1、9.4_
