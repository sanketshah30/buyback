import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { answerTranslationRepository, masterAnswerRepository } from '../repositories';
import { MasterAnswer } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const answersRouter = Router();
answersRouter.use(requireAuth);

// List/search is POST + body, never GET + query string - see server/README.md.
answersRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    const answers = await masterAnswerRepository.list({ isActive });
    return res.json(answers);
  } catch (err) {
    return next(err);
  }
});

answersRouter.post('/', async (req, res, next) => {
  try {
    const { code, translations } = req.body as { code?: string; translations?: { language: string; text: string }[] };
    if (!code) return res.status(400).json({ error: 'code is required' });

    const clash = await masterAnswerRepository.findByCode(code);
    if (clash) return res.status(409).json({ error: `An answer with code "${code}" already exists` });

    const now = new Date().toISOString();
    const answer: MasterAnswer = { id: nextId('answers'), code, createdAt: now, updatedAt: now, isActive: true };
    await masterAnswerRepository.create(answer);

    for (const t of translations ?? []) {
      if (!t.language || !t.text) continue;
      await answerTranslationRepository.upsert({
        id: nextId('answer_translations'),
        answerId: answer.id,
        language: t.language,
        text: t.text,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    }

    return res.status(201).json(answer);
  } catch (err) {
    return next(err);
  }
});

answersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const answer = id !== undefined ? await masterAnswerRepository.findById(id) : undefined;
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    return res.json(answer);
  } catch (err) {
    return next(err);
  }
});

answersRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await masterAnswerRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Answer not found' });

    const { code, isActive } = req.body as { code?: string; isActive?: boolean };
    if (code && code !== existing.code) {
      const clash = await masterAnswerRepository.findByCode(code);
      if (clash) return res.status(409).json({ error: `An answer with code "${code}" already exists` });
    }

    const updated = await masterAnswerRepository.update(id, { code, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

answersRouter.get('/:id/translations', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) return res.status(404).json({ error: 'Answer not found' });
    const translations = await answerTranslationRepository.listByAnswer(id);
    return res.json(translations);
  } catch (err) {
    return next(err);
  }
});

answersRouter.post('/:id/translations', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await masterAnswerRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Answer not found' });

    const { language, text } = req.body as { language?: string; text?: string };
    if (!language || !text) return res.status(400).json({ error: 'language and text are required' });

    const now = new Date().toISOString();
    const translation = await answerTranslationRepository.upsert({
      id: nextId('answer_translations'),
      answerId: id,
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
