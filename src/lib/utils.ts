import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets today's date in YYYY-MM-DD format for use as HTML date input min/max
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Validates that a date string is not in the past
 * @param dateString - Date in YYYY-MM-DD format
 * @returns { isValid: boolean, error?: string }
 */
export function validateFutureDate(dateString: string): { isValid: boolean; error?: string } {
  if (!dateString) {
    return { isValid: false, error: 'Please select a date' };
  }

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return { isValid: false, error: 'Expected Completion Date cannot be in the past. Please select today or a future date.' };
  }

  return { isValid: true };
}