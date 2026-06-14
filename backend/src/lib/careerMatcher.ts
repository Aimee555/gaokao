import {
  buildMajorReqIndex,
  directionAccessibility,
  getStudentSubjects,
  SUBJECT_MAP,
  subjectLockReason,
  type StudentSubjects,
} from './subjectGate.js';
import type {
  BackupCareer,
  Career,
  CareerLibrary,
  CareerMatcherResult,
  DeepStudyPath,
  FollowupQuestion,
  MajorLibrary,
  MatchedCareer,
  MatchedIndustry,
  NotRecommendedCareer,
  ProfileTags,
  SourceIndustry,
} from '../types.js';

// ── 权重 ────────────────────────────────────────────────────────────────
const CAREER_MATCH_WEIGHTS = {
  industry_relevance: 0.20,
  career_value_match: 0.20,
  interest_match: 0.20,
  ability_match: 0.25,
  risk_tolerance_match: 0.10,
  education_plan_match: 0.05,
} as const;

const MARKET_WEIGHTS = {
  job_volume_score: 0.20,
  undergrad_employment_score: 0.25,
  salary_potential_score: 0.20,
  stability_score: 0.15,
  ai_resilience_score: 0.10,
  entry_salary_score: 0.10,
} as const;

const FINAL_MATCH_WEIGHT = 0.75;
const FINAL_MARKET_WEIGHT = 0.25;

// ── 常量 ────────────────────────────────────────────────────────────────
const UNKNOWN_DEFAULT_MATCH = 0.55;
const CAREER_VALUE_DEFAULT = 2.5;
const SUPPORTING_GROUPS = ['learning_style_tags', 'work_scene_tags'];
const MAX_SUPPORTING_BONUS = 5; // career_match_score 总附加上限

const RANK_SCORES: Record<number, number> = { 1: 100, 2: 92, 3: 85, 4: 75, 5: 68 };
const RANK_SCORE_OTHER = 40;
const BONUS_PER_EXTRA_INDUSTRY = 2;
const MAX_INDUSTRY_BONUS = 6;

const PENALTY_HARD = 70;
const PENALTY_STRONG = 35;
const PENALTY_SOFT = 18;
// 非硬惩罚去重后封顶，避免跨根因线性堆叠把谨慎学生整片打进D（沿用产业层做法）。
const MAX_NON_HARD_PENALTY = 40;

const DEEP_STUDY_EDU = new Set(['硕士优先', '硕博为主']);

const REASON_MIN = 3;
const REASON_MAX = 6;
const REASON_STRONG_THRESHOLD = 0.5;
const REASON_FALLBACK_THRESHOLD = 0.35;
const RISK_NOTE_MAX = 5;

const TOP_N = 8; // default_top_n
const MAIN_TOP_N = 5; // main_output_top_n
const MAX_SAME_CATEGORY_IN_TOP5 = 3;

const PUBLIC_SECTOR_INDUSTRY = 'IND_PUBLIC_SECTOR_EXAM_STABLE_EMPLOYMENT';

// ── 惩罚分类 ─────────────────────────────────────────────────────────────
const HARD_EXCLUSION = new Set([
  'exclusion_tags.no_medicine',
  'exclusion_tags.no_programming',
  'exclusion_tags.no_public_exam',
  'exclusion_tags.no_teaching',
]);

// 未表态的硬排除项 → 给用户看的人话名词（缺失映射则不提示，绝不泄露原始标签名）
const HARD_HINT_NOUN: Record<string, string> = {
  'exclusion_tags.no_programming': '长期编程 / 写代码',
  'exclusion_tags.no_medicine': '医学 / 医院环境',
  'exclusion_tags.no_public_exam': '考公 / 考编路径',
  'exclusion_tags.no_teaching': '教师 / 教育路径',
};

const STRONG_PENALTY = new Set([
  'exclusion_tags.no_long_training',
  'exclusion_tags.no_factory_site',
  'exclusion_tags.no_high_overtime',
  'constraint_tags.avoid_master_required',
  'constraint_tags.avoid_high_competition',
]);

// not_recommended_if 条件 → 去重根因（与education_gate/market自适应共享）
const ROOT_CAUSE: Record<string, string> = {
  'constraint_tags.avoid_master_required': 'advanced_degree',
  'constraint_tags.avoid_high_competition': 'competition',
  'constraint_tags.avoid_big_city_concentration': 'city_concentration',
  'constraint_tags.avoid_ai_substitution_risk': 'ai_substitution',
  'constraint_tags.avoid_income_volatility': 'income_volatility',
  'constraint_tags.avoid_unstable_employment': 'income_volatility',
  'constraint_tags.avoid_low_income_ceiling': 'salary',
  'exclusion_tags.no_public_exam': 'public_exam',
};

