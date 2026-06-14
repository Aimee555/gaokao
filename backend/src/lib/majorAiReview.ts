import { callDeepSeekJSON, isDeepSeekConfigured, REVIEW_MODEL, type ChatMessage } from './deepseek.js';
import type {
  AiAction,
  FollowupQuestion,
  MajorDivergence,
  MajorMatcherResult,
  MajorReviewResult,
  MatchedMajor,
  ProfileTags,
  ReviewedMajor,
} from '../types.js';

const ACTION_ADJUSTMENT: Record<AiAction, number> = {
  keep: 0,
  warn_only: 0,
  upgrade_display: 3,
  downgrade_display: -8,
  remove_from_display: -30,
};
const VALID_ACTIONS = new Set<AiAction>(['keep', 'warn_only', 'upgrade_display', 'downgrade_display', 'remove_from_display']);

interface RawMajorReview {
  major_id?: unknown;
  ai_action?: unknown;
  ai_reason?: unknown;
  user_facing_explanation?: unknown;
  risk_warning?: unknown;
}
export interface RawAiReview {
  overall_judgment?: unknown;
  need_followup?: unknown;
  followup_questions?: unknown;
  major_reviews?: unknown;
}

function bucketLevel(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}
function asString(v: unknown, fb = ''): string {
  return typeof v === 'string' ? v : fb;
}
function normalizeAction(v: unknown): AiAction {
  return typeof v === 'string' && VALID_ACTIONS.has(v as AiAction) ? (v as AiAction) : 'keep';
}

/**
 * 纯函数：把 AI 复核套用到专业规则结果(A/B/C 合并)。护栏：
 *  - 只认候选集内 major_id，越界丢弃；动作钳到允许集；调整只作用 display_score，不改 rule_score；
 *  - 绝不修改选科硬门槛/不可报考桶（AI 不得让选科不符专业进主推）；
 *  - remove_from_display 仅移出主推展示。
 */
export function applyMajorReview(
  major: MajorMatcherResult,
  raw: RawAiReview,
  model: string,
): MajorReviewResult {
  const guardrailNotes: string[] = [];
  const mainList: MatchedMajor[] = [
    ...major.strong_recommend_majors,
    ...major.consider_majors,
    ...major.cautious_majors,
  ];
  const byId = new Map(mainList.map(m => [m.major_id, m]));
  const candidateIds = new Set(byId.keys());

  const reviewMap = new Map<string, RawMajorReview>();
  const rawReviews = Array.isArray(raw.major_reviews) ? (raw.major_reviews as RawMajorReview[]) : [];
  for (const r of rawReviews) {
    const id = asString(r.major_id);
    if (!id) continue;
    if (!candidateIds.has(id)) {
      guardrailNotes.push(`丢弃越界 major_id（不在候选集，可能含选科不符/AI臆造）：${id}`);
      continue;
    }
    if (typeof r.ai_action === 'string' && !VALID_ACTIONS.has(r.ai_action as AiAction)) {
      guardrailNotes.push(`未知 ai_action「${r.ai_action}」按 keep 处理：${id}`);
    }
    reviewMap.set(id, r);
  }

  const kept: ReviewedMajor[] = [];
  const removed: ReviewedMajor[] = [];
  for (const m of mainList) {
    const r = reviewMap.get(m.major_id);
    const action = r ? normalizeAction(r.ai_action) : 'keep';
    const displayScore = Math.max(0, Math.min(100, m.score + ACTION_ADJUSTMENT[action]));
    const reviewed: ReviewedMajor = {
      ...m,
      display_score: displayScore,
      display_level: bucketLevel(displayScore),
      ai_action: action,
      ai_reason: asString(r?.ai_reason),
      user_facing_explanation: asString(r?.user_facing_explanation),
      risk_warning: asString(r?.risk_warning),
    };
    if (action === 'remove_from_display') removed.push(reviewed);
    else kept.push(reviewed);
  }

  kept.sort((a, b) => b.display_score - a.display_score || b.score - a.score);
  kept.forEach((m, i) => { m.rank = i + 1; });

  const divergences: MajorDivergence[] = [];
  for (const m of [...kept, ...removed]) {
    if (m.ai_action !== 'keep' || m.display_level !== m.level) {
      divergences.push({
        major_id: m.major_id,
        major_name: m.major_name,
        rule_level: m.level,
        rule_score: m.score,
        ai_action: m.ai_action,
        display_level: m.display_level,
        display_score: m.display_score,
        ai_reason: m.ai_reason || '(AI 未给出理由)',
      });
    }
  }

  const needFollowup = raw.need_followup === true;
  const rawF = Array.isArray(raw.followup_questions) ? raw.followup_questions : [];
  const aiFollowups: FollowupQuestion[] = needFollowup
    ? rawF
        .map((q: unknown) => {
          const o = (q ?? {}) as Record<string, unknown>;
          return {
            trigger_code: asString(o.trigger_code, 'ai_followup'),
            question: asString(o.question),
            purpose: asString(o.purpose),
            options: [], // AI 自由追问无确定性 tag_effects，仅澄清展示
          };
        })
        .filter(q => q.question)
    : [];
  const merged: FollowupQuestion[] = [...major.followup_questions];
  for (const f of aiFollowups) if (!merged.some(m => m.question === f.question)) merged.push(f);

  return {
    available: true,
    model,
    overall_judgment: asString(raw.overall_judgment),
    need_followup: needFollowup || merged.length > 0,
    followup_questions: merged,
    reviewed_majors: kept,
    divergences,
    guardrail_notes: guardrailNotes,
  };
}

