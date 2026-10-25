import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from 'dompurify';
import { 
  CreditCard, Search, Phone, Hash, Filter, Banknote, 
  CheckCircle, Clock, XCircle, RefreshCw, Printer, Wallet,
  Building2, FileText, Trash2
} from 'lucide-react';
import { InstapayReviewPanel } from './InstapayFeature';
import { PaymobPaymentsList } from './PaymobFeature';
import { isBookingUuid } from './paymentsLog';

// Types matching DB schema
interface Payment {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  amount: number;
  transaction_id: string;
  payment_type: 'wallet' | 'instapay' | 'fawry' | 'other';
  payment_type_detail: string | null;
  status: 'pending' | 'paid' | 'failed';
  booking_id: string | null;
  matched_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentNotification {
  id: string;
  payment_id: string;
  patient_name: string;
  amount: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  wallet: 'محفظة هاتف',
  instapay: 'إنستا باي',
  fawry: 'فوري',
  other: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  paid: 'تم الدفع',
  failed: 'فشل',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

interface PaymentsTabProps {
  cardClass: string;
  inputClass: string;
  onPrint: (title: string, content: string) => void;
  isAdmin?: boolean;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ cardClass, inputClass, onPrint, isAdmin = false }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelledBookingIds, setCancelledBookingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search/Filter states
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchTransactionId, setSearchTransactionId] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [filterStatus, setFilterStatus] = useState('paid'); // Default to showing paid only
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch payments from Supabase
  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Type assertion since the DB types might not be generated yet
      const list = (data as unknown as Payment[]) || [];
      setPayments(list);

