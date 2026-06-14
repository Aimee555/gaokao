# 需求文档：「趋势选专业」MVP — DeepSeek API 版（投喂给 Claude Code CLI）

## 0. 交付物与架构（最重要，先读）
- **交付物**：
  1. 一个 Vite + React + Tailwind 静态前端项目
  2. 一个 Cloudflare Workers 代理脚本（约 40 行，保管 DeepSeek API key）
- **AI 能力**：调用 **DeepSeek API**，模型固定 **`deepseek-v4-pro`**（当前 DeepSeek 旗舰模型）
  - ⚠️ 严禁使用 `deepseek-chat` / `deepseek-reasoner`，这两个旧模型名 2026-07-24 起全面退役报错
  - API 为 OpenAI 兼容格式，端点 `https://api.deepseek.com/chat/completions`
- **密钥安全**：API key 只存在于 Workers 环境变量 `DEEPSEEK_API_KEY` 中，**绝不出现在前端代码、git 仓库或浏览器请求里**
- 本地开发：key 放 `.env`（加入 .gitignore），通过 Vite dev server 的 proxy 配置注入 Authorization 头，前端代码本地/生产完全一致
- 部署：前端 → Cloudflare Pages（或 Vercel）；代理 → Cloudflare Workers
  - 备选：若目标用户在中国大陆且 Cloudflare 访问不稳，代理可平移到腾讯云函数/阿里云函数计算（代码逻辑相同，文档化即可，MVP 先用 Workers）

## 1. 核心流程（单一模式：测评 × 国家规划结合）
产品只有一条主线流程，所有用户走同一条路：

`首页 → 选首选科目（物理类/历史类）→ 30题兴趣测评 → 勾选感兴趣的战略方向（1–3个）→ 推荐结果 + AI建议`

推荐函数 `recommend(riasecScores, selectedIndustries, subjectType)`，输出 Top 5。

## 2. 数据文件（src/data/ 下两个独立文件，便于每年更新）

### 2.1 majors.js（专业库，46 条）
```js
export const MAJORS = [
  {
    id: "ai",
    name: "人工智能",
    category: "工学·电子信息类",
    industries: ["人工智能", "具身智能", "机器人"],
    policyBasis: "「十五五」规划：实施'人工智能+'行动，推动具身智能成为新的经济增长点",
    riasec: ["I", "R", "C"],
    careers: ["算法工程师", "机器学习工程师", "AI产品经理"],
    isNew: false,
    physicsRequired: true,  // 是否要求首选物理（绝大多数院校），历史类考生匹配时灰显排底
    jobMarket: "稳定",      // 就业行情标签："绿牌"｜"稳定"（红牌专业不入库，见下方入库双重标准）
    realityCheck: "竞争激烈，头部院校和读研深造优势明显",  // 一句话就业现实提示，每个专业必填，诚实不吹捧
    intro: "学习机器学习、深度学习、计算机视觉等核心技术"
  },
  // ... 共 46 条
];
```

**入库双重标准（硬规则，生成与每年更新数据时都必须遵守）：**
1. 国家需要：能在「十五五」规划纲要原文中找到对应产业/方向表述（policyBasis 可溯源）
2. 就业不错：不在麦可思就业蓝皮书最新红牌名单中，且就业落实率可接受；
   深造导向专业（材料、生物、物理、海洋科学等）可入库，但 realityCheck 必须写明"建议规划读研"
   ——两条同时满足才能入库。法学、应用心理学因连续多年红牌预警已按此标准排除。

**46 个专业及产业归属（必须全部生成，每条字段填齐）：**

理工方向（36 个，physicsRequired 均为 true）：
- 人工智能、数据科学与大数据技术、智能科学与技术、计算机科学与技术 →〔人工智能〕
- 软件工程、网络空间安全 →〔数字经济/新一代信息技术〕
- 微电子科学与工程、集成电路设计与集成系统 →〔集成电路〕
- 机器人工程、自动化、智能制造工程 →〔机器人/具身智能〕
- 机械工程、测控技术与仪器 →〔高端装备〕
- 新能源科学与工程、储能科学与工程、电气工程及其自动化 →〔新能源〕
- 车辆工程、智能车辆工程 →〔智能网联新能源汽车〕
- 材料科学与工程、功能材料 →〔新材料〕
- 航空航天工程、飞行器设计与工程 →〔航空航天〕
- 低空技术与工程（isNew:true）、无人驾驶航空器系统工程 →〔低空经济〕
- 船舶与海洋工程、海洋科学 →〔海洋经济〕
- 生物医学工程、生物制药、药学 →〔生物医药/生物制造〕
- 物理学、量子信息科学（isNew:true）→〔量子科技〕
- 核工程与核技术、氢能科学与工程（isNew:true）→〔氢能与核聚变〕
- 智能医学工程 →〔脑机接口〕
- 通信工程、电子信息工程 →〔6G〕

