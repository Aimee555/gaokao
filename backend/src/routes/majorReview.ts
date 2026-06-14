import type { FastifyInstance } from 'fastify';
import {
  loadCareerLibrary,
  loadIndustryLibrary,
  loadMajorLibrary,
  loadQuestionnaire,
} from '../lib/dataLoader.js';
import { buildProfile, classifyProfile } from '../lib/profileBuilder.js';
import { matchIndustries } from '../lib/industryMatcher.js';
import { matchCareers } from '../lib/careerMatcher.js';
import { matchMajors } from '../lib/majorMatcher.js';
import { applyMajorFollowupAnswers } from '../lib/majorFollowups.js';
import { reviewMajors } from '../lib/majorAiReview.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { requireSession } from '../lib/session.js';
import type {
  FollowupAnswer,
  MajorMatcherResult,
  MajorReviewResult,
  QuestionnaireMode,
  RawAnswer,
} from '../types.js';

interface Body {
  mode: QuestionnaireMode;
  answers: RawAnswer[];
  followup_answers?: FollowupAnswer[];
}

interface MajorReviewResponse {
  profile_type: string;
  profile_summary: string;
  applied_followups: FollowupAnswer[];
  major_result: MajorMatcherResult; // 规则原始专业结果（保留可对照）
  major_review: MajorReviewResult; // AI 复核校正 + 分歧表
}

export async function majorReviewRoute(app: FastifyInstance) {
  app.post<{ Body: Body }>('/major-review', async (req, reply) => {
    if (!checkRateLimit(req.ip)) {
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });
    }
    if (!requireSession(req, reply)) return;
    const body = req.body ?? ({} as Body);
    if (body.mode !== 'quick' && body.mode !== 'deep') {
      return reply.code(400).send({ error: 'mode 必须是 quick 或 deep' });
    }
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return reply.code(400).send({ error: 'answers 必须是非空数组' });
    }

    try {
      const [questionnaire, industryLib, careerLib, majorLib] = await Promise.all([
        loadQuestionnaire(body.mode),
        loadIndustryLibrary(),
        loadCareerLibrary(),
        loadMajorLibrary(),
      ]);

      const baseProfile = buildProfile(questionnaire, body.answers);
      const followupAnswers = Array.isArray(body.followup_answers) ? body.followup_answers : [];
      const profile =
        followupAnswers.length > 0 ? applyMajorFollowupAnswers(baseProfile, followupAnswers) : baseProfile;
      const answeredTriggers = new Set(followupAnswers.map(a => a.trigger_code));

      const { profile_type, profile_summary } = classifyProfile(profile);

      // 确定性规则链（职业用规则排名，不在此处叠加职业 AI 复核延迟）
      const { recommended } = matchIndustries(industryLib, profile, { mode: body.mode, topN: 5, majorLibrary: majorLib });
      const careerResult = matchCareers(careerLib, profile, recommended, { majorLibrary: majorLib });
      const majorResult = matchMajors(majorLib, profile, careerResult.recommended_careers, recommended, {
        answeredTriggers,
      });

      // 单次 AI 复核（专业层）
      const majorReview = await reviewMajors(profile, profile_type, profile_summary, majorResult);

      const result: MajorReviewResponse = {
        profile_type,
        profile_summary,
        applied_followups: followupAnswers,
        major_result: majorResult,
        major_review: majorReview,
      };
      return result;
    } catch (err) {
      app.log.error({ err }, 'major-review failed');
      return reply.code(500).send({ error: '专业复核计算失败' });
    }
  });
}
