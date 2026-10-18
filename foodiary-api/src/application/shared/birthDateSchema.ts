import z from 'zod';

export function isValidBirthDate(date: Date): boolean {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  const year = date.getUTCFullYear();
  if (year < 1900) {
    return false;
  }

  return date.getTime() <= Date.now();
}

export function isValidBirthDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  if (!Number.isInteger(year) || year < 1900) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return false;
  }

  return parsed.getTime() <= Date.now();
}

export const birthDateSchema = z.string()
  .min(1, '"birthDate" is required')
  .date('"birthDate" should be a valid date (YYYY-MM-DD)')
  .refine(isValidBirthDateString, '"birthDate" must be a valid non-future date from 1900 onwards')
  .transform(value => new Date(`${value}T00:00:00.000Z`));
