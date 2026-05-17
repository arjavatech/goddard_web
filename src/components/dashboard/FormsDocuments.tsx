import { useMemo, useState, useEffect, useRef } from 'react';
import { FileText, Download, Printer, Eye, ChevronLeft, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loading } from '../ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
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
  assignedAt?: string | null;
  dueDate?: string | null;
}
function FormCard({
  title,
  description,
  lastUpdated,
  status,
  recentPdfLink,
  onView,
  onDownload,
  onPrint,
  isLoading,
  formId,
  dueDate
}: FormCardProps) {
  const isApproved = status === 'Approved';
  const isLoadingThis = isLoading?.formId === formId;



  const getBorderColor = () => {
    if (status === 'Approved' || status === 'Submitted' || status === 'In Progress') return 'border-green-500';
    return 'border-amber-500';
  };

  return <Card className={`glass-card h-full transition-shadow cursor-pointer hover:shadow-md ${getBorderColor()}`} onClick={onView}>
      <CardHeader className="pb-2">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="w-full h-1 bg-gray-100 rounded mt-4"></div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Assigned: {lastUpdated}
          </span>
          {dueDate && (
            <span className="text-xs text-muted-foreground">
              Due: {dueDate}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {isApproved && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.();
                }}
                title="View Form (Read-only)"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {recentPdfLink && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload?.();
                    }}
                    disabled={isLoadingThis}
                    title="Download PDF"
                  >
                    {isLoadingThis && isLoading?.action === 'download' ? (
                      <span className="animate-spin h-4 w-4 border-2 border-amazon-teal border-t-transparent rounded-full" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrint?.();
                    }}
                    disabled={isLoadingThis}
                    title="Print PDF"
                  >
                    {isLoadingThis && isLoading?.action === 'print' ? (
                      <span className="animate-spin h-4 w-4 border-2 border-amazon-teal border-t-transparent rounded-full" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </>
          )}
          {!isApproved && onView && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-amazon-teal border-amazon-teal hover:bg-amazon-teal hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
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
  assignedAt?: string | null;
  dueDate?: string | null;
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
  yearFilter?: string; // Year filter value
  onYearFilterChange?: (year: string) => void; // Callback to change year filter
  enrollmentId?: string; // For downloading all forms
}
export function FormsDocuments({
  childSpecificForms,
  familyForms,
  rawFormData,
  selectedChildId,
  childStatus = 'active',
  onChildSelect,
  onViewForm,
  formToOpen,
  onFormOpened,
  onFormCompleted,
  yearFilter = 'all',
  onYearFilterChange,
  enrollmentId
}: FormsDocumentsProps) {
  const [loadingAction, setLoadingAction] = useState<{ action: string; formId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(selectedChildId || childSpecificForms[0]?.childId || 'family');
  const previousChildIdRef = useRef<string | undefined>(selectedChildId);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thankYouTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadAll = async () => {
    if (!enrollmentId) return;
    setIsDownloadingAll(true);
    try {
      const { downloadAllForms } = await import('../../services/api/admin');
      await downloadAllForms(enrollmentId);
    } catch (err) {
      console.error('Download all forms failed:', err);
    } finally {
      setIsDownloadingAll(false);
    }
  };

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
          // Find the exact matching form in rawData by form_id or form_name
          console.log('Matching form for:', form.title, 'formId:', form.formId);
          console.log('Raw child data:', rawChild);
          console.log('Available raw forms (full):', rawChild?.forms);
          
          const matchingRawForm = rawChild?.forms?.find((rawForm: any) => {
            return rawForm.formId === form.formId || 
                   rawForm.formName === form.title ||
                   rawForm.formName === form.description;
          });
          
          console.log('Final matching result:', matchingRawForm);
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
    console.log('handleView called with form:', form);
    console.log('Form ID:', form.formId || form._key);
    console.log('Child ID form opening:', form.childId);
    console.log('Selected Child ID:', selectedChildId);
    console.log('Form data:', form);
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
    console.log('Raw data for form:', form);
    const recentEditLink = rawData.recentEditLink || form.recentEditLink;
    const recentPdfLink = rawData.recentPdfLink || form.recentPdfLink;
    const filloutFormId = rawData.filloutFormId || form.filloutFormId;
    let studentFormAssignmentId = rawData.studentFormAssignmentId;
    const formId = rawData.formId || form.formId;
    
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
      // For approved forms, use direct PDF link for react-pdf viewer
      if (recentPdfLink && recentPdfLink !== '#' && recentPdfLink.trim() !== '') {
        formUrl = recentPdfLink;
      } else {
        // If no PDF link available, don't allow viewing
        return;
      }
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
        let defaultFormId = rawData.fillout_form_id || 'parent_handbook';
        // Validate the default form ID - if it's invalid test data, use parent_handbook
        const invalidFormIds = ['wed', 'sdexewsa', 'sdceswd'];
        if (invalidFormIds.includes(defaultFormId.toLowerCase())) {
          defaultFormId = 'parent_handbook';
        }
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
    setPageNumber(1);
    setNumPages(null);
    onViewForm(form);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsFrameLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(pageNumber - 1 <= 1 ? 1 : pageNumber - 1);
  };

  const goToNextPage = () => {
    setPageNumber(pageNumber + 1 >= (numPages || 1) ? (numPages || 1) : pageNumber + 1);
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
      let urlCheckInterval: ReturnType<typeof setInterval>;
      
      // Function to start thank you countdown
      const startThankYouCountdown = () => {
        setShowThankYou(true);
        setCountdown(4);
        
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
      <div className="px-2 sm:px-0">
        <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => {
                setSelectedForm(null);
                setIsFrameLoading(false);
                setShowThankYou(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
              }}
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">
                {selectedForm.title}
                {selectedForm.status === 'Approved' && (
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-green-600">(Read-only)</span>
                )}
              </h2>
              {selectedForm.childName && (
                <span className="inline-block mt-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  {selectedForm.childName}
                </span>
              )}
            </div>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-2 sm:p-3 md:p-6">
            <div className="relative">
              {isFrameLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md z-10">
                  <Loading message="Loading form..." size="sm" />
                </div>
              )}
              {selectedForm.viewUrl && selectedForm.viewUrl !== '#' ? (
                selectedForm.status === 'Approved' ? (
                  <div className="flex flex-col">
                    {/* PDF Navigation */}
                    <div className="flex items-center justify-between mb-2 sm:mb-4 p-2 bg-gray-50 rounded-lg">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      <span className="text-xs sm:text-sm font-medium px-2">
                        {pageNumber} / {numPages || '...'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={pageNumber >= (numPages || 1)}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    
                    {/* PDF Viewer */}
                    <div className="flex justify-center overflow-x-auto">
                      <Document
                        file={selectedForm.viewUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<Loading message="Loading PDF..." size="sm" />}
                        error={<div className="text-red-500 text-center p-4">Failed to load PDF</div>}
                      >
                        <Page 
                          pageNumber={pageNumber}
                          width={typeof window !== 'undefined' ? Math.min(800, window.innerWidth - 40) : 800}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          className="shadow-lg"
                        />
                      </Document>
                    </div>
                  </div>
                ) : (
                  <>
                    <style>{`
                      @media (max-width: 640px) {
                        .ndfHFb-c4YZDc-q77wGc,
                        .ndfHFb-c4YZDc-nJjxad-nK2kYb-i5oIFb {
                          display: none !important;
                        }
                      }
                    `}</style>
                    <iframe
                      src={selectedForm.viewUrl}
                      className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] md:min-h-[1000px] border-none rounded-lg transition-opacity duration-300"
                      style={{
                        opacity: isFrameLoading ? 0 : 1
                      }}
                      title={selectedForm.title}
                      onLoad={() => {
                        setIsFrameLoading(false);
                        setTimeout(() => {
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
                  </>
                )
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
    return <div className="px-2 sm:px-0">
        <div className="mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4">
            Forms & Documents
          </h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4 md:p-8 text-center">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 mx-auto text-amber-600 mb-2 sm:mb-3 md:mb-4" />
            <h3 className="font-semibold text-amber-900 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">
              The student is Archived
            </h3>
            <p className="text-xs sm:text-sm text-amber-700">
              Form viewing is disabled for archived students.
            </p>
          </div>
        </div>
      </div>;
  }

  // Forms grid view with tabs
  return <div className="px-2 sm:px-0">
      <div className="mb-3 sm:mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 md:mb-4 gap-2 sm:gap-3 md:gap-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">
            Forms & Documents
          </h2>
          <div className="flex items-center gap-2">
            {onYearFilterChange && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Select value={yearFilter} onValueChange={onYearFilterChange}>
                  <SelectTrigger className="w-28 sm:w-32 md:w-40 text-xs sm:text-sm">
                    <SelectValue placeholder="Filter by year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                      const year = (new Date().getFullYear() - i).toString();
                      return (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            {enrollmentId && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloadingAll || !allForms.some(f => f.status === 'Approved')}
                title={!allForms.some(f => f.status === 'Approved') ? 'No completed forms available to download' : 'Download all approved forms as ZIP'}
                className="group flex items-center gap-1.5 rounded-lg border border-dashed border-amazon-teal/50 bg-white/60 px-3 py-1.5 text-xs font-medium text-amazon-teal shadow-sm transition-all duration-200 hover:border-amazon-teal hover:bg-amazon-teal/5 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amazon-teal/10 transition-colors group-hover:bg-amazon-teal/20">
                  {isDownloadingAll
                    ? <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amazon-teal border-t-transparent" />
                    : <Download className="h-2.5 w-2.5" />}
                </span>
                <span className="hidden sm:inline">{isDownloadingAll ? 'Downloading…' : 'Download All'}</span>
              </button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // If a child tab is clicked, notify parent to update selected child
          if (value !== 'family' && onChildSelect) {
            // Find the child by ID and pass their name to onChildSelect
            const child = childSpecificForms.find(c => c.childId === value);
            if (child) {
              onChildSelect(child.childName);
            }
          }
        }}>
          {(childSpecificForms.length > 1 || familyForms.length > 0) && (
            <div className="mb-2 sm:mb-3 md:mb-4 overflow-x-auto">
              <TabsList className="w-max h-8 sm:h-10">
                {familyForms.length > 0 && (
                  <TabsTrigger value="family" className="text-xs sm:text-sm px-2 sm:px-3">Family Forms</TabsTrigger>
                )}
                {childSpecificForms.length > 1 && childSpecificForms.map((child) => (
                  <TabsTrigger key={child.childId} value={child.childId} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                    <span className="sm:hidden">{child.childName.split(' ')[0]}</span>
                    <span className="hidden sm:inline">{child.childName}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          {childSpecificForms.map((child) => (
            <TabsContent key={child.childId} value={child.childId}>
              {getFormsForTab(child.childId).length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-3 sm:p-4 md:p-6 text-xs sm:text-sm text-muted-foreground">
                  No forms available for {child.childName} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
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
                      assignedAt={form.assignedAt}
                      dueDate={form.dueDate}
                      onView={() => {
                        console.log('Form ID:', form.formId || form._key);
                        console.log('Child ID:', form.childId);
                        console.log('Form data passss:', form);
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