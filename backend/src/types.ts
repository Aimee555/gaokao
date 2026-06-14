export type QuestionnaireMode = 'quick' | 'deep';

export type QuestionType =
  | 'single_choice'
  | 'multi_select'
  | 'ranking_multi_select'
  | 'scale_1_5'
  | 'free_text';

export interface QuestionOption {
  code: string;
  label: string;
  tag_effects?: Record<string, number>;
  allow_custom_text?: boolean;
}

export interface Question {
  id: string;
  module: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  target_tag?: string;
  min_select?: number;
  max_select?: number;
  allow_custom_option?: boolean;
  scoring_rule?: string;
  note?: string;
}

export interface Questionnaire {
  metadata: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  questions: Question[];
}

export interface RawAnswer {
  question_id: string;
  type: QuestionType;
  selected_code?: string;
  selected_codes?: string[];
  ranked_codes?: string[];
  value?: number;
  text?: string;
  custom_answer?: string;
}

export type NumericTagGroup =
  | 'interest_tags'
  | 'ability_tags'
  | 'career_value_tags'
  | 'risk_tolerance_tags'
  | 'learning_style_tags'
  | 'education_plan_tags'
  | 'work_scene_tags';

export type BooleanTagGroup = 'exclusion_tags' | 'constraint_tags';

export interface ProfileTags {
  interest_tags: Record<string, number>;
  ability_tags: Record<string, number>;
  career_value_tags: Record<string, number>;
  risk_tolerance_tags: Record<string, number>;
  learning_style_tags: Record<string, number>;
  education_plan_tags: Record<string, number>;
  work_scene_tags: Record<string, number>;
  exclusion_tags: Record<string, boolean>;
  constraint_tags: Record<string, boolean>;
}

export interface Industry {
  industry_id: string;
  industry_name: string;
  tier: 'employment_friendly' | 'policy_growth' | 'future_frontier' | string;
  industry_type?: string;
  policy_alignment?: string[];
  description: string;
  match_tags: Record<string, number>;
  market_scores: {
    policy_support_score: number;
    job_volume_score: number;
    salary_potential_score: number;
    undergrad_employment_score: number;
    stability_score: number;
    competition_level: number;
    city_concentration: number;
    master_requirement: number;
    ai_substitution_risk: number;
  };
  suitable_profile_types?: string[];
  not_recommended_if?: string[];
  related_career_paths: string[];
  related_majors: string[];
  risk_notes: string[];
  recommendation_note: string;
}

export interface IndustryLibrary {
  metadata: Record<string, unknown>;
  match_weights_recommended?: Record<string, number>;
  industries: Industry[];
}

export interface MatchedIndustry {
  rank: number;
  industry_id: string;
  industry_name: string;
  industry_type: string;
  tier: string;
  score: number;
  level: 'A' | 'B' | 'C' | 'D';
  level_label: string;
  profile_match_score: number;
  market_fit_score: number;
  penalty_score: number;
  coverage: number;
  low_confidence: boolean;
  matched_reasons: string[];
  risk_notes: string[];
  related_career_paths: string[];
  related_majors: string[];
  recommendation_note: string;
}

export interface NotRecommendedIndustry {
  industry_id: string;
  industry_name: string;
  score_before_penalty: number;
  final_score: number;
  reason: string;
  conflict_tags: string[];
}

export interface CoverageWarning {
  industry_id: string;
  industry_name: string;
  coverage: number;
  missing_groups: string[];
}

export interface Career {
  career_id: string;
  career_name: string;
  aliases?: string[];
  industry_ids: string[];
  entry_majors: string[];
  min_education: string;
  license_required: string | null;
  employer_types?: string[];
  career_ladder?: string;
  scores: {
    entry_salary: number;
    salary_ceiling: number;
    undergrad_feasibility: number;
    stability: number;
    ai_substitution_risk: number;
  };
  work_scene?: string[];
  honest_note: string;
  suitable_profile_types?: string[];
  match_tags: Record<string, number>;
  market_scores: {
    ai_substitution_risk: number;
    competition_level: number;
    job_volume_score: number;
    city_concentration: number;
    master_requirement: number;
    undergrad_employment_score: number;
    salary_potential_score: number;
    stability_score: number;
    policy_support_score: number;
    entry_salary_score: number;
  };
  not_recommended_if?: string[];
  risk_notes: string[];
  development_path: string[];
  related_majors: string[];
}

