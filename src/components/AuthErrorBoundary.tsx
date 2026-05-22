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
    // Redirect to login immediately on any error
    window.location.href = '/login';
  }

  render() {
    if (this.state.hasError) {
      // Redirect to login immediately
      window.location.href = '/login';
      return null;
    }

    return this.props.children;
  }
}