// ── 文案模板 ─────────────────────────────────────────────────────────────
const REASON_TEMPLATES: Record<string, string> = {
  industry_relevance: '与你的推荐产业方向一致',
  'career_value_tags.high_income': '匹配你的高收入目标',
  'career_value_tags.stability': '匹配你的稳定就业目标',
  'career_value_tags.technical_barrier': '匹配你的技术壁垒目标',
  'career_value_tags.undergrad_employment': '本科就业路径相对清晰',
  'career_value_tags.long_term_growth': '匹配你的长期成长目标',
  'career_value_tags.public_sector': '匹配体制内 / 国企 / 编制倾向',
  'career_value_tags.social_value': '匹配你的社会价值偏好',
  'career_value_tags.local_development': '匹配你的本地发展诉求',
  'interest_tags.code_system': '代码 / 系统兴趣较强',
  'interest_tags.data': '数据分析兴趣较强',
  'interest_tags.machine': '机器设备和工程系统兴趣较强',
  'interest_tags.life_health': '生命健康兴趣较强',
  'interest_tags.business': '商业和运营兴趣较强',
  'interest_tags.people': '愿意与人沟通和服务',
  'interest_tags.text_expression': '文字表达和内容兴趣较强',
  'interest_tags.law_rules': '法律规则兴趣较强',
  'interest_tags.art_design': '艺术与设计兴趣较强',
  'interest_tags.nature_environment': '自然与环境兴趣较强',
  'ability_tags.math': '数学能力匹配',
  'ability_tags.logic': '逻辑能力匹配',
  'ability_tags.programming_acceptance': '编程接受度较高',
  'ability_tags.language_expression': '写作表达能力匹配',
  'ability_tags.communication': '沟通表达能力匹配',
  'ability_tags.chemistry_biology': '化学生物基础匹配',
  'ability_tags.hands_on': '动手能力匹配',
  'ability_tags.physics': '物理能力匹配',
  'ability_tags.memory': '记忆背诵能力匹配',
  'learning_style_tags.project_learning': '适合项目和作品驱动型成长',
  'learning_style_tags.exam_learning': '适合考试和资格路径',
  'education_plan_tags.accept_master': '能够接受继续深造',
  'education_plan_tags.prefer_undergrad_employment': '本科就业诉求匹配',
};

const CONFLICT_TEMPLATES: Record<string, string> = {
  'exclusion_tags.no_programming': '你明确排斥编程，因此不建议把强编程职业作为主路径',
  'exclusion_tags.no_medicine': '你明确排斥医学或医院环境，医疗相关职业不作为主推',
  'exclusion_tags.no_teaching': '你明确不想当老师，教师类路径不作为主推',
  'exclusion_tags.no_public_exam': '你明确不愿意考公考编，体制类路径不作为主推',
  'exclusion_tags.no_factory_site': '你不希望去工厂或工程现场，现场工程类职业需谨慎',
  'exclusion_tags.no_long_training': '你不接受长期培养，深造和长周期职业需谨慎',
  'exclusion_tags.no_high_overtime': '你不接受高强度加班',
  'exclusion_tags.no_sales': '你明确排斥销售或强客户沟通',
  'exclusion_tags.no_design': '你明确排斥设计类工作',
  'exclusion_tags.no_media': '你明确排斥媒体内容方向',
  'constraint_tags.avoid_high_competition': '你希望规避高竞争',
  'constraint_tags.avoid_master_required': '你希望规避读研依赖，硕士优先或硕博为主路径不作为主推',
  'constraint_tags.avoid_ai_substitution_risk': '你希望规避AI替代风险',
  'constraint_tags.avoid_big_city_concentration': '你希望规避大城市岗位集中',
  'constraint_tags.avoid_income_volatility': '你希望规避收入波动',
  'constraint_tags.avoid_unstable_employment': '你希望规避就业不稳定',
  'constraint_tags.avoid_low_income_ceiling': '你希望规避收入天花板低',
};

// ── 画像取值 ─────────────────────────────────────────────────────────────
function numTag(profile: ProfileTags, group: string, tag: string): number {
  const g = (profile as unknown as Record<string, Record<string, number | boolean>>)[group];
  if (!g) return 0;
  const v = g[tag];
  return typeof v === 'number' ? v : 0;
}

function boolTag(profile: ProfileTags, path: string): boolean {
  const [g, t] = path.split('.');
  if (!g || !t) return false;
  const grp = (profile as unknown as Record<string, Record<string, number | boolean>>)[g];
  return !!grp && grp[t] === true;
}

function hasBoolKey(profile: ProfileTags, path: string): boolean {
  const [g, t] = path.split('.');
  if (!g || !t) return false;
  const grp = (profile as unknown as Record<string, Record<string, number | boolean>>)[g];
  return !!grp && t in grp;
}

// ── 单标签匹配（沿用产业层：能力/风险/学历门槛型，兴趣对称型，价值供给型）──
function thresholdMatch(student: number, required: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  if (student >= required) return 1;
  return Math.max(0, Math.min(1, 1 - (required - student) / 4));
}

function symmetricMatch(student: number, required: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  return Math.max(0, Math.min(1, 1 - Math.abs(student - required) / 4));
}

function provisionMatch(student: number, supply: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  return Math.max(0, Math.min(1, 1 - Math.max(0, student - supply) / 4));
}

function dimMatch(
  profile: ProfileTags,
  career: Career,
  group: string,
  formula: 'threshold' | 'symmetric',
): number {
  let sum = 0;
  let count = 0;
  for (const [path, req] of Object.entries(career.match_tags)) {
    const [g, tag] = path.split('.');
    if (g !== group) continue;
    const sv = numTag(profile, group, tag);
    sum += formula === 'threshold' ? thresholdMatch(sv, req) : symmetricMatch(sv, req);
    count += 1;
  }
  if (count === 0) return 55;
  return (sum / count) * 100;
}

