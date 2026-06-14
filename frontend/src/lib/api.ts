import type {
  AiReviewResponse,
  ChatMessage,
  FollowupAnswer,
  MajorReviewResponse,
  Questionnaire,
  QuestionnaireMode,
  RawAnswer,
  RecommendResponse,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: string;
}

// ── 会话 token（人机验证后获取，调用 AI 端点必带）────────────────────────────
const TOKEN_KEY = 'gaokao_session_token';

/** 会话失效/未通过验证时抛出，UI 据此重新弹验证码。 */
export class SessionError extends Error {
  constructor(message = '会话无效或已过期，请重新验证') {
    super(message);
    this.name = 'SessionError';
  }
}

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return !!getSessionToken();
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function setSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

/** 取一张图形验证码。 */
export async function fetchCaptcha(): Promise<{ challengeId: string; svg: string }> {
  const res = await fetch(`${API_BASE}/captcha`);
  if (!res.ok) throw new Error(`验证码加载失败: ${await asError(res)}`);
  return res.json();
}

/** 提交验证码答案换取会话 token，成功后本地保存。失败抛错（错误信息可展示给用户）。 */
export async function createSession(challengeId: string, answer: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, answer }),
  });
  if (!res.ok) throw new Error(await asError(res));
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('会话创建失败');
  setSessionToken(data.token);
}

/** 调用 AI 端点用的请求头：JSON + 会话 token。 */
function aiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getSessionToken();
  if (token) headers['X-Session-Token'] = token;
  return headers;
}

/** AI 端点统一的响应处理：401 视为会话失效，清除本地 token 并抛 SessionError。 */
async function handleAiResponse(res: Response, label: string): Promise<void> {
  if (res.status === 401) {
    clearSession();
    throw new SessionError(await asError(res));
  }
  if (!res.ok) throw new Error(`${label}: ${await asError(res)}`);
}

async function asError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return (data as { error?: string }).error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ messages }),
  });
  await handleAiResponse(res, 'AI 服务');
  const data: ChatResponse = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function fetchQuestionnaire(mode: QuestionnaireMode): Promise<Questionnaire> {
  const res = await fetch(`${API_BASE}/questionnaire/${mode}`);
  if (!res.ok) throw new Error(`问卷加载失败: ${await asError(res)}`);
  return res.json();
}

export async function postRecommend(
  mode: QuestionnaireMode,
  answers: RawAnswer[],
): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, answers }),
  });
  if (!res.ok) throw new Error(`推荐计算失败: ${await asError(res)}`);
  return res.json();
}

export async function postAiReview(
  mode: QuestionnaireMode,
  answers: RawAnswer[],
  followupAnswers: FollowupAnswer[] = [],
): Promise<AiReviewResponse> {
  const res = await fetch(`${API_BASE}/ai-review`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ mode, answers, followup_answers: followupAnswers }),
  });
  await handleAiResponse(res, '职业复核失败');
  return res.json();
}

export async function postMajorReview(
  mode: QuestionnaireMode,
  answers: RawAnswer[],
  followupAnswers: FollowupAnswer[] = [],
): Promise<MajorReviewResponse> {
  const res = await fetch(`${API_BASE}/major-review`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ mode, answers, followup_answers: followupAnswers }),
  });
  await handleAiResponse(res, '专业复核失败');
  return res.json();
}
