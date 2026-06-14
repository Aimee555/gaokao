import type { FastifyInstance } from 'fastify';
import { loadQuestionnaire } from '../lib/dataLoader.js';

export async function questionnaireRoute(app: FastifyInstance) {
  app.get<{ Params: { mode: string } }>('/questionnaire/:mode', async (req, reply) => {
    const mode = req.params.mode;
    if (mode !== 'quick' && mode !== 'deep') {
      return reply.code(400).send({ error: 'mode 必须是 quick 或 deep' });
    }
    try {
      const data = await loadQuestionnaire(mode);
      return data;
    } catch (err) {
      app.log.error({ err }, 'load questionnaire failed');
      return reply.code(500).send({ error: '问卷数据加载失败' });
    }
  });
}
