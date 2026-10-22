import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeBackend } from '@/lib/backend';
import { UserCog, Edit2, Save, X, User, Shield, RefreshCw, Crown, UserCheck, Trash2, AlertTriangle, Power, Key, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { StaffMember } from '@/hooks/useRealtimeSync';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Available permissions for staff members
const AVAILABLE_PERMISSIONS = [
  { id: 'manage_doctors', label: 'إدارة الأطباء' },
  { id: 'manage_bookings', label: 'إدارة الحجوزات' },
  { id: 'manage_partners', label: 'إدارة التعاقدات' },
  { id: 'manage_content', label: 'إدارة المحتوى والخدمات' },
  { id: 'view_reports', label: 'عرض التقارير والإحصائيات' },
  { id: 'manage_settings', label: 'الإعدادات العامة' },
  { id: 'manage_complaints', label: 'إدارة الشكاوى والمقترحات' },
  { id: 'manage_reminders', label: 'إدارة التذكيرات' },
  { id: 'manage_operations', label: 'إدارة سجل العمليات' },
  { id: 'manage_users', label: 'إدارة المستخدمين' },
  { id: 'manage_payments', label: 'إدارة المدفوعات' },
  { id: 'review_instapay', label: 'مراجعة مدفوعات إنستاباي' },
  { id: 'view_audit_log', label: 'سجل العمليات (Audit Log)' },
];

interface StaffManagementProps {
  inputClass: string;
  cardClass: string;
  currentUserId?: string;
}

export function StaffManagement({ inputClass, cardClass, currentUserId }: StaffManagementProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    username: '', 
    loginUsername: '',
    role: 'staff' as 'admin' | 'staff',
    permissions: [] as string[],
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Password change state
  const [passwordChangeId, setPasswordChangeId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Store profiles and roles separately for combining
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Combine profiles and roles into staff members
  const combineStaffData = useCallback((profilesData: any[], rolesData: any[]): StaffMember[] => {
    return (profilesData || []).map(profile => {
      const roleData = rolesData?.find(r => r.user_id === profile.user_id);
      return {
        user_id: profile.user_id,
        name: profile.name,
        username: profile.username,
        login_username: profile.login_username || null,
        role: (roleData?.role as 'admin' | 'staff') || 'staff',
        permissions: profile.permissions || [],
        is_active: profile.is_active !== false,
      };
    });
  }, []);

  // Update staff members when profiles or roles change
  useEffect(() => {
    const combined = combineStaffData(profiles, roles);
    setStaffMembers(combined);
  }, [profiles, roles, combineStaffData]);

  const fetchStaffMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, name, username, login_username, permissions, is_active'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up realtime subscriptions for profiles and user_roles
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSync = async () => {
      await fetchStaffMembers();

      channel = supabase
        .channel('staff-management-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload: RealtimePostgresChangesPayload<any>) => {
            setProfiles(prev => {
              if (payload.eventType === 'INSERT') {
                return [payload.new, ...prev];
              } else if (payload.eventType === 'UPDATE') {
                const index = prev.findIndex(p => p.user_id === payload.new.user_id);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = payload.new;
                  return updated;
                }
                return prev;
              } else if (payload.eventType === 'DELETE') {
                return prev.filter(p => p.user_id !== payload.old.user_id);
              }
              return prev;
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_roles' },
          (payload: RealtimePostgresChangesPayload<any>) => {
            setRoles(prev => {
              if (payload.eventType === 'INSERT') {
                return [payload.new, ...prev];
              } else if (payload.eventType === 'UPDATE') {
                const index = prev.findIndex(r => r.user_id === payload.new.user_id);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = payload.new;
                  return updated;
                }
                return prev;
              } else if (payload.eventType === 'DELETE') {
                return prev.filter(r => r.user_id !== payload.old.user_id);
              }
              return prev;
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSync();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchStaffMembers]);

  const handleEdit = (member: StaffMember) => {
    setEditingId(member.user_id);
    setEditForm({
      name: member.name,
      username: member.username || '',
      loginUsername: member.login_username || '',
      role: member.role,
      permissions: member.permissions || [],
      isActive: member.is_active !== false,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ name: '', username: '', loginUsername: '', role: 'staff', permissions: [], isActive: true });
  };

  const handleSave = async (userId: string) => {
    if (!editForm.name.trim()) {
      toast.error('اسم الموظف مطلوب');
      return;
    }

    // Prevent admin from demoting themselves or disabling themselves
    if (userId === currentUserId) {
      if (editForm.role !== 'admin') {
        toast.error('لا يمكنك تغيير دورك الخاص');
        return;
      }
      if (!editForm.isActive) {
        toast.error('لا يمكنك تعطيل حسابك الخاص');
        return;
      }
    }

    setSaving(true);
    try {
      // Update profile with all fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name.trim(),
          username: editForm.username.trim() || null,
          login_username: editForm.loginUsername.trim() || null,
          permissions: editForm.permissions,
          is_active: editForm.isActive,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Check if role exists
      const existingRole = roles.find(r => r.user_id === userId);
      
      if (existingRole) {
        // Update existing role
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.role })
          .eq('user_id', userId);

        if (roleError) throw roleError;
      } else {
        // Insert new role if it doesn't exist
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: editForm.role });

        if (roleError) throw roleError;
      }

      toast.success('تم تحديث بيانات الموظف بنجاح');
      setEditingId(null);
      setEditForm({ name: '', username: '', loginUsername: '', role: 'staff', permissions: [], isActive: true });
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    if (member.user_id === currentUserId) {
      toast.error('لا يمكنك تعطيل حسابك الخاص');
      return;
    }

    try {
      const newStatus = !member.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', member.user_id);

      if (error) throw error;
      
      toast.success(newStatus ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('حدث خطأ أثناء تغيير حالة الحساب');
    }
  };

  const handleTogglePermission = (permId: string) => {
    setEditForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleDeleteConfirm = (userId: string) => {
    // Prevent deleting yourself
    if (userId === currentUserId) {
      toast.error('لا يمكنك حذف حسابك الخاص');
      return;
    }
    setDeleteConfirmId(userId);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error('لا يمكنك حذف حسابك الخاص');
      return;
    }

    setDeleting(true);
    try {
      // Delete user role first (due to foreign key constraints in practice)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success('تم حذف الموظف بنجاح');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('حدث خطأ أثناء حذف الموظف');
    } finally {
      setDeleting(false);
    }
  };

  // Password change handlers
  const handlePasswordChangeStart = (userId: string) => {
    setPasswordChangeId(userId);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordChangeCancel = () => {
    setPasswordChangeId(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordChange = async (userId: string) => {
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setChangingPassword(true);
    try {
      // Use admin API to update user password via edge function
      const { data, error } = await invokeBackend('admin-update-password', {
        body: { userId, newPassword }
      });

      if (error) throw error;

      toast.success('تم تغيير كلمة المرور بنجاح');
      handlePasswordChangeCancel();
    } catch (error: any) {
      console.error('Error changing password:', error);
      // Fallback: Try using Supabase Auth Admin (this may require service role key in edge function)
      toast.error('حدث خطأ أثناء تغيير كلمة المرور. تأكد من صلاحيات النظام.');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: 'admin' | 'staff') => {
    return role === 'admin' ? 'مدير نظام' : 'موظف';
  };

  const getRoleColor = (role: 'admin' | 'staff') => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-700' 
      : 'bg-blue-100 text-blue-700';
  };

  const getRoleIcon = (role: 'admin' | 'staff') => {
    return role === 'admin' ? Crown : UserCheck;
  };

  // Add new user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    password: '',
    name: '',
    loginUsername: '',
    role: 'staff' as 'admin' | 'staff',
    permissions: [] as string[],
  });
  const [addingUser, setAddingUser] = useState(false);

  const handleAddUser = async () => {
    if (!addUserForm.email || !addUserForm.password || !addUserForm.name) {
      toast.error('يرجى ملء البريد الإلكتروني وكلمة المرور والاسم');
      return;
    }
    if (addUserForm.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    setAddingUser(true);
    try {
      const { data, error } = await invokeBackend('add-staff-user', {
        body: {
          email: addUserForm.email.trim(),
          password: addUserForm.password,
          name: addUserForm.name.trim(),
          loginUsername: addUserForm.loginUsername.trim() || null,
          role: addUserForm.role,
          permissions: addUserForm.role === 'admin' ? AVAILABLE_PERMISSIONS.map(p => p.id) : addUserForm.permissions,
        }
      });

      if (error) throw error;
      
      toast.success('تم إضافة المستخدم بنجاح');
      setShowAddUser(false);
      setAddUserForm({ email: '', password: '', name: '', loginUsername: '', role: 'staff', permissions: [] });
      // Refresh the list
      await fetchStaffMembers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error?.message || 'حدث خطأ أثناء إضافة المستخدم');
    } finally {
      setAddingUser(false);
    }
  };

  const handleToggleAddPermission = (permId: string) => {
    setAddUserForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <UserCog className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold">إدارة الموظفين المسجلين</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <User size={16} />
              إضافة مستخدم
            </button>
            <button
              onClick={fetchStaffMembers}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>
        </div>

        {/* Add User Form */}
        {showAddUser && (
          <div className="mb-6 p-6 bg-gray-50 rounded-2xl border border-blue-100 space-y-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              إضافة مستخدم جديد
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">الاسم الكامل *</label>
                <input
                  type="text"
                  value={addUserForm.name}
                  onChange={e => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="أدخل اسم الموظف"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={e => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  className={inputClass}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">كلمة المرور *</label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  className={inputClass}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">اسم المستخدم للدخول (اختياري)</label>
                <input
                  type="text"
                  value={addUserForm.loginUsername}
                  onChange={e => setAddUserForm({ ...addUserForm, loginUsername: e.target.value })}
                  className={inputClass}
                  placeholder="اسم مختصر لتسجيل الدخول"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block">الدور الوظيفي</label>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                <button
                  type="button"
                  onClick={() => setAddUserForm({ ...addUserForm, role: 'staff' })}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    addUserForm.role === 'staff' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <UserCheck size={16} /> موظف
                </button>
                <button
                  type="button"
                  onClick={() => setAddUserForm({ ...addUserForm, role: 'admin' })}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    addUserForm.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Crown size={16} /> مدير
                </button>
              </div>
            </div>
            {addUserForm.role === 'staff' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">الصلاحيات</label>
                <div className="max-h-48 overflow-y-auto bg-white rounded-xl p-3 border border-gray-200 space-y-2">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={addUserForm.permissions.includes(perm.id)}
                        onChange={() => handleToggleAddPermission(perm.id)}
                        className="w-4 h-4 text-blue-600 rounded-sm border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddUser}
                disabled={addingUser}
                className="flex items-center gap-2 bg-blue-600 text-white py-2.5 px-6 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {addingUser ? 'جاري الإضافة...' : 'إضافة المستخدم'}
              </button>
              <button
                onClick={() => setShowAddUser(false)}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 py-2.5 px-6 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors"
              >
                <X size={16} /> إلغاء
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-bold">لا يوجد موظفين مسجلين</p>
            <p className="text-sm mt-1">سيظهر الموظفون هنا بعد تسجيل حساباتهم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffMembers.map(member => {
              const RoleIcon = getRoleIcon(member.role);
              const isCurrentUser = member.user_id === currentUserId;
              const isDeleting = deleteConfirmId === member.user_id;
              
              return (
                <div
                  key={member.user_id}
                  className={`bg-gray-50 rounded-2xl p-5 border transition-all ${
                    isCurrentUser ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 hover:shadow-md'
                  }`}
                >
                  {isDeleting ? (
                    // Delete Confirmation Mode
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="font-bold">تأكيد الحذف</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        هل أنت متأكد من حذف الموظف <strong>{member.name}</strong>؟
                        <br />
                        <span className="text-red-500">هذا الإجراء لا يمكن التراجع عنه.</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(member.user_id)}
                          disabled={deleting}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          disabled={deleting}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors"
                        >
                          <X size={16} />
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : editingId === member.user_id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                          اسم الموظف
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className={inputClass}
                          placeholder="أدخل اسم الموظف"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                          اسم المستخدم (للعرض)
                        </label>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                          className={inputClass}
                          placeholder="أدخل اسم المستخدم للعرض (اختياري)"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                          اسم المستخدم للدخول
                        </label>
                        <input
                          type="text"
                          value={editForm.loginUsername}
                          onChange={e => setEditForm({ ...editForm, loginUsername: e.target.value })}
                          className={inputClass}
                          placeholder="أدخل اسم المستخدم لتسجيل الدخول"
                          dir="ltr"
                        />
                        <p className="text-xs text-gray-400 mt-1">يُستخدم بدلاً من البريد الإلكتروني عند تسجيل الدخول</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                          الدور الوظيفي
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, role: 'staff' })}
                            disabled={isCurrentUser}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                              editForm.role === 'staff'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <UserCheck size={16} />
                            موظف
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                            disabled={isCurrentUser}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                              editForm.role === 'admin'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Crown size={16} />
                            مدير
                          </button>
                        </div>
                        {isCurrentUser && (
                          <p className="text-xs text-amber-600 mt-2">
                            لا يمكنك تغيير دورك الخاص
                          </p>
                        )}
                      </div>
                      
                      {/* Permissions Section - Only for staff role */}
                      {editForm.role === 'staff' && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-2 block">
                            الصلاحيات (للموظفين فقط)
                          </label>
                          <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                            {AVAILABLE_PERMISSIONS.map(perm => (
                              <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editForm.permissions.includes(perm.id)}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="w-4 h-4 text-blue-600 rounded-sm border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-gray-700">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">المدير يملك كل الصلاحيات تلقائياً</p>
                        </div>
                      )}
                      
                      {/* Active Status Toggle */}
                      {!isCurrentUser && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">
                            حالة الحساب
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, isActive: true })}
                              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                                editForm.isActive
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Power size={16} />
                              نشط
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, isActive: false })}
                              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                                !editForm.isActive
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Power size={16} />
                              معطل
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSave(member.user_id)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Save size={16} />
                          {saving ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors"
                        >
                          <X size={16} />
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                            member.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              {member.name}
                              {isCurrentUser && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                  أنت
                                </span>
                              )}
                            </h4>
                            {member.username && (
                              <p className="text-sm text-gray-500 flex items-center gap-1" dir="ltr">
                                @{member.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl ${getRoleColor(member.role)}`}>
                          <RoleIcon size={16} />
                          <span>{getRoleLabel(member.role)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Shield size={14} className="text-gray-400" />
                          <span>{member.role === 'admin' ? 'جميع الصلاحيات' : `${member.permissions?.length || 0} صلاحيات`}</span>
                        </div>
                        {/* Active Status Indicator */}
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl ${
                          member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          <Power size={14} />
                          <span>{member.is_active ? 'نشط' : 'معطل'}</span>
                        </div>
                        {!member.username && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            لم يتم تعيين اسم مستخدم
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 size={16} />
                          تعديل
                        </button>
                        <button
                          onClick={() => handlePasswordChangeStart(member.user_id)}
                          className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-2.5 px-4 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors"
                          title="تغيير كلمة المرور"
                        >
                          <Key size={16} />
                        </button>
                        {!isCurrentUser && (
                          <>
                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-colors ${
                                member.is_active 
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                              title={member.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(member.user_id)}
                              className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 px-4 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Password Change Modal */}
                      {passwordChangeId === member.user_id && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                          <div className="flex items-center gap-2 text-purple-700 font-bold">
                            <Lock size={18} />
                            <span>تغيير كلمة المرور</span>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">كلمة المرور الجديدة</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className={inputClass}
                              placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">تأكيد كلمة المرور</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className={inputClass}
                              placeholder="أعد كتابة كلمة المرور"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePasswordChange(member.user_id)}
                              disabled={changingPassword}
                              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              <Key size={16} />
                              {changingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                            </button>
                            <button
                              onClick={handlePasswordChangeCancel}
                              disabled={changingPassword}
                              className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}