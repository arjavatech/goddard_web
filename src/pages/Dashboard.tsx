import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { EnrollmentProgress } from '../components/dashboard/EnrollmentProgress';
import { FormsDocuments } from '../components/dashboard/FormsDocuments';
import { ImportantInfo } from '../components/dashboard/ImportantInfo';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Footer } from '../components/layout/Footer';
import { ChildSelector } from '../components/dashboard/ChildSelector';
import { ChildrenOverview } from '../components/dashboard/ChildrenOverview';
import {
  fetchEnrollmentChildren,
  fetchFormTemplates,
  type EnrollmentChild,
  type FormTemplate
} from '../services/api/dashboard';
import { fetchUserContext } from '../services/api/user';
import { COMPLETION_STATUSES, normalizeFormStatus, type NormalizedFormStatus } from '../lib/formStatus';
type FormStatus = NormalizedFormStatus;
type ChildFormCard = {
  title: string;
  description: string;
  lastUpdated: string;
  status: FormStatus;
};
type ChildSpecificFormGroup = {
  childName: string;
  forms: ChildFormCard[];
};
type FamilyFormCard = ChildFormCard;
type DashboardChild = {
  id: string;
  name: string;
  initials: string;
  age: string;
  dob: string;
  enrollmentProgress: number;
  formsCompleted: number;
  totalForms: number;
  currentStep: string;
  nextActionLabel: string;
  forms: ChildFormCard[];
};
function getInitials(firstName: string, lastName: string): string {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return initials || '—';
}
function formatDate(input: string | null | undefined): string {
  if (!input) return '—';
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
function normalizeChild(
  child: EnrollmentChild,
  templateMap: Map<string, FormTemplate>
): DashboardChild {
  const formEntries = Object.entries(child.forms ?? {});
  const forms = formEntries.map(([rawTitle, rawStatus]) => {
    const template = templateMap.get(rawTitle.toLowerCase());
    const status = normalizeFormStatus(rawStatus);
    return {
      title: template?.formName ?? rawTitle,
      description: template?.formType ? `${template.formType} form` : 'Form details unavailable',
      lastUpdated: formatDate(template?.createdAt),
      status
    } satisfies ChildFormCard;
  });
  const completedCount = forms.filter(form => COMPLETION_STATUSES.has(form.status)).length;
  const totalForms = forms.length;
  const pendingForm = forms.find(form => !COMPLETION_STATUSES.has(form.status)) ?? null;
  const fallbackStatus = normalizeFormStatus(child.formStatus);
  const enrollmentProgress = totalForms > 0 ? Math.round((completedCount / totalForms) * 100) : fallbackStatus === 'Approved' ? 100 : 0;
  const currentStep = pendingForm?.title ?? (enrollmentProgress === 100 ? 'Enrollment complete' : 'Start enrollment');
  return {
    id: child.childId,
    name: `${child.firstName} ${child.lastName}`.trim(),
    initials: getInitials(child.firstName, child.lastName),
    age: '—',
    dob: '—',
    enrollmentProgress,
    formsCompleted: completedCount,
    totalForms,
    currentStep,
    nextActionLabel: pendingForm ? `Continue ${pendingForm.title}` : 'View enrollment summary',
    forms
  };
}
export function Dashboard() {
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [childSpecificForms, setChildSpecificForms] = useState<ChildSpecificFormGroup[]>([]);
  const [familyForms, setFamilyForms] = useState<FamilyFormCard[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) {
          throw new Error('School context not available for the current user.');
        }
        const [enrollmentChildren, formTemplates] = await Promise.all([
          fetchEnrollmentChildren(user.schoolId),
          fetchFormTemplates(user.schoolId)
        ]);
        const templatesForSchool = formTemplates.filter(template => !template.schoolId || template.schoolId === user.schoolId);
        const templateMap = new Map<string, FormTemplate>();
        templatesForSchool.forEach(template => {
          if (!template.formName) return;
          templateMap.set(template.formName.toLowerCase(), template);
        });
        const processedChildren = enrollmentChildren.map(child => normalizeChild(child, templateMap));
        const childFormsData = processedChildren.map(child => ({
          childName: child.name,
          forms: child.forms
        }));
        const familyFormData = templatesForSchool.map(template => ({
          title: template.formName,
          description: template.formType ? `${template.formType} form` : 'Form template',
          lastUpdated: formatDate(template.createdAt),
          status: normalizeFormStatus(template.status)
        }));
        if (!isMounted) return;
        setChildren(processedChildren);
        setChildSpecificForms(childFormsData);
        setFamilyForms(familyFormData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setChildren([]);
        setChildSpecificForms([]);
        setFamilyForms([]);
        const message = err instanceof Error ? err.message : null;
        setError(message && message !== 'Received unexpected response from the server.' ? message : "We couldn't load your dashboard details right now. Please try again shortly.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    if (children.length === 0) {
      setSelectedChildId(null);
      return;
    }
    if (!selectedChildId || !children.some(child => child.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);
  const selectedChild = useMemo(() => {
    if (!selectedChildId) return children[0] ?? null;
    return children.find(child => child.id === selectedChildId) ?? children[0] ?? null;
  }, [children, selectedChildId]);
  const quickActions = useMemo(() => {
    if (!selectedChild) return [];
    return [{
      label: selectedChild.nextActionLabel,
      helperText: selectedChild.totalForms > 0 ? `${selectedChild.formsCompleted}/${selectedChild.totalForms} forms complete` : 'Awaiting form assignments',
      disabled: true
    }];
  }, [selectedChild]);
  console.log('Processed children:', children)
  console.log('Child specific forms:', childSpecificForms)
  console.log('Family forms:', familyForms)
  console.log('Selected child:', selectedChild)
  return <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>}
        {loading ? <div className="py-12 text-center text-muted-foreground">
            Loading parent dashboard...
          </div> : <>
            <ChildSelector children={children} selectedChildId={selectedChildId ?? (children[0]?.id ?? '')} onSelectChild={setSelectedChildId} />
            {selectedChild ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="section-fade-in" style={{
              animationDelay: '0.1s'
            }}>
                    <EnrollmentProgress childName={selectedChild.name} completedSteps={selectedChild.formsCompleted} totalSteps={selectedChild.totalForms} currentStep={selectedChild.currentStep} />
                  </div>
                  <div className="section-fade-in" style={{
              animationDelay: '0.2s'
            }}>
                    <FormsDocuments childSpecificForms={childSpecificForms} familyForms={familyForms} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="section-fade-in" style={{
              animationDelay: '0.3s'
            }}>
                    <QuickActions actions={quickActions} />
                  </div>
                  <div className="section-fade-in" style={{
              animationDelay: '0.4s'
            }}>
                    <ChildrenOverview children={children} selectedChildId={selectedChildId ?? selectedChild.id} onSelectChild={setSelectedChildId} />
                  </div>
                  <div className="section-fade-in" style={{
              animationDelay: '0.5s'
            }}>
                    <ImportantInfo fallbackMessage="School announcements, deadlines, and contacts will appear here once they are shared." />
                  </div>
                </div>
              </div> : <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-8 text-center text-sm text-muted-foreground">
                Add a child to get started. We were unable to load any enrollment records for this parent.
              </div>}
          </>}
      </main>
      <Footer />
    </div>;
}
