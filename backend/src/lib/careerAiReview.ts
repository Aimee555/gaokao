import { callDeepSeekJSON, isDeepSeekConfigured, REVIEW_MODEL, type ChatMessage } from './deepseek.js';
import type {
  AiAction,
  AiReviewResult,
  BackupCareer,
  CareerDivergence,
  CareerMatcherResult,
  FollowupQuestion,
  MatchedCareer,
  MatchedIndustry,
  ProfileTags,
  ReviewedCareer,
} from '../types.js';

// allowed_ai_actions：AI 只能在候选集内做展示层调整，不改 rule_score，不编数据。
const ACTION_ADJUSTMENT: Record<AiAction, number> = {
  keep: 0,
  warn_only: 0,
  upgrade_display: 3,
  downgrade_display: -8,
  remove_from_display: -30,
};

const VALID_ACTIONS = new Set<AiAction>([
  'keep',
  'warn_only',
  'upgrade_display',
  'downgrade_display',
  'remove_from_display',
]);

const MAIN_TOP_N = 5;

interface RawCareerReview {
  career_id?: unknown;
  ai_action?: unknown;
  suggested_display_level?: unknown;
  ai_reason?: unknown;
  user_facing_explanation?: unknown;
  risk_warning?: unknown;
}

export interface RawAiReview {
  overall_judgment?: unknown;
  need_followup?: unknown;
  followup_questions?: unknown;
  career_reviews?: unknown;
}

function bucketLevel(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeAction(v: unknown): AiAction {
  return typeof v === 'string' && VALID_ACTIONS.has(v as AiAction) ? (v as AiAction) : 'keep';
}

/**
 * 纯函数：把（已校验来源的）AI 复核输出套用到职业规则结果上。
 * 强制护栏：
 *  - 只认候选集内（recommended ∪ backup ∪ deep_study）的 career_id，越界一律丢弃；
 *  - ai_action 钳到允许集合，分数调整只用 ACTION_ADJUSTMENT，不接受 AI 自报分；
 *  - 调整作用于 display_score（独立于 rule 的 score 字段），不改 rule_score；
 *  - remove_from_display 仅移出主推到备选，不从数据中删除。
 */
export function applyReview(
  career: CareerMatcherResult,
  raw: RawAiReview,
  model: string,
): AiReviewResult {
  const guardrailNotes: string[] = [];

  // 候选集：主推职业带 rule_rank，其余（备选/深造）rule_rank=null
  const byId = new Map<string, { ref: MatchedCareer; ruleRank: number | null }>();
  career.recommended_careers.forEach(c => byId.set(c.career_id, { ref: c, ruleRank: c.rank }));
  // 备选/深造在 MatchedCareer 之外只有精简字段，无法重排进主列表的完整展示——
  // 因此可被 AI 升档的对象限定为 recommended_careers（已带完整字段）。备选保持原样。
  const candidateIds = new Set(byId.keys());

  // 解析 career_reviews，过滤越界
  const reviewMap = new Map<string, RawCareerReview>();
  const rawReviews = Array.isArray(raw.career_reviews) ? (raw.career_reviews as RawCareerReview[]) : [];
  for (const r of rawReviews) {
    const id = asString(r.career_id);
    if (!id) continue;
    if (!candidateIds.has(id)) {
      guardrailNotes.push(`丢弃越界 career_id（不在候选集）：${id}`);
      continue;
    }
    const action = normalizeAction(r.ai_action);
    if (typeof r.ai_action === 'string' && !VALID_ACTIONS.has(r.ai_action as AiAction)) {
      guardrailNotes.push(`未知 ai_action「${r.ai_action}」已按 keep 处理：${id}`);
    }
    reviewMap.set(id, r);
  }

  const removed: ReviewedCareer[] = [];
  const kept: ReviewedCareer[] = [];

  for (const c of career.recommended_careers) {
    const r = reviewMap.get(c.career_id);
    const action = r ? normalizeAction(r.ai_action) : 'keep';
    const adj = ACTION_ADJUSTMENT[action];
    const displayScore = Math.max(0, Math.min(100, c.score + adj));
    // 展示档一律由(已含AI调整的)display_score推导，避免AI给的level与分数自相矛盾
    // （AI的重排话语权通过动作调整体现在分数上，不靠它另报一个档位）。
    const displayLevel = bucketLevel(displayScore);

    const reviewed: ReviewedCareer = {
      ...c,
      display_score: displayScore,
      display_level: displayLevel,
      ai_action: action,
      ai_reason: asString(r?.ai_reason),
      user_facing_explanation: asString(r?.user_facing_explanation),
      risk_warning: asString(r?.risk_warning),
    };
    if (action === 'remove_from_display') removed.push(reviewed);
    else kept.push(reviewed);
  }

  // 按 display_score 重排（display 层，rule 的 score 字段原样保留在 reviewed.score）
  kept.sort((a, b) => b.display_score - a.display_score || b.score - a.score);
  kept.forEach((c, i) => { c.rank = i + 1; });

  const reviewedCareers = kept.slice(0, MAIN_TOP_N);
  const overflow = kept.slice(MAIN_TOP_N);

  const movedToBackup: BackupCareer[] = [
    ...removed.map(c => ({
      career_id: c.career_id,
      career_name: c.career_name,
      reason: c.ai_reason || 'AI 复核后移出主推',
    })),
    ...overflow.map(c => ({
      career_id: c.career_id,
      career_name: c.career_name,
      reason: c.ai_reason || `复核后排序靠后（展示分 ${c.display_score}）`,
    })),
  ];

  // 分歧表：只记录 AI 的"主动"判断差异（动作非keep，或展示档与规则档不同），
  // 不记因邻居增删导致的排名漂移——那是连带效应，不是 AI 对该职业的不同判断。
  const divergences: CareerDivergence[] = [];
  for (const c of [...reviewedCareers, ...removed, ...overflow]) {
    const orig = byId.get(c.career_id);
    const ruleRank = orig?.ruleRank ?? null;
    if (c.ai_action !== 'keep' || c.display_level !== c.level) {
      divergences.push({
        career_id: c.career_id,
        career_name: c.career_name,
        rule_rank: ruleRank,
        rule_score: c.score,
        rule_level: c.level,
        ai_action: c.ai_action,
        display_level: c.display_level,
        display_score: c.display_score,
        ai_reason: c.ai_reason || '(AI 未给出理由)',
      });
    }
  }

  // followup：AI 判定需要时才透出（先非交互复核，仅遇缺口/分歧才反问）
  const needFollowup = raw.need_followup === true;
  const rawFollowups = Array.isArray(raw.followup_questions) ? raw.followup_questions : [];
  const aiFollowups: FollowupQuestion[] = needFollowup
    ? rawFollowups
        .map((q: unknown) => {
          const obj = (q ?? {}) as Record<string, unknown>;
          return {
            trigger_code: asString(obj.trigger_code, 'ai_followup'),
            question: asString(obj.question),
            purpose: asString(obj.purpose),
            // AI 自由提的追问没有确定性 tag_effects 映射，options 留空：
            // 仅作澄清展示，答案不自动回灌画像（grounding：不让 AI 凭空改画像/打分）。
            options: [],
          };
        })
        .filter(q => q.question)
    : [];
  // 与规则引擎确定性触发的追问合并去重（按 question 文本）
  const mergedFollowups: FollowupQuestion[] = [...career.followup_questions];
  for (const f of aiFollowups) {
    if (!mergedFollowups.some(m => m.question === f.question)) mergedFollowups.push(f);
  }

  return {
    available: true,
    model,
    overall_judgment: asString(raw.overall_judgment),
    need_followup: needFollowup || mergedFollowups.length > 0,
    followup_questions: mergedFollowups,
    reviewed_careers: reviewedCareers,
    moved_to_backup: movedToBackup,
    divergences,
    guardrail_notes: guardrailNotes,
  };
}

// 降级：未配置 key 或调用失败时，直接用规则结果生成等价的 review（available=false）。
export function fallbackReview(career: CareerMatcherResult, reason: string): AiReviewResult {
  const reviewed: ReviewedCareer[] = career.recommended_careers.map(c => ({
    ...c,
    display_score: c.score,
    display_level: c.level,
    ai_action: 'keep',
    ai_reason: '',
    user_facing_explanation: '',
    risk_warning: '',
  }));
  return {
    available: false,
    model: 'none',
    overall_judgment: reason,
    need_followup: career.followup_required,
    followup_questions: career.followup_questions,
    reviewed_careers: reviewed,
    moved_to_backup: career.backup_careers,
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
  industries: MatchedIndustry[],
  career: CareerMatcherResult,
): ChatMessage[] {
  const system = [
    '你是高考志愿推荐系统的职业路径复核员。规则引擎已基于知识库给出确定性打分，你的任务是复核与校正展示，不是重新发明。',
    '硬性约束（必须遵守）：',
    '1. 只能在我给你的候选职业(career_id)范围内操作，绝不新增候选集外的职业。',
    '2. 不得编造薪资、就业率、岗位数量等任何数据。',
    '3. 不得把硕博为主路径强推给本科就业优先的学生。',
    '4. 不直接改 rule_score；你只能对每个职业给出 ai_action（keep/upgrade_display/downgrade_display/warn_only/remove_from_display）。',
    '5. 不推荐被明确排除(exclusion)的职业。',
    '你可以做：判断规则结果是否有明显不合理或冲突、给出展示层校正动作与人话解释、在确有关键缺口/冲突时提出2-3个追问。',
    '只输出一个 JSON 对象，schema：{ "overall_judgment": string, "need_followup": boolean, "followup_questions": [{"trigger_code": string, "question": string, "purpose": string}], "career_reviews": [{"career_id": string, "ai_action": string, "suggested_display_level": "A|B|C|D", "ai_reason": string, "user_facing_explanation": string, "risk_warning": string}] }',
  ].join('\n');

  const compactCareer = (c: MatchedCareer) => ({
    career_id: c.career_id,
    career_name: c.career_name,
    rule_score: c.score,
    rule_level: c.level,
    min_education: c.min_education,
    matched_industries: c.matched_industries,
    why_fit: c.why_fit,
    honest_note: c.honest_note,
  });

  const userPayload = {
    profile_type: profileType,
    profile_summary: profileSummary,
    profile_tags: nonZeroTags(profile),
    recommended_industries: industries.slice(0, 5).map(i => ({
      industry_id: i.industry_id,
      industry_name: i.industry_name,
      score: i.score,
      level: i.level,
    })),
    candidate_careers: career.recommended_careers.map(compactCareer),
    deep_study_paths: career.deep_study_paths.map(d => ({ career_id: d.career_id, career_name: d.career_name, min_education: d.min_education })),
    rule_followup_questions: career.followup_questions,
    instruction: '复核 candidate_careers 是否合理；可重排/降级/移出展示，并对每个职业给出 career_reviews。只有当画像存在关键缺口或 Top 间存在你无法判断的强冲突时，才把 need_followup 设为 true 并给出追问。',
  };

  return [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify(userPayload) },
  ];
}

export async function reviewCareers(
  profile: ProfileTags,
  profileType: string,
  profileSummary: string,
  industries: MatchedIndustry[],
  career: CareerMatcherResult,
): Promise<AiReviewResult> {
  if (!isDeepSeekConfigured()) {
    return fallbackReview(career, 'AI 复核未启用（未配置 DEEPSEEK_API_KEY），返回规则结果。');
  }
  if (career.recommended_careers.length === 0) {
    return fallbackReview(career, '无可复核的职业候选，返回规则结果。');
  }
  try {
    const messages = buildMessages(profile, profileType, profileSummary, industries, career);
    const raw = await callDeepSeekJSON<RawAiReview>(messages, 3500, REVIEW_MODEL);
    return applyReview(career, raw, REVIEW_MODEL);
  } catch (err) {
    return fallbackReview(career, `AI 复核调用失败，已降级为规则结果：${(err as Error).message}`);
  }
}
