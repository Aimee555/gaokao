import { FOLLOWUP_CATALOG_MAJOR, detectMajorFollowups } from './majorFollowups.js';
import { getStudentSubjects, missingRecommendedSubjects, subjectEligibility } from './subjectGate.js';
import type {
  DeepStudyMajor,
  FollowupQuestion,
  IneligibleMajor,
  Major,
  MajorLibrary,
  MajorMatcherResult,
  MatchedCareer,
  MatchedIndustry,
  MatchedMajor,
  NotRecommendedMajor,
  ProfileTags,
  SourceCareer,
  SubjectEligibility,
} from '../types.js';

// ── 维度权重（major_matching_rules.score_formula）──────────────────────────
const DIM_WEIGHTS = {
  career_relevance: 0.30,
  ability_match: 0.20,
  interest_match: 0.15,
  career_value_match: 0.15,
  market_fit: 0.10,
  education_fit: 0.10,
} as const;

const MARKET_WEIGHTS = {
  undergrad_employment_score: 0.25,
  job_volume_score: 0.20,
  salary_potential_score: 0.20,
  stability_score: 0.15,
  ai_resilience_score: 0.10,
  city_fit_score: 0.10,
} as const;

const UNKNOWN_DEFAULT_MATCH = 0.55;
const CAREER_VALUE_DEFAULT = 2.5;
const MAX_NON_HARD_PENALTY = 40;

const REASON_MAX = 6;
const RISK_NOTE_MAX = 6;

const A_MAX = 5, B_MAX = 8, C_MAX = 8, DEEP_MAX = 6, INELIGIBLE_MAX = 10, NOTREC_MAX = 10;
const MAX_SAME_CLASS_IN_A = 4;
const MAX_CANDIDATES = 30;

// 职业 rank → 相关性基分（major_matching_rules.career_relevance.career_rank_scores）
const CAREER_RANK_SCORE: Record<number, number> = { 1: 100, 2: 94, 3: 88, 4: 80, 5: 74 };
const BACKUP_RANK_SCORE = 60;
const SOURCE_TYPE_WEIGHT = { entry_major: 1.0, related_major: 0.82, industry_related_major: 0.62 } as const;
const MULTI_CAREER_BONUS = 3;
const MAX_MULTI_BONUS = 9;
const INDUSTRY_TOP_N = 3;

// 能力标签 → 专业能力要求字段
const ABILITY_MAP: Record<string, string> = {
  math: 'math_requirement', logic: 'logic_requirement', physics: 'physics_requirement',
  chemistry_biology: 'chemistry_biology_requirement', programming_acceptance: 'programming_requirement',
  memory: 'memory_requirement', language_expression: 'language_expression_requirement',
  communication: 'communication_requirement', hands_on: 'hands_on_requirement', aesthetic: 'aesthetic_requirement',
};

// 学生 career_value 标签 → 专业 career_value_fit 字段
const VALUE_FIT_MAP: Record<string, string> = {
  high_income: 'high_income_fit', stability: 'stability_fit', technical_barrier: 'technical_barrier_fit',
  undergrad_employment: 'undergrad_employment_fit', public_sector: 'public_sector_fit',
  work_life_balance: 'work_life_balance_fit', local_development: 'local_development_fit', ai_resilience: 'ai_resilience_fit',
};

// ── not_recommended_if 分类（用专业库结构化标签，替代规则里脆弱的专业名关键词）──
const HARD_EXCLUSION = new Set([
  'exclusion_tags.no_programming',
  'exclusion_tags.no_medicine',
  'exclusion_tags.no_teaching',
  'exclusion_tags.no_law',
]);
const STRONG_PENALTY = new Set([
  'exclusion_tags.no_factory_site',
  'exclusion_tags.no_engineering',
  'exclusion_tags.no_hospital',
  'exclusion_tags.no_long_training',
  'exclusion_tags.no_research',
  'exclusion_tags.no_sales',
  'exclusion_tags.no_design',
  'exclusion_tags.no_media',
  'constraint_tags.avoid_master_required',
  'constraint_tags.avoid_high_competition',
]);
// 其余 not_recommended_if（avoid_ai_substitution_risk / avoid_income_volatility /
// avoid_big_city_concentration / avoid_low_income_ceiling / avoid_unclear_path …）→ soft
const PENALTY_HARD = 60;
const PENALTY_STRONG = 25;
const PENALTY_SOFT = 10;
const RED_CARD_PENALTY = 18; // 红牌就业预警：明显下压但不剔除

