import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types for realtime data
export interface StaffMember {
  user_id: string;
  name: string;
  username: string | null;
  login_username: string | null;
  role: 'admin' | 'staff';
  permissions: string[];
  is_active: boolean;
}

export interface RealtimeData {
  bookings: any[];
  operations: any[];
  payments: any[];
  paymentNotifications: any[];
  appNotifications: any[];
  complaints: any[];
  doctors: any[];
  services: any[];
  contractingCompanies: any[];
  staffMembers: StaffMember[];
}

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  onBookingsChange?: (bookings: any[]) => void;
  onOperationsChange?: (operations: any[]) => void;
  onPaymentsChange?: (payments: any[]) => void;
  onNotificationsChange?: (notifications: any[]) => void;
  onComplaintsChange?: (complaints: any[]) => void;
  onDoctorsChange?: (doctors: any[]) => void;
  onServicesChange?: (services: any[]) => void;
  onContractingCompaniesChange?: (companies: any[]) => void;
  onStaffMembersChange?: (staffMembers: StaffMember[]) => void;
}

// Helper function to combine profiles and roles into staff members
const combineStaffData = (profiles: any[], roles: any[]): StaffMember[] => {
  return (profiles || []).map(profile => {
    const roleData = roles?.find(r => r.user_id === profile.user_id);
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
};

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { enabled = true } = options;
  
  // Store options in ref to avoid re-render loops
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Store profiles and roles separately for combining
  const profilesRef = useRef<any[]>([]);
  const rolesRef = useRef<any[]>([]);
  
  const [data, setData] = useState<RealtimeData>({
    bookings: [],
    operations: [],
    payments: [],
    paymentNotifications: [],
    appNotifications: [],
    complaints: [],
    doctors: [],
    services: [],
    contractingCompanies: [],
    staffMembers: [],
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update staff members from refs
  const updateStaffMembers = useCallback(() => {
    const staffMembers = combineStaffData(profilesRef.current, rolesRef.current);
    setData(prev => {
      const newData = { ...prev, staffMembers };
      optionsRef.current.onStaffMembersChange?.(staffMembers);
      return newData;
    });
  }, []);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        bookingsRes,
        operationsRes,
        paymentsRes,
        paymentNotificationsRes,
        appNotificationsRes,
        complaintsRes,
        doctorsRes,
        servicesRes,
        contractingCompaniesRes,
        profilesRes,
        rolesRes,
      ] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('operations').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('app_notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('doctors').select('*').order('name', { ascending: true }),
        supabase.from('services').select('*').order('title', { ascending: true }),
        supabase.from('contracting_companies').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('user_id, name, username, login_username, permissions, is_active'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      // Store in refs for real-time updates
      profilesRef.current = profilesRes.data || [];
      rolesRef.current = rolesRes.data || [];
      
      const staffMembers = combineStaffData(profilesRef.current, rolesRef.current);

      const newData: RealtimeData = {
        bookings: bookingsRes.data || [],
        operations: operationsRes.data || [],
        payments: paymentsRes.data || [],
        paymentNotifications: paymentNotificationsRes.data || [],
        appNotifications: appNotificationsRes.data || [],
        complaints: complaintsRes.data || [],
        doctors: doctorsRes.data || [],
        services: servicesRes.data || [],
        contractingCompanies: contractingCompaniesRes.data || [],
        staffMembers,
      };

      setData(newData);
      
      // Call individual callbacks
      optionsRef.current.onBookingsChange?.(newData.bookings);
      optionsRef.current.onOperationsChange?.(newData.operations);
      optionsRef.current.onPaymentsChange?.(newData.payments);
      optionsRef.current.onNotificationsChange?.(newData.appNotifications);
      optionsRef.current.onComplaintsChange?.(newData.complaints);
      optionsRef.current.onDoctorsChange?.(newData.doctors);
      optionsRef.current.onServicesChange?.(newData.services);
      optionsRef.current.onContractingCompaniesChange?.(newData.contractingCompanies);
      optionsRef.current.onStaffMembersChange?.(newData.staffMembers);
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle profiles realtime changes
  const handleProfilesChange = useCallback((
    payload: RealtimePostgresChangesPayload<any>
  ) => {
    if (payload.eventType === 'INSERT') {
      profilesRef.current = [payload.new, ...profilesRef.current];
    } else if (payload.eventType === 'UPDATE') {
      const index = profilesRef.current.findIndex((p: any) => p.user_id === payload.new.user_id);
      if (index !== -1) {
        profilesRef.current[index] = payload.new;
      }
    } else if (payload.eventType === 'DELETE') {
      profilesRef.current = profilesRef.current.filter((p: any) => p.user_id !== payload.old.user_id);
    }
    updateStaffMembers();
  }, [updateStaffMembers]);

  // Handle roles realtime changes
  const handleRolesChange = useCallback((
    payload: RealtimePostgresChangesPayload<any>
  ) => {
    if (payload.eventType === 'INSERT') {
      rolesRef.current = [payload.new, ...rolesRef.current];
    } else if (payload.eventType === 'UPDATE') {
      const index = rolesRef.current.findIndex((r: any) => r.user_id === payload.new.user_id);
      if (index !== -1) {
        rolesRef.current[index] = payload.new;
      }
    } else if (payload.eventType === 'DELETE') {
      rolesRef.current = rolesRef.current.filter((r: any) => r.user_id !== payload.old.user_id);
    }
    updateStaffMembers();
  }, [updateStaffMembers]);

  // Handle realtime changes for other tables
  const handleRealtimeChange = useCallback((
    table: keyof Omit<RealtimeData, 'staffMembers'>,
    payload: RealtimePostgresChangesPayload<any>
  ) => {
    setData(prev => {
      let newTableData = [...prev[table]];
      
      if (payload.eventType === 'INSERT') {
        newTableData = [payload.new, ...newTableData];
      } else if (payload.eventType === 'UPDATE') {
        const index = newTableData.findIndex((item: any) => item.id === payload.new.id);
        if (index !== -1) {
          newTableData[index] = payload.new;
        }
      } else if (payload.eventType === 'DELETE') {
        newTableData = newTableData.filter((item: any) => item.id !== payload.old.id);
      }
      
      const newData = { ...prev, [table]: newTableData };
      
      // Call appropriate callback
      switch (table) {
        case 'bookings':
          optionsRef.current.onBookingsChange?.(newData.bookings);
          break;
        case 'operations':
          optionsRef.current.onOperationsChange?.(newData.operations);
          break;
        case 'payments':
          optionsRef.current.onPaymentsChange?.(newData.payments);
          break;
        case 'appNotifications':
          optionsRef.current.onNotificationsChange?.(newData.appNotifications);
          break;
        case 'complaints':
          optionsRef.current.onComplaintsChange?.(newData.complaints);
          break;
        case 'doctors':
          optionsRef.current.onDoctorsChange?.(newData.doctors);
          break;
        case 'services':
          optionsRef.current.onServicesChange?.(newData.services);
          break;
        case 'contractingCompanies':
          optionsRef.current.onContractingCompaniesChange?.(newData.contractingCompanies);
          break;
      }
      
      return newData;
    });
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = async () => {
      // Fetch initial data first
      await fetchInitialData();

      // Set up realtime channel
      channel = supabase
        .channel('barada-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => handleRealtimeChange('bookings', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'operations' },
          (payload) => handleRealtimeChange('operations', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payments' },
          (payload) => handleRealtimeChange('payments', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payment_notifications' },
          (payload) => handleRealtimeChange('paymentNotifications', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_notifications' },
          (payload) => handleRealtimeChange('appNotifications', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'complaints' },
          (payload) => handleRealtimeChange('complaints', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'doctors' },
          (payload) => handleRealtimeChange('doctors', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'services' },
          (payload) => handleRealtimeChange('services', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contracting_companies' },
          (payload) => handleRealtimeChange('contractingCompanies', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => handleProfilesChange(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_roles' },
          (payload) => handleRolesChange(payload)
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
          if (status === 'CHANNEL_ERROR') {
            setError('خطأ في الاتصال بالمزامنة الفورية');
          }
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, fetchInitialData, handleRealtimeChange, handleProfilesChange, handleRolesChange]);

  // Refresh data manually
  const refresh = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  return {
    data,
    isConnected,
    isLoading,
    error,
    refresh,
  };
}