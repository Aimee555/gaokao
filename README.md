# 趋势选专业

一个面向中国高考生的专业选择工具：基于 RIASEC 兴趣测评 +「十五五」国家战略产业方向，匹配出推荐专业与职业路径，并接入 DeepSeek 生成个性化 AI 建议。

**在线访问** 👉 https://gaokao-3fz.pages.dev/

## 功能

- **两种测评**：快速版（16 题）与深度版（60 题）兴趣画像问卷
- **确定性匹配引擎**：首选科目硬过滤 → 兴趣画像打分 → 匹配 23 个战略产业、131 个专业及对应职业路径
- **AI 复核与对话**：DeepSeek 在规则结果基础上做结构化复核，并提供志愿规划问答

## 技术栈

- 前端：Vite + React + TypeScript
- 后端：Fastify + TypeScript
- AI：DeepSeek API
- 数据：`data/` 下的 JSON，前后端共享的唯一数据源

## 项目结构

```
gaokao/
├── data/                共享数据层（产业库、专业库、职业库、问卷、匹配规则）
├── frontend/            前端 Vite + React + TypeScript
│   └── src/
│       ├── components/  UI 组件
│       ├── lib/         API 客户端
│       └── App.tsx
└── backend/             后端 Fastify + TypeScript
    └── src/
        ├── routes/      路由（recommend / ai-review / major-review / chat 等）
        ├── lib/         匹配引擎、DeepSeek 客户端等
        └── server.ts
```

## 本地开发

需要 Node.js 20+。

### 1. 后端

```bash
cd backend
npm install
cp .env.example .env       # 编辑 .env，至少填入 DEEPSEEK_API_KEY
npm run dev                # 默认 http://localhost:8787
```

### 2. 前端

新开一个终端：

```bash
cd frontend
npm install
npm run dev                # 默认 http://localhost:5173
```

Vite dev server 会把 `/api/*` 请求代理到本地后端，无需额外配置。

## 更新专业数据

直接编辑 `data/` 下对应的 JSON（产业库、专业库等），前后端会同步读取，无需改代码。
