import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchUserContext, type UserContext as UserData } from '../services/api/user';
import { useAuth } from '../services/auth/useAuth';

interface UserContextValue {
  userData: UserData | null;
  schoolName: string;
  schoolSubdomain: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  isReady: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

function getSchoolSlug(name: string): string {
  if (!name) return 'goddard';
  let cleanName = name.toLowerCase();
  
  if (cleanName.includes('goddard school -')) {
    cleanName = cleanName.split('goddard school -')[1]?.trim() || cleanName;
  } else if (cleanName.includes('goddard schools,')) {
    cleanName = cleanName.split('goddard schools,')[1]?.trim() || cleanName;
  } else if (cleanName.includes('goddard school')) {
    cleanName = cleanName.replace('goddard school', '').trim();
  } else if (cleanName.includes('goddard')) {
    cleanName = cleanName.replace('goddard', '').trim();
  }
  
  return cleanName
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [schoolName, setSchoolName] = useState('The Goddard School');
  const [schoolSubdomain, setSchoolSubdomain] = useState('goddard');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const loadingRef = useRef(false);
  const { user, isAuthenticated } = useAuth();

  const loadUserData = async (retries = 3, delay = 500, force = false) => {
    if (!isAuthenticated || !user) {
      setUserData(null);
      setLoading(false);
      setIsReady(true);
      return;
    }

    // Prevent concurrent duplicate fetches (e.g. rapid auth state changes)
    if (loadingRef.current) return;
    loadingRef.current = true;

    setIsReady(false);
    setLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const data = await fetchUserContext();
        setUserData(data);
        if (data.schoolData?.name) {
          setSchoolName(data.schoolData.name);
        }
        if (data.schoolData?.subdomain) {
          setSchoolSubdomain(data.schoolData.subdomain);
        } else if (data.schoolData?.name) {
          setSchoolSubdomain(getSchoolSlug(data.schoolData.name));
        }
        if (data.schoolData?.settings?.contact_no) setSchoolPhone(data.schoolData.settings.contact_no);
        if (data.schoolData?.settings?.mail) setSchoolEmail(data.schoolData.settings.mail);
        if (data.schoolData?.settings?.address) setSchoolAddress(data.schoolData.settings.address);
        
        setLoading(false);
        setIsReady(true);
        loadingRef.current = false;
        return; // Success
      } catch (err) {
        console.warn(`Attempt ${attempt} to fetch user context failed:`, err);
        if (attempt === retries) {
          console.error('Failed to fetch user context after all retries:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
          
          const status = (err as any)?.status;
          if (status === 401 || status === 403) {
            setUserData(null);
          }
          
          setError(errorMessage);
          setLoading(false);
          setIsReady(true);
          loadingRef.current = false;
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isAuthenticated, user?.id, user?.email]);

  return (
    <UserContext.Provider value={{ userData, schoolName, schoolSubdomain, schoolPhone, schoolEmail, schoolAddress, loading, error, refreshUserData: () => loadUserData(3, 500, true), isReady }}>
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
