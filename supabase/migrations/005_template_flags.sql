-- ============================================================
-- 迁移脚本：为 templates 表添加 is_locked 和 is_official 字段
-- is_locked: 模版锁定标记，锁定后不可编辑/删除
-- is_official: 官方模版标记，展示特殊标识
-- ============================================================

-- 添加 is_locked 字段（幂等：先检查是否已存在）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 添加 is_official 字段（幂等：先检查是否已存在）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN is_official BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 为内置模版标记为官方+锁定（按 name 匹配，避免 id 类型不一致问题）
UPDATE public.templates
SET is_official = true, is_locked = true
WHERE name IN ('击杀图标模版', '列表表格模版');

-- RLS 策略：仅管理员可修改 is_locked / is_official 字段
-- 普通用户更新时不能改变这两个字段的值
CREATE OR REPLACE FUNCTION public.can_modify_template_flags()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.is_admin(auth.uid());
END;
$$;

-- ============================================================
-- 执行完毕！
-- ============================================================
