import { supabase } from './supabase';
import { TemplateDefinition, TemplateHistoryRecord } from '../types/template';

// 这是一个示例服务，用于展示如何将数据存储到 Supabase
// 你需要在 Supabase 中创建相应的表：
// 1. templates (id, name, category, data, created_at, updated_at)
// 2. template_history (id, template_id, title, data, created_at)

export const supabaseService = {
  // 获取所有模版
  async getTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  // 保存模版
  async saveTemplate(template: TemplateDefinition) {
    const { data, error } = await supabase
      .from('templates')
      .upsert({
        id: template.id,
        name: template.name,
        category: template.category,
        data: template,
        updated_at: new Date().toISOString()
      });
      
    if (error) throw error;
    return data;
  },

  // 获取历史记录
  async getHistory() {
    const { data, error } = await supabase
      .from('template_history')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  // 保存历史记录
  async saveHistory(record: TemplateHistoryRecord) {
    const { data, error } = await supabase
      .from('template_history')
      .upsert({
        id: record.id,
        template_id: record.templateId,
        title: record.title,
        data: record,
        created_at: record.updatedAt
      });
      
    if (error) throw error;
    return data;
  }
};
