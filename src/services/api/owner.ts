import { authedFetch, z } from './common';

export type OwnerUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_verified: boolean;
  school_id: string;
  phone_number?: string | null;
};

export type SuperAdminInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
};

export async function fetchOwners(schoolId: string): Promise<{ owners: OwnerUser[]; superAdmin: SuperAdminInfo | null }> {
  const data = await authedFetch({
    method: 'GET',
    url: `/owners?school_id=${encodeURIComponent(schoolId)}`
  }, z.object({
    success: z.boolean(),
    count: z.number(),
    data: z.array(z.object({
      id: z.string(),
      email: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      role: z.string(),
      is_verified: z.boolean(),
      school_id: z.string(),
      phone_number: z.string().nullable().optional()
    })),
    super_admin: z.object({
      id: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      phone_number: z.string().nullable().optional()
    }).nullable().optional()
  }));
  return {
    owners: data.data,
    superAdmin: data.super_admin ?? null,
  };
}

export async function inviteOwner(
  email: string,
  firstName: string,
  lastName: string,
  schoolId: string,
  phoneNumber?: string
): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/owners/invite',
    body: {
      email,
      school_id: schoolId,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber || null
    }
  }, z.object({}).passthrough());
}

export async function updateOwner(
  userId: string,
  firstName: string,
  lastName: string,
  phoneNumber?: string
): Promise<void> {
  await authedFetch({
    method: 'PUT',
    url: `/owners/${encodeURIComponent(userId)}`,
    body: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber || null
    }
  }, z.object({}).passthrough());
}

export async function deleteOwner(userId: string): Promise<void> {
  await authedFetch({
    method: 'DELETE',
    url: `/owners/${encodeURIComponent(userId)}`
  }, z.object({}).passthrough());
}

export async function resendOwnerInvite(userId: string): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/owners/resend-invite',
    body: { user_id: userId }
  }, z.any());
}
