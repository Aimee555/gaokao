import type { FastifyInstance } from 'fastify';
import { createCaptcha, verifyCaptcha } from '../lib/captcha.js';
import { issueSession, isSessionRequired } from '../lib/session.js';
import { checkRateLimit } from '../lib/rateLimit.js';

interface SessionBody {
  challengeId?: string;
  answer?: string;
}

export async function sessionRoute(app: FastifyInstance) {
  // 取一张新验证码（前端 <img> 直接显示 svg）。
  app.get('/captcha', async (req, reply) => {
    if (!checkRateLimit(req.ip)) {
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });
    }
    return createCaptcha();
  });

  // 提交验证码答案换取会话 token。
  app.post<{ Body: SessionBody }>('/session', async (req, reply) => {
    if (!checkRateLimit(req.ip)) {
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });
    }
    // 未开启会话门槛时也照常签发，便于前端逻辑统一。
    if (!isSessionRequired()) {
      return issueSession();
    }
    const { challengeId, answer } = req.body ?? {};
    if (!challengeId || typeof answer !== 'string') {
      return reply.code(400).send({ error: 'challengeId 与 answer 必填' });
    }
    if (!verifyCaptcha(challengeId, answer)) {
      return reply.code(400).send({ error: '验证码错误或已过期，请重试', captcha: 'failed' });
    }
    return issueSession();
  });
}
