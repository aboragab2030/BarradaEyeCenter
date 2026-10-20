import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from 'dompurify';
import {
  Brain, BarChart2, Calendar, Clock, Users, Scissors, MapPin, Building2,
  Star, TrendingUp, AlertTriangle, Printer, Target, Activity, Percent,
  PieChart, Flame, Bell, Award, ChevronDown, ChevronUp, UserCheck,
  Filter, CalendarDays, Banknote, Hash, Eye, CheckCircle, XCircle
} from 'lucide-react';

interface Booking {
  id: number; patientName: string; phone: string; doctorName: string; service: string;
  date: string; time: string; status: 'confirmed' | 'cancelled'; bookingType?: 'cash' | 'contract';
  contractingCompanyId?: number; age?: number; governorate?: string; center?: string;
  createdAt: string;
}
interface Operation {
  id: number; patientName: string; patientPhone: string; doctorName: string;
  surgeryType: string; date: string; cost: number; status: 'pending' | 'confirmed' | 'cancelled';
  contractingCompanyId?: number;
}
interface Doctor { id: number; name: string; maxPatients: number; availableDates: string[]; }
interface ContractingCompany { id: number; name: string; }
interface Props {
  bookings: Booking[]; operations: Operation[]; doctors: Doctor[];
  contractingCompanies: ContractingCompany[];
  cardClass: string; inputClass: string; onPrint: (title: string, html: string) => void;
}

