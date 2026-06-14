import type { FastifyInstance } from 'fastify';
import { loadCareerLibrary, loadIndustryLibrary, loadMajorLibrary, loadQuestionnaire } from '../lib/dataLoader.js';
import { buildProfile, classifyProfile } from '../lib/profileBuilder.js';
import { matchIndustries } from '../lib/industryMatcher.js';
import { matchCareers, applyFollowupAnswers } from '../lib/careerMatcher.js';
import { reviewCareers } from '../lib/careerAiReview.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { requireSession } from '../lib/session.js';
import type {
  AiReviewResult,
  CareerMatcherResult,
  FollowupAnswer,
  QuestionnaireMode,
  RawAnswer,
} from '../types.js';

interface Body {
  mode: QuestionnaireMode;
  answers: RawAnswer[];
  followup_answers?: FollowupAnswer[]; // 第二轮：动态追问的回答，回灌画像后重排
}

interface AiReviewResponse {
  profile_type: string;
  profile_summary: string;
  applied_followups: FollowupAnswer[]; // 回显本次已应用的追问回答
  career_result: CareerMatcherResult; // 规则原始职业结果（保留可对照）
  ai_review: AiReviewResult; // AI 复核校正后的展示结果 + 分歧表
}

export async function aiReviewRoute(app: FastifyInstance) {
  app.post<{ Body: Body }>('/ai-review', async (req, reply) => {
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
      const [questionnaire, library, careerLibrary, majorLibrary] = await Promise.all([
        loadQuestionnaire(body.mode),
        loadIndustryLibrary(),
        loadCareerLibrary(),
        loadMajorLibrary(),
      ]);

      const baseProfile = buildProfile(questionnaire, body.answers);
      // 第二轮：把动态追问回答回灌进画像，并记录已答触发码避免重复反问。
      const followupAnswers = Array.isArray(body.followup_answers) ? body.followup_answers : [];
      const profile =
        followupAnswers.length > 0 ? applyFollowupAnswers(baseProfile, followupAnswers) : baseProfile;
      const answeredTriggers = new Set(followupAnswers.map(a => a.trigger_code));

      const { profile_type, profile_summary } = classifyProfile(profile);
      const { recommended } = matchIndustries(library, profile, { mode: body.mode, topN: 5, majorLibrary });
      const careerResult = matchCareers(careerLibrary, profile, recommended, { answeredTriggers, majorLibrary });

      // AI 复核层：非交互复核 + 候选集内重排/降级 + 分歧表（无 key 自动降级）
      const aiReview = await reviewCareers(
        profile,
        profile_type,
        profile_summary,
        recommended,
        careerResult,
      );

      const result: AiReviewResponse = {
        profile_type,
        profile_summary,
        applied_followups: followupAnswers,
        career_result: careerResult,
        ai_review: aiReview,
      };
      return result;
    } catch (err) {
      app.log.error({ err }, 'ai-review failed');
      return reply.code(500).send({ error: 'AI 复核计算失败' });
    }
  });
}
