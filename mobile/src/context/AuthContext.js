import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import NotificationService from '../services/NotificationService';

const LOCAL_STORAGE_KEY = '@abdullah_gym1_user';

export const resolvePlanFee = (planName = '', paymentFee = null, profileFee = null) => {
  if (profileFee && Number(profileFee) > 0) return Number(profileFee);
  if (paymentFee && Number(paymentFee) > 0) return Number(paymentFee);

  const str = (planName || '').trim();

  // Extract embedded PKR price in plan string e.g. "Pro Plus (PKR 12,000/mo)"
  const pkrMatch = str.match(/(?:PKR|Rs\.?)\s*([\d,]+)/i);
  if (pkrMatch && pkrMatch[1]) {
    const parsed = parseInt(pkrMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  const slashMatch = str.match(/([\d,]+)\s*(?:\/mo|\/month|\/day)/i);
  if (slashMatch && slashMatch[1]) {
    const parsed = parseInt(slashMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Keyword / Plan Tier mapping
  const lower = str.toLowerCase();
  if (
    lower.includes('pro plus') ||
    lower.includes('pro+') ||
    lower.includes('pro-plus') ||
    lower.includes('12000') ||
    lower.includes('12,000')
  ) {
    return 12000;
  }
  if (
    lower.includes('vip') ||
    lower.includes('champion') ||
    lower.includes('9000') ||
    lower.includes('9,000')
  ) {
    return 9000;
  }
  if (
    lower.includes('standard') ||
    lower.includes('3500') ||
    lower.includes('3,500')
  ) {
    return 3500;
  }
  if (
    lower.includes('daily') ||
    lower.includes('visitor') ||
    lower.includes('walk-in') ||
    lower.includes('walk in') ||
    lower.includes('500')
  ) {
    return 500;
  }
  if (lower.includes('pro')) {
    return 5000;
  }

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
      const isDbExpired =
        rawDbStatus === 'expired' ||
        rawDbStatus === 'inactive' ||
        rawDbStatus === 'deactivated' ||
        rawDbStatus === 'unpaid';
      const isDbInactive = isDbSuspended || isDbExpired;

      let calculatedDays = 0;
      let overdueDays = 0;
      let effectiveStatus = isDbSuspended
        ? 'Suspended'
        : isDbExpired
        ? 'Expired'
        : 'Active';
      let lastPaymentRecord = null;
      let calculatedExpiryDate = null;
      let calculatedRenewalOpenDate = null;
      const now = new Date();

      if (isSupabaseConfigured() && userId && !isDbInactive) {
        try {
          const { data: userPayments } = await supabase
            .from('payments')
            .select('date, status, amount, total_fee')
            .eq('user_id', userId)
            .eq('status', 'Paid')
            .order('date', { ascending: true });

          if (userPayments && userPayments.length > 0) {
            lastPaymentRecord = userPayments[userPayments.length - 1];

            // Stack consecutive 30-day payment cycles
            let runningExpiry = null;

            userPayments.forEach((pay) => {
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
                overdueDays = Math.abs(diffDays);
                effectiveStatus = 'Expired';
              }
            }
          } else {
            // Member has NO paid payment record in database
            calculatedDays = 0;
            overdueDays = 1;
            effectiveStatus = 'Expired';
          }
        } catch (payErr) {
          console.warn('Notice calculating remaining days:', payErr);
          calculatedDays = 0;
          overdueDays = 1;
          effectiveStatus = 'Expired';
        }
      } else if (isDbInactive) {
        calculatedDays = 0;
        effectiveStatus = isDbSuspended ? 'Suspended' : 'Expired';
      }

      // Check explicit days_remaining on profile if present
      if (data?.days_remaining !== undefined && data?.days_remaining !== null && Number(data.days_remaining) <= 0) {
        calculatedDays = 0;
        effectiveStatus = isDbSuspended ? 'Suspended' : 'Expired';
      }

      const isFinalInactive =
        effectiveStatus === 'Expired' ||
        effectiveStatus === 'Suspended' ||
        effectiveStatus === 'Inactive' ||
        isDbInactive ||
        calculatedDays <= 0;

      if (isFinalInactive) {
        effectiveStatus = isDbSuspended ? 'Suspended' : 'Expired';
        calculatedDays = 0;
        if (isSupabaseConfigured() && userId && data?.status === 'Active' && !isDbSuspended) {
          try {
            await supabase.from('profiles').update({ status: 'Expired' }).eq('id', userId);
          } catch (stErr) {
            console.warn('Notice updating expired status:', stErr);
          }
        }
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

      const resolvedMonthlyFee = resolvePlanFee(
        data?.plan,
        lastPaymentRecord?.total_fee || lastPaymentRecord?.amount,
        data?.monthly_fee || data?.fee || data?.price
      );

      const isRenewalEligible = calculatedDays <= 10 || overdueDays > 0 || effectiveStatus !== 'Active';

      const userData = {
        id: userId,
        name: data?.full_name?.split(' ')[0] || userEmail?.split('@')[0] || 'Member',
        fullName: data?.full_name || 'Abdullah Member',
        email: userEmail || data?.email || 'member@example.com',
        memberId: data?.member_id || 'GP-8472-991',
        plan: data?.plan || 'Pro Membership',
        upcomingPlan: data?.upcoming_plan || data?.next_plan || null,
        monthlyFee: resolvedMonthlyFee,
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
          if (profile && pStatus !== 'suspended' && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
            if (profile && pStatus !== 'suspended' && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
          if (pStatus !== 'suspended' && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
          const isDbExpired = rawStatus === 'expired' || rawStatus === 'inactive' || rawStatus === 'deactivated' || rawStatus === 'unpaid';

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

          if (isDbExpired) {
            await supabase.auth.signOut();
            try { await AsyncStorage.removeItem(LOCAL_STORAGE_KEY); } catch (e) {}
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            return {
              success: false,
              isExpired: true,
              message: 'Account Expired ❌: Your gym membership plan has expired. Please pay your renewal fee at the front desk to reactivate your access.',
            };
          }

          const profile = await fetchProfile(data.user.id, data.user.email);
          const pStatus = (profile?.status || '').toLowerCase();
          const daysLeft = profile?.daysRemaining !== undefined ? Number(profile.daysRemaining) : null;
          const isProfileActive = profile && pStatus === 'active' && (daysLeft === null || daysLeft > 0);

          if (isProfileActive) {
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

            if (pStatus === 'suspended') {
              return {
                success: false,
                isSuspended: true,
                message: 'Account Suspended ⛔: Your gym account has been suspended. Please contact the front desk.',
              };
            }

            return {
              success: false,
              isExpired: true,
              message: 'Account Expired ❌: Your gym membership plan has expired. Please pay your renewal fee at the front desk to reactivate your access.',
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
