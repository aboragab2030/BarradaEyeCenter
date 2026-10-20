import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { ShieldCheck, CheckCircle, Building2, Plus, Trash2, Edit2, Save, X, FileText, Upload, Settings, Paperclip, Printer, Phone, User, List, AlertTriangle } from 'lucide-react';

export const CONTRACTING_STORAGE_KEY = 'barada_contracting_v1';

export interface ContractingCompany {
  id: number;
  name: string;
  documents: string[];
  managerName?: string;
  managerPhone?: string;
}

const DEFAULT_COMPANIES: ContractingCompany[] = [
  { id: 1, name: 'مصر للتأمين (Misr Insurance)', documents: ['كارنيه الشركة الساري', 'صورة بطاقة الرقم القومي', 'نموذج تحويل معتمد'], managerName: 'أ. أحمد حسن', managerPhone: '01012345678' },
  { id: 2, name: 'أكسا للتأمين (AXA)', documents: ['كارنيه أكسا', 'بطاقة الرقم القومي'], managerName: 'د. سارة محمود', managerPhone: '01234567890' },
  { id: 3, name: 'ميدنت (MedNet)', documents: ['بطاقة ميدنت الممغنطة', 'استمارة الكشف الطبي'], managerName: 'أ. محمد علي', managerPhone: '01122334455' },
  { id: 4, name: 'نقابة المهندسين', documents: ['كارنيه النقابة الساري', 'خطاب تحويل من النقابة'], managerName: 'م. خالد ابراهيم', managerPhone: '01555555555' },
];

export const ContractingManager = {
  getAll: (): ContractingCompany[] => {
    try {
      const stored = localStorage.getItem(CONTRACTING_STORAGE_KEY);
      if (!stored) {
         localStorage.setItem(CONTRACTING_STORAGE_KEY, JSON.stringify(DEFAULT_COMPANIES));
         return DEFAULT_COMPANIES;
      }
      return JSON.parse(stored);
    } catch { return DEFAULT_COMPANIES; }
  },
  save: (data: ContractingCompany[]) => {
    localStorage.setItem(CONTRACTING_STORAGE_KEY, JSON.stringify(data));
  }
};

export const ContractingSelector = ({ companies, value, onChange }: { companies: ContractingCompany[], value: number | undefined, onChange: (val: number | undefined) => void }) => {
    const selectedCompany = companies.find(c => c.id === value);

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">جهة التعاقد / التأمين</label>
            <select 
                value={value || ''} 
                onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
            >
                <option value="">حساب خاص (بدون تعاقد)</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            {selectedCompany && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
                        <FileText size={16} />
                        <span className="text-xs">المستندات المطلوبة:</span>
                    </div>
                    <ul className="space-y-1">
                        {selectedCompany.documents.map((doc, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                <CheckCircle size={12} className="mt-0.5 text-blue-500 shrink-0" />
                                <span>{doc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export const ContractingManagement = () => {
  const [companies, setCompanies] = useState<ContractingCompany[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{name: string, documents: string[], newDoc: string, managerName: string, managerPhone: string}>({ name: '', documents: [], newDoc: '', managerName: '', managerPhone: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setCompanies(ContractingManager.getAll());
  }, []);

  const saveToStorage = (newData: ContractingCompany[]) => {
    setCompanies(newData);
    ContractingManager.save(newData);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    const newCompanyData = {
        name: formData.name,
        documents: formData.documents,
        managerName: formData.managerName,
        managerPhone: formData.managerPhone
    };

    if (isAdding) {
      const newCompany = { id: Date.now(), ...newCompanyData };
      saveToStorage([...companies, newCompany]);
      setIsAdding(false);
    } else if (editingId) {
      saveToStorage(companies.map(c => c.id === editingId ? { ...c, ...newCompanyData } : c));
      setEditingId(null);
    }
    setFormData({ name: '', documents: [], newDoc: '', managerName: '', managerPhone: '' });
  };

  const handleEdit = (comp: ContractingCompany) => {
      setEditingId(comp.id);
      setFormData({
          name: comp.name,
          documents: comp.documents,
          newDoc: '',
          managerName: comp.managerName || '',
          managerPhone: comp.managerPhone || ''
      });
      setIsAdding(false);
  };

  const handleDelete = (id: number) => {
      setDeletingId(id);
  };

  const confirmDelete = () => {
      if (deletingId) {
          saveToStorage(companies.filter(c => c.id !== deletingId));
          setDeletingId(null);
      }
  };

  const addDocument = () => {
    if (formData.newDoc.trim()) {
      setFormData(prev => ({ ...prev, documents: [...prev.documents, prev.newDoc.trim()], newDoc: '' }));
    }
  };

  const removeDocument = (index: number) => {
      setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }));
  };

  const handlePrint = (comp: ContractingCompany) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      // Sanitize all user-provided data to prevent XSS attacks
      const sanitizedName = DOMPurify.sanitize(comp.name);
      const sanitizedManagerName = DOMPurify.sanitize(comp.managerName || 'غير محدد');
      const sanitizedManagerPhone = DOMPurify.sanitize(comp.managerPhone || 'غير محدد');
      const sanitizedDocs = comp.documents.map(doc => DOMPurify.sanitize(doc));
      
      const content = `
        <div style="direction: rtl; font-family: 'Cairo', sans-serif; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: #1e3a8a; margin: 0;">مركز براده للعيون</h1>
                <h2 style="color: #4b5563; margin: 10px 0;">تفاصيل جهة التعاقد</h2>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #1e3a8a;">${sanitizedName}</h3>
                
                <div style="display: flex; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1;">
                        <strong style="display: block; color: #64748b; font-size: 12px;">مسؤول التعاقد</strong>
                        <div style="font-weight: bold; font-size: 16px;">${sanitizedManagerName}</div>
                    </div>
                    <div style="flex: 1;">
                        <strong style="display: block; color: #64748b; font-size: 12px;">رقم الهاتف</strong>
                        <div style="font-weight: bold; font-size: 16px;">${sanitizedManagerPhone}</div>
                    </div>
                </div>
            </div>

            <h4 style="border-bottom: 1px solid #ddd; padding-bottom: 10px;">المستندات المطلوبة</h4>
            <ul style="list-style: none; padding: 0;">
                ${sanitizedDocs.map(doc => `
                    <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                        <span style="color: #2563eb;">✔</span> ${doc}
                    </li>
                `).join('')}
            </ul>

            <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
                تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
            </div>
        </div>
      `;

      printWindow.document.write(`<html><head><title>طباعة تعاقد - ${sanitizedName}</title><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Cairo', sans-serif; }</style></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
          printWindow.print();
          printWindow.close();
      }, 500);
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="text-blue-600"/> 
                إدارة التعاقدات والتأمين
            </h3>
            <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', documents: [], newDoc: '', managerName: '', managerPhone: '' }); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                <Plus size={18} /> إضافة شركة
            </button>
        </div>

        {(isAdding || editingId) && (
            <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900">{isAdding ? 'إضافة جهة تعاقد جديدة' : 'تعديل بيانات التعاقد'}</h4>
                    <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">اسم الشركة / الجهة</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: نقابة المهندسين" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">مسؤول التعاقد (اختياري)</label>
                        <input type="text" value={formData.managerName} onChange={e => setFormData({...formData, managerName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">رقم هاتف المسؤول (اختياري)</label>
                        <input type="text" value={formData.managerPhone} onChange={e => setFormData({...formData, managerPhone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">المستندات المطلوبة من المريض</label>
                    <div className="flex gap-2 mb-2">
                        <input type="text" value={formData.newDoc} onChange={e => setFormData({...formData, newDoc: e.target.value})} onKeyDown={e => e.key === 'Enter' && addDocument()} className="flex-1 bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: صورة الكارنيه" />
                        <button onClick={addDocument} className="bg-gray-200 text-gray-700 px-4 rounded-xl font-bold hover:bg-gray-300">إضافة</button>
                    </div>
                    <div className="space-y-2">
                        {formData.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 px-3 rounded-lg border border-gray-200">
                                <span className="text-sm font-medium text-gray-700">{doc}</span>
                                <button onClick={() => removeDocument(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                     <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                        <Save size={18} /> حفظ البيانات
                     </button>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map(company => (
                <div key={company.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-all bg-gray-50 group relative">
                    <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg text-gray-900">{company.name}</h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handlePrint(company)} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50" title="طباعة التفاصيل"><Printer size={16}/></button>
                            <button onClick={() => handleEdit(company)} className="p-2 bg-white text-green-600 rounded-lg shadow-sm hover:bg-green-50" title="تعديل"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(company.id)} className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-50" title="حذف"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    
                    {(company.managerName || company.managerPhone) && (
                        <div className="flex gap-4 text-xs text-gray-500 mb-4 bg-white p-3 rounded-xl border border-gray-100">
                            {company.managerName && <div className="flex items-center gap-1"><User size={12}/> {company.managerName}</div>}
                            {company.managerPhone && <div className="flex items-center gap-1"><Phone size={12}/> {company.managerPhone}</div>}
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><List size={12}/> المستندات المطلوبة:</p>
                        <ul className="space-y-1">
                            {company.documents.length > 0 ? company.documents.map((doc, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> {doc}
                                </li>
                            )) : <li className="text-xs text-gray-400 italic">لا توجد مستندات مسجلة</li>}
                        </ul>
                    </div>
                </div>
            ))}
        </div>

        {deletingId && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">حذف جهة التعاقد؟</h3>
                    <p className="text-sm text-gray-500 mb-6">سيتم حذف هذه الشركة وجميع المتطلبات المسجلة لها. لا يمكن التراجع عن هذا الإجراء.</p>
                    <div className="flex gap-3">
                        <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700">تأكيد الحذف</button>
                        <button onClick={() => setDeletingId(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200">إلغاء</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
