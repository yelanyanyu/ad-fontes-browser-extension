# TypeScript 迁移计划

## 概述

本计划详细描述如何将 Ad Fontes 浏览器扩展从 JavaScript 迁移到 TypeScript，以获得类型安全、更好的 IDE 支持和可维护性。

## 迁移目标

1. **类型安全**：消除运行时类型错误
2. **IDE 支持**：获得智能提示和自动补全
3. **可维护性**：提高代码可读性和可维护性
4. **零功能回归**：迁移过程中保持功能完全一致

## 迁移策略

采用**渐进式迁移**策略：
- 先配置 TypeScript 环境
- 从底层模块开始迁移
- 逐步向上层模块推进
- 最后迁移入口文件

```
迁移顺序：

类型定义 ──► 工具函数 ──► Strategy ──► Storage ──► Options ──► Popup
(第1步)      (第2步)      (第3步)      (第4步)      (第5步)     (第6步)
```

## 详细步骤

### Phase 1: 环境配置 (预计 1-2 小时)

#### 1.1 安装依赖

```bash
npm install --save-dev typescript @types/chrome @types/node
npm install --save-dev vite-plugin-checker  # Vite TypeScript 检查
```

#### 1.2 创建 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.3 更新 vite.config.js

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    checker({ typescript: true })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

#### 1.4 更新 package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:watch": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "bump": "node scripts/bump-version.js",
    "set-version": "node scripts/set-version.js",
    "preview": "vite preview",
    "zip": "tar -a -c -f ad-fontes-extension.zip -C dist ."
  }
}
```

---

### Phase 2: 类型定义 (预计 2-3 小时)

#### 2.1 创建类型目录结构

```
src/
├── types/
│   ├── index.ts           # 类型导出
│   ├── prompt.ts          # 提示词相关类型
│   ├── site.ts            # 网站配置类型
│   ├── storage.ts         # 存储类型
│   ├── dictionary.ts      # 词典 API 类型
│   └── chrome.d.ts        # Chrome API 扩展
```

#### 2.2 定义核心类型

**src/types/prompt.ts**
```typescript
export interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface PromptInput {
  title: string;
  content: string;
}
```

**src/types/site.ts**
```typescript
export interface SiteConfig {
  enabled: boolean;
  promptId: string | null;
}

export type SiteConfigs = Record<string, SiteConfig>;

export interface ResolvedConfig extends SiteConfig {
  domain: string;
}
```

**src/types/storage.ts**
```typescript
import { Prompt } from './prompt';
import { SiteConfigs } from './site';

export interface StorageSchema {
  // 词汇输入
  word: string;
  context: string;
  other: string;
  
  // 提示词库
  prompts: Prompt[];
  
  // 网站配置
  siteConfigs: SiteConfigs;
  
  // 全局状态
  lastActivePromptId: string | null;
}

export type StorageKey = keyof StorageSchema;
```

**src/types/dictionary.ts**
```typescript
export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name: string;
    url: string;
  };
}

export interface Definition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  license?: {
    name: string;
    url: string;
  };
  sourceUrls: string[];
}

export type DictionaryResponse = DictionaryEntry[];
```

**src/types/index.ts**
```typescript
export * from './prompt';
export * from './site';
export * from './storage';
export * from './dictionary';
```

---

### Phase 3: 工具模块迁移 (预计 3-4 小时)

#### 3.1 创建常量定义

**src/utils/constants.ts**
```typescript
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

export const API_TIMEOUT = 5000; // 5 seconds
export const DEBOUNCE_DELAY = 500; // 500ms
```

#### 3.2 存储管理器

**src/utils/storage.ts**
```typescript
import { StorageSchema } from '@types/storage';
import { STORAGE_KEYS } from './constants';

export class StorageManager {
  static async get<K extends keyof StorageSchema>(
    key: K
  ): Promise<StorageSchema[K] | undefined> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      throw error;
    }
  }

  static async set<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K]
  ): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set ${key} in storage:`, error);
      throw error;
    }
  }

  static async getMultiple<K extends keyof StorageSchema>(
    keys: K[]
  ): Promise<Pick<StorageSchema, K>> {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Failed to get multiple keys from storage:', error);
      throw error;
    }
  }

  static async setMultiple(
    data: Partial<StorageSchema>
  ): Promise<void> {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Failed to set multiple keys in storage:', error);
      throw error;
    }
  }
}
```

