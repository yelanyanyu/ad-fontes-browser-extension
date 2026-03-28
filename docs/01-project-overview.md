# 项目概览 (Project Overview)

## 项目简介

**Ad Fontes** 是一个 Chrome/Edge 浏览器扩展，专为语言学习者设计，帮助用户通过上下文高效积累词汇。该扩展与 [ad-fontes-prompts](https://github.com/yelanyanyu/ad-fontes-prompts) 项目配合使用。

## 核心功能

### 1. 词汇卡片生成
- 智能词根提取（使用 NLP 库 compromise）
- 词典查询（Free Dictionary API）
- 结构化输出（单词、上下文、释义、笔记）
- 一键复制到剪贴板

### 2. 智能提示词系统
- 针对特定 AI 网站配置系统提示词
- 支持网站级别的开关控制
- 自动记忆用户偏好
- 提示词管理面板（Options Page）

## 技术栈

| 技术 | 用途 |
|------|------|
| Vanilla JavaScript (ES Modules) | 核心逻辑 |
| Vite | 构建工具 |
| Compromise | NLP 词形还原 |
| Free Dictionary API | 词典数据 |
| Chrome Extension Manifest V3 | 扩展架构 |

## 项目结构

```
ad-fontes-browser-extension/
├── public/
│   ├── manifest.json          # 扩展清单
│   └── icons/                 # 图标资源
├── src/
│   ├── popup/                 # 弹出窗口
│   │   ├── index.html
│   │   ├── main.js
│   │   ├── style.css
│   │   └── languages/         # 语言策略
│   │       └── EnglishStrategy.js
│   ├── options/               # 选项页面
│   │   ├── index.html
│   │   ├── main.js
│   │   └── style.css
│   └── style.css              # 全局样式
├── scripts/                   # 构建脚本
│   ├── bump-version.js
│   └── set-version.js
├── sample/                    # 示例数据
├── vite.config.js             # Vite 配置
└── package.json
```

## 架构设计

### 模块职责

| 模块 | 职责 |
|------|------|
| `popup/main.js` | 用户交互、词汇生成、提示词应用 |
| `popup/languages/EnglishStrategy.js` | 英语处理策略（词根提取、词典查询、格式化） |
| `options/main.js` | 提示词 CRUD、网站规则管理 |
| `manifest.json` | 扩展配置、权限声明 |

### 数据流

```
User Input → Popup → Strategy → Dictionary API → Format → Clipboard
                ↓
           Storage (chrome.storage.local)
                ↓
          Prompts & SiteConfigs
```

## 存储结构

### chrome.storage.local 键值

```typescript
{
  // 词汇输入自动保存
  word: string;
  context: string;
  other: string;

  // 提示词库
  prompts: Array<{
    id: string;
    title: string;
    content: string;
  }>;

  // 网站配置
  siteConfigs: Record<string, {
    enabled: boolean;
    promptId: string | null;
  }>;

  // 全局最后使用的提示词
  lastActivePromptId: string | null;
}
```

## 支持的 AI 网站

内置默认配置的站点：

| 域名 | 默认状态 |
|------|----------|
| gemini.google.com | 开启 |
| chatgpt.com | 开启 |
| claude.ai | 开启 |
| aistudio.google.com | 关闭 |

## 开发命令

```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建
npm run zip      # 打包扩展
npm run bump     # 版本号 +1
```

## 版本历史

- **v1.1.0** (2026-01-29) - 智能提示词系统、网站记忆功能
- **v1.0.0** (2026-01-26) - 首次发布，基础词汇卡片功能