// 职业价值：需求加权并集（学生在乎什么，这个职业给不给得起），未声明按2.5供给。
function careerValueMatch(profile: ProfileTags, career: Career): number {
  const entries = Object.entries(profile.career_value_tags).filter(
    ([, v]) => typeof v === 'number' && v > 0,
  );
  if (entries.length === 0) return 55;
  let wSum = 0;
  let w = 0;
  for (const [tag, sv] of entries) {
    const supply = career.match_tags[`career_value_tags.${tag}`] ?? CAREER_VALUE_DEFAULT;
    wSum += provisionMatch(sv, supply) * sv;
    w += sv;
  }
  return w === 0 ? 55 : (wSum / w) * 100;
}

// 辅助标签：仅统计已作答的（不让0.55默认值凭空加分），封顶 +5。
function supportingBonus(profile: ProfileTags, career: Career): number {
  let sum = 0;
  let count = 0;
  for (const [path, req] of Object.entries(career.match_tags)) {
    const [g, tag] = path.split('.');
    if (!SUPPORTING_GROUPS.includes(g)) continue;
    const sv = numTag(profile, g, tag);
    if (sv === 0) continue;
    sum += symmetricMatch(sv, req);
    count += 1;
  }
  if (count === 0) return 0;
  return Math.min(MAX_SUPPORTING_BONUS, (sum / count) * MAX_SUPPORTING_BONUS);
}

function marketScore(career: Career): number {
  const m = career.market_scores;
  const aiResilience = 6 - m.ai_substitution_risk;
  const weighted =
    m.job_volume_score * MARKET_WEIGHTS.job_volume_score +
    m.undergrad_employment_score * MARKET_WEIGHTS.undergrad_employment_score +
    m.salary_potential_score * MARKET_WEIGHTS.salary_potential_score +
    m.stability_score * MARKET_WEIGHTS.stability_score +
    aiResilience * MARKET_WEIGHTS.ai_resilience_score +
    m.entry_salary_score * MARKET_WEIGHTS.entry_salary_score;
  // market_scores 为1-5分制，线性映射到0-100。
  return Math.max(0, Math.min(100, ((weighted - 1) / 4) * 100));
}

// ── 惩罚 ────────────────────────────────────────────────────────────────
interface Penalty {
  source: string;
  amount: number;
  rootCause: string | null;
  isHard: boolean;
}

function classify(cond: string): 'hard' | 'strong' | 'soft' {
  if (HARD_EXCLUSION.has(cond)) return 'hard';
  if (STRONG_PENALTY.has(cond)) return 'strong';
  return 'soft';
}

interface CondEval {
  matched: boolean;
  missing: boolean;
}

function evalCond(profile: ProfileTags, cond: string): CondEval {
  const m = cond.match(/^(.+?)==\s*false\s*$/);
  if (m) {
    // 选科类等 ==false 条件在职业阶段只预警，硬过滤交专业库；此处不做命中惩罚。
    return { matched: false, missing: true };
  }
  if (!hasBoolKey(profile, cond)) return { matched: false, missing: true };
  return { matched: boolTag(profile, cond), missing: false };
}

function isPublicExamRole(career: Career): boolean {
  return (
    (career.not_recommended_if ?? []).includes('exclusion_tags.no_public_exam') ||
    career.industry_ids.includes(PUBLIC_SECTOR_INDUSTRY)
  );
}

interface PenaltyResult {
  penalties: Penalty[];
  warnings: string[];
  conflictTags: string[];
  isDeepStudy: boolean;
}