人文社科方向（10 个，physicsRequired 均为 false，历史类考生可报；riasec 以 A/S/E/C 为主）：
- 网络与新媒体、数字媒体艺术、文化产业管理、旅游管理 →〔文化强国与文旅〕
- 新闻学、外国语言文学（小语种）→〔国际传播与区域国别〕
- 社会工作、养老服务管理（isNew:true）→〔银发经济与社会服务〕
- 国际经济与贸易、大数据管理与应用 →〔贸易强国与对外开放〕

**jobMarket / realityCheck 标定规则（依据麦可思2025就业蓝皮书）：**
- "绿牌"：电气工程及其自动化、微电子科学与工程（2025绿牌榜在列），及计算机、软件、储能等需求旺盛专业
- "稳定"：其余专业（红牌专业已在入库阶段排除，库内不存在"需谨慎"档）
- 材料类、生物类、物理学、海洋科学等深造导向专业，realityCheck 必须提示"本科直接就业一般，建议规划读研"
- 文旅、养老、新媒体等专业提示"起薪不高但缺口扩大，适合真有兴趣者"
- 任何专业不得只写优点；realityCheck 是这个产品区别于营销号的核心可信度来源

### 2.2 questions.js（30 题，RIASEC 每维 5 题）+ INDUSTRIES（22 个产业卡片）
```js
export const QUESTIONS = [
  { id: 1, text: "我喜欢动手组装、拆解或修理东西", dim: "R" },
  // ... 题目场景贴近高中生（实验课、编程、画画、社团组织、帮同学讲题、整理错题本等），顺序打乱
];
// 计分：喜欢=2，一般=1，不喜欢=0（每维 0–10 分）

export const INDUSTRIES = [
  { id: "人工智能", icon: "Brain", group: "新兴支柱", desc: "国家实施'人工智能+'行动" },
  // 战略性新兴产业12个（group:"新兴支柱"）：人工智能、数字经济、新能源、智能网联新能源汽车、集成电路、机器人、新材料、高端装备、航空航天、低空经济、海洋经济、生物医药
  // 未来产业6个（group:"未来产业"）：量子科技、生物制造、氢能与核聚变、脑机接口、具身智能、6G
  // 人文社科战略4个（group:"人文社科"）：文化强国与文旅、国际传播与区域国别、银发经济与社会服务、贸易强国与对外开放
  //   （依据：纲要文化篇·发展文化产业与文旅融合；完善国际传播体制机制、加强区域国别研究；拓展银发经济就业新空间；建设贸易强国）
];
```

## 3. 推荐算法 `recommend()`
```
兴趣分（满分60）：
  考生取得分最高的3个维度（并列按 R>I>A>S>E>C 顺序取前3）
  专业的 riasec 数组命中考生第1维 +30，第2维 +20，第3维 +10

产业分（满分60）：
  专业 industries 与考生勾选产业有交集，每命中1个 +20（封顶60）

新兴加分：isNew === true 时 +5

总分 = 兴趣分×0.5 + 产业分×0.5 + 新兴分（同分时随机微扰避免顺序固定）

输出：按总分降序取 Top 5；匹配度展示 = min(99, round(总分/最大可能分×100))%
whyFit 动态生成，例："你的研究型(I)特质与本专业高度契合，且属于你关注的人工智能方向"

首选科目过滤（排序后应用）：
  考生为"历史类"→ physicsRequired=true 的专业不进入 Top 5，
  仅在列表底部灰显展示得分最高的 3 条，标注"需首选物理"（让考生知道错过了什么）；
  考生为"物理类"→ 全库参与推荐（人文社科专业物理类同样可报）
```

## 4. AI 个性化建议与追问（DeepSeek API）

### 4.1 前端调用（统一指向代理，不直连 DeepSeek）
```js
// API_BASE：开发环境 "/api"（走 Vite proxy），生产环境为 Workers 地址，用环境变量 VITE_API_BASE 配置
const res = await fetch(`${API_BASE}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }) // OpenAI 格式 messages，前端维护全量历史
});
const data = await res.json();
const text = data.choices[0].message.content;
```
- 建议开启 `stream: true` 做流式输出（打字机效果），MVP 时间紧可先非流式，预留开关
- 错误处理：try/catch + 「AI 暂时繁忙，点击重试」

### 4.2 Cloudflare Workers 代理（需一并生成 worker.js）
逻辑：接收前端 POST → 校验 Origin 白名单（仅本站域名）→ 组装请求转发到
`https://api.deepseek.com/chat/completions`，附 `Authorization: Bearer ${env.DEEPSEEK_API_KEY}` →
强制覆写 `model: "deepseek-v4-pro"`、`max_tokens: 1000`（防止前端被篡改刷量）→ 原样返回（支持流式透传）
另：简单频率限制——同 IP 每分钟最多 10 次（用 Workers 的缓存或内存 Map 即可，MVP 级别）

