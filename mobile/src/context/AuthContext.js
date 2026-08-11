import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@gympro_auth_user';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);

  useEffect(() => {
    checkPersistentAuth();
  }, []);

  const checkPersistentAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('Failed to restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const trimmedEmail = email ? email.trim().toLowerCase() : '';
    
    if (!trimmedEmail || !password) {
      return { success: false, message: 'Please fill in both email and password.' };
    }

    // Mock Authentication credentials
    if (trimmedEmail === 'member@example.com' && password === '123456') {
      const userData = {
        name: 'Abdullah',
        fullName: 'Abdullah Khan',
        email: 'member@example.com',
        memberId: '9876-5432',
        plan: 'Pro Membership',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        daysRemaining: 14,
        status: 'Active',
      };

      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      } catch (e) {
        console.log('AsyncStorage error:', e);
      }

      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    }

    // Secondary test credentials or generic fallback for demo flexibility
    if (trimmedEmail.endsWith('@example.com') && password.length >= 6) {
      const nameFromEmail = trimmedEmail.split('@')[0];
      const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      const userData = {
        name: capitalized,
        fullName: `${capitalized} Johnson`,
        email: trimmedEmail,
        memberId: 'GP-8472-991',
        plan: 'Pro Elite Plan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        daysRemaining: 14,
        status: 'Active',
      };

      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      } catch (e) {
        console.log('AsyncStorage error:', e);
      }

      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    }

    return { success: false, message: 'Invalid credentials. Use member@example.com & 123456' };
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.log('AsyncStorage clear error:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setIsCheckedIn(false);
    setCheckInTime(null);
  };

  const toggleCheckIn = () => {
    if (!isCheckedIn) {
      setIsCheckedIn(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCheckInTime(timeStr);
      return { status: 'Checked In', time: timeStr };
    } else {
      setIsCheckedIn(false);
      setCheckInTime(null);
      return { status: 'Checked Out', time: null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
