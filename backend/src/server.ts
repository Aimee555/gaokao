// 必须在所有其它模块之前加载 .env：很多 lib/route 在模块顶层就读取 process.env
// （ADMIN_TOKEN、配额、会话配置等），而 ES import 会先于本文件正文执行，
// 用副作用导入 dotenv/config 可确保环境变量在那些模块求值前就绪。
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { chatRoute } from './routes/chat.js';
import { questionnaireRoute } from './routes/questionnaire.js';
import { recommendRoute } from './routes/recommend.js';
import { aiReviewRoute } from './routes/aiReview.js';
import { majorReviewRoute } from './routes/majorReview.js';
import { sessionRoute } from './routes/session.js';
import { analyticsRoute } from './routes/analytics.js';
import { getQuotaStatus } from './lib/quota.js';

// 部署在反向代理 / CDN / 网关之后时需开启，否则 req.ip 拿到的是代理 IP，
// 会导致按 IP 的限流对所有用户共用一个配额（误伤或失效）。
// TRUST_PROXY 支持 true / 数字跳数 / 具体 IP 段；默认 false（本地直连）。
const trustProxyEnv = process.env.TRUST_PROXY;
const trustProxy: boolean | number | string =
  trustProxyEnv === undefined || trustProxyEnv === ''
    ? false
    : trustProxyEnv === 'true'
      ? true
      : /^\d+$/.test(trustProxyEnv)
        ? Number(trustProxyEnv)
        : trustProxyEnv;

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  trustProxy,
  // 限制请求体大小，防止超大 payload 放大 token 消耗 / 内存占用。可用 MAX_BODY_BYTES 调整。
  bodyLimit: Number(process.env.MAX_BODY_BYTES ?? 256 * 1024),
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed'), false);
  },
  // 允许前端携带会话 token 请求头
  allowedHeaders: ['Content-Type', 'X-Session-Token'],
});

app.get('/health', async () => ({ ok: true, ts: Date.now(), quota: getQuotaStatus() }));

await app.register(sessionRoute, { prefix: '/api' });
await app.register(analyticsRoute, { prefix: '/api' });
await app.register(chatRoute, { prefix: '/api' });
await app.register(questionnaireRoute, { prefix: '/api' });
await app.register(recommendRoute, { prefix: '/api' });
await app.register(aiReviewRoute, { prefix: '/api' });
await app.register(majorReviewRoute, { prefix: '/api' });

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
