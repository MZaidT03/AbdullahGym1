import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import NotificationService from '../services/NotificationService';

const LOCAL_STORAGE_KEY = '@abdullah_gym1_user';

export const cleanPlanName = (planStr = '') => {
  if (!planStr) return 'Pro Membership';
  let clean = planStr;
  if (clean.includes(' [Add-ons:')) {
    clean = clean.split(' [Add-ons:')[0];
  }
  if (clean.includes(' [Next:')) {
    clean = clean.split(' [Next:')[0];
  }
  return clean.trim() || 'Pro Membership';
};

export const resolvePlanFee = (planName = '', paymentFee = null, profileFee = null) => {
  const cleanPlan = cleanPlanName(planName);

  // Extract embedded PKR price in clean base plan string e.g. "VIP Champion Pass (PKR 9,000/mo)"
  const pkrMatch = cleanPlan.match(/(?:PKR|Rs\.?)\s*([\d,]+)/i);
  if (pkrMatch && pkrMatch[1]) {
    const parsed = parseInt(pkrMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  const slashMatch = cleanPlan.match(/([\d,]+)\s*(?:\/mo|\/month|\/day)/i);
  if (slashMatch && slashMatch[1]) {
    const parsed = parseInt(slashMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Keyword / Plan Tier mapping
  const lower = cleanPlan.toLowerCase();
  if (lower.includes('vip') || lower.includes('champion') || lower.includes('9000')) {
    return 9000;
  }
  if (lower.includes('pro plus') || lower.includes('pro+') || lower.includes('12000')) {
    return 12000;
  }
  if (lower.includes('standard') || lower.includes('3500')) {
    return 3500;
  }
  if (
    lower.includes('daily') ||
    lower.includes('visitor') ||
    lower.includes('walk-in') ||
    lower.includes('500')
  ) {
    return 500;
  }
  if (lower.includes('pro')) {
    return 5000;
  }

  if (profileFee && Number(profileFee) > 0) return Number(profileFee);
  if (paymentFee && Number(paymentFee) > 0) return Number(paymentFee);

  return 5000;
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const checkTodayStatus = async (userId) => {
    if (!isSupabaseConfigured() || !userId) return;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', startOfDay.toISOString())
        .order('check_in_time', { ascending: false });

      if (!error && data && data.length > 0) {
        setIsCheckedIn(true);
        const latestTime = new Date(data[0].check_in_time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setCheckInTime(latestTime);
      } else {
        setIsCheckedIn(false);
        setCheckInTime(null);
      }
    } catch (err) {
      console.error('Error checking today attendance status:', err);
    }
  };

  const fetchProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Supabase profile fetch notice:', error.message);
      }

      // Check DB status (case-insensitive)
      const rawDbStatus = (data?.status || 'Active').trim().toLowerCase();
      const isDbSuspended =
        rawDbStatus === 'suspended' ||
        rawDbStatus === 'disabled' ||
        rawDbStatus === 'blocked';

      let calculatedDays = 0;
      let overdueDays = 0;
      let effectiveStatus = isDbSuspended ? 'Suspended' : 'Active';
      let lastPaymentRecord = null;
      let calculatedExpiryDate = null;
      let calculatedRenewalOpenDate = null;
      const now = new Date();

      if (isSupabaseConfigured() && userId && !isDbSuspended) {
        try {
          const { data: userPayments } = await supabase
            .from('payments')
            .select('date, status, amount, total_fee, payment_type, item_name')
            .eq('user_id', userId)
            .eq('status', 'Paid')
            .order('date', { ascending: true });

          // Filter strictly monthly gym membership payments (exclude standalone addon payments)
          const monthlyPayments = (userPayments || []).filter((pay) => {
            if (pay.payment_type && pay.payment_type === 'addon') return false;
            const itName = (pay.item_name || '').toLowerCase();
            if (itName.includes('cardio') || itName.includes('add-on') || itName.includes('addon')) return false;
            return true;
          });

          if (monthlyPayments && monthlyPayments.length > 0) {
            lastPaymentRecord = monthlyPayments[monthlyPayments.length - 1];

            // Stack consecutive 30-day payment cycles for monthly gym membership
            let runningExpiry = null;

            monthlyPayments.forEach((pay) => {
              if (!pay.date) return;
              const payDate = new Date(pay.date);

              if (!runningExpiry) {
                runningExpiry = new Date(payDate.getTime() + 30 * 86400000);
              } else if (payDate <= runningExpiry) {
                runningExpiry = new Date(runningExpiry.getTime() + 30 * 86400000);
              } else {
                runningExpiry = new Date(payDate.getTime() + 30 * 86400000);
              }
            });

            if (runningExpiry) {
              calculatedExpiryDate = runningExpiry.toISOString();

              const renOpen = new Date(runningExpiry);
              renOpen.setDate(renOpen.getDate() - 10);
              calculatedRenewalOpenDate = renOpen.toISOString();

              const diffMs = runningExpiry.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                calculatedDays = diffDays;
                overdueDays = 0;
                effectiveStatus = 'Active';
              } else {
                calculatedDays = 0;
                overdueDays = Math.max(1, Math.abs(diffDays));
                effectiveStatus = 'Deactivated';
              }
            }
          } else {
            // Member has NO paid monthly membership record in database
            calculatedDays = 0;
            overdueDays = 1;
            effectiveStatus = 'Deactivated';
          }
        } catch (payErr) {
          console.warn('Notice calculating remaining days:', payErr);
          calculatedDays = 0;
          overdueDays = 1;
          effectiveStatus = 'Deactivated';
        }
      }

      // Check explicit days_remaining on profile if present
      if (data?.days_remaining !== undefined && data?.days_remaining !== null) {
        const explicitDays = Number(data.days_remaining);
        if (explicitDays <= 0) {
          calculatedDays = 0;
          effectiveStatus = 'Deactivated';
        }
      }

      // Only permanently kick out if explicitly Suspended/Blocked by Admin
      if (isDbSuspended) {
        try {
          await supabase.auth.signOut();
        } catch (soErr) {}
        try {
          await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (e) {}
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        return null;
      }

      const cleanPlan = cleanPlanName(data?.plan);
      const resolvedMonthlyFee = resolvePlanFee(
        cleanPlan,
        lastPaymentRecord?.total_fee || lastPaymentRecord?.amount,
        data?.monthly_fee || data?.fee || data?.price
      );

      // Fetch Independent Add-ons from member_addons table or fallback to profiles.active_addons
      let rawAddons = [];
      if (isSupabaseConfigured() && userId) {
        try {
          const { data: dbAddons } = await supabase
            .from('member_addons')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'Cancelled');

          if (dbAddons && dbAddons.length > 0) {
            rawAddons = dbAddons;
          } else if (data?.active_addons) {
            rawAddons = Array.isArray(data.active_addons)
              ? data.active_addons
              : typeof data.active_addons === 'string'
              ? JSON.parse(data.active_addons)
              : [];
          }
        } catch (adErr) {
          if (data?.active_addons) {
            try {
              rawAddons = Array.isArray(data.active_addons)
                ? data.active_addons
                : JSON.parse(data.active_addons);
            } catch (e) {}
          }
        }
      } else if (data?.active_addons) {
        try {
          rawAddons = Array.isArray(data.active_addons)
            ? data.active_addons
            : JSON.parse(data.active_addons);
        } catch (e) {}
      }

      const parsedActiveAddons = rawAddons.map((addon) => {
        let addonDays = 30;
        let addonExpiry = null;
        if (addon.expiry_date) {
          addonExpiry = new Date(addon.expiry_date);
          const diff = addonExpiry.getTime() - now.getTime();
          addonDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        } else if (addon.start_date) {
          addonExpiry = new Date(new Date(addon.start_date).getTime() + 30 * 86400000);
          const diff = addonExpiry.getTime() - now.getTime();
          addonDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        return {
          id: addon.id || addon.addon_id || 'addon-cardio',
          addonId: addon.addon_id || addon.id,
          name: addon.name || 'Cardio Access Plan',
          price: Number(addon.price) || 1500,
          icon: addon.icon || '🏃',
          startDate: addon.start_date || now.toISOString(),
          expiryDate: addonExpiry ? addonExpiry.toISOString() : null,
          daysRemaining: addonDays,
          status: addonDays > 0 ? 'Active' : 'Expired',
        };
      });

      const isRenewalEligible = calculatedDays <= 10 || effectiveStatus !== 'Active';

      const userData = {
        id: userId,
        name: data?.full_name?.split(' ')[0] || userEmail?.split('@')[0] || 'Member',
        fullName: data?.full_name || 'Abdullah Member',
        email: userEmail || data?.email || 'member@example.com',
        memberId: data?.member_id || 'GP-8472-991',
        plan: cleanPlan,
        upcomingPlan: data?.upcoming_plan || data?.next_plan || null,
        monthlyFee: resolvedMonthlyFee,
        activeAddons: parsedActiveAddons,
        avatar: data?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        gender: data?.gender || 'Male',
        daysRemaining: calculatedDays,
        overdueDays: overdueDays,
        expiryDate: calculatedExpiryDate,
        renewalOpenDate: calculatedRenewalOpenDate,
        isRenewalEligible: isRenewalEligible,
        status: effectiveStatus,
      };

      setUser(userData);
      setIsAuthenticated(true);
      await checkTodayStatus(userId);
      NotificationService.evaluateFeeDeadlineNotification(userData).catch(() => {});
      return userData;
    } catch (err) {
      console.error('Error fetching profile from Supabase:', err);
      return null;
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user?.id) return { success: false, message: 'User not logged in' };

    try {
      if (isSupabaseConfigured()) {
        const payload = {};
        if (updates.fullName) payload.full_name = updates.fullName;
        if (updates.gender) payload.gender = updates.gender;
        if (updates.avatar) payload.avatar_url = updates.avatar;

        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (error) throw error;
      }

      const updatedUser = {
        ...user,
        fullName: updates.fullName || user.fullName,
        name: (updates.fullName || user.fullName).split(' ')[0],
        gender: updates.gender || user.gender,
        avatar: updates.avatar || user.avatar,
      };

      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, message: err.message || 'Failed to update profile' };
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id, user.email);
    }
  };

  const initAuth = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          const profile = await fetchProfile(initialSession.user.id, initialSession.user.email);
          const pStatus = (profile?.status || '').toLowerCase();
          if (profile && pStatus !== 'suspended' && pStatus !== 'disabled' && pStatus !== 'blocked') {
            setSession(initialSession);
            setIsAuthenticated(true);
          } else {
            await supabase.auth.signOut();
            try { await AsyncStorage.removeItem(LOCAL_STORAGE_KEY); } catch (e) {}
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
        }

        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (newSession) {
            const profile = await fetchProfile(newSession.user.id, newSession.user.email);
            const pStatus = (profile?.status || '').toLowerCase();
            if (profile && pStatus !== 'suspended' && pStatus !== 'disabled' && pStatus !== 'blocked') {
              setSession(newSession);
              setIsAuthenticated(true);
            } else {
              await supabase.auth.signOut();
              try { await AsyncStorage.removeItem(LOCAL_STORAGE_KEY); } catch (e) {}
              setSession(null);
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        });
      } else {
        const storedUser = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const pStatus = (parsed?.status || '').toLowerCase();
          if (pStatus !== 'suspended' && pStatus !== 'disabled' && pStatus !== 'blocked') {
            setUser(parsed);
            setIsAuthenticated(true);
          } else {
            await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    } catch (e) {
      console.log('Error initializing auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const trimmedEmail = email ? email.trim().toLowerCase() : '';

    if (!trimmedEmail || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });

        if (error) {
          return {
            success: false,
            message: error.message || 'Invalid email or password. Only registered members can log in.',
          };
        }

        if (data?.session) {
          // Fetch raw DB profile to check status directly
          const { data: dbProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const rawStatus = (dbProf?.status || '').trim().toLowerCase();
          const isSuspended = rawStatus === 'suspended' || rawStatus === 'blocked' || rawStatus === 'disabled';

          if (isSuspended) {
            await supabase.auth.signOut();
            try { await AsyncStorage.removeItem(LOCAL_STORAGE_KEY); } catch (e) {}
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            return {
              success: false,
              isSuspended: true,
              message: 'Account Suspended ⛔: Your gym account has been suspended. Please contact the front desk.',
            };
          }

          const profile = await fetchProfile(data.user.id, data.user.email);
          const pStatus = (profile?.status || '').toLowerCase();

          if (profile && pStatus !== 'suspended' && pStatus !== 'disabled' && pStatus !== 'blocked') {
            setSession(data.session);
            setIsAuthenticated(true);
            try {
              await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
            } catch (e) {}
            return { success: true };
          } else {
            await supabase.auth.signOut();
            try {
              await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch (e) {}
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            return {
              success: false,
              isSuspended: true,
              message: 'Account Suspended ⛔: Your gym account has been suspended. Please contact the front desk.',
            };
          }
        }
      } catch (err) {
        return {
          success: false,
          message: err.message || 'Failed to connect to Supabase.',
        };
      }
    }

    return {
      success: false,
      message: 'Supabase credentials are not configured in mobile/.env',
    };
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('Supabase signout error:', e);
      }
    }

    try {
      await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.log('AsyncStorage clear error:', e);
    }

    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    setIsCheckedIn(false);
    setCheckInTime(null);
  };

  const checkInMember = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isCheckedIn) {
      return { alreadyCheckedIn: true, time: checkInTime };
    }

    setIsCheckedIn(true);
    setCheckInTime(timeStr);

    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase.from('attendance').insert([
          {
            user_id: user.id,
            check_in_time: now.toISOString(),
          },
        ]);
      } catch (err) {
        console.error('Error inserting check-in to Supabase:', err);
      }
    }

    return { alreadyCheckedIn: false, time: timeStr };
  };

  const removeMemberAddon = async (addonId) => {
    if (!user?.id) return { success: false, message: 'User not logged in' };
    try {
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('member_addons')
            .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .or(`id.eq.${addonId},addon_id.eq.${addonId}`);
        } catch (e) {}

        const updated = (user.activeAddons || []).filter((a) => a.id !== addonId && a.addonId !== addonId);
        await supabase.from('profiles').update({ active_addons: updated }).eq('id', user.id);
      }
      await fetchProfile(user.id, user.email);
      return { success: true };
    } catch (err) {
      console.error('Error removing addon:', err);
      return { success: false, message: err.message || 'Failed to remove add-on' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        isCheckedIn,
        checkInTime,
        login,
        logout,
        toggleCheckIn: checkInMember,
        checkInMember,
        removeMemberAddon,
        updateUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
