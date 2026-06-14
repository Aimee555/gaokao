# 零成本部署（路二）：前端 Cloudflare Pages + 后端免费 Node 托管

适合**小范围、零成本、免备案**。两边都给境外子域名、自带 HTTPS，不需要云主机、不需要 ICP 备案。

```
用户 ──HTTPS──→ Cloudflare Pages (前端静态站, *.pages.dev)
                      │ fetch (跨域)
                      ▼
              后端 Node 托管 (*.onrender.com 等, 持有 DeepSeek key)
```

前置：把代码推到 GitHub 仓库（两个平台都靠连接仓库 + git push 部署）。

---

## 一、后端 → Render（免费、无需信用卡）

1. 注册 https://render.com ，连接你的 GitHub。
2. New + → **Blueprint**，选中本仓库 → 会自动读取根目录 `render.yaml`。
3. 在环境变量里填（`sync:false` 的几项需手填）：
   - `DEEPSEEK_API_KEY` = 你的 key
   - `ADMIN_TOKEN` = 自定义强口令（统计页用）
   - `ALLOWED_ORIGINS` = 前端地址，先随便填、拿到 Pages 域名后回填，如 `https://gaokao.pages.dev`
   - 其余（TRUST_PROXY/每日配额等）蓝图已带默认值
4. 部署完成后拿到后端地址，如 `https://gaokao-backend.onrender.com`。
   访问 `/health` 应返回 `{"ok":true,...}`。

> ⚠️ 免费档闲置 ~15 分钟会休眠，首个访客冷启动约 30~50s。介意的话用 **Fly.io**
> （需绑卡，有常驻免费额度）或 **Railway**（有试用额度），部署方式类似：
> 连接仓库、Root 设为 `backend`、build `npm install && npm run build`、start `npm start`。

## 二、前端 → Cloudflare Pages（免费）

1. 注册 Cloudflare，Workers & Pages → Create → Pages → 连接 GitHub 仓库。
2. 构建设置：
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. 环境变量加一条：
   - `VITE_API_BASE` = 上一步后端地址 + `/api`，如 `https://gaokao-backend.onrender.com/api`
4. 部署完成拿到前端地址，如 `https://gaokao.pages.dev`。

## 三、回填 CORS 并联调
1. 回 Render 把 `ALLOWED_ORIGINS` 改成真实的 Pages 域名（如 `https://gaokao.pages.dev`），保存触发重启。
2. 打开前端域名走一遍：测评 → 验证码 → 职业 → 专业 → AI 对话。
3. 看统计：`https://gaokao-backend.onrender.com/api/stats/dashboard`，输入 `ADMIN_TOKEN`。

## 上线检查清单
- [ ] DeepSeek 控制台设了**账户消费上限 + 告警**（最重要的防刷钱保险）
- [ ] `ADMIN_TOKEN` 是强口令
- [ ] `ALLOWED_ORIGINS` 已填真实 Pages 域名（否则前端跨域被拦）
- [ ] `VITE_API_BASE` 指向后端 `/api`
- [ ] 完整流程跑通、统计能看到漏斗

## 已知限制（小范围可接受，需留意）
- **埋点会丢**：Render/Railway/Fly 免费档文件系统是临时的，重启/重新部署后
  `analytics-events.jsonl` 清空。要长期留存需接免费数据库（如 Turso/Supabase/Cloudflare D1）——
  这是后续可加的改造，需要时再做。
- **冷启动**：见上（仅 Render 免费档明显）。
- **DeepSeek 延迟**：后端在境外、DeepSeek 在国内，AI 调用会比本地稍慢，小范围可接受。
- **限流/会话/配额**重启归零（内存态），小范围无影响。
