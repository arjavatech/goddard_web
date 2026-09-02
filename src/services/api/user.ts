import { authedFetch, z } from './common';

export type SchoolRequestSettingOption = { id: string; label: string };

export type SchoolFeatures = {
  parentManagementEnabled: boolean;
  employeeManagementEnabled: boolean;
  expenseManagementEnabled: boolean;
  taptimeEnabled: boolean;
};

export type SchoolData = {
  id?: string;
  name?: string;
  subdomain?: string;
  timezone?: string;
  settings?: {
    contact_no?: string;
    mail?: string;
    address?: string;
    timezone?: string;
    enrollment_capacity?: number;
    age_groups?: string[];
  };
  requestCategories?: SchoolRequestSettingOption[];
  location?: SchoolRequestSettingOption[];
  features: SchoolFeatures;
};

export type UserContext = {
  role: string;
  schoolId: string | null;
  parentId: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  taptimeEmployeeId?: string | null;
  taptimePin?: string | null;
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
  timezone: z.string().optional(),
  settings: schoolSettingsSchema.optional(),
  request_categories: z.array(z.object({ id: z.string(), label: z.string() })).nullable().optional(),
  location: z.array(z.object({ id: z.string(), label: z.string() })).nullable().optional(),
  parent_management_enabled: z.boolean().optional(),
  employee_management_enabled: z.boolean().optional(),
  expense_management_enabled: z.boolean().optional(),
  taptime_enabled: z.boolean().optional(),
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
  phone: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  taptime_employee_id: z.string().nullable().optional(),
  taptimeEmployeeId: z.string().nullable().optional(),
  taptime_pin: z.string().nullable().optional(),
  taptimePin: z.string().nullable().optional(),
  school_data: schoolDataSchema.nullable().optional(),
}).passthrough();

let inFlightUserContextRequest: Promise<UserContext> | null = null;

export async function fetchUserContext(): Promise<UserContext> {
  if (inFlightUserContextRequest) return inFlightUserContextRequest;

  const request = (async () => {
    const data = await authedFetch({
      method: 'GET',
      url: '/users/me',
      // Profile data is session-specific; never reuse an HTTP cache entry from
      // a previous login.
      cache: 'no-store'
    }, userContextSchema);

    localStorage.setItem('schoolId', data.school_id || data.schoolId || '');

    const result: UserContext = {
      role: data.role,
      schoolId: data.school_id || data.schoolId || null,
      parentId: data.parent_id || data.parentId || data.user_id || data.userId || null,
      email: data.email,
      firstName: data.first_name || data.firstName,
      lastName: data.last_name || data.lastName,
      phone: data.phone || data.phone_number,
      address: data.address,
      taptimeEmployeeId: data.taptime_employee_id ?? data.taptimeEmployeeId ?? null,
      taptimePin: data.taptime_pin ?? data.taptimePin ?? null,
      schoolData: data.school_data ? {
        ...data.school_data,
        requestCategories: data.school_data.request_categories ?? [],
      location: data.school_data.location ?? [],
        features: {
          parentManagementEnabled: data.school_data.parent_management_enabled ?? false,
          employeeManagementEnabled: data.school_data.employee_management_enabled ?? false,
          expenseManagementEnabled: data.school_data.expense_management_enabled ?? false,
          taptimeEnabled: data.school_data.taptime_enabled ?? false,
        },
      } : null,
    };

    if (!result.parentId && data.email) {
      result.parentId = data.email;
    }

    return result;
  })();

  inFlightUserContextRequest = request;
  try {
    return await request;
  } finally {
    if (inFlightUserContextRequest === request) {
      inFlightUserContextRequest = null;
    }
  }
}

export async function mirrorOwnTapTimePin(pin: string): Promise<void> {
  await authedFetch({
    method: 'PATCH',
    url: '/taptime/me/pin',
    // httpFetch serializes request bodies. Passing a JSON string here would
    // serialize it a second time and make Axum receive a string, not an object.
    body: { pin },
  }, z.object({ status: z.literal('updated') }));
}
