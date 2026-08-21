import { authedFetch, z } from './common';

export type RequestSetting = 'request_categories' | 'location';
export type RequestSettingOption = { id: string; label: string };
export type RequestSettingOperation = {
  operation: 'add' | 'update' | 'delete';
  setting: RequestSetting;
  optionId?: string;
  label?: string;
};

export type RequestSettings = {
  schoolId: string;
  requestCategories: RequestSettingOption[];
  location: RequestSettingOption[];
  csvFields: string[];
};

const optionSchema = z.object({ id: z.string(), label: z.string() });
const requestSettingsSchema = z.object({
  // Production returns camelCase. Keep snake_case support while environments
  // transition to the current response contract.
  schoolId: z.string().optional(),
  school_id: z.string().optional(),
  requestCategories: z.array(optionSchema).optional(),
  request_categories: z.array(optionSchema).optional(),
  location: z.array(optionSchema),
  csvFields: z.array(z.string()).optional(),
  csv_fields: z.array(z.string()).optional(),
}).superRefine((data, context) => {
  if (!data.schoolId && !data.school_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Missing school ID' });
  }
  if (!data.requestCategories && !data.request_categories) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Missing request categories' });
  }
  if (!data.csvFields && !data.csv_fields) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Missing CSV fields' });
  }
}).transform((data): RequestSettings => ({
  schoolId: data.schoolId ?? data.school_id ?? '',
  requestCategories: data.requestCategories ?? data.request_categories ?? [],
  location: data.location,
  csvFields: data.csvFields ?? data.csv_fields ?? [],
}));

export async function fetchRequestSettings(schoolId: string): Promise<RequestSettings> {
  const data = await authedFetch(
    { method: 'GET', url: `/schools/${encodeURIComponent(schoolId)}/request-settings` },
    requestSettingsSchema,
  );
  return data;
}

export async function updateRequestSettings(
  schoolId: string,
  operations: RequestSettingOperation[],
): Promise<RequestSettings> {
  const data = await authedFetch(
    {
      method: 'PATCH',
      url: `/schools/${encodeURIComponent(schoolId)}/request-settings`,
      body: { operations },
    },
    requestSettingsSchema,
  );
  return data;
}