export interface CareerLibrary {
  metadata: Record<string, unknown>;
  industry_career_index?: Record<string, Record<string, string>>;
  careers: Career[];
}

export interface MatchedCareer {
  rank: number;
  career_id: string;
  career_name: string;
  score: number;
  level: 'A' | 'B' | 'C' | 'D';
  level_label: string;
  matched_industries: string[];
  min_education: string;
  license_required: string | null;
  entry_majors: string[];
  related_majors: string[];
  employer_types: string[];
  career_ladder: string;
  work_scene: string[];
  why_fit: string[];
  honest_note: string;
  risk_notes: string[];
  development_path: string[];
  debug_scores: {
    career_match_score: number;
    career_market_score: number;
    industry_relevance: number;
    penalty_score: number;
  };
}

export interface DeepStudyPath {
  career_id: string;
  career_name: string;
  reason: string;
  min_education: string;
  entry_majors: string[];
}

export interface BackupCareer {
  career_id: string;
  career_name: string;
  reason: string;
}

export interface NotRecommendedCareer {
  career_id: string;
  career_name: string;
  reason: string;
  conflict_tags: string[];
}

export interface FollowupOption {
  code: string;
  label: string;
  // 选项对应的画像标签增量：数值标签覆盖(0-5)，布尔标签置 true。空对象表示"不确定/暂不影响"。
  tag_effects: Record<string, number | boolean>;
}

export interface FollowupQuestion {
  trigger_code: string;
  question: string;
  purpose: string;
  options: FollowupOption[];
}

export interface FollowupAnswer {
  trigger_code: string;
  selected_code: string;
}

export interface SourceIndustry {
  industry_id: string;
  industry_name: string;
  industry_rank: number;
  industry_score: number;
}

export interface CareerMatcherResult {
  source_industries: SourceIndustry[];
  recommended_careers: MatchedCareer[];
  deep_study_paths: DeepStudyPath[];
  backup_careers: BackupCareer[];
  not_recommended_careers: NotRecommendedCareer[];
  followup_required: boolean;
  followup_questions: FollowupQuestion[];
}

// ── 专业层 ──────────────────────────────────────────────────────────────
export interface MajorSubjectRequirement {
  required_all: string[];
  recommended: string[];
  note?: string;
}

export interface Major {
  major_id: string;
  major_name: string;
  catalog: {
    discipline_category: string;
    major_class: string;
    degree: string;
    maturity: string;
    source_note?: string;
  };
  new_gaokao_subject_requirement_template: MajorSubjectRequirement;
  related_industries: Array<{ industry_id: string; industry_name: string }>;
  related_careers: Array<{ career_id: string; career_name: string }>;
  career_relation_strength?: string;
  entry_career_count?: number;
  match_tags: Record<string, number>;
  ability_requirements: Record<string, number>;
  career_value_fit: Record<string, number>;
  education_profile: {
    undergrad_friendly_score: number;
    master_requirement_score: number;
    phd_requirement_score: number;
    certificate_requirement_score: number;
    long_training_score: number;
    notes?: string;
  };
  market_scores: {
    job_volume_score: number;
    salary_potential_score: number;
    undergrad_employment_score: number;
    stability_score: number;
    competition_level: number;
    city_concentration: number;
    master_requirement: number;
    ai_substitution_risk: number;
  };
  not_recommended_if?: string[];
  risk_notes: string[];
  display_notes?: string[];
  recommended_for?: string[];
  not_recommended_for?: string[];
  university_strategy?: string;
  // 红牌软门槛：麦可思多年就业预警专业。仍可推荐，但加惩罚 + 卡片显著标注。
  employment_warning?: EmploymentWarning;
}

export interface EmploymentWarning {
  level: 'red_card';
  note: string;
}

export interface MajorLibrary {
  metadata: Record<string, unknown>;
  indexes?: {
    major_name_index?: Record<string, string>;
    career_major_index?: Record<string, string[]>;
    industry_major_index?: Record<string, string[]>;
  };
  majors: Major[];
}

export type SubjectEligibility = 'eligible' | 'ineligible' | 'need_verify';

