import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchUserContext, type UserContext as UserData } from '../services/api/user';
import { fetchSchools } from '../services/api/schools';
import { useAuth } from '../services/auth/useAuth';

interface UserContextValue {
  userData: UserData | null;
  schoolName: string;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  isReady: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [schoolName, setSchoolName] = useState('The Goddard School');
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

    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserContext();
      setUserData(data);
      if (data.schoolId) {
        try {
          const schools = await fetchSchools();
          const match = schools.find(s => s.id === data.schoolId);
          if (match) setSchoolName(match.name);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch user context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isAuthenticated, user?.id, user?.email]); // Include email to detect re-login with same user

  return (
    <UserContext.Provider value={{ userData, schoolName, loading, error, refreshUserData: loadUserData, isReady }}>
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