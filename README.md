# Ad Fontes 浏览器插件

一个帮助你生成结构化单词卡的词汇构建插件，包含释义、上下文和音标。

## ✨ 功能特性

- **智能词根提取**：自动找到单词的原型（例如："took" -> "take"）。
- **词典查询**：获取释义、音标和词性。
- **内容自动保存**：自动保存你的输入，防止数据丢失。
- **一键复制**：格式化并复制结果到剪贴板。
- **实时预览**：在界面中直接预览生成的卡片内容。

## 📦 安装指南

### Google Chrome

1. 在地址栏输入 `chrome://extensions` 打开扩展管理页面。
2. 打开右上角的 **开发者模式 (Developer mode)**。
3. 点击 **加载已解压的扩展程序 (Load unpacked)**。
4. 选择本项目中的 `dist` 文件夹。

### Microsoft Edge

本插件完全兼容 Microsoft Edge。

1. 在地址栏输入 `edge://extensions`。
2. 打开左侧栏（或页面开关）的 **开发者模式 (Developer mode)**。
3. 点击 **加载解压缩的扩展 (Load unpacked)**。
4. 选择本项目中的 `dist` 文件夹。

## 🛠️ 开发指南

1. 安装依赖：
   ```bash
   npm install
   ```

2. 构建插件：
   ```bash
   npm run build
   ```

3. 构建后的文件将输出到 `dist` 文件夹中。
