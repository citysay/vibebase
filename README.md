# AIDB Viewer

一个专用于查看 AIDB/VibeBase 数据库的可视化工具。

## 功能特性

- **数据库概览**: 查看记忆数量、实体数量、关系数量等统计信息
- **记忆浏览**: 表格形式查看所有记忆，支持搜索、筛选、分页
- **实体管理**: 查看知识图谱中的实体及其属性
- **关系查看**: 查看实体之间的关系
- **图谱可视化**: 交互式知识图谱可视化，支持拖拽、缩放
- **统计图表**: 内容类型分布、重要性分布、热门标签等

## 支持的数据库格式

- AIDB/VibeBase 数据库目录
- 包含以下文件的目录：
  - `documents.jsonl` - 文档/记忆数据
  - `hnsw.index` - HNSW 向量索引
  - `graph/entities.jsonl` - 实体数据
  - `graph/relations.jsonl` - 关系数据

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

这将同时启动：
- 前端开发服务器: http://localhost:5173
- 后端 API 服务器: http://localhost:3456

### 生产构建

```bash
npm run build
```

### 启动生产服务器

```bash
npm run start
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Express + TypeScript
- **图表**: Recharts
- **图谱可视化**: vis-network
- **图标**: Lucide React

## 项目结构

```
aidb-viewer/
├── server/             # 后端 Express 服务器
│   └── index.ts        # API 路由和数据解析
├── src/
│   ├── components/     # React 组件
│   │   ├── Layout.tsx          # 布局组件
│   │   ├── DatabaseSelector.tsx # 数据库选择器
│   │   ├── DataTable.tsx       # 通用数据表格
│   │   ├── StatsCard.tsx       # 统计卡片
│   │   ├── GraphView.tsx       # 图谱可视化
│   │   └── MemoryDetail.tsx    # 记忆详情弹窗
│   ├── pages/          # 页面组件
│   │   ├── Dashboard.tsx       # 概览页面
│   │   ├── MemoriesPage.tsx    # 记忆列表页
│   │   ├── EntitiesPage.tsx    # 实体列表页
│   │   ├── RelationsPage.tsx   # 关系列表页
│   │   └── GraphPage.tsx       # 图谱页面
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 主应用组件
│   └── main.tsx        # 入口文件
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/validate` | POST | 验证数据库路径 |
| `/api/stats` | GET | 获取数据库统计 |
| `/api/memories` | GET | 获取记忆列表 |
| `/api/memories/:id` | GET | 获取单条记忆 |
| `/api/entities` | GET | 获取实体列表 |
| `/api/relations` | GET | 获取关系列表 |
| `/api/graph` | GET | 获取图谱数据 |
| `/api/tags` | GET | 获取标签统计 |
| `/api/content-types` | GET | 获取内容类型统计 |
| `/api/importance-distribution` | GET | 获取重要性分布 |

## 使用说明

1. 启动应用后，输入 AIDB 数据库的目录路径
2. 点击"连接数据库"按钮
3. 在左侧导航栏切换不同视图：
   - **概览**: 查看数据库统计和图表
   - **记忆**: 浏览和搜索记忆数据
   - **实体**: 查看知识图谱实体
   - **关系**: 查看实体间关系
   - **图谱**: 可视化知识图谱

## 许可证

MIT