const ROOT_CAUSE: Record<string, string> = {
  'constraint_tags.avoid_master_required': 'master',
  'constraint_tags.avoid_high_competition': 'competition',
  'constraint_tags.avoid_big_city_concentration': 'city',
  'constraint_tags.avoid_ai_substitution_risk': 'ai_substitution',
  'constraint_tags.avoid_income_volatility': 'income_volatility',
  'constraint_tags.avoid_low_income_ceiling': 'salary',
  'exclusion_tags.no_factory_site': 'factory_site',
  'exclusion_tags.no_long_training': 'long_training',
};

const REASON_TEMPLATES: Record<string, string> = {
  career_relevance: '能通向你当前匹配度较高的职业路径',
  subject_eligible: '你的选科满足该专业的通用选科要求模板',
  ability_match: '你的能力基础与该专业要求较匹配',
  'career_value_tags.high_income': '该专业相关路径收入上限相对较高',
  'career_value_tags.stability': '该专业相关路径稳定性较好',
  'career_value_tags.public_sector': '对考公 / 事业编 / 国企央企有一定适配度',
  'career_value_tags.undergrad_employment': '本科就业路径相对清晰',
  'career_value_tags.technical_barrier': '该专业具有一定技术壁垒',
  'career_value_tags.local_development': '在本地 / 省内就业场景中有一定机会',
  'interest_tags.life_health': '生命健康兴趣较强',
  'interest_tags.code_system': '代码 / 系统兴趣较强',
  'interest_tags.data': '数据分析兴趣较强',
  'interest_tags.business': '商业和运营兴趣较强',
  'interest_tags.people': '愿意与人沟通和服务',
  'interest_tags.law_rules': '法律规则兴趣较强',
  'interest_tags.machine': '机器设备和工程系统兴趣较强',
  'interest_tags.text_expression': '文字表达和内容兴趣较强',
  'interest_tags.art_design': '艺术与设计兴趣较强',
};

const CONFLICT_TEMPLATES: Record<string, string> = {
  'exclusion_tags.no_programming': '你明确排斥编程，而该专业编程要求较高',
  'exclusion_tags.no_medicine': '你明确排斥医学或医院环境，而该专业与医疗健康高度相关',
  'exclusion_tags.no_teaching': '你明确不想走师范 / 教育路径',
  'exclusion_tags.no_law': '你明确排斥法律相关方向',
  'exclusion_tags.no_factory_site': '你不希望工厂 / 现场工作，而该专业现场属性较强',
  'exclusion_tags.no_engineering': '你不希望工程方向，而该专业偏工程',
  'exclusion_tags.no_hospital': '你不希望医院环境',
  'exclusion_tags.no_long_training': '你不接受长期培养，而该专业常需读研 / 规培 / 长期考证',
  'exclusion_tags.no_research': '你不希望走科研路线',
  'exclusion_tags.no_sales': '你排斥销售或强客户沟通',
  'exclusion_tags.no_design': '你排斥设计类工作',
  'exclusion_tags.no_media': '你排斥媒体内容方向',
  'constraint_tags.avoid_master_required': '你希望规避读研依赖，而该专业高质量路径较依赖研究生学历',
  'constraint_tags.avoid_high_competition': '你希望规避高竞争',
  'constraint_tags.avoid_ai_substitution_risk': '你希望规避 AI 替代风险',
  'constraint_tags.avoid_big_city_concentration': '你希望规避大城市岗位集中',
  'constraint_tags.avoid_income_volatility': '你希望规避收入波动',
  'constraint_tags.avoid_low_income_ceiling': '你希望规避收入上限低',
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
  const grp = (profile as unknown as Record<string, Record<string, number | boolean>>)[g];
  return !!grp && grp[t] === true;
}

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
function map15to100(weighted1to5: number): number {
  return Math.max(0, Math.min(100, ((weighted1to5 - 1) / 4) * 100));
}

