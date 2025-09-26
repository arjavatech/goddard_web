import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
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
  const returnPath = location.state?.returnPath || '/admin/parents';
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
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{formData.title}</h1>
          <StatusBadge status={formData.status} />
        </div>
        {childName && <div className="flex items-center mb-4 text-gray-600">
            <FileText className="h-4 w-4 mr-2" />
            <span>Form for: {childName}</span>
          </div>}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">{formData.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {formData.lastUpdated}
              </p>
            </div>
            {/* Form container with fixed height */}
            <div className="mt-6 h-[800px] border rounded-md overflow-hidden">
              {formData.link && formData.link !== '#' ? <iframe src={formData.link} title={formData.title} className="w-full h-full border-0" style={{
              width: '100%',
              height: '100%'
            }} /> : <div className="flex items-center justify-center h-full text-gray-500">
                  Form URL not available
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
}