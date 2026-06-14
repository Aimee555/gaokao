/**
 * 会话 token：通过验证码后签发，绑定 AI 调用配额与有效期。
 *
 * 作用：把「能调用 AI 端点」与「走过人机校验拿到的会话」绑定，防止有人跳过前端流程
 * 直接脚本狂刷 /api/chat 等。每个会话有调用次数预算（SESSION_MAX_CALLS）和过期时间
 * （SESSION_TTL_MS），耗尽或过期后需重新做验证码。
 *
 * 与其它防线的分工：验证码挡「批量铸造会话」，会话预算挡「单会话内滥用」，
 * IP 限流挡「单 IP 打太快」，每日配额挡「全站总量被刷爆」。四层叠加。
 *
 * 局限：单进程内存存储，多实例需换共享存储或保证单实例。
 */
import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const TTL_MS = Number(process.env.SESSION_TTL_MS ?? 2 * 60 * 60_000); // 默认 2 小时
const MAX_CALLS = Number(process.env.SESSION_MAX_CALLS ?? 40); // 单会话累计 AI 端点调用上限
// 是否强制要求会话；生产默认开启，本地调试可设 false 关闭整套验证码+会话门槛。
const REQUIRED = (process.env.REQUIRE_SESSION ?? 'true') !== 'false';

interface Session {
  expiresAt: number;
  callsUsed: number;
  maxCalls: number;
}
const sessions = new Map<string, Session>();

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [t, s] of sessions) if (s.expiresAt <= now) sessions.delete(t);
}, 10 * 60_000);
sweepTimer.unref?.();

export function isSessionRequired(): boolean {
  return REQUIRED;
}

/** 签发一个新会话 token。 */
export function issueSession(): { token: string; expiresAt: number; maxCalls: number } {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + TTL_MS;
  sessions.set(token, { expiresAt, callsUsed: 0, maxCalls: MAX_CALLS });
  return { token, expiresAt, maxCalls: MAX_CALLS };
}

type ConsumeResult =
  | { ok: true }
  | { ok: false; code: 'missing' | 'invalid' | 'expired' | 'exhausted' };

/** 校验并消耗一次会话配额。REQUIRE_SESSION=false 时恒放行。 */
export function consumeSession(token: string | undefined): ConsumeResult {
  if (!REQUIRED) return { ok: true };
  if (!token) return { ok: false, code: 'missing' };
  const s = sessions.get(token);
  if (!s) return { ok: false, code: 'invalid' };
  if (s.expiresAt <= Date.now()) {
    sessions.delete(token);
    return { ok: false, code: 'expired' };
  }
  if (s.callsUsed >= s.maxCalls) return { ok: false, code: 'exhausted' };
  s.callsUsed += 1;
  return { ok: true };
}

/**
 * 路由守卫：校验请求头 x-session-token 并消耗一次配额。
 * 失败时直接写回 401 并返回 false；调用方应在 false 时 return。
 */
export function requireSession(req: FastifyRequest, reply: FastifyReply): boolean {
  const token = req.headers['x-session-token'];
  const res = consumeSession(typeof token === 'string' ? token : undefined);
  if (res.ok) return true;
  const msg =
    res.code === 'exhausted'
      ? '本次会话的 AI 使用次数已用完，请刷新页面重新验证'
      : '会话无效或已过期，请刷新页面重新验证';
  reply.code(401).send({ error: msg, session: res.code });
  return false;
}
