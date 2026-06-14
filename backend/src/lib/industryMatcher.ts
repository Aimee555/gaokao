import {
  buildMajorReqIndex,
  directionAccessibility,
  getStudentSubjects,
  subjectLockReason,
  type StudentSubjects,
} from './subjectGate.js';
import type {
  CoverageWarning,
  Industry,
  IndustryLibrary,
  MajorLibrary,
  MatchedIndustry,
  NotRecommendedIndustry,
  ProfileTags,
  QuestionnaireMode,
} from '../types.js';

const DIM_WEIGHTS = {
  career_value_match: 0.30,
  interest_match: 0.25,
  ability_match: 0.20,
  risk_tolerance_match: 0.15,
  education_plan_match: 0.10,
} as const;

const MARKET_BASE_WEIGHTS = {
  job_volume_score: 0.25,
  undergrad_employment_score: 0.20,
  salary_potential_score: 0.20,
  stability_score: 0.15,
  policy_support_score: 0.10,
  ai_resilience_score: 0.10,
} as const;

const SUPPORTING_GROUPS = ['learning_style_tags', 'work_scene_tags'];

const UNKNOWN_DEFAULT_MATCH = 0.55;
const CAREER_VALUE_INDUSTRY_DEFAULT = 2.5;

const COVERAGE_HARD_FLOOR = 0.3;
const COVERAGE_LOW_CONFIDENCE = 0.5;

const PENALTY_HARD = 60;
const PENALTY_STRONG = 35;
const PENALTY_SOFT = 18;

// 非硬排除惩罚（market自适应 + strong/soft）去重后的累加上限。
// 防止勾选多项 avoid 的谨慎学生被跨根因线性堆叠（实测可达54）整片打进D档。
// 硬排除(60)不受此限——它本就应让产业进入 not_recommended。
const MAX_NON_HARD_PENALTY = 40;

// 规则 reason_generation_rules：matched_reasons 3~6 条，risk_notes 2~5 条。
const REASON_MIN = 3;
const REASON_MAX = 6;
const REASON_STRONG_THRESHOLD = 0.5;
const REASON_FALLBACK_THRESHOLD = 0.35;
const RISK_NOTE_MAX = 5;

const ADAPTIVE_PENALTIES = {
  competition_penalty: 8,
  city_concentration_penalty: 8,
  master_requirement_penalty: 10,
  income_volatility_penalty: 8,
  ai_risk_penalty: 8,
} as const;

const HARD_EXCLUSION_PATTERNS = new Set([
  'exclusion_tags.no_medicine',
  'exclusion_tags.no_programming',
  'exclusion_tags.no_public_exam',
]);

const STRONG_PENALTY_PATTERNS = new Set([
  'exclusion_tags.no_long_training',
  'exclusion_tags.no_high_overtime',
  'exclusion_tags.no_factory_site',
  'constraint_tags.avoid_master_required',
  'constraint_tags.avoid_high_competition',
]);

const ROOT_CAUSE_NOT_REC: Record<string, string> = {
  'constraint_tags.avoid_master_required': 'master_requirement',
  'constraint_tags.avoid_high_competition': 'competition',
  'constraint_tags.avoid_big_city_concentration': 'city_concentration',
  'constraint_tags.avoid_ai_substitution_risk': 'ai_substitution',
  'constraint_tags.avoid_unstable_employment': 'income_volatility',
  // 产业库中avoid_income_volatility与avoid_unstable_employment混用（IND_CROSS_BORDER两者皆有），
  // 须归入同一根因，否则同根因重复扣分（18+18+8）。
  'constraint_tags.avoid_income_volatility': 'income_volatility',
};