const StatCard = ({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={20} /></div>
      <span className="text-xs font-bold text-gray-400">{label}</span>
    </div>
    <h3 className="text-2xl font-black text-gray-900">{value}</h3>
    {sub && <p className="text-[10px] text-gray-400 font-bold mt-1">{sub}</p>}
  </div>
);

const MiniBar = ({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) => (
  <div className="flex items-end gap-1 h-24">
    {data.map((d, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1">
        <span className="text-[8px] text-gray-400 font-bold">{d.value || ''}</span>
        <div className="w-full bg-blue-500 rounded-t-md min-h-[2px] transition-all" style={{ height: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }} />
        <span className="text-[7px] text-gray-400 font-bold truncate w-full text-center">{d.label}</span>
      </div>
    ))}
  </div>
);

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const ManagementIntelligence: React.FC<Props> = ({ bookings, operations, doctors, contractingCompanies, cardClass, inputClass, onPrint }) => {
  const [activeSection, setActiveSection] = useState<'pressure' | 'operations' | 'regions' | 'contracting' | 'doctors' | 'predictions' | 'alerts' | 'surgery-predict' | 'frequent' | 'staff'>('pressure');
  const [contactLogs, setContactLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await supabase.from('contact_logs').select('*').order('created_at', { ascending: false }).limit(500);
        if (data) setContactLogs(data);
      } catch {}
    };
    fetchLogs();
  }, []);

  const confirmedBookings = useMemo(() => bookings.filter(b => b.status === 'confirmed'), [bookings]);
  const cancelledBookings = useMemo(() => bookings.filter(b => b.status === 'cancelled'), [bookings]);
  const confirmedOps = useMemo(() => operations.filter(o => o.status !== 'cancelled'), [operations]);

  // === Booking Pressure ===
  const pressure = useMemo(() => {
    const dayCounts: Record<number, number> = {};
    const hourCounts: Record<string, number> = {};
    const weekDist: Record<string, number> = {};
    
    confirmedBookings.forEach(b => {
      const d = new Date(b.date);
      const day = d.getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      const hour = b.time?.split(':')[0] || '00';
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const busiestDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => ({ day: DAYS_AR[parseInt(d)], count: c }));
    const busiestHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h, c]) => ({ hour: `${h}:00`, count: c }));
    
    const uniqueDates = new Set(confirmedBookings.map(b => b.date));
    const avgDaily = uniqueDates.size > 0 ? Math.round(confirmedBookings.length / uniqueDates.size) : 0;

    // Weekly distribution
    const last30Days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const weekNum = `أسبوع ${Math.floor((29 - i) / 7) + 1}`;
      last30Days[weekNum] = (last30Days[weekNum] || 0) + confirmedBookings.filter(b => b.date === ds).length;
    }

    return { busiestDays, busiestHours, avgDaily, weeklyDist: Object.entries(last30Days).map(([w, c]) => ({ label: w, value: c })) };
  }, [confirmedBookings]);

  // === Operations Analysis ===
  const opsAnalysis = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const doctorCounts: Record<string, number> = {};

    confirmedOps.forEach(o => {
      const m = o.date.slice(0, 7);
      monthCounts[m] = (monthCounts[m] || 0) + 1;
      typeCounts[o.surgeryType] = (typeCounts[o.surgeryType] || 0) + 1;
      doctorCounts[o.doctorName] = (doctorCounts[o.doctorName] || 0) + 1;
    });

    const conversionRate = confirmedBookings.length > 0 ? Math.round((confirmedOps.length / confirmedBookings.length) * 100) : 0;
    const cancelRate = operations.length > 0 ? Math.round((operations.filter(o => o.status === 'cancelled').length / operations.length) * 100) : 0;
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const byDoctor = Object.entries(doctorCounts).sort((a, b) => b[1] - a[1]);
    const byMonth = Object.entries(monthCounts).sort().slice(-6);
    const totalRevenue = confirmedOps.reduce((s, o) => s + o.cost, 0);

    return { conversionRate, cancelRate, topTypes, byDoctor, byMonth, totalRevenue };
  }, [confirmedOps, confirmedBookings, operations]);

  // === Regional Analysis ===
  const regional = useMemo(() => {
    const govMap: Record<string, number> = {};
    const centerMap: Record<string, number> = {};
    const govCancelMap: Record<string, { total: number; cancelled: number }> = {};

    bookings.forEach(b => {
      const gov = b.governorate || 'غير محدد';
      const ctr = b.center || 'غير محدد';
      govMap[gov] = (govMap[gov] || 0) + 1;
      centerMap[ctr] = (centerMap[ctr] || 0) + 1;
      if (!govCancelMap[gov]) govCancelMap[gov] = { total: 0, cancelled: 0 };
      govCancelMap[gov].total++;
      if (b.status === 'cancelled') govCancelMap[gov].cancelled++;
    });

    return {
      topGov: Object.entries(govMap).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topCenters: Object.entries(centerMap).sort((a, b) => b[1] - a[1]).slice(0, 10),
      highCancelGov: Object.entries(govCancelMap).filter(([, v]) => v.total >= 3).map(([g, v]) => ({ name: g, rate: Math.round((v.cancelled / v.total) * 100) })).sort((a, b) => b.rate - a.rate).slice(0, 5),
    };
  }, [bookings]);

  // === Contracting Analysis ===
  const contractAnalysis = useMemo(() => {
    return contractingCompanies.map(c => {
      const cBookings = confirmedBookings.filter(b => b.contractingCompanyId === c.id);
      const cOps = confirmedOps.filter(o => o.contractingCompanyId === c.id);
      const phones = new Set([...cBookings.map(b => b.phone), ...cOps.map(o => o.patientPhone)]);
      return {
        name: c.name, patients: phones.size, bookings: cBookings.length, operations: cOps.length,
        patientPct: confirmedBookings.length > 0 ? Math.round((cBookings.length / confirmedBookings.length) * 100) : 0,
        opPct: confirmedOps.length > 0 ? Math.round((cOps.length / confirmedOps.length) * 100) : 0,
      };
    }).filter(c => c.patients > 0).sort((a, b) => b.patients - a.patients);
  }, [confirmedBookings, confirmedOps, contractingCompanies]);

  // === Doctor Performance ===
  const doctorPerf = useMemo(() => {
    return doctors.map(doc => {
      const dBookings = confirmedBookings.filter(b => b.doctorName === doc.name);
      const dCancelled = cancelledBookings.filter(b => b.doctorName === doc.name);
      const dOps = confirmedOps.filter(o => o.doctorName === doc.name);
      const conv = dBookings.length > 0 ? Math.round((dOps.length / dBookings.length) * 100) : 0;
      const cancelRate = (dBookings.length + dCancelled.length) > 0 ? Math.round((dCancelled.length / (dBookings.length + dCancelled.length)) * 100) : 0;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLoad = confirmedBookings.filter(b => b.date === todayStr && b.doctorName === doc.name).length;
      return { name: doc.name, bookings: dBookings.length, operations: dOps.length, conversionRate: conv, cancelRate, todayLoad, maxPatients: doc.maxPatients };
    }).sort((a, b) => b.bookings - a.bookings);
  }, [doctors, confirmedBookings, cancelledBookings, confirmedOps]);

  // === Predictions ===
  const predictions = useMemo(() => {
    const now = new Date();
    const last4Weeks: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(now); start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date(now); end.setDate(end.getDate() - w * 7);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      last4Weeks.push(confirmedBookings.filter(b => b.date >= startStr && b.date < endStr).length);
    }
    const avg = last4Weeks.length > 0 ? Math.round(last4Weeks.reduce((s, v) => s + v, 0) / last4Weeks.length) : 0;

    // Predict next month ops
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const currentMonthOps = confirmedOps.filter(o => o.date.startsWith(currentMonth)).length;
    const lastMonthOps = confirmedOps.filter(o => o.date.startsWith(lastMonth)).length;
    const predictedOps = Math.round((currentMonthOps + lastMonthOps) / 2 * 1.05);

    // Busiest day prediction
    const dayCounts: Record<number, number> = {};
    confirmedBookings.slice(-200).forEach(b => {
      const day = new Date(b.date).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    // Doctor with most predicted ops
    const doctorOpCounts: Record<string, number> = {};
    confirmedOps.slice(-100).forEach(o => { doctorOpCounts[o.doctorName] = (doctorOpCounts[o.doctorName] || 0) + 1; });
    const topDocOps = Object.entries(doctorOpCounts).sort((a, b) => b[1] - a[1])[0];

    // Full doctors alert
    const fullDoctors = doctors.filter(doc => {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const tomorrowCount = confirmedBookings.filter(b => b.date === tomorrowStr && b.doctorName === doc.name).length;
      return doc.maxPatients > 0 && tomorrowCount >= doc.maxPatients * 0.8;
    });

    return { predictedWeekly: avg, predictedOps, busiestDay: busiestDay ? DAYS_AR[parseInt(busiestDay[0])] : '-', topDocOps: topDocOps ? topDocOps[0] : '-', fullDoctors, lastMonthOps, currentMonthOps };
  }, [confirmedBookings, confirmedOps, doctors]);

  // === Alerts ===
  const alerts = useMemo(() => {
    const items: { text: string; severity: 'high' | 'medium' | 'low' }[] = [];
    const totalBookings = confirmedBookings.length + cancelledBookings.length;
    const cancelRate = totalBookings > 0 ? Math.round((cancelledBookings.length / totalBookings) * 100) : 0;
    if (cancelRate > 25) items.push({ text: `ارتفاع نسبة الإلغاء: ${cancelRate}%`, severity: 'high' });
    if (predictions.currentMonthOps < predictions.lastMonthOps * 0.7) items.push({ text: `انخفاض العمليات هذا الشهر (${predictions.currentMonthOps}) مقارنة بالشهر السابق (${predictions.lastMonthOps})`, severity: 'high' });
    doctorPerf.forEach(d => {
      if (d.todayLoad >= d.maxPatients * 0.9 && d.maxPatients > 0) items.push({ text: `ضغط حجوزات مرتفع: ${d.name} (${d.todayLoad}/${d.maxPatients})`, severity: 'medium' });
    });
    const govCounts: Record<string, number> = {};
    confirmedBookings.slice(-100).forEach(b => { if (b.governorate) govCounts[b.governorate] = (govCounts[b.governorate] || 0) + 1; });
    const topGov = Object.entries(govCounts).sort((a, b) => b[1] - a[1])[0];
    if (topGov && topGov[1] > 30) items.push({ text: `زيادة المرضى من ${topGov[0]} (${topGov[1]} مريض)`, severity: 'low' });
    return items;
  }, [confirmedBookings, cancelledBookings, predictions, doctorPerf]);

  // === Surgery Prediction ===
  const surgeryPrediction = useMemo(() => {
    // Patients who had exams but no operations - potential surgery candidates
    const examPhones = new Set(confirmedBookings.map(b => b.phone));
    const opPhones = new Set(confirmedOps.map(o => o.patientPhone));
    
    const candidates = confirmedBookings
      .filter(b => !opPhones.has(b.phone))
      .reduce((acc: Record<string, any>, b) => {
        if (!acc[b.phone]) {
          acc[b.phone] = { name: b.patientName, phone: b.phone, age: b.age, doctor: b.doctorName, service: b.service, lastVisit: b.date, visits: 0, score: 0 };
        }
        acc[b.phone].visits++;
        if (b.date > acc[b.phone].lastVisit) { acc[b.phone].lastVisit = b.date; acc[b.phone].doctor = b.doctorName; acc[b.phone].service = b.service; }
        return acc;
      }, {});

    return Object.values(candidates).map((c: any) => {
      let score = 0;
      if (c.visits >= 3) score += 30;
      else if (c.visits >= 2) score += 15;
      if (c.age && c.age > 50) score += 20;
      else if (c.age && c.age > 30) score += 10;
      if (c.service?.includes('شبكية') || c.service?.includes('ماء') || c.service?.includes('ليزك')) score += 25;
      // Check if doctor does surgeries
      const docOps = confirmedOps.filter(o => o.doctorName === c.doctor);
      if (docOps.length > 3) score += 15;
      c.score = Math.min(score, 95);
      return c;
    }).filter((c: any) => c.score >= 20).sort((a: any, b: any) => b.score - a.score).slice(0, 20);
  }, [confirmedBookings, confirmedOps]);

  // === Frequent Patients ===
  const frequentPatients = useMemo(() => {
    const patientMap: Record<string, { name: string; phone: string; visits: number; ops: number; lastVisit: string }> = {};
    confirmedBookings.forEach(b => {
      if (!patientMap[b.phone]) patientMap[b.phone] = { name: b.patientName, phone: b.phone, visits: 0, ops: 0, lastVisit: '' };
      patientMap[b.phone].visits++;
      if (b.date > patientMap[b.phone].lastVisit) { patientMap[b.phone].lastVisit = b.date; patientMap[b.phone].name = b.patientName; }
    });
    confirmedOps.forEach(o => {
      if (patientMap[o.patientPhone]) patientMap[o.patientPhone].ops++;
    });
    return Object.values(patientMap).sort((a, b) => b.visits - a.visits).slice(0, 20);
  }, [confirmedBookings, confirmedOps]);

  // === Staff Performance ===
  const staffPerf = useMemo(() => {
    const staffMap: Record<string, { name: string; contacts: number; whatsapp: number; sms: number }> = {};
    contactLogs.forEach(log => {
      const name = log.staff_name || 'غير معروف';
      if (!staffMap[name]) staffMap[name] = { name, contacts: 0, whatsapp: 0, sms: 0 };
      staffMap[name].contacts++;
      if (log.contact_type === 'whatsapp') staffMap[name].whatsapp++;
      if (log.contact_type === 'sms') staffMap[name].sms++;
    });
    return Object.values(staffMap).sort((a, b) => b.contacts - a.contacts);
  }, [contactLogs]);

  const handlePrintAll = () => {
    let html = '<h3>لوحة الذكاء الإداري</h3>';
    html += `<table><tr><td>متوسط الحجوزات اليومية</td><td>${pressure.avgDaily}</td></tr>
      <tr><td>نسبة التحويل للعمليات</td><td>${opsAnalysis.conversionRate}%</td></tr>
      <tr><td>إجمالي إيرادات العمليات</td><td>${opsAnalysis.totalRevenue.toLocaleString()} ج.م</td></tr>
      <tr><td>الحجوزات المتوقعة (أسبوعياً)</td><td>${predictions.predictedWeekly}</td></tr>
      <tr><td>العمليات المتوقعة (شهرياً)</td><td>${predictions.predictedOps}</td></tr></table>`;
    html += '<h3>أداء الأطباء</h3><table><thead><tr><th>الطبيب</th><th>الحجوزات</th><th>العمليات</th><th>تحويل%</th><th>إلغاء%</th></tr></thead><tbody>';
    doctorPerf.forEach(d => { html += `<tr><td>${DOMPurify.sanitize(d.name)}</td><td>${d.bookings}</td><td>${d.operations}</td><td>${d.conversionRate}%</td><td>${d.cancelRate}%</td></tr>`; });
    html += '</tbody></table>';
    if (alerts.length > 0) { html += '<h3>تنبيهات</h3><ul>'; alerts.forEach(a => { html += `<li>${DOMPurify.sanitize(a.text)}</li>`; }); html += '</ul>'; }
    onPrint('لوحة الذكاء الإداري', html);
  };

  const sections = [
    { id: 'pressure', label: 'ضغط الحجوزات', icon: BarChart2 },
    { id: 'operations', label: 'تحليل العمليات', icon: Scissors },
    { id: 'regions', label: 'مناطق المرضى', icon: MapPin },
    { id: 'contracting', label: 'جهات التعاقد', icon: Building2 },
    { id: 'doctors', label: 'أداء الأطباء', icon: Star },
    { id: 'predictions', label: 'التوقعات', icon: TrendingUp },
    { id: 'surgery-predict', label: 'احتمالية العمليات', icon: Target },
    { id: 'frequent', label: 'المرضى الأكثر زيارة', icon: Users },
    { id: 'staff', label: 'أداء الموظفين', icon: UserCheck },
    { id: 'alerts', label: 'تنبيهات', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Brain size={28} className="text-purple-600" /> لوحة الذكاء الإداري</h2>
          <p className="text-xs text-gray-400 font-bold mt-1">تحليلات متقدمة وتوقعات ذكية</p>
        </div>
        <button onClick={handlePrintAll} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition-all"><Printer size={14} /> طباعة / PDF</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === s.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white text-gray-500 border border-gray-100 hover:bg-purple-50 hover:text-purple-600'}`}>
            <s.icon size={14} /> {s.label}
            {s.id === 'alerts' && alerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">{alerts.length}</span>}
          </button>
        ))}
      </div>

      {/* Pressure */}
      {activeSection === 'pressure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="متوسط يومي" value={pressure.avgDaily} icon={Calendar} color="bg-blue-100 text-blue-600" sub="مريض/يوم" />
            <StatCard label="أكثر يوم ازدحاماً" value={pressure.busiestDays[0]?.day || '-'} icon={Flame} color="bg-red-100 text-red-600" sub={`${pressure.busiestDays[0]?.count || 0} حجز`} />
            <StatCard label="أكثر ساعة ازدحاماً" value={pressure.busiestHours[0]?.hour || '-'} icon={Clock} color="bg-amber-100 text-amber-600" sub={`${pressure.busiestHours[0]?.count || 0} حجز`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">توزيع الحجوزات خلال الأسبوع</h3>
              <MiniBar data={pressure.busiestDays.map(d => ({ label: d.day, value: d.count }))} maxVal={Math.max(...pressure.busiestDays.map(d => d.count), 1)} />
            </div>
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">أكثر ساعات اليوم ازدحاماً</h3>
              <div className="space-y-2">
                {pressure.busiestHours.map(h => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-12">{h.hour}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(h.count / (pressure.busiestHours[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black w-8">{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">توزيع أسبوعي (آخر شهر)</h3>
            <MiniBar data={pressure.weeklyDist} maxVal={Math.max(...pressure.weeklyDist.map(d => d.value), 1)} />
          </div>
        </div>
      )}

      {/* Operations */}
      {activeSection === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="نسبة التحويل" value={`${opsAnalysis.conversionRate}%`} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" sub="كشف → عملية" />
            <StatCard label="نسبة إلغاء العمليات" value={`${opsAnalysis.cancelRate}%`} icon={XCircle} color="bg-red-100 text-red-600" />
            <StatCard label="إجمالي الإيرادات" value={`${opsAnalysis.totalRevenue.toLocaleString()}`} icon={Banknote} color="bg-green-100 text-green-600" sub="ج.م" />
            <StatCard label="إجمالي العمليات" value={confirmedOps.length} icon={Scissors} color="bg-purple-100 text-purple-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">العمليات حسب الشهر</h3>
              <MiniBar data={opsAnalysis.byMonth.map(([m, c]) => ({ label: m.slice(5), value: c }))} maxVal={Math.max(...opsAnalysis.byMonth.map(([, c]) => c), 1)} />
            </div>
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">أكثر العمليات إجراءً</h3>
              <div className="space-y-2">
                {opsAnalysis.topTypes.map(([type, count], i) => (
                  <div key={type} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                    <span className="text-xs font-bold flex-1">{type}</span>
                    <span className="text-xs font-black text-purple-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">العمليات حسب الطبيب</h3>
            <div className="space-y-2">
              {opsAnalysis.byDoctor.map(([doc, count], i) => (
                <div key={doc} className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                  <span className="text-xs font-bold flex-1">{doc}</span>
                  <div className="w-24 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(count / (opsAnalysis.byDoctor[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-black w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regions */}
      {activeSection === 'regions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">أكثر المحافظات</h3>
              <div className="space-y-2">{regional.topGov.map(([gov, count], i) => (
                <div key={gov} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                  <span className="text-xs font-bold flex-1">{gov}</span>
                  <span className="text-xs font-black text-blue-600">{count}</span>
                </div>
              ))}</div>
            </div>
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4">أكثر المراكز</h3>
              <div className="space-y-2">{regional.topCenters.map(([ctr, count], i) => (
                <div key={ctr} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                  <span className="text-xs font-bold flex-1">{ctr}</span>
                  <span className="text-xs font-black text-blue-600">{count}</span>
                </div>
              ))}</div>
            </div>
          </div>
          {regional.highCancelGov.length > 0 && (
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> المناطق الأعلى في الإلغاء</h3>
              <div className="space-y-2">{regional.highCancelGov.map(g => (
                <div key={g.name} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <span className="text-xs font-bold text-red-700">{g.name}</span>
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-black">{g.rate}%</span>
                </div>
              ))}</div>
            </div>
          )}
        </div>
      )}

      {/* Contracting */}
      {activeSection === 'contracting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {contractAnalysis.slice(0, 6).map(c => (
              <StatCard key={c.name} label={c.name} value={c.patients} icon={Building2} color="bg-blue-100 text-blue-600" sub={`${c.bookings} كشف / ${c.operations} عملية`} />
            ))}
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">تفاصيل جهات التعاقد</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">الجهة</th><th className="p-3 text-right">مرضى</th><th className="p-3 text-right">كشوفات</th><th className="p-3 text-right">عمليات</th><th className="p-3 text-right">% مرضى</th><th className="p-3 text-right">% عمليات</th>
                </tr></thead>
                <tbody>{contractAnalysis.map(c => (
                  <tr key={c.name} className="border-t border-gray-50">
                    <td className="p-3 font-bold">{c.name}</td><td className="p-3">{c.patients}</td><td className="p-3">{c.bookings}</td><td className="p-3">{c.operations}</td>
                    <td className="p-3 text-blue-600 font-bold">{c.patientPct}%</td><td className="p-3 text-blue-600 font-bold">{c.opPct}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Performance */}
      {activeSection === 'doctors' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">تحليل أداء الأطباء</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">#</th><th className="p-3 text-right">الطبيب</th><th className="p-3 text-right">حجوزات</th><th className="p-3 text-right">عمليات</th>
                  <th className="p-3 text-right">تحويل%</th><th className="p-3 text-right">إلغاء%</th><th className="p-3 text-right">حمل اليوم</th>
                </tr></thead>
                <tbody>{doctorPerf.map((d, i) => (
                  <tr key={d.name} className="border-t border-gray-50">
                    <td className="p-3 text-xs font-black text-gray-400">{i + 1}</td>
                    <td className="p-3 font-bold">{d.name}</td><td className="p-3">{d.bookings}</td><td className="p-3">{d.operations}</td>
                    <td className="p-3"><span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">{d.conversionRate}%</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.cancelRate > 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{d.cancelRate}%</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.todayLoad >= d.maxPatients * 0.9 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{d.todayLoad}/{d.maxPatients}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      {activeSection === 'predictions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="حجوزات متوقعة (أسبوع)" value={predictions.predictedWeekly} icon={Calendar} color="bg-blue-100 text-blue-600" />
            <StatCard label="عمليات متوقعة (شهر)" value={predictions.predictedOps} icon={Scissors} color="bg-purple-100 text-purple-600" />
            <StatCard label="أكثر يوم متوقع ازدحاماً" value={predictions.busiestDay} icon={Flame} color="bg-red-100 text-red-600" />
            <StatCard label="أكثر طبيب متوقع للعمليات" value={predictions.topDocOps} icon={Star} color="bg-amber-100 text-amber-600" />
          </div>
          {predictions.fullDoctors.length > 0 && (
            <div className={cardClass}>
              <h3 className="text-sm font-black text-red-600 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> أطباء يقتربون من الامتلاء (الغد)</h3>
              <div className="space-y-2">{predictions.fullDoctors.map(d => (
                <div key={d.id} className="p-3 bg-red-50 rounded-xl text-xs font-bold text-red-700">{d.name}</div>
              ))}</div>
            </div>
          )}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">اتجاه العمليات الشهري</h3>
            <MiniBar data={opsAnalysis.byMonth.map(([m, c]) => ({ label: m.slice(5), value: c }))} maxVal={Math.max(...opsAnalysis.byMonth.map(([, c]) => c), 1)} />
          </div>
        </div>
      )}

      {/* Surgery Prediction */}
      {activeSection === 'surgery-predict' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Target size={16} className="text-purple-600" /> المرضى المحتمل إجراء عملية لهم</h3>
            <p className="text-xs text-gray-400 mb-4">تحليل يعتمد على تاريخ الزيارات والعمر ونوع الكشف والطبيب</p>
            {surgeryPrediction.length === 0 ? (
              <p className="text-center text-gray-400 py-6 font-bold">لا توجد بيانات كافية للتحليل</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                    <th className="p-3 text-right">المريض</th><th className="p-3 text-right">العمر</th><th className="p-3 text-right">الطبيب</th>
                    <th className="p-3 text-right">الكشف</th><th className="p-3 text-right">احتمالية%</th><th className="p-3 text-right">آخر زيارة</th>
                  </tr></thead>
                  <tbody>{surgeryPrediction.map((p: any, i: number) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="p-3 font-bold">{p.name}</td><td className="p-3">{p.age || '-'}</td><td className="p-3 text-xs">{p.doctor}</td>
                      <td className="p-3 text-xs">{p.service}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-black ${p.score >= 60 ? 'bg-red-100 text-red-600' : p.score >= 40 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{p.score}%</span></td>
                      <td className="p-3 text-xs">{p.lastVisit}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Frequent Patients */}
      {activeSection === 'frequent' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Users size={16} className="text-blue-600" /> المرضى الأكثر زيارة</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">#</th><th className="p-3 text-right">المريض</th><th className="p-3 text-right">الزيارات</th>
                  <th className="p-3 text-right">العمليات</th><th className="p-3 text-right">آخر زيارة</th>
                </tr></thead>
                <tbody>{frequentPatients.map((p, i) => (
                  <tr key={p.phone} className="border-t border-gray-50">
                    <td className="p-3 text-xs font-black text-gray-400">{i + 1}</td>
                    <td className="p-3 font-bold">{p.name}</td><td className="p-3 text-blue-600 font-black">{p.visits}</td>
                    <td className="p-3">{p.ops}</td><td className="p-3 text-xs">{p.lastVisit}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Performance */}
      {activeSection === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="إجمالي الاتصالات" value={contactLogs.length} icon={Activity} color="bg-blue-100 text-blue-600" />
            <StatCard label="عدد الموظفين النشطين" value={staffPerf.length} icon={UserCheck} color="bg-purple-100 text-purple-600" />
            {staffPerf[0] && <StatCard label="أفضل موظف" value={staffPerf[0].name} icon={Award} color="bg-amber-100 text-amber-600" sub={`${staffPerf[0].contacts} اتصال`} />}
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">أداء موظفي الحجز والمتابعة</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">#</th><th className="p-3 text-right">الموظف</th><th className="p-3 text-right">إجمالي</th><th className="p-3 text-right">واتساب</th><th className="p-3 text-right">SMS</th>
                </tr></thead>
                <tbody>{staffPerf.map((s, i) => (
                  <tr key={s.name} className="border-t border-gray-50">
                    <td className="p-3 text-xs font-black text-gray-400">{i + 1}</td>
                    <td className="p-3 font-bold">{s.name}</td>
                    <td className="p-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-black">{s.contacts}</span></td>
                    <td className="p-3 text-green-600 font-bold text-xs">{s.whatsapp}</td>
                    <td className="p-3 text-amber-600 font-bold text-xs">{s.sms}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {activeSection === 'alerts' && (
        <div className={cardClass}>
          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> تنبيهات إدارية</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><CheckCircle size={40} className="mx-auto mb-3 text-green-400" /><p className="font-bold">لا توجد تنبيهات — كل شيء تحت السيطرة ✅</p></div>
          ) : (
            <div className="space-y-3">{alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${a.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' : a.severity === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                <AlertTriangle size={16} /><span className="text-sm font-bold">{a.text}</span>
              </div>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagementIntelligence;
