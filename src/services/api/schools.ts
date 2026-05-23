import { z } from 'zod';
import { httpFetch } from './http';

export interface School {
  id: string;
  name: string;
  subdomain?: string;
  location?: string;
}

const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string().optional(),
  location: z.string().optional()
});

const schoolsResponseSchema = z.array(schoolSchema);

export async function fetchSchools(): Promise<School[]> {
  try {
    const response = await httpFetch<unknown>({
      method: 'GET',
      url: '/schools'
    });
    
    const schools = schoolsResponseSchema.parse(response.data);
    return schools;
  } catch (error) {
    console.error('fetchSchools error:', error);
    return [];
  }
}

export function getSelectedSchool(): School | null {
  const stored = localStorage.getItem('selectedSchool');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function setSelectedSchool(school: School): void {
  localStorage.setItem('selectedSchool', JSON.stringify(school));
}