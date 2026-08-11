import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_STORAGE_KEY = '@abdullah_gym1_user';

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

      const userData = {
        id: userId,
        name: data?.full_name?.split(' ')[0] || userEmail?.split('@')[0] || 'Member',
        fullName: data?.full_name || 'Abdullah Khan',
        email: userEmail || data?.email || 'member@example.com',
        memberId: data?.member_id || 'GP-8472-991',
        plan: data?.plan || 'Pro Membership',
        avatar: data?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        daysRemaining: data?.days_remaining ?? 30,
        status: data?.status || 'Active',
      };

      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      console.error('Error fetching profile from Supabase:', err);
      return null;
    }
  };

  const initAuth = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession);
          await fetchProfile(initialSession.user.id, initialSession.user.email);
        }

        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          if (newSession) {
            await fetchProfile(newSession.user.id, newSession.user.email);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        });
      } else {
        // Fallback local auth mode if Supabase env vars not set yet
        const storedUser = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsAuthenticated(true);
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
          setSession(data.session);
          const profile = await fetchProfile(data.user.id, data.user.email);
          if (profile) {
            return { success: true };
          } else {
            return {
              success: false,
              message: 'Account exists in Auth, but member profile was not found in database.',
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

  const toggleCheckIn = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!isCheckedIn) {
      setIsCheckedIn(true);
      setCheckInTime(timeStr);

      if (isSupabaseConfigured() && user?.id) {
        try {
          await supabase.from('attendance').insert([
            {
              user_id: user.id,
              check_in_time: now.toISOString(),
              status: 'Checked In',
            },
          ]);
        } catch (err) {
          console.error('Error inserting attendance to Supabase:', err);
        }
      }

      return { status: 'Checked In', time: timeStr };
    } else {
      setIsCheckedIn(false);
      setCheckInTime(null);

      if (isSupabaseConfigured() && user?.id) {
        try {
          await supabase
            .from('attendance')
            .update({ check_out_time: now.toISOString(), status: 'Checked Out' })
            .eq('user_id', user.id)
            .is('check_out_time', null);
        } catch (err) {
          console.error('Error updating attendance in Supabase:', err);
        }
      }

      return { status: 'Checked Out', time: null };
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
        toggleCheckIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
