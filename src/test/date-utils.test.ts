import { describe, it, expect } from 'vitest';
import { cairoTodayStr, addDaysStr, weekdayOf, arabicWeekday, upcomingDates } from '@/barada/dateUtils';

describe('Egypt date handling', () => {
  it('uses Cairo date after local midnight even when UTC is still the previous day', () => {
    // 2026-10-13 22:30 UTC = 2026-10-14 01:30 Cairo
    expect(cairoTodayStr(new Date('2026-10-13T22:30:00Z'))).toBe('2026-10-14');
  });
  it('crosses month and year boundaries', () => {
    expect(addDaysStr('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysStr('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('maps dates to the correct Arabic weekday', () => {
    expect(weekdayOf('2026-10-16')).toBe(5);
    expect(arabicWeekday('2026-10-16')).toBe('الجمعة');
    expect(arabicWeekday('2027-01-01')).toBe('الجمعة');
  });
  it('never offers today or past dates for booking', () => {
    expect(upcomingDates(['2026-10-12', '2026-10-13', '2026-10-20', '2026-10-14'], '2026-10-13'))
      .toEqual(['2026-10-14', '2026-10-20']);
  });
});

import { isDayFull } from '@/barada/dateUtils';
describe('doctor daily maximum', () => {
  const b = (id: number, status = 'confirmed') => ({ id, doctorId: 1, date: '2026-10-20', status });
  it('blocks the day once confirmed bookings reach the daily maximum', () => {
    expect(isDayFull([b(1), b(2)], 1, '2026-10-20', 2)).toBe(true);
    expect(isDayFull([b(1)], 1, '2026-10-20', 2)).toBe(false);
  });
  it('ignores cancelled bookings and the booking being edited', () => {
    expect(isDayFull([b(1), b(2, 'cancelled')], 1, '2026-10-20', 2)).toBe(false);
    expect(isDayFull([b(1), b(2)], 1, '2026-10-20', 2, 2)).toBe(false);
  });
});
