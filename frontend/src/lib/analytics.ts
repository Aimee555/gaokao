/**
 * 前端埋点客户端：在关键节点调用 track(事件名)，事件先入队，再批量 POST 到 /api/track。
 * - 匿名访客 id 存 localStorage（区分独立访客 UV），不含任何个人身份信息。
 * - 会话 id 每次打开页面随机生成（区分会话）。
 * - 通过 setTimeout 合并发送；页面隐藏/关闭时用 sendBeacon 兜底，避免漏报。
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';
const VID_KEY = 'gaokao_visitor_id';

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

const visitorId = getVisitorId();
const sessionId = uid();

interface QueuedEvent {
  ev: string;
  vid: string;
  sid: string;
  path: string;
  ref: string;
  props?: Record<string, unknown>;
  ts: number;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush(useBeacon = false): void {
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const url = `${API_BASE}/track`;
  const body = JSON.stringify({ events });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        /* 埋点失败静默，不打扰用户 */
      });
    }
  } catch {
    /* ignore */
  }
}

/** 记录一个事件。props 里可带上下文（如 mode、step）。 */
export function track(ev: string, props?: Record<string, unknown>): void {
  queue.push({
    ev,
    vid: visitorId,
    sid: sessionId,
    path: location.pathname + location.search,
    ref: document.referrer,
    props,
    ts: Date.now(),
  });
  if (!timer) timer = setTimeout(() => flush(false), 2000);
  if (queue.length >= 10) flush(false);
}

// 页面隐藏/卸载时把剩余事件用 beacon 发出，避免漏报。
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}
