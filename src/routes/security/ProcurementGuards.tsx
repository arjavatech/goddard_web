import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { SuperAdminRequests } from '../../pages/superadmin/SuperAdminRequests';
import { SuperAdminExpenses } from '../../pages/superadmin/SuperAdminExpenses';

/**
 * Role-aware wrapper for `/requests`.
 * - Admins, Super Admins, and Owners get the full request board (create, validate, and process requests).
 * - Any other role is bounced back to the dashboard.
 */
export function RequestsRouter() {
  const { userData, schoolSubdomain } = useUserContext();
  const role = userData?.role?.toLowerCase();

  if (role === 'admin' || role === 'superadmin' || role === 'owner') return <SuperAdminRequests />;

  return <Navigate to={`/${schoolSubdomain || 'goddard'}/dashboard`} replace />;
}

/**
 * Guards pages accessible to SuperAdmin or Owner (same elevated access level).
 */
export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { userData, schoolSubdomain } = useUserContext();
  const role = userData?.role?.toLowerCase();

  if (role === 'superadmin' || role === 'owner') return <>{children}</>;

  return <Navigate to={`/${schoolSubdomain || 'goddard'}/dashboard`} replace />;
}

/**
 * Guards pages strictly for SuperAdmin only (e.g. owner management).
 */
export function StrictSuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { userData, schoolSubdomain } = useUserContext();
  const role = userData?.role?.toLowerCase();

  if (role === 'superadmin') return <>{children}</>;

  return <Navigate to={`/${schoolSubdomain || 'goddard'}/admin`} replace />;
}