const CONFLICT_TEMPLATES: Record<string, string> = {
  'exclusion_tags.no_medicine': '学生明确排斥医学或医院环境',
  'exclusion_tags.no_programming': '学生明确排斥编程',
  'exclusion_tags.no_sales': '学生明确排斥销售或强客户沟通',
  'exclusion_tags.no_public_exam': '学生明确不愿意考公考编',
  'exclusion_tags.no_factory_site': '学生不希望去工厂或工程现场',
  'exclusion_tags.no_long_training': '学生不接受长期培养或深造周期',
  'constraint_tags.avoid_high_competition': '学生希望规避高竞争',
  'constraint_tags.avoid_master_required': '学生希望规避读研依赖',
  'constraint_tags.avoid_big_city_concentration': '学生希望规避大城市岗位集中',
  'constraint_tags.avoid_ai_substitution_risk': '学生希望规避AI替代风险',
  'constraint_tags.avoid_income_volatility': '学生希望规避收入波动',
  'constraint_tags.avoid_unstable_employment': '学生希望规避就业不稳定',
  'constraint_tags.avoid_unclear_path': '学生希望规避路径不清晰',
  'constraint_tags.avoid_low_income_ceiling': '学生希望规避收入天花板低',
  'constraint_tags.avoid_family_resource_dependence': '学生希望规避依赖家庭资源',
  'constraint_tags.avoid_not_local_friendly': '学生希望规避本地就业不友好',
  'constraint_tags.subject_chemistry==false': '学生未选考化学，与该方向硬性选科要求冲突',
  'exclusion_tags.no_high_overtime': '学生不接受高强度加班',
};

const MAIN_DIM_GROUPS = [
  'career_value_tags',
  'interest_tags',
  'ability_tags',
  'risk_tolerance_tags',
  'education_plan_tags',
];

const REASON_TEMPLATES: Record<string, string> = {
  'career_value_tags.high_income': '高收入目标匹配',
  'career_value_tags.stability': '稳定就业目标匹配',
  'career_value_tags.technical_barrier': '技术壁垒目标匹配',
  'career_value_tags.undergrad_employment': '本科就业目标匹配',
  'career_value_tags.local_development': '本地发展目标匹配',
  'career_value_tags.public_sector': '体制内 / 编制 / 国企倾向匹配',
  'career_value_tags.long_term_growth': '长期成长性目标匹配',
  'career_value_tags.creativity': '创造性偏好匹配',
  'career_value_tags.social_value': '社会价值偏好匹配',
  'interest_tags.data': '数据分析兴趣较强',
  'interest_tags.code_system': '代码 / 系统兴趣较强',
  'interest_tags.machine': '机器设备和工程系统兴趣较强',
  'interest_tags.life_health': '生命健康兴趣较强',
  'interest_tags.people': '愿意与人沟通和服务',
  'interest_tags.business': '商业和运营兴趣较强',
  'interest_tags.text_expression': '文字表达和内容兴趣较强',
  'interest_tags.law_rules': '规则、法律和制度兴趣较强',
  'interest_tags.art_design': '艺术与设计兴趣较强',
  'interest_tags.nature_environment': '自然与环境兴趣较强',
  'ability_tags.math': '数学能力匹配',
  'ability_tags.logic': '逻辑能力匹配',
  'ability_tags.programming_acceptance': '编程接受度较高',
  'ability_tags.language_expression': '写作表达能力匹配',
  'ability_tags.memory': '记忆背诵能力匹配',
  'ability_tags.physics': '物理能力匹配',
  'ability_tags.hands_on': '动手能力匹配',
  'risk_tolerance_tags.competition_tolerance': '能接受一定竞争',
  'risk_tolerance_tags.overtime_tolerance': '能接受一定工作强度',
  'risk_tolerance_tags.big_city_tolerance': '能接受大城市发展',
  'education_plan_tags.accept_master': '能够接受继续深造',
  'education_plan_tags.prefer_undergrad_employment': '本科就业诉求匹配',
};

function studentTagValue(profile: ProfileTags, group: string, tag: string): number {
  const groupObj = (profile as unknown as Record<string, Record<string, number | boolean>>)[group];
  if (!groupObj) return 0;
  const val = groupObj[tag];
  return typeof val === 'number' ? val : 0;
}

function studentBooleanTag(profile: ProfileTags, path: string): boolean {
  const [group, tag] = path.split('.');
  if (!group || !tag) return false;
  const groupObj = (profile as unknown as Record<string, Record<string, boolean | number>>)[group];
  if (!groupObj) return false;
  return groupObj[tag] === true;
}

function studentHasBooleanKey(profile: ProfileTags, path: string): boolean {
  const [group, tag] = path.split('.');
  if (!group || !tag) return false;
  const groupObj = (profile as unknown as Record<string, Record<string, boolean | number>>)[group];
  if (!groupObj) return false;
  return tag in groupObj;
}

function thresholdMatch(student: number, industry: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  if (student >= industry) return 1;
  return Math.max(0, Math.min(1, 1 - (industry - student) / 4));
}

function symmetricMatch(student: number, industry: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  return Math.max(0, Math.min(1, 1 - Math.abs(student - industry) / 4));
}

