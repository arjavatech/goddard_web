import React from 'react';
import { AdminLayout } from './AdminLayout';
import { CSVUploadPageContent } from '../../components/csv-upload/CSVUploadPageContent';

export function CSVUploadPage() {
  return (
    <AdminLayout>
      <CSVUploadPageContent />
    </AdminLayout>
  );
}