#### 3.3 验证器

**src/utils/validators.ts**
```typescript
import { Prompt, PromptInput } from '@types/prompt';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePromptInput(input: PromptInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (input.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (!input.content || input.content.trim().length === 0) {
    errors.push('Content is required');
  } else if (input.content.length > 10000) {
    errors.push('Content must be less than 10000 characters');
  }

  return { valid: errors.length === 0, errors };
}

export function validateWordInput(word: string): ValidationResult {
  const errors: string[] = [];

  if (!word || word.trim().length === 0) {
    errors.push('Please enter a word');
  } else if (word.length > 100) {
    errors.push('Word is too long');
  }

  return { valid: errors.length === 0, errors };
}
```

#### 3.4 工具函数

**src/utils/helpers.ts**
```typescript
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}
```

---

### Phase 4: Strategy 模块迁移 (预计 2-3 小时)

#### 4.1 定义策略接口

**src/strategies/LanguageStrategy.ts**
```typescript
import { DictionaryResponse } from '@types/dictionary';

export interface LanguageStrategy {
  readonly name: string;
  
  /**
   * Get the lemma (root form) of a word.
   */
  getLemma(text: string): string;
  
  /**
   * Fetch definitions from dictionary API.
   */
  fetchDefinitions(word: string): Promise<DictionaryResponse>;
  
  /**
   * Format the output text for the card.
   */
  formatOutput(
    lemma: string,
    userContext: string,
    apiData: DictionaryResponse,
    otherMessage: string
  ): string;
}
```

#### 4.2 迁移 EnglishStrategy

**src/strategies/EnglishStrategy.ts**
```typescript
import nlp from 'compromise';
import { LanguageStrategy } from './LanguageStrategy';
import { DictionaryResponse, DictionaryEntry } from '@types/dictionary';
import { API_TIMEOUT } from '@utils/constants';

export class EnglishStrategy implements LanguageStrategy {
  readonly name = 'English';

  getLemma(text: string): string {
    try {
      const doc = nlp(text);
      doc.compute('root');
      const json = doc.json();

      if (json?.[0]?.terms?.[0]) {
        const term = json[0].terms[0];
        return (term.root as string) || (term.normal as string) || text;
      }
      return text;
    } catch (error) {
      console.warn('NLP processing failed, using original text:', error);
      return text;
    }
  }

  async fetchDefinitions(word: string): Promise<DictionaryResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Word "${word}" not found in dictionary.`);
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json() as DictionaryResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Dictionary lookup timed out');
      }
      throw error;
    }
  }

  formatOutput(
    lemma: string,
    userContext: string,
    apiData: DictionaryResponse,
    otherMessage: string
  ): string {
    const meaningsList: string[] = [];

    apiData.forEach((entry: DictionaryEntry) => {
      entry.meanings?.forEach((meaning) => {
        const pos = meaning.partOfSpeech;
        meaning.definitions.forEach((def) => {
          meaningsList.push(`[${pos}] ${def.definition}`);
        });
      });
    });

    const uniqueMeanings = [...new Set(meaningsList)];

    let text = `word: ${lemma}\n`;
    text += `context: ${userContext}\n`;
    text += `meanings:\n`;

    if (uniqueMeanings.length > 0) {
      uniqueMeanings.forEach((m) => {
        text += `- ${m}\n`;
      });
    } else {
      text += `- No definitions found\n`;
    }

    text += `other_message: ${otherMessage}`;

    return text;
  }
}
```

---

### Phase 5: Options 页面迁移 (预计 3-4 小时)

#### 5.1 定义 DOM 元素类型

**src/options/types.ts**
```typescript
export interface OptionsElements {
  promptList: HTMLDivElement;
  siteRulesList: HTMLDivElement;
  clearSitesBtn: HTMLButtonElement;
  editorContainer: HTMLDivElement;
  emptyState: HTMLDivElement;
  titleInput: HTMLInputElement;
  contentInput: HTMLTextAreaElement;
  saveBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
  addBtn: HTMLButtonElement;
}
```

#### 5.2 迁移 Options 主逻辑

**src/options/main.ts**
```typescript
import { Prompt } from '@types/prompt';
import { SiteConfigs } from '@types/site';
import { StorageManager } from '@utils/storage';
import { validatePromptInput } from '@utils/validators';
import { escapeHtml, generateId } from '@utils/helpers';
import { STORAGE_KEYS } from '@utils/constants';
import { OptionsElements } from './types';

