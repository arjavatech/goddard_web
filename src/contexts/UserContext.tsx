import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchUserContext, type UserContext as UserData } from '../services/api/user';
import { useAuth } from '../services/auth/useAuth';

interface UserContextValue {
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const loadUserData = async () => {
    if (!isAuthenticated || !user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserContext();
      setUserData(data);
    } catch (err) {
      console.error('Failed to fetch user context:', err);

      // Check if it's a session expiration error
      const errorCode = (err as any).code;
      if (errorCode === 'session_not_found') {
        // Session expired - error will be handled by http.ts redirect
        setError('Session expired. Redirecting to login...');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isAuthenticated, user?.id]); // Use user.id instead of the whole user object

  return (
    <UserContext.Provider value={{ userData, loading, error, refreshUserData: loadUserData }}>
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