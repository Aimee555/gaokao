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
  metadata: {
    questionnaire_id?: string;
    name?: string;
    description?: string;
    [k: string]: unknown;
  };
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
  available: boolean;
  model: string;
  overall_judgment: string;
  need_followup: boolean;
  followup_questions: FollowupQuestion[];
  reviewed_careers: ReviewedCareer[];
  moved_to_backup: BackupCareer[];
  divergences: CareerDivergence[];
  guardrail_notes: string[];
}

export interface AiReviewResponse {
  profile_type: string;
  profile_summary: string;
  applied_followups: FollowupAnswer[];
  career_result: CareerMatcherResult;
  ai_review: AiReviewResult;
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
  subject_warnings?: string[];
  career_result: CareerMatcherResult;
  major_result: MajorMatcherResult;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── 专业层 ──────────────────────────────────────────────────────────────
export type SubjectEligibility = 'eligible' | 'ineligible' | 'need_verify';

export interface MajorSubjectRequirement {
  required_all: string[];
  recommended: string[];
  note?: string;
}

export interface EmploymentWarning {
  level: 'red_card';
  note: string;
}

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

export interface ReviewedMajor extends MatchedMajor {
  display_score: number;
  display_level: 'A' | 'B' | 'C' | 'D';
  ai_action: AiAction;
  ai_reason: string;
  user_facing_explanation: string;
  risk_warning: string;
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
  education_profile: Record<string, number | string | undefined>;
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
  strong_recommend_majors: MatchedMajor[];
  consider_majors: MatchedMajor[];
  cautious_majors: MatchedMajor[];
  deep_study_majors: DeepStudyMajor[];
  ineligible_majors: IneligibleMajor[];
  not_recommended_majors: NotRecommendedMajor[];
  followup_required: boolean;
  followup_questions: FollowupQuestion[];
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
  reviewed_majors: ReviewedMajor[];
  divergences: MajorDivergence[];
  guardrail_notes: string[];
}

export interface MajorReviewResponse {
  profile_type: string;
  profile_summary: string;
  applied_followups: FollowupAnswer[];
  major_result: MajorMatcherResult;
  major_review: MajorReviewResult;
}
