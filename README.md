# 趋势选专业

一个面向中国高考生的专业选择 MVP：基于 RIASEC 兴趣测评 + 「十五五」国家战略产业方向，匹配出 Top 5 推荐专业，并接 DeepSeek API 生成个性化 AI 建议。

## 项目结构

```
gaokao/
├── data/                       共享数据层（前后端唯一数据源）
│   ├── subjects.json           首选科目（2）
│   ├── questions.json          霍兰德测评题目（30）
│   ├── industries.json         「十五五」战略产业（22）
│   └── majors.json             专业库（46）
├── frontend/                   Vite + React + TypeScript
│   ├── src/
│   │   ├── components/         UI 组件
│   │   ├── lib/                推荐算法、API 客户端
│   │   ├── styles/             CSS
│   │   ├── types/              共享类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/                    Fastify + TypeScript
│   ├── src/
│   │   ├── routes/             路由（/api/chat 等）
│   │   ├── lib/                DeepSeek 客户端、限流
│   │   └── server.ts
│   ├── tsconfig.json
│   └── package.json
└── 高考专业选择/                旧原型（保留作参考，不参与构建）
```

## 本地开发

### 1. 准备 DeepSeek API Key

在 [DeepSeek 控制台](https://platform.deepseek.com/) 申请 API Key。

### 2. 启动后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
npm run dev
```

后端默认监听 `http://localhost:8787`。

#### 可选环境变量：AI 模型

模型均由后端控制，前端无法篡改（防刷量）。两个变量都可不填，用默认值即可：

| 变量 | 作用 | 默认值 |
|------|------|--------|
| `DEEPSEEK_MODEL` | 最终 AI 报告 / 默认模型 | `deepseek-v4-pro` |
| `DEEPSEEK_REVIEW_MODEL` | 职业层 / 专业层 AI 复核所用模型 | `deepseek-v4-flash` |

- 复核是「在确定性规则的硬约束内做结构化校正」，不需要重推理，因此默认走更快的 `deepseek-v4-flash`（v4 家族快档），相比 `deepseek-v4-pro` 把复核耗时压低约 2–4 倍。
- ⚠️ **切勿**把这两个变量设成 `deepseek-chat` 或 `deepseek-reasoner`：这两个旧模型名 **2026-07-24 起全面退役报错**，只能用 `deepseek-v4-*` 系列。

### 3. 启动前端

新开终端：

```bash
cd frontend
npm install
npm run dev
```

前端默认监听 `http://localhost:5173`，Vite dev server 会把 `/api/*` 请求 proxy 到后端。

## 部署到阿里云（套餐 B）

### 前端 → 阿里云 OSS + CDN

```bash
cd frontend
# 在 .env.production 中配置 VITE_API_BASE 为你的后端域名
echo "VITE_API_BASE=https://api.your-domain.com" > .env.production
npm run build
# 上传 dist/ 目录下所有文件到 OSS bucket
# 配置 OSS bucket 为静态网站托管，绑定 CDN 加速域名
```

要点：
- OSS bucket 需开通**静态网站托管**，默认首页 `index.html`，错误页也指向 `index.html`（SPA 单页路由）
- 绑定 CDN 加速域名，HTTPS 开启
- 域名需完成 ICP 备案

### 后端 → 阿里云函数计算 FC

```bash
cd backend
npm install
npm run build
# 用阿里云 Serverless Devs 工具 (s) 或控制台部署 dist/
```

要点：
- 在函数计算控制台配置环境变量 `DEEPSEEK_API_KEY` 与 `ALLOWED_ORIGINS`（你的前端域名，多个用英文逗号分隔）
- 可选：`DEEPSEEK_MODEL` / `DEEPSEEK_REVIEW_MODEL`（见上方「可选环境变量：AI 模型」，不配则用默认）
- 触发器选 HTTP 触发器，绑定自定义域名
- 函数运行时选 Node.js 20

详细部署文档见 `backend/DEPLOY.md`。

## 每年更新专业数据

直接编辑 `data/majors.json`：
- 增删专业按需求文档「入库双重标准」（国家「十五五」规划在列 + 不在麦可思最新红牌名单）
- 修改 `realityCheck` 字段反映最新就业现实
- 前后端会同步读取，无需改代码

## 关键设计要点

- **数据层独立**：`data/` 目录下的 4 个 JSON 是前后端唯一数据源，前端通过 Vite alias `@data` 直接 import，后端通过相对路径读取做 AI prompt 上下文
- **密钥不出后端**：DeepSeek API Key 只在 `backend/.env` 与函数计算环境变量里，前端 bundle 与浏览器请求都看不到
- **AI 模型固定**：`backend/src/lib/deepseek.ts` 强制覆写 `model: "deepseek-v4-pro"` 与 `max_tokens: 1000`，防止前端被篡改刷量
- **首选科目过滤**：历史类考生不会推荐物理类专业，但底部会灰显前 3 个错过的物理类专业作为机会成本展示
