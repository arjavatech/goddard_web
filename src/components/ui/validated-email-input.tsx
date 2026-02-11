import React from 'react';
import { Input } from './input';
import { validateEmail, clearFormError } from '../../lib/emailValidation';

interface ValidatedEmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  errors: Record<string, string>;
  errorKey: string;
  setErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  isDialogClosing?: boolean;
}

export function ValidatedEmailInput({
  value,
  onChange,
  placeholder = "Enter email address",
  label = "Email",
  required = true,
  errors,
  errorKey,
  setErrors,
  isDialogClosing = false
}: ValidatedEmailInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    clearFormError(errors, errorKey, setErrors);
  };

  const handleBlur = () => {
    if (!isDialogClosing) {
      const error = validateEmail(value);
      if (error) {
        setErrors(prev => ({...prev, [errorKey]: error}));
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <Input
        type="email"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={errors[errorKey] ? 'border-red-500' : ''}
      />
      {errors[errorKey] && (
        <p className="text-sm text-red-600 mt-1">{errors[errorKey]}</p>
      )}
    </div>
  );
}