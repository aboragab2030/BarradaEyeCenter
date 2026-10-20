// Date helpers that treat booking dates as Egypt (Africa/Cairo) calendar days,
// independent of the visitor's device time zone.

const CAIRO_TZ = 'Africa/Cairo';

/** Today's calendar date in Cairo as YYYY-MM-DD. */
export const cairoTodayStr = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Adds whole days to a YYYY-MM-DD string (month/year boundaries handled). */
export const addDaysStr = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** Weekday index (0 = Sunday) of a YYYY-MM-DD calendar date. */
export const weekdayOf = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Arabic weekday name for a YYYY-MM-DD date. */
export const arabicWeekday = (dateStr: string): string => AR_DAYS[weekdayOf(dateStr)] ?? '';

/** Upcoming dates only (strictly after today in Cairo), sorted ascending. */
export const upcomingDates = (dates: string[], today: string = cairoTodayStr()): string[] =>
  [...new Set(dates)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d > today).sort();

interface DayBooking { id?: unknown; doctorId: number; date: string; status: string }

/** True when the doctor already has `maxPerDay` confirmed bookings on `date` (excluding the booking being edited). */
export const isDayFull = (bookings: DayBooking[], doctorId: number, date: string, maxPerDay: number, excludeId?: unknown): boolean => {
  if (!maxPerDay || maxPerDay <= 0) return false;
  const count = bookings.filter(b => b.doctorId === doctorId && b.date === date && b.status === 'confirmed' && (excludeId === undefined || b.id !== excludeId)).length;
  return count >= maxPerDay;
};
