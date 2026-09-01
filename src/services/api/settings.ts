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

export type TapTimeSchoolSettings = {
  defaultReportType: string | null;
  employmentTypes: string[];
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

const tapTimeSettingsSchema = z.object({
  default_report_type: z.string().nullable().optional(),
  defaultReportType: z.string().nullable().optional(),
  employment_types: z.array(z.string()).optional(),
  employmentTypes: z.array(z.string()).optional(),
}).transform((data): TapTimeSchoolSettings => ({
  defaultReportType: data.default_report_type ?? data.defaultReportType ?? null,
  employmentTypes: data.employment_types ?? data.employmentTypes ?? [],
}));

export async function fetchTapTimeSchoolSettings(schoolId: string): Promise<TapTimeSchoolSettings> {
  return authedFetch(
    { method: 'GET', url: `/taptime/settings?school_id=${encodeURIComponent(schoolId)}` },
    tapTimeSettingsSchema,
  );
}

export async function updateTapTimeSchoolSettings(schoolId: string, defaultReportType: string): Promise<TapTimeSchoolSettings> {
  return authedFetch(
    { method: 'PATCH', url: `/taptime/settings?school_id=${encodeURIComponent(schoolId)}`, body: { default_report_type: defaultReportType } },
    tapTimeSettingsSchema,
  );
}
