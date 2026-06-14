/**
 * 轻量埋点：把前端上报的事件按行追加到 JSONL 文件（每行一个 JSON 事件），
 * 并提供读取 + 聚合给统计页用。
 *
 * 设计取舍：
 * - JSONL 追加写，零依赖、易备份/导出（一行一事件，可直接 grep/jq）。
 * - 必须跑在有持久磁盘的机器上（ECS/VPS）；serverless 函数计算的临时盘会丢数据。
 * - 聚合时全量读文件，事件量极大时再考虑滚动归档 / 换 SQLite。
 */
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const FILE = process.env.ANALYTICS_FILE
  ? path.resolve(process.env.ANALYTICS_FILE)
  : path.resolve(process.cwd(), 'analytics-events.jsonl');

export interface TrackEventInput {
  ev: string; // 事件名
  vid?: string; // 匿名访客 id（前端生成，存 localStorage）
  sid?: string; // 会话 id（每次打开页面一个）
  path?: string; // 页面路径
  ref?: string; // 来源 referrer
  props?: Record<string, unknown>;
  ts?: number; // 前端事件发生时间（毫秒）
}

interface StoredEvent extends TrackEventInput {
  t: string; // 服务端落库时间 ISO
  ip?: string;
  ua?: string;
}

/** 批量落库：把一组事件补上服务端字段后追加写入。 */
export async function recordEvents(
  events: TrackEventInput[],
  meta: { ip?: string; ua?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const lines = events
    .filter(e => e && typeof e.ev === 'string')
    .map(e => {
      const rec: StoredEvent = {
        t: now,
        ev: e.ev,
        vid: e.vid,
        sid: e.sid,
        path: e.path,
        ref: e.ref,
        props: e.props,
        ts: e.ts,
        ip: meta.ip,
        ua: meta.ua,
      };
      return JSON.stringify(rec);
    });
  if (lines.length === 0) return;
  await appendFile(FILE, lines.join('\n') + '\n', 'utf8');
}

function parseLines(raw: string): StoredEvent[] {
  const out: StoredEvent[] = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      out.push(JSON.parse(s) as StoredEvent);
    } catch {
      /* 跳过损坏行 */
    }
  }
  return out;
}

/** 极简 UA 归类：设备类型 + 浏览器，够统计页展示即可。 */
function deviceOf(ua = ''): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  if (!ua) return '未知';
  return '其它';
}

function host(ref = ''): string {
  if (!ref) return '直接访问';
  try {
    return new URL(ref).hostname || '直接访问';
  } catch {
    return ref.slice(0, 40);
  }
}

// 漏斗步骤定义（顺序即漏斗），与前端上报的事件名对齐。
const FUNNEL: Array<{ ev: string; label: string }> = [
  { ev: 'app_open', label: '打开网站' },
  { ev: 'start_mode', label: '开始测评' },
  { ev: 'submit_answers', label: '提交问卷' },
  { ev: 'view_result', label: '看到结果' },
  { ev: 'captcha_passed', label: '通过验证' },
  { ev: 'view_career', label: '看职业匹配' },
  { ev: 'view_major', label: '看专业匹配' },
  { ev: 'ai_chat', label: '用 AI 对话' },
];

export interface Stats {
  generatedAt: string;
  totalEvents: number;
  uniqueVisitors: number;
  pageViews: number;
  sessions: number;
  eventCounts: Record<string, number>;
  funnel: Array<{ ev: string; label: string; visitors: number; rate: number }>;
  daily: Array<{ day: string; visitors: number; opens: number }>;
  devices: Array<{ name: string; count: number }>;
  referrers: Array<{ name: string; count: number }>;
  recent: Array<{ t: string; ev: string; ip?: string; device: string; ref: string; path?: string }>;
}

/** 读取并聚合全部事件，供统计页展示。文件不存在时返回空统计。 */
export async function computeStats(recentLimit = 100): Promise<Stats> {
  let raw = '';
  try {
    raw = await readFile(FILE, 'utf8');
  } catch {
    raw = '';
  }
  const events = parseLines(raw);

  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const eventCounts: Record<string, number> = {};
  // 漏斗：每步去重访客
  const stepVisitors: Record<string, Set<string>> = {};
  for (const f of FUNNEL) stepVisitors[f.ev] = new Set();
  const dailyMap = new Map<string, { v: Set<string>; opens: number }>();
  const deviceMap = new Map<string, number>();
  const refMap = new Map<string, number>();
  let pageViews = 0;

  for (const e of events) {
    if (e.vid) visitors.add(e.vid);
    if (e.sid) sessions.add(e.sid);
    eventCounts[e.ev] = (eventCounts[e.ev] ?? 0) + 1;
    if (stepVisitors[e.ev] && e.vid) stepVisitors[e.ev].add(e.vid);
    if (e.ev === 'app_open') {
      pageViews += 1;
      const day = (e.t || '').slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { v: new Set(), opens: 0 });
      const d = dailyMap.get(day)!;
      d.opens += 1;
      if (e.vid) d.v.add(e.vid);
      deviceMap.set(deviceOf(e.ua), (deviceMap.get(deviceOf(e.ua)) ?? 0) + 1);
      const h = host(e.ref);
      refMap.set(h, (refMap.get(h) ?? 0) + 1);
    }
  }

  const baseVisitors = stepVisitors['app_open'].size || visitors.size || 1;
  const funnel = FUNNEL.map(f => {
    const v = stepVisitors[f.ev].size;
    return { ev: f.ev, label: f.label, visitors: v, rate: Math.round((v / baseVisitors) * 100) };
  });

  const daily = [...dailyMap.entries()]
    .map(([day, d]) => ({ day, visitors: d.v.size, opens: d.opens }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-30);

  const devices = [...deviceMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const referrers = [...refMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recent = events
    .slice(-recentLimit)
    .reverse()
    .map(e => ({
      t: e.t,
      ev: e.ev,
      ip: e.ip,
      device: deviceOf(e.ua),
      ref: host(e.ref),
      path: e.path,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    uniqueVisitors: visitors.size,
    pageViews,
    sessions: sessions.size,
    eventCounts,
    funnel,
    daily,
    devices,
    referrers,
    recent,
  };
}
