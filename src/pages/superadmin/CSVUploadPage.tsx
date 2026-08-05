import React from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { CSVUploadPageContent } from '../../components/csv-upload/CSVUploadPageContent';

export function CSVUploadPage() {
  return (
    <SuperAdminLayout>
      <CSVUploadPageContent />
    </SuperAdminLayout>
  );
}
