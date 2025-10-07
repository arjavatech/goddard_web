import React, { useState } from 'react';
import { Input } from './input';
import { validateInput, ValidationRule } from '../../lib/validation';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  validationRules?: ValidationRule[];
  onValidationChange?: (error: string | undefined) => void;
  showToast?: (message: string) => void;
  hideToast?: () => void;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ validationRules = [], onValidationChange, showToast, hideToast, onChange, className = '', ...props }, ref) => {
    const [error, setError] = useState<string>();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Prevent invalid input for name fields
      if (validationRules.some(rule => rule.type === 'name') && /\d/.test(value)) {
        if (showToast) {
          showToast('Name cannot contain numbers');
        }
        return; // Don't update the input
      }
      
      const validationError = validateInput(value, validationRules);
      setError(validationError);
      onValidationChange?.(validationError);
      
      if (validationError && showToast && !validationRules.some(rule => rule.type === 'name')) {
        showToast(validationError);
      } else if (!validationError && hideToast) {
        hideToast();
      }
      
      onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        {...props}
        onChange={handleChange}
        className={`${className} ${error ? 'border-red-500' : ''}`}
      />
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';