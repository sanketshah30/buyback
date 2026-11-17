import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import { masterQuestionRepository, questionTranslationRepository } from '../repositories';
import { MasterQuestion, QuestionType } from '../types/domain';
import { requireBodyId } from '../utils/httpError';
import { allocateId } from '../utils/idGenerator';

export const questionsRouter = Router();
questionsRouter.use(requireAuth);
questionsRouter.use(requireRight('manage_pricing'));

const QUESTION_TYPES: QuestionType[] = ['single-choice', 'multi-choice'];

async function enrichQuestion(question: MasterQuestion) {
  const translations = await questionTranslationRepository.listByQuestion(question.id);
  const text =
    translations.find((t) => t.language === 'en')?.text ?? translations[0]?.text ?? '';
  return { ...question, text, translations };
}

async function upsertText(questionId: number, text: string | undefined, language = 'en') {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return;
  const now = new Date().toISOString();
  await questionTranslationRepository.upsert({
    id: await allocateId('question_translations'),
    questionId,
    language,
    text: trimmed,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  });
}

questionsRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    const questions = await masterQuestionRepository.list({ isActive });
    return res.json(await Promise.all(questions.map((q) => enrichQuestion(q))));
  } catch (err) {
    return next(err);
  }
});

questionsRouter.post('/', async (req, res, next) => {
  try {
    const { type, text, translations } = req.body as {
      type?: QuestionType;
      text?: string;
      translations?: { language: string; text: string }[];
    };
    if (!type || !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${QUESTION_TYPES.join(', ')}` });
    }

    const now = new Date().toISOString();
    const question: MasterQuestion = {
      id: await allocateId('questions'),
      type,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await masterQuestionRepository.create(question);

    const translationRows =
      Array.isArray(translations) && translations.length > 0
        ? translations
        : text
          ? [{ language: 'en', text }]
          : [];
    for (const t of translationRows) {
      await upsertText(question.id, t.text, t.language || 'en');
    }

    return res.status(201).json(await enrichQuestion(question));
  } catch (err) {
    return next(err);
  }
});

questionsRouter.post('/get', async (req, res, next) => {
  try {
    const question = await masterQuestionRepository.findById(requireBodyId(req.body));
    if (!question) return res.status(404).json({ error: 'Question not found' });
    return res.json(await enrichQuestion(question));
  } catch (err) {
    return next(err);
  }
});

questionsRouter.post('/update', async (req, res, next) => {
  try {
    const id = requireBodyId(req.body);
    const existing = await masterQuestionRepository.findById(id);
    if (!existing) return res.status(404).json({ error: 'Question not found' });

    const { type, text, isActive } = req.body as {
      type?: QuestionType;
      text?: string;
      isActive?: boolean;
    };
    if (type !== undefined && !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${QUESTION_TYPES.join(', ')}` });
    }

    const updated = await masterQuestionRepository.update(id, { type, isActive });
    if (text !== undefined) await upsertText(id, text);
    return res.json(await enrichQuestion(updated));
  } catch (err) {
    return next(err);
  }
});
