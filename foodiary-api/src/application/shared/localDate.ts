const dayInMs = 86_400_000;

export function clampTimezoneOffset(timezoneOffsetMinutes = 0): number {
  return Number.isFinite(timezoneOffsetMinutes)
    ? Math.min(Math.max(Math.trunc(timezoneOffsetMinutes), -840), 840)
    : 0;
}

// `timezoneOffsetMinutes` follows Date#getTimezoneOffset (UTC minus local time).
export function localDateFromOffset(timezoneOffsetMinutes = 0, now = Date.now()): string {
  return new Date(now - clampTimezoneOffset(timezoneOffsetMinutes) * 60_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * dayInMs).toISOString().slice(0, 10);
}

export function startOfWeek(date: string): string {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function diffInDays(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / dayInMs,
  );
}