class OptionsManager {
  private prompts: Prompt[] = [];
  private siteConfigs: SiteConfigs = {};
  private currentPromptId: string | null = null;
  private elements: OptionsElements;

  constructor() {
    this.elements = this.getElements();
  }

  private getElements(): OptionsElements {
    return {
      promptList: document.getElementById('prompt-list') as HTMLDivElement,
      siteRulesList: document.getElementById('site-rules-list') as HTMLDivElement,
      clearSitesBtn: document.getElementById('clear-sites-btn') as HTMLButtonElement,
      editorContainer: document.getElementById('editor-container') as HTMLDivElement,
      emptyState: document.getElementById('editor-empty-state') as HTMLDivElement,
      titleInput: document.getElementById('prompt-title') as HTMLInputElement,
      contentInput: document.getElementById('prompt-content') as HTMLTextAreaElement,
      saveBtn: document.getElementById('save-btn') as HTMLButtonElement,
      deleteBtn: document.getElementById('delete-btn') as HTMLButtonElement,
      addBtn: document.getElementById('add-prompt-btn') as HTMLButtonElement,
    };
  }

  async init(): Promise<void> {
    await this.loadData();
    this.renderPrompts();
    this.renderSiteRules();
    this.setupListeners();
  }

  private async loadData(): Promise<void> {
    const data = await StorageManager.getMultiple([
      STORAGE_KEYS.PROMPTS,
      STORAGE_KEYS.SITE_CONFIGS,
    ]);
    this.prompts = data[STORAGE_KEYS.PROMPTS] || [];
    this.siteConfigs = data[STORAGE_KEYS.SITE_CONFIGS] || {};
  }

  private async saveData(): Promise<void> {
    await StorageManager.setMultiple({
      [STORAGE_KEYS.PROMPTS]: this.prompts,
      [STORAGE_KEYS.SITE_CONFIGS]: this.siteConfigs,
    });
  }

  // ... 其他方法
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const manager = new OptionsManager();
  manager.init();
});
```

---

### Phase 6: Popup 页面迁移 (预计 4-5 小时)

#### 6.1 定义类型

**src/popup/types.ts**
```typescript
export interface PopupElements {
  word: HTMLInputElement;
  context: HTMLTextAreaElement;
  other: HTMLTextAreaElement;
  generateBtn: HTMLButtonElement;
  directBtn: HTMLButtonElement;
  copyBtn: HTMLButtonElement;
  status: HTMLDivElement;
  loader: HTMLSpanElement;
  btnText: HTMLSpanElement;
  previewContainer: HTMLDivElement;
  preview: HTMLTextAreaElement;
  domainLabel: HTMLSpanElement;
  promptToggle: HTMLInputElement;
  promptSelect: HTMLSelectElement;
  promptSelectionArea: HTMLDivElement;
  openOptionsBtn: HTMLButtonElement;
}

export interface UserInput {
  word: string;
  context: string;
  other: string;
}

export interface GenerateResult {
  formattedText: string;
  message: string;
  status: 'success' | 'error';
}
```

#### 6.2 迁移 Popup 主逻辑

**src/popup/main.ts**
```typescript
import { LanguageStrategy } from '@strategies/LanguageStrategy';
import { EnglishStrategy } from '@strategies/EnglishStrategy';
import { Prompt, PromptInput } from '@types/prompt';
import { SiteConfigs, ResolvedConfig } from '@types/site';
import { StorageManager } from '@utils/storage';
import { validateWordInput } from '@utils/validators';
import { debounce, escapeHtml } from '@utils/helpers';
import { STORAGE_KEYS, DEFAULT_SITE_CONFIGS, DEBOUNCE_DELAY } from '@utils/constants';
import { PopupElements, UserInput, GenerateResult } from './types';

