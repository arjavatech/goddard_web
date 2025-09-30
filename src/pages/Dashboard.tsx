import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { EnrollmentProgress } from '../components/dashboard/EnrollmentProgress';
import { FormsDocuments } from '../components/dashboard/FormsDocuments';
import { ImportantInfo } from '../components/dashboard/ImportantInfo';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Footer } from '../components/layout/Footer';
import { ChildSelector } from '../components/dashboard/ChildSelector';
import { ChildrenOverview } from '../components/dashboard/ChildrenOverview';
import { fetchSingleParent } from '../services/api/admin';
import { useUserContext } from '../contexts/UserContext';
import { useAuth } from '../services/auth/useAuth';
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
function normalizeChildFromParent(child: any): DashboardChild {
  const forms = (child.forms || []).map((form: any) => {
    const status = normalizeFormStatus(form.status);
    return {
      title: form.formName || form.form_name || 'Unknown Form',
      description: 'Enrollment form',
      lastUpdated: formatDate(null),
      status
    } satisfies ChildFormCard;
  });

  const completedCount = forms.filter((form: ChildFormCard) => COMPLETION_STATUSES.has(form.status)).length;
  const totalForms = forms.length;
  const pendingForm = forms.find((form: ChildFormCard) => !COMPLETION_STATUSES.has(form.status)) ?? null;
  const enrollmentProgress = totalForms > 0 ? Math.round(completedCount / totalForms * 100) : 0;
  const currentStep = pendingForm?.title ?? (enrollmentProgress === 100 ? 'Enrollment complete' : 'Start enrollment');

  // Extract name from childFullName or fallback to empty string
  const fullName = child.childFullName || '';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: child.childId || '',
    name: fullName,
    initials: getInitials(firstName, lastName),
    age: '—',
    dob: formatDate(child.childDob) || '—',
    enrollmentProgress,
    formsCompleted: completedCount,
    totalForms,
    currentStep,
    nextActionLabel: pendingForm ? `Continue ${pendingForm.title}` : 'View enrollment summary',
    forms
  };
}
export function Dashboard() {
  const { userData, loading: userLoading } = useUserContext();
  const { user } = useAuth();
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [childSpecificForms, setChildSpecificForms] = useState<ChildSpecificFormGroup[]>([]);
  const [familyForms, setFamilyForms] = useState<FamilyFormCard[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentData, setParentData] = useState<any>(null);

  useEffect(() => {
    // Wait for user data to be loaded
    if (userLoading) {
      return;
    }

    // Check if we have the necessary data
    if (!userData?.schoolId) {
      setError('School context not available for the current user.');
      setLoading(false);
      return;
    }

    const parentId = userData.parentId || user?.id;
    if (!parentId) {
      setError('Parent ID not available.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Fetch parent data with children and forms in a single API call
    fetchSingleParent(parentId, userData.schoolId)
      .then(parentData => {
        if (!isMounted) return;

        if (!parentData) {
          throw new Error('Unable to fetch parent data.');
        }

        // Store raw parent data for form viewing
        setParentData(parentData);

        // Process children from the parent response
        const processedChildren = (parentData.children || []).map(child => normalizeChildFromParent(child));

        // Extract forms for each child
        const childFormsData = processedChildren.map(child => ({
          childName: child.name,
          forms: child.forms
        }));

        // For now, we'll use an empty array for family forms since the API doesn't provide them
        const familyFormData: FamilyFormCard[] = [];

        setChildren(processedChildren);
        setChildSpecificForms(childFormsData);
        setFamilyForms(familyFormData);
        setError(null);
      })
      .catch(err => {
        if (!isMounted) return;
        setChildren([]);
        setChildSpecificForms([]);
        setFamilyForms([]);
        const message = err instanceof Error ? err.message : null;
        setError(message && message !== 'Received unexpected response from the server.' ? message : "We couldn't load your dashboard details right now. Please try again shortly.");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userData, userLoading, user?.id]);
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
  return <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>}
        {loading ? <div className="py-12 text-center text-muted-foreground">
            Loading parent dashboard...
          </div> : <>
            <ChildSelector children={children} selectedChildId={selectedChildId ?? children[0]?.id ?? ''} onSelectChild={setSelectedChildId} />
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
                    <FormsDocuments
                      childSpecificForms={childSpecificForms}
                      familyForms={familyForms}
                      rawFormData={parentData}
                    />
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
              </div> : <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-8 text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">No enrolled children found</div>
                <div className="text-sm text-muted-foreground mb-4">
                  We were unable to load any enrollment records for this parent account.
                </div>
                <div className="text-xs text-gray-500">
                  If you believe this is an error, please contact your school administrator.
                </div>
              </div>}
          </>}
      </main>
      <Footer />
    </div>;
}