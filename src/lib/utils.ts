import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractFormAssignmentId(id: unknown): string | null {
  if (typeof id === 'number') return String(id);
  if (typeof id === 'string') {
    if (/^\d+$/.test(id)) return id;
    const match = id.match(/\/(\d+)$/);
    if (match) return match[1];
    return id;
  }
  return null;
}