      // Mark payments whose booking was cancelled after being paid
      const bookingIds: string[] = [...new Set(list.map(p => p.booking_id).filter(isBookingUuid))] as string[];
      if (bookingIds.length) {
        const { data: bk } = await supabase.from('bookings').select('id').in('id', bookingIds).eq('status', 'cancelled');
        setCancelledBookingIds(new Set((bk || []).map((b: any) => b.id)));
      } else {
        setCancelledBookingIds(new Set());
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setError('فشل في تحميل بيانات المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  // Delete a payment record (admins only — also enforced by the database)
  const deletePayment = async (p: Payment) => {
    if (!isAdmin) return;
    if (!window.confirm(`هل أنت متأكد من حذف عملية الدفع ${p.transaction_id} للمريض ${p.patient_name} نهائياً؟`)) return;
    setDeletingId(p.id);
    const { error: delError } = await supabase.rpc('delete_payment_record' as any, { _payment_id: p.id } as any);
    setDeletingId(null);
    if (delError) {
      alert('تعذر حذف العملية. هذه الصلاحية للمدير فقط.');
      return;
    }
    setPayments(prev => prev.filter(x => x.id !== p.id));
    setNotifications(prev => prev.filter(n => n.payment_id !== p.id));
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('payment_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications((data as unknown as PaymentNotification[]) || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from('payment_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchNotifications();
  }, []);

  // Filter payments based on search criteria
  const filteredPayments = payments.filter(p => {
    let matches = true;
    
    if (searchName) {
      matches = matches && p.patient_name.toLowerCase().includes(searchName.toLowerCase());
    }
    
    if (searchPhone) {
      matches = matches && (p.patient_phone?.includes(searchPhone) || false);
    }
    
    if (searchTransactionId) {
      matches = matches && p.transaction_id.toLowerCase().includes(searchTransactionId.toLowerCase());
    }
    
    if (filterPaymentType) {
      matches = matches && p.payment_type === filterPaymentType;
    }
    
    if (filterStatus) {
      matches = matches && p.status === filterStatus;
    }
    
    return matches;
  });

  // Calculate totals
  const totalPaidAmount = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePrintPayments = () => {
    // Sanitize all user-provided data to prevent XSS attacks
    const rows = filteredPayments.map(p => `
      <tr>
        <td>${DOMPurify.sanitize(p.patient_name)}</td>
        <td>${DOMPurify.sanitize(p.patient_phone || '-')}</td>
        <td>${DOMPurify.sanitize(p.transaction_id)}</td>
        <td>${DOMPurify.sanitize(PAYMENT_TYPE_LABELS[p.payment_type])}</td>
        <td>${DOMPurify.sanitize(String(p.amount))} ج.م</td>
        <td>${DOMPurify.sanitize(STATUS_LABELS[p.status])}</td>
        <td>${DOMPurify.sanitize(new Date(p.created_at).toLocaleDateString('ar-EG'))}</td>
      </tr>
    `).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>اسم المريض</th>
            <th>رقم الهاتف</th>
            <th>رقم العملية</th>
            <th>نوع الدفع</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: left; font-weight: bold;">
        إجمالي المبالغ المدفوعة: ${totalPaidAmount} ج.م
      </div>
    `;

    onPrint('تقرير المدفوعات', content);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" />
            إشعارات المدفوعات الجديدة ({notifications.length})
          </h3>
          <div className="space-y-3">
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-800">{notif.patient_name}</h4>
                    <p className="text-sm text-green-600">{notif.amount} ج.م - {new Date(notif.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => markNotificationRead(notif.id)}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700"
                >
                  تم الاطلاع
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Payments Card */}
      <div className={cardClass}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="text-blue-600" />
            سجل المدفوعات المؤكدة ({filteredPayments.length})
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={fetchPayments} 
              className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100"
              title="تحديث"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handlePrintPayments}
              className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200"
              title="طباعة التقرير"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* Search/Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1">
              <Search size={12} /> اسم المريض
            </label>
            <input
              type="text"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="بحث..."
              className={inputClass}
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1">
              <Phone size={12} /> رقم الهاتف
            </label>
            <input
              type="text"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              placeholder="01..."
              className={inputClass}
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1">
              <Hash size={12} /> رقم العملية
            </label>
            <input
              type="text"
              value={searchTransactionId}
              onChange={e => setSearchTransactionId(e.target.value)}
              placeholder="رقم المعاملة..."
              className={inputClass}
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1">
              <Wallet size={12} /> نوع الدفع
            </label>
            <select
              value={filterPaymentType}
              onChange={e => setFilterPaymentType(e.target.value)}
              className={inputClass}
            >
              <option value="">الكل</option>
              <option value="wallet">محفظة هاتف</option>
              <option value="instapay">إنستا باي</option>
              <option value="fawry">فوري</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1">
              <Filter size={12} /> الحالة
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">الكل</option>
              <option value="paid">تم الدفع</option>
              <option value="pending">قيد الانتظار</option>
              <option value="failed">فشل</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle size={18} />
              <span className="text-xs font-bold">المدفوعات المؤكدة</span>
            </div>
            <p className="text-2xl font-black text-green-700">
              {payments.filter(p => p.status === 'paid').length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock size={18} />
              <span className="text-xs font-bold">قيد الانتظار</span>
            </div>
            <p className="text-2xl font-black text-yellow-700">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Banknote size={18} />
              <span className="text-xs font-bold">إجمالي المدفوع</span>
            </div>
            <p className="text-2xl font-black text-blue-700">
              {totalPaidAmount.toLocaleString('ar-EG')} ج.م
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-2">
            <XCircle size={20} />
            <span>{error}</span>
            <button onClick={fetchPayments} className="mr-auto text-sm underline">إعادة المحاولة</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-10 text-gray-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-2" />
            <p>جاري تحميل المدفوعات...</p>
          </div>
        )}

        {/* Payments Table */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold">لا توجد مدفوعات مطابقة للبحث</p>
                <p className="text-sm mt-1">قم بتغيير معايير البحث أو انتظر وصول مدفوعات جديدة</p>
              </div>
            ) : (
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">المريض / الهاتف</th>
                    <th className="p-4">رقم العملية</th>
                    <th className="p-4">نوع الدفع</th>
                    <th className="p-4">المبلغ</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.map(payment => {
                    // Paid booking that was later cancelled: show the row text in red
                    const cancelled = !!payment.booking_id && cancelledBookingIds.has(payment.booking_id);
                    const c = (normal: string) => (cancelled ? 'text-red-600' : normal);
                    return (
                    <tr key={payment.id} className="hover:bg-blue-50/10 transition-colors">
                      <td className="p-4">
                        <div className={`font-bold ${c('text-gray-900')}`}>{payment.patient_name}</div>
                        <div className={`text-xs ${c('text-gray-400')} mt-1`} dir="ltr">
                          {payment.patient_phone || 'غير مسجل'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`font-mono text-sm bg-gray-100 px-2 py-1 rounded-sm ${cancelled ? 'text-red-600' : ''}`}>
                          {payment.transaction_id}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-bold ${c('text-blue-600')}`}>
                          {PAYMENT_TYPE_LABELS[payment.payment_type]}
                        </span>
                        {payment.payment_type_detail && (
                          <div className={`text-xs ${c('text-gray-400')} mt-1`}>{payment.payment_type_detail}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold text-lg ${c('text-gray-900')}`}>{payment.amount}</span>
                        <span className={`text-sm ${c('text-gray-500')} mr-1`}>ج.م</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black ${STATUS_COLORS[payment.status]}`}>
                          {STATUS_LABELS[payment.status]}
                        </span>
                      </td>
                      <td className={`p-4 text-sm ${c('text-gray-600')}`}>
                        {new Date(payment.created_at).toLocaleDateString('ar-EG')}
                        <div className={`text-xs ${c('text-gray-400')}`}>
                          {new Date(payment.created_at).toLocaleTimeString('ar-EG')}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-4">
                          <button
                            onClick={() => deletePayment(payment)}
                            disabled={deletingId === payment.id}
                            className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-60"
                            title="حذف العملية نهائياً"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Integration Info */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
            <FileText size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">معلومات التكامل</h3>
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <p className="text-sm text-purple-800 mb-4 font-bold">
            لاستقبال إشعارات الدفع تلقائياً، قم بإرسال طلب POST إلى الـ Webhook التالي:
          </p>
          <div className="bg-white p-4 rounded-xl border border-purple-200 font-mono text-xs overflow-x-auto" dir="ltr">
            <code className="text-purple-700">
              POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/public/payment-webhook
            </code>
          </div>
          <div className="mt-4 text-xs text-purple-600">
            <p className="font-bold mb-2">الحقول المطلوبة في الطلب (JSON):</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><code>patient_name</code> - اسم المريض (نص)</li>
              <li><code>amount</code> - المبلغ (رقم)</li>
              <li><code>transaction_id</code> - رقم العملية (نص فريد)</li>
              <li><code>payment_type</code> - نوع الدفع (wallet/instapay/fawry/other)</li>
              <li><code>patient_phone</code> - رقم الهاتف (اختياري)</li>
            </ul>
          </div>
        </div>
      </div>

      <InstapayReviewPanel cardClass={cardClass} inputClass={inputClass} onPrint={onPrint} />
      <PaymobPaymentsList cardClass={cardClass} />
    </div>
  );
};

export default PaymentsTab;
