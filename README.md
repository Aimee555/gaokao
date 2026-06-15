# 趋势选专业

一个面向中国高考生的专业选择工具：基于 RIASEC 兴趣测评 +「十五五」国家战略产业方向，匹配出推荐专业与职业路径，并接入 DeepSeek 生成个性化 AI 建议。

**在线访问** 👉 https://gaokao-3fz.pages.dev/

## 功能

- **两种测评**：快速版（16 题）与深度版（60 题）兴趣画像问卷
- **确定性匹配引擎**：首选科目硬过滤 → 兴趣画像打分 → 匹配 23 个战略产业、131 个专业及对应职业路径
- **AI 复核与对话**：DeepSeek 在规则结果基础上做结构化复核，并提供志愿规划问答
- **滥用防护**：图形验证码 + 会话配额 + IP 限流 + 每日调用上限，DeepSeek key 仅存于后端，前端不可见
- **访问统计**：内置埋点与带口令的统计看板，查看访问量与转化漏斗

## 技术栈

- 前端：Vite + React + TypeScript
- 后端：Fastify + TypeScript
- AI：DeepSeek API（密钥仅在后端）
- 数据：`data/` 下的 JSON，前后端共享的唯一数据源

## 项目结构

```
gaokao/
├── data/                共享数据层（产业库、专业库、职业库、问卷、匹配规则）
├── frontend/            前端 Vite + React + TypeScript
│   └── src/
│       ├── components/  UI 组件
│       ├── lib/         API 客户端、埋点
│       └── App.tsx
├── backend/             后端 Fastify + TypeScript
│   └── src/
│       ├── routes/      路由（recommend / ai-review / major-review / chat / session / 埋点）
│       ├── lib/         匹配引擎、DeepSeek 客户端、验证码/会话/限流/配额/埋点
│       └── server.ts
└── 高考专业选择/         旧原型（保留参考，不参与构建）
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

## 后端环境变量

仅 `DEEPSEEK_API_KEY` 必填，其余均有默认值（见 `backend/.env.example`）：

| 变量 | 作用 | 默认 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek 密钥（必填） | — |
| `ADMIN_TOKEN` | 统计看板口令，不填则统计功能关闭 | — |
| `ALLOWED_ORIGINS` | 允许跨域的前端来源 | `http://localhost:5173` |
| `DEEPSEEK_DAILY_LIMIT` | 每日 AI 调用上限 | `500` |
| `REQUIRE_SESSION` | 是否要求验证码+会话 | `true` |
| `TRUST_PROXY` | 部署在反代之后时设为 `true` | `false` |

> AI 模型可选 `DEEPSEEK_MODEL`（报告/默认）与 `DEEPSEEK_REVIEW_MODEL`（复核）。
> ⚠️ 只能用 `deepseek-v4-*` 系列；`deepseek-chat` / `deepseek-reasoner` 已退役。

## 访问统计

后端运行后，打开 `<后端地址>/api/stats/dashboard`，输入 `ADMIN_TOKEN` 即可查看
访问量、独立访客、转化漏斗、来源与设备分布。埋点数据写入 `backend/analytics-events.jsonl`。

## 更新专业数据

直接编辑 `data/` 下对应的 JSON（产业库、专业库等），前后端会同步读取，无需改代码。
```
