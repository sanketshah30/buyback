import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { DiagnosisState } from '../types/domain';

const ADJUSTMENT_OUTCOMES: { percent: number; findings: string[] }[] = [
  { percent: 0, findings: ['No functional issues detected. Device performs as expected.'] },
  { percent: 8, findings: ['Battery health below optimal threshold.'] },
  { percent: 15, findings: ['Minor camera focus issue detected.', 'Battery health below optimal threshold.'] },
];

/**
 * Mocks an automated hardware diagnosis kicked off from a paired mobile
 * device (scanned via QR code). In production this would be a real
 * diagnostics SDK/service reporting back over a webhook or message queue.
 */
export const diagnosisService = {
  initiate(buybackId: number): DiagnosisState {
    return {
      diagnosisId: uuid(),
      qrToken: `diag:${buybackId}:${uuid()}`,
      status: 'pending',
      pollCount: 0,
      requiredPolls: env.diagnosisCompleteAfterPolls,
    };
  },

  /** Advances the mock diagnosis one "tick" per poll and completes it deterministically. */
  poll(state: DiagnosisState): DiagnosisState {
    if (state.status === 'completed') {
      return state;
    }

    const pollCount = state.pollCount + 1;
    const inProgress = pollCount < state.requiredPolls;

    if (inProgress) {
      return { ...state, pollCount, status: 'in_progress' };
    }

    const outcome = ADJUSTMENT_OUTCOMES[pollCount % ADJUSTMENT_OUTCOMES.length];
    return {
      ...state,
      pollCount,
      status: 'completed',
      resultAdjustmentPercent: outcome.percent,
      findings: outcome.findings,
      completedAt: new Date().toISOString(),
    };
  },
};