class PopupManager {
  private elements: PopupElements;
  private currentStrategy: LanguageStrategy;
  private lastGeneratedText = '';
  private currentDomain = '';
  private prompts: Prompt[] = [];
  private siteConfigs: SiteConfigs = {};
  private lastActivePromptId: string | null = null;

  constructor() {
    this.elements = this.getElements();
    this.currentStrategy = new EnglishStrategy();
  }

  async init(): Promise<void> {
    await this.initializeContext();
    await this.loadFromStorage();
    await this.loadSiteConfig();
    this.setupEventListeners();
  }

  private getElements(): PopupElements {
    return {
      word: document.getElementById('word') as HTMLInputElement,
      context: document.getElementById('context') as HTMLTextAreaElement,
      other: document.getElementById('other') as HTMLTextAreaElement,
      generateBtn: document.getElementById('generateBtn') as HTMLButtonElement,
      directBtn: document.getElementById('directBtn') as HTMLButtonElement,
      copyBtn: document.getElementById('copyBtn') as HTMLButtonElement,
      status: document.getElementById('status') as HTMLDivElement,
      loader: document.querySelector('.loader') as HTMLSpanElement,
      btnText: document.querySelector('.btn-text') as HTMLSpanElement,
      previewContainer: document.getElementById('preview-container') as HTMLDivElement,
      preview: document.getElementById('preview') as HTMLTextAreaElement,
      domainLabel: document.getElementById('current-domain') as HTMLSpanElement,
      promptToggle: document.getElementById('prompt-toggle') as HTMLInputElement,
      promptSelect: document.getElementById('prompt-select') as HTMLSelectElement,
      promptSelectionArea: document.getElementById('prompt-selection-area') as HTMLDivElement,
      openOptionsBtn: document.getElementById('open-options-btn') as HTMLButtonElement,
    };
  }

  // ... 其他方法
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const manager = new PopupManager();
  manager.init();
});
```

---

### Phase 7: 验证和测试 (预计 2-3 小时)

#### 7.1 类型检查

```bash
npm run typecheck
```

#### 7.2 构建测试

```bash
npm run build
```

#### 7.3 功能测试清单

- [ ] 词汇生成流程
- [ ] 词典查询成功/失败场景
- [ ] 提示词 CRUD
- [ ] 网站配置保存/加载
- [ ] 剪贴板复制
- [ ] 输入自动保存

---

## 文件重命名映射

| 原文件 | 新文件 |
|--------|--------|
| `src/popup/main.js` | `src/popup/main.ts` |
| `src/options/main.js` | `src/options/main.ts` |
| `src/popup/languages/EnglishStrategy.js` | `src/strategies/EnglishStrategy.ts` |

---

## 时间估算

| Phase | 预计时间 | 实际时间 |
|-------|----------|----------|
| 环境配置 | 1-2h | |
| 类型定义 | 2-3h | |
| 工具模块 | 3-4h | |
| Strategy | 2-3h | |
| Options | 3-4h | |
| Popup | 4-5h | |
| 验证测试 | 2-3h | |
| **总计** | **17-24h** | |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 类型定义不完整 | 编译错误 | 使用 `any` 临时绕过，逐步完善 |
| 第三方库无类型 | 编译错误 | 安装 `@types/xxx` 或创建 `.d.ts` |
| 功能回归 | 用户体验 | 完整的手动测试 |
| 构建配置问题 | 无法构建 | 保留原始 JS 备份 |

---

## 迁移后收益

1. **类型安全**：编译期捕获类型错误
2. **IDE 支持**：智能提示、跳转定义、重构
3. **文档化**：类型即文档
4. **可维护性**：更容易理解和修改代码
5. **团队协作**：明确的接口契约
