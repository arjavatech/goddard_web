import React, { ReactNode } from 'react';
import { Loading } from './loading';

interface ApiLoaderProps {
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
}

export function ApiLoader({ 
  loading, 
  error, 
  children, 
  loadingMessage = 'Loading...', 
  errorMessage = 'Something went wrong. Please try again.' 
}: ApiLoaderProps) {
  if (loading) {
    return <Loading message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">{errorMessage}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}