// ── 维度分 ───────────────────────────────────────────────────────────────
function abilityMatch(profile: ProfileTags, major: Major): number {
  let sum = 0, count = 0;
  for (const [tag, field] of Object.entries(ABILITY_MAP)) {
    const req = major.ability_requirements[field];
    if (typeof req !== 'number') continue;
    sum += thresholdMatch(numTag(profile, 'ability_tags', tag), req);
    count += 1;
  }
  return count === 0 ? 55 : (sum / count) * 100;
}

// 需求加权 + 供给型：只统计学生在乎的兴趣(sv>0)，按 sv 加权；
// 专业兴趣值 >= 学生 → 满分（专业"广泛有趣"不惩罚），只有当学生热爱某兴趣
// 而专业不engage时才扣分。对当前非区分性(全5) interest_tags 鲁棒，数据调好后自动变准。
function interestMatch(profile: ProfileTags, major: Major): number {
  let wSum = 0, w = 0;
  for (const [path, req] of Object.entries(major.match_tags)) {
    const [g, tag] = path.split('.');
    if (g !== 'interest_tags') continue;
    const sv = numTag(profile, 'interest_tags', tag);
    if (sv === 0) continue; // 未作答兴趣不参与（需求加权）
    wSum += provisionMatch(sv, req) * sv;
    w += sv;
  }
  return w === 0 ? 55 : (wSum / w) * 100;
}

function careerValueMatch(profile: ProfileTags, major: Major): number {
  const entries = Object.entries(profile.career_value_tags).filter(([, v]) => typeof v === 'number' && v > 0);
  if (entries.length === 0) return 55;
  let wSum = 0, w = 0;
  for (const [tag, sv] of entries) {
    const field = VALUE_FIT_MAP[tag];
    const supply = field && typeof major.career_value_fit[field] === 'number'
      ? major.career_value_fit[field]
      : CAREER_VALUE_DEFAULT;
    wSum += provisionMatch(sv, supply) * sv;
    w += sv;
  }
  return w === 0 ? 55 : (wSum / w) * 100;
}

