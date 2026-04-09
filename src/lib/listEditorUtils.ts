/**
 * 列表编辑工具集
 * 实现类似 Word 的列表编辑逻辑，包括项目符号、编号列表和层级控制
 */

// ==================== 核心数据结构 ====================

/**
 * 列表类型枚举
 * - normal: 普通文本模式，无项目符号
 * - bullet: 无序列表（圆点）
 * - numbered: 有序列表（数字）
 * - arrow: 箭头列表
 */
export enum ListType {
  NORMAL = 'normal',
  BULLET = 'bullet',
  NUMBERED = 'numbered',
  ARROW = 'arrow',
}

/**
 * 列表项数据结构
 * 表示解析后的每一行内容及其列表属性
 */
export interface ListItem {
  /** 行内容（不含项目符号） */
  content: string;
  /** 列表类型 */
  type: ListType;
  /** 层级深度（0表示顶层） */
  level: number;
  /** 缩进值（像素或字符数） */
  indent: number;
  /** 是否是软换行（Shift+Enter产生） */
  isSoftBreak: boolean;
  /** 起始字符位置 */
  startOffset: number;
  /** 结束字符位置 */
  endOffset: number;
}

/**
 * 列表状态
 * 维护当前列表模式和光标状态
 */
export interface ListState {
  /** 当前行的列表类型 */
  currentType: ListType;
  /** 当前层级 */
  currentLevel: number;
  /** 光标所在行的索引 */
  currentLineIndex: number;
  /** 光标在行内的偏移 */
  cursorOffset: number;
  /** 是否处于列表模式 */
  isListMode: boolean;
}

// ==================== 常量定义 ====================

/** 
 * HTML转义函数
 * 转义特殊字符，避免XSS和HTML结构破坏
 */
export function escapeDescriptionHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 自动触发字符模式 */
export const LIST_TRIGGER_PATTERNS = {
  [ListType.BULLET]: /^[-*]\s$/, // - 或 * 后跟空格
  [ListType.NUMBERED]: /^\d+\.\s$/, // 数字加点后跟空格
  [ListType.ARROW]: /^->\s$/, // -> 后跟空格
} as const;

/** 项目符号显示字符 */
export const LIST_BULLET_SYMBOLS = {
  [ListType.NORMAL]: '',
  [ListType.BULLET]: '·',
  [ListType.NUMBERED]: '{n}.', // {n} 会被替换为实际编号
  [ListType.ARROW]: '→',
} as const;

/** 每级缩进的像素值 */
export const INDENT_PER_LEVEL = 24;

/** 最大层级深度 */
export const MAX_LIST_LEVEL = 6;

/** 最小层级深度 */
export const MIN_LIST_LEVEL = 0;

// ==================== 解析函数 ====================

/**
 * 解析纯文本为列表项数组
 * @param text 纯文本内容
 * @returns 列表项数组
 */
export function parseTextToListItems(text: string): ListItem[] {
  if (!text) return [];

  const lines = text.split('\n');
  const items: ListItem[] = [];
  let offset = 0;

  lines.forEach((line, index) => {
    const parsed = parseLineToItem(line, offset);
    items.push(parsed);
    offset += line.length + 1; // +1 for newline character
  });

  return items;
}

/**
 * 解析单行为列表项
 * @param line 行内容
 * @param offset 起始偏移量
 * @returns 列表项
 */
function parseLineToItem(line: string, offset: number): ListItem {
  const trimmedLine = line.trimStart();
  const leadingSpaces = line.length - trimmedLine.length;
  const level = Math.floor(leadingSpaces / 2); // 每2个空格为一个层级

  // 检测项目符号类型
  let type = ListType.NORMAL;
  let content = line;
  let indent = 0;

  // 检测无序列表
  if (/^[·•●▪◦‣\-]\s/.test(trimmedLine)) {
    type = ListType.BULLET;
    content = trimmedLine.replace(/^[·•●▪◦‣\-]\s*/, '');
    indent = leadingSpaces;
  }
  // 检测有序列表
  else if (/^\d+\.\s/.test(trimmedLine)) {
    type = ListType.NUMBERED;
    content = trimmedLine.replace(/^\d+\.\s*/, '');
    indent = leadingSpaces;
  }
  // 检测箭头列表
  else if (/^→\s/.test(trimmedLine)) {
    type = ListType.ARROW;
    content = trimmedLine.replace(/^→\s*/, '');
    indent = leadingSpaces;
  }
  // 检测缩进（软换行）
  else if (leadingSpaces >= 2 && !trimmedLine.match(/^[·•●▪◦‣\-\d→]/)) {
    // 这是一个续行（软换行产生的行）
    indent = leadingSpaces;
  }

  return {
    content,
    type,
    level: Math.min(level, MAX_LIST_LEVEL),
    indent,
    isSoftBreak: leadingSpaces >= 2 && type === ListType.NORMAL,
    startOffset: offset,
    endOffset: offset + line.length,
  };
}

/**
 * 将列表项数组序列化为纯文本
 * @param items 列表项数组
 * @returns 纯文本内容
 */