export interface MatchedMajor {
  rank: number;
  major_id: string;
  major_name: string;
  score: number;
  level: 'A' | 'B' | 'C' | 'D';
  level_label: string;
  discipline_category: string;
  major_class: string;
  maturity: string;
  is_new_major: boolean;
  subject_eligibility: SubjectEligibility;
  subject_requirement: MajorSubjectRequirement;
  matched_careers: Array<{ career_id: string; career_name: string }>;
  matched_industries: Array<{ industry_id: string; industry_name: string }>;
  why_recommended: string[];
  risk_notes: string[];
  employment_warning: EmploymentWarning | null;
  university_strategy: string;
  debug_scores: {
    career_relevance: number;
    ability_match: number;
    interest_match: number;
    career_value_match: number;
    market_fit: number;
    education_fit: number;
    penalty_score: number;
  };
}

export interface IneligibleMajor {
  major_id: string;
  major_name: string;
  reason: string;
  subject_requirement: MajorSubjectRequirement;
}

export interface DeepStudyMajor {
  major_id: string;
  major_name: string;
  reason: string;
  education_profile: Major['education_profile'];
}

export interface NotRecommendedMajor {
  major_id: string;
  major_name: string;
  reason: string;
  conflict_tags: string[];
}

export interface SourceCareer {
  career_id: string;
  career_name: string;
  career_rank: number;
  career_score: number;
}

export interface MajorMatcherResult {
  source_careers: SourceCareer[];
  strong_recommend_majors: MatchedMajor[]; // A
  consider_majors: MatchedMajor[]; // B
  cautious_majors: MatchedMajor[]; // C
  deep_study_majors: DeepStudyMajor[];
  ineligible_majors: IneligibleMajor[];
  not_recommended_majors: NotRecommendedMajor[];
  followup_required: boolean;
  followup_questions: FollowupQuestion[];
}

export interface ReviewedMajor extends MatchedMajor {
  display_score: number;
  display_level: 'A' | 'B' | 'C' | 'D';
  ai_action: AiAction;
  ai_reason: string;
  user_facing_explanation: string;
  risk_warning: string;
}

export interface MajorDivergence {
  major_id: string;
  major_name: string;
  rule_level: 'A' | 'B' | 'C' | 'D';
  rule_score: number;
  ai_action: AiAction;
  display_level: 'A' | 'B' | 'C' | 'D';
  display_score: number;
  ai_reason: string;
}

export interface MajorReviewResult {
  available: boolean;
  model: string;
  overall_judgment: string;
  need_followup: boolean;
  followup_questions: FollowupQuestion[];
  reviewed_majors: ReviewedMajor[]; // AI 校正后的 A/B/C 合并展示顺序
  divergences: MajorDivergence[];
  guardrail_notes: string[];
}

export type AiAction =
  | 'keep'
  | 'upgrade_display'
  | 'downgrade_display'
  | 'warn_only'
  | 'remove_from_display';

export interface ReviewedCareer extends MatchedCareer {
  display_score: number;
  display_level: 'A' | 'B' | 'C' | 'D';
  ai_action: AiAction;
  ai_reason: string;
  user_facing_explanation: string;
  risk_warning: string;
}

export interface CareerDivergence {
  career_id: string;
  career_name: string;
  rule_rank: number | null;
  rule_score: number;
  rule_level: 'A' | 'B' | 'C' | 'D';
  ai_action: AiAction;
  display_level: 'A' | 'B' | 'C' | 'D';
  display_score: number;
  ai_reason: string;
}

export interface AiReviewResult {
  available: boolean; // false：未配置 key 或调用失败，降级为纯规则结果
  model: string;
  overall_judgment: string;
  need_followup: boolean;
  followup_questions: FollowupQuestion[];
  reviewed_careers: ReviewedCareer[]; // AI 校正后的最终展示顺序
  moved_to_backup: BackupCareer[]; // 被 AI 降级/移出主推的职业
  divergences: CareerDivergence[]; // AI 与规则不一致处，供校准规则
  guardrail_notes: string[]; // 护栏拦截记录（丢弃越界id、钳制动作等）
}

export interface RecommendResponse {
  profile_type: string;
  profile_summary: string;
  profile_tags: ProfileTags;
  recommended_industries: MatchedIndustry[];
  extension_industries: MatchedIndustry[];
  insufficient_data: boolean;
  not_recommended_count: number;
  not_recommended_industries: NotRecommendedIndustry[];
  coverage_warnings: CoverageWarning[];
  subject_warnings: string[]; // 选科组合合法性提示（非阻断）
  career_result: CareerMatcherResult;
  major_result: MajorMatcherResult;
}
