import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchUserContext, type SchoolFeatures, type UserContext as UserData } from '../services/api/user';
import { useAuth } from '../services/auth/useAuth';
import { clearSession } from '../services/auth/session';

const disabledSchoolFeatures: SchoolFeatures = {
  parentManagementEnabled: false,
  employeeManagementEnabled: false,
  expenseManagementEnabled: false,
  taptimeEnabled: false,
};

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
  schoolFeatures: SchoolFeatures;
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

function isTerminalSessionError(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (status === 401 || status === 403) && /session_not_found|invalid jwt|jwt.*expired|authorization error/i.test(message);
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
  const [profileGeneration, setProfileGeneration] = useState<number | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<SchoolFeatures>(disabledSchoolFeatures);
  const activeRequestRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const { user, isAuthenticated, authGeneration } = useAuth();

  const resetUserContext = () => {
    activeRequestRef.current = null;
    setUserData(null);
    setSchoolName('The Goddard School');
    setSchoolSubdomain('goddard');
    setSchoolPhone('');
    setSchoolEmail('');
    setSchoolAddress('');
    setError(null);
    setLoading(false);
    setIsReady(true);
    setProfileGeneration(null);
    setSchoolFeatures(disabledSchoolFeatures);
  };

  const loadUserData = (force = false, retries = 3, delay = 500): Promise<void> => {
    if (!isAuthenticated || !user) {
      resetUserContext();
      return Promise.resolve();
    }

    if (sessionStorage.getItem('first_login_reset_pending') === 'true') {
      resetUserContext();
      setLoading(false);
      setIsReady(true);
      return Promise.resolve();
    }

    const requestKey = `${user.id}:${authGeneration}`;
    if (!force && activeRequestRef.current?.key === requestKey) {
      return activeRequestRef.current.promise;
    }

    const request = (async () => {
      setIsReady(false);
      setLoading(true);
      setError(null);
      setProfileGeneration(null);

      try {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const data = await fetchUserContext();
            if (activeRequestRef.current?.key !== requestKey) return;

            setUserData(data);
            setSchoolFeatures(data.schoolData?.features ?? disabledSchoolFeatures);
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
            setProfileGeneration(authGeneration);

            return;
          } catch (err) {
            console.warn(`Attempt ${attempt} to fetch user context failed:`, err);
            if (isTerminalSessionError(err)) {
              // A Supabase JWT whose session was revoked/deleted cannot be
              // refreshed by retrying the same request. Remove it locally and
              // send the user through the normal sign-in flow.
              if (activeRequestRef.current?.key === requestKey) {
                setUserData(null);
                setError('Your session has expired. Please sign in again.');
              }
              void clearSession();
              return;
            }
            if (attempt === retries) {
              if (activeRequestRef.current?.key !== requestKey) return;

              console.error('Failed to fetch user context after all retries:', err);
              const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
              const status = (err as any)?.status;

              if (status === 401 || status === 403) {
                setUserData(null);
              }

              setError(errorMessage);
            } else {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      } finally {
        if (activeRequestRef.current?.key === requestKey) {
          setLoading(false);
          setIsReady(true);
          activeRequestRef.current = null;
        }
      }
    })();

    activeRequestRef.current = { key: requestKey, promise: request };
    return request;
  };

  useEffect(() => {
    loadUserData();
  }, [isAuthenticated, user?.id, authGeneration]);

  const profileIsCurrent = isAuthenticated && profileGeneration === authGeneration;
  const visibleUserData = profileIsCurrent ? userData : null;
  const visibleSchoolName = profileIsCurrent ? schoolName : 'The Goddard School';
  const visibleSchoolSubdomain = profileIsCurrent ? schoolSubdomain : 'goddard';
  const visibleSchoolPhone = profileIsCurrent ? schoolPhone : '';
  const visibleSchoolEmail = profileIsCurrent ? schoolEmail : '';
  const visibleSchoolAddress = profileIsCurrent ? schoolAddress : '';

  return (
    <UserContext.Provider value={{ userData: visibleUserData, schoolName: visibleSchoolName, schoolSubdomain: visibleSchoolSubdomain, schoolPhone: visibleSchoolPhone, schoolEmail: visibleSchoolEmail, schoolAddress: visibleSchoolAddress, loading, error, refreshUserData: () => loadUserData(true), isReady, schoolFeatures }}>
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
