import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle, XCircle, AlertTriangle, FileText, History, RefreshCw, X } from 'lucide-react';
import { INSTAPAY_STATUS_LABELS, InstapayStatus, duplicateTransactionRefs, isDuplicateRef, reviewOutcome, ReviewAction } from './instapayRules';

export interface InstapaySubmissionInput { transactionRef: string; declaredAmount?: number; file?: File | null }
export interface InstapayResult { bookingRef?: string; amountDue?: number; error?: string }

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

/** Uploads optional evidence and records the payment submission for a just-created booking. */
export async function submitInstapay(bookingId: string, phone: string, input: InstapaySubmissionInput): Promise<InstapayResult> {
  let evidencePath: string | null = null;
  if (input.file) {
    const ext = (input.file.name.split('.').pop() || '').toLowerCase();
    if (ALLOWED_EXT.includes(ext) && input.file.size <= 5 * 1024 * 1024) {
      const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('instapay-evidence').upload(path, input.file, { contentType: input.file.type });
      if (!error) evidencePath = path;
    }
  }
  const { data, error } = await supabase.rpc('submit_instapay_payment', {
    _booking_id: bookingId, _phone: phone, _transaction_ref: input.transactionRef,
    _declared_amount: input.declaredAmount ?? null, _evidence_path: evidencePath,
  } as any);
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { bookingRef: row?.booking_ref, amountDue: row?.amount_due };
}

const statusClass = (s: string) =>
  s === 'PAID' ? 'bg-green-50 text-green-700 border-green-200'
  : s === 'REJECTED' || s === 'MISMATCH' ? 'bg-red-50 text-red-700 border-red-200'
  : s === 'REVIEW_REQUIRED' ? 'bg-amber-50 text-amber-700 border-amber-200'
  : 'bg-blue-50 text-blue-700 border-blue-200';

/** Shown to the patient right after an InstaPay booking. */
export const InstapaySubmittedDialog = ({ result, onClose }: { result: InstapayResult | null; onClose: () => void }) => {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center relative" dir="rtl">
        <button onClick={onClose} aria-label="إغلاق" className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
        {result.error ? (
          <>
            <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-2">تم تسجيل الحجز</h3>
            <p className="text-sm text-gray-600 font-bold">تعذر تسجيل بيانات التحويل. يرجى التواصل مع المركز لمراجعة الدفع.</p>
          </>
        ) : (
          <>
            <CheckCircle size={40} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-2">رقم الحجز: <span dir="ltr">{result.bookingRef}</span></h3>
            <p className="text-sm text-gray-700 font-bold mb-2">تم استلام بيانات التحويل المرتبطة بالحجز رقم {result.bookingRef}. التحويل قيد المراجعة ولم يتم تأكيد الدفع بعد.</p>
            {typeof result.amountDue === 'number' && <p className="text-xs text-gray-500 font-bold">المبلغ المستحق: {result.amountDue} ج.م</p>}
            <p className="text-xs text-gray-500 mt-3">احتفظ برقم الحجز لمتابعة حالة الدفع من صفحة حجوزاتي.</p>
          </>
        )}
        <button onClick={onClose} className="mt-6 w-full bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700">حسناً</button>
      </div>
    </div>
  );
};

/** Patient lookup by booking reference + phone. Shows payment status only. */
export const InstapayStatusLookup = () => {
  const [ref, setRef] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ status: string; reason?: string | null; amount_due?: number } | null | 'none'>(null);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim() || phone.trim().length < 11) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_instapay_status', { _booking_ref: ref, _phone: phone } as any);
    const row = Array.isArray(data) ? data[0] : null;
    setRes(row || 'none');
    setLoading(false);
  };
  return (
    <div className="max-w-3xl mx-auto px-4 pb-12" dir="rtl">
      <form onSubmit={check} className="bg-white/80 rounded-3xl border border-gray-100 p-6 shadow-xs">
        <h3 className="font-black text-gray-900 mb-1">متابعة حالة الدفع (إنستاباي)</h3>
        <p className="text-xs text-gray-500 font-bold mb-4">أدخل رقم الحجز ورقم الهاتف المسجل في الحجز.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input aria-label="رقم الحجز" value={ref} onChange={e => setRef(e.target.value)} placeholder="BR-XXXXXXXX" dir="ltr" className="bg-gray-50 border border-gray-200 rounded-2xl p-3 font-bold outline-hidden focus:border-blue-500" />
          <input aria-label="رقم الهاتف" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="01xxxxxxxxx" dir="ltr" inputMode="numeric" className="bg-gray-50 border border-gray-200 rounded-2xl p-3 font-bold outline-hidden focus:border-blue-500" />
          <button disabled={loading} className="bg-blue-600 text-white rounded-2xl font-black py-3 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60"><Search size={16} /> استعلام</button>
        </div>
        {res === 'none' && <p className="mt-4 text-sm font-bold text-gray-500">لا توجد بيانات مطابقة.</p>}
        {res && res !== 'none' && (
          <div className={`mt-4 border rounded-2xl p-4 text-sm font-bold ${statusClass(res.status)}`}>
            الحالة: {INSTAPAY_STATUS_LABELS[res.status as InstapayStatus] || res.status}
            {res.reason && <p className="mt-1 font-medium">السبب: {res.reason}</p>}
          </div>
        )}
      </form>
    </div>
  );
};

