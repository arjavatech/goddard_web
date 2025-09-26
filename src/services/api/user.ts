import { authedFetch, z } from './common';
export type UserContext = {
  role: string;
  schoolId: string | null;
  parentId: string | null;
};
const userContextSchema = z.object({
  role: z.string(),
  school_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  user_id: z.string().optional(),
  email: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional()
}).passthrough(); // Allow additional fields
export async function fetchUserContext(): Promise<UserContext> {
  console.log('Fetching user context from /users/me');
  const data = await authedFetch({
    method: 'GET',
    url: '/users/me'
  }, userContextSchema);
  console.log('Raw user context data:', data);
  const result = {
    role: data.role,
    schoolId: data.school_id ?? null,
    parentId: data.parent_id ?? null
  };
  console.log('Processed user context:', result);
  return result;
}