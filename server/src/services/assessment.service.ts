import { AiAssessmentResult, Question, QuestionnaireAnswer } from '../types/domain';

/**
 * Mocks an AI vision model that inspects device images/video and infers
 * answers to the same physical-condition questionnaire the user would
 * otherwise fill in manually. Swap this with a real model/API call later -
 * the contract (return `QuestionnaireAnswer[]`) stays the same.
 */
function inferAnswersFromMedia(questions: Question[], mediaCount: number): QuestionnaireAnswer[] {
  return questions.map((question) => {
    if (question.id.startsWith('q-powers-on')) {
      // AI can't validate power state from stills/video alone; assume healthy
      // and let the optional diagnosis step catch functional issues.
      return { questionId: question.id, optionIds: ['yes'] };
    }
    if (question.id.startsWith('q-accessories')) {
      return { questionId: question.id, optionIds: ['none'] };
    }

    // Deterministic-but-varied mock "detection" driven by how much media was supplied.
    const detectedDamage = mediaCount % 3 === 0;
    return { questionId: question.id, optionIds: [detectedDamage ? 'yes' : 'no'] };
  });
}

export const assessmentService = {
  runImageAssessment(questions: Question[], imageCount: number): AiAssessmentResult {
    return {
      method: 'image',
      mediaCount: imageCount,
      generatedAnswers: inferAnswersFromMedia(questions, imageCount),
      summary: `Analyzed ${imageCount} images across all sides of the device. Condition mapped to the standard questionnaire.`,
      confidence: 0.87,
    };
  },

  runVideoAssessment(questions: Question[]): AiAssessmentResult {
    return {
      method: 'video',
      mediaCount: 1,
      generatedAnswers: inferAnswersFromMedia(questions, 1),
      summary: 'Analyzed the submitted video walkthrough. Condition mapped to the standard questionnaire.',
      confidence: 0.82,
    };
  },
};
