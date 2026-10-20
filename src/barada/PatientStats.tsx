import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Users, Activity, Scissors, PieChart, MapPin, Calendar, Printer,
  TrendingUp, BarChart2, Building2, Filter, Hash, ChevronDown, ChevronUp,
  UserCheck, Heart, Baby, Eye, Star, CheckCircle, XCircle, Percent
} from 'lucide-react';

interface Booking {
  id: number; patientName: string; phone: string; doctorName: string; service: string;
  date: string; time: string; status: 'confirmed' | 'cancelled'; bookingType?: 'cash' | 'contract';
  contractingCompanyId?: number; age?: number; governorate?: string; center?: string;
}
interface Operation {
  id: number; patientName: string; patientPhone: string; doctorName: string;
  surgeryType: string; date: string; cost: number; status: 'pending' | 'confirmed' | 'cancelled';
  contractingCompanyId?: number;
}
interface ContractingCompany { id: number; name: string; }
interface Props {
  bookings: Booking[]; operations: Operation[]; contractingCompanies: ContractingCompany[];
  cardClass: string; inputClass: string; onPrint: (title: string, html: string) => void;
}

const AGE_GROUPS = [
  { label: 'أقل من 10', min: 0, max: 9 },
  { label: '10 – 18', min: 10, max: 18 },
  { label: '19 – 30', min: 19, max: 30 },
  { label: '31 – 45', min: 31, max: 45 },
  { label: '46 – 60', min: 46, max: 60 },
  { label: 'أكبر من 60', min: 61, max: 200 },
];

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

const PatientStats: React.FC<Props> = ({ bookings, operations, contractingCompanies, cardClass, inputClass, onPrint }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'contracting' | 'geography' | 'age'>('overview');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const filteredBookings = useMemo(() => {
    let b = bookings;
    if (filterDoctor) b = b.filter(x => x.doctorName === filterDoctor);
    if (filterDateStart) b = b.filter(x => x.date >= filterDateStart);
    if (filterDateEnd) b = b.filter(x => x.date <= filterDateEnd);
    return b;
  }, [bookings, filterDoctor, filterDateStart, filterDateEnd]);

  const filteredOps = useMemo(() => {
    let o = operations;
    if (filterDoctor) o = o.filter(x => x.doctorName === filterDoctor);
    if (filterDateStart) o = o.filter(x => x.date >= filterDateStart);
    if (filterDateEnd) o = o.filter(x => x.date <= filterDateEnd);
    return o;
  }, [operations, filterDoctor, filterDateStart, filterDateEnd]);

  const doctors = useMemo(() => [...new Set([...bookings.map(b => b.doctorName), ...operations.map(o => o.doctorName)])].sort(), [bookings, operations]);

  // === Overview Stats ===
  const overview = useMemo(() => {
    const allPhones = new Set([...filteredBookings.map(b => b.phone), ...filteredOps.map(o => o.patientPhone)]);
    const bookingPhones = new Set(filteredBookings.map(b => b.phone));
    const opPhones = new Set(filteredOps.map(o => o.patientPhone));
    const repeatPhones = [...bookingPhones].filter(p => filteredBookings.filter(b => b.phone === p).length > 1);
    const patientsWithOps = [...opPhones];
    const newThisMonth = new Set(filteredBookings.filter(b => {
      const m = new Date().toISOString().slice(0, 7);
      return b.date.startsWith(m);
    }).map(b => b.phone));

    return {
      total: allPhones.size,
      newPatients: allPhones.size - repeatPhones.length,
      repeatPatients: repeatPhones.length,
      patientsWithOps: patientsWithOps.length,
    };
  }, [filteredBookings, filteredOps]);

  // === Contracting Stats ===
  const contractingStats = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalOps = filteredOps.filter(o => o.status !== 'cancelled').length;
    const allPhones = new Set([...filteredBookings.map(b => b.phone), ...filteredOps.map(o => o.patientPhone)]);
    const totalPatients = allPhones.size;

    // Cash stats
    const cashBookings = filteredBookings.filter(b => b.bookingType !== 'contract');
    const cashOps = filteredOps.filter(o => !o.contractingCompanyId);
    const cashPhones = new Set([...cashBookings.map(b => b.phone), ...cashOps.map(o => o.patientPhone)]);

    const companyStats = contractingCompanies.map(c => {
      const cBookings = filteredBookings.filter(b => b.contractingCompanyId === c.id);
      const cOps = filteredOps.filter(o => o.contractingCompanyId === c.id && o.status !== 'cancelled');
      const cPhones = new Set([...cBookings.map(b => b.phone), ...cOps.map(o => o.patientPhone)]);
      return {
        id: c.id, name: c.name,
        patients: cPhones.size,
        bookings: cBookings.length,
        operations: cOps.length,
        patientPct: totalPatients > 0 ? Math.round((cPhones.size / totalPatients) * 100) : 0,
        bookingPct: totalBookings > 0 ? Math.round((cBookings.length / totalBookings) * 100) : 0,
        opPct: totalOps > 0 ? Math.round((cOps.length / totalOps) * 100) : 0,
      };
    }).filter(c => c.patients > 0 || c.bookings > 0 || c.operations > 0);

    return {
      cash: { patients: cashPhones.size, bookings: cashBookings.length, operations: cashOps.length },
      companies: companyStats,
      totalBookings, totalOps, totalPatients
    };
  }, [filteredBookings, filteredOps, contractingCompanies]);

  // === Geography Stats ===
  const geoStats = useMemo(() => {
    const govMap: Record<string, { patients: Set<string>; bookings: number; ops: number; cancelled: number }> = {};
    const centerMap: Record<string, { patients: Set<string>; bookings: number; ops: number }> = {};

    filteredBookings.forEach(b => {
      const gov = b.governorate || 'غير محدد';
      const ctr = b.center || 'غير محدد';
      if (!govMap[gov]) govMap[gov] = { patients: new Set(), bookings: 0, ops: 0, cancelled: 0 };
      govMap[gov].patients.add(b.phone);
      govMap[gov].bookings++;
      if (b.status === 'cancelled') govMap[gov].cancelled++;
      if (!centerMap[ctr]) centerMap[ctr] = { patients: new Set(), bookings: 0, ops: 0 };
      centerMap[ctr].patients.add(b.phone);
      centerMap[ctr].bookings++;
    });

    filteredOps.forEach(o => {
      // Operations don't have governorate directly, skip for now
    });

    const byGovernorate = Object.entries(govMap)
      .map(([name, data]) => ({
        name, patients: data.patients.size, bookings: data.bookings,
        cancelRate: data.bookings > 0 ? Math.round((data.cancelled / data.bookings) * 100) : 0
      }))
      .sort((a, b) => b.patients - a.patients);

    const byCenter = Object.entries(centerMap)
      .map(([name, data]) => ({ name, patients: data.patients.size, bookings: data.bookings }))
      .sort((a, b) => b.patients - a.patients);

    return { byGovernorate, byCenter: byCenter.slice(0, 10) };
  }, [filteredBookings, filteredOps]);

  // === Age Stats ===
  const ageStats = useMemo(() => {
    return AGE_GROUPS.map(group => {
      const groupBookings = filteredBookings.filter(b => b.age && b.age >= group.min && b.age <= group.max);
      const confirmed = groupBookings.filter(b => b.status === 'confirmed').length;
      const cancelled = groupBookings.filter(b => b.status === 'cancelled').length;
      const total = groupBookings.length;

      const groupOps = filteredOps.filter(o => {
        const matchingBooking = filteredBookings.find(b => b.phone === o.patientPhone);
        const age = matchingBooking?.age;
        return age && age >= group.min && age <= group.max;
      });
      const opsConfirmed = groupOps.filter(o => o.status !== 'cancelled').length;
      const opsCancelled = groupOps.filter(o => o.status === 'cancelled').length;

      const surgeryTypes: Record<string, number> = {};
      groupOps.forEach(o => { surgeryTypes[o.surgeryType] = (surgeryTypes[o.surgeryType] || 0) + 1; });

      return {
        label: group.label,
        bookings: total, confirmed, cancelled,
        confirmRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
        cancelRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
        operations: groupOps.length, opsConfirmed, opsCancelled,
        opCancelRate: groupOps.length > 0 ? Math.round((opsCancelled / groupOps.length) * 100) : 0,
        topSurgeries: Object.entries(surgeryTypes).sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    });
  }, [filteredBookings, filteredOps]);

  const handlePrintStats = () => {
    let html = '<h3>إحصائيات المرضى</h3>';
    html += `<table><tr><td>إجمالي المرضى</td><td>${overview.total}</td></tr>
      <tr><td>مرضى جدد</td><td>${overview.newPatients}</td></tr>
      <tr><td>مرضى متكررون</td><td>${overview.repeatPatients}</td></tr>
      <tr><td>مرضى أجروا عمليات</td><td>${overview.patientsWithOps}</td></tr></table>`;
    html += '<h3>إحصائيات التعاقد</h3><table><thead><tr><th>الجهة</th><th>المرضى</th><th>الكشوفات</th><th>العمليات</th><th>%</th></tr></thead><tbody>';
    html += `<tr><td>نقدي</td><td>${contractingStats.cash.patients}</td><td>${contractingStats.cash.bookings}</td><td>${contractingStats.cash.operations}</td><td>-</td></tr>`;
    contractingStats.companies.forEach(c => {
      html += `<tr><td>${DOMPurify.sanitize(c.name)}</td><td>${c.patients}</td><td>${c.bookings}</td><td>${c.operations}</td><td>${c.patientPct}%</td></tr>`;
    });
    html += '</tbody></table>';
    html += '<h3>إحصائيات المحافظات (أعلى 10)</h3><table><thead><tr><th>المحافظة</th><th>المرضى</th><th>الحجوزات</th><th>نسبة الإلغاء</th></tr></thead><tbody>';
    geoStats.byGovernorate.slice(0, 10).forEach(g => {
      html += `<tr><td>${DOMPurify.sanitize(g.name)}</td><td>${g.patients}</td><td>${g.bookings}</td><td>${g.cancelRate}%</td></tr>`;
    });
    html += '</tbody></table>';
    html += '<h3>إحصائيات الفئات العمرية</h3><table><thead><tr><th>الفئة</th><th>الكشوفات</th><th>نسبة التأكيد</th><th>العمليات</th></tr></thead><tbody>';
    ageStats.forEach(a => {
      html += `<tr><td>${a.label}</td><td>${a.bookings}</td><td>${a.confirmRate}%</td><td>${a.operations}</td></tr>`;
    });
    html += '</tbody></table>';
    onPrint('إحصائيات المرضى', html);
  };

  const sections = [
    { id: 'overview', label: 'نظرة عامة', icon: Users },
    { id: 'contracting', label: 'حسب التعاقد', icon: Building2 },
    { id: 'geography', label: 'حسب المنطقة', icon: MapPin },
    { id: 'age', label: 'حسب السن', icon: Heart },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><PieChart size={28} className="text-blue-600" /> إحصائيات المرضى</h2>
          <p className="text-xs text-gray-400 font-bold mt-1">بيانات حقيقية من قاعدة البيانات</p>
        </div>
        <button onClick={handlePrintStats} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition-all"><Printer size={14} /> طباعة / PDF</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} className={inputClass + " w-auto text-xs"}>
          <option value="">كل الأطباء</option>
          {doctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className={inputClass + " w-auto text-xs"} />
        <span className="text-gray-400 text-xs font-bold">إلى</span>
        <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className={inputClass + " w-auto text-xs"} />
        {(filterDoctor || filterDateStart || filterDateEnd) && (
          <button onClick={() => { setFilterDoctor(''); setFilterDateStart(''); setFilterDateEnd(''); }} className="text-red-500 text-xs font-bold hover:underline">مسح الفلاتر</button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSection === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-500 border border-gray-100 hover:bg-blue-50 hover:text-blue-600'}`}>
            <s.icon size={16} /> {s.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="إجمالي المرضى" value={overview.total} icon={Users} color="bg-blue-100 text-blue-600" />
            <StatCard label="مرضى جدد" value={overview.newPatients} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
            <StatCard label="مرضى متكررون" value={overview.repeatPatients} icon={UserCheck} color="bg-purple-100 text-purple-600" />
            <StatCard label="أجروا عمليات" value={overview.patientsWithOps} icon={Scissors} color="bg-red-100 text-red-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Building2 size={16} className="text-blue-600" /> توزيع نقدي / تعاقد</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl"><span className="text-xs font-bold text-green-700">نقدي</span><span className="font-black text-green-600">{contractingStats.cash.bookings} كشف</span></div>
                {contractingStats.companies.slice(0, 5).map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <span className="text-xs font-bold text-blue-700">{c.name}</span>
                    <span className="font-black text-blue-600">{c.bookings} كشف</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> أعلى 5 محافظات</h3>
              <div className="space-y-2">
                {geoStats.byGovernorate.slice(0, 5).map((g, i) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                    <span className="text-xs font-bold text-gray-700 flex-1">{g.name}</span>
                    <span className="text-xs font-black text-blue-600">{g.patients} مريض</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contracting */}
      {activeSection === 'contracting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="نقدي - مرضى" value={contractingStats.cash.patients} icon={Users} color="bg-green-100 text-green-600" sub={`${contractingStats.cash.bookings} كشف / ${contractingStats.cash.operations} عملية`} />
            {contractingStats.companies.slice(0, 5).map(c => (
              <StatCard key={c.id} label={c.name} value={c.patients} icon={Building2} color="bg-blue-100 text-blue-600" sub={`${c.bookings} كشف / ${c.operations} عملية (${c.patientPct}%)`} />
            ))}
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">جدول التعاقدات التفصيلي</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">الجهة</th><th className="p-3 text-right">المرضى</th>
                  <th className="p-3 text-right">الكشوفات</th><th className="p-3 text-right">العمليات</th>
                  <th className="p-3 text-right">% مرضى</th><th className="p-3 text-right">% كشوفات</th><th className="p-3 text-right">% عمليات</th>
                </tr></thead>
                <tbody>
                  <tr className="border-t border-gray-50 bg-green-50/30">
                    <td className="p-3 font-bold text-green-700">نقدي</td>
                    <td className="p-3">{contractingStats.cash.patients}</td><td className="p-3">{contractingStats.cash.bookings}</td><td className="p-3">{contractingStats.cash.operations}</td>
                    <td className="p-3">-</td><td className="p-3">-</td><td className="p-3">-</td>
                  </tr>
                  {contractingStats.companies.map(c => (
                    <tr key={c.id} className="border-t border-gray-50">
                      <td className="p-3 font-bold">{c.name}</td>
                      <td className="p-3">{c.patients}</td><td className="p-3">{c.bookings}</td><td className="p-3">{c.operations}</td>
                      <td className="p-3 text-blue-600 font-bold">{c.patientPct}%</td>
                      <td className="p-3 text-blue-600 font-bold">{c.bookingPct}%</td>
                      <td className="p-3 text-blue-600 font-bold">{c.opPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Pie chart visualization */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><PieChart size={16} className="text-blue-600" /> توزيع المرضى حسب التعاقد</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full" /><span className="text-xs font-bold">نقدي: {contractingStats.cash.patients}</span></div>
              {contractingStats.companies.map((c, i) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
                return <div key={c.id} className="flex items-center gap-2"><div className={`w-4 h-4 ${colors[i % colors.length]} rounded-full`} /><span className="text-xs font-bold">{c.name}: {c.patients} ({c.patientPct}%)</span></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Geography */}
      {activeSection === 'geography' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> المرضى حسب المحافظة</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">#</th><th className="p-3 text-right">المحافظة</th><th className="p-3 text-right">المرضى</th><th className="p-3 text-right">الحجوزات</th><th className="p-3 text-right">نسبة الإلغاء</th>
                </tr></thead>
                <tbody>
                  {geoStats.byGovernorate.map((g, i) => (
                    <tr key={g.name} className="border-t border-gray-50">
                      <td className="p-3 text-xs font-black text-gray-400">{i + 1}</td>
                      <td className="p-3 font-bold">{g.name}</td>
                      <td className="p-3">{g.patients}</td><td className="p-3">{g.bookings}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.cancelRate > 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{g.cancelRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> أعلى 10 مراكز</h3>
            <div className="space-y-2">
              {geoStats.byCenter.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <span className="text-xs font-black text-gray-400 w-6">{i + 1}</span>
                  <span className="text-xs font-bold text-gray-700 flex-1">{c.name}</span>
                  <span className="text-xs font-black text-blue-600">{c.patients} مريض</span>
                  <span className="text-[10px] text-gray-400">{c.bookings} حجز</span>
                </div>
              ))}
              {geoStats.byCenter.length === 0 && <p className="text-center text-gray-400 text-xs py-4">لا توجد بيانات</p>}
            </div>
          </div>
        </div>
      )}

      {/* Age */}
      {activeSection === 'age' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Heart size={16} className="text-red-500" /> الكشوفات حسب الفئة العمرية</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">الفئة</th><th className="p-3 text-right">عدد المرضى</th><th className="p-3 text-right">نسبة التأكيد</th><th className="p-3 text-right">نسبة الإلغاء</th>
                </tr></thead>
                <tbody>
                  {ageStats.map(a => (
                    <tr key={a.label} className="border-t border-gray-50">
                      <td className="p-3 font-bold">{a.label}</td><td className="p-3">{a.bookings}</td>
                      <td className="p-3"><span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">{a.confirmRate}%</span></td>
                      <td className="p-3"><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{a.cancelRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Scissors size={16} className="text-purple-500" /> العمليات حسب الفئة العمرية</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <th className="p-3 text-right">الفئة</th><th className="p-3 text-right">عدد العمليات</th><th className="p-3 text-right">نسبة إلغاء العمليات</th><th className="p-3 text-right">أكثر العمليات</th>
                </tr></thead>
                <tbody>
                  {ageStats.map(a => (
                    <tr key={a.label} className="border-t border-gray-50">
                      <td className="p-3 font-bold">{a.label}</td><td className="p-3">{a.operations}</td>
                      <td className="p-3"><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{a.opCancelRate}%</span></td>
                      <td className="p-3 text-xs">{a.topSurgeries.map(([type, count]) => `${type}(${count})`).join('، ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Age bar chart */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4">توزيع المرضى حسب السن</h3>
            <MiniBar data={ageStats.map(a => ({ label: a.label, value: a.bookings }))} maxVal={Math.max(...ageStats.map(a => a.bookings), 1)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientStats;
