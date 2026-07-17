import { authedFetch, z } from './common';

export type SchoolData = {
  id?: string;
  name?: string;
  subdomain?: string;
  settings?: {
    contact_no?: string;
    mail?: string;
    address?: string;
    timezone?: string;
    enrollment_capacity?: number;
    age_groups?: string[];
  };
};

export type UserContext = {
  role: string;
  schoolId: string | null;
  parentId: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  schoolData?: SchoolData | null;
};

const schoolSettingsSchema = z.object({
  contact_no: z.string().optional(),
  mail: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  enrollment_capacity: z.number().optional(),
  age_groups: z.array(z.string()).optional(),
}).passthrough();

const schoolDataSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  subdomain: z.string().optional(),
  settings: schoolSettingsSchema.optional(),
}).passthrough();

const userContextSchema = z.object({
  role: z.string(),
  school_id: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  user_id: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  first_name: z.string().optional(),
  firstName: z.string().optional(),
  last_name: z.string().optional(),
  lastName: z.string().optional(),
  school_data: schoolDataSchema.nullable().optional(),
}).passthrough();

export async function fetchUserContext(): Promise<UserContext> {
  const data = await authedFetch({
    method: 'GET',
    url: '/users/me'
  }, userContextSchema);

  localStorage.setItem('schoolId', data.school_id || data.schoolId || '');

  const result: UserContext = {
    role: data.role,
    schoolId: data.school_id || data.schoolId || null,
    parentId: data.parent_id || data.parentId || data.user_id || data.userId || null,
    email: data.email,
    firstName: data.first_name || data.firstName,
    lastName: data.last_name || data.lastName,
    schoolData: data.school_data || null,
  };

  if (!result.parentId && data.email) {
    result.parentId = data.email;
  }

  return result;
}