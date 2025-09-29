import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Calendar, User, School, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Loading } from '../../components/ui/loading';

export function FormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFrameLoading, setIsFrameLoading] = useState(true);

  // Get the form data and navigation state from the location state
  const formData = location.state?.form;
  const childName = location.state?.childName;
  const classDetails = location.state?.classDetails || 'Unassigned Class';
  const returnPath = location.state?.returnPath || '/admin/parents';
  const filloutFormUrl = location.state?.filloutFormUrl;
  const recentEditLink = location.state?.recentEditLink;
  const filloutFormId = location.state?.filloutFormId;

  // Determine which URL to use based on form status
  const getFormUrl = () => {
    console.log('=== getFormUrl Debug ===');
    console.log('recentEditLink:', recentEditLink);
    console.log('recentEditLink type:', typeof recentEditLink);
    console.log('recentEditLink === null:', recentEditLink === null);
    console.log('recentEditLink === undefined:', recentEditLink === undefined);
    console.log('recentEditLink === "#":', recentEditLink === '#');
    console.log('Boolean(recentEditLink):', Boolean(recentEditLink));
    console.log('filloutFormId:', filloutFormId);
    console.log('filloutFormUrl:', filloutFormUrl);
    console.log('formData?.link:', formData?.link);

    // Priority 1: Use recent_edit_link if form is filled (has existing submission)
    // Check for truthy value and not '#' and not null and not undefined
    if (recentEditLink &&
        recentEditLink !== '#' &&
        recentEditLink !== null &&
        recentEditLink !== undefined &&
        recentEditLink.trim() !== '') {
      console.log('✅ Using recent_edit_link for filled form:', recentEditLink);
      return recentEditLink;
    } else {
      console.log('❌ recent_edit_link not valid, reason:');
      if (!recentEditLink) console.log('  - recentEditLink is falsy');
      if (recentEditLink === '#') console.log('  - recentEditLink is "#"');
      if (recentEditLink === null) console.log('  - recentEditLink is null');
      if (recentEditLink === undefined) console.log('  - recentEditLink is undefined');
      if (recentEditLink && recentEditLink.trim() === '') console.log('  - recentEditLink is empty string');
    }

    // Priority 2: Use fillout_form_id if form is empty (no existing submission)
    if (filloutFormId &&
        filloutFormId !== '#' &&
        filloutFormId !== null &&
        filloutFormId !== undefined &&
        filloutFormId.trim() !== '') {
      console.log('✅ Using fillout_form_id for empty form:', filloutFormId);
      return filloutFormId;
    }

    // Fallback: Use the original filloutFormUrl or form link
    const fallbackUrl = filloutFormUrl || formData?.link;
    console.log('✅ Using fallback URL:', fallbackUrl);
    return fallbackUrl;
  };

  // Handle back button click
  const handleBack = () => {
    navigate(returnPath);
  };
  if (!formData) {
    return <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack} size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Form Not Found</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p>
                  The form information could not be found. Please go back and
                  try again.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>;
  }

  console.log('🔍 FormView - Full location.state:', location.state);
  console.log('🔍 FormView - Individual state values:');
  console.log('  - location.state?.recentEditLink:', location.state?.recentEditLink);
  console.log('  - location.state?.filloutFormId:', location.state?.filloutFormId);
  console.log('  - location.state?.filloutFormUrl:', location.state?.filloutFormUrl);

  const selectedUrl = getFormUrl();
  console.log('FormView Debug Info:');
  console.log('- recentEditLink:', recentEditLink);
  console.log('- filloutFormId:', filloutFormId);
  console.log('- filloutFormUrl:', filloutFormUrl);
  console.log('- formData.link:', formData?.link);
  console.log('- selected URL:', selectedUrl);
  console.log('- Form Data:', formData);
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack} size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center">
              {childName && <div className="flex items-center text-gray-600 mr-4">
                  <User className="h-4 w-4 mr-2" />
                  <span>{childName}</span>
                  <span className="mx-1">•</span>
                  <School className="h-4 w-4 mx-1" />
                  <span>{classDetails}</span>
                </div>}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              Last updated: {formData.lastUpdated}
            </div>
            <div className="mt-1">
              <StatusBadge status={formData.status} />
            </div>
          </div>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{formData.title}</h2>
            </div>
            {/* Form container with dynamic height */}
            <div className="mt-6 rounded-md">
              {(() => {
                if (selectedUrl && selectedUrl !== '#') {
                  return (
                    <div className="relative">
                      {isFrameLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md">
                          <Loading message="Loading form..." size="md" />
                        </div>
                      )}
                      <iframe
                        src={selectedUrl}
                        style={{
                          width: '100%',
                          height: '600px',
                          border: 'none',
                          borderRadius: '8px',
                          opacity: isFrameLoading ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                        title={formData.title}
                        allow="fullscreen"
                        onLoad={() => setIsFrameLoading(false)}
                      />
                    </div>
                  );
                }

                // No valid form URL
                return (
                  <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                    Unable to load form. Please check the form configuration.
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
}