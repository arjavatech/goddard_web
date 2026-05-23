import { validateFilloutFormIdOrUrl } from './filloutValidation';

export type AddFormErrors = Partial<Record<'formName' | 'formLink' | 'formDueDate', string>>;

type ValidateAddFormInput = {
  formName: string;
  formLink: string;
  formDueDate: string;
};

export function validateAddFormFields(input: ValidateAddFormInput): AddFormErrors {
  const errors: AddFormErrors = {};

  if (!input.formName.trim()) errors.formName = 'Form name is required';

  const linkError = validateFilloutFormIdOrUrl(input.formLink);
  if (linkError) errors.formLink = linkError;

  if (!input.formDueDate) {
    errors.formDueDate = 'Due date is required';
  } else {
    const today = new Date();
    const selectedDate = new Date(input.formDueDate);

    if (Number.isNaN(selectedDate.getTime())) {
      errors.formDueDate = 'Due date is invalid';
    } else {
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        errors.formDueDate = 'Due date must be greater than today';
      }
    }
  }

  return errors;
}

