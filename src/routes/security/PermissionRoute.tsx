import type { ReactNode } from 'react';
import { useUserContext } from '../../contexts/UserContext';

export function PermissionRoute({ permission, children }: { permission: string; children: ReactNode }) {
  const { adminPermissions, userData, isReady } = useUserContext();
  if (!isReady) return null;
  const isSuperAdmin = userData?.role?.toLowerCase() === 'superadmin';
  if (isSuperAdmin || adminPermissions.includes(permission)) return <>{children}</>;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="mt-2 text-sm text-slate-600">
          You don't have permission to access this feature. Contact your Super Admin to request access.
        </p>
      </section>
    </main>
  );
}