function collectPenalties(profile: ProfileTags, career: Career): PenaltyResult {
  const penalties: Penalty[] = [];
  const warnings: string[] = [];
  const conflictTags: string[] = [];
  let isDeepStudy = false;

  // — education_gate_rules —
  const preferUndergrad = numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment');
  const acceptMaster = numTag(profile, 'education_plan_tags', 'accept_master');
  const acceptPhd = numTag(profile, 'education_plan_tags', 'accept_phd');

  if (preferUndergrad >= 4 && career.scores.undergrad_feasibility <= 2) {
    penalties.push({ source: 'gate.undergrad_first', amount: 35, rootCause: 'undergrad_vs_deep', isHard: false });
    isDeepStudy = true;
  }
  // 未知(0)不触发学历惩罚（0=未知不代表排斥）。
  if (DEEP_STUDY_EDU.has(career.min_education) && acceptMaster > 0 && acceptMaster <= 2) {
    penalties.push({ source: 'gate.master_required', amount: 30, rootCause: 'advanced_degree', isHard: false });
  }
  if (career.min_education === '硕博为主' && acceptPhd > 0 && acceptPhd <= 2) {
    penalties.push({ source: 'gate.phd_required', amount: 40, rootCause: 'advanced_degree', isHard: false });
    isDeepStudy = true;
  }
  if (career.license_required && numTag(profile, 'learning_style_tags', 'certificate_learning') > 0 &&
      numTag(profile, 'learning_style_tags', 'certificate_learning') <= 2) {
    penalties.push({ source: 'gate.license', amount: 12, rootCause: 'license', isHard: false });
  }
  if (isPublicExamRole(career) && boolTag(profile, 'exclusion_tags.no_public_exam')) {
    penalties.push({ source: 'gate.public_exam', amount: PENALTY_HARD, rootCause: 'public_exam', isHard: true });
    conflictTags.push('exclusion_tags.no_public_exam');
  }

  // — not_recommended_if —
  for (const cond of career.not_recommended_if ?? []) {
    const cls = classify(cond);
    const ev = evalCond(profile, cond);
    if (ev.missing) {
      const subjMatch = cond.match(/subject_(\w+)==\s*false/);
      if (subjMatch) {
        const subj = SUBJECT_MAP[`subject_${subjMatch[1]}`] ?? subjMatch[1];
        warnings.push(`该职业相关专业通常要求选考${subj}，请在专业阶段确认你的选科。`);
      } else if (cls === 'hard') {
        const noun = HARD_HINT_NOUN[cond];
        // 无可读映射时不提示，避免把原始标签名泄露给用户
        if (noun) warnings.push(`该职业通常涉及${noun}，请确认你能否接受。`);
      }
      continue;
    }
    if (!ev.matched) continue;
    if (conflictTags.includes(cond)) continue; // 避免与 public_exam gate 重复登记
    conflictTags.push(cond);
    const amount = cls === 'hard' ? PENALTY_HARD : cls === 'strong' ? PENALTY_STRONG : PENALTY_SOFT;
    penalties.push({ source: `not_rec.${cond}`, amount, rootCause: ROOT_CAUSE[cond] ?? null, isHard: cls === 'hard' });
  }

  // — market_adaptive_penalties —
  const m = career.market_scores;
  const compTol = numTag(profile, 'risk_tolerance_tags', 'competition_tolerance');
  if (m.competition_level >= 4 && compTol > 0 && compTol <= 2) {
    penalties.push({ source: 'market.competition', amount: 8, rootCause: 'competition', isHard: false });
  }
  const bigCityTol = numTag(profile, 'risk_tolerance_tags', 'big_city_tolerance');
  if (m.city_concentration >= 4 && ((bigCityTol > 0 && bigCityTol <= 2) || boolTag(profile, 'constraint_tags.avoid_big_city_concentration'))) {
    penalties.push({ source: 'market.city', amount: 8, rootCause: 'city_concentration', isHard: false });
  }
  if (numTag(profile, 'career_value_tags', 'high_income') >= 4 && career.scores.salary_ceiling <= 3 &&
      boolTag(profile, 'constraint_tags.avoid_low_income_ceiling')) {
    penalties.push({ source: 'market.salary', amount: 10, rootCause: 'salary', isHard: false });
  }
  if (numTag(profile, 'career_value_tags', 'stability') >= 4 && career.scores.stability <= 2) {
    penalties.push({ source: 'market.stability', amount: 10, rootCause: 'stability_pref', isHard: false });
  }
  if (career.scores.ai_substitution_risk >= 4 && boolTag(profile, 'constraint_tags.avoid_ai_substitution_risk')) {
    penalties.push({ source: 'market.ai', amount: 10, rootCause: 'ai_substitution', isHard: false });
  }

  // 同时硕博为主 + undergrad_feasibility 低 → 标记深造
  if (DEEP_STUDY_EDU.has(career.min_education) && career.scores.undergrad_feasibility <= 2) {
    isDeepStudy = true;
  }

  return { penalties, warnings, conflictTags, isDeepStudy };
}

function dedupAndCap(items: Penalty[]): { total: number; hardHit: boolean } {
  const grouped = new Map<string, Penalty>();
  const ungrouped: Penalty[] = [];
  for (const it of items) {
    if (it.rootCause) {
      const cur = grouped.get(it.rootCause);
      if (!cur || it.amount > cur.amount) grouped.set(it.rootCause, it);
    } else {
      ungrouped.push(it);
    }
  }
  const all = [...grouped.values(), ...ungrouped];
  const hardHit = all.some(p => p.isHard);
  const hardSum = all.filter(p => p.isHard).reduce((a, p) => a + p.amount, 0);
  const nonHardSum = Math.min(MAX_NON_HARD_PENALTY, all.filter(p => !p.isHard).reduce((a, p) => a + p.amount, 0));
  return { total: hardSum + nonHardSum, hardHit };
}

// ── 理由与风险 ───────────────────────────────────────────────────────────
function buildWhyFit(profile: ProfileTags, career: Career, industryRelevance: number): string[] {
  const cands: Array<{ reason: string; score: number }> = [];
  if (industryRelevance >= 85) cands.push({ reason: REASON_TEMPLATES.industry_relevance, score: 1 });
  for (const [path, req] of Object.entries(career.match_tags)) {
    const reason = REASON_TEMPLATES[path];
    if (!reason) continue;
    const [g, tag] = path.split('.');
    const sv = numTag(profile, g, tag);
    if (sv === 0) continue;
    let match: number;
    if (g === 'career_value_tags') match = provisionMatch(sv, req);
    else if (g === 'interest_tags') match = symmetricMatch(sv, req);
    else match = thresholdMatch(sv, req);
    cands.push({ reason, score: match });
  }
  cands.sort((a, b) => b.score - a.score);
  let picked = cands.filter(c => c.score >= REASON_STRONG_THRESHOLD);
  if (picked.length < REASON_MIN) picked = cands.filter(c => c.score >= REASON_FALLBACK_THRESHOLD);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of picked) {
    if (seen.has(c.reason)) continue;
    seen.add(c.reason);
    out.push(c.reason);
    if (out.length >= REASON_MAX) break;
  }
  return out;
}

