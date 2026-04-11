import { supabase } from './supabase';

/**
 * profiles 表服务
 * 负责用户名唯一性校验、创建/更新 profile
 */

/** 用户角色类型 */
export type UserRole = 'admin' | 'user';

/** Profile 完整数据 */
export interface ProfileData {
  id: string;
  username: string;
  role: UserRole;
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  last_name_change_at: string | null;
  created_at: string;
}

/** 检查用户名是否唯一（未被占用） */
export async function checkUsernameUnique(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1);

  if (error) {
    console.warn('校验用户名唯一性失败:', error.message);
    return false;
  }

  return data.length === 0;
}

/** 创建用户 profile（注册时调用，使用 upsert 保证幂等） */
export async function createProfile(userId: string, username: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username,
      last_name_change_at: null,
    }, { onConflict: 'id' });

  if (error) {
    console.warn('创建 profile 失败:', error.message);
    return false;
  }
  return true;
}

/** 更新用户名（修改用户名时调用） */
export async function updateUsername(userId: string, username: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({
      username,
      last_name_change_at: now,
    })
    .eq('id', userId);

  if (error) {
    console.warn('更新用户名失败:', error.message);
    return false;
  }
  return true;
}

/** 获取用户的 profile 信息 */
export async function getProfile(userId: string): Promise<{
  username: string | null;
  last_name_change_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, last_name_change_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('获取 profile 失败:', error.message);
    return null;
  }
  return data;
}

/** 获取当前用户的完整 profile（含 role、banned） */
export async function getFullProfile(userId: string): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('获取完整 profile 失败:', error.message);
    return null;
  }
  return data as ProfileData | null;
}

/** 检查当前用户是否为管理员 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return data.role === 'admin';
}

// ============================================
// 以下为管理员操作函数
// ============================================

/** 获取所有用户列表（管理员） */
export async function listAllUsers(): Promise<ProfileData[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('获取用户列表失败:', error.message);
    return [];
  }
  return (data as ProfileData[]) || [];
}

/** 封禁用户（管理员） */
export async function banUser(userId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      banned: true,
      banned_at: new Date().toISOString(),
      banned_reason: reason || null,
    })
    .eq('id', userId);

  if (error) {
    console.warn('封禁用户失败:', error.message);
    return false;
  }
  return true;
}

/** 解封用户（管理员） */
export async function unbanUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      banned: false,
      banned_at: null,
      banned_reason: null,
    })
    .eq('id', userId);

  if (error) {
    console.warn('解封用户失败:', error.message);
    return false;
  }
  return true;
}

/** 管理员修改用户名 */
export async function adminUpdateUsername(userId: string, username: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId);

  if (error) {
    console.warn('管理员修改用户名失败:', error.message);
    return false;
  }
  return true;
}

/** 修改用户角色（管理员） */
export async function changeUserRole(userId: string, role: UserRole): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.warn('修改用户角色失败:', error.message);
    return false;
  }
  return true;
}

/** 删除用户 profile（管理员）— auth.users 需通过 Supabase Admin API 删除 */
export async function deleteUserProfile(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.warn('删除用户 profile 失败:', error.message);
    return false;
  }
  return true;
}
