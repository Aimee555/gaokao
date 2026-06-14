import type { FastifyInstance } from 'fastify';
import {
  loadCareerLibrary,
  loadIndustryLibrary,
  loadMajorLibrary,
  loadQuestionnaire,
} from '../lib/dataLoader.js';
import { buildProfile, classifyProfile } from '../lib/profileBuilder.js';
import { getStudentSubjects, validateSubjectSelection } from '../lib/subjectGate.js';
import { matchIndustries } from '../lib/industryMatcher.js';
import { matchCareers } from '../lib/careerMatcher.js';
import { matchMajors } from '../lib/majorMatcher.js';
import type { QuestionnaireMode, RawAnswer, RecommendResponse } from '../types.js';

interface Body {
  mode: QuestionnaireMode;
  answers: RawAnswer[];
}

export async function recommendRoute(app: FastifyInstance) {
  app.post<{ Body: Body }>('/recommend', async (req, reply) => {
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

      const profile = buildProfile(questionnaire, body.answers);
      const subjectWarnings = validateSubjectSelection(getStudentSubjects(profile));
      const { profile_type, profile_summary } = classifyProfile(profile);
      const {
        recommended,
        extensionIndustries,
        notRecommendedCount,
        notRecommendedIndustries,
        coverageWarnings,
        insufficientData,
      } = matchIndustries(library, profile, { mode: body.mode, topN: 5, majorLibrary });

      // 架构图：规则引擎·候选集（职业 + 专业）。一次性给出全部确定性规则结果，
      // 供前端即时展示；两段 AI 复核（/ai-review、/major-review）为渐进增强。
      const careerResult = matchCareers(careerLibrary, profile, recommended, { majorLibrary });
      const majorResult = matchMajors(majorLibrary, profile, careerResult.recommended_careers, recommended);

      const result: RecommendResponse = {
        profile_type,
        profile_summary,
        profile_tags: profile,
        recommended_industries: recommended,
        extension_industries: extensionIndustries,
        insufficient_data: insufficientData,
        not_recommended_count: notRecommendedCount,
        not_recommended_industries: notRecommendedIndustries,
        coverage_warnings: coverageWarnings,
        subject_warnings: subjectWarnings,
        career_result: careerResult,
        major_result: majorResult,
      };
      return result;
    } catch (err) {
      app.log.error({ err }, 'recommend failed');
      return reply.code(500).send({ error: '推荐计算失败' });
    }
  });
}
