import type {
  ProfileTags,
  Question,
  Questionnaire,
  RawAnswer,
} from '../types.js';

const NUMERIC_GROUPS = [
  'interest_tags',
  'ability_tags',
  'career_value_tags',
  'risk_tolerance_tags',
  'learning_style_tags',
  'education_plan_tags',
  'work_scene_tags',
] as const;

const BOOLEAN_GROUPS = ['exclusion_tags', 'constraint_tags'] as const;

const RANKING_WEIGHTS = [5, 4, 3, 2, 1];

function emptyProfile(): ProfileTags {
  return {
    interest_tags: {},
    ability_tags: {},
    career_value_tags: {},
    risk_tolerance_tags: {},
    learning_style_tags: {},
    education_plan_tags: {},
    work_scene_tags: {},
    exclusion_tags: {},
    constraint_tags: {},
  };
}

function applyEffect(
  profile: ProfileTags,
  path: string,
  value: number,
): void {
  const [group, tag] = path.split('.');
  if (!group || !tag) return;

  if ((BOOLEAN_GROUPS as readonly string[]).includes(group)) {
    const target = profile[group as keyof ProfileTags] as Record<string, boolean>;
    if (value > 0) target[tag] = true;
    return;
  }

  if ((NUMERIC_GROUPS as readonly string[]).includes(group)) {
    const target = profile[group as keyof ProfileTags] as Record<string, number>;
    const current = target[tag] ?? 0;
    target[tag] = Math.min(5, current + value);
  }
}

function applyEffects(
  profile: ProfileTags,
  effects: Record<string, number> | undefined,
  multiplier: number,
): void {
  if (!effects) return;
  for (const [path, raw] of Object.entries(effects)) {
    if (path === 'custom_raw_text') continue;
    applyEffect(profile, path, raw * multiplier);
  }
}

function findQuestion(questions: Question[], id: string): Question | undefined {
  return questions.find(q => q.id === id);
}

function findOption(question: Question, code: string) {
  return question.options?.find(o => o.code === code);
}

export function buildProfile(
  questionnaire: Questionnaire,
  answers: RawAnswer[],
): ProfileTags {
  const profile = emptyProfile();
  const questions = questionnaire.questions;

  for (const ans of answers) {
    const q = findQuestion(questions, ans.question_id);
    if (!q) continue;

    switch (q.type) {
      case 'single_choice': {
        if (!ans.selected_code) break;
        const opt = findOption(q, ans.selected_code);
        if (!opt) break;
        applyEffects(profile, opt.tag_effects, 1);
        break;
      }
      case 'multi_select': {
        const codes = ans.selected_codes ?? [];
        for (const code of codes) {
          const opt = findOption(q, code);
          if (opt) applyEffects(profile, opt.tag_effects, 1);
        }
        break;
      }
      case 'ranking_multi_select': {
        const codes = ans.ranked_codes ?? [];
        codes.forEach((code, idx) => {
          const weight = RANKING_WEIGHTS[idx] ?? 1;
          const opt = findOption(q, code);
          if (opt) applyEffects(profile, opt.tag_effects, weight);
        });
        break;
      }
      case 'scale_1_5': {
        if (typeof ans.value !== 'number' || !q.target_tag) break;
        const v = Math.max(1, Math.min(5, Math.round(ans.value)));
        applyEffect(profile, q.target_tag, v);
        break;
      }
      case 'free_text':
        break;
    }
  }

  for (const g of NUMERIC_GROUPS) {
    const target = profile[g] as Record<string, number>;
    for (const tag of Object.keys(target)) {
      target[tag] = Math.max(0, Math.min(5, Math.round(target[tag])));
    }
  }

  return profile;
}

const TYPE_RULES: Array<{
  test: (p: ProfileTags) => boolean;
  type: string;
  summary: string;
}> = [
  {
    test: p =>
      (p.career_value_tags.high_income ?? 0) >= 4 &&
      ((p.interest_tags.code_system ?? 0) >= 4 || (p.interest_tags.data ?? 0) >= 4),
    type: '高收入技术型',
    summary: '看重高收入与技术壁垒，对代码/数据兴趣强，能承受较高竞争与持续学习。',
  },
  {
    test: p =>
      (p.career_value_tags.stability ?? 0) >= 4 &&
      ((p.career_value_tags.public_sector ?? 0) >= 3 ||
        !!p.constraint_tags.avoid_unstable_employment),
    type: '稳定体制型',
    summary: '希望就业稳定、可考虑体制内/编制路径，倾向中长期可预期的发展节奏。',
  },
  {
    test: p =>
      (p.interest_tags.life_health ?? 0) >= 4 &&
      (p.education_plan_tags.accept_master ?? 0) >= 4,
    type: '医疗长期主义型',
    summary: '对生命健康有持续兴趣，能接受较长培养周期与读研规划。',
  },
  {
    test: p => (p.interest_tags.business ?? 0) >= 4,
    type: '商业经营型',
    summary: '对商业、运营、品牌、交易感兴趣，倾向有市场反馈的工作节奏。',
  },
  {
    test: p =>
      (p.interest_tags.art_design ?? 0) >= 4 ||
      (p.interest_tags.text_expression ?? 0) >= 4 ||
      (p.career_value_tags.creativity ?? 0) >= 4,
    type: '内容创意型',
    summary: '审美与表达倾向明显，看重创造性产出与个人作品。',
  },
  {
    test: p =>
      (p.interest_tags.machine ?? 0) >= 4 ||
      (p.ability_tags.hands_on ?? 0) >= 4,
    type: '工程制造型',
    summary: '动手与工程方向兴趣强，适合扎根产业、做出真实物理产品。',
  },
  {
    test: p =>
      (p.interest_tags.people ?? 0) >= 4 &&
      (p.career_value_tags.social_value ?? 0) >= 3,
    type: '教育服务型',
    summary: '愿意与人打交道、做有社会价值的工作，看重服务感与影响力。',
  },
  {
    test: p =>
      (p.education_plan_tags.accept_master ?? 0) >= 4 &&
      ((p.ability_tags.logic ?? 0) >= 4 || (p.ability_tags.math ?? 0) >= 4),
    type: '研究深造型',
    summary: '逻辑/数学能力突出，接受长期读研深造，适合走研究或深技术路线。',
  },
  {
    test: p => (p.career_value_tags.local_development ?? 0) >= 4,
    type: '本地稳定就业型',
    summary: '希望回本地或省内发展，看重稳定性与生活半径。',
  },
];

export function classifyProfile(profile: ProfileTags): {
  profile_type: string;
  profile_summary: string;
} {
  for (const rule of TYPE_RULES) {
    if (rule.test(profile)) {
      return { profile_type: rule.type, profile_summary: rule.summary };
    }
  }
  return {
    profile_type: '复合探索型',
    profile_summary:
      '兴趣与价值取向较为多元，没有形成单一突出的主线，建议从产业入口逐一比对、做小步尝试。',
  };
}