export function serializeListItemsToText(items: ListItem[]): string {
  return items.map((item, index) => {
    const indent = ' '.repeat(item.indent);
    const prefix = getListPrefix(item, items, index);
    return `${indent}${prefix}${item.content}`;
  }).join('\n');
}

/**
 * 获取列表项的前缀（项目符号 + 空格）
 * @param item 当前列表项
 * @param allItems 所有列表项
 * @param currentIndex 当前列表项索引
 * @returns 前缀字符串
 */
function getListPrefix(item: ListItem, allItems: ListItem[], currentIndex: number): string {
  if (item.type === ListType.NORMAL) {
    return '';
  }

  switch (item.type) {
    case ListType.BULLET:
      return '· ';
    case ListType.ARROW:
      return '→ ';
    case ListType.NUMBERED:
      // 计算同层级同类型的编号
      let number = 1;
      for (let i = 0; i < currentIndex; i++) {
        const prevItem = allItems[i];
        if (prevItem.type === ListType.NUMBERED && prevItem.level === item.level) {
          number++;
        } else if (prevItem.level < item.level) {
          // 父级改变时重置编号
          number = 1;
        }
      }
      return `${number}. `;
    default:
      return '';
  }
}

// ==================== 状态管理 ====================

/**
 * 创建列表状态管理器
 */
export class ListStateManager {
  private state: ListState;

  constructor() {
    this.state = {
      currentType: ListType.NORMAL,
      currentLevel: MIN_LIST_LEVEL,
      currentLineIndex: 0,
      cursorOffset: 0,
      isListMode: false,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): ListState {
    return { ...this.state };
  }

  /**
   * 更新状态
   */
  updateState(updates: Partial<ListState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * 重置为普通文本模式
   */
  resetToNormal(): void {
    this.state = {
      currentType: ListType.NORMAL,
      currentLevel: MIN_LIST_LEVEL,
      currentLineIndex: 0,
      cursorOffset: 0,
      isListMode: false,
    };
  }

  /**
   * 进入列表模式
   */
  enterListMode(type: ListType, level: number = MIN_LIST_LEVEL): void {
    this.state.currentType = type;
    this.state.currentLevel = Math.min(level, MAX_LIST_LEVEL);
    this.state.isListMode = true;
  }

  /**
   * 退出列表模式
   */
  exitListMode(): void {
    this.state.currentType = ListType.NORMAL;
    this.state.currentLevel = MIN_LIST_LEVEL;
    this.state.isListMode = false;
  }

  /**
   * 增加层级（Tab键）
   */
  increaseLevel(): void {
    if (this.state.currentLevel < MAX_LIST_LEVEL) {
      this.state.currentLevel++;
    }
  }

  /**
   * 减少层级（Shift+Tab键）
   */
  decreaseLevel(): void {
    if (this.state.currentLevel > MIN_LIST_LEVEL) {
      this.state.currentLevel--;
    }
  }
}

// ==================== 自动格式化检测 ====================

/**
 * 检测是否触发自动格式化
 * @param inputText 输入的文本
 * @returns 触发的列表类型，未触发返回 null
 */
export function detectAutoFormatTrigger(inputText: string): ListType | null {
  // 只忽略行首缩进，保留触发空格；否则 `- `、`1. `、`-> ` 会因为 trim() 丢掉末尾空格而无法触发。
  const normalizedInput = inputText.trimStart();

  // 检测无序列表触发字符：- 或 * 后跟空格
  if (LIST_TRIGGER_PATTERNS[ListType.BULLET].test(normalizedInput)) {
    return ListType.BULLET;
  }

  // 检测有序列表触发字符：数字. 后跟空格
  if (LIST_TRIGGER_PATTERNS[ListType.NUMBERED].test(normalizedInput)) {
    return ListType.NUMBERED;
  }

  // 检测箭头列表触发字符：-> 后跟空格
  if (LIST_TRIGGER_PATTERNS[ListType.ARROW].test(normalizedInput)) {
    return ListType.ARROW;
  }

  return null;
}

/**
 * 应用自动格式化
 * @param lineText 行文本
 * @param triggerType 触发的列表类型
 * @returns 格式化后的文本
 */
export function applyAutoFormat(lineText: string, triggerType: ListType): string {
  // 移除触发字符
  let content = lineText.trimStart();

  switch (triggerType) {
    case ListType.BULLET:
      content = content.replace(/^[-*]\s*/, '');
      return `· ${content}`;
    case ListType.NUMBERED:
      content = content.replace(/^\d+\.\s*/, '');
      return `1. ${content}`;
    case ListType.ARROW:
      content = content.replace(/^->\s*/, '');
      return `→ ${content}`;
    default:
      return lineText;
  }
}

// ==================== 行操作函数 ====================

/**
 * 判断行是否为空列表行
 * @param item 列表项
 * @returns 是否为空列表行
 */
export function isEmptyListItem(item: ListItem): boolean {
  return item.type !== ListType.NORMAL && item.content.trim() === '';
}

/**
 * 判断行是否为列表行
 * @param item 列表项
 * @returns 是否为列表行
 */
export function isListItem(item: ListItem): boolean {
  return item.type !== ListType.NORMAL;
}

/**
 * 判断光标是否在行首（项目符号后）
 * @param cursorOffset 光标在行内的偏移
 * @param item 列表项
 * @returns 是否在行首
 */
export function isCursorAtLineStart(cursorOffset: number, item: ListItem): boolean {
  // 计算项目符号长度
  const prefixLength = getListPrefixLength(item.type);
  const effectiveStart = item.indent + prefixLength;
  return cursorOffset <= effectiveStart;
}

/**
 * 获取项目符号长度
 * @param type 列表类型
 * @returns 符号长度（含空格）
 */
function getListPrefixLength(type: ListType): number {
  switch (type) {
    case ListType.BULLET:
      return 2; // '· '
    case ListType.NUMBERED:
      return 3; // '1. '
    case ListType.ARROW:
      return 2; // '→ '
    default:
      return 0;
  }
}

/**
 * 获取下一个编号
 * @param items 所有列表项
 * @param currentIndex 当前行索引
 * @param level 当前层级
 * @returns 下一个编号数字
 */
export function getNextNumber(items: ListItem[], currentIndex: number, level: number): number {
  let number = 1;
  for (let i = 0; i < currentIndex; i++) {
    const item = items[i];
    if (item.type === ListType.NUMBERED && item.level === level) {
      number++;
    } else if (item.level < level) {
      number = 1;
    }
  }
  return number;
}

// ==================== 键盘事件处理框架 ====================

/**
 * 键盘事件类型
 */
export enum KeyEventType {
  ENTER = 'enter',
  BACKSPACE = 'backspace',
  TAB = 'tab',
  INPUT = 'input',
}

/**
 * 键盘事件上下文
 * 包含处理键盘事件所需的所有信息
 */
export interface KeyboardEventContext {
  /** 原生键盘事件 */
  event: KeyboardEvent;
  /** 当前文本内容 */
  text: string;
  /** 光标起始位置 */
  selectionStart: number;
  /** 光标结束位置 */
  selectionEnd: number;
  /** 当前行索引 */
  currentLineIndex: number;
  /** 当前列表项（如果有） */
  currentItem: ListItem | null;
  /** 所有列表项 */
  allItems: ListItem[];
  /** 列表状态管理器 */
  stateManager: ListStateManager;
}

/**
 * 键盘事件处理结果
 */
export interface KeyboardEventResult {
  /** 是否处理了该事件 */
  handled: boolean;
  /** 新的文本内容（如果有修改） */
  newText?: string;
  /** 新的光标位置 */
  newCursorPos?: number;
  /** 是否需要阻止默认行为 */
  preventDefault?: boolean;
}

/**
 * 键盘事件处理器接口
 */
export type KeyboardEventHandler = (context: KeyboardEventContext) => KeyboardEventResult;

/**
 * 键盘事件分发器
 * 负责识别按键类型并分发到对应的处理器
 */
export class KeyboardEventDispatcher {
  private handlers: Map<KeyEventType, KeyboardEventHandler> = new Map();
  private stateManager: ListStateManager;

  constructor(stateManager: ListStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * 注册事件处理器
   * @param type 事件类型
   * @param handler 处理函数
   */
  registerHandler(type: KeyEventType, handler: KeyboardEventHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * 分发键盘事件
   * @param event 原生键盘事件
   * @param text 当前文本内容
   * @param selectionStart 光标起始位置
   * @param selectionEnd 光标结束位置
   * @returns 处理结果
   */
  dispatch(
    event: KeyboardEvent,
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): KeyboardEventResult {
    // 识别按键类型
    const eventType = this.identifyEventType(event);
    if (!eventType) {
      return { handled: false };
    }

    // 获取处理器
    const handler = this.handlers.get(eventType);
    if (!handler) {
      return { handled: false };
    }

    // 解析列表项
    const allItems = parseTextToListItems(text);
    
    // 找到当前行
    const currentLineIndex = this.findLineIndex(text, selectionStart);
    const currentItem = allItems[currentLineIndex] || null;

    // 构建上下文
    const context: KeyboardEventContext = {
      event,
      text,
      selectionStart,
      selectionEnd,
      currentLineIndex,
      currentItem,
      allItems,
      stateManager: this.stateManager,
    };

    // 调用处理器
    return handler(context);
  }

  /**
   * 识别事件类型
   * @param event 键盘事件
   * @returns 事件类型或 null
   */
  private identifyEventType(event: KeyboardEvent): KeyEventType | null {
    // Enter 键
    if (event.key === 'Enter') {
      return KeyEventType.ENTER;
    }

    // Backspace 键
    if (event.key === 'Backspace') {
      return KeyEventType.BACKSPACE;
    }

    // Tab 键
    if (event.key === 'Tab') {
      return KeyEventType.TAB;
    }

    return null;
  }

  /**
   * 找到光标所在的行索引
   * @param text 文本内容
   * @param position 光标位置
   * @returns 行索引
   */
  private findLineIndex(text: string, position: number): number {
    const lines = text.split('\n');
    let currentPos = 0;

    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length;
      if (currentPos >= position) {
        return i;
      }
      currentPos += 1; // 加上换行符
    }

    return lines.length - 1;
  }
}

// ==================== 辅助函数 ====================

/**
 * 获取光标所在行的文本
 * @param text 完整文本
 * @param position 光标位置
 * @returns 行文本
 */
export function getCurrentLineText(text: string, position: number): string {
  const lines = text.split('\n');
  let currentPos = 0;

  for (const line of lines) {
    if (currentPos + line.length >= position) {
      return line;
    }
    currentPos += line.length + 1;
  }

  return lines[lines.length - 1] || '';
}

/**
 * 获取行的起始位置
 * @param text 完整文本
 * @param lineIndex 行索引
 * @returns 起始位置
 */
export function getLineStartPosition(text: string, lineIndex: number): number {
  const lines = text.split('\n');
  let position = 0;

  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    position += lines[i].length + 1;
  }

  return position;
}

/**
 * 获取行的结束位置
 * @param text 完整文本
 * @param lineIndex 行索引
 * @returns 结束位置（不含换行符）
 */
export function getLineEndPosition(text: string, lineIndex: number): number {
  const lines = text.split('\n');
  let position = 0;

  for (let i = 0; i <= lineIndex && i < lines.length; i++) {
    position += lines[i].length;
    if (i < lineIndex) {
      position += 1; // 加上换行符
    }
  }

  return position;
}

/**
 * 在指定位置插入文本
 * @param text 原文本
 * @param position 位置
 * @param insertion 要插入的文本
 * @returns 新文本
 */
export function insertTextAt(text: string, position: number, insertion: string): string {
  return text.slice(0, position) + insertion + text.slice(position);
}

/**
 * 删除指定范围的文本
 * @param text 原文本
 * @param start 起始位置
 * @param end 结束位置
 * @returns 新文本
 */
export function deleteTextRange(text: string, start: number, end: number): string {
  return text.slice(0, start) + text.slice(end);
}

/**
 * 替换指定范围的文本
 * @param text 原文本
 * @param start 起始位置
 * @param end 结束位置
 * @param replacement 替换文本
 * @returns 新文本
 */
export function replaceTextRange(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

// ==================== 回车键处理器 ====================

/**
 * 创建回车键处理器
 * 实现 Word 风格的回车键逻辑：
 * - 非空列表项回车：生成同级新符号
 * - 空列表项回车：退出列表模式
 * - Shift+Enter：软换行，不生成新符号
 * - 普通文本回车：创建新普通段落
 */
export function createEnterKeyHandler(): KeyboardEventHandler {
  return (context: KeyboardEventContext): KeyboardEventResult => {
    const { event, text, selectionStart, selectionEnd, currentItem, allItems, currentLineIndex } = context;
    const isShiftEnter = event.shiftKey;

    // 如果没有选中任何列表项，按普通换行处理
    if (!currentItem) {
      return { handled: false };
    }

    const { type, level, indent, content } = currentItem;

    // ===== Shift + Enter：软换行 =====
    if (isShiftEnter) {
      // 在当前位置插入换行符，但不生成新项目符号
      // 使用缩进来对齐（延续当前列表项的对齐）
      const continuationIndent = type !== ListType.NORMAL ? '  ' : ''; // 列表项的续行缩进
      const insertion = '\n' + continuationIndent;
      const newText = insertTextAt(text, selectionEnd, insertion);
      const newCursorPos = selectionEnd + insertion.length;

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== 普通文本模式回车 =====
    if (type === ListType.NORMAL) {
      // 普通文本回车：创建新普通段落
      const newText = insertTextAt(text, selectionEnd, '\n');
      const newCursorPos = selectionEnd + 1;

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== 空列表项回车：退出列表模式 =====
    if (isEmptyListItem(currentItem)) {
      // 删除当前行的项目符号，转换为普通段落
      const lineStart = getLineStartPosition(text, currentLineIndex);
      const lineEnd = getLineEndPosition(text, currentLineIndex);
      const currentLineText = getCurrentLineText(text, selectionStart);
      
      // 移除项目符号，只保留缩进
      const prefixLength = getListPrefixLength(type);
      const newLineContent = currentLineText.slice(prefixLength); // 移除符号和空格
      
      const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
      const newCursorPos = lineStart;

      // 通知状态管理器退出列表模式
      context.stateManager.exitListMode();

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== 非空列表项回车：生成同级新符号 =====
    // 计算新行的项目符号
    let newPrefix = '';
    
    if (type === ListType.NUMBERED) {
      // 有序列表：计算下一个编号
      const nextNumber = getNextNumber(allItems, currentLineIndex, level);
      newPrefix = `${nextNumber}. `;
    } else {
      // 无序列表和箭头列表
      newPrefix = getListPrefixLength(type) === 2 ? '· ' : '→ ';
      if (type === ListType.ARROW) {
        newPrefix = '→ ';
      }
    }

    // 插入新行，包含缩进和项目符号
    const indentStr = ' '.repeat(indent);
    const insertion = '\n' + indentStr + newPrefix;
    const newText = insertTextAt(text, selectionEnd, insertion);
    const newCursorPos = selectionEnd + insertion.length;

    // 更新状态管理器
    context.stateManager.updateState({
      currentType: type,
      currentLevel: level,
      isListMode: true,
    });

    return {
      handled: true,
      newText,
      newCursorPos,
      preventDefault: true,
    };
  };
}

/**
 * 获取项目符号前缀（用于回车键处理器）
 * @param type 列表类型
 * @returns 前缀字符串
 */
function getBulletPrefix(type: ListType): string {
  switch (type) {
    case ListType.BULLET:
      return '· ';
    case ListType.NUMBERED:
      return '1. '; // 实际编号会在处理器中计算
    case ListType.ARROW:
      return '→ ';
    default:
      return '';
  }
}

// ==================== 退格键处理器 ====================

/**
 * 创建退格键处理器
 * 实现 Word 风格的退格键逻辑：
 * - 空列表项退格：撤销列表格式，转换为普通文本
 * - 非空列表项前端退格：向上合并到前一个列表项
 * - 缩进列表项退格：层级提升而非直接删除符号
 */
export function createBackspaceKeyHandler(): KeyboardEventHandler {
  return (context: KeyboardEventContext): KeyboardEventResult => {
    const { text, selectionStart, selectionEnd, currentItem, currentLineIndex, allItems } = context;

    // 如果有选中文本，使用默认删除行为
    if (selectionStart !== selectionEnd) {
      return { handled: false };
    }

    // 如果没有当前列表项，使用默认行为
    if (!currentItem) {
      return { handled: false };
    }

    const { type, level, indent, content, startOffset } = currentItem;
    const cursorPos = selectionStart;

    // 计算项目符号后的实际内容起始位置
    const prefixLength = getListPrefixLength(type);
    const contentStartOffset = startOffset + indent + prefixLength;

    // ===== 空列表项退格：撤销列表格式 =====
    if (isEmptyListItem(currentItem)) {
      // 将当前行转换为普通文本（移除项目符号）
      const lineStart = getLineStartPosition(text, currentLineIndex);
      const lineEnd = getLineEndPosition(text, currentLineIndex);
      const currentLineText = getCurrentLineText(text, cursorPos);
      
      // 移除项目符号，保留缩进
      const newLineContent = ' '.repeat(indent) + content; // content 已经是空的
      const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
      const newCursorPos = lineStart + indent;

      // 更新状态管理器
      context.stateManager.updateState({
        currentType: ListType.NORMAL,
        isListMode: false,
      });

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== 光标在项目符号后（列表项开头）：向上合并或层级提升 =====
    if (cursorPos <= contentStartOffset) {
      // 如果是缩进的列表项（level > 0），先提升层级
      if (level > MIN_LIST_LEVEL) {
        // 层级提升：减少缩进
        const newLevel = level - 1;
        const newIndent = indent - 2; // 每级2个空格
        const indentStr = ' '.repeat(Math.max(0, newIndent));
        
        // 重新构建当前行
        const lineStart = getLineStartPosition(text, currentLineIndex);
        const lineEnd = getLineEndPosition(text, currentLineIndex);
        const prefix = getBulletPrefix(type);
        const newLineContent = indentStr + prefix + content;
        
        const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
        const newCursorPos = lineStart + newIndent;

        // 更新状态管理器
        context.stateManager.updateState({
          currentLevel: newLevel,
        });

        return {
          handled: true,
          newText,
          newCursorPos,
          preventDefault: true,
        };
      }

      // 如果不是第一行，向上合并到前一个列表项
      if (currentLineIndex > 0) {
        const prevItem = allItems[currentLineIndex - 1];
        
        // 找到前一行的结束位置
        const prevLineEnd = getLineEndPosition(text, currentLineIndex - 1);
        const currentLineStart = getLineStartPosition(text, currentLineIndex);
        const currentLineEnd = getLineEndPosition(text, currentLineIndex);
        
        // 合并：删除当前行的换行符和项目符号，保留内容
        // 前一行内容 + 当前行的内容（不含项目符号）
        const newCursorPos = prevLineEnd; // 光标放在前一行的末尾
        
        // 删除换行符和当前行的项目符号
        const deleteStart = prevLineEnd; // 从前一行的末尾开始
        const deleteEnd = currentLineStart + indent + prefixLength; // 到当前行内容开始
        const newText = deleteTextRange(text, deleteStart, deleteEnd);

        return {
          handled: true,
          newText,
          newCursorPos,
          preventDefault: true,
        };
      }

      // 如果是第一行且不是缩进列表项，移除项目符号
      const lineStart = getLineStartPosition(text, currentLineIndex);
      const lineEnd = getLineEndPosition(text, currentLineIndex);
      const indentStr = ' '.repeat(indent);
      const newLineContent = indentStr + content;
      const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
      const newCursorPos = lineStart + indent;

      // 更新状态管理器
      context.stateManager.updateState({
        currentType: ListType.NORMAL,
        isListMode: false,
      });

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== 其他情况：使用默认退格行为 =====
    return { handled: false };
  };
}

// ==================== 自动格式化处理器 ====================

/**
 * 创建输入事件处理器
 * 监听输入内容，检测触发字符组合并自动转换为列表
 * 
 * 触发字符：
 * - `- ` 或 `* ` → 无序列表
 * - `1. ` 或其他数字加点空格 → 有序列表
 * - `-> ` → 箭头列表
 */
export function createInputHandler(): (context: InputHandlerContext) => InputHandlerResult {
  // 记录上一次触发的信息，用于支持撤销
  let lastTriggerInfo: {
    position: number;
    originalText: string;
    triggerType: ListType;
  } | null = null;

  return (context: InputHandlerContext): InputHandlerResult => {
    const { text, cursorPosition, isUndo } = context;

    // 如果是撤销操作，恢复原始文本
    if (isUndo && lastTriggerInfo) {
      const result = {
        handled: true,
        newText: lastTriggerInfo.originalText,
        newCursorPos: lastTriggerInfo.position,
      };
      lastTriggerInfo = null;
      return result;
    }

    // 获取当前行的文本
    const currentLineText = getCurrentLineText(text, cursorPosition);
    
    // 检测是否触发自动格式化
    const triggerType = detectAutoFormatTrigger(currentLineText);
    
    if (!triggerType) {
      lastTriggerInfo = null;
      return { handled: false };
    }

    // 检查是否在行首（只有行首才触发）
    const lineStart = getLineStartPosition(text, context.currentLineIndex);
    const trimmedLineStart = text.slice(lineStart).search(/\S|$/);
    const isAtLineStart = cursorPosition <= lineStart + trimmedLineStart + 3; // 允许触发字符的位置

    if (!isAtLineStart) {
      return { handled: false };
    }

    // 记录触发前的状态（用于撤销）
    lastTriggerInfo = {
      position: cursorPosition,
      originalText: text,
      triggerType,
    };

    // 应用自动格式化
    const lineEnd = getLineEndPosition(text, context.currentLineIndex);
    const formattedLine = applyAutoFormat(currentLineText, triggerType);
    
    // 替换当前行
    const newText = replaceTextRange(text, lineStart, lineEnd, formattedLine);
    
    // 计算新光标位置（在内容末尾）
    const newCursorPos = lineStart + formattedLine.length;

    return {
      handled: true,
      newText,
      newCursorPos,
    };
  };
}

/**
 * 输入事件上下文
 */
export interface InputHandlerContext {
  /** 当前文本内容 */
  text: string;
  /** 光标位置 */
  cursorPosition: number;
  /** 当前行索引 */
  currentLineIndex: number;
  /** 是否是撤销操作 */
  isUndo?: boolean;
}

/**
 * 输入事件处理结果
 */
export interface InputHandlerResult {
  /** 是否处理了该事件 */
  handled: boolean;
  /** 新的文本内容 */
  newText?: string;
  /** 新的光标位置 */
  newCursorPos?: number;
}

/**
 * 检测输入字符是否可能触发自动格式化
 * 用于在按键时提前判断，而不是在输入后判断
 * @param char 输入的字符
 * @param prevChar 前一个字符
 * @returns 是否可能触发
 */
export function mayTriggerAutoFormat(char: string, prevChar?: string): boolean {
  // 空格是最终的触发字符
  if (char === ' ') {
    // 前一个字符可能是触发符号的一部分
    return ['-', '*', '.', '>'].includes(prevChar || '');
  }
  return false;
}

/**
 * 获取触发前的文本快照（用于撤销）
 */
export function getPreTriggerSnapshot(): string | null {
  return null; // 实际实现需要在处理器中维护
}

// ==================== Tab键处理器 ====================

/**
 * 创建Tab键处理器
 * 实现 Word 风格的Tab键层级控制：
 * - Tab：增加缩进层级（降级）
 * - Shift+Tab：减少缩进层级（升级）
 * - 仅在列表项前端生效
 */
export function createTabKeyHandler(): KeyboardEventHandler {
  return (context: KeyboardEventContext): KeyboardEventResult => {
    const { event, text, selectionStart, selectionEnd, currentItem, currentLineIndex } = context;
    const isShiftTab = event.shiftKey;

    // 如果没有当前列表项，不处理
    if (!currentItem) {
      return { handled: false };
    }

    const { type, level, indent, content, startOffset } = currentItem;

    // 只在列表模式下处理
    if (type === ListType.NORMAL) {
      return { handled: false };
    }

    // 计算项目符号后的实际内容起始位置
    const prefixLength = getListPrefixLength(type);
    const contentStartOffset = startOffset + indent + prefixLength;

    // 只在光标位于列表项前端时处理
    if (selectionStart > contentStartOffset) {
      return { handled: false };
    }

    // ===== Shift + Tab：升级（减少缩进）=====
    if (isShiftTab) {
      // 已经是最低层级，不处理
      if (level <= MIN_LIST_LEVEL) {
        return { handled: true, preventDefault: true }; // 阻止默认行为但不做任何改变
      }

      // 减少缩进
      const newLevel = level - 1;
      const newIndent = Math.max(0, indent - 2); // 每级2个空格
      const indentStr = ' '.repeat(newIndent);

      // 重新构建当前行
      const lineStart = getLineStartPosition(text, currentLineIndex);
      const lineEnd = getLineEndPosition(text, currentLineIndex);
      const prefix = getBulletPrefix(type);
      const newLineContent = indentStr + prefix + content;

      const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
      const newCursorPos = lineStart + newIndent + prefix.length;

      // 更新状态管理器
      context.stateManager.updateState({
        currentLevel: newLevel,
      });

      return {
        handled: true,
        newText,
        newCursorPos,
        preventDefault: true,
      };
    }

    // ===== Tab：降级（增加缩进）=====
    // 已经是最高层级，不处理
    if (level >= MAX_LIST_LEVEL) {
      return { handled: true, preventDefault: true }; // 阻止默认行为但不做任何改变
    }

    // 增加缩进
    const newLevel = level + 1;
    const newIndent = indent + 2; // 每级2个空格
    const indentStr = ' '.repeat(newIndent);

    // 重新构建当前行
    const lineStart = getLineStartPosition(text, currentLineIndex);
    const lineEnd = getLineEndPosition(text, currentLineIndex);
    const prefix = getBulletPrefix(type);
    const newLineContent = indentStr + prefix + content;

    const newText = replaceTextRange(text, lineStart, lineEnd, newLineContent);
    const newCursorPos = lineStart + newIndent + prefix.length;

    // 更新状态管理器
    context.stateManager.updateState({
      currentLevel: newLevel,
    });

    return {
      handled: true,
      newText,
      newCursorPos,
      preventDefault: true,
    };
  };
}

// ==================== 默认无符号模式 ====================

/**
 * 初始化列表编辑器状态
 * 默认为普通文本模式，不添加任何项目符号
 */
export function initializeListEditorState(): ListStateManager {
  const stateManager = new ListStateManager();
  stateManager.resetToNormal();
  return stateManager;
}

/**
 * 创建默认的分发器配置
 * 注册所有键盘事件处理器
 */
export function createConfiguredDispatcher(stateManager: ListStateManager): KeyboardEventDispatcher {
  const dispatcher = new KeyboardEventDispatcher(stateManager);
  
  // 注册回车键处理器
  dispatcher.registerHandler(KeyEventType.ENTER, createEnterKeyHandler());
  
  // 注册退格键处理器
  dispatcher.registerHandler(KeyEventType.BACKSPACE, createBackspaceKeyHandler());
  
  // 注册Tab键处理器
  dispatcher.registerHandler(KeyEventType.TAB, createTabKeyHandler());
  
  return dispatcher;
}

/**
 * 判断文本内容是否应该保持普通文本模式
 * 只有包含明确的列表标记时才认为是列表模式
 * @param text 文本内容
 * @returns 是否应该保持普通文本模式
 */
export function shouldRemainNormalMode(text: string): boolean {
  if (!text || text.trim() === '') {
    return true;
  }

  // 检查是否包含任何列表标记
  const lines = text.split('\n');
  const hasAnyListMarker = lines.some(line => {
    const trimmed = line.trimStart();
    // 检测列表标记
    return /^[·•●▪◦‣\-\d→]/.test(trimmed);
  });

  return !hasAnyListMarker;
}

/**
 * 确保新建行为普通段落
 * 在普通文本模式下按回车，应该创建新的普通段落，不自动生成项目符号
 * @param text 当前文本
 * @param position 光标位置
 * @returns 是否应该创建普通段落
 */
export function shouldCreateNormalParagraph(text: string, position: number): boolean {
  // 获取当前行
  const currentLineText = getCurrentLineText(text, position);
  const trimmedLine = currentLineText.trimStart();
  
  // 如果当前行不是列表项，则新建行也应该是普通段落
  return !/^[·•●▪◦‣\-\d→]/.test(trimmedLine);
}

/**
 * 防止意外触发自动格式化
 * 检查输入是否符合触发条件，避免误触发
 * @param lineText 行文本
 * @param cursorPosition 光标在行内的位置
 * @returns 是否应该触发自动格式化
 */
export function shouldTriggerAutoFormat(lineText: string, cursorPosition: number): boolean {
  const trimmed = lineText.trimStart();
  const leadingSpaces = lineText.length - trimmed.length;
  
  // 光标必须在触发字符之后
  // 例如："- " 需要光标在空格之后
  const triggerLength = trimmed.indexOf(' ') + 1;
  
  if (cursorPosition < leadingSpaces + triggerLength) {
    return false;
  }
  
  // 必须是行首开始的触发字符
  // 不是行首的情况不应该触发（例如在文本中间输入 "- "）
  const beforeTrigger = lineText.slice(0, leadingSpaces);
  if (beforeTrigger.search(/\S/) !== -1) {
    return false; // 行首前有非空字符，不应触发
  }
  
  return true;
}

/**
 * 清理文本中的意外列表格式
 * 移除不该出现的项目符号（用于修复意外转换）
 * @param text 文本内容
 * @returns 清理后的文本
 */
export function cleanAccidentalListFormat(text: string): string {
  // 这个函数用于清理意外触发的列表格式
  // 目前返回原文本，实际使用时可以根据需要实现
  return text;
}

// ==================== 样式渲染辅助函数 ====================

/**
 * 列表项 CSS 类名配置
 */
export interface ListItemClasses {
  /** 列表类型类名 */
  typeClass: string;
  /** 层级类名 */
  levelClass: string;
  /** 是否为空列表项 */
  isEmpty: boolean;
  /** 完整类名字符串 */
  fullClassName: string;
}

/**
 * 获取列表项的 CSS 类名
 * @param item 列表项
 * @returns CSS 类名配置
 */
export function getListItemClasses(item: ListItem): ListItemClasses {
  const typeClass = `list-${item.type}`;
  const levelClass = `list-level-${item.level}`;
  const isEmpty = isEmptyListItem(item);
  
  const classes = [typeClass, levelClass];
  if (isEmpty) {
    classes.push('list-item-empty');
  }
  
  return {
    typeClass,
    levelClass,
    isEmpty,
    fullClassName: classes.join(' '),
  };
}

/**
 * 获取层级对应的缩进像素值
 * @param level 层级深度
 * @returns 缩进像素值
 */
export function getIndentPixels(level: number): number {
  return level * INDENT_PER_LEVEL;
}

/**
 * 获取层级对应的缩进字符数
 * @param level 层级深度
 * @returns 缩进字符数（空格）
 */
export function getIndentSpaces(level: number): number {
  return level * 2; // 每级2个空格
}

/**
 * 将纯文本列表内容转换为带样式的 HTML
 * 用于在富文本编辑器中显示列表
 * @param text 纯文本内容
 * @returns HTML 字符串
 */
export function renderListToHtml(text: string): string {
  if (!text) return '';
  
  const items = parseTextToListItems(text);
  if (items.length === 0) return '';
  
  const lines = text.split('\n');
  const htmlParts: string[] = [];
  
  lines.forEach((line, index) => {
    const item = items[index];
    if (!item) {
      htmlParts.push(escapeDescriptionHtml(line));
      return;
    }
    
    const classes = getListItemClasses(item);
    const indent = ' '.repeat(item.indent);
    
    if (item.type === ListType.NORMAL) {
      // 普通文本行
      htmlParts.push(indent + escapeDescriptionHtml(item.content));
    } else if (item.type === ListType.NUMBERED) {
      // 有序列表：添加 data-number 属性
      const number = getNextNumber(items, index, item.level);
      htmlParts.push(
        `<span class="${classes.fullClassName}" data-number="${number}">${indent}${escapeDescriptionHtml(item.content)}</span>`
      );
    } else {
      // 无序列表和箭头列表
      htmlParts.push(
        `<span class="${classes.fullClassName}">${indent}${escapeDescriptionHtml(item.content)}</span>`
      );
    }
  });
  
  return htmlParts.join('<br>');
}

/**
 * 将带样式的 HTML 转换回纯文本
 * @param html HTML 字符串
 * @returns 纯文本内容
 */
export function renderHtmlToText(html: string): string {
  if (!html) return '';
  
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const parts: string[] = [];
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '');
      return;
    }
    
    if (!(node instanceof HTMLElement)) {
      return;
    }
    
    const tagName = node.tagName.toLowerCase();
    
    if (tagName === 'br') {
      parts.push('\n');
      return;
    }
    
    // 处理列表项
    const classList = node.classList;
    if (classList.contains('list-bullet') || classList.contains('list-arrow')) {
      const indent = node.textContent?.match(/^\s*/)?.[0] || '';
      const content = node.textContent?.trim() || '';
      const bullet = classList.contains('list-arrow') ? '→' : '·';
      parts.push(`${indent}${bullet} ${content}`);
    } else if (classList.contains('list-numbered')) {
      const number = node.getAttribute('data-number') || '1';
      const indent = node.textContent?.match(/^\s*/)?.[0] || '';
      const content = node.textContent?.trim() || '';
      parts.push(`${indent}${number}. ${content}`);
    } else {
      // 递归处理子节点
      node.childNodes.forEach(walk);
    }
    
    // 块级元素后添加换行
    if ((tagName === 'div' || tagName === 'p') && parts[parts.length - 1] !== '\n') {
      parts.push('\n');
    }
  };
  
  container.childNodes.forEach(walk);
  
  return parts.join('').replace(/\n+$/, '');
}

/**
 * 获取项目符号的显示文本
 * @param type 列表类型
 * @param number 编号（仅用于有序列表）
 * @returns 项目符号文本
 */
export function getBulletDisplayText(type: ListType, number?: number): string {
  switch (type) {
    case ListType.BULLET:
      return '·';
    case ListType.NUMBERED:
      return `${number || 1}.`;
    case ListType.ARROW:
      return '→';
    default:
      return '';
  }
}

/**
 * 计算列表项的视觉宽度（包含缩进和项目符号）
 * @param item 列表项
 * @param bulletWidth 项目符号宽度
 * @returns 总宽度
 */
export function calculateListItemWidth(item: ListItem, bulletWidth: number = 24): number {
  return item.indent + bulletWidth + item.content.length;
}
