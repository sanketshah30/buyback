import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { masterQuestionRepository, questionTranslationRepository } from '../repositories';
import { MasterQuestion, QuestionType } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const questionsRouter = Router();
questionsRouter.use(requireAuth);

const QUESTION_TYPES: QuestionType[] = ['single-choice', 'multi-choice'];

// List/search is POST + body, never GET + query string - see server/README.md.
questionsRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    const questions = await masterQuestionRepository.list({ isActive });
    return res.json(questions);
  } catch (err) {
    return next(err);
  }
});

questionsRouter.post('/', async (req, res, next) => {
  try {
    const { type, translations } = req.body as { type?: QuestionType; translations?: { language: string; text: string }[] };
    if (!type || !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${QUESTION_TYPES.join(', ')}` });
    }

    const now = new Date().toISOString();
    const question: MasterQuestion = { id: nextId('questions'), type, createdAt: now, updatedAt: now, isActive: true };
    await masterQuestionRepository.create(question);

    for (const t of translations ?? []) {
      if (!t.language || !t.text) continue;
      await questionTranslationRepository.upsert({
        id: nextId('question_translations'),
        questionId: question.id,
        language: t.language,
        text: t.text,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    }

    return res.status(201).json(question);
  } catch (err) {
    return next(err);
  }
});

questionsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const question = id !== undefined ? await masterQuestionRepository.findById(id) : undefined;
    if (!question) return res.status(404).json({ error: 'Question not found' });
    return res.json(question);
  } catch (err) {
    return next(err);
  }
});

questionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await masterQuestionRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Question not found' });

    const { type, isActive } = req.body as { type?: QuestionType; isActive?: boolean };
    if (type && !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${QUESTION_TYPES.join(', ')}` });
    }

    const updated = await masterQuestionRepository.update(id, { type, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

questionsRouter.get('/:id/translations', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) return res.status(404).json({ error: 'Question not found' });
    const translations = await questionTranslationRepository.listByQuestion(id);
    return res.json(translations);
  } catch (err) {
    return next(err);
  }
});

questionsRouter.post('/:id/translations', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await masterQuestionRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Question not found' });

    const { language, text } = req.body as { language?: string; text?: string };
    if (!language || !text) return res.status(400).json({ error: 'language and text are required' });

    const now = new Date().toISOString();
    const translation = await questionTranslationRepository.upsert({
      id: nextId('question_translations'),
      questionId: id,
      language,
      text,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });
    return res.status(201).json(translation);
  } catch (err) {
    return next(err);
  }
});
