import { env } from '../config/env';

/** A fixed amount (not a percentage) deducted from maxValue when the customer skips the optional diagnosis step. */
export function applyNoDiagnosisDrop(maxValue: number): number {
  return Math.max(0, Math.round(maxValue - env.noDiagnosisFixedDeduction));
}

/** Recalculates the final value once the (mock) diagnosis result is in. */
export function applyDiagnosisAdjustment(maxValue: number, adjustmentPercent: number): number {
  return Math.max(0, Math.round(maxValue * (1 - adjustmentPercent / 100)));
}
