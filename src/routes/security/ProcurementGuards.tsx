import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { AdminRequests } from '../../pages/admin/AdminRequests';
import { SuperAdminRequests } from '../../pages/superadmin/SuperAdminRequests';
import { SuperAdminExpenses } from '../../pages/superadmin/SuperAdminExpenses';

/**
 * Role-aware wrapper for `/requests`.
 * - Admins get the Admin request board (create school/teacher/classroom requests, validate employee requests).
 * - Super Admins get the full validation + payment-processing queue.
 * - Any other role is bounced back to the dashboard.
 */
export function RequestsRouter() {
  const { userData, schoolSubdomain } = useUserContext();
  const role = userData?.role?.toLowerCase();

  if (role === 'admin') return <AdminRequests />;
  if (role === 'superadmin') return <SuperAdminRequests />;

  return <Navigate to={`/${schoolSubdomain || 'goddard'}/dashboard`} replace />;
}

/**
 * Guards pages that are restricted to the Super Admin only
 * (e.g. the Request & Expense Tracking analytics page).
 */
export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { userData, schoolSubdomain } = useUserContext();
  const role = userData?.role?.toLowerCase();

  if (role === 'superadmin') return <>{children}</>;

  return <Navigate to={`/${schoolSubdomain || 'goddard'}/dashboard`} replace />;
}
