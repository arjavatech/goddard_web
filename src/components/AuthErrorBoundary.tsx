import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Auth error caught:', error);
    
    // Check if it's an authorization error
    if (
      error.message.includes('session_not_found') ||
      error.message.includes('Invalid JWT') ||
      error.message.includes('AUTHORIZATION_ERROR')
    ) {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h1>
            <p className="text-gray-600 mb-4">Your session has expired. Please log in again.</p>
            <a href="/login" className="inline-block px-4 py-2 bg-amazon-teal text-white rounded-lg hover:bg-amazon-teal/90">
              Go to Login
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
