export const validateEmail = (email: string): string => {
  if (!email.trim()) return 'Email is required';
  if (email.includes('+')) return 'Email addresses with "+" symbols are not allowed';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return '';
};

export const validateRequiredField = (value: string, fieldName: string): string => {
  return !value.trim() ? `${fieldName} is required` : '';
};

export const clearFormError = (
  errors: Record<string, string>, 
  field: string, 
  setErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void
) => {
  if (errors[field]) {
    setErrors(prev => ({...prev, [field]: ''}));
  }
};