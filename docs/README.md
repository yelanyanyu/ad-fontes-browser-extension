# Ad Fontes 项目文档

本目录包含 Ad Fontes 浏览器扩展项目的详细技术文档，作为根目录 README.md 的补充。

## 文档索引

| 文档 | 内容 |
|------|------|
| [01-project-overview.md](./01-project-overview.md) | 项目概览、核心功能、技术栈、项目结构 |
| [02-architecture.md](./02-architecture.md) | 架构设计、模块职责、数据流、构建流程 |
| [03-code-analysis.md](./03-code-analysis.md) | 代码质量评估、详细代码分析、依赖分析 |
| [04-issues-diagnosis.md](./04-issues-diagnosis.md) | 问题诊断、严重程度分类、修复建议 |
| [05-typescript-migration-plan.md](./05-typescript-migration-plan.md) | TypeScript 迁移详细计划 |

## 快速导航

### 如果你是新加入的开发者
1. 先阅读 [01-project-overview.md](./01-project-overview.md) 了解项目背景
2. 然后阅读 [02-architecture.md](./02-architecture.md) 理解架构设计
3. 最后查看代码，结合 [03-code-analysis.md](./03-code-analysis.md) 深入理解

### 如果你要进行 TypeScript 迁移
直接参考 [05-typescript-migration-plan.md](./05-typescript-migration-plan.md)，其中包含：
- 详细的迁移步骤
- 类型定义示例
- 代码重构方案
- 时间估算

### 如果你要修复 Bug 或添加功能
先查看 [04-issues-diagnosis.md](./04-issues-diagnosis.md) 了解已知问题，避免重复踩坑。

## 文档维护

- 所有文档使用 Markdown 格式
- 代码示例应可运行或经过验证
- 架构图使用 ASCII 或文字描述
- 发现问题及时更新相关文档
