import { authedFetch, z } from './common';
export type UserContext = {
  role: string;
  schoolId: string | null;
  parentId: string | null;
  firstName?: string;
  lastName?: string;
};
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
  lastName: z.string().optional()
}).passthrough(); // Allow additional fields
export async function fetchUserContext(): Promise<UserContext> {
  console.log('Fetching user context from /users/me');
  const data = await authedFetch({
    method: 'GET',
    url: '/users/me'
  }, userContextSchema);
  console.log('Raw user context data:', JSON.stringify(data, null, 2));
  const result = {
    role: data.role,
    schoolId: data.school_id || data.schoolId || null,
    parentId: data.parent_id || data.parentId || data.user_id || data.userId || null,
    firstName: data.first_name || data.firstName,
    lastName: data.last_name || data.lastName
  };
  console.log('Processed user context:', result);

  // If we don't have a parentId but have an email, use email as identifier
  if (!result.parentId && data.email) {
    console.log('Using email as parent identifier:', data.email);
    result.parentId = data.email;
  }

  return result;
}