interface Submission {
  id: string; booking_id: string; booking_ref: string; transaction_ref: string; declared_amount: number | null; amount_due: number;
  verified_amount: number | null; evidence_path: string | null; status: InstapayStatus; reason: string | null;
  reviewed_by_name: string | null; reviewed_at: string | null; created_at: string;
}
interface AuditEvent { id: string; event_type: string; actor_name: string; previous_status: string | null; new_status: string | null; reason: string | null; created_at: string }

/** Accounting review panel, placed inside the existing payments section. */
export const InstapayReviewPanel = ({ cardClass, inputClass }: { cardClass: string; inputClass: string }) => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [bookings, setBookings] = useState<Record<string, any>>({});
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [active, setActive] = useState<Submission | null>(null);
  const [history, setHistory] = useState<AuditEvent[]>([]);
  const [verified, setVerified] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: ok } = await supabase.rpc('can_review_instapay', { _uid: user.id } as any);
    setAllowed(!!ok);
    if (!ok) return;
    const { data } = await supabase.from('instapay_submissions' as any).select('*').order('created_at', { ascending: false });
    const list = (data || []) as unknown as Submission[];
    setRows(list);
    const ids = list.map(r => r.booking_id);
    if (ids.length) {
      const { data: bk } = await supabase.from('bookings').select('id, patient_name, phone, doctor_name, service, date, time').in('id', ids);
      setBookings(Object.fromEntries((bk || []).map((b: any) => [b.id, b])));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dups = useMemo(() => duplicateTransactionRefs(rows), [rows]);
  const filtered = rows.filter(r => {
    const q = search.trim().toLowerCase();
    if (q && !r.booking_ref.toLowerCase().includes(q) && !r.transaction_ref.toLowerCase().includes(q)) return false;
    if (status && r.status !== status) return false;
    const d = r.created_at.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const open = async (r: Submission) => {
    setActive(r); setVerified(r.declared_amount?.toString() || ''); setReason(''); setMsg('');
    const { data } = await supabase.from('instapay_audit_events' as any).select('*').eq('submission_id', r.id).order('created_at');
    setHistory((data || []) as unknown as AuditEvent[]);
  };
  const viewEvidence = async (path: string) => {
    const { data } = await supabase.storage.from('instapay-evidence').createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };
  const act = async (action: ReviewAction) => {
    if (!active) return;
    const v = verified.trim() === '' ? null : Number(verified);
    const pre = reviewOutcome(active.status, action, active.amount_due, v, reason);
    if ('error' in pre) { setMsg(pre.error); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('review_instapay_payment', { _submission_id: active.id, _action: action, _verified_amount: action === 'approve' ? v : null, _reason: reason } as any);
    setBusy(false);
    if (error) {
      setMsg(error.message.includes('already') ? 'رقم العملية مستخدم بالفعل أو تم اتخاذ قرار سابق — يرجى المراجعة' : 'تعذر حفظ القرار. حاول مرة أخرى.');
      return;
    }
    setMsg(`تم الحفظ: ${INSTAPAY_STATUS_LABELS[data as InstapayStatus] || data}`);
    await load();
    setActive(null);
  };

  if (allowed === null) return null;
  if (!allowed) return (
    <div className={`${cardClass} mt-8`} dir="rtl"><h3 className="text-lg font-bold">مراجعة مدفوعات إنستاباي</h3><p className="text-sm text-gray-500 mt-2">ليست لديك صلاحية مراجعة مدفوعات إنستاباي.</p></div>
  );

  return (
    <div className={`${cardClass} mt-8`} dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">مراجعة مدفوعات إنستاباي ({filtered.length})</h3>
        <button onClick={load} className="text-blue-600 flex items-center gap-2 text-sm font-bold"><RefreshCw size={16} /> تحديث</button>
      </div>
      <p className="text-xs text-gray-500 font-bold mb-4">يتم التأكيد يدوياً فقط بعد التحقق من وصول المبلغ في كشف حساب المركز. صورة الإيصال وحدها ليست إثباتاً للدفع.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="رقم الحجز أو رقم العملية" className={inputClass} aria-label="بحث" />
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(INSTAPAY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} aria-label="من تاريخ" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} aria-label="إلى تاريخ" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50/50"><tr>
            <th className="p-3">رقم الحجز</th><th className="p-3">المريض / الموعد</th><th className="p-3">رقم العملية</th>
            <th className="p-3">المستحق</th><th className="p-3">المُعلن</th><th className="p-3">المُتحقق</th><th className="p-3">الحالة</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const b = bookings[r.booking_id];
              const amountWarn = r.declared_amount !== null && r.declared_amount !== r.amount_due;
              return (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="p-3 font-bold" dir="ltr">{r.booking_ref}</td>
                  <td className="p-3">{b ? <><div className="font-bold">{b.patient_name}</div><div className="text-xs text-gray-500">{b.doctor_name} · {b.service} · {b.date} {b.time}</div></> : '-'}</td>
                  <td className="p-3" dir="ltr">{r.transaction_ref}{isDuplicateRef(dups, r.transaction_ref) && <span className="block text-[10px] text-red-600 font-bold" dir="rtl">رقم مكرر في حجز آخر</span>}</td>
                  <td className="p-3">{r.amount_due} ج.م</td>
                  <td className="p-3">{r.declared_amount ?? '-'}{amountWarn && <span className="block text-[10px] text-amber-600 font-bold">لا يطابق المستحق</span>}</td>
                  <td className="p-3">{r.verified_amount ?? '-'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-lg border font-bold ${statusClass(r.status)}`}>{INSTAPAY_STATUS_LABELS[r.status]}</span></td>
                  <td className="p-3"><button onClick={() => open(r)} className="text-blue-600 font-bold text-xs">مراجعة</button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-400 font-bold">لا توجد طلبات</td></tr>}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setActive(null)} aria-label="إغلاق" className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
            <h3 className="text-lg font-black mb-4">مراجعة الحجز <span dir="ltr">{active.booking_ref}</span></h3>
            <div className="text-sm space-y-1 mb-4 font-bold text-gray-700">
              <p>رقم العملية: <span dir="ltr">{active.transaction_ref}</span></p>
              <p>المبلغ المستحق: {active.amount_due} ج.م · المُعلن: {active.declared_amount ?? '-'}</p>
              <p>الحالة الحالية: {INSTAPAY_STATUS_LABELS[active.status]}</p>
              {active.evidence_path && <button onClick={() => viewEvidence(active.evidence_path!)} className="text-blue-600 flex items-center gap-1"><FileText size={14} /> عرض الإيصال المرفق</button>}
            </div>
            {active.status !== 'PAID' && active.status !== 'REJECTED' && (
              <div className="space-y-3">
                <input type="number" value={verified} onChange={e => setVerified(e.target.value)} placeholder="المبلغ الذي تم التحقق من استلامه فعلياً" className={inputClass} aria-label="المبلغ المتحقق" />
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="السبب / ملاحظات (إلزامي عند الرفض)" className={inputClass} rows={2} aria-label="السبب" />
                <div className="grid grid-cols-3 gap-2">
                  <button disabled={busy} onClick={() => act('approve')} className="bg-green-600 text-white rounded-xl py-3 font-black text-sm flex items-center justify-center gap-1 disabled:opacity-60"><CheckCircle size={16} /> اعتماد</button>
                  <button disabled={busy} onClick={() => act('reject')} className="bg-red-600 text-white rounded-xl py-3 font-black text-sm flex items-center justify-center gap-1 disabled:opacity-60"><XCircle size={16} /> رفض</button>
                  <button disabled={busy} onClick={() => act('investigate')} className="bg-amber-500 text-white rounded-xl py-3 font-black text-sm flex items-center justify-center gap-1 disabled:opacity-60"><AlertTriangle size={16} /> تحقيق</button>
                </div>
              </div>
            )}
            {msg && <p className="mt-3 text-sm font-bold text-gray-700">{msg}</p>}
            <div className="mt-6">
              <h4 className="font-black text-sm mb-2 flex items-center gap-1"><History size={14} /> سجل القرارات</h4>
              <ul className="space-y-2 text-xs">
                {history.map(h => (
                  <li key={h.id} className="bg-gray-50 rounded-xl p-2">
                    <span className="font-bold">{h.event_type}</span> · {h.actor_name} · {new Date(h.created_at).toLocaleString('ar-EG')}
                    {h.new_status && <> · {h.previous_status} → {h.new_status}</>}
                    {h.reason && <div className="text-gray-500">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
