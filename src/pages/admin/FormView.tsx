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

  // Extract Fillout form ID and parameters from standard URL format or form ID
  const getFilloutConfig = () => {
    const url = filloutFormUrl || formData?.link;
    console.log('DEBUG getFilloutConfig - Starting with url:', url);
    console.log('DEBUG getFilloutConfig - filloutFormUrl:', filloutFormUrl);
    console.log('DEBUG getFilloutConfig - formData?.link:', formData?.link);

    if (!url || url === '#') {
      console.log('DEBUG getFilloutConfig - No valid URL, returning null');
      return null;
    }

    try {
      console.log('DEBUG getFilloutConfig - Processing URL:', url, 'Type:', typeof url);

      // First, check if it's already a valid form ID (not a full URL)
      if (typeof url === 'string' && !url.includes('://')) {
        console.log('DEBUG getFilloutConfig - Detected as form ID (no protocol)');
        const config = {
          formId: url,
          parameters: {}
        };
        console.log('DEBUG getFilloutConfig - Returning form ID config:', config);
        return config;
      }

      console.log('DEBUG getFilloutConfig - Attempting to parse as URL');
      // Try to parse as a URL
      const urlObj = new URL(url);
      console.log('DEBUG getFilloutConfig - Parsed URL object:', {
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        searchParams: Array.from(urlObj.searchParams.entries())
      });

      // Check if this is a Fillout URL
      if (!urlObj.hostname.includes('fillout.com')) {
        console.log('DEBUG getFilloutConfig - Not a fillout.com URL, returning null');
        return null;
      }

      // Extract form ID from URL - handle both standard and subdomain formats
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      console.log('DEBUG getFilloutConfig - Path parts:', pathParts);

      let formId = null;

      // Method 1: Look for standard /t/{formId} pattern
      const tIndex = pathParts.indexOf('t');
      console.log('DEBUG getFilloutConfig - t index:', tIndex);

      if (tIndex !== -1 && pathParts.length > tIndex + 1) {
        formId = pathParts[tIndex + 1];
        console.log('DEBUG getFilloutConfig - Found form ID via /t/ pattern:', formId);
      }

      // Method 2: If no /t/ pattern, check for subdomain format (e.g., goddard.fillout.com/aut_form)
      if (!formId && pathParts.length > 0) {
        // Use the first path segment as form ID for subdomain format
        formId = pathParts[0];
        console.log('DEBUG getFilloutConfig - Found form ID via subdomain format:', formId);
      }

      if (!formId) {
        console.log('DEBUG getFilloutConfig - No form ID found in URL path');
        return null;
      }

      // Extract parameters from URL
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const config = {
        formId: formId,
        parameters: params,
        domain: urlObj.hostname
      };
      console.log('DEBUG getFilloutConfig - Returning URL-based config:', config);
      return config;
    } catch (error) {
      // If URL parsing fails, treat the input as a form ID
      console.log('DEBUG getFilloutConfig - URL parsing failed, treating as form ID:', url);
      console.log('DEBUG getFilloutConfig - Error was:', error);

      if (typeof url === 'string' && url.trim().length > 0) {
        const config = {
          formId: url.trim(),
          parameters: {}
        };
        console.log('DEBUG getFilloutConfig - Returning fallback form ID config:', config);
        return config;
      }
      console.error('Error parsing Fillout URL or form ID:', error);
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

  const config = getFilloutConfig();
  console.log('FormView Debug Info:');
  console.log('- filloutFormUrl:', filloutFormUrl);
  console.log('- formData.link:', formData?.link);
  console.log('- computed config:', config);
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
                const config = getFilloutConfig();


                // Use the original URL directly since it works
                const originalUrl = filloutFormUrl || formData?.link;
                if (originalUrl && originalUrl !== '#') {
                  return (
                    <iframe
                      src={originalUrl}
                      style={{
                        width: '100%',
                        height: '600px',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      title={formData.title}
                      allow="fullscreen"
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