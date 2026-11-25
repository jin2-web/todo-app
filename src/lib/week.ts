/**
 * Week helpers. A week starts on Monday 00:00 in Asia/Seoul (UTC+9, no DST).
 * All dates are JS Date instants; KST wall-clock fields are read by shifting
 * the instant by +9h and using the getUTC* accessors.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

function toKstFields(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/** Monday 00:00 KST of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const kst = toKstFields(date);
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7;
  const mondayAsUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday);
  return new Date(mondayAsUtc - KST_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isInWeek(date: Date, weekStart: Date): boolean {
  return getWeekStart(date).getTime() === getWeekStart(weekStart).getTime();
}

/** 0 = Monday ... 6 = Sunday, in KST. */
export function getWeekdayIndex(date: Date): number {
  return (toKstFields(date).getUTCDay() + 6) % 7;
}

/** `YYYY-MM-DD` of the KST calendar day containing `date`. */
export function toDateKey(date: Date): string {
  return toKstFields(date).toISOString().slice(0, 10);
}

/**
 * Parses `YYYY-MM-DD` as KST midnight, or any other ISO 8601 string as an instant.
 * Returns null when the value is not a valid date.
 */
export function parseDateInput(value: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utc = Date.UTC(year, month - 1, day);
    const check = new Date(utc);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      return null;
    }
    return new Date(utc - KST_OFFSET_MS);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** e.g. `11.23(월) ~ 11.29(일)` */
export function formatWeekRange(weekStart: Date): string {
  const start = toDateKey(weekStart);
  const end = toDateKey(addDays(weekStart, 6));
  return `${start.slice(5).replace('-', '.')}(월) ~ ${end.slice(5).replace('-', '.')}(일)`;
}
