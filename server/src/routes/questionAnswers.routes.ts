import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import {
  answerTranslationRepository,
  masterAnswerRepository,
  masterQuestionRepository,
  questionAnswerMappingRepository,
  questionTranslationRepository,
} from '../repositories';
import { QuestionAnswerMapping } from '../types/domain';
import { requireBodyId } from '../utils/httpError';
import { allocateId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const questionAnswersRouter = Router();
questionAnswersRouter.use(requireAuth);
questionAnswersRouter.use(requireRight('manage_pricing'));

async function enrichMapping(mapping: QuestionAnswerMapping) {
  const [questionTranslations, answer, answerTranslations] = await Promise.all([
    questionTranslationRepository.listByQuestion(mapping.questionId),
    masterAnswerRepository.findById(mapping.answerId),
    answerTranslationRepository.listByAnswer(mapping.answerId),
  ]);
  const questionText =
    questionTranslations.find((t) => t.language === 'en')?.text ??
    questionTranslations[0]?.text ??
    `Question #${mapping.questionId}`;
  const answerText =
    answerTranslations.find((t) => t.language === 'en')?.text ??
    answerTranslations[0]?.text ??
    answer?.code ??
    `Answer #${mapping.answerId}`;
  return {
    ...mapping,
    questionText,
    answerText,
    answerCode: answer?.code,
  };
}

questionAnswersRouter.post('/search', async (req, res, next) => {
  try {
    const questionId = parseId(req.body?.questionId);
    const { isActive } = req.body as { isActive?: boolean };
    const mappings = questionId
      ? await questionAnswerMappingRepository.listByQuestion(questionId)
      : await questionAnswerMappingRepository.list({ isActive });
    const filtered = isActive === undefined || questionId === undefined
      ? mappings
      : mappings.filter((m) => m.isActive === isActive);
    return res.json(await Promise.all(filtered.map((m) => enrichMapping(m))));
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.post('/', async (req, res, next) => {
  try {
    const questionId = parseId(req.body?.questionId);
    const answerId = parseId(req.body?.answerId);
    if (!questionId || !answerId) return res.status(400).json({ error: 'questionId and answerId are required' });

    const question = await masterQuestionRepository.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Unknown questionId' });
    const answer = await masterAnswerRepository.findById(answerId);
    if (!answer) return res.status(404).json({ error: 'Unknown answerId' });

    const existingMappings = await questionAnswerMappingRepository.listByQuestion(questionId);
    const duplicate = existingMappings.find((m) => m.answerId === answerId);
    if (duplicate) return res.status(200).json(await enrichMapping(duplicate));

    const now = new Date().toISOString();
    const mapping: QuestionAnswerMapping = {
      id: await allocateId('question_answer_mapping'),
      questionId,
      answerId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await questionAnswerMappingRepository.create(mapping);
    return res.status(201).json(await enrichMapping(mapping));
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.post('/get', async (req, res, next) => {
  try {
    const mapping = await questionAnswerMappingRepository.findById(requireBodyId(req.body));
    if (!mapping) return res.status(404).json({ error: 'Question-answer mapping not found' });
    return res.json(await enrichMapping(mapping));
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.post('/update', async (req, res, next) => {
  try {
    const id = requireBodyId(req.body);
    const existing = await questionAnswerMappingRepository.findById(id);
    if (!existing) return res.status(404).json({ error: 'Question-answer mapping not found' });

    const { isActive } = req.body as { isActive?: boolean };
    const updated = await questionAnswerMappingRepository.update(id, { isActive });
    return res.json(await enrichMapping(updated));
  } catch (err) {
    return next(err);
  }
});
