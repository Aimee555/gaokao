import type { FollowupOption, Major, ProfileTags } from '../types.js';

function numTag(profile: ProfileTags, group: string, tag: string): number {
  const g = (profile as unknown as Record<string, Record<string, number | boolean>>)[group];
  if (!g) return 0;
  const v = g[tag];
  return typeof v === 'number' ? v : 0;
}

function isProgrammingMajor(m: Major): boolean {
  return (m.ability_requirements.programming_requirement ?? 0) >= 4 ||
    /计算机|软件|人工智能|数据科学|信息安全|网络空间|物联网/.test(m.major_name);
}
function isMedicalMajor(m: Major): boolean {
  return m.catalog.discipline_category === '医学';
}
function isDeepStudyMajor(m: Major): boolean {
  return m.education_profile.master_requirement_score >= 4 || m.education_profile.phd_requirement_score >= 3;
}
function isPublicFriendly(m: Major): boolean {
  return (m.career_value_fit.public_sector_fit ?? 0) >= 4;
}
function isHighIncomeTech(m: Major): boolean {
  return (m.career_value_fit.high_income_fit ?? 0) >= 4 && (m.career_value_fit.technical_barrier_fit ?? 0) >= 4;
}
function isNewMajor(m: Major): boolean {
  return m.catalog.maturity.includes('2025新增');
}

export const FOLLOWUP_CATALOG_MAJOR: Record<string, FollowupOption[]> = {
  programming_major_but_uncertain: [
    { code: 'accept', label: '能，愿意长期写代码做项目', tag_effects: { 'ability_tags.programming_acceptance': 5 } },
    { code: 'ok', label: '可以接受，会努力学', tag_effects: { 'ability_tags.programming_acceptance': 4 } },
    { code: 'reluctant', label: '不太喜欢，但必要时能做', tag_effects: { 'ability_tags.programming_acceptance': 2 } },
    { code: 'reject', label: '明确不想长期写代码', tag_effects: { 'ability_tags.programming_acceptance': 1, 'exclusion_tags.no_programming': true } },
  ],
  medical_major_but_long_training_uncertain: [
    { code: 'accept', label: '能接受医学的长培养周期', tag_effects: { 'education_plan_tags.accept_long_training': 5, 'education_plan_tags.accept_master': 4 } },
    { code: 'reject', label: '不能接受 5 年 + 规培 + 考研', tag_effects: { 'education_plan_tags.accept_long_training': 1 } },
  ],
  deep_study_major_conflict: [
    { code: 'undergrad', label: '本科毕业尽快就业', tag_effects: { 'education_plan_tags.prefer_undergrad_employment': 5, 'education_plan_tags.accept_master': 2 } },
    { code: 'master', label: '愿意为更高上限读研', tag_effects: { 'education_plan_tags.accept_master': 5, 'education_plan_tags.prefer_undergrad_employment': 2 } },
  ],
  public_sector_vs_high_income_conflict: [
    { code: 'stable', label: '更看重稳定编制', tag_effects: { 'career_value_tags.public_sector': 5, 'career_value_tags.stability': 5, 'career_value_tags.high_income': 3 } },
    { code: 'income', label: '更看重收入上限', tag_effects: { 'career_value_tags.high_income': 5, 'career_value_tags.public_sector': 2 } },
  ],
  new_major_selected: [
    { code: 'open', label: '愿意尝试新专业', tag_effects: {} },
    { code: 'mature', label: '更倾向成熟专业', tag_effects: {} },
  ],
};

interface FollowupDef {
  trigger_code: string;
  question: string;
  purpose: string;
}

export function detectMajorFollowups(
  profile: ProfileTags,
  topMajors: Major[],
  deepMajors: Major[],
): FollowupDef[] {
  const out: FollowupDef[] = [];
  const ab = topMajors;

  if (numTag(profile, 'ability_tags', 'programming_acceptance') > 0 &&
      numTag(profile, 'ability_tags', 'programming_acceptance') <= 3 &&
      ab.some(isProgrammingMajor)) {
    out.push({
      trigger_code: 'programming_major_but_uncertain',
      question: '如果大学专业需要长期写代码、做项目和调试系统，你能接受吗？',
      purpose: '确认计算机、软件、AI、数据科学是否适合作为主推。',
    });
  }
  if (numTag(profile, 'education_plan_tags', 'accept_long_training') > 0 &&
      numTag(profile, 'education_plan_tags', 'accept_long_training') <= 3 &&
      ab.some(isMedicalMajor)) {
    out.push({
      trigger_code: 'medical_major_but_long_training_uncertain',
      question: '你能接受医学类较长培养周期吗？例如本科 5 年、规培、执业资格、考研。',
      purpose: '确认临床医学、口腔医学、医学影像等是否适合。',
    });
  }
  if (numTag(profile, 'education_plan_tags', 'prefer_undergrad_employment') >= 4 &&
      (ab.some(isDeepStudyMajor) || deepMajors.length > 0)) {
    out.push({
      trigger_code: 'deep_study_major_conflict',
      question: '你更希望本科毕业尽快就业，还是愿意为了更高上限继续读研？',
      purpose: '区分本科就业友好专业与深造型专业。',
    });
  }
  if (ab.some(isPublicFriendly) && ab.some(isHighIncomeTech)) {
    out.push({
      trigger_code: 'public_sector_vs_high_income_conflict',
      question: '如果稳定编制和收入上限只能优先一个，你更看重哪一个？',
      purpose: '决定法学、汉语言、会计与计算机、电气等不同策略专业的展示排序。',
    });
  }
  if (ab.some(isNewMajor)) {
    out.push({
      trigger_code: 'new_major_selected',
      question: '你是否愿意选择一个培养方案和就业反馈还在早期的新增专业？',
      purpose: '避免仅因专业名称新而盲选。',
    });
  }
  return out;
}

/** 把专业追问回答回灌进画像（与 careerMatcher.applyFollowupAnswers 同构）。 */
export function applyMajorFollowupAnswers(
  profile: ProfileTags,
  answers: Array<{ trigger_code: string; selected_code: string }>,
): ProfileTags {
  const next = JSON.parse(JSON.stringify(profile)) as ProfileTags;
  const mut = next as unknown as Record<string, Record<string, number | boolean>>;
  for (const ans of answers) {
    const opts = FOLLOWUP_CATALOG_MAJOR[ans.trigger_code];
    if (!opts) continue;
    const opt = opts.find(o => o.code === ans.selected_code);
    if (!opt) continue;
    for (const [path, val] of Object.entries(opt.tag_effects)) {
      const [group, tag] = path.split('.');
      if (!group || !tag || !mut[group]) continue;
      if (typeof val === 'boolean') { if (val) mut[group][tag] = true; }
      else mut[group][tag] = Math.max(0, Math.min(5, val));
    }
  }
  return next;
}
