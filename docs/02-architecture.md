# 架构详解 (Architecture)

## 整体架构

Ad Fontes 采用经典的浏览器扩展架构，基于 Manifest V3 规范：

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Popup UI   │    │ Options Page │    │   Storage    │  │
│  │  (词汇生成)   │◄──►│  (提示词管理) │◄──►│ chrome.storage│  │
│  └──────┬───────┘    └──────────────┘    └──────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Strategy Pattern (语言策略)                  ││
│  │         ┌─────────────────┐                             ││
│  │         │ EnglishStrategy │──► compromise (NLP)         ││
│  │         │                 │──► Free Dictionary API      ││
│  │         └─────────────────┘                             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 核心模块详解

### 1. Popup 模块 (`src/popup/`)

**职责**：扩展主界面，处理用户输入和词汇生成

**关键流程**：

```
用户点击扩展图标
    │
    ▼
┌─────────────────┐
│ initializeContext│ 获取当前标签页域名
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  loadSiteConfig  │ 加载该域名的提示词配置
└────────┬────────┘
         │
         ▼
用户点击 "Generate & Copy"
    │
    ▼
┌─────────────────┐
│ handleGenerate   │
│ 1. getLemma()   │ 词形还原
│ 2. fetchDefinitions() │ 查词典
│ 3. formatOutput() │ 格式化
│ 4. applyPrompt() │ 应用提示词
│ 5. copyToClipboard() │ 复制
└─────────────────┘
```

**状态管理**：
- 模块级变量存储当前状态
- `chrome.storage.local` 持久化数据

### 2. Strategy 模块 (`src/popup/languages/`)

**设计模式**：策略模式 (Strategy Pattern)

**目的**：支持多语言扩展

```typescript
// 策略接口（隐式契约）
interface LanguageStrategy {
  name: string;
  getLemma(text: string): string;
  fetchDefinitions(word: string): Promise<any>;
  formatOutput(lemma, context, apiData, otherMessage): string;
}
```

**EnglishStrategy 实现**：

| 方法 | 功能 | 依赖 |
|------|------|------|
| `getLemma()` | 词形还原 | compromise |
| `fetchDefinitions()` | 查词典 | Free Dictionary API |
| `formatOutput()` | 格式化输出 | - |

### 3. Options 模块 (`src/options/`)

**职责**：提示词管理和网站规则管理

**数据结构**：

```typescript
// 提示词
interface Prompt {
  id: string;        // UUID
  title: string;     // 显示名称
  content: string;   // 提示词内容
}

// 网站配置
interface SiteConfig {
  enabled: boolean;      // 是否启用提示词
  promptId: string | null; // 使用的提示词ID
}
```

**功能**：
- 提示词 CRUD
- 网站规则列表展示
- 网站规则删除

### 4. Storage 层

**使用的 Chrome API**：

```javascript
// 读取
chrome.storage.local.get(keys)

// 写入
chrome.storage.local.set(data)

// 使用的权限
"permissions": ["storage"]
```

**数据隔离**：
- 词汇输入：`word`, `context`, `other`
- 提示词库：`prompts`
- 网站配置：`siteConfigs`
- 全局状态：`lastActivePromptId`

## 通信机制

### 模块间通信

由于采用 Vite 多页面构建，各页面独立运行：

```
Popup ─────┐
           ├──► chrome.storage.local ◄─── 共享状态
Options ───┘
```

### 外部通信

```
Popup ──► Free Dictionary API (HTTPS)
```

## 构建流程

```
Source (src/)          Vite Build              Output (dist/)
─────────────         ───────────              ──────────────

popup/
  ├── index.html  ───┐
  ├── main.js    ────┼──► Rollup Bundle ───►  popup/index.html
  ├── style.css  ────┘                        popup/main.js
                                              popup/style.css

options/
  ├── index.html  ───┐
  ├── main.js    ────┼──► Rollup Bundle ───►  options/index.html
  ├── style.css  ────┘                        options/main.js
                                              options/style.css

public/
  ├── manifest.json ──────────────────────►   manifest.json
  └── icons/       ──────────────────────►   icons/
```

## 扩展生命周期

```
Install/Update
    │
    ▼
┌─────────────────┐
│  manifest.json  │ 声明权限和页面
│  加载          │
└────────┬────────┘
         │
    User Action
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌─────────┐
│ Popup │  │ Options │
│ 打开   │  │ 页面    │
└───────┘  └─────────┘
```

## 安全考虑

1. **CSP**： Manifest V3 默认限制内联脚本
2. **权限最小化**：仅请求必要权限 (`activeTab`, `clipboardWrite`, `storage`)
3. **数据验证**：对用户输入进行基本清理（`escapeHtml`）
4. **API 错误处理**：词典查询失败有降级方案