export function fallbackMajorReview(major: MajorMatcherResult, reason: string): MajorReviewResult {
  const mainList: MatchedMajor[] = [
    ...major.strong_recommend_majors,
    ...major.consider_majors,
    ...major.cautious_majors,
  ];
  const reviewed: ReviewedMajor[] = mainList.map(m => ({
    ...m,
    display_score: m.score,
    display_level: m.level,
    ai_action: 'keep',
    ai_reason: '',
    user_facing_explanation: '',
    risk_warning: '',
  }));
  return {
    available: false,
    model: 'none',
    overall_judgment: reason,
    need_followup: major.followup_required,
    followup_questions: major.followup_questions,
    reviewed_majors: reviewed,
    divergences: [],
    guardrail_notes: [reason],
  };
}

function nonZeroTags(profile: ProfileTags): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [group, tags] of Object.entries(profile)) {
    const kept: Record<string, number | boolean> = {};
    for (const [tag, v] of Object.entries(tags as Record<string, number | boolean>)) {
      if (v === 0 || v === false) continue;
      kept[tag] = v;
    }
    if (Object.keys(kept).length) out[group] = kept;
  }
  return out;
}

function buildMessages(
  profile: ProfileTags,
  profileType: string,
  profileSummary: string,
  major: MajorMatcherResult,
): ChatMessage[] {
  const system = [
    '你是高考志愿推荐系统的专业推荐复核员。规则引擎已基于专业库+选科硬门槛给出确定性 A/B/C 梯队，你只做复核与展示校正，不重新发明。',
    '硬性约束（必须遵守）：',
    '1. 只能在我给你的候选专业(major_id)范围内操作，绝不新增候选集外或选科不符的专业。',
    '2. 绝不让选科不符的专业进入主推（选科硬门槛不可覆盖）。',
    '3. 不得编造就业率、薪资、岗位数量；不得把2025新增专业包装成确定高就业。',
    '4. 不直接改 rule_score；只能对每个专业给 ai_action（keep/upgrade_display/downgrade_display/warn_only/remove_from_display）。',
    '5. 不推荐用户明确排斥方向的专业。',
    '可做：识别专业结果与用户目标的冲突、给展示校正与人话解释、确有关键缺口/冲突时提 2-3 个追问。',
    '只输出一个 JSON 对象：{ "overall_judgment": string, "need_followup": boolean, "followup_questions": [{"trigger_code": string, "question": string, "purpose": string}], "major_reviews": [{"major_id": string, "ai_action": string, "ai_reason": string, "user_facing_explanation": string, "risk_warning": string}] }',
  ].join('\n');

  // 只送 A+B 给 AI 复核（主推荐，最值得重排）；C 档由规则保留。
  // 精简每条字段以控输出体量，避免大 prompt 导致 JSON 截断/畸形。
  const compact = (m: MatchedMajor) => ({
    major_id: m.major_id,
    major_name: m.major_name,
    rule_level: m.level,
    rule_score: m.score,
    major_class: m.major_class,
    is_new_major: m.is_new_major,
    matched_careers: m.matched_careers.map(c => c.career_name),
    why_recommended: m.why_recommended,
  });

  const payload = {
    profile_type: profileType,
    profile_summary: profileSummary,
    profile_tags: nonZeroTags(profile),
    source_careers: major.source_careers.map(c => ({ career_name: c.career_name, rank: c.career_rank })),
    strong_recommend_majors: major.strong_recommend_majors.map(compact),
    consider_majors: major.consider_majors.map(compact),
    instruction: '复核 A/B 梯队是否合理（职业相关性优先、选科已硬过滤、新增专业不应轻易压过成熟专业）；可在候选集内重排/降级/移出展示。只对需要改动的专业给出 ai_action，无需逐条复述 keep。只有当存在你无法判断的关键缺口或强冲突时，才把 need_followup 设为 true 并给追问。',
  };

  return [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

export async function reviewMajors(
  profile: ProfileTags,
  profileType: string,
  profileSummary: string,
  major: MajorMatcherResult,
): Promise<MajorReviewResult> {
  if (!isDeepSeekConfigured()) {
    return fallbackMajorReview(major, 'AI 复核未启用（未配置 DEEPSEEK_API_KEY），返回规则结果。');
  }
  const hasMain =
    major.strong_recommend_majors.length + major.consider_majors.length + major.cautious_majors.length > 0;
  if (!hasMain) return fallbackMajorReview(major, '无可复核的专业候选，返回规则结果。');
  try {
    const raw = await callDeepSeekJSON<RawAiReview>(buildMessages(profile, profileType, profileSummary, major), 5000, REVIEW_MODEL);
    return applyMajorReview(major, raw, REVIEW_MODEL);
  } catch (err) {
    return fallbackMajorReview(major, `AI 复核调用失败，已降级为规则结果：${(err as Error).message}`);
  }
}
