import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchUserContext, type UserContext as UserData } from '../services/api/user';
import { useAuth } from '../services/auth/useAuth';

interface UserContextValue {
  userData: UserData | null;
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  isReady: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [schoolName, setSchoolName] = useState('The Goddard School');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const loadUserData = async () => {
    if (!isAuthenticated || !user) {
      setUserData(null);
      setLoading(false);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserContext();
      setUserData(data);
      if (data.schoolData?.name) setSchoolName(data.schoolData.name);
      if (data.schoolData?.settings?.contact_no) setSchoolPhone(data.schoolData.settings.contact_no);
      if (data.schoolData?.settings?.mail) setSchoolEmail(data.schoolData.settings.mail);
      if (data.schoolData?.settings?.address) setSchoolAddress(data.schoolData.settings.address);
    } catch (err) {
      console.error('Failed to fetch user context:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      
      // Only clear user data on actual auth errors (401/403), not on other errors
      const status = (err as any)?.status;
      if (status === 401 || status === 403) {
        setUserData(null);
      }
      
      // Don't show error to user on first load - just log it
      // This prevents the "Session Error" modal from appearing unnecessarily
      if (loading) {
        console.warn('Initial user data load failed, will retry:', errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isAuthenticated, user?.id, user?.email]);

  return (
    <UserContext.Provider value={{ userData, schoolName, schoolPhone, schoolEmail, schoolAddress, loading, error, refreshUserData: loadUserData, isReady }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

export function useUserData() {
  const { userData, loading } = useUserContext();
  return { userData, loading };
}
