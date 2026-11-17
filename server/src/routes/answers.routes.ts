import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import { answerTranslationRepository, masterAnswerRepository } from '../repositories';
import { MasterAnswer } from '../types/domain';
import { requireBodyId } from '../utils/httpError';
import { allocateId } from '../utils/idGenerator';

export const answersRouter = Router();
answersRouter.use(requireAuth);
answersRouter.use(requireRight('manage_pricing'));

async function enrichAnswer(answer: MasterAnswer) {
  const translations = await answerTranslationRepository.listByAnswer(answer.id);
  const text =
    translations.find((t) => t.language === 'en')?.text ?? translations[0]?.text ?? '';
  return { ...answer, text, translations };
}

async function upsertText(answerId: number, text: string | undefined, language = 'en') {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return;
  const now = new Date().toISOString();
  await answerTranslationRepository.upsert({
    id: await allocateId('answer_translations'),
    answerId,
    language,
    text: trimmed,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  });
}

answersRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    const answers = await masterAnswerRepository.list({ isActive });
    return res.json(await Promise.all(answers.map((a) => enrichAnswer(a))));
  } catch (err) {
    return next(err);
  }
});

answersRouter.post('/', async (req, res, next) => {
  try {
    const { code, text, translations } = req.body as {
      code?: string;
      text?: string;
      translations?: { language: string; text: string }[];
    };
    if (!code || !String(code).trim()) return res.status(400).json({ error: 'code is required' });

    const normalized = String(code).trim();
    const clash = await masterAnswerRepository.findByCode(normalized);
    if (clash) return res.status(409).json({ error: `An answer with code "${normalized}" already exists` });

    const now = new Date().toISOString();
    const answer: MasterAnswer = {
      id: await allocateId('answers'),
      code: normalized,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await masterAnswerRepository.create(answer);

    const translationRows =
      Array.isArray(translations) && translations.length > 0
        ? translations
        : text
          ? [{ language: 'en', text }]
          : [];
    for (const t of translationRows) {
      await upsertText(answer.id, t.text, t.language || 'en');
    }

    return res.status(201).json(await enrichAnswer(answer));
  } catch (err) {
    return next(err);
  }
});

answersRouter.post('/get', async (req, res, next) => {
  try {
    const answer = await masterAnswerRepository.findById(requireBodyId(req.body));
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    return res.json(await enrichAnswer(answer));
  } catch (err) {
    return next(err);
  }
});

answersRouter.post('/update', async (req, res, next) => {
  try {
    const id = requireBodyId(req.body);
    const existing = await masterAnswerRepository.findById(id);
    if (!existing) return res.status(404).json({ error: 'Answer not found' });

    const { code, text, isActive } = req.body as { code?: string; text?: string; isActive?: boolean };
    if (code !== undefined) {
      const normalized = String(code).trim();
      if (!normalized) return res.status(400).json({ error: 'code is required' });
      if (normalized !== existing.code) {
        const clash = await masterAnswerRepository.findByCode(normalized);
        if (clash) return res.status(409).json({ error: `An answer with code "${normalized}" already exists` });
      }
      const updated = await masterAnswerRepository.update(id, { code: normalized, isActive });
      if (text !== undefined) await upsertText(id, text);
      return res.json(await enrichAnswer(updated));
    }

    const updated = await masterAnswerRepository.update(id, { isActive });
    if (text !== undefined) await upsertText(id, text);
    return res.json(await enrichAnswer(updated));
  } catch (err) {
    return next(err);
  }
});
