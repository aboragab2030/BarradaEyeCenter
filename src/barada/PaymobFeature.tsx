import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeBackend } from '@/lib/backend';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Copy, KeyRound, ShieldCheck, RefreshCw, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Patient side
// ---------------------------------------------------------------------------

/** True when an admin has enabled online payment. */
export function usePaymobEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.rpc('paymob_is_enabled' as any).then(({ data }) => { if (alive) setEnabled(data === true); });
    return () => { alive = false; };
  }, []);
  return enabled;
}

/** Creates the Paymob payment for a just-created booking and returns the checkout URL. */
export async function startPaymobCheckout(bookingId: string, phone: string): Promise<{ url?: string; error?: string }> {
  const { data, error } = await invokeBackend('paymob-create-payment', {
    body: { booking_id: bookingId, phone, return_origin: window.location.origin },
  });
  if (error) {
    let message = 'تعذر بدء عملية الدفع، يرجى المحاولة لاحقاً';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) message = ctx.error; } catch { /* ignore */ }
    return { error: message };
  }
  if (!data?.checkout_url) return { error: data?.error || 'تعذر بدء عملية الدفع' };
  return { url: data.checkout_url };
}

type ResultState = 'checking' | 'paid' | 'failed' | 'mismatch' | 'timeout' | 'notfound';

/** Shown when the patient returns from Paymob (?paymob_ref=PM-XXXX). Polls until the webhook confirms. */
export const PaymobResultDialog = () => {
  const [reference, setReference] = useState<string | null>(null);
  const [state, setState] = useState<ResultState>('checking');
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('paymob_ref');
    if (ref && /^PM-[A-Z0-9]{6,20}$/i.test(ref)) setReference(ref.toUpperCase());
  }, []);

  useEffect(() => {
    if (!reference) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      tries += 1;
      const { data } = await supabase.rpc('get_paymob_status' as any, { _reference: reference } as any);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { if (tries > 3) { setState('notfound'); return; } }
      else {
        setAmount(row.amount ?? null);
        if (row.status === 'paid') { setState('paid'); return; }
        if (row.status === 'failed') { setState('failed'); return; }
        if (row.status === 'amount_mismatch') { setState('mismatch'); return; }
      }
      if (tries >= 20) { setState('timeout'); return; }
      timer = setTimeout(check, 3000);
    };
    check();
    return () => clearTimeout(timer);
  }, [reference]);

  if (!reference) return null;

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('paymob_ref');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    setReference(null);
  };

  const view: Record<ResultState, { icon: React.ReactNode; title: string; text: string }> = {
    checking: { icon: <Loader2 size={40} className="mx-auto text-blue-600 mb-4 animate-spin" />, title: 'جاري التحقق من الدفع…', text: 'يرجى الانتظار لحظات وعدم إغلاق الصفحة.' },
    paid: { icon: <CheckCircle size={40} className="mx-auto text-green-600 mb-4" />, title: 'تم الدفع بنجاح وتأكيد الحجز', text: 'شكراً لك، تم استلام المبلغ وتأكيد حجزك.' },
    failed: { icon: <XCircle size={40} className="mx-auto text-red-600 mb-4" />, title: 'لم تتم عملية الدفع', text: 'تم تسجيل الحجز لكن الدفع لم يكتمل. يمكنك الدفع نقداً عند الحضور أو التواصل مع المركز.' },
    mismatch: { icon: <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />, title: 'الدفع قيد المراجعة', text: 'تم استلام دفعة بمبلغ مختلف عن المستحق، وسيتواصل معك المركز.' },
    timeout: { icon: <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />, title: 'لم يصل تأكيد الدفع بعد', text: 'إذا تم خصم المبلغ فسيتم تأكيد حجزك تلقائياً خلال دقائق. احتفظ برقم العملية للمتابعة.' },
    notfound: { icon: <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />, title: 'لم نجد عملية الدفع', text: 'يرجى التواصل مع المركز ومعك رقم العملية.' },
  };
  const v = view[state];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center relative" dir="rtl">
        {state !== 'checking' && <button onClick={close} aria-label="إغلاق" className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>}
        {v.icon}
        <h3 className="text-lg font-black text-gray-900 mb-2">{v.title}</h3>
        <p className="text-sm text-gray-600 font-bold">{v.text}</p>
        <p className="text-xs text-gray-400 mt-3">رقم العملية: <span dir="ltr">{reference}</span>{amount ? ` — ${amount} ج.م` : ''}</p>
        {state !== 'checking' && <button onClick={close} className="mt-6 w-full bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700">حسناً</button>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Admin: settings page
// ---------------------------------------------------------------------------

type Mode = 'test' | 'live';
interface SecretInfo { has_secret_key: boolean; has_hmac: boolean; secret_key_last4: string | null; hmac_last4: string | null }
interface SettingsResponse {
  settings: Record<string, any> | null;
  secrets: Record<Mode, SecretInfo>;
  webhook_url: string;
}

const emptyForm = {
  enabled: false, mode: 'test' as Mode,
  test_public_key: '', test_secret_key: '', test_hmac_secret: '', test_card_integration_id: '', test_wallet_integration_id: '',
  live_public_key: '', live_secret_key: '', live_hmac_secret: '', live_card_integration_id: '', live_wallet_integration_id: '',
};
type FormState = typeof emptyForm;

async function callSettings(method: 'GET' | 'POST', body?: unknown): Promise<{ data?: any; error?: string }> {
  const { data, error } = await invokeBackend('paymob-settings', { method, body: body as any });
  if (error) {
    let message = 'حدث خطأ أثناء الاتصال بالخادم';
    let saved: any;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) message = ctx.error; saved = ctx?.saved; } catch { /* ignore */ }
    return { error: message, data: saved };
  }
  return { data };
}

