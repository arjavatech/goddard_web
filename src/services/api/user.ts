import { authedFetch, z } from './common';

export type UserContext = {
  role: string;
  schoolId: string | null;
  parentId: string | null;
};

const userContextSchema = z.object({
  role: z.string(),
  school_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional()
});

export async function fetchUserContext(): Promise<UserContext> {
  const data = await authedFetch({
    method: 'GET',
    url: '/users/me'
  }, userContextSchema);

  return {
    role: data.role,
    schoolId: data.school_id ?? null,
    parentId: data.parent_id ?? null
  };
}
