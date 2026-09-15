import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.middleware';
import { masterAnswerRepository, masterQuestionRepository, questionAnswerMappingRepository } from '../repositories';
import { QuestionAnswerMapping } from '../types/domain';

export const questionAnswersRouter = Router();
questionAnswersRouter.use(requireAuth);

// List/search is POST + body, never GET + query string - see server/README.md.
questionAnswersRouter.post('/search', async (req, res, next) => {
  try {
    const { questionId, isActive } = req.body as { questionId?: string; isActive?: boolean };
    const mappings = questionId
      ? await questionAnswerMappingRepository.listByQuestion(questionId)
      : await questionAnswerMappingRepository.list({ isActive });
    return res.json(mappings);
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.post('/', async (req, res, next) => {
  try {
    const { questionId, answerId } = req.body as { questionId?: string; answerId?: string };
    if (!questionId || !answerId) return res.status(400).json({ error: 'questionId and answerId are required' });

    const question = await masterQuestionRepository.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Unknown questionId' });
    const answer = await masterAnswerRepository.findById(answerId);
    if (!answer) return res.status(404).json({ error: 'Unknown answerId' });

    const existingMappings = await questionAnswerMappingRepository.listByQuestion(questionId);
    const duplicate = existingMappings.find((m) => m.answerId === answerId);
    if (duplicate) return res.status(200).json(duplicate);

    const now = new Date().toISOString();
    const mapping: QuestionAnswerMapping = { id: uuid(), questionId, answerId, createdAt: now, updatedAt: now, isActive: true };
    await questionAnswerMappingRepository.create(mapping);
    return res.status(201).json(mapping);
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.get('/:id', async (req, res, next) => {
  try {
    const mapping = await questionAnswerMappingRepository.findById(req.params.id);
    if (!mapping) return res.status(404).json({ error: 'Question-answer mapping not found' });
    return res.json(mapping);
  } catch (err) {
    return next(err);
  }
});

questionAnswersRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await questionAnswerMappingRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Question-answer mapping not found' });

    const { isActive } = req.body as { isActive?: boolean };
    const updated = await questionAnswerMappingRepository.update(req.params.id, { isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
