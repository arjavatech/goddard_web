import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  fetchAdminNavCounts,
  fetchMyNavCounts,
  type AdminNavCounts,
  type MyNavCounts,
} from '../services/api/navCounts';
import { useUserContext } from './UserContext';

type NavCountsContextValue = {
  studentFormsDue: number;
  studentFormsReview: number;
  employeeFormsDue: number;
  employeeFormsReview: number;
  studentDocsDue: number;
  studentDocsReview: number;
  employeeDocsDue: number;
  employeeDocsReview: number;
  formsPending: number;
  docsPending: number;
  surveysPending: number;
  formsNeedingRevision: number;
  refreshCounts: () => void;
  setFormsNeedingRevision: (count: number) => void;
};

const NavCountsContext = createContext<NavCountsContextValue | undefined>(undefined);

const ZERO_ADMIN: AdminNavCounts = {
  student_forms_due: 0,
  student_forms_review: 0,
  employee_forms_due: 0,
  employee_forms_review: 0,
  student_docs_due: 0,
  student_docs_review: 0,
  employee_docs_due: 0,
  employee_docs_review: 0,
  surveys_pending: 0,
};

const ZERO_MY: MyNavCounts = { forms_pending: 0, docs_pending: 0, surveys_pending: 0 };

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function NavCountsProvider({ children }: { children: React.ReactNode }) {
  const { userData, isReady } = useUserContext();
  const role = userData?.role?.toLowerCase();
  const isAdmin = role === 'admin' || role === 'superadmin';

  const [adminCounts, setAdminCounts] = useState<AdminNavCounts>(ZERO_ADMIN);
  const [myCounts, setMyCounts] = useState<MyNavCounts>(ZERO_MY);
  const [overrideFormsNeedingRevision, setOverrideFormsNeedingRevision] = useState<number>(0);
  const lastFetchedAt = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!isReady || !userData) return;
    try {
      if (isAdmin) {
        const counts = await fetchAdminNavCounts();
        setAdminCounts(counts);
      } else {
        const counts = await fetchMyNavCounts();
        setMyCounts(counts);
      }
      lastFetchedAt.current = Date.now();
    } catch {
      // silent fail — badges stay at 0
    }
  }, [isReady, userData, isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastFetchedAt.current > STALE_MS) refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refresh]);

  const value: NavCountsContextValue = {
    studentFormsDue: adminCounts.student_forms_due,
    studentFormsReview: adminCounts.student_forms_review,
    employeeFormsDue: adminCounts.employee_forms_due,
    employeeFormsReview: adminCounts.employee_forms_review,
    studentDocsDue: adminCounts.student_docs_due,
    studentDocsReview: adminCounts.student_docs_review,
    employeeDocsDue: adminCounts.employee_docs_due,
    employeeDocsReview: adminCounts.employee_docs_review,
    formsPending: myCounts.forms_pending,
    docsPending: myCounts.docs_pending,
    surveysPending: isAdmin ? adminCounts.surveys_pending : myCounts.surveys_pending,
    formsNeedingRevision: overrideFormsNeedingRevision,
    refreshCounts: refresh,
    setFormsNeedingRevision: setOverrideFormsNeedingRevision,
  };

  return <NavCountsContext.Provider value={value}>{children}</NavCountsContext.Provider>;
}

export function useNavCounts(): NavCountsContextValue {
  const ctx = useContext(NavCountsContext);
  if (!ctx) throw new Error('useNavCounts must be used within NavCountsProvider');
  return ctx;
}
