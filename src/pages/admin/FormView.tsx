import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilloutStandardEmbed } from '@fillout/react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Calendar, User, School, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
export function FormView() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get the form data and navigation state from the location state
  const formData = location.state?.form;
  const childName = location.state?.childName;
  const classDetails = location.state?.classDetails || 'Unassigned Class';
  const returnPath = location.state?.returnPath || '/admin/parents';
  const filloutFormUrl = location.state?.filloutFormUrl;

  // Extract Fillout form ID and parameters from standard URL format
  const getFilloutConfig = () => {
    const url = filloutFormUrl || formData?.link;
    if (!url || url === '#') return null;

    try {
      const urlObj = new URL(url);

      // Check if this is a Fillout URL
      if (!urlObj.hostname.includes('fillout.com')) {
        return null;
      }

      // Extract form ID from standard /t/{formId} format only
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      let formId = null;
      // Look for /t/{formId} pattern
      const tIndex = pathParts.indexOf('t');
      if (tIndex !== -1 && pathParts.length > tIndex + 1) {
        formId = pathParts[tIndex + 1];
      }

      if (!formId) {
        return null;
      }

      // Extract parameters from URL
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return {
        formId: formId,
        parameters: params
      };
    } catch (error) {
      console.error('Error parsing Fillout URL:', error);
      return null;
    }
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
                const config = getFilloutConfig();


                // Use FilloutStandardEmbed with standard format
                if (config?.formId) {
                  return (
                    <FilloutStandardEmbed
                      filloutId={config.formId}
                      parameters={config.parameters}
                      dynamicResize
                      style={{ minHeight: '600px', width: '100%' }}
                      inheritParameters={false}
                    />
                  );
                }

                // No valid form configuration
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