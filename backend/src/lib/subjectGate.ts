import type { MajorLibrary, ProfileTags, SubjectEligibility } from '../types.js';

// 选科标签 → 中文科目名（前后端、各匹配层共用唯一来源）
export const SUBJECT_MAP: Record<string, string> = {
  subject_physics: '物理',
  subject_chemistry: '化学',
  subject_biology: '生物',
  subject_history: '历史',
  subject_politics: '政治',
  subject_geography: '地理',
  subject_technology: '技术',
};

function boolTag(profile: ProfileTags, path: string): boolean {
  const [g, t] = path.split('.');
  if (!g || !t) return false;
  const grp = (profile as unknown as Record<string, Record<string, number | boolean>>)[g];
  return !!grp && grp[t] === true;
}

export interface StudentSubjects {
  subjects: Set<string>;
  known: boolean;
}

// 从画像读出学生已选科目；一个都没采集到 → known=false（按"待核实"处理，不硬拦）
export function getStudentSubjects(profile: ProfileTags): StudentSubjects {
  const subjects = new Set<string>();
  for (const [tag, cn] of Object.entries(SUBJECT_MAP)) {
    if (boolTag(profile, `constraint_tags.${tag}`)) subjects.add(cn);
  }
  return { subjects, known: subjects.size > 0 };
}

// 单个专业的选科资格：无要求→eligible；学生选科未知→need_verify；否则按 required_all 全包含判定
export function subjectEligibility(reqAll: string[], s: StudentSubjects): SubjectEligibility {
  if (!reqAll || reqAll.length === 0) return 'eligible';
  if (!s.known) return 'need_verify';
  return reqAll.every(x => s.subjects.has(x)) ? 'eligible' : 'ineligible';
}

// major_name → required_all 索引（产业/职业层据此判断方向是否被选科锁死）
export function buildMajorReqIndex(lib: MajorLibrary): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const mj of lib.majors) {
    m.set(mj.major_name, mj.new_gaokao_subject_requirement_template?.required_all ?? []);
  }
  return m;
}

export interface DirectionAccessibility {
  total: number; // 在专业库中能查到的入口专业数
  accessible: number; // 选科可达（eligible / need_verify）的数量
  ineligible: number; // 选科明确不达标的数量
  locked: boolean; // 学生选科已知，且全部入口专业都不达标 → 该方向被选科锁死
  missingSubjects: string[]; // 学生缺、却被入口专业普遍要求的科目（用于文案）
}

/**
 * 方案 A 核心：把"选科硬门槛"从专业层向上传播到产业/职业层。
 * 给定一个方向（产业/职业）的入口专业名单，判断学生当前选科能否进入其中任何一条路径。
 * 只统计能在专业库查到的专业；查不到的不计入（无法判定，从宽）。
 * locked 的判定是保守的：只要有一条可达路径，就不算锁死。
 */
export function directionAccessibility(
  majorNames: string[],
  reqIndex: Map<string, string[]>,
  s: StudentSubjects,
): DirectionAccessibility {
  let total = 0;
  let accessible = 0;
  let ineligible = 0;
  const missing = new Set<string>();
  for (const name of majorNames ?? []) {
    const req = reqIndex.get(name);
    if (req === undefined) continue; // 不在库，无法判定
    total += 1;
    const e = subjectEligibility(req, s);
    if (e === 'ineligible') {
      ineligible += 1;
      for (const sub of req) if (!s.subjects.has(sub)) missing.add(sub);
    } else {
      accessible += 1;
    }
  }
  const locked = s.known && total > 0 && accessible === 0;
  return { total, accessible, ineligible, locked, missingSubjects: [...missing] };
}

// 选科锁死方向的统一文案
export function subjectLockReason(missingSubjects: string[]): string {
  const subj = missingSubjects.length ? `「${missingSubjects.join('、')}」` : '物理 / 化学等理科';
  return `该方向的入口专业普遍要求${subj}选科，而你的选科未覆盖，本科阶段基本无法报考；最终以各省份和目标高校当年招生要求为准。`;
}

/**
 * 选科组合合法性校验（省份无关，只给非阻断提示，不拦结果）。
 * - 全国各模式都恰好选 3 门 → 数量 ≠ 3 提示填写。
 * - 物理+历史同选：仅「3+3」省份（浙江/上海/北京/天津/山东/海南）成立，
 *   「3+1+2」省份二者互斥 → 提示考生确认所在省份，避免误点绕过选科门槛。
 */
export function validateSubjectSelection(s: StudentSubjects): string[] {
  if (!s.known) return [];
  const warnings: string[] = [];
  if (s.subjects.size !== 3) {
    warnings.push(`你勾选了 ${s.subjects.size} 门选科，通常应恰好选 3 门，请确认选科填写完整。`);
  }
  if (s.subjects.has('物理') && s.subjects.has('历史')) {
    warnings.push(
      '你同时选了物理和历史：这仅在「3+3」省份（如浙江、上海、北京、天津、山东、海南）成立；' +
        '若你所在省份是「3+1+2」，物理与历史只能二选一，请确认，否则推荐结果可能放宽了本不该开放的专业。',
    );
  }
  return warnings;
}

// 该专业"建议选考"里、学生尚未覆盖的科目（用于软提示，不降级）
export function missingRecommendedSubjects(recommended: string[], s: StudentSubjects): string[] {
  if (!s.known || !recommended) return [];
  return recommended.filter(sub => !s.subjects.has(sub));
}
