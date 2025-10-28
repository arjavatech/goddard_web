import { z } from 'zod';
import { httpFetch } from './http';

export interface School {
  id: string;
  name: string;
  location?: string;
}

const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
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