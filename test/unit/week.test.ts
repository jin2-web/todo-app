import {
  addDays,
  formatWeekRange,
  getWeekStart,
  getWeekdayIndex,
  isInWeek,
  parseDateInput,
  toDateKey,
} from '@/lib/week';

const MONDAY = new Date('2026-11-23T00:00:00+09:00');

describe('getWeekStart (Monday 00:00 KST)', () => {
  it('maps Sunday 23:59 KST to the preceding Monday', () => {
    expect(getWeekStart(new Date('2026-11-29T23:59:00+09:00'))).toEqual(MONDAY);
  });

  it('maps Monday 00:00 KST to itself', () => {
    expect(getWeekStart(MONDAY)).toEqual(MONDAY);
  });

  it('maps the instant just before Monday 00:00 KST to the previous week', () => {
    expect(getWeekStart(new Date('2026-11-22T23:59:59+09:00'))).toEqual(new Date('2026-11-16T00:00:00+09:00'));
  });

  it('uses KST, not UTC: Sunday 15:30 UTC is Monday 00:30 KST', () => {
    expect(getWeekStart(new Date('2026-11-29T15:30:00Z'))).toEqual(new Date('2026-11-30T00:00:00+09:00'));
  });
});

describe('isInWeek', () => {
  it('accepts both boundaries of the week and rejects the next Monday', () => {
    expect(isInWeek(MONDAY, MONDAY)).toBe(true);
    expect(isInWeek(new Date('2026-11-29T23:59:00+09:00'), MONDAY)).toBe(true);
    expect(isInWeek(addDays(MONDAY, 7), MONDAY)).toBe(false);
  });
});

describe('parseDateInput', () => {
  it('parses YYYY-MM-DD as KST midnight', () => {
    expect(parseDateInput('2026-11-25')).toEqual(new Date('2026-11-25T00:00:00+09:00'));
  });

  it('parses ISO instants', () => {
    expect(parseDateInput('2026-11-25T10:00:00Z')).toEqual(new Date('2026-11-25T10:00:00Z'));
  });

  it('rejects impossible and malformed dates', () => {
    expect(parseDateInput('2026-02-30')).toBeNull();
    expect(parseDateInput('not-a-date')).toBeNull();
  });
});

describe('KST calendar helpers', () => {
  it('toDateKey returns the KST day', () => {
    expect(toDateKey(new Date('2026-11-24T16:00:00Z'))).toBe('2026-11-25');
  });

  it('getWeekdayIndex is 0 for Monday and 6 for Sunday', () => {
    expect(getWeekdayIndex(MONDAY)).toBe(0);
    expect(getWeekdayIndex(new Date('2026-11-29T12:00:00+09:00'))).toBe(6);
  });

  it('formatWeekRange shows Monday to Sunday', () => {
    expect(formatWeekRange(MONDAY)).toBe('11.23(월) ~ 11.29(일)');
  });
});
