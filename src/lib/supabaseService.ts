import { supabase } from './supabase';
import { TemplateDefinition, TemplateHistoryRecord } from '../types/template';

// Supabase 数据服务
// 所需表结构：
// 1. templates (id, name, category, data, user_id, created_at, updated_at)
// 2. template_history (id, template_id, title, data, user_id, created_at)

/**
 * 获取当前登录用户的 ID
 * 未登录时返回 null
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const supabaseService = {
  // 获取当前用户的所有模版（RLS 自动过滤，此处仅做兜底）
  async getTemplates() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('用户未登录，无法获取模版');
        return [];
      }

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('查询 templates 表失败:', error.message);
        return [];
      }
      // 将数据库的 is_locked / is_official 映射回 TemplateDefinition 对象
      return (data || []).map((item: any) => {
        if (item.data) {
          item.data.isLocked = item.is_locked ?? false;
          item.data.isOfficial = item.is_official ?? false;
        }
        return item;
      });
    } catch (e) {
      console.warn('获取模版数据异常:', e);
      return [];
    }
  },

  // 保存模版（强制附加当前用户 user_id）
  async saveTemplate(template: TemplateDefinition) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('用户未登录，无法保存模版');
        return null;
      }

      const { data, error } = await supabase
        .from('templates')
        .upsert({
          id: template.id,
          name: template.name,
          category: template.category,
          data: template,
          user_id: userId,
          is_locked: template.isLocked ?? false,
          is_official: template.isOfficial ?? false,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('保存模版失败:', error.message);
      }
      return data;
    } catch (e) {
      console.warn('保存模版异常:', e);
      return null;
    }
  },

  // 更新模版标记（锁定/官方状态）
  async updateTemplateFlags(templateId: string, flags: { isLocked?: boolean; isOfficial?: boolean }) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('用户未登录，无法更新模版标记');
        return null;
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (flags.isLocked !== undefined) updateData.is_locked = flags.isLocked;
      if (flags.isOfficial !== undefined) updateData.is_official = flags.isOfficial;

      const { data, error } = await supabase
        .from('templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) {
        console.warn('更新模版标记失败:', error.message);
      }
      return data;
    } catch (e) {
      console.warn('更新模版标记异常:', e);
      return null;
    }
  },

  // 获取当前用户的历史记录（RLS 自动过滤，此处仅做兜底）
  async getHistory() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('用户未登录，无法获取历史记录');
        return [];
      }

      const { data, error } = await supabase
        .from('template_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('查询 template_history 表失败:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('获取历史记录异常:', e);
      return [];
    }
  },

  // 保存历史记录（强制附加当前用户 user_id）
  async saveHistory(record: TemplateHistoryRecord) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('用户未登录，无法保存历史记录');
        return null;
      }

      const { data, error } = await supabase
        .from('template_history')
        .upsert({
          id: record.id,
          template_id: record.templateId,
          title: record.title,
          data: record,
          user_id: userId,
          created_at: record.updatedAt
        });

      if (error) {
        console.warn('保存历史记录失败:', error.message);
      }
      return data;
    } catch (e) {
      console.warn('保存历史记录异常:', e);
      return null;
    }
  }
};
