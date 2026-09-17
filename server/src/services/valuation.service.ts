import { env } from '../config/env';

/** 35%-style drop applied when the customer skips the optional diagnosis step. */
export function applyNoDiagnosisDrop(maxValue: number): number {
  const drop = env.noDiagnosisValueDropPercent / 100;
  return Math.max(0, Math.round(maxValue * (1 - drop)));
}

/** Recalculates the final value once the (mock) diagnosis result is in. */
export function applyDiagnosisAdjustment(maxValue: number, adjustmentPercent: number): number {
  return Math.max(0, Math.round(maxValue * (1 - adjustmentPercent / 100)));
}