function marketFit(profile: ProfileTags, major: Major): number {
  const m = major.market_scores;
  const aiResilience = 6 - m.ai_substitution_risk;
  // city_fit：学生大城市承受度 vs 专业城市集中度（1-5）
  const bigCityTol = numTag(profile, 'risk_tolerance_tags', 'big_city_tolerance');
  let cityFit: number;
  if ((bigCityTol > 0 && bigCityTol <= 2) || boolTag(profile, 'constraint_tags.avoid_big_city_concentration')) {
    cityFit = m.city_concentration >= 4 ? 1 : 4;
  } else if (bigCityTol === 0) {
    cityFit = 3;
  } else {
    cityFit = Math.max(1, Math.min(5, 5 - Math.abs(bigCityTol - m.city_concentration)));
  }
  // 自适应权重：高收入↑薪资、稳定↑稳定、本科就业↑本科就业
  const w = { ...MARKET_WEIGHTS };
  let sw = { undergrad: w.undergrad_employment_score, job: w.job_volume_score, salary: w.salary_potential_score, stab: w.stability_score, ai: w.ai_resilience_score, city: w.city_fit_score };
  if (numTag(profile, 'career_value_tags', 'high_income') >= 4) { sw.salary += 0.05; sw.stab -= 0.03; }
  if (numTag(profile, 'career_value_tags', 'stability') >= 4) { sw.stab += 0.08; sw.salary -= 0.03; }
  if (numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment') >= 4) { sw.undergrad += 0.08; sw.salary -= 0.05; }
  const total = sw.undergrad + sw.job + sw.salary + sw.stab + sw.ai + sw.city;
  const weighted =
    (m.undergrad_employment_score * sw.undergrad +
      m.job_volume_score * sw.job +
      m.salary_potential_score * sw.salary +
      m.stability_score * sw.stab +
      aiResilience * sw.ai +
      cityFit * sw.city) / total;
  return map15to100(weighted);
}

function educationFit(profile: ProfileTags, major: Major): number {
  const ep = major.education_profile;
  const preferUndergrad = numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment');
  const acceptMaster = numTag(profile, 'education_plan_tags', 'accept_master');
  const acceptLong = numTag(profile, 'education_plan_tags', 'accept_long_training');
  const cert = numTag(profile, 'learning_style_tags', 'certificate_learning');
  let score = 60; // 中性基线
  if (preferUndergrad >= 4) score += (ep.undergrad_friendly_score - 3) * 8;
  if (acceptMaster > 0 && acceptMaster <= 2 && ep.master_requirement_score >= 4) score -= 18;
  if (acceptMaster >= 4 && ep.master_requirement_score >= 4) score += 8;
  if (acceptLong > 0 && acceptLong <= 2 && ep.long_training_score >= 4) score -= 15;
  if (cert > 0 && cert <= 2 && ep.certificate_requirement_score >= 4) score -= 8;
  return Math.max(0, Math.min(100, score));
}

// ── 候选生成 ─────────────────────────────────────────────────────────────
interface Candidate {
  major: Major;
  careerRelevance: number;
  matchedCareers: Array<{ career_id: string; career_name: string }>;
  matchedIndustries: Array<{ industry_id: string; industry_name: string }>;
}

function relevanceFor(rank: number | 'backup', sourceType: keyof typeof SOURCE_TYPE_WEIGHT): number {
  const base = rank === 'backup' ? BACKUP_RANK_SCORE : (CAREER_RANK_SCORE[rank] ?? BACKUP_RANK_SCORE);
  return base * SOURCE_TYPE_WEIGHT[sourceType];
}

function buildCandidates(
  library: MajorLibrary,
  careers: MatchedCareer[],
  industries: MatchedIndustry[],
): Candidate[] {
  const byName = new Map<string, Major>();
  for (const mj of library.majors) byName.set(mj.major_name, mj);

  const map = new Map<string, Candidate>();
  const bump = (
    major: Major,
    relevance: number,
    career?: { career_id: string; career_name: string },
    industry?: { industry_id: string; industry_name: string },
  ) => {
    let c = map.get(major.major_id);
    if (!c) {
      c = { major, careerRelevance: 0, matchedCareers: [], matchedIndustries: [] };
      map.set(major.major_id, c);
    }
    c.careerRelevance = Math.max(c.careerRelevance, relevance);
    if (career && !c.matchedCareers.some(x => x.career_id === career.career_id)) c.matchedCareers.push(career);
    if (industry && !c.matchedIndustries.some(x => x.industry_id === industry.industry_id)) c.matchedIndustries.push(industry);
  };

  careers.slice(0, 5).forEach(c => {
    const rank = c.rank;
    const ref = { career_id: c.career_id, career_name: c.career_name };
    for (const name of c.entry_majors) {
      const mj = byName.get(name);
      if (mj) bump(mj, relevanceFor(rank, 'entry_major'), ref);
    }
    for (const name of c.related_majors) {
      const mj = byName.get(name);
      if (mj) bump(mj, relevanceFor(rank, 'related_major'), ref);
    }
  });

  // 产业相关专业作补充候选（不能压过职业入口专业）
  for (const ind of industries.slice(0, INDUSTRY_TOP_N)) {
    const ref = { industry_id: ind.industry_id, industry_name: ind.industry_name };
    for (const name of ind.related_majors ?? []) {
      const mj = byName.get(name);
      if (mj) bump(mj, relevanceFor('backup', 'industry_related_major'), undefined, ref);
    }
  }

  // 多职业复合加分
  for (const c of map.values()) {
    const extra = Math.max(0, c.matchedCareers.length - 1);
    c.careerRelevance = Math.min(100, c.careerRelevance + Math.min(MAX_MULTI_BONUS, extra * MULTI_CAREER_BONUS));
  }

  return [...map.values()]
    .sort((a, b) => b.careerRelevance - a.careerRelevance)
    .slice(0, MAX_CANDIDATES);
}

// ── 惩罚 ────────────────────────────────────────────────────────────────
interface Penalty { amount: number; root: string | null; isHard: boolean; }

interface PenaltyResult {
  penalties: Penalty[];
  conflictTags: string[];
  hardHit: boolean;
  warnings: string[];
}

function collectPenalties(profile: ProfileTags, major: Major): PenaltyResult {
  const penalties: Penalty[] = [];
  const conflictTags: string[] = [];
  const warnings: string[] = [];

  // 结构化 not_recommended_if
  for (const cond of major.not_recommended_if ?? []) {
    // 只有学生显式命中(布尔true)才触发；subject_xxx==false 交给选科门槛，不在此处理
    if (/==/.test(cond)) continue;
    if (!boolTag(profile, cond)) continue;
    conflictTags.push(cond);
    if (HARD_EXCLUSION.has(cond)) {
      penalties.push({ amount: PENALTY_HARD, root: ROOT_CAUSE[cond] ?? cond, isHard: true });
    } else if (STRONG_PENALTY.has(cond)) {
      penalties.push({ amount: PENALTY_STRONG, root: ROOT_CAUSE[cond] ?? cond, isHard: false });
    } else {
      penalties.push({ amount: PENALTY_SOFT, root: ROOT_CAUSE[cond] ?? cond, isHard: false });
    }
  }

  // education_gate（缺失值不罚：tag>0 才生效）
  const ep = major.education_profile;
  const preferUndergrad = numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment');
  const acceptMaster = numTag(profile, 'education_plan_tags', 'accept_master');
  const acceptLong = numTag(profile, 'education_plan_tags', 'accept_long_training');
  const cert = numTag(profile, 'learning_style_tags', 'certificate_learning');
  if (preferUndergrad >= 4 && ep.master_requirement_score >= 4) penalties.push({ amount: 18, root: 'master', isHard: false });
  if (acceptMaster > 0 && acceptMaster <= 2 && ep.master_requirement_score >= 4) penalties.push({ amount: 30, root: 'master', isHard: false });
  if (acceptLong > 0 && acceptLong <= 2 && ep.long_training_score >= 4) penalties.push({ amount: 35, root: 'long_training', isHard: false });
  if (cert > 0 && cert <= 2 && ep.certificate_requirement_score >= 4) penalties.push({ amount: 12, root: 'certificate', isHard: false });
  if (major.catalog.maturity.includes('2025新增')) penalties.push({ amount: 6, root: 'new_major', isHard: false });

  // market 自适应惩罚（与 not_recommended_if 共享 root 去重）
  const ms = major.market_scores;
  if (ms.ai_substitution_risk >= 4 && boolTag(profile, 'constraint_tags.avoid_ai_substitution_risk'))
    penalties.push({ amount: 15, root: 'ai_substitution', isHard: false });
  if (ms.competition_level >= 4 && boolTag(profile, 'constraint_tags.avoid_high_competition'))
    penalties.push({ amount: 15, root: 'competition', isHard: false });
  if (ep.master_requirement_score >= 4 && boolTag(profile, 'constraint_tags.avoid_master_required'))
    penalties.push({ amount: 22, root: 'master', isHard: false });
  if (ms.city_concentration >= 4 &&
    (boolTag(profile, 'constraint_tags.avoid_big_city_concentration') ||
      (numTag(profile, 'career_value_tags', 'local_development') >= 4))) {
    penalties.push({ amount: 10, root: 'city', isHard: false });
  }
  if ((major.career_value_fit.salary_ceiling ?? 5) <= 3 && boolTag(profile, 'constraint_tags.avoid_low_income_ceiling'))
    penalties.push({ amount: 10, root: 'salary', isHard: false });

  if (major.catalog.discipline_category === '医学')
    warnings.push('医学类还需关注体检、色盲色弱、单科成绩与培养年限等高校招生章程要求。');

  // 红牌软门槛：就业预警专业加惩罚 + 顶部风险提示，但不剔除（仍可见）
  if (major.employment_warning) {
    penalties.push({ amount: RED_CARD_PENALTY, root: 'employment_warning', isHard: false });
    warnings.unshift(`就业预警：${major.employment_warning.note}`);
  }

  return { penalties, conflictTags, hardHit: penalties.some(p => p.isHard), warnings };
}

function dedupAndCap(items: Penalty[]): { total: number; hardHit: boolean } {
  const grouped = new Map<string, Penalty>();
  const ungrouped: Penalty[] = [];
  for (const it of items) {
    if (it.root) {
      const cur = grouped.get(it.root);
      if (!cur || it.amount > cur.amount) grouped.set(it.root, it);
    } else ungrouped.push(it);
  }
  const all = [...grouped.values(), ...ungrouped];
  const hardSum = all.filter(p => p.isHard).reduce((a, p) => a + p.amount, 0);
  const nonHard = Math.min(MAX_NON_HARD_PENALTY, all.filter(p => !p.isHard).reduce((a, p) => a + p.amount, 0));
  return { total: hardSum + nonHard, hardHit: all.some(p => p.isHard) };
}

// ── 理由 / 风险 ──────────────────────────────────────────────────────────
function buildReasons(
  profile: ProfileTags,
  major: Major,
  careerRelevance: number,
  subjectEligible: boolean,
  ability: number,
): string[] {
  const out: string[] = [];
  if (careerRelevance >= 80) out.push(REASON_TEMPLATES.career_relevance);
  if (subjectEligible) out.push(REASON_TEMPLATES.subject_eligible);
  if (ability >= 70) out.push(REASON_TEMPLATES.ability_match);
  const cands: Array<{ reason: string; score: number }> = [];
  for (const [path, req] of Object.entries(major.match_tags)) {
    const tpl = REASON_TEMPLATES[path];
    if (!tpl) continue;
    const [g, tag] = path.split('.');
    const sv = numTag(profile, g, tag);
    if (sv === 0) continue;
    const match = g === 'career_value_tags' ? provisionMatch(sv, req)
      : g === 'interest_tags' ? symmetricMatch(sv, req) : thresholdMatch(sv, req);
    if (match >= 0.5) cands.push({ reason: tpl, score: match });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) {
    if (!out.includes(c.reason)) out.push(c.reason);
    if (out.length >= REASON_MAX) break;
  }
  return out.slice(0, REASON_MAX);
}

function buildRiskNotes(major: Major, warnings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [...warnings, ...major.risk_notes]) {
    const t = (n ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t); out.push(t);
    if (out.length >= RISK_NOTE_MAX) break;
  }
  return out;
}

