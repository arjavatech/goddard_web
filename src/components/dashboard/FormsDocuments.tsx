import { useMemo, useState, useEffect, useRef } from 'react';
import { FileText, Download, Printer, Eye, ChevronLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loading } from '../ui/loading';
interface FormCardProps {
  title: string;
  description: string;
  lastUpdated: string;
  status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  childName?: string; // Optional - only for child-specific forms
  recentPdfLink?: string | null;
  onView?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  isLoading?: { action: string; formId: string } | null;
  formId?: string;
}
function FormCard({
  title,
  description,
  lastUpdated,
  status,
  childName,
  recentPdfLink,
  onView,
  onDownload,
  onPrint,
  isLoading,
  formId
}: FormCardProps) {
  const isApproved = status === 'Approved';
  const isLoadingThis = isLoading?.formId === formId;

  return <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-amazon-teal" />
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            </div>
            {childName && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">
                {childName}
              </span>}
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="w-full h-1 bg-gray-100 rounded mt-4"></div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted-foreground">
          Last updated: {lastUpdated}
        </span>
        <div className="flex gap-1">
          {isApproved && recentPdfLink && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={onDownload}
                disabled={isLoadingThis}
                title="Download PDF"
              >
                {isLoadingThis && isLoading?.action === 'download' ? (
                  <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-gray-600 border-gray-200 hover:bg-gray-50"
                onClick={onPrint}
                disabled={isLoadingThis}
                title="Print PDF"
              >
                {isLoadingThis && isLoading?.action === 'print' ? (
                  <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
            onClick={onView}
            title="View Form"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>;
}
interface FormData {
  title: string;
  description: string;
  lastUpdated: string;
  status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  formId?: string;
  recentPdfLink?: string | null;
  recentEditLink?: string | null;
  filloutFormId?: string | null;
}

interface FormsDocumentsProps {
  childSpecificForms: {
    childId: string;
    childName: string;
    forms: FormData[];
  }[];
  familyForms: FormData[];
  rawFormData?: any; // Raw parent data to access form URLs
  selectedChildId?: string; // ID of the currently selected child
  selectedChildName?: string; // Name of the currently selected child
  childStatus?: 'active' | 'archive'; // Status of the currently selected child
  onChildSelect?: (childName: string) => void; // Callback when a child tab is clicked
  onViewForm: (form: any) => void; // Callback to view a form
  formToOpen?: any; // Form to automatically open
  onFormOpened?: () => void; // Callback when form is opened
}
export function FormsDocuments({
  childSpecificForms,
  familyForms,
  rawFormData,
  selectedChildId,
  selectedChildName,
  childStatus = 'active',
  onChildSelect,
  onViewForm,
  formToOpen,
  onFormOpened
}: FormsDocumentsProps) {
  const [loadingAction, setLoadingAction] = useState<{ action: string; formId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(selectedChildId || 'all');
  const previousChildIdRef = useRef<string | undefined>(selectedChildId);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isFrameLoading, setIsFrameLoading] = useState(false);

  // Sync activeTab with selectedChildId only when it actually changes
  useEffect(() => {
    if (selectedChildId && selectedChildId !== previousChildIdRef.current) {
      setActiveTab(selectedChildId);
      previousChildIdRef.current = selectedChildId;
    }
  }, [selectedChildId]);

  // Combine all forms into a single list with proper typing
  const allForms = useMemo(() => {
    return [
      ...familyForms.map((form, index) => ({
        ...form,
        childId: undefined,
        childName: undefined,
        _key: `family-${index}`,
        rawData: null as any
      })),
      ...childSpecificForms.flatMap((child, childIndex) =>
        child.forms.map((form, formIndex) => ({
          ...form,
          childId: child.childId,
          childName: child.childName,
          _key: `child-${childIndex}-form-${formIndex}`,
          rawData: rawFormData?.children?.[childIndex]?.forms?.[formIndex] || null
        }))
      )
    ];
  }, [familyForms, childSpecificForms, rawFormData]);

  const handleView = (form: any) => {
    let formUrl = '#';

    const isApproved = form.status === 'Approved';

    if (isApproved) {
      // For approved forms, prioritize recent_edit_link for viewing
      formUrl = form.rawData?.recent_edit_link ||
                form.recentEditLink ||
                form.rawData?.recent_pdf_link ||
                form.recentPdfLink ||
                '#';
    } else {
      // For non-approved forms, use recent_edit_link first, then construct fillout URL
      const recentEditLink = form.rawData?.recent_edit_link || form.recentEditLink;
      const studentFormAssignmentId = form.rawData?.student_form_assignment_id || form.rawData?.studentFormAssignmentId;
      const filloutFormId = form.rawData?.fillout_form_id || form.filloutFormId;

      if (recentEditLink && recentEditLink !== '#' && recentEditLink.trim() !== '') {
        formUrl = recentEditLink;
      } else if (studentFormAssignmentId && studentFormAssignmentId !== '#' && studentFormAssignmentId.trim() !== '') {
        // Construct proper Fillout URL with student_form_assignment_id parameter
        formUrl = `https://goddard.fillout.com/parent_handbook?student_form_assignment_id=${studentFormAssignmentId}`;
      } else if (filloutFormId && filloutFormId !== '#' && filloutFormId.trim() !== '') {
        // If filloutFormId is already a full URL, use it directly
        if (filloutFormId.startsWith('http')) {
          formUrl = filloutFormId;
        } else {
          // Otherwise treat it as an ID and construct the URL
          formUrl = `https://goddard.fillout.com/parent_handbook?student_form_assignment_id=${filloutFormId}`;
        }
      } else {
        formUrl = '#';
      }
    }

    setSelectedForm({
      ...form,
      viewUrl: formUrl
    });
    setIsFrameLoading(true);
    onViewForm(form); // Still call the parent callback for scroll behavior
  };

  // Auto-open form when formToOpen is set
  useEffect(() => {
    if (formToOpen && formToOpen.formId) {
      // Find the matching form in allForms by unique formId
      const matchingForm = allForms.find(f => f.formId === formToOpen.formId);
      if (matchingForm) {
        handleView(matchingForm);
      }
      if (onFormOpened) {
        onFormOpened();
      }
    }
  }, [formToOpen, allForms]);

  // Get forms for the selected tab
  const getFormsForTab = (tabValue: string) => {
    if (tabValue === 'all') {
      return allForms;
    } else if (tabValue === 'family') {
      return allForms.filter(form => !form.childId);
    } else {
      // Individual child tab - filter by childId (tab value is now childId)
      return allForms.filter(form => form.childId === tabValue);
    }
  };


  const handleDownload = async (form: any) => {
    const pdfLink = form.rawData?.recent_pdf_link || form.recentPdfLink;
    if (!pdfLink) return;

    setLoadingAction({ action: 'download', formId: form.formId || form._key });
    try {
      const response = await fetch(pdfLink);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrint = async (form: any) => {
    const pdfLink = form.rawData?.recent_pdf_link || form.recentPdfLink;
    if (!pdfLink) return;

    setLoadingAction({ action: 'print', formId: form.formId || form._key });
    try {
      const response = await fetch(pdfLink);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
      }
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  // If a form is selected for viewing, show iframe in this section
  if (selectedForm) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSelectedForm(null);
                setIsFrameLoading(false);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">
              {selectedForm.title}
            </h2>
            {selectedForm.childName && (
              <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                {selectedForm.childName}
              </span>
            )}
          </div>
          <StatusBadge status={selectedForm.status} />
        </div>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="relative">
              {isFrameLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md z-10">
                  <Loading message="Loading form..." size="md" />
                </div>
              )}
              {selectedForm.viewUrl && selectedForm.viewUrl !== '#' ? (
                <iframe
                  src={selectedForm.viewUrl}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    borderRadius: '8px',
                    opacity: isFrameLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                  title={selectedForm.title}
                  allow="fullscreen"
                  onLoad={() => setIsFrameLoading(false)}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                  Unable to load form. Please check the form configuration.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show archived message if child is archived
  if (childStatus === 'archive') {
    return <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Forms & Documents
          </h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
            <h3 className="font-semibold text-amber-900 mb-2 text-lg">
              The student is Archived
            </h3>
            <p className="text-sm text-amber-700">
              Form viewing is disabled for archived students.
            </p>
          </div>
        </div>
      </div>;
  }

  // Forms grid view with tabs
  return <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Forms & Documents
        </h2>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // If a child tab is clicked, notify parent to update selected child
          if (value !== 'all' && value !== 'family' && onChildSelect) {
            // Find the child by ID and pass their name to onChildSelect
            const child = childSpecificForms.find(c => c.childId === value);
            if (child) {
              onChildSelect(child.childName);
            }
          }
        }}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Forms</TabsTrigger>
            {familyForms.length > 0 && (
              <TabsTrigger value="family">Family Forms</TabsTrigger>
            )}
            {childSpecificForms.map((child) => (
              <TabsTrigger key={child.childId} value={child.childId}>
                {child.childName}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            {allForms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-muted-foreground">
                No forms available yet. This section will populate once assignments are available from the backend service.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFormsForTab('all').map(form => (
                  <FormCard
                    key={form._key}
                    title={form.title}
                    description={form.description}
                    lastUpdated={form.lastUpdated}
                    status={form.status}
                    childName={form.childName}
                    formId={form.formId || form._key}
                    recentPdfLink={form.rawData?.recent_pdf_link || form.recentPdfLink}
                    onView={() => handleView(form)}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {familyForms.length > 0 && (
            <TabsContent value="family">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFormsForTab('family').map(form => (
                  <FormCard
                    key={form._key}
                    title={form.title}
                    description={form.description}
                    lastUpdated={form.lastUpdated}
                    status={form.status}
                    childName={form.childName}
                    formId={form.formId || form._key}
                    recentPdfLink={form.rawData?.recent_pdf_link || form.recentPdfLink}
                    onView={() => handleView(form)}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            </TabsContent>
          )}

          {childSpecificForms.map((child) => (
            <TabsContent key={child.childId} value={child.childId}>
              {getFormsForTab(child.childId).length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-muted-foreground">
                  No forms available for {child.childName} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFormsForTab(child.childId).map(form => (
                    <FormCard
                      key={form._key}
                      title={form.title}
                      description={form.description}
                      lastUpdated={form.lastUpdated}
                      status={form.status}
                      childName={form.childName}
                      formId={form.formId || form._key}
                      recentPdfLink={form.rawData?.recent_pdf_link || form.recentPdfLink}
                      onView={() => handleView(form)}
                      onDownload={() => handleDownload(form)}
                      onPrint={() => handlePrint(form)}
                      isLoading={loadingAction}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>;
}