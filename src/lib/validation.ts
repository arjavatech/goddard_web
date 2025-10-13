export type ValidationType = 'name' | 'email' | 'phone' | 'required';

export interface ValidationRule {
  type: ValidationType;
  message: string;
}

export const validateInput = (value: string, rules: ValidationRule[]): string | undefined => {
  for (const rule of rules) {
    switch (rule.type) {
      case 'name':
        if (/\d/.test(value)) {
          return rule.message;
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return rule.message;
        }
        break;
      case 'phone':
        if (!/^\+?[\d\s\-\(\)]+$/.test(value)) {
          return rule.message;
        }
        break;
      case 'required':
        if (!value.trim()) {
          return rule.message;
        }
        break;
    }
  }
  return undefined;
};

export const commonValidationRules = {
  name: [
    { type: 'name' as ValidationType, message: 'Name cannot contain numbers' },
    { type: 'required' as ValidationType, message: 'This field is required' }
  ],
  classroom: [
    { type: 'required' as ValidationType, message: 'This field is required' }
  ],
  email: [
    { type: 'email' as ValidationType, message: 'Please enter a valid email address' },
    { type: 'required' as ValidationType, message: 'Email is required' }
  ],
  phone: [
    { type: 'phone' as ValidationType, message: 'Please enter a valid phone number' },
    { type: 'required' as ValidationType, message: 'Phone number is required' }
  ],
  required: [
    { type: 'required' as ValidationType, message: 'This field is required' }
  ]
};