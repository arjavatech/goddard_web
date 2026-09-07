import type { ReactNode } from 'react';
import { useUserContext } from '../../contexts/UserContext';
import type { SchoolFeatures } from '../../services/api/features';

type FeatureKey = keyof SchoolFeatures;

export function FeatureRoute({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { schoolFeatures, isReady } = useUserContext();
  if (!isReady) return null;
  if (!schoolFeatures[feature]) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Feature restricted</h1>
        <p className="mt-2 text-sm text-slate-600">This feature is not enabled for your school. Please contact your school administrator.</p>
      </section>
    </main>;
  }
  return <>{children}</>;
}
