-- ============================================
-- 用户管理功能：super_admin / admin / user 角色体系 + 管理员 RLS 策略
-- 需在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- ========== 第一步：清理所有依赖 role 列的策略和函数 ==========
-- 必须先删除，否则无法修改 role 列类型

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_role_super_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_super_admin(UUID);

-- ========== 第二步：创建 ENUM 类型 + 转换 role 列 ==========

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 如果 role 列已存在且为 TEXT 类型，转换为 ENUM
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.profiles ALTER COLUMN role TYPE public.user_role USING role::public.user_role;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
  END IF;
END $$;

-- profiles 表增加 role 字段（若不存在）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'user';

-- ========== 第三步：增加其他字段 ==========

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- ========== 第四步：重建函数和策略 ==========

-- 辅助函数：判断是否为管理员（含超级管理员）
CREATE OR REPLACE FUNCTION public.is_admin(check_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role IN ('super_admin', 'admin')
  );
$$;

-- 辅助函数：判断是否为超级管理员
CREATE OR REPLACE FUNCTION public.is_super_admin(check_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role = 'super_admin'
  );
$$;

-- 普通用户只能查自己的 profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 管理员（含超级管理员）可查所有 profile
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 管理员（含超级管理员）可更新任意 profile
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 角色字段更新：仅超级管理员可修改其他用户的 role
CREATE POLICY "profiles_update_role_super_admin_only"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR auth.uid() = id)
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

-- 管理员（含超级管理员）可删除任意 profile
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ========== 第五步：触发器 + 索引 ==========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, banned, banned_at, banned_reason, last_name_change_at, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    false,
    NULL,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