function buildRiskNotes(career: Career, warnings: string[]): string[] {
  // honest_note 单独展示，从 risk_notes 去掉重复；其余去重后裁剪到5条，预警优先。
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of [...warnings, ...career.risk_notes]) {
    const t = note.trim();
    if (!t || t === career.honest_note.trim() || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= RISK_NOTE_MAX) break;
  }
  return out;
}

function conflictReason(tags: string[]): string {
  const parts = tags.map(t => CONFLICT_TEMPLATES[t] ?? t).filter(Boolean);
  return parts.length ? parts.join('；') : '与排除或约束条件冲突';
}

function bucketize(score: number): { level: 'A' | 'B' | 'C' | 'D'; label: string } {
  if (score >= 85) return { level: 'A', label: '强推荐' };
  if (score >= 70) return { level: 'B', label: '可考虑' };
  if (score >= 55) return { level: 'C', label: '谨慎考虑' };
  return { level: 'D', label: '不推荐' };
}

function categoryOf(careerId: string): string {
  const parts = careerId.split('_');
  return parts.length > 1 ? parts[1] : careerId;
}

// ── 动态追问触发（确定性检测，AI 负责提问）──────────────────────────────
// 每个触发器自带可作答 options + tag_effects，用户答完即可回灌画像重排。
interface FollowupOptionDef {
  code: string;
  label: string;
  tag_effects: Record<string, number | boolean>;
}
interface FollowupDef {
  trigger_code: string;
  question: string;
  purpose: string;
  options: FollowupOptionDef[];
  test: (profile: ProfileTags, top: ScoredCareer[]) => boolean;
}

const FOLLOWUP_DEFS: FollowupDef[] = [
  {
    trigger_code: 'programming_uncertain_for_tech_paths',
    question: '如果大学和未来工作需要长期写代码、做项目、调试系统，你能接受吗？',
    purpose: '区分计算机软件、AI应用、数据工程等路径是否应保留为主推。',
    options: [
      { code: 'accept', label: '能，我愿意长期写代码做项目', tag_effects: { 'ability_tags.programming_acceptance': 5 } },
      { code: 'ok', label: '可以接受，会努力学', tag_effects: { 'ability_tags.programming_acceptance': 4 } },
      { code: 'reluctant', label: '不太喜欢，但必要时能做', tag_effects: { 'ability_tags.programming_acceptance': 2 } },
      { code: 'reject', label: '明确不想长期写代码', tag_effects: { 'ability_tags.programming_acceptance': 1, 'exclusion_tags.no_programming': true } },
    ],
    test: (profile, top) =>
      numTag(profile, 'ability_tags', 'programming_acceptance') > 0 &&
      numTag(profile, 'ability_tags', 'programming_acceptance') <= 3 &&
      top.some(c => (c._ref.match_tags['ability_tags.programming_acceptance'] ?? 0) >= 4),
  },
  {
    trigger_code: 'undergrad_vs_deep_study_conflict',
    question: '你更希望本科毕业直接就业，还是愿意为了更高上限读研/读博？',
    purpose: '决定算法、量化、科研、芯片设计、生物研发等路径是否进入主推。',
    options: [
      { code: 'undergrad', label: '本科毕业直接就业为主', tag_effects: { 'education_plan_tags.prefer_undergrad_employment': 5, 'education_plan_tags.accept_master': 2 } },
      { code: 'master', label: '愿意读研提升上限', tag_effects: { 'education_plan_tags.accept_master': 5, 'education_plan_tags.prefer_undergrad_employment': 2 } },
      { code: 'phd', label: '愿意读到博士 / 走科研路线', tag_effects: { 'education_plan_tags.accept_master': 5, 'education_plan_tags.accept_phd': 5, 'education_plan_tags.prefer_undergrad_employment': 1 } },
    ],
    test: (profile, top) =>
      numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment') >= 4 &&
      top.some(c => DEEP_STUDY_EDU.has(c._ref.min_education)),
  },
  {
    trigger_code: 'stability_vs_high_income_conflict',
    question: '如果高收入和稳定只能优先一个，你更看重哪一个？',
    purpose: '区分高薪技术/金融路径与考公、国企、电力、医疗等稳定路径。',
    options: [
      { code: 'stability', label: '更看重稳定', tag_effects: { 'career_value_tags.stability': 5, 'career_value_tags.high_income': 3 } },
      { code: 'income', label: '更看重高收入', tag_effects: { 'career_value_tags.high_income': 5, 'career_value_tags.stability': 3 } },
      { code: 'balance', label: '想兼顾，但稳定略优先', tag_effects: { 'career_value_tags.stability': 4, 'career_value_tags.high_income': 4 } },
    ],
    test: profile =>
      numTag(profile, 'career_value_tags', 'high_income') >= 4 &&
      numTag(profile, 'career_value_tags', 'stability') >= 4,
  },
  {
    trigger_code: 'fieldwork_conflict',
    question: '你能接受工厂、工程现场、测试场或外勤工作吗？',
    purpose: '判断电气、自动化、制造、土木、无人机、新能源等路径是否适合。',
    options: [
      { code: 'accept', label: '能接受现场 / 外勤', tag_effects: { 'work_scene_tags.field_work': 4 } },
      { code: 'reject', label: '不希望去工厂或工程现场', tag_effects: { 'exclusion_tags.no_factory_site': true } },
    ],
    test: (profile, top) =>
      !hasBoolKey(profile, 'exclusion_tags.no_factory_site') &&
      top.some(c => (c._ref.work_scene ?? []).some(w => /工厂|现场|外勤|测试场/.test(w)) ||
        (c._ref.not_recommended_if ?? []).includes('exclusion_tags.no_factory_site')),
  },
  {
    trigger_code: 'certificate_conflict',
    question: '你能接受长期考证或资格考试吗？例如法考、教师资格、医师资格、CPA等。',
    purpose: '判断法学、医学、教师、会计审计、建筑造价等路径是否适合。',
    options: [
      { code: 'accept', label: '能接受长期考证', tag_effects: { 'learning_style_tags.certificate_learning': 5, 'education_plan_tags.accept_certificate': 5 } },
      { code: 'reject', label: '不太愿意长期考证', tag_effects: { 'learning_style_tags.certificate_learning': 2 } },
    ],
    test: (profile, top) =>
      numTag(profile, 'learning_style_tags', 'certificate_learning') > 0 &&
      numTag(profile, 'learning_style_tags', 'certificate_learning') <= 3 &&
      top.some(c => !!c._ref.license_required),
  },
  {
    trigger_code: 'public_sector_confirmation',
    question: '你是否愿意把考公、事业编、国企央企作为主要就业路径之一？',
    purpose: '确认稳定体制路线是否进入职业Top5。',
    options: [
      { code: 'yes', label: '愿意，作为主要路径之一', tag_effects: { 'career_value_tags.public_sector': 5, 'education_plan_tags.accept_public_exam': 5 } },
      { code: 'no', label: '不愿意走体制路线', tag_effects: { 'career_value_tags.public_sector': 1, 'exclusion_tags.no_public_exam': true } },
      { code: 'undecided', label: '了解后再定', tag_effects: {} },
    ],
    test: (profile, top) => {
      const ps = numTag(profile, 'career_value_tags', 'public_sector');
      return ps >= 2 && ps <= 3 && top.some(c => isPublicExamRole(c._ref));
    },
  },
];

