/**
 * 全局每日配额：对「真实落到 DeepSeek 的调用次数」做一个当天硬上限。
 *
 * 限流（rateLimit.ts）只防单个 IP 在短时间内打太快；配额则防「很多人/换 IP 慢刷」
 * 在一天内把账户额度耗光。两者互补：限流防「快」，配额防「多」。
 *
 * 注意：与 rateLimit 一样，这是单进程内存计数。多实例部署时各实例各算各的，
 * 想要真正的全局上限需换 Redis 等共享存储，或保证后端单实例运行。
 * 它仍是 DeepSeek 账户侧「消费上限」之外的应用层兜底，不能取代账户硬上限。
 */

// 每天最多放行多少次 DeepSeek 调用；<=0 表示不限制（关闭该保护）。
const DAILY_LIMIT = Number(process.env.DEEPSEEK_DAILY_LIMIT ?? 500);

let dayKey = '';
let usedToday = 0;

/** 取当前本地日期 yyyy-mm-dd 作为计数窗口键。 */
function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollover(): void {
  const today = currentDayKey();
  if (today !== dayKey) {
    dayKey = today;
    usedToday = 0;
  }
}

/** 抛出此错误表示当天配额已耗尽；上层据此降级（复核走规则、chat 返回 429）。 */
export class QuotaExceededError extends Error {
  constructor(message = '今日 AI 调用已达上限') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * 消费一次配额：未超限则计数 +1 并返回 true；已达上限返回 false（不再累加）。
 * DAILY_LIMIT<=0 时恒为 true（不限制）。
 */
export function consumeDailyQuota(): boolean {
  if (DAILY_LIMIT <= 0) return true;
  rollover();
  if (usedToday >= DAILY_LIMIT) return false;
  usedToday += 1;
  return true;
}

/** 供 /health 等监控读取当前配额用量。 */
export function getQuotaStatus(): { used: number; limit: number; day: string; enabled: boolean } {
  rollover();
  return { used: usedToday, limit: DAILY_LIMIT, day: dayKey, enabled: DAILY_LIMIT > 0 };
}
