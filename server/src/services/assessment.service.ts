import { ResolvedQuestionnaireQuestion } from '../repositories/interfaces';
import { AiAssessmentResult, QuestionnaireAnswer } from '../types/domain';

// Preferred answer codes, most-favorable first, for the mock AI "detection"
// below to reach for - a real vision model would replace this outright with
// actual condition assessment; this only exists to keep the demo flow's
// image/video paths producing plausible-looking answers.
const FAVORABLE_ANSWER_CODES = ['no', 'excellent', 'good', 'yes'];

function pickAnswer(question: ResolvedQuestionnaireQuestion, preferFavorable: boolean): number {
  if (preferFavorable) {
    for (const code of FAVORABLE_ANSWER_CODES) {
      const match = question.answers.find((a) => a.code === code);
      if (match) return match.answerId;
    }
  }
  return question.answers[question.answers.length - 1]?.answerId ?? question.answers[0].answerId;
}

/**
 * Mocks an AI vision model that inspects device images/video and infers
 * answers to the same resolved questionnaire (`POST
 * /api/questionnaire-config/resolve`) the user would otherwise fill in
 * manually - so all three assessment methods (questionnaire/image/video)
 * produce answers in the same `questionAnswerId`-based shape the
 * depreciation module can match against. Swap this with a real model/API
 * call later - the contract (return `QuestionnaireAnswer[]`) stays the same.
 */
function inferAnswersFromMedia(questions: ResolvedQuestionnaireQuestion[], mediaCount: number): QuestionnaireAnswer[] {
  return questions.map((question, index) => {
    // Deterministic-but-varied mock "detection" driven by how much media was
    // supplied - most questions resolve favorably, one in three don't.
    const preferFavorable = (mediaCount + index) % 3 !== 0;
    const answerId = pickAnswer(question, preferFavorable);
    return { questionId: question.questionId, questionAnswerIds: [answerId] };
  });
}

export const assessmentService = {
  runImageAssessment(questions: ResolvedQuestionnaireQuestion[], imageCount: number): AiAssessmentResult {
    return {
      method: 'image',
      mediaCount: imageCount,
      generatedAnswers: inferAnswersFromMedia(questions, imageCount),
      summary: `Analyzed ${imageCount} images across all sides of the device. Condition mapped to the standard questionnaire.`,
      confidence: 0.87,
    };
  },

  runVideoAssessment(questions: ResolvedQuestionnaireQuestion[]): AiAssessmentResult {
    return {
      method: 'video',
      mediaCount: 1,
      generatedAnswers: inferAnswersFromMedia(questions, 1),
      summary: 'Analyzed the submitted video walkthrough. Condition mapped to the standard questionnaire.',
      confidence: 0.82,
    };
  },
};
