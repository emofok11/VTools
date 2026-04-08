/**
 * Figma 导入器
 * 从 Figma 设计稿创建模版定义
 */

import { TemplateDefinition, TemplateCategory, TextFieldConfig, ImageSlotConfig } from '../types/template';

interface FigmaImportOptions {
  description?: string;
  tags?: string[];
}

/**
 * 从 Figma 设计稿创建模版
 * 注意：实际项目中需要配置 Figma API Token
 */
export async function createTemplateFromFigma(
  figmaUrl: string,
  figmaToken: string,
  name: string,
  category: TemplateCategory,
  options: FigmaImportOptions = {}
): Promise<TemplateDefinition> {
  // 解析 Figma URL 获取 nodeId
  const urlObj = new URL(figmaUrl);
  const nodeId = urlObj.searchParams.get('node-id') || '';
  const fileKey = figmaUrl.split('/design/')[1]?.split('/')[0] || '';

  if (!figmaToken) {
    throw new Error('缺少 Figma Token，请在设置中配置有效的 Token');
  }

  try {
    // 调用 Figma API 获取设计稿数据
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
      headers: {
        'X-Figma-Token': figmaToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const node = data.nodes[nodeId];

    if (!node) {
      throw new Error('无法找到指定的设计稿节点');
    }

    // 解析节点数据，提取文字和图片区域
    const textFields = extractTextFields(node.document);
    const imageSlots = extractImageSlots(node.document);

    const now = new Date().toISOString();

    return {
      id: `template-figma-${Date.now()}`,
      name,
      description: options.description || `从 Figma 导入: ${name}`,
      category,
      tags: options.tags || ['Figma导入'],
      status: 'draft',
      figmaUrl,
      figmaNodeId: nodeId,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0',
      textFields,
      imageSlots,
      previewLayout: {
        width: node.document.absoluteBoundingBox?.width || 800,
        height: node.document.absoluteBoundingBox?.height || 600
      }
    };
  } catch (error: any) {
    console.error('Figma 导入失败:', error);
    throw new Error(`Figma 导入失败: ${error.message}`);
  }
}

/**
 * 从节点中提取文字字段
 */
function extractTextFields(node: any, prefix = ''): TextFieldConfig[] {
  const fields: TextFieldConfig[] = [];

  if (node.type === 'TEXT' && node.characters) {
    fields.push({
      id: `text-${node.id}`,
      label: node.name || '文字字段',
      placeholder: node.characters,
      defaultValue: node.characters,
      required: false
    });
  }

  if (node.children) {
    node.children.forEach((child: any) => {
      fields.push(...extractTextFields(child, prefix));
    });
  }

  return fields;
}

/**
 * 从节点中提取图片槽位
 */
function extractImageSlots(node: any): ImageSlotConfig[] {
  const slots: ImageSlotConfig[] = [];

  // 递归查找图片节点
  function findImages(n: any) {
    if (n.type === 'IMAGE' || (n.fills && n.fills.some((f: any) => f.type === 'IMAGE'))) {
      slots.push({
        id: `img-${n.id}`,
        label: n.name || '图片',
        description: '从设计稿提取的图片区域',
        required: false,
        supportedFormats: ['png', 'jpg', 'svg']
      });
    }

    if (n.children) {
      n.children.forEach(findImages);
    }
  }

  findImages(node);
  return slots;
}