function provisionMatch(student: number, industry: number): number {
  if (student === 0) return UNKNOWN_DEFAULT_MATCH;
  return Math.max(0, Math.min(1, 1 - Math.max(0, student - industry) / 4));
}

function computeDimensionMatch(
  profile: ProfileTags,
  industry: Industry,
  group: string,
  formula: 'threshold' | 'symmetric',
): number {
  let sum = 0;
  let count = 0;
  for (const [path, requiredValue] of Object.entries(industry.match_tags)) {
    const [g, tag] = path.split('.');
    if (g !== group) continue;
    const studentVal = studentTagValue(profile, group, tag);
    const match =
      formula === 'threshold'
        ? thresholdMatch(studentVal, requiredValue)
        : symmetricMatch(studentVal, requiredValue);
    sum += match;
    count += 1;
  }
  if (count === 0) return 55;
  return (sum / count) * 100;
}

function computeCareerValueMatch(profile: ProfileTags, industry: Industry): number {
  const studentTags = profile.career_value_tags;
  const studentEntries = Object.entries(studentTags).filter(([, v]) => typeof v === 'number' && v > 0);
  if (studentEntries.length === 0) return 55;

  let weightedSum = 0;
  let weightSum = 0;
  for (const [tag, studentVal] of studentEntries) {
    const path = `career_value_tags.${tag}`;
    const industryVal = industry.match_tags[path] ?? CAREER_VALUE_INDUSTRY_DEFAULT;
    const match = provisionMatch(studentVal, industryVal);
    weightedSum += match * studentVal;
    weightSum += studentVal;
  }
  if (weightSum === 0) return 55;
  return (weightedSum / weightSum) * 100;
}

function computeSupportingBonus(profile: ProfileTags, industry: Industry, dimScore: number): number {
  let sum = 0;
  let count = 0;
  for (const [path, requiredValue] of Object.entries(industry.match_tags)) {
    const [group, tag] = path.split('.');
    if (!SUPPORTING_GROUPS.includes(group)) continue;
    const studentVal = studentTagValue(profile, group, tag);
    // 未作答的辅助标签不参与：否则 0.55 中性默认值会给每个维度凭空加 ~5 分，
    // 把没采集学习方式/工作场景的学生整体抬高（详见 known_limitations 修复记录）。
    if (studentVal === 0) continue;
    sum += symmetricMatch(studentVal, requiredValue);
    count += 1;
  }
  if (count === 0) return 0;
  const supportAvg = sum / count;
  return Math.min(dimScore * 0.10, supportAvg * 10);
}

function computeProfileMatch(profile: ProfileTags, industry: Industry): number {
  const career_value = computeCareerValueMatch(profile, industry);
  const interest = computeDimensionMatch(profile, industry, 'interest_tags', 'symmetric');
  const ability = computeDimensionMatch(profile, industry, 'ability_tags', 'threshold');
  const risk_tolerance = computeDimensionMatch(profile, industry, 'risk_tolerance_tags', 'threshold');
  const education_plan = computeDimensionMatch(profile, industry, 'education_plan_tags', 'threshold');

  const withBonus = (s: number) => Math.min(100, s + computeSupportingBonus(profile, industry, s));

  const total =
    withBonus(career_value) * DIM_WEIGHTS.career_value_match +
    withBonus(interest) * DIM_WEIGHTS.interest_match +
    withBonus(ability) * DIM_WEIGHTS.ability_match +
    withBonus(risk_tolerance) * DIM_WEIGHTS.risk_tolerance_match +
    withBonus(education_plan) * DIM_WEIGHTS.education_plan_match;

  return Math.max(0, Math.min(100, total));
}

function computeMarketFit(industry: Industry): number {
  const m = industry.market_scores;
  const aiResilience = 6 - m.ai_substitution_risk;
  const weightedAvg =
    m.job_volume_score * MARKET_BASE_WEIGHTS.job_volume_score +
    m.undergrad_employment_score * MARKET_BASE_WEIGHTS.undergrad_employment_score +
    m.salary_potential_score * MARKET_BASE_WEIGHTS.salary_potential_score +
    m.stability_score * MARKET_BASE_WEIGHTS.stability_score +
    m.policy_support_score * MARKET_BASE_WEIGHTS.policy_support_score +
    aiResilience * MARKET_BASE_WEIGHTS.ai_resilience_score;
  return Math.max(0, Math.min(100, ((weightedAvg - 1) / 4) * 100));
}

function computeCoverage(profile: ProfileTags, industry: Industry): number {
  let total = 0;
  let known = 0;
  for (const path of Object.keys(industry.match_tags)) {
    const [group, tag] = path.split('.');
    if (!MAIN_DIM_GROUPS.includes(group)) continue;
    total += 1;
    if (studentTagValue(profile, group, tag) > 0) known += 1;
  }
  if (total === 0) return 1;
  return known / total;
}

interface PenaltyItem {
  source: string;
  amount: number;
  rootCause: string | null;
  isHard: boolean;
}

function collectMarketAdaptivePenalties(profile: ProfileTags, industry: Industry): PenaltyItem[] {
  const m = industry.market_scores;
  const items: PenaltyItem[] = [];

  const competitionTol = studentTagValue(profile, 'risk_tolerance_tags', 'competition_tolerance');
  if (m.competition_level >= 4 && competitionTol > 0 && competitionTol <= 2) {
    items.push({
      source: 'market.competition_penalty',
      amount: ADAPTIVE_PENALTIES.competition_penalty,
      rootCause: 'competition',
      isHard: false,
    });
  }

  const bigCityTol = studentTagValue(profile, 'risk_tolerance_tags', 'big_city_tolerance');
  if (
    m.city_concentration >= 4 &&
    ((bigCityTol > 0 && bigCityTol <= 2) ||
      studentBooleanTag(profile, 'constraint_tags.avoid_big_city_concentration'))
  ) {
    items.push({
      source: 'market.city_concentration_penalty',
      amount: ADAPTIVE_PENALTIES.city_concentration_penalty,
      rootCause: 'city_concentration',
      isHard: false,
    });
  }

  const acceptMaster = studentTagValue(profile, 'education_plan_tags', 'accept_master');
  if (
    m.master_requirement >= 4 &&
    ((acceptMaster > 0 && acceptMaster <= 2) ||
      studentBooleanTag(profile, 'constraint_tags.avoid_master_required'))
  ) {
    items.push({
      source: 'market.master_requirement_penalty',
      amount: ADAPTIVE_PENALTIES.master_requirement_penalty,
      rootCause: 'master_requirement',
      isHard: false,
    });
  }

  // avoid_income_volatility 与 avoid_unstable_employment 语义重复、产业库中混用，任一命中即触发。
  if (
    m.stability_score <= 2 &&
    (studentBooleanTag(profile, 'constraint_tags.avoid_income_volatility') ||
      studentBooleanTag(profile, 'constraint_tags.avoid_unstable_employment'))
  ) {
    items.push({
      source: 'market.income_volatility_penalty',
      amount: ADAPTIVE_PENALTIES.income_volatility_penalty,
      rootCause: 'income_volatility',
      isHard: false,
    });
  }

  if (
    m.ai_substitution_risk >= 4 &&
    studentBooleanTag(profile, 'constraint_tags.avoid_ai_substitution_risk')
  ) {
    items.push({
      source: 'market.ai_risk_penalty',
      amount: ADAPTIVE_PENALTIES.ai_risk_penalty,
      rootCause: 'ai_substitution',
      isHard: false,
    });
  }

  return items;
}

interface ConditionEval {
  matched: boolean;
  missing: boolean;
}

function evalCondition(profile: ProfileTags, cond: string): ConditionEval {
  const eqFalse = cond.match(/^(.+?)==\s*false\s*$/);
  if (eqFalse) {
    const path = eqFalse[1].trim();
    if (!studentHasBooleanKey(profile, path)) {
      return { matched: false, missing: true };
    }
    return { matched: !studentBooleanTag(profile, path), missing: false };
  }
  const eqTrue = cond.match(/^(.+?)==\s*true\s*$/);
  if (eqTrue) {
    const path = eqTrue[1].trim();
    if (!studentHasBooleanKey(profile, path)) {
      return { matched: false, missing: true };
    }
    return { matched: studentBooleanTag(profile, path), missing: false };
  }
  if (!studentHasBooleanKey(profile, cond)) {
    return { matched: false, missing: true };
  }
  return { matched: studentBooleanTag(profile, cond), missing: false };
}

