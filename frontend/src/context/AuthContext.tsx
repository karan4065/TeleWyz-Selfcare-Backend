import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface Subscriber {
  id: string;
  msisdn: string;
  firstName: string;
  lastName: string;
  accountType: 'PREPAID' | 'POSTPAID';
  role: 'SUBSCRIBER' | 'AGENT' | 'ADMIN';
  status: string;
  loyaltyPoints?: number;
  email?: string;
}

interface AuthContextType {
  token: string | null;
  subscriber: Subscriber | null;
  activeMsisdn: string | null;
  isAuthenticated: boolean;
  login: (token: string, subscriber: Subscriber) => void;
  logout: () => void;
  switchActiveMsisdn: (msisdn: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('telewyz_token'));
  const [subscriber, setSubscriber] = useState<Subscriber | null>(() => {
    const saved = localStorage.getItem('telewyz_subscriber');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeMsisdn, setActiveMsisdn] = useState<string | null>(() => {
    return localStorage.getItem('telewyz_active_msisdn');
  });

  const login = (newToken: string, newSubscriber: Subscriber) => {
    setToken(newToken);
    setSubscriber(newSubscriber);
    setActiveMsisdn(newSubscriber.msisdn);
    localStorage.setItem('telewyz_token', newToken);
    localStorage.setItem('telewyz_subscriber', JSON.stringify(newSubscriber));
    localStorage.setItem('telewyz_active_msisdn', newSubscriber.msisdn);
  };

  const logout = () => {
    setToken(null);
    setSubscriber(null);
    setActiveMsisdn(null);
    localStorage.removeItem('telewyz_token');
    localStorage.removeItem('telewyz_subscriber');
    localStorage.removeItem('telewyz_active_msisdn');
  };

  const switchActiveMsisdn = (msisdn: string) => {
    setActiveMsisdn(msisdn);
    localStorage.setItem('telewyz_active_msisdn', msisdn);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res: any = await api.get('/subscriber/profile');
      if (res?.data?.subscriber) {
        setSubscriber(res.data.subscriber);
        localStorage.setItem('telewyz_subscriber', JSON.stringify(res.data.subscriber));
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        subscriber,
        activeMsisdn,
        isAuthenticated: !!token,
        login,
        logout,
        switchActiveMsisdn,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