function conflictReason(tags: string[]): string {
  const parts = tags.map(t => CONFLICT_TEMPLATES[t] ?? t);
  return parts.length ? parts.join('；') : '与排除或约束条件冲突';
}

function bucketize(score: number): { level: 'A' | 'B' | 'C' | 'D'; label: string } {
  if (score >= 85) return { level: 'A', label: '强推荐' };
  if (score >= 70) return { level: 'B', label: '可考虑' };
  if (score >= 55) return { level: 'C', label: '谨慎考虑' };
  return { level: 'D', label: '不推荐' };
}

// ── 主流程 ──────────────────────────────────────────────────────────────
interface ScoredMajor extends MatchedMajor {
  _major: Major;
  _hardHit: boolean;
  _isDeepStudy: boolean;
  _conflictTags: string[];
}

interface MajorMatcherOptions {
  answeredTriggers?: Set<string>;
}

export function matchMajors(
  library: MajorLibrary,
  profile: ProfileTags,
  careers: MatchedCareer[],
  industries: MatchedIndustry[],
  options: MajorMatcherOptions = {},
): MajorMatcherResult {
  const answeredTriggers = options.answeredTriggers ?? new Set<string>();
  const studentSubjects = getStudentSubjects(profile);

  const sourceCareers: SourceCareer[] = careers.slice(0, 5).map(c => ({
    career_id: c.career_id, career_name: c.career_name, career_rank: c.rank, career_score: c.score,
  }));

  const candidates = buildCandidates(library, careers, industries);

  const ineligible: IneligibleMajor[] = [];
  const scored: ScoredMajor[] = [];

  for (const cand of candidates) {
    const major = cand.major;
    const reqAll = major.new_gaokao_subject_requirement_template.required_all ?? [];

    // 选科硬门槛（学生选科未知 → need_verify，不硬拦）
    const eligibility: SubjectEligibility = subjectEligibility(reqAll, studentSubjects);
    if (eligibility === 'ineligible') {
      if (ineligible.length < INELIGIBLE_MAX) {
        ineligible.push({
          major_id: major.major_id,
          major_name: major.major_name,
          reason: `该专业通常要求 ${reqAll.join('+')}，你的选科未满足。最终以所在省份和目标高校当年要求为准。`,
          subject_requirement: major.new_gaokao_subject_requirement_template,
        });
      }
      continue; // 选科不符不进入打分
    }

    const careerRelevance = Math.round(cand.careerRelevance);
    const ability = abilityMatch(profile, major);
    const interest = interestMatch(profile, major);
    const value = careerValueMatch(profile, major);
    const market = marketFit(profile, major);
    const education = educationFit(profile, major);

    const { penalties, conflictTags, warnings } = collectPenalties(profile, major);
    const { total: penalty, hardHit } = dedupAndCap(penalties);

    // 漏洞3：可报但缺"建议选科"→ 软提示（不降级、不影响打分），告知可报院校面会变窄
    if (eligibility === 'eligible') {
      const missRec = missingRecommendedSubjects(major.new_gaokao_subject_requirement_template.recommended, studentSubjects);
      if (missRec.length > 0) {
        warnings.unshift(`该专业建议选考「${missRec.join('、')}」，你的选科未包含；虽可报考，但可报院校范围可能变窄，以各省份和目标高校当年要求为准。`);
      }
    }

    const base =
      careerRelevance * DIM_WEIGHTS.career_relevance +
      ability * DIM_WEIGHTS.ability_match +
      interest * DIM_WEIGHTS.interest_match +
      value * DIM_WEIGHTS.career_value_match +
      market * DIM_WEIGHTS.market_fit +
      education * DIM_WEIGHTS.education_fit;
    const finalScore = Math.round(Math.max(0, Math.min(100, base - penalty)));
    const bucket = bucketize(finalScore);

    const isDeepStudy = major.education_profile.master_requirement_score >= 4 || major.education_profile.phd_requirement_score >= 3;

    scored.push({
      _major: major,
      _hardHit: hardHit,
      _isDeepStudy: isDeepStudy,
      _conflictTags: conflictTags,
      rank: 0,
      major_id: major.major_id,
      major_name: major.major_name,
      score: finalScore,
      level: bucket.level,
      level_label: bucket.label,
      discipline_category: major.catalog.discipline_category,
      major_class: major.catalog.major_class,
      maturity: major.catalog.maturity,
      is_new_major: major.catalog.maturity.includes('2025新增'),
      subject_eligibility: eligibility,
      subject_requirement: major.new_gaokao_subject_requirement_template,
      matched_careers: cand.matchedCareers,
      matched_industries: cand.matchedIndustries,
      why_recommended: buildReasons(profile, major, careerRelevance, eligibility === 'eligible', ability),
      risk_notes: buildRiskNotes(major, warnings),
      employment_warning: major.employment_warning ?? null,
      university_strategy: major.university_strategy ?? '',
      debug_scores: {
        career_relevance: careerRelevance,
        ability_match: Math.round(ability),
        interest_match: Math.round(interest),
        career_value_match: Math.round(value),
        market_fit: Math.round(market),
        education_fit: Math.round(education),
        penalty_score: Math.round(penalty),
      },
    });
  }

  const hardExcluded = scored.filter(s => s._hardHit);
  const eligible = scored.filter(s => !s._hardHit);

  // 深造型：读研/读博依赖高，且学生本科就业优先 → 分流到深造桶
  const preferUndergrad = numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment');
  const routeDeep = (s: ScoredMajor): boolean =>
    s._isDeepStudy && preferUndergrad >= 4 && numTag(profile, 'education_plan_tags', 'accept_master') < 4;

  const deepStudyItems = eligible.filter(routeDeep);
  const mainPool = eligible.filter(s => !routeDeep(s));

  mainPool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.debug_scores.career_relevance !== a.debug_scores.career_relevance)
      return b.debug_scores.career_relevance - a.debug_scores.career_relevance;
    // 同分时成熟专业优先于2025新增
    if (a.is_new_major !== b.is_new_major) return a.is_new_major ? 1 : -1;
    return 0;
  });

  // 分桶 A/B/C，A 类同专业类不超过 4
  const A: ScoredMajor[] = [], B: ScoredMajor[] = [], C: ScoredMajor[] = [], Dbucket: ScoredMajor[] = [];
  const classCountA = new Map<string, number>();
  for (const s of mainPool) {
    if (s.level === 'A') {
      const used = classCountA.get(s.major_class) ?? 0;
      if (A.length < A_MAX && used < MAX_SAME_CLASS_IN_A) { A.push(s); classCountA.set(s.major_class, used + 1); }
      else {
        // A 类满额 / 同专业类超 4 → 落 B，并重标档位，避免"A徽章出现在B桶"的展示不一致
        s.level = 'B';
        s.level_label = '可考虑';
        B.push(s);
      }
    } else if (s.level === 'B') B.push(s);
    else if (s.level === 'C') C.push(s);
    else Dbucket.push(s);
  }
  const Bcut = B.slice(0, B_MAX);
  const Ccut = C.slice(0, C_MAX);
  [...A, ...Bcut, ...Ccut].forEach((s, i) => { s.rank = i + 1; });

  const deepStudyMajors: DeepStudyMajor[] = deepStudyItems.slice(0, DEEP_MAX).map(s => ({
    major_id: s.major_id, major_name: s.major_name,
    reason: s._major.education_profile.phd_requirement_score >= 3
      ? '偏研究 / 读博路径，本科直接就业不是主路径，适合愿意深造的同学'
      : '高质量路径较依赖研究生学历，适合愿意读研的同学',
    education_profile: s._major.education_profile,
  }));

  const notRecommended: NotRecommendedMajor[] = [
    ...hardExcluded,
    ...Dbucket,
  ].slice(0, NOTREC_MAX).map(s => ({
    major_id: s.major_id, major_name: s.major_name,
    reason: s._conflictTags.length ? conflictReason(s._conflictTags) : '匹配度偏低或与目标冲突',
    conflict_tags: s._conflictTags,
  }));

  // 追问触发（已答不再透出）
  const topMajors = [...A, ...Bcut].map(s => s._major);
  const followupQuestions: FollowupQuestion[] = detectMajorFollowups(profile, topMajors, deepStudyItems.map(s => s._major))
    .filter(q => !answeredTriggers.has(q.trigger_code))
    .map(q => ({ ...q, options: FOLLOWUP_CATALOG_MAJOR[q.trigger_code] ?? [] }));

  const strip = (s: ScoredMajor): MatchedMajor => {
    const { _major, _hardHit, _isDeepStudy, _conflictTags, ...rest } = s;
    void _major; void _hardHit; void _isDeepStudy; void _conflictTags;
    return rest;
  };

  return {
    source_careers: sourceCareers,
    strong_recommend_majors: A.map(strip),
    consider_majors: Bcut.map(strip),
    cautious_majors: Ccut.map(strip),
    deep_study_majors: deepStudyMajors,
    ineligible_majors: ineligible,
    not_recommended_majors: notRecommended,
    followup_required: followupQuestions.length > 0,
    followup_questions: followupQuestions,
  };
}