function classifyCondition(cond: string): 'hard' | 'strong' | 'soft' {
  if (HARD_EXCLUSION_PATTERNS.has(cond)) return 'hard';
  if (STRONG_PENALTY_PATTERNS.has(cond)) return 'strong';
  if (/^constraint_tags\.subject_\w+==\s*false\s*$/.test(cond)) return 'hard';
  return 'soft';
}

function collectNotRecPenalties(
  profile: ProfileTags,
  industry: Industry,
): { penalties: PenaltyItem[]; missingHardWarnings: string[]; conflictTags: string[] } {
  const conditions = industry.not_recommended_if ?? [];
  const penalties: PenaltyItem[] = [];
  const missingHardWarnings: string[] = [];
  const conflictTags: string[] = [];

  for (const cond of conditions) {
    const cls = classifyCondition(cond);
    const ev = evalCondition(profile, cond);

    if (ev.missing) {
      if (cls === 'hard') {
        missingHardWarnings.push(`该方向对 ${cond} 有硬性要求，请确认你的选科或意愿。`);
      }
      continue;
    }
    if (!ev.matched) continue;

    conflictTags.push(cond);
    const amount = cls === 'hard' ? PENALTY_HARD : cls === 'strong' ? PENALTY_STRONG : PENALTY_SOFT;
    penalties.push({
      source: `not_rec.${cond}`,
      amount,
      rootCause: ROOT_CAUSE_NOT_REC[cond] ?? null,
      isHard: cls === 'hard',
    });
  }

  return { penalties, missingHardWarnings, conflictTags };
}

function deduplicatePenalties(items: PenaltyItem[]): PenaltyItem[] {
  const grouped = new Map<string, PenaltyItem>();
  const ungrouped: PenaltyItem[] = [];
  for (const item of items) {
    if (item.rootCause) {
      const cur = grouped.get(item.rootCause);
      if (!cur || item.amount > cur.amount) grouped.set(item.rootCause, item);
    } else {
      ungrouped.push(item);
    }
  }
  return [...grouped.values(), ...ungrouped];
}

function buildReasons(profile: ProfileTags, industry: Industry): string[] {
  const candidates: Array<{ path: string; reason: string; score: number }> = [];
  for (const [path, requiredValue] of Object.entries(industry.match_tags)) {
    const reason = REASON_TEMPLATES[path];
    if (!reason) continue;
    const [group, tag] = path.split('.');
    const studentVal = studentTagValue(profile, group, tag);
    if (studentVal === 0) continue;

    let match: number;
    if (group === 'career_value_tags') {
      match = provisionMatch(studentVal, requiredValue);
    } else if (group === 'interest_tags') {
      match = symmetricMatch(studentVal, requiredValue);
    } else {
      match = thresholdMatch(studentVal, requiredValue);
    }
    candidates.push({ path, reason, score: match });
  }
  candidates.sort((a, b) => b.score - a.score);

  // 先取强匹配(>=0.5)；不足 REASON_MIN 时放宽到 0.35 兜底，尽量满足规则下限。
  const strong = candidates.filter(c => c.score >= REASON_STRONG_THRESHOLD);
  let picked = strong;
  if (picked.length < REASON_MIN) {
    picked = candidates.filter(c => c.score >= REASON_FALLBACK_THRESHOLD);
  }
  return picked.slice(0, REASON_MAX).map(c => c.reason);
}

function bucketize(score: number): { level: 'A' | 'B' | 'C' | 'D'; label: string } {
  if (score >= 85) return { level: 'A', label: '强推荐' };
  if (score >= 70) return { level: 'B', label: '可考虑' };
  if (score >= 55) return { level: 'C', label: '谨慎考虑' };
  return { level: 'D', label: '不推荐' };
}

export interface MatcherResult {
  recommended: MatchedIndustry[];
  extensionIndustries: MatchedIndustry[];
  notRecommendedCount: number;
  notRecommendedIndustries: NotRecommendedIndustry[];
  coverageWarnings: CoverageWarning[];
  insufficientData: boolean;
}

interface MatcherOptions {
  mode: QuestionnaireMode;
  topN?: number;
  majorLibrary?: MajorLibrary; // 提供后启用「选科锁死」向上传播（方案A）
}

interface ScoredItem extends MatchedIndustry {
  _hardHit: boolean;
  _industryRef: Industry;
  _conflictTags: string[];
  _scoreBeforePenalty: number;
  _subjectLocked: boolean;
  _subjectLockReason: string;
}

