-- ============================================
-- 触发器：新用户注册时自动创建 profile
-- 解决前端创建 profile 时 RLS 权限不足的问题
-- 需在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 创建触发器函数：从 auth.users 提取 username 并插入 profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- 以数据库所有者身份执行，绕过 RLS
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, last_name_change_at, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING; -- 幂等：已存在则跳过
  RETURN NEW;
END;
$$;

-- 2. 绑定触发器：在 auth.users 插入后自动执行
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
