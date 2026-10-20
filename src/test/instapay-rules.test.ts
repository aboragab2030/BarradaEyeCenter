import { describe, it, expect } from 'vitest';
import { computeAmountDue, reviewOutcome, duplicateTransactionRefs, isDuplicateRef } from '@/barada/instapayRules';

describe('InstaPay amount due', () => {
  it('adds service price and doctor fee', () => {
    expect(computeAmountDue('كشف', 100, 150)).toBe(250);
  });
  it('skips doctor fee for follow-up visits', () => {
    expect(computeAmountDue('متابعة كشف', 50, 150)).toBe(50);
  });
});

describe('InstaPay review rules', () => {
  it('marks PAID only when the verified amount equals the full amount due', () => {
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 250, '')).toEqual({ status: 'PAID' });
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 200, '')).toEqual({ status: 'MISMATCH' });
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 300, '')).toEqual({ status: 'MISMATCH' });
  });
  it('requires a reason to reject', () => {
    expect(reviewOutcome('PENDING_REVIEW', 'reject', 250, null, '  ')).toHaveProperty('error');
    expect(reviewOutcome('PENDING_REVIEW', 'reject', 250, null, 'لم يصل المبلغ')).toEqual({ status: 'REJECTED' });
  });
  it('refuses a second decision after approval', () => {
    expect(reviewOutcome('PAID', 'approve', 250, 250, '')).toHaveProperty('error');
  });
});

describe('duplicate transfer detection', () => {
  it('flags a transfer number used on two bookings, ignoring case and spaces', () => {
    const d = duplicateTransactionRefs([{ transaction_ref: 'ABC123' }, { transaction_ref: ' abc123 ' }, { transaction_ref: 'X9' }]);
    expect(isDuplicateRef(d, 'Abc123')).toBe(true);
    expect(isDuplicateRef(d, 'X9')).toBe(false);
  });
});