function stripInternal(item: ScoredItem): MatchedIndustry {
  const { _hardHit, _industryRef, _conflictTags, _scoreBeforePenalty, _subjectLocked, _subjectLockReason, ...rest } = item;
  void _hardHit;
  void _industryRef;
  void _conflictTags;
  void _scoreBeforePenalty;
  void _subjectLocked;
  void _subjectLockReason;
  return rest;
}

function conflictReason(conflictTags: string[]): string {
  const parts = conflictTags.map(c => CONFLICT_TEMPLATES[c] ?? c).filter(Boolean);
  if (parts.length === 0) return '与排除或约束条件冲突';
  return parts.join('；');
}

function missingMainGroups(profile: ProfileTags, industry: Industry): string[] {
  const groups = new Set<string>();
  for (const path of Object.keys(industry.match_tags)) {
    const [group, tag] = path.split('.');
    if (!MAIN_DIM_GROUPS.includes(group)) continue;
    if (studentTagValue(profile, group, tag) === 0) groups.add(group);
  }
  return [...groups];
}

export function matchIndustries(
  library: IndustryLibrary,
  profile: ProfileTags,
  options: MatcherOptions,
): MatcherResult {
  const { mode, topN = 5 } = options;
  const scored: ScoredItem[] = [];
  const coverageWarnings: CoverageWarning[] = [];
  let totalCandidates = 0;

  // 选科锁死检测：学生选科 + 专业库 required_all 索引（未提供专业库则不启用）
  const studentSubjects: StudentSubjects = getStudentSubjects(profile);
  const majorReqIndex = options.majorLibrary ? buildMajorReqIndex(options.majorLibrary) : null;

  for (const industry of library.industries) {
    totalCandidates += 1;
    const coverage = computeCoverage(profile, industry);
    if (coverage < COVERAGE_HARD_FLOOR) {
      coverageWarnings.push({
        industry_id: industry.industry_id,
        industry_name: industry.industry_name,
        coverage: Math.round(coverage * 100) / 100,
        missing_groups: missingMainGroups(profile, industry),
      });
      continue;
    }

    const profileMatch = computeProfileMatch(profile, industry);
    const marketFit = computeMarketFit(industry);

    const marketPenalties = collectMarketAdaptivePenalties(profile, industry);
    const {
      penalties: notRecPenalties,
      missingHardWarnings,
      conflictTags,
    } = collectNotRecPenalties(profile, industry);

    const dedup = deduplicatePenalties([...marketPenalties, ...notRecPenalties]);
    const hardHit = dedup.some(p => p.isHard);
    // 硬排除全额累加；非硬惩罚去重后封顶，避免跨根因无限堆叠。
    const hardPenalty = dedup.filter(p => p.isHard).reduce((acc, p) => acc + p.amount, 0);
    const nonHardPenalty = Math.min(
      MAX_NON_HARD_PENALTY,
      dedup.filter(p => !p.isHard).reduce((acc, p) => acc + p.amount, 0),
    );
    const totalPenalty = hardPenalty + nonHardPenalty;

    const scoreBeforePenalty = Math.round(
      Math.max(0, Math.min(100, profileMatch * 0.70 + marketFit * 0.30)),
    );
    const finalScore = Math.round(
      Math.max(0, Math.min(100, profileMatch * 0.70 + marketFit * 0.30 - totalPenalty)),
    );
    // 选科锁死：该产业的关联专业在学生选科下全部不达标 → 视为硬排除，不进推荐
    let subjectLocked = false;
    let subjectLockReasonText = '';
    if (majorReqIndex) {
      const acc = directionAccessibility(industry.related_majors, majorReqIndex, studentSubjects);
      if (acc.locked) {
        subjectLocked = true;
        subjectLockReasonText = subjectLockReason(acc.missingSubjects);
      }
    }

    const bucket = bucketize(finalScore);
    const reasons = buildReasons(profile, industry);
    const lowConfidence = coverage < COVERAGE_LOW_CONFIDENCE;
    // risk_notes 规则要求 2~5 条：硬性预警优先，其次产业固有风险，最后裁剪到5条。
    const riskNotes = [...missingHardWarnings, ...industry.risk_notes].slice(0, RISK_NOTE_MAX);

    scored.push({
      _hardHit: hardHit,
      _industryRef: industry,
      _conflictTags: conflictTags,
      _scoreBeforePenalty: scoreBeforePenalty,
      _subjectLocked: subjectLocked,
      _subjectLockReason: subjectLockReasonText,
      rank: 0,
      industry_id: industry.industry_id,
      industry_name: industry.industry_name,
      industry_type: industry.industry_type ?? 'industrial_sector',
      tier: industry.tier,
      score: finalScore,
      level: bucket.level,
      level_label: bucket.label,
      profile_match_score: Math.round(profileMatch),
      market_fit_score: Math.round(marketFit),
      penalty_score: Math.round(totalPenalty),
      coverage: Math.round(coverage * 100) / 100,
      low_confidence: lowConfidence,
      matched_reasons: reasons,
      risk_notes: riskNotes,
      related_career_paths: industry.related_career_paths,
      related_majors: industry.related_majors,
      recommendation_note: industry.recommendation_note,
    });
  }

  const eligible = scored.filter(s => !s._hardHit && !s._subjectLocked);
  const hardExcluded = scored.filter(s => s._hardHit || s._subjectLocked);

  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.profile_match_score !== a.profile_match_score) return b.profile_match_score - a.profile_match_score;
    const aMS = a._industryRef.market_scores;
    const bMS = b._industryRef.market_scores;
    if (bMS.undergrad_employment_score !== aMS.undergrad_employment_score)
      return bMS.undergrad_employment_score - aMS.undergrad_employment_score;
    if (bMS.job_volume_score !== aMS.job_volume_score) return bMS.job_volume_score - aMS.job_volume_score;
    return bMS.stability_score - aMS.stability_score;
  });

  // low_confidence 不分模式都应挤出 Top3（规则 coverage_confidence_rule 无条件约束）。
  // 快问卷不会因此清空结果：低置信项被推到 rest，仍由下方 graceful fill 兜底进主列表，
  // 只是不占据"高置信"的前排位置。
  const top3Excludable = (item: ScoredItem): boolean => {
    if (item.tier === 'future_frontier') return true;
    if (item.low_confidence) return true;
    return false;
  };
  void mode;

  const top3: ScoredItem[] = [];
  const rest: ScoredItem[] = [];
  for (const item of eligible) {
    if (top3.length < 3 && !top3Excludable(item)) top3.push(item);
    else rest.push(item);
  }

  const mainList = [...top3, ...rest].slice(0, topN);
  mainList.forEach((it, i) => {
    it.rank = i + 1;
  });

  const extension: ScoredItem[] = [];
  const acceptMaster = studentTagValue(profile, 'education_plan_tags', 'accept_master');
  if (acceptMaster >= 4) {
    const inMain = new Set(mainList.map(m => m.industry_id));
    const frontierCand = eligible.find(
      s => s.tier === 'future_frontier' && s.profile_match_score >= 85 && !inMain.has(s.industry_id),
    );
    if (frontierCand) {
      extension.push({ ...frontierCand, rank: 1 });
    }
  }

  // not_recommended_industries：硬排除命中 + 落入D档（score < 55）的产业。
  // 覆盖率过低被跳过的产业不算"不推荐"，而是单独走 coverageWarnings。
  const mainIds = new Set(mainList.map(m => m.industry_id));
  const notRecommendedItems: ScoredItem[] = [
    ...hardExcluded,
    ...eligible.filter(s => s.level === 'D' && !mainIds.has(s.industry_id)),
  ];
  const notRecommendedIndustries: NotRecommendedIndustry[] = notRecommendedItems.map(s => ({
    industry_id: s.industry_id,
    industry_name: s.industry_name,
    score_before_penalty: s._scoreBeforePenalty,
    final_score: s.score,
    reason: s._subjectLocked
      ? s._subjectLockReason
      : s._conflictTags.length > 0 ? conflictReason(s._conflictTags) : '画像匹配度偏低',
    conflict_tags: s._subjectLocked ? [...s._conflictTags, 'subject_locked'] : s._conflictTags,
  }));

  // 信息不足：没有任何产业过覆盖率门槛，或主列表 Top3 全是低置信结果
  // （即便给了推荐，区分度也不可信，应提示补充测评）。
  const mainTop3 = mainList.slice(0, 3);
  const insufficientData =
    mainList.length === 0 || (mainTop3.length > 0 && mainTop3.every(it => it.low_confidence));

  return {
    recommended: mainList.map(stripInternal),
    extensionIndustries: extension.map(stripInternal),
    notRecommendedCount: notRecommendedIndustries.length,
    notRecommendedIndustries,
    coverageWarnings,
    insufficientData,
  };
}
