/**
 * 自包含图形验证码（零依赖）：服务端随机生成 4 字符验证码，渲染成带干扰的 SVG，
 * 前端当图片显示让用户辨认输入。挑战答案只存在服务端内存，TTL 内有效、用后即焚。
 *
 * 作用：在「签发会话 token」前加一道人机校验，挡住脚本批量铸造会话来刷 AI 额度。
 * 不追求工业级强度（MVP 速度门槛即可），需要更强可换 hCaptcha/Turnstile 等。
 *
 * 局限：单进程内存存储，多实例部署需换共享存储或保证单实例。
 */
import { randomBytes, randomUUID } from 'node:crypto';

const CHALLENGE_TTL_MS = Number(process.env.CAPTCHA_TTL_MS ?? 5 * 60_000);
// 去掉易混淆字符（0/O、1/I/L 等）
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

interface Challenge {
  answer: string;
  expiresAt: number;
}
const challenges = new Map<string, Challenge>();

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, c] of challenges) if (c.expiresAt <= now) challenges.delete(id);
}, CHALLENGE_TTL_MS);
sweepTimer.unref?.();

function randomCode(): string {
  const bytes = randomBytes(CODE_LEN);
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/** 0..1 的伪随机数（仅用于验证码视觉抖动，非安全敏感）。 */
function rand(): number {
  return randomBytes(1)[0] / 255;
}

function renderSvg(code: string): string {
  const w = 120;
  const h = 44;
  const colors = ['#1f6feb', '#d29922', '#3fb950', '#a371f7', '#db61a2'];
  const chars = code
    .split('')
    .map((ch, i) => {
      const x = 12 + i * 26 + rand() * 6;
      const y = 30 + (rand() - 0.5) * 8;
      const rot = (rand() - 0.5) * 40;
      const color = colors[Math.floor(rand() * colors.length)];
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="26" font-family="monospace" font-weight="700" fill="${color}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${ch}</text>`;
    })
    .join('');
  // 干扰线
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = (rand() * w).toFixed(1);
    const y1 = (rand() * h).toFixed(1);
    const x2 = (rand() * w).toFixed(1);
    const y2 = (rand() * h).toFixed(1);
    const color = colors[Math.floor(rand() * colors.length)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-opacity="0.35" stroke-width="1.5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="6" fill="#f6f8fa"/>${lines}${chars}</svg>`;
}

/** 生成一个新验证码挑战，返回挑战 id 与可直接 <img> 显示的 SVG。 */
export function createCaptcha(): { challengeId: string; svg: string } {
  const code = randomCode();
  const challengeId = randomUUID();
  challenges.set(challengeId, { answer: code, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return { challengeId, svg: renderSvg(code) };
}

/** 校验答案；无论对错都消耗该挑战（用后即焚，防暴力重试同一图）。 */
export function verifyCaptcha(challengeId: string, answer: string): boolean {
  const c = challenges.get(challengeId);
  if (!c) return false;
  challenges.delete(challengeId);
  if (c.expiresAt <= Date.now()) return false;
  return typeof answer === 'string' && answer.trim().toUpperCase() === c.answer;
}