export const PaymobSettingsPanel = ({ cardClass, inputClass }: { cardClass: string; inputClass: string }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [info, setInfo] = useState<SettingsResponse | null>(null);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [confirmLive, setConfirmLive] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyResponse = (res: SettingsResponse) => {
    setInfo(res);
    const s = res.settings || {};
    const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    setForm({
      ...emptyForm,
      enabled: s.enabled === true,
      mode: s.mode === 'live' ? 'live' : 'test',
      test_public_key: str(s.test_public_key), test_card_integration_id: str(s.test_card_integration_id), test_wallet_integration_id: str(s.test_wallet_integration_id),
      live_public_key: str(s.live_public_key), live_card_integration_id: str(s.live_card_integration_id), live_wallet_integration_id: str(s.live_wallet_integration_id),
    });
    setEditing({});
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await callSettings('GET');
    if (res.error) setMessage({ type: 'error', text: res.error });
    else applyResponse(res.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setMessage(null); setConfirmLive(false);
    const res = await callSettings('POST', form);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
      if (res.data) applyResponse(res.data);
    } else {
      applyResponse(res.data);
      setMessage({ type: 'ok', text: 'تم حفظ إعدادات الدفع الإلكتروني' });
    }
    setSaving(false);
  };

  const onSaveClick = () => {
    const switchingToLive = form.mode === 'live' && form.enabled && !(info?.settings?.mode === 'live' && info?.settings?.enabled);
    if (switchingToLive) setConfirmLive(true); else save();
  };

  const set = (key: keyof FormState, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const secretField = (mode: Mode, kind: 'secret_key' | 'hmac_secret', label: string) => {
    const key = `${mode}_${kind}` as keyof FormState;
    const meta = info?.secrets?.[mode];
    const stored = kind === 'secret_key' ? meta?.has_secret_key : meta?.has_hmac;
    const last4 = kind === 'secret_key' ? meta?.secret_key_last4 : meta?.hmac_last4;
    const open = editing[key] || !stored;
    return (
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
        {open ? (
          <div className="flex gap-2">
            <input type="password" autoComplete="new-password" dir="ltr" className={inputClass} value={form[key] as string}
              onChange={e => set(key, e.target.value)} placeholder={stored ? 'اتركه فارغاً للإبقاء على القيمة الحالية' : ''} />
            {stored && <button type="button" onClick={() => { setEditing(p => ({ ...p, [key]: false })); set(key, ''); }} className="px-3 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">إلغاء</button>}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3.5">
            <span className="text-sm font-bold text-green-700 flex items-center gap-2"><ShieldCheck size={16} /> محفوظ <span dir="ltr">••••{last4}</span></span>
            <button type="button" onClick={() => setEditing(p => ({ ...p, [key]: true }))} className="text-xs font-bold text-blue-600">تغيير</button>
          </div>
        )}
      </div>
    );
  };

  const modeCard = (mode: Mode) => (
    <div className={`${cardClass} ${form.mode === mode ? 'ring-2 ring-blue-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-black text-gray-900 flex items-center gap-2"><KeyRound size={18} /> {mode === 'test' ? 'مفاتيح الوضع التجريبي' : 'مفاتيح الوضع الحقيقي'}</h4>
        {form.mode === mode && <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-50 text-blue-700">المستخدم حالياً</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Public Key</label>
          <input dir="ltr" className={inputClass} value={form[`${mode}_public_key`]} onChange={e => set(`${mode}_public_key`, e.target.value)} placeholder={`egy_pk_${mode}_...`} />
        </div>
        {secretField(mode, 'secret_key', 'Secret Key')}
        {secretField(mode, 'hmac_secret', 'HMAC Secret')}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Card Integration ID (الكروت)</label>
          <input dir="ltr" inputMode="numeric" className={inputClass} value={form[`${mode}_card_integration_id`]} onChange={e => set(`${mode}_card_integration_id`, e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Wallet Integration ID (المحافظ)</label>
          <input dir="ltr" inputMode="numeric" className={inputClass} value={form[`${mode}_wallet_integration_id`]} onChange={e => set(`${mode}_wallet_integration_id`, e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
    </div>
  );

  if (loading) return <div className={cardClass}><p className="text-gray-500 font-bold flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> جاري تحميل الإعدادات…</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir="rtl">
      <div className={cardClass}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold">إعدادات الدفع الإلكتروني (Paymob)</h3>
            <p className="text-xs text-gray-500 mt-1">الدفع بالبطاقات والمحافظ الإلكترونية مع تأكيد الحجز تلقائياً.</p>
          </div>
          <button onClick={load} className="text-blue-600 flex items-center gap-2 font-bold text-sm"><RefreshCw size={16} /> تحديث</button>
        </div>

        {form.mode === 'live' && info?.settings?.mode === 'live' && info?.settings?.enabled && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-black text-sm flex items-center gap-2">
            <AlertTriangle size={18} /> الوضع الحقيقي مفعّل — سيتم خصم مبالغ حقيقية
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 cursor-pointer">
            <span className="font-bold text-gray-800">تفعيل الدفع الإلكتروني عبر Paymob</span>
            <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
          </label>
          <div className="flex rounded-2xl border border-gray-200 p-1 gap-1">
            {(['test', 'live'] as Mode[]).map(m => (
              <button key={m} type="button" onClick={() => set('mode', m)}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${form.mode === m ? (m === 'live' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                {m === 'test' ? 'تجريبي (Test)' : 'حقيقي (Live)'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">رابط الإشعارات (Webhook)</label>
          <div className="flex gap-2">
            <input readOnly dir="ltr" className={`${inputClass} bg-gray-50 text-xs`} value={info?.webhook_url || ''} />
            <button type="button" onClick={() => { navigator.clipboard.writeText(info?.webhook_url || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1 shrink-0"><Copy size={14} /> {copied ? 'تم النسخ' : 'نسخ'}</button>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">انسخ هذا الرابط في لوحة Paymob في خانة Transaction processed callback لكل Integration (في الوضعين التجريبي والحقيقي).</p>
        </div>
      </div>

      {modeCard('test')}
      {modeCard('live')}

      {message && (
        <div className={`p-4 rounded-2xl font-bold text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
      )}

      <button onClick={onSaveClick} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
        {saving && <Loader2 size={18} className="animate-spin" />} حفظ الإعدادات
      </button>

      {confirmLive && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center" dir="rtl">
            <AlertTriangle size={40} className="mx-auto text-red-600 mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-2">تفعيل الوضع الحقيقي؟</h3>
            <p className="text-sm text-gray-600 font-bold">بعد الحفظ سيدفع المرضى مبالغ حقيقية. تأكد من اختبار الربط في الوضع التجريبي أولاً.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={save} className="flex-1 bg-red-600 text-white font-black py-3 rounded-2xl hover:bg-red-700">نعم، فعّل</button>
              <button onClick={() => setConfirmLive(false)} className="flex-1 bg-gray-100 text-gray-600 font-black py-3 rounded-2xl">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Admin / reviewers: read-only list of Paymob payments
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'بانتظار الدفع', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid: { label: 'مدفوع', cls: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'فشل', cls: 'bg-red-50 text-red-700 border-red-200' },
  amount_mismatch: { label: 'مبلغ غير مطابق', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const PaymobPaymentsList = ({ cardClass }: { cardClass: string }) => {
  const [rows, setRows] = useState<any[] | null>(null);
  const [bookings, setBookings] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('paymob_payments' as any).select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { setRows([]); return; }
    const list = (data || []) as any[];
    setRows(list);
    const ids = Array.from(new Set(list.map(r => r.booking_id)));
    if (ids.length) {
      const { data: bk } = await supabase.from('bookings').select('id, patient_name, phone').in('id', ids);
      setBookings(Object.fromEntries((bk || []).map((b: any) => [b.id, b])));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (rows === null || rows.length === 0) return null;

  return (
    <div className={`${cardClass} overflow-x-auto`} dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">مدفوعات Paymob</h3>
        <button onClick={load} className="text-blue-600 flex items-center gap-2 font-bold text-sm"><RefreshCw size={16} /> تحديث</button>
      </div>
      <table className="w-full text-right text-sm">
        <thead className="bg-gray-50/50"><tr>
          <th className="p-3 font-bold">التاريخ</th><th className="p-3 font-bold">رقم العملية</th><th className="p-3 font-bold">المريض</th>
          <th className="p-3 font-bold">المبلغ</th><th className="p-3 font-bold">الوسيلة</th><th className="p-3 font-bold">الحالة</th><th className="p-3 font-bold">الوضع</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(r => {
            const b = bookings[r.booking_id];
            const st = STATUS_LABELS[r.status] || { label: r.status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
            return (
              <tr key={r.id}>
                <td className="p-3 text-xs text-gray-600">{new Date(r.created_at).toLocaleString('ar-EG')}</td>
                <td className="p-3 text-xs font-bold" dir="ltr">{r.reference}</td>
                <td className="p-3"><div className="font-bold text-gray-900">{b?.patient_name || '—'}</div><div className="text-[10px] text-gray-400" dir="ltr">{b?.phone}</div></td>
                <td className="p-3 font-bold">{(r.amount_cents / 100).toLocaleString('ar-EG')} ج.م</td>
                <td className="p-3 text-xs">{r.source_type === 'wallet' ? 'محفظة' : r.source_type ? 'بطاقة' : '—'}</td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${st.cls}`}>{st.label}</span></td>
                <td className="p-3 text-[10px] font-bold">{r.mode === 'live' ? <span className="text-red-600">حقيقي</span> : <span className="text-gray-500">تجريبي</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
