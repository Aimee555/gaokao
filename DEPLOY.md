# 部署指南（ECS / 轻量应用服务器 + Caddy + HTTPS）

本项目用了**文件埋点（JSONL）**和**内存态的会话/限流/配额**，因此需要部署在
**一台有持久磁盘、单实例常驻**的云主机上（阿里云轻量应用服务器 / ECS / 任意 VPS）。
> ⚠️ 不要部署到 serverless 函数计算：临时盘会丢埋点数据，多实例会让限流/配额失效。

采用**同源反向代理**架构：Caddy 在同一台机器上托管前端静态文件，并把 `/api/*`
反代到本机后端。前端与接口同域名 → 无 CORS、无混合内容、一个域名一张证书。

```
用户 ──HTTPS──→ Caddy(:443) ──┬─ 静态前端 dist/
                              └─ /api/* → 127.0.0.1:8787 (后端 Node，持有 DeepSeek key)
```

## 前置条件
- 一台云主机（Ubuntu/Debian 为例），公网 IP
- 一个**已完成 ICP 备案**的域名，A 记录指向该公网 IP（国内云用 80/443 必须备案）
- 安全组放行 **80、443**；**不要**对公网放行 8787（后端只绑本机）
- 已安装 Node.js 20+、Caddy 2

## 一、拉代码 + 构建

```bash
sudo mkdir -p /var/www/gaokao && sudo chown -R $USER /var/www/gaokao
# 把项目代码放到 /var/www/gaokao（git clone 或 scp 上传）

# 后端
cd /var/www/gaokao/backend
npm ci
npm run build                      # 产出 dist/

# 前端（同源部署，无需配 VITE_API_BASE，默认走 /api）
cd /var/www/gaokao/frontend
npm ci
npm run build                      # 产出 dist/
```

## 二、配置后端环境变量

```bash
cd /var/www/gaokao/backend
cp .env.example .env
# 编辑 .env，至少设置：
#   DEEPSEEK_API_KEY=sk-xxx        必填
#   ADMIN_TOKEN=<强口令>            统计页口令，务必改掉示例值
#   TRUST_PROXY=true               关键！后端在 Caddy 之后，否则限流按代理 IP 算会失效
#   DEEPSEEK_DAILY_LIMIT=500       每日 AI 调用上限，按预算调整
#   REQUIRE_SESSION=true           保持开启（验证码+会话防刷）
# 同源部署下 ALLOWED_ORIGINS 可不管（不会触发跨域）。
```

## 三、后端常驻（systemd）

```bash
sudo cp deploy/gaokao-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gaokao-backend
sudo systemctl status gaokao-backend          # active (running) 即正常
curl -s http://127.0.0.1:8787/health          # {"ok":true,...}
```

## 四、Caddy（前端 + 反代 + 自动 HTTPS）

```bash
sudo mkdir -p /var/log/caddy
# 编辑 deploy/Caddyfile：把 your-domain.com 改成你的域名，确认 root 指向前端 dist
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy 会自动向 Let's Encrypt 申请证书并续期。几秒后访问
`https://your-domain.com` 即可看到应用，`https://your-domain.com/api/stats/dashboard`
输入 `ADMIN_TOKEN` 看访问统计。

## 五、上线后检查清单
- [ ] DeepSeek 控制台已设**账户消费上限 + 余额告警**（最重要的防刷钱硬保险）
- [ ] `ADMIN_TOKEN` 已改成强口令
- [ ] `TRUST_PROXY=true` 已设（在反代之后）
- [ ] 8787 未对公网开放，只走 Caddy
- [ ] 走一遍完整流程：测评→验证码→职业→专业→AI 对话，确认 AI 正常
- [ ] 统计看板能看到刚才的访问漏斗

## 更新发布
```bash
cd /var/www/gaokao && git pull
cd backend && npm ci && npm run build && sudo systemctl restart gaokao-backend
cd ../frontend && npm ci && npm run build       # 静态文件即时生效，无需重启 Caddy
```

## 数据备份
埋点数据在 `backend/analytics-events.jsonl`，直接定期 `cp`/`rsync` 备份即可。
