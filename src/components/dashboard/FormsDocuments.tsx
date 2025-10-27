import { useMemo, useState, useEffect, useRef } from 'react';
import { FileText, Download, Printer, Eye, ChevronLeft, AlertCircle, Home } from 'lucide-react';
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
          Approval date: {lastUpdated}
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
          {!isApproved && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
              onClick={onView}
              title="View Form"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
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
  fromContinueButton?: boolean;
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
  onFormCompleted?: () => void; // Callback when form is completed to trigger refresh
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
  onFormOpened,
  onFormCompleted
}: FormsDocumentsProps) {
  const [loadingAction, setLoadingAction] = useState<{ action: string; formId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(selectedChildId || 'all');
  const previousChildIdRef = useRef<string | undefined>(selectedChildId);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const thankYouTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeTab with selectedChildId only when it actually changes
  useEffect(() => {
    if (selectedChildId && selectedChildId !== previousChildIdRef.current) {
      setActiveTab(selectedChildId);
      previousChildIdRef.current = selectedChildId;
      // Close any open form when child changes
      setSelectedForm(null);
      setShowThankYou(false);
      setIsFrameLoading(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
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
      ...childSpecificForms.flatMap((child) => {
        // Find the matching child in rawFormData by childId
        const rawChild = rawFormData?.children?.find((c: any) => c.childId === child.childId);
        return child.forms.map((form, formIndex) => {
          // Find the exact matching form in rawData by form_id
          const matchingRawForm = rawChild?.forms?.find((rawForm: any) => 
            rawForm.form_id === form.formId || rawForm.form_name === form.title
          );
          return {
            ...form,
            childId: child.childId,
            childName: child.childName,
            _key: `child-${child.childId}-form-${form.formId || formIndex}`,
            rawData: matchingRawForm || null
          };
        });
      })
    ];
  }, [familyForms, childSpecificForms, rawFormData, selectedChildId]);

  const handleView = (form: any) => {
    console.log('Form ID:', form.formId || form._key);
    console.log('Child ID form opening:', form.childId);
    console.log('Selected Child ID:', selectedChildId);
    console.log('Active Tab:', activeTab);
    
    // Skip validation for forms from Continue button
    if (form.fromContinueButton) {
      console.log('✓ Form from Continue button - bypassing child ID validation');
    } else {
      // Ensure we're using the correct child's data
      if (form.childId && selectedChildId && form.childId !== selectedChildId) {
        console.warn('Form child ID does not match selected child ID - blocking form open');
        console.log('Expected child ID:', selectedChildId, 'Got child ID:', form.childId);
        return;
      }
      console.log('✓ Child ID validation passed - opening form for correct child');
    }
    
    let formUrl = '#';
    
    // Extract all possible URL sources from rawData and form object
    const rawData = form.rawData || {};
    const recentEditLink = rawData.recent_edit_link || form.recentEditLink;
    const recentPdfLink = rawData.recent_pdf_link || form.recentPdfLink;
    const filloutFormId = rawData.fillout_form_id || form.filloutFormId;
    const studentFormAssignmentId = rawData.student_form_assignment_id || rawData.studentFormAssignmentId;
    const formId = rawData.form_id || form.formId;
    
    console.log('Form data for URL construction:', {
      status: form.status,
      recentEditLink,
      recentPdfLink,
      filloutFormId,
      studentFormAssignmentId,
      formId,
      rawData
    });

    const isApproved = form.status === 'Approved';

    if (isApproved) {
      // For approved forms, don't allow viewing/editing - only download/print
      return;
    } else {
      // For non-approved forms, prioritize recent_edit_link first
      if (recentEditLink && recentEditLink !== '#' && recentEditLink.trim() !== '') {
        formUrl = recentEditLink;
      } else if (filloutFormId && filloutFormId !== '#' && filloutFormId.trim() !== '') {
        // Handle fillout form URL construction
        if (filloutFormId.startsWith('http')) {
          // Already a full URL
          formUrl = filloutFormId;
          // Add student_form_assignment_id if available and not already in URL
          if (studentFormAssignmentId && !formUrl.includes('student_form_assignment_id')) {
            formUrl += `${formUrl.includes('?') ? '&' : '?'}student_form_assignment_id=${studentFormAssignmentId}`;
          }
        } else {
          // Construct fillout URL
          const baseUrl = `https://goddard.fillout.com/${filloutFormId}`;
          if (studentFormAssignmentId && studentFormAssignmentId !== '#' && studentFormAssignmentId.trim() !== '') {
            formUrl = `${baseUrl}?student_form_assignment_id=${studentFormAssignmentId}`;
          } else {
            formUrl = baseUrl;
          }
        }
      } else if (studentFormAssignmentId && studentFormAssignmentId !== '#' && studentFormAssignmentId.trim() !== '') {
        // Fallback: use the form's fillout_form_id or a default form with student_form_assignment_id
        const defaultFormId = rawData.fillout_form_id || 'parent_handbook';
        console.log('Default form ID used:', defaultFormId)
        formUrl = `https://goddard.fillout.com/${defaultFormId}?student_form_assignment_id=${studentFormAssignmentId}`;
      }
    }
    
    console.log('Final form URL:', formUrl);

    setSelectedForm({
      ...form,
      viewUrl: formUrl
    });
    setIsFrameLoading(true);
    onViewForm(form);
  };

  // Auto-open form when formToOpen is set
  useEffect(() => {
    if (formToOpen) {
      console.log('Auto-opening form:', formToOpen);
      // If it's from Continue button, directly open it
      if (formToOpen.fromContinueButton) {
        handleView(formToOpen);
      } else if (formToOpen.formId) {
        // Find the matching form in allForms by unique formId
        const matchingForm = allForms.find(f => f.formId === formToOpen.formId);
        if (matchingForm) {
          // Only auto-open if it belongs to the selected child
          if (!matchingForm.childId || matchingForm.childId === selectedChildId) {
            handleView(matchingForm);
          } else {
            console.warn('Auto-open blocked: Form belongs to different child');
          }
        }
      }
      if (onFormOpened) {
        onFormOpened();
      }
    }
  }, [formToOpen, allForms, selectedChildId]);

  // Get forms for the selected tab
  const getFormsForTab = (tabValue: string) => {
    if (tabValue === 'all') {
      return allForms;
    } else if (tabValue === 'family') {
      return allForms.filter(form => !form.childId);
    } else {
      // Individual child tab - filter by childId and ensure it matches selectedChildId
      return allForms.filter(form => form.childId === tabValue && form.childId === selectedChildId);
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

  // Handle form completion detection and auto-redirect
  useEffect(() => {
    if (selectedForm && !isFrameLoading) {
      let urlCheckInterval: NodeJS.Timeout;
      
      // Function to start thank you countdown
      const startThankYouCountdown = () => {
        setShowThankYou(true);
        setCountdown(5);
        
        // Start countdown
        countdownRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              // Auto redirect to home
              setSelectedForm(null);
              setShowThankYou(false);
              setIsFrameLoading(false);
              if (countdownRef.current) clearInterval(countdownRef.current);
              // Trigger refresh when auto-redirecting
              if (onFormCompleted) onFormCompleted();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Fallback timeout in case countdown doesn't work
        thankYouTimeoutRef.current = setTimeout(() => {
          setSelectedForm(null);
          setShowThankYou(false);
          setIsFrameLoading(false);
        }, 15000);
      };
      
      // Listen for messages from iframe to detect form completion
      const handleMessage = (event: MessageEvent) => {
        // Check if message indicates form completion (thank you page)
        if (event.data && typeof event.data === 'string' && 
            (event.data.includes('thank') || event.data.includes('complete') || event.data.includes('submitted'))) {
          startThankYouCountdown();
        }
      };
      
      // Monitor iframe URL changes for thank you page detection
      const monitorIframeUrl = () => {
        try {
          const iframe = document.querySelector('iframe[title="' + selectedForm.title + '"]') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            const currentUrl = iframe.contentWindow.location.href;
            // Check if URL contains thank you indicators
            if (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('complete')) {
              startThankYouCountdown();
              if (urlCheckInterval) clearInterval(urlCheckInterval);
            }
          }
        } catch (error) {
          // Cross-origin restrictions prevent URL access, this is expected
          // We'll rely on message passing or user interaction
        }
      };
      
      // Check URL every 2 seconds
      urlCheckInterval = setInterval(monitorIframeUrl, 2000);
      
      window.addEventListener('message', handleMessage);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        if (urlCheckInterval) clearInterval(urlCheckInterval);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
      };
    }
  }, [selectedForm, isFrameLoading]);

  // Cleanup timers when component unmounts or form changes
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
    };
  }, []);

  // If a form is selected for viewing, show iframe in this section
  if (selectedForm) {
    return (
      <div>
        <div className="mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setSelectedForm(null);
                setIsFrameLoading(false);
                setShowThankYou(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {selectedForm.title}
              </h2>
              {selectedForm.childName && (
                <span className="inline-block mt-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  {selectedForm.childName}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end">
            {showThankYou && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                <span className="text-sm text-green-700 font-medium">
                  Form completed! Redirecting in {countdown}s
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100 shrink-0"
                  onClick={() => {
                    setSelectedForm(null);
                    setShowThankYou(false);
                    setIsFrameLoading(false);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
                    // Trigger refresh when returning to dashboard
                    if (onFormCompleted) onFormCompleted();
                  }}
                >
                  <Home className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Button>
              </div>
            )}
            {!showThankYou && (
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedForm.status} />
              </div>
            )}
          </div>
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
                    height: '500px',
                    border: 'none',
                    borderRadius: '8px',
                    opacity: isFrameLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                  className="sm:h-[600px]"
                  title={selectedForm.title}
                  allow="fullscreen"
                  onLoad={() => {
                    setIsFrameLoading(false);
                    // Add a manual trigger button after form loads
                    setTimeout(() => {
                      // Check if this might be a thank you page by looking at common indicators
                      try {
                        const iframe = document.querySelector('iframe[title="' + selectedForm.title + '"]') as HTMLIFrameElement;
                        if (iframe && iframe.contentDocument) {
                          const content = iframe.contentDocument.body.innerText.toLowerCase();
                          if (content.includes('thank you') || content.includes('submitted') || content.includes('complete')) {
                            setShowThankYou(true);
                            setCountdown(5);
                            
                            countdownRef.current = setInterval(() => {
                              setCountdown(prev => {
                                if (prev <= 1) {
                                  setSelectedForm(null);
                                  setShowThankYou(false);
                                  setIsFrameLoading(false);
                                  if (countdownRef.current) clearInterval(countdownRef.current);
                                  // Trigger refresh when auto-redirecting
                                  if (onFormCompleted) onFormCompleted();
                                  return 0;
                                }
                                return prev - 1;
                              });
                            }, 1000);
                          }
                        }
                      } catch (error) {
                        // Cross-origin restrictions, ignore
                      }
                    }, 1000);
                  }}
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
          <div className="mb-4 overflow-x-auto ">
            <TabsList className="w-max">
              <TabsTrigger value="all">All Forms</TabsTrigger>
              {familyForms.length > 0 && (
                <TabsTrigger value="family">Family Forms</TabsTrigger>
              )}
              {childSpecificForms.map((child) => (
                <TabsTrigger key={child.childId} value={child.childId} className="whitespace-nowrap">
                  <span className="sm:hidden">{child.childName.split(' ')[0]}</span>
                  <span className="hidden sm:inline">{child.childName}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="all">
            {allForms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-muted-foreground">
                No forms available yet. This section will populate once assignments are available from the backend service.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                    onView={() => {
                      console.log('Form ID:', form.formId || form._key);
                      console.log('Child ID:', form.childId);
                      handleView(form);
                    }}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {childSpecificForms.map((child) => (
            <TabsContent key={child.childId} value={child.childId}>
              {getFormsForTab(child.childId).length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-muted-foreground">
                  No forms available for {child.childName} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                      onView={() => {
                        console.log('Form ID:', form.formId || form._key);
                        console.log('Child ID:', form.childId);
                        handleView(form);
                      }}
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