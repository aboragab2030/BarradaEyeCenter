import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface BaradaUser {
  id: string;
  name: string;
  username: string; // Now fetched from profiles table
  displayUsername: string; // Username for display (from profiles.username or email prefix)
  loginUsername: string; // Username used for login
  role: 'admin' | 'staff';
  permissions: string[];
  isActive: boolean;
}

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  baradaUser: BaradaUser | null;
  isLoading: boolean;
}

// Module-level permissions
export const MODULE_PERMISSIONS = {
  doctors: 'manage_doctors',
  bookings: 'manage_bookings',
  contracts: 'manage_partners',
  patients: 'manage_bookings', // Patients are managed through bookings
  users: 'manage_users', // User management has its own permission
  reports: 'view_reports',
  settings: 'manage_settings',
  payments: 'manage_payments',
  audit: 'view_audit_log',
};

const ALL_PERMISSIONS = [
  'manage_doctors',
  'manage_bookings',
  'manage_partners',
  'manage_content',
  'view_reports',
  'manage_settings',
  'manage_complaints',
  'manage_reminders',
  'manage_operations',
  'manage_users',
  'manage_payments',
  'review_instapay',
  'view_audit_log',
];

// Helper function to check if user has specific permission
export const hasPermission = (user: BaradaUser | null, permission: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
};

// Helper function to check module access
export const hasModuleAccess = (user: BaradaUser | null, module: keyof typeof MODULE_PERMISSIONS): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const requiredPermission = MODULE_PERMISSIONS[module];
  return user.permissions.includes(requiredPermission);
};

export function useBaradaAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    baradaUser: null,
    isLoading: true,
  });

  const fetchUserRole = useCallback(async (userId: string, userEmail: string, userName: string) => {
    try {
      // Fetch profile data including username, permissions, and active status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, username, login_username, permissions, is_active')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile');
      }

      // Check if user is active
      if (profileData && profileData.is_active === false) {
        return null; // User is disabled
      }

      // Check user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role', { ascending: true });

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role');
        return null;
      }

      const role = roleData?.some(r => r.role === 'admin') ? 'admin' : (roleData?.[0]?.role || 'staff');
      
      // Admin gets all permissions, staff gets permissions from profile or default
      let permissions: string[];
      if (role === 'admin') {
        permissions = ALL_PERMISSIONS;
      } else {
        // Use permissions from profile if available, otherwise default
        const profilePermissions = profileData?.permissions as string[] | null;
        permissions = profilePermissions && profilePermissions.length > 0 
          ? profilePermissions 
          : ['manage_bookings', 'view_reports'];
      }

      // Get username from profile, fallback to email prefix
      const displayUsername = profileData?.username || userEmail?.split('@')[0] || 'user';
      const displayName = profileData?.name || userName || userEmail?.split('@')[0] || 'User';
      const loginUsername = profileData?.login_username || userEmail?.split('@')[0] || '';

      const baradaUser: BaradaUser = {
        id: userId,
        name: displayName,
        username: userEmail?.split('@')[0] || 'user',
        displayUsername,
        loginUsername,
        role: role as 'admin' | 'staff',
        permissions,
        isActive: profileData?.is_active !== false,
      };

      return baradaUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer fetching user role to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            const profile = await fetchUserRole(
              session.user.id, 
              session.user.email || '',
              session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
            );
            setAuthState(prev => ({
              ...prev,
              baradaUser: profile,
              isLoading: false,
            }));
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            baradaUser: null,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserRole(
          session.user.id, 
          session.user.email || '',
          session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
        ).then(profile => {
          setAuthState(prev => ({
            ...prev,
            baradaUser: profile,
            isLoading: false,
          }));
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // Sign in with username or email
  const signIn = async (usernameOrEmail: string, password: string): Promise<{ error: string | null }> => {
    try {
      let email = usernameOrEmail;
      
      // Check if input looks like an email
      const isEmail = usernameOrEmail.includes('@');
      
      if (!isEmail) {
        // Try to find user by login_username
        const { data: userData, error: lookupError } = await supabase
          .rpc('get_user_by_login_username', { p_login_username: usernameOrEmail });
        
        if (lookupError || !userData || userData.length === 0) {
          // Fallback: try to find by display username in profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('username', usernameOrEmail)
            .eq('is_active', true)
            .single();
          
          if (profileData) {
            // Get the email from auth.users via a join query
            const { data: authData } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('user_id', profileData.user_id)
              .single();
            
            if (authData) {
              // We need to get email from the user - this is tricky
              // For now, we'll try using the username as email prefix
              return { error: 'اسم المستخدم غير موجود. يرجى استخدام البريد الإلكتروني' };
            }
          }
          
          return { error: 'اسم المستخدم غير موجود أو الحساب معطل' };
        }
        
        email = userData[0].email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Map common errors to Arabic messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'يرجى تأكيد البريد الإلكتروني أولاً' };
        }
        return { error: 'حدث خطأ أثناء تسجيل الدخول' };
      }

      return { error: null };
    } catch {
      return { error: 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      session: null,
      baradaUser: null,
      isLoading: false,
    });
  };

  return {
    user: authState.user,
    session: authState.session,
    baradaUser: authState.baradaUser,
    isLoading: authState.isLoading,
    signIn,
    signOut,
  };
}