// 触发码 → 选项目录（供回灌时按 selected_code 查 tag_effects）
export const FOLLOWUP_CATALOG: Record<string, FollowupOptionDef[]> = Object.fromEntries(
  FOLLOWUP_DEFS.map(d => [d.trigger_code, d.options]),
);

/**
 * 把用户的追问回答套用到画像上，返回新画像（不改原对象）。
 * 数值标签覆盖并钳到0-5；布尔标签置 true。只认目录内已知 trigger_code/selected_code，
 * 未知答案忽略（grounding：不让任意输入凭空改画像）。
 */
export function applyFollowupAnswers(
  profile: ProfileTags,
  answers: Array<{ trigger_code: string; selected_code: string }>,
): ProfileTags {
  const next = JSON.parse(JSON.stringify(profile)) as ProfileTags;
  const mut = next as unknown as Record<string, Record<string, number | boolean>>;
  for (const ans of answers) {
    const opts = FOLLOWUP_CATALOG[ans.trigger_code];
    if (!opts) continue;
    const opt = opts.find(o => o.code === ans.selected_code);
    if (!opt) continue;
    for (const [path, val] of Object.entries(opt.tag_effects)) {
      const [group, tag] = path.split('.');
      if (!group || !tag || !mut[group]) continue;
      if (typeof val === 'boolean') {
        if (val) mut[group][tag] = true;
      } else {
        mut[group][tag] = Math.max(0, Math.min(5, val));
      }
    }
  }
  return next;
}

// ── 主流程 ──────────────────────────────────────────────────────────────
interface ScoredCareer extends MatchedCareer {
  _ref: Career;
  _hardHit: boolean;
  _isDeepStudy: boolean;
  _conflictTags: string[];
  _scoreBefore: number;
  _subjectLocked: boolean;
  _subjectLockReason: string;
}

interface CareerMatcherOptions {
  topN?: number;
  answeredTriggers?: Set<string>; // 已作答的追问，不再重复透出
  majorLibrary?: MajorLibrary; // 提供后启用「选科锁死」向上传播（方案A）
}

