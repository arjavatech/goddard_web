import { validateEmail } from '../../lib/emailValidation';

export const DUPLICATE_RECORD_ERROR = 'This parent-child combination already exists or is duplicated in this file';

export interface CSVRow {
  [key: string]: string;
}

export interface ParentValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export function validateCSVRow(row: CSVRow, _availableClassrooms: { id: string; name: string }[], existingRecordKeys: Set<string>): ParentValidationResult {
  const errors: { [key: string]: string } = {};

  const parentFirstName = row['Parent First Name']?.trim() || '';
  const parentLastName = row['Parent Last Name']?.trim() || '';
  const parentEmail = row['Parent Email']?.trim() || '';

  const secondaryParentFirstName = row['Secondary Parent First Name']?.trim() || '';
  const secondaryParentLastName = row['Secondary Parent Last Name']?.trim() || '';
  const secondaryParentEmail = row['Secondary Parent Email']?.trim() || '';

  const childFirstName = row['Child First Name']?.trim() || '';
  const childLastName = row['Child Last Name']?.trim() || '';
  const childGender = row['Child Gender']?.trim()?.toLowerCase() || '';
  const childClassroomName = row['Classroom']?.trim() || '';
  const childDob = row['Child DOB']?.trim() || '';

  // Primary Parent Validation
  if (!parentFirstName) errors['Parent First Name'] = 'Primary parent first name is required';
  if (!parentLastName) errors['Parent Last Name'] = 'Primary parent last name is required';

  const emailError = validateEmail(parentEmail);
  if (emailError) {
    errors['Parent Email'] = emailError;
  } else {
    // Same parent can have multiple children — only block exact parent+child duplicates
    const recordKey = `${parentEmail.toLowerCase()}|${childFirstName.toLowerCase()}|${childLastName.toLowerCase()}`;
    if (existingRecordKeys.has(recordKey)) {
      errors['Parent Email'] = DUPLICATE_RECORD_ERROR;
    }
  }

  // Secondary Parent Validation
  if (secondaryParentEmail) {
    const secEmailError = validateEmail(secondaryParentEmail);
    if (secEmailError) {
      errors['Secondary Parent Email'] = secEmailError;
    }
    if (!secondaryParentFirstName) errors['Secondary Parent First Name'] = 'First name is required when email is provided';
    if (!secondaryParentLastName) errors['Secondary Parent Last Name'] = 'Last name is required when email is provided';
  }

  // Child Validation
  if (!childFirstName) errors['Child First Name'] = 'Child first name is required';
  if (!childLastName) errors['Child Last Name'] = 'Child last name is required';
  if (childGender && !['male', 'female', 'other'].includes(childGender)) {
    errors['Child Gender'] = 'Child gender must be male, female, or other';
  }

  if (childDob) {
    // Basic date validation for DD-MM-YYYY or YYYY-MM-DD
    const isValidDate = !isNaN(Date.parse(childDob)) || /^(0[1-9]|[12][0-9]|3[01])[-/](0[1-9]|1[012])[-/]\d{4}$/.test(childDob) || /^\d{4}[-/](0[1-9]|1[012])[-/](0[1-9]|[12][0-9]|3[01])$/.test(childDob);
    if (!isValidDate) {
      errors['Child DOB'] = 'Invalid date format (e.g. DD-MM-YYYY)';
    }
  }

  if (!childClassroomName) {
    errors['Classroom'] = 'Classroom is required';
  }

  // Track composite key so subsequent rows can detect true duplicates
  if (!emailError && parentEmail && childFirstName && childLastName) {
    const recordKey = `${parentEmail.toLowerCase()}|${childFirstName.toLowerCase()}|${childLastName.toLowerCase()}`;
    existingRecordKeys.add(recordKey);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
