import { describe, it, expect } from 'vitest';
import { inDateRange, isCancelledPaidNotice, isBookingUuid } from '@/barada/paymentsLog';

describe('payments log date filter', () => {
  const ts = new Date(2026, 9, 20, 14, 30).toISOString(); // 20 Oct 2026 local time

  it('keeps a payment inside the chosen range', () => {
    expect(inDateRange(ts, '2026-10-19', '2026-10-21')).toBe(true);
  });
  it('includes payments on the first and last chosen day', () => {
    expect(inDateRange(ts, '2026-10-20', '2026-10-20')).toBe(true);
  });
  it('hides a payment before the start day', () => {
    expect(inDateRange(ts, '2026-10-21', '')).toBe(false);
  });
  it('hides a payment after the end day', () => {
    expect(inDateRange(ts, '', '2026-10-19')).toBe(false);
  });
});

describe('paid booking cancellation notice', () => {
  it('recognises the cancellation notice', () => {
    expect(isCancelledPaidNotice('تم إلغاء إجراء مدفوع - كشف - د. أحمد')).toBe(true);
  });
  it('does not treat a normal payment notice as a cancellation', () => {
    expect(isCancelledPaidNotice('طلب مراجعة تحويل إنستاباي للحجز BR-1234')).toBe(false);
  });
  it('only looks up real booking ids', () => {
    expect(isBookingUuid('3f1c2a9e-1b2c-4d5e-8f90-123456789abc')).toBe(true);
    expect(isBookingUuid('BK-12')).toBe(false);
  });
});
