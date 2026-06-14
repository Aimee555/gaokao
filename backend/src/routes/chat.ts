import type { FastifyInstance } from 'fastify';
import { callDeepSeek, type ChatMessage } from '../lib/deepseek.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { QuotaExceededError } from '../lib/quota.js';
import { requireSession } from '../lib/session.js';

interface ChatBody {
  messages: ChatMessage[];
  stream?: boolean;
}

export async function chatRoute(app: FastifyInstance) {
  app.post<{ Body: ChatBody }>('/chat', async (req, reply) => {
    if (!checkRateLimit(req.ip)) {
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });
    }
    if (!requireSession(req, reply)) return;

    const body = req.body ?? ({} as ChatBody);
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return reply.code(400).send({ error: 'messages 字段必填，且需为非空数组' });
    }

    try {
      if (body.stream) {
        const upstream = await callDeepSeek({ messages: body.messages, stream: true });
        reply.header('Content-Type', 'text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');
        return reply.send(upstream.body);
      }
      const result = await callDeepSeek({ messages: body.messages, stream: false });
      return result.data;
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return reply.code(429).send({ error: '今日 AI 名额已用完，请明天再来试试' });
      }
      app.log.error({ err }, 'DeepSeek call failed');
      return reply.code(502).send({ error: 'AI 暂时繁忙，请稍后重试' });
    }
  });
}
