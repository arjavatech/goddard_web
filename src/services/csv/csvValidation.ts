import { validateEmail } from '../../lib/emailValidation';

export interface CSVRow {
  [key: string]: string;
}

export interface ParentValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export function validateCSVRow(row: CSVRow, availableClassrooms: { id: string; name: string }[], existingEmails: Set<string>, existingPhones: Set<string>): ParentValidationResult {
  const errors: { [key: string]: string } = {};

  const parentFirstName = row['Parent First Name']?.trim() || '';
  const parentLastName = row['Parent Last Name']?.trim() || '';
  const parentEmail = row['Parent Email']?.trim() || '';
  const parentPhoneNumber = row['Parent Phone Number']?.trim() || '';
  
  const secondaryParentFirstName = row['Secondary Parent First Name']?.trim() || '';
  const secondaryParentLastName = row['Secondary Parent Last Name']?.trim() || '';
  const secondaryParentEmail = row['Secondary Parent Email']?.trim() || '';
  const secondaryParentPhoneNumber = row['Secondary Parent Phone Number']?.trim() || '';
  
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
  } else if (existingEmails.has(parentEmail.toLowerCase())) {
    errors['Parent Email'] = 'Email already exists or is duplicated in this file';
  }

  if (parentPhoneNumber && existingPhones.has(parentPhoneNumber)) {
    errors['Parent Phone Number'] = 'Phone number already exists or is duplicated in this file';
  }

  // Secondary Parent Validation
  if (secondaryParentEmail) {
    const secEmailError = validateEmail(secondaryParentEmail);
    if (secEmailError) {
      errors['Secondary Parent Email'] = secEmailError;
    } else if (existingEmails.has(secondaryParentEmail.toLowerCase())) {
      errors['Secondary Parent Email'] = 'Email already exists or is duplicated in this file';
    }
    
    if (!secondaryParentFirstName) errors['Secondary Parent First Name'] = 'First name is required when email is provided';
    if (!secondaryParentLastName) errors['Secondary Parent Last Name'] = 'Last name is required when email is provided';
  }

  if (secondaryParentPhoneNumber && existingPhones.has(secondaryParentPhoneNumber)) {
    errors['Secondary Parent Phone Number'] = 'Phone number already exists or is duplicated in this file';
  }

  // Child Validation
  if (!childFirstName) errors['Child First Name'] = 'Child first name is required';
  if (!childLastName) errors['Child Last Name'] = 'Child last name is required';
  if (!['male', 'female'].includes(childGender)) errors['Child Gender'] = 'Child gender is required (male/female)';
  
  if (childDob) {
    // Basic date validation for DD-MM-YYYY or YYYY-MM-DD
    const isValidDate = !isNaN(Date.parse(childDob)) || /^(0[1-9]|[12][0-9]|3[01])[-/](0[1-9]|1[012])[-/]\d{4}$/.test(childDob) || /^\d{4}[-/](0[1-9]|1[012])[-/](0[1-9]|[12][0-9]|3[01])$/.test(childDob);
    if (!isValidDate) {
      errors['Child DOB'] = 'Invalid date format (e.g. DD-MM-YYYY)';
    }
  }

  if (!childClassroomName) {
    errors['Classroom'] = 'Classroom is required';
  } else {
    const classroomMatch = availableClassrooms.find(c => c.name.toLowerCase() === childClassroomName.toLowerCase());
    if (!classroomMatch) {
      errors['Classroom'] = `Classroom "${childClassroomName}" does not exist`;
    }
  }

  // Add current row emails and phones to Sets for duplicate detection across subsequent rows
  if (!emailError && parentEmail) existingEmails.add(parentEmail.toLowerCase());
  if (parentPhoneNumber) existingPhones.add(parentPhoneNumber);
  if (!errors['Secondary Parent Email'] && secondaryParentEmail) existingEmails.add(secondaryParentEmail.toLowerCase());
  if (secondaryParentPhoneNumber) existingPhones.add(secondaryParentPhoneNumber);

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
