import { useState } from 'react';

interface AlertModalState {
  open: boolean;
  type: 'success' | 'error';
  title?: string;
  message: string;
}

export function useAlertModal() {
  const [alertState, setAlertState] = useState<AlertModalState>({
    open: false,
    type: 'error',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error', message: string, title?: string) => {
    setAlertState({
      open: true,
      type,
      title,
      message
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, open: false }));
  };

  return {
    alertState,
    showAlert,
    hideAlert
  };
}