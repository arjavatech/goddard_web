import React, { useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { ArrowLeft, FileText, Calendar, User, School } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
export function FormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    formId
  } = useParams();
  // Get the form data and navigation state from the location state
  const formData = location.state?.form;
  const childId = location.state?.childId;
  const childName = location.state?.childName;
  const parentId = location.state?.parentId;
  const parentName = location.state?.parentName || 'Parent';
  const classDetails = location.state?.classDetails || 'Unassigned Class';
  const returnPath = location.state?.returnPath || '/admin/parents';
  // Extract the formId from the URL if present
  const filloutFormId = useMemo(() => {
    if (!formData?.link || formData.link === '#') return null;
    try {
      // Try to extract formId from URL patterns like:
      // https://fillout.com/fill/formId
      // https://app.fillout.com/t/formId
      const url = new URL(formData.link);
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1] || null;
    } catch (e) {
      console.error('Failed to parse form URL:', e);
      return null;
    }
  }, [formData?.link]);
  // Handle back button click
  const handleBack = () => {
    navigate(returnPath);
  };
  if (!formData) {
    return <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
            {/* Form container with full height */}
            <div className="mt-6 h-[800px] rounded-md overflow-hidden">
              {formData.link && formData.link !== '#' ?
            // Use iframe approach for all forms
            <iframe src={formData.link} title={formData.title} className="w-full h-full border-0" /> : <div className="flex items-center justify-center h-full text-gray-500">
                  Form URL not available
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
}