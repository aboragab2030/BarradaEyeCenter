// Pure rules mirrored from the server-side review function (the server is authoritative).

export type InstapayStatus = 'PENDING_REVIEW' | 'REVIEW_REQUIRED' | 'PAID' | 'MISMATCH' | 'REJECTED';

export const INSTAPAY_STATUS_LABELS: Record<InstapayStatus, string> = {
  PENDING_REVIEW: 'قيد المراجعة',
  REVIEW_REQUIRED: 'يحتاج تحقيق',
  PAID: 'تم تأكيد الدفع',
  MISMATCH: 'المبلغ غير مطابق',
  REJECTED: 'مرفوض',
};

const FOLLOW_UP = ['متابعة كشف', 'متابعة الكشف', 'متابعة عملية', 'متابعة العملية'];

/** Amount due = service price + doctor fee (doctor fee is 0 for follow-up visits). */
export const computeAmountDue = (service: string, servicePrice: number, doctorFee: number): number =>
  (servicePrice || 0) + (FOLLOW_UP.some(f => service.includes(f)) ? 0 : (doctorFee || 0));

export type ReviewAction = 'approve' | 'reject' | 'investigate';

/** Result status of a review action, or an error message when the action is not allowed. */
export const reviewOutcome = (
  current: InstapayStatus, action: ReviewAction, amountDue: number, verifiedAmount: number | null, reason: string,
): { status: InstapayStatus } | { error: string } => {
  if (current === 'PAID' || current === 'REJECTED') return { error: 'تم اتخاذ قرار نهائي على هذا الطلب بالفعل' };
  if (action === 'reject') return reason.trim() ? { status: 'REJECTED' } : { error: 'يجب كتابة سبب الرفض' };
  if (action === 'investigate') return { status: 'REVIEW_REQUIRED' };
  if (verifiedAmount === null || Number.isNaN(verifiedAmount)) return { error: 'يجب إدخال المبلغ الذي تم التحقق من استلامه' };
  return { status: verifiedAmount === amountDue ? 'PAID' : 'MISMATCH' };
};

const norm = (s: string) => s.trim().toLowerCase();

/** Transfer references that appear on more than one submission. */
export const duplicateTransactionRefs = (rows: { transaction_ref: string }[]): Set<string> => {
  const counts = new Map<string, number>();
  rows.forEach(r => counts.set(norm(r.transaction_ref), (counts.get(norm(r.transaction_ref)) || 0) + 1));
  return new Set([...counts].filter(([, c]) => c > 1).map(([k]) => k));
};
export const isDuplicateRef = (dups: Set<string>, ref: string) => dups.has(norm(ref));
