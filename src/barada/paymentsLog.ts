// Small rules for the confirmed-payments log (date filter + paid-booking cancellation notice).

/** Text the database puts at the start of the notice when a paid booking is cancelled. */
export const CANCELLED_PAID_NOTICE = 'تم إلغاء إجراء مدفوع';

export const isCancelledPaidNotice = (message: string | null | undefined) =>
  !!message && message.startsWith(CANCELLED_PAID_NOTICE);

/** Calendar day (YYYY-MM-DD) of a timestamp in the viewer's local time. */
export const localDay = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** True when the timestamp falls on or between the chosen days (either bound may be empty). */
export const inDateRange = (iso: string, from: string, to: string) => {
  const day = localDay(iso);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isBookingUuid = (v: string | null | undefined): v is string => !!v && UUID_RE.test(v);