### 4.3 System Prompt（前端组装，作为 messages[0] 的 system 角色）
```
你是面向中国高考生的专业选择顾问。语气亲切简洁，每次回答不超过300字。
考生信息：首选科目 {物理类/历史类}｜兴趣代码 {如 I-R-C 及各维得分}｜关注方向 {勾选列表}｜系统推荐专业 {Top5 列表，含各自的就业提示}
规则：
1. 只讨论专业、学科、国家政策、职业前景相关话题
2. 不预测任何院校录取分数线；被问到时引导考生查询所在省考试院官网
3. 不确定的信息要明确说明不确定
4. 建议要具体到专业名称，结合考生的兴趣特点给理由
5. 必须诚实：国家战略需要不等于个人就业容易。引用专业自带的就业提示信息，对深造导向专业明确提示读研规划；若考生问到库外专业（如法学），如实说明其就业预警情况与高门槛路径，不做无脑吹捧
```
- 首次点击「AI 个性化建议」= 发送固定 user 消息："请根据我的测评结果和推荐专业，给我一份250字左右的选专业建议，包含：最值得优先考虑的1–2个专业及理由、需要注意的事项"
- 追问 = 多轮对话，messages 数组全量发送

## 5. 状态机
`home → subject-pick（首选科目：物理类 / 历史类，一次点击）→ quiz（30题）→ industry-pick（勾选1–3个方向）→ result`
- 用单个 `step` state 控制；`subjectType`、`answers`、`selectedIndustries`、`aiMessages` 独立 state
- 返回按钮可逐级回退；「重新测评」清空对应 state
- `subjectType` 同时注入 AI system prompt 的考生信息（如"考生为历史类"），AI 建议自动避开物理门槛专业

## 6. 项目结构
```
/src
  /components   Hero, SubjectPick, QuizCard, IndustryGrid, ResultSummary, MajorCard, AIAdvicePanel, Footer
  /data         majors.js, questions.js
  /lib          recommend.js, api.js
  App.jsx
worker.js        （Cloudflare Workers 代理）
.env.example     （DEEPSEEK_API_KEY=sk-xxx 占位）
README.md        （含：本地启动、Workers 部署、每年更新 majors.js 的方法、模型名说明）
```

## 7. 一天实施时间表
| 时段 | 任务 |
|---|---|
| 上午① | Design 文档投喂 Claude Design，得到页面视觉/骨架 |
| 上午② | Claude Code：脚手架 + 三份数据文件（46专业/22产业/30题）+ 还原静态页面 |
| 下午① | Claude Code：状态机、测评流、产业选择、recommend()、结果页（本地 .env 直接真调 DeepSeek 联调）|
| 下午② | 生成 worker.js → 部署 Cloudflare Pages + Workers（配置 DEEPSEEK_API_KEY 环境变量）→ 真机走通完整流程 → 上线 |

## 8. 验收清单
- [ ] 完整流程（科目→测评→选方向→结果）走通并产出 Top 5 推荐
- [ ] 历史类考生的推荐结果中不出现要求物理的专业（仅底部灰显区可见）
- [ ] 测评全选艺术型(A)/社会型(S)倾向答案时，Top 5 出现人文社科专业
- [ ] 推荐结果明显受测评和勾选方向双因素影响（同一测评换不同方向，Top 5 应变化）
- [ ] 每张专业卡片都展示就业提示；库内不存在任何麦可思红牌专业（如法学、应用心理学）
- [ ] 深造导向专业（材料/生物/物理/海洋类）的提示中含读研规划字样
- [ ] AI 建议能引用考生的兴趣代码和具体专业名（说明上下文注入成功）
- [ ] 问"我能上什么大学/多少分能录"时 AI 正确拒答并引导官方渠道
- [ ] 浏览器开发者工具中看不到任何 API key；直接 curl 代理伪造请求无法更换模型
- [ ] 同一网址在手机浏览器（375px 无横向滚动、按钮可点）和电脑浏览器（内容居中不拉伸变形）均正常显示
- [ ] 模型名为 deepseek-v4-pro（全局搜索确认无 deepseek-chat 残留）

## 9. v2 迭代方向（本次不做）
选科组合筛选（物化生等）/ 雷达图可视化 / 流式输出与打字机效果（如 MVP 未做）/ 结果导出分享图 / 国内云函数代理版本 / 成本监控（DeepSeek 控制台设用量告警）
