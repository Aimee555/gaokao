/**
 * 内存滑动窗口限流：防止单个 IP 短时间内打太快，并附带一个跨所有 IP 的全局突发上限。
 *
 * 可用环境变量调整（均有默认值，不配即用默认）：
 *   RATE_LIMIT_WINDOW_MS   滑动窗口毫秒数（默认 60000）
 *   RATE_LIMIT_MAX_PER_IP  单 IP 每窗口最大请求数（默认 10）
 *   RATE_LIMIT_MAX_GLOBAL  所有 IP 合计每窗口最大请求数，<=0 关闭（默认 0=关闭）
 *
 * 局限：单进程内存计数。多实例部署时各实例独立计数，且 req.ip 必须经
 * server.ts 的 trustProxy 正确解析出真实客户端 IP，否则可能误伤或失效。
 * 想要真正的分布式限流需换 Redis 等共享存储，或保证后端单实例运行。
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_MAX_PER_IP ?? 10);
const MAX_GLOBAL = Number(process.env.RATE_LIMIT_MAX_GLOBAL ?? 0);

const hits = new Map<string, number[]>();
const globalHits: number[] = [];

/** 周期性清理过期的 IP 记录，避免 Map 随访问 IP 数无限增长。 */
const sweepTimer = setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, times] of hits) {
    const recent = times.filter(t => t > cutoff);
    if (recent.length === 0) hits.delete(ip);
    else hits.set(ip, recent);
  }
}, WINDOW_MS);
// 不要因为这个定时器阻止进程正常退出。
sweepTimer.unref?.();

/** 返回 true 表示放行；false 表示触发限流（调用方应回 429）。 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // 全局突发上限（先判，超了直接挡，避免被海量不同 IP 打爆）
  if (MAX_GLOBAL > 0) {
    while (globalHits.length && globalHits[0] <= cutoff) globalHits.shift();
    if (globalHits.length >= MAX_GLOBAL) return false;
  }

  // 单 IP 窗口限流
  const recent = (hits.get(ip) ?? []).filter(t => t > cutoff);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }

  recent.push(now);
  hits.set(ip, recent);
  if (MAX_GLOBAL > 0) globalHits.push(now);
  return true;
}
