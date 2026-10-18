const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;

export function normalizeDecimalInput(value: string): string {
  return value.trim().replace(',', '.');
}

export function parseDecimal(value: string): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (!trimmed || !DECIMAL_PATTERN.test(trimmed)) {
    return Number.NaN;
  }

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
