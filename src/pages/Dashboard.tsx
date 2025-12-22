import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { EnrollmentProgress } from '../components/dashboard/EnrollmentProgress';
import { FormsDocuments } from '../components/dashboard/FormsDocuments';
import { Footer } from '../components/layout/Footer';
import { ChildSelector } from '../components/dashboard/ChildSelector';
import { ChildrenOverview } from '../components/dashboard/ChildrenOverview';
import { ParentInfo } from '../components/dashboard/ParentInfo';
import { fetchSingleParent } from '../services/api/admin';
import { useUserContext } from '../contexts/UserContext';
import { useAuth } from '../services/auth/useAuth';
import { COMPLETION_STATUSES, normalizeFormStatus, type NormalizedFormStatus } from '../lib/formStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  assignedAt?: string | null;
  dueDate?: string | null;
};
type ChildSpecificFormGroup = {
  childId: string;
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
  childStatus: 'active' | 'archive';
  parentType?: string;
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
function normalizeChildFromParent(child: any, yearFilter?: string): DashboardChild {
  let forms = (child.forms || []).map((form: any) => {
    const status = normalizeFormStatus(form.status);
    return {
      title: form.formName || form.form_name || 'Unknown Form',
      description: form.formName || form.form_name || 'Unknown Form',
      lastUpdated: (() => {
        // Try assigned_at first, then approved_on as fallback
        const assignedDate = form.assigned_at;
        if (assignedDate) {
          // Handle DD-MM-YYYY format
          const parts = assignedDate.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          }
        }
        
        // Fallback to approved_on
        const approvedDate = form.approved_on || form.approvedOn;
        if (approvedDate) {
          try {
            const date = new Date(approvedDate);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          } catch (e) {}
        }
        return '—';
      })(),
      status,
      formId: form.form_id || form.formId,
      recentPdfLink: form.recent_pdf_link || form.recentPdfLink || null,
      recentEditLink: form.recent_edit_link || form.recentEditLink || null,
      filloutFormId: form.fillout_form_id || form.filloutFormId || null,
      assignedAt: form.assigned_at || null,
      dueDate: form.due_date ? (() => {
        // Handle DD-MM-YYYY format from API
        const parts = form.due_date.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const date = new Date(`${year}-${month}-${day}`);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US');
          }
        }
        return form.due_date;
      })() : null
    } satisfies ChildFormCard;
  });

  // Filter forms by year if yearFilter is provided
  if (yearFilter && yearFilter !== 'all') {
    forms = forms.filter((form: ChildFormCard) => {
      if (!form.assignedAt) return false;
      // Handle DD-MM-YYYY format (e.g., "04-11-2025")
      const parts = form.assignedAt.split('-');
      return parts.length === 3 && parts[2] === yearFilter;
    });
  }

  const completedCount = forms.filter((form: ChildFormCard) => COMPLETION_STATUSES.has(form.status)).length;
  const totalForms = forms.length;
  const pendingForm = forms.find((form: ChildFormCard) => !COMPLETION_STATUSES.has(form.status)) ?? null;
  const enrollmentProgress = totalForms > 0 ? Math.round(completedCount / totalForms * 100) : 0;
  
  // Check for overdue forms
  const overdueForms = forms.filter((form: ChildFormCard) => {
    if (COMPLETION_STATUSES.has(form.status) || !form.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(form.dueDate);
    return dueDate < today;
  });
  
  const currentStep = overdueForms.length > 0 
    ? `${overdueForms.length} overdue form${overdueForms.length > 1 ? 's' : ''}` 
    : pendingForm?.title ?? (enrollmentProgress === 100 ? 'Enrollment complete' : 'Start enrollment');

  // Extract name from childFullName or fallback to empty string
  const fullName = child.childFullName || '';
  const nameParts = fullName.trim().split(' ').filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: child.childId || '',
    name: fullName,
    initials: getInitials(firstName, lastName),
    age: (() => {
      if (!child.childDob) return '—';
      const birthDate = new Date(child.childDob);
      if (isNaN(birthDate.getTime())) return '—';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} years` : '—';
    })(),
    dob: formatDate(child.childDob) || '—',
    enrollmentProgress,
    formsCompleted: completedCount,
    totalForms,
    currentStep,
    nextActionLabel: pendingForm ? `Continue ${pendingForm.title}` : 'View enrollment summary',
    forms,
    childStatus: (child.childStatus || 'active') as 'active' | 'archive',
    parentType: child.parent_type || child.parentType || 'primary_parent'
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [yearFilter, setYearFilter] = useState<string>('all');
  
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

    // Fetch parent data
    fetchSingleParent(parentId, userData.schoolId)
      .then((parentData) => {
        if (!isMounted) return;

        if (!parentData) {
          throw new Error('Unable to fetch parent data.');
        }

        // Store raw parent data for form viewing
        setParentData(parentData);

        // Extract available years from all forms
        const years = new Set<string>();
        (parentData.children || []).forEach(child => {
          (child.forms || []).forEach((form: any) => {
            if (form.assigned_at) {
              // Handle DD-MM-YYYY format (e.g., "04-11-2025")
              const parts = form.assigned_at.split('-');
              if (parts.length === 3 && parts[2].length === 4) {
                years.add(parts[2]);
              }
            }
          });
        });
       
        // Process children from the parent response
        const processedChildren = (parentData.children || []).map(child => {
          return normalizeChildFromParent(child, yearFilter);
        });

        // Extract forms for each child
        const childFormsData = processedChildren.map(child => ({
          childId: child.id,
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
  }, [userData, userLoading, user?.id, refreshTrigger, yearFilter]);
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

  // Handle form completion - refresh data to update form status
  const handleFormCompleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  return <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
        {error && <div className="mb-3 sm:mb-4 rounded-md border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-sm text-red-700">
            {error}
          </div>}
        {loading ? <div className="py-8 sm:py-12 text-center text-muted-foreground">
            Loading parent dashboard...
          </div> : <>
            <div className="mb-3 sm:mb-4 md:mb-6 space-y-3 sm:space-y-4">
              <ChildSelector children={children} selectedChildId={selectedChildId ?? children[0]?.id ?? ''} onSelectChild={setSelectedChildId} />
              
            </div>
            {selectedChild ? <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-10 gap-3 sm:gap-4 md:gap-6">
                <div className="lg:col-span-2 xl:col-span-7 space-y-3 sm:space-y-4 md:space-y-6">
                  <div className="section-fade-in" style={{
              animationDelay: '0.1s'
            }}>
                    <EnrollmentProgress
                      childName={selectedChild.name}
                      forms={selectedChild.forms}
                      onContinue={handleViewForm}
                      childStatus={selectedChild.childStatus}
                      childId={selectedChild.id}
                    />
                  </div>
                  {selectedChild.childStatus !== 'archive' && (
                    <div className="section-fade-in" style={{
                animationDelay: '0.2s'
              }} data-forms-section>
                      <FormsDocuments
                        childSpecificForms={childSpecificForms}
                        familyForms={familyForms}
                        rawFormData={parentData}
                        selectedChildId={selectedChild.id}
                        selectedChildName={selectedChild.name}
                        childStatus={selectedChild.childStatus}
                        onChildSelect={(childName) => {
                          const child = children.find(c => c.name === childName);
                          if (child) {
                            setSelectedChildId(child.id);
                          }
                        }}
                        onViewForm={handleViewForm}
                        formToOpen={formToOpen}
                        onFormOpened={() => setFormToOpen(null)}
                        onFormCompleted={handleFormCompleted}
                        yearFilter={yearFilter}
                        onYearFilterChange={setYearFilter}
                      />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-1 xl:col-span-3 order-first lg:order-last space-y-4">
                  <div className="section-fade-in" style={{
              animationDelay: '0.3s'
            }}>
                    <ParentInfo parentData={parentData} />
                  </div>
                  <div className="section-fade-in" style={{
              animationDelay: '0.4s'
            }}>
                    <ChildrenOverview children={children} selectedChildId={selectedChildId ?? selectedChild.id} onSelectChild={setSelectedChildId} />
                  </div>
                </div>
              </div> : <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-4 sm:p-6 md:p-8 text-center">
                <div className="text-base sm:text-lg font-medium text-gray-900 mb-2">No enrolled children found</div>
                <div className="text-sm text-muted-foreground mb-3 sm:mb-4">
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