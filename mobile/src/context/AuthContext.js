import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
      const isDbInactive =
        rawDbStatus === 'inactive' ||
        rawDbStatus === 'deactivated' ||
        rawDbStatus === 'expired' ||
        rawDbStatus === 'unpaid' ||
        rawDbStatus === 'disabled' ||
        rawDbStatus === 'blocked';

      let calculatedDays = 0;
      let overdueDays = 0;
      let effectiveStatus = isDbInactive ? (data?.status || 'Expired') : 'Active';
      let lastPaymentRecord = null;
      const now = new Date();

      if (isSupabaseConfigured() && userId && !isDbInactive) {
        try {
          const { data: latestPayment } = await supabase
            .from('payments')
            .select('date, status, amount, total_fee')
            .eq('user_id', userId)
            .eq('status', 'Paid')
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

          lastPaymentRecord = latestPayment;

          if (latestPayment && latestPayment.date) {
            const payDate = new Date(latestPayment.date);
            const expiryDate = new Date(payDate);
            expiryDate.setDate(expiryDate.getDate() + 30);

            const diffMs = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
              calculatedDays = diffDays;
              overdueDays = 0;
              effectiveStatus = 'Active';
            } else {
              calculatedDays = 0;
              overdueDays = Math.abs(diffDays);
              if (overdueDays > 7) {
                effectiveStatus = 'Expired';
              } else {
                effectiveStatus = 'Active'; // In 7-day grace period
              }
            }
          } else {
            // Member has NO paid payment record in database
            const profileDate = data?.created_at ? new Date(data.created_at) : null;
            if (profileDate) {
              const diffMs = now.getTime() - profileDate.getTime();
              const daysSinceCreation = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (daysSinceCreation <= 7) {
                calculatedDays = 0;
                overdueDays = daysSinceCreation;
                effectiveStatus = 'Active';
              } else {
                calculatedDays = 0;
                overdueDays = Math.max(8, daysSinceCreation - 30);
                effectiveStatus = 'Expired';
              }
            } else {
              calculatedDays = 0;
              overdueDays = 8;
              effectiveStatus = 'Expired';
            }
          }
        } catch (payErr) {
          console.warn('Notice calculating remaining days:', payErr);
          calculatedDays = 0;
          overdueDays = 8;
          effectiveStatus = 'Expired';
        }
      } else if (isDbInactive) {
        calculatedDays = 0;
        effectiveStatus = data?.status || 'Expired';
      }

      const isFinalInactive = effectiveStatus === 'Expired' || effectiveStatus === 'Inactive' || isDbInactive || overdueDays > 7;

      if (isFinalInactive) {
        effectiveStatus = data?.status && data.status !== 'Active' ? data.status : 'Expired';
        calculatedDays = 0;
        if (isSupabaseConfigured() && userId && data?.status === 'Active') {
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
        status: effectiveStatus,
      };

      setUser(userData);
      setIsAuthenticated(true);
      await checkTodayStatus(userId);
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
          if (profile && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
            if (profile && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
          if (pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid') {
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
          const profile = await fetchProfile(data.user.id, data.user.email);
          const pStatus = (profile?.status || '').toLowerCase();
          const isProfileActive = profile && pStatus !== 'inactive' && pStatus !== 'deactivated' && pStatus !== 'expired' && pStatus !== 'unpaid';

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
            return {
              success: false,
              isDeactivated: true,
              message: 'Account Expired / Deactivated ❌: Your account status is Expired. Please contact admin to reactivate.',
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
