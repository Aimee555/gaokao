import { Readable } from 'node:stream';
import { consumeDailyQuota, QuotaExceededError } from './quota.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  messages: ChatMessage[];
  stream?: boolean;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

interface NonStreamResult {
  data: unknown;
  body?: never;
}

interface StreamResult {
  data?: never;
  body: Readable;
}

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
// 报告/默认模型：沿用固定的 v4-pro（前端不可篡改，仍由后端写死/环境变量控制）。
const REPORT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
// 复核模型：复核是"在硬约束内做结构化校正"，不需要重推理，改用同系更快的 flash 档大幅降延迟。
// 默认 deepseek-v4-flash（v4 家族快档，账号 /models 已列出，不属于 2026-07-24 退役的 deepseek-chat/reasoner）。
// 可用 DEEPSEEK_REVIEW_MODEL 覆盖。
export const REVIEW_MODEL = process.env.DEEPSEEK_REVIEW_MODEL || 'deepseek-v4-flash';
const MAX_TOKENS = 1000;

export function isDeepSeekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

export async function callDeepSeek(opts: CallOptions): Promise<NonStreamResult | StreamResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  // 全局每日配额：所有 DeepSeek 调用（chat / 职业复核 / 专业复核）都经由此处，
  // 这里是唯一的计费咽喉点。超限即抛错，复核层会 catch 后降级为规则结果，
  // chat 路由会捕获并返回 429。
  if (!consumeDailyQuota()) {
    throw new QuotaExceededError();
  }

  const payload: Record<string, unknown> = {
    model: opts.model ?? REPORT_MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    messages: opts.messages,
    stream: !!opts.stream,
  };
  if (opts.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${text}`);
  }

  if (opts.stream) {
    if (!response.body) throw new Error('DeepSeek stream response has no body');
    return { body: Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]) };
  }

  const data = await response.json();
  return { data };
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
}

/** 修补 LLM 常见的非法 JSON：去 ```json 代码围栏、去对象/数组末尾多余逗号。 */
function repairJson(raw: string): string {
  let s = raw.trim();
  // 去代码围栏
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // 截取首个 { 到末个 }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  // 去末尾多余逗号： ,}  ,]
  s = s.replace(/,(\s*[}\]])/g, '$1');
  return s;
}

/**
 * 以 JSON 模式调用 DeepSeek，提取首个 choice 的 message.content 并防御式解析为对象。
 * 解析失败时先做 repairJson 修补再解析；仍失败则抛错由上层降级为规则结果。
 */
export async function callDeepSeekJSON<T = unknown>(
  messages: ChatMessage[],
  maxTokens = 3000,
  model?: string,
): Promise<T> {
  const result = (await callDeepSeek({ messages, stream: false, maxTokens, jsonMode: true, model })) as {
    data: ChatCompletion;
  };
  const content = result.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('DeepSeek 返回内容为空');
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    try {
      return JSON.parse(repairJson(content)) as T;
    } catch {
      throw new Error('DeepSeek 返回内容无法解析为 JSON');
    }
  }
}