export function matchCareers(
  library: CareerLibrary,
  profile: ProfileTags,
  industries: MatchedIndustry[],
  options: CareerMatcherOptions = {},
): CareerMatcherResult {
  const answeredTriggers = options.answeredTriggers ?? new Set<string>();
  // 选科锁死检测：学生选科 + 专业库 required_all 索引（未提供专业库则不启用）
  const studentSubjects: StudentSubjects = getStudentSubjects(profile);
  const majorReqIndex = options.majorLibrary ? buildMajorReqIndex(options.majorLibrary) : null;
  // 产业Top5 → rank/score 映射
  const top5 = industries.slice(0, 5);
  const rankByIndustry = new Map<string, number>();
  top5.forEach(ind => {
    rankByIndustry.set(ind.industry_id, ind.rank);
  });
  const recommendedIds = new Set(rankByIndustry.keys());

  const sourceIndustries: SourceIndustry[] = top5.map(ind => ({
    industry_id: ind.industry_id,
    industry_name: ind.industry_name,
    industry_rank: ind.rank,
    industry_score: ind.score,
  }));

  // 例外：强体制/稳定诉求时，允许考公产业下职业进入候选（即便该产业不在Top5）。
  const allowPublicException =
    numTag(profile, 'career_value_tags', 'public_sector') >= 4 ||
    numTag(profile, 'career_value_tags', 'stability') >= 4;

  const scored: ScoredCareer[] = [];

  for (const career of library.careers) {
    const matched = career.industry_ids.filter(id => recommendedIds.has(id));
    let viaException = false;
    if (matched.length === 0) {
      if (allowPublicException && career.industry_ids.includes(PUBLIC_SECTOR_INDUSTRY)) {
        viaException = true;
      } else {
        continue; // 不在产业Top5范围，默认不进候选
      }
    }

    // industry_relevance：命中推荐产业的最高 rank_score
    let industryRelevance = RANK_SCORE_OTHER;
    for (const id of matched) {
      const rank = rankByIndustry.get(id);
      if (rank) industryRelevance = Math.max(industryRelevance, RANK_SCORES[rank] ?? RANK_SCORE_OTHER);
    }
    if (viaException) industryRelevance = RANK_SCORE_OTHER;
    const industryBonus = Math.min(MAX_INDUSTRY_BONUS, Math.max(0, matched.length - 1) * BONUS_PER_EXTRA_INDUSTRY);

    const careerMatch =
      industryRelevance * CAREER_MATCH_WEIGHTS.industry_relevance +
      careerValueMatch(profile, career) * CAREER_MATCH_WEIGHTS.career_value_match +
      dimMatch(profile, career, 'interest_tags', 'symmetric') * CAREER_MATCH_WEIGHTS.interest_match +
      dimMatch(profile, career, 'ability_tags', 'threshold') * CAREER_MATCH_WEIGHTS.ability_match +
      dimMatch(profile, career, 'risk_tolerance_tags', 'threshold') * CAREER_MATCH_WEIGHTS.risk_tolerance_match +
      dimMatch(profile, career, 'education_plan_tags', 'threshold') * CAREER_MATCH_WEIGHTS.education_plan_match;
    const careerMatchScore = Math.min(100, careerMatch + supportingBonus(profile, career));

    const careerMarketScore = marketScore(career);
    const { penalties, warnings, conflictTags, isDeepStudy } = collectPenalties(profile, career);
    const { total: penalty, hardHit } = dedupAndCap(penalties);

    // 选科锁死：该职业的入口专业在学生选科下全部不达标 → 视为硬排除，不进主推
    let subjectLocked = false;
    let subjectLockReasonText = '';
    if (majorReqIndex) {
      const acc = directionAccessibility(career.entry_majors, majorReqIndex, studentSubjects);
      if (acc.locked) {
        subjectLocked = true;
        subjectLockReasonText = subjectLockReason(acc.missingSubjects);
      }
    }

    const baseScore = careerMatchScore * FINAL_MATCH_WEIGHT + careerMarketScore * FINAL_MARKET_WEIGHT + industryBonus;
    const scoreBefore = Math.round(Math.max(0, Math.min(100, baseScore)));
    const finalScore = Math.round(Math.max(0, Math.min(100, baseScore - penalty)));
    const bucket = bucketize(finalScore);

    const matchedIndustryNames = matched.map(id =>
      top5.find(t => t.industry_id === id)?.industry_name ?? id,
    );

    scored.push({
      _ref: career,
      _hardHit: hardHit,
      _isDeepStudy: isDeepStudy,
      _conflictTags: conflictTags,
      _scoreBefore: scoreBefore,
      _subjectLocked: subjectLocked,
      _subjectLockReason: subjectLockReasonText,
      rank: 0,
      career_id: career.career_id,
      career_name: career.career_name,
      score: finalScore,
      level: bucket.level,
      level_label: bucket.label,
      matched_industries: matchedIndustryNames,
      min_education: career.min_education,
      license_required: career.license_required,
      entry_majors: career.entry_majors,
      related_majors: career.related_majors,
      employer_types: career.employer_types ?? [],
      career_ladder: career.career_ladder ?? '',
      work_scene: career.work_scene ?? [],
      why_fit: buildWhyFit(profile, career, industryRelevance),
      honest_note: career.honest_note,
      risk_notes: buildRiskNotes(career, warnings),
      development_path: career.development_path,
      debug_scores: {
        career_match_score: Math.round(careerMatchScore),
        career_market_score: Math.round(careerMarketScore),
        industry_relevance: industryRelevance,
        penalty_score: Math.round(penalty),
      },
    });
  }

  // 分桶（选科锁死等同硬排除：移出主推与深造，进不推荐）
  const hardExcluded = scored.filter(c => c._hardHit || c._subjectLocked);
  const eligible = scored.filter(c => !c._hardHit && !c._subjectLocked);

  const tieBreak = (a: ScoredCareer, b: ScoredCareer): number => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.debug_scores.industry_relevance !== a.debug_scores.industry_relevance)
      return b.debug_scores.industry_relevance - a.debug_scores.industry_relevance;
    if (numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment') >= 4 &&
        b._ref.scores.undergrad_feasibility !== a._ref.scores.undergrad_feasibility)
      return b._ref.scores.undergrad_feasibility - a._ref.scores.undergrad_feasibility;
    if (numTag(profile, 'career_value_tags', 'stability') >= 4 &&
        b._ref.scores.stability !== a._ref.scores.stability)
      return b._ref.scores.stability - a._ref.scores.stability;
    if (numTag(profile, 'career_value_tags', 'high_income') >= 4 &&
        b._ref.scores.salary_ceiling !== a._ref.scores.salary_ceiling)
      return b._ref.scores.salary_ceiling - a._ref.scores.salary_ceiling;
    return 0;
  };

  const deepStudyItems = eligible.filter(c => c._isDeepStudy).sort(tieBreak);
  const mainPool = eligible.filter(c => !c._isDeepStudy).sort(tieBreak);

  // recommended Top5：分数达C档及以上，且应用同类不超过3的多样性约束
  const recommended: ScoredCareer[] = [];
  const overflow: ScoredCareer[] = [];
  const categoryCount = new Map<string, number>();
  for (const c of mainPool) {
    if (c.level === 'D') {
      overflow.push(c);
      continue;
    }
    const cat = categoryOf(c.career_id);
    const used = categoryCount.get(cat) ?? 0;
    if (recommended.length < MAIN_TOP_N && used < MAX_SAME_CATEGORY_IN_TOP5) {
      recommended.push(c);
      categoryCount.set(cat, used + 1);
    } else {
      overflow.push(c);
    }
  }
  recommended.forEach((c, i) => { c.rank = i + 1; });

  // 稳定备选保障：强稳定诉求但Top5无稳定职业时，从overflow补一个稳定路径进备选提示
  const wantsStability = numTag(profile, 'career_value_tags', 'stability') >= 4;
  const hasStableInTop = recommended.some(c => c._ref.scores.stability >= 4);

  const backup: BackupCareer[] = overflow
    .filter(c => c.level !== 'D')
    .slice(0, TOP_N - MAIN_TOP_N)
    .map(c => ({
      career_id: c.career_id,
      career_name: c.career_name,
      reason: wantsStability && !hasStableInTop && c._ref.scores.stability >= 4
        ? '稳定路径备选（你较看重稳定，建议保留一个稳定方向）'
        : `备选方向（综合分 ${c.score}，${c.level_label}）`,
    }));

  const deepStudyPaths: DeepStudyPath[] = deepStudyItems.slice(0, 8).map(c => ({
    career_id: c.career_id,
    career_name: c.career_name,
    reason: c._ref.min_education === '硕博为主'
      ? '偏硕博/科研路径，本科直接入行可行性低，长期上限高'
      : '学历门槛较高（硕士优先），适合愿意深造的同学',
    min_education: c.min_education,
    entry_majors: c.entry_majors,
  }));

  // 不推荐 = 硬排除 + 主池中跌到D档的。深造路径(isDeepStudy)是因"需读研"被降级，
  // 不算"不推荐"，必须从D桶里排除，避免同一职业既出现在深造又出现在不推荐。
  const notRecommended: NotRecommendedCareer[] = [
    ...hardExcluded,
    ...mainPool.filter(c => c.level === 'D'),
  ].map(c => ({
    career_id: c.career_id,
    career_name: c.career_name,
    reason: c._subjectLocked
      ? c._subjectLockReason
      : c._conflictTags.length ? conflictReason(c._conflictTags) : '匹配度偏低或与目标冲突',
    conflict_tags: c._subjectLocked ? [...c._conflictTags, 'subject_locked'] : c._conflictTags,
  }));

  // 动态追问触发检测（已作答的不再透出）
  const topForFollowup = [...recommended, ...deepStudyItems.slice(0, 3)];
  const followupQuestions: FollowupQuestion[] = FOLLOWUP_DEFS.filter(
    def => !answeredTriggers.has(def.trigger_code) && def.test(profile, topForFollowup),
  ).map(def => ({
    trigger_code: def.trigger_code,
    question: def.question,
    purpose: def.purpose,
    options: def.options,
  }));

  return {
    source_industries: sourceIndustries,
    recommended_careers: recommended.map(stripInternal),
    deep_study_paths: deepStudyPaths,
    backup_careers: backup,
    not_recommended_careers: notRecommended,
    followup_required: followupQuestions.length > 0,
    followup_questions: followupQuestions,
  };
}

function stripInternal(c: ScoredCareer): MatchedCareer {
  const { _ref, _hardHit, _isDeepStudy, _conflictTags, _scoreBefore, _subjectLocked, _subjectLockReason, ...rest } = c;
  void _ref; void _hardHit; void _isDeepStudy; void _conflictTags; void _scoreBefore;
  void _subjectLocked; void _subjectLockReason;
  return rest;
}
