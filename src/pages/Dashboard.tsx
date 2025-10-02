import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { EnrollmentProgress } from '../components/dashboard/EnrollmentProgress';
import { FormsDocuments } from '../components/dashboard/FormsDocuments';
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
  formId?: string;
  recentPdfLink?: string | null;
  recentEditLink?: string | null;
  filloutFormId?: string | null;
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
      status,
      formId: form.form_id || form.formId,
      recentPdfLink: form.recent_pdf_link || form.recentPdfLink || null,
      recentEditLink: form.recent_edit_link || form.recentEditLink || null,
      filloutFormId: form.fillout_form_id || form.filloutFormId || null
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

  // State to hold the form that should be opened
  const [formToOpen, setFormToOpen] = useState<any>(null);

  // Shared handleViewForm function - sets the form to open and scrolls to Forms & Documents
  const handleViewForm = (form: any) => {
    setFormToOpen(form);
    // Scroll to Forms & Documents section after a brief delay to allow state to update
    setTimeout(() => {
      const formsSection = document.querySelector('[data-forms-section]');
      if (formsSection) {
        formsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
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
            {selectedChild ? <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="section-fade-in" style={{
              animationDelay: '0.1s'
            }}>
                    <EnrollmentProgress
                      childName={selectedChild.name}
                      forms={selectedChild.forms}
                      onContinue={handleViewForm}
                    />
                  </div>
                  <div className="section-fade-in" style={{
              animationDelay: '0.2s'
            }} data-forms-section>
                    <FormsDocuments
                      childSpecificForms={childSpecificForms}
                      familyForms={familyForms}
                      rawFormData={parentData}
                      selectedChildName={selectedChild.name}
                      onChildSelect={(childName) => {
                        const child = children.find(c => c.name === childName);
                        if (child) {
                          setSelectedChildId(child.id);
                        }
                      }}
                      onViewForm={handleViewForm}
                      formToOpen={formToOpen}
                      onFormOpened={() => setFormToOpen(null)}
                    />
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className="section-fade-in" style={{
              animationDelay: '0.3s'
            }}>
                    <ChildrenOverview children={children} selectedChildId={selectedChildId ?? selectedChild.id} onSelectChild={setSelectedChildId} />
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