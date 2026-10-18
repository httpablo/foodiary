import { MacroProgress } from './types';

export function calcMacroPercentage({ goal, current }: MacroProgress) {
  if (current === undefined) {
    return 100;
  }

  if (!Number.isFinite(goal) || goal <= 0) {
    return Number.isFinite(current) && current > 0 ? 100 : 0;
  }

  if (!Number.isFinite(current) || current <= 0) {
    return 0;
  }

  const percentage = (current / goal) * 100;

  return Math.min(Math.max(percentage, 0), 100);
}

export function formatMacro({ goal, current }: MacroProgress) {
  if (current !== undefined) {
    return Number.isFinite(current) ? Math.round(current) : 0;
  }

  return Number.isFinite(goal) ? goal : 0;
}
