/**
 * 模版注册中心
 * 管理所有模版的注册、查询、删除等操作
 */

import { TemplateDefinition, TemplateCategory } from '../types/template';

// 分类标签映射
export const categoryLabels: Record<TemplateCategory, string> = {
  'kill-icon': '击杀图标',
  'skill-icon': '技能图标',
  'item-icon': '道具图标',
  'social-icon': '社交图标',
  'ui-panel': 'UI面板',
  'list-table': '列表表格',
  'banner': '宣传图',
  'button': '按钮',
  'other': '其他'
};

/**
 * 模版注册中心类
 * 单例模式，全局管理模版
 */
class TemplateRegistry {
  private templates: Map<string, TemplateDefinition> = new Map();

  /**
   * 注册模版
   */
  register(template: TemplateDefinition): void {
    this.templates.set(template.id, template);
    console.log(`✅ 模版已注册: ${template.name} (${template.id})`);
  }

  /**
   * 批量注册模版
   */
  registerAll(templates: TemplateDefinition[]): void {
    templates.forEach(t => this.register(t));
  }

  /**
   * 取消注册模版
   */
  unregister(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      console.log(`🗑️ 模版已删除: ${id}`);
    }
    return deleted;
  }

  /**
   * 获取单个模版
   */
  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  /**
   * 获取所有模版
   */
  getAll(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  /**
   * 按分类获取模版
   */
  getByCategory(category: TemplateCategory): TemplateDefinition[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * 搜索模版（按名称、描述、标签）
   */
  search(query: string): TemplateDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 更新模版
   */
  update(id: string, updates: Partial<TemplateDefinition>): boolean {
    const template = this.templates.get(id);
    if (!template) return false;
    
    this.templates.set(id, { ...template, ...updates, updatedAt: new Date().toISOString() });
    return true;
  }

  /**
   * 清空所有模版
   */
  clear(): void {
    this.templates.clear();
    console.log('🧹 所有模版已清空');
  }
}

// 导出单例实例
export const templateRegistry = new TemplateRegistry();