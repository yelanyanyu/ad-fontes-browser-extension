# 问题诊断 (Issues Diagnosis)

## 问题总览

经过深度代码审查，发现以下问题，按严重程度分类：

| 严重程度 | 数量 | 类别 |
|----------|------|------|
| 🔴 严重 | 3 | 类型安全、错误处理、数据一致性 |
| 🟠 中等 | 5 | 代码组织、性能、可维护性 |
| 🟡 轻微 | 4 | 代码风格、文档 |

---

## 🔴 严重问题

### 1. 缺少类型系统

**问题描述**：项目完全使用 JavaScript，没有类型检查，容易导致运行时错误。

**影响**：
- 开发时无法获得智能提示
- 重构困难，容易引入 bug
- 代码可读性降低

**示例**：
```javascript
// 问题：apiData 类型不明确
formatOutput(lemma, userContext, apiData, otherMessage) {
  if (Array.isArray(apiData)) {  // 运行时检查
    apiData.forEach(entry => {
      // entry 的结构未知
```

**建议**：迁移到 TypeScript

---

### 2. 存储操作错误处理不完整

**问题描述**：多处 `chrome.storage` 操作缺少错误处理。

**位置**：
- `popup/main.js:132` - `saveSiteConfig()`
- `popup/main.js:197` - `saveToStorage()`
- `options/main.js:36` - `saveData()`

**风险**：存储失败时用户无感知，数据可能丢失。

**修复建议**：
```typescript
async function saveData(): Promise<void> {
  try {
    await chrome.storage.local.set({ prompts, siteConfigs });
  } catch (error) {
    console.error('Failed to save data:', error);
    showStatus('Save failed, please try again', 'error');
    throw error;  // 让调用者知道失败
  }
}
```

---

### 3. API 调用无超时控制

**问题描述**：`fetchDefinitions` 没有设置超时，可能导致请求挂起。

**位置**：`src/popup/languages/EnglishStrategy.js:35-50`

**风险**：
- 用户点击后界面卡住
- 长时间等待无反馈

**修复建议**：
```typescript
async fetchDefinitions(word: string): Promise<DictionaryEntry[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    // ...
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Dictionary lookup timed out');
    }
    throw error;
  }
}
```

---

## 🟠 中等问题

### 4. 魔法字符串和硬编码值

**问题描述**：多处使用硬编码字符串，难以维护。

**位置**：
```javascript
// popup/main.js:34-38
const KNOWN_SITE_DEFAULTS = {
  'gemini.google.com': true,
  'chatgpt.com': true,
  // ...
};

// popup/main.js:179
const data = await chrome.storage.local.get(['word', 'context', 'other']);
```

**修复建议**：
```typescript
// constants.ts
export const STORAGE_KEYS = {
  WORD: 'word',
  CONTEXT: 'context',
  OTHER: 'other',
  PROMPTS: 'prompts',
  SITE_CONFIGS: 'siteConfigs',
  LAST_ACTIVE_PROMPT: 'lastActivePromptId',
} as const;

export const DEFAULT_SITE_CONFIGS: Record<string, boolean> = {
  'gemini.google.com': true,
  'chatgpt.com': true,
  'claude.ai': true,
  'aistudio.google.com': false,
};
```

---

### 5. 重复代码

**问题描述**：`popup/main.js` 和 `options/main.js` 有相似的存储操作逻辑。

**重复代码**：
```javascript
// 两处都有类似的代码
const data = await chrome.storage.local.get(['prompts', 'siteConfigs']);
prompts = data.prompts || [];
siteConfigs = data.siteConfigs || {};
```

**修复建议**：提取共享模块
```typescript
// utils/storage.ts
export class StorageManager {
  static async get<T>(key: string): Promise<T | undefined>;
  static async set<T>(key: string, value: T): Promise<void>;
  static async getPrompts(): Promise<Prompt[]>;
  static async getSiteConfigs(): Promise<Record<string, SiteConfig>>;
}
```

---

### 6. DOM 查询性能

**问题描述**：`getElements()` 每次调用都重新查询 DOM。

**位置**：`popup/main.js:4-22`

**修复建议**：
```typescript
// 缓存 DOM 引用
class PopupUI {
  private elements: PopupElements | null = null;
  
  getElements(): PopupElements {
    if (!this.elements) {
      this.elements = {
        word: document.getElementById('word')!,
        // ...
      };
    }
    return this.elements;
  }
}
```

---

### 7. 事件监听器内存泄漏

**问题描述**：动态创建的元素绑定事件，但删除元素时未清理事件监听器。

**位置**：`options/main.js:88-92`

```javascript
const deleteBtn = item.querySelector('.delete-rule-btn');
deleteBtn.onclick = (e) => {  // 直接赋值，无法移除
  e.stopPropagation();
  deleteSiteRule(domain);
};
```

**修复建议**：
```typescript
// 使用事件委托或 WeakMap 管理监听器
class SiteRulesManager {
  private listeners = new WeakMap<Element, () => void>();
  
  bindEvents(item: Element, domain: string) {
    const handler = () => this.deleteSiteRule(domain);
    const deleteBtn = item.querySelector('.delete-rule-btn');
    deleteBtn?.addEventListener('click', handler);
    this.listeners.set(deleteBtn, handler);
  }
  
  cleanup(item: Element) {
    const handler = this.listeners.get(item);
    if (handler) {
      item.removeEventListener('click', handler);
      this.listeners.delete(item);
    }
  }
}
```

---

### 8. 缺少输入验证

**问题描述**：用户输入直接保存，没有验证。

**位置**：
- `options/main.js:141-143` - 提示词保存
- `popup/main.js:191-195` - 词汇输入保存

**风险**：
- 存储空间被滥用
- 潜在的 XSS（虽然已做转义）

**修复建议**：
```typescript
// validators.ts
export function validatePrompt(prompt: Prompt): ValidationResult {
  const errors: string[] = [];
  
  if (!prompt.title || prompt.title.length > 100) {
    errors.push('Title must be 1-100 characters');
  }
  
  if (!prompt.content || prompt.content.length > 10000) {
    errors.push('Content must be 1-10000 characters');
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## 🟡 轻微问题

### 9. 函数过长

**问题描述**：`handleGenerate` 函数超过 50 行，职责过多。

**位置**：`popup/main.js:214-269`

**修复建议**：拆分为小函数
```typescript
async function handleGenerate(): Promise<void> {
  const input = getUserInput();
  if (!validateInput(input)) return;
  
  setLoading(true);
  try {
    const result = await generateVocabularyCard(input);
    await copyToClipboard(result.formattedText);
    showStatus(result.message, result.status);
  } finally {
    setLoading(false);
  }
}
```

---

### 10. 缺少单元测试

**问题描述**：项目没有任何自动化测试。

**影响**：
- 无法保证代码质量
- 重构风险高
- 回归测试耗时

**建议测试覆盖**：
- `EnglishStrategy` 的三个方法
- 存储操作
- 提示词应用逻辑
- 格式化输出

---

### 11. 代码风格不一致

**问题描述**：
- 引号混用（单引号/双引号）
- 缩进空格数不一致
- 缺少分号的地方

**修复建议**：添加 ESLint + Prettier 配置

---

### 12. 注释不足

**问题描述**：复杂逻辑缺少注释说明。

**示例**：
```javascript
// popup/main.js:85-87
if (lastActivePromptId && !prompts.find(p => p.id === lastActivePromptId)) {
  lastActivePromptId = null;
}
// 缺少注释：为什么需要这个检查？
```

---

## 问题分布图

```
                    问题分布
    ┌─────────────────────────────────────┐
    │                                     │
  4 │ ████ 轻微问题                       │
    │                                     │
  5 │ █████ 中等问题                      │
    │                                     │
  3 │ ███ 严重问题                        │
    │                                     │
    └─────────────────────────────────────┘
```

---

## 修复优先级矩阵

| 问题 | 影响 | 修复难度 | 优先级 |
|------|------|----------|--------|
| 缺少类型系统 | 高 | 中 | P0 |
| 存储错误处理 | 高 | 低 | P0 |
| API 超时控制 | 高 | 低 | P0 |
| 魔法字符串 | 中 | 低 | P1 |
| 重复代码 | 中 | 中 | P1 |
| DOM 性能 | 低 | 低 | P2 |
| 内存泄漏 | 中 | 中 | P1 |
| 输入验证 | 中 | 低 | P1 |
| 函数过长 | 低 | 低 | P2 |
| 缺少测试 | 高 | 高 | P2 |
| 代码风格 | 低 | 低 | P3 |
| 注释不足 | 低 | 低 | P3 |
