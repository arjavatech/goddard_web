import { authedFetch, z } from './common';
import { httpFetch } from './http';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SurveyAudience = 'parents' | 'employees' | 'all_staff' | 'classroom' | 'everyone';
export type SurveyStatus = 'draft' | 'published' | 'closed' | 'expired';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating';

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  audience: SurveyAudience;
  classroom_id: string | null;
  classroom_name: string | null;
  status: SurveyStatus;
  is_anonymous: boolean;
  is_template: boolean;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  created_by_name: string | null;
  total_targeted: number;
  total_responded: number;
  question_count: number;
}

export interface SurveyQuestion {
  id: string;
  question_type: QuestionType;
  question_text: string;
  is_required: boolean;
  options: string[] | null;
  rating_max: number | null;
  sort_order: number;
}

export interface SurveyDetail extends SurveyListItem {
  questions: SurveyQuestion[];
  has_responded: boolean | null;
}

export interface MySurveyItem {
  id: string;
  title: string;
  description: string | null;
  audience: SurveyAudience;
  status: SurveyStatus;
  is_anonymous: boolean;
  expires_at: string | null;
  created_at: string;
  question_count: number;
  has_responded: boolean;
  submitted_at: string | null;
}

export interface ChoiceResult {
  option: string;
  count: number;
  percentage: number;
}

export interface RatingBucket {
  star: number;
  count: number;
  percentage: number;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  total_answered: number;
  choice_results: ChoiceResult[] | null;
  average_rating: number | null;
  rating_distribution: RatingBucket[] | null;
  text_responses: string[] | null;
}

export interface ResponseAnswer {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  value: string | null;
  values: string[] | null;
}

export interface IndividualResponse {
  response_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  submitted_at: string;
  answers: ResponseAnswer[];
}

export interface SurveyReport {
  // survey fields (flattened)
  id: string;
  title: string;
  description: string | null;
  audience: SurveyAudience;
  status: SurveyStatus;
  is_anonymous: boolean;
  total_targeted: number;
  total_responded: number;
  question_count: number;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  // report-specific
  question_results: QuestionResult[];
  individual_responses: IndividualResponse[];
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface QuestionInput {
  question_type: QuestionType;
  question_text: string;
  is_required: boolean;
  options?: string[];
  rating_max?: number;
}

export interface CreateSurveyPayload {
  school_id: string;
  title: string;
  description?: string;
  audience: SurveyAudience;
  classroom_id?: string;
  is_anonymous: boolean;
  is_template: boolean;
  expires_at?: string;
  questions: QuestionInput[];
  status?: 'draft' | 'published';
}

export interface UpdateSurveyPayload {
  id?: string;
  title?: string;
  description?: string;
  audience?: SurveyAudience;
  classroom_id?: string | null;
  is_anonymous?: boolean;
  is_template?: boolean;
  expires_at?: string | null;
  questions?: QuestionInput[];
}

export interface AnswerInput {
  question_id: string;
  value?: string;
  values?: string[];
}

export interface SubmitResponsePayload {
  school_id: string;
  answers: AnswerInput[];
}

export interface AnonymousSubmitPayload {
  answers: AnswerInput[];
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const SurveyListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  audience: z.string(),
  classroom_id: z.string().nullable(),
  classroom_name: z.string().nullable(),
  status: z.string(),
  is_anonymous: z.boolean(),
  is_template: z.boolean(),
  expires_at: z.string().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  created_by_name: z.string().nullable(),
  total_targeted: z.number(),
  total_responded: z.number(),
  question_count: z.number(),
});

const SurveyQuestionSchema = z.object({
  id: z.string(),
  question_type: z.string(),
  question_text: z.string(),
  is_required: z.boolean(),
  options: z.array(z.string()).nullable(),
  rating_max: z.number().nullable(),
  sort_order: z.number(),
});

const SurveyDetailSchema = SurveyListItemSchema.extend({
  questions: z.array(SurveyQuestionSchema),
  has_responded: z.boolean().nullable(),
});

const MySurveyItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  audience: z.string(),
  status: z.string(),
  is_anonymous: z.boolean(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  question_count: z.number(),
  has_responded: z.boolean(),
  submitted_at: z.string().nullable(),
});

const SurveyReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  audience: z.string(),
  status: z.string(),
  is_anonymous: z.boolean(),
  total_targeted: z.number(),
  total_responded: z.number(),
  question_count: z.number(),
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  question_results: z.array(z.object({
    question_id: z.string(),
    question_text: z.string(),
    question_type: z.string(),
    total_answered: z.number(),
    choice_results: z.array(z.object({ option: z.string(), count: z.number(), percentage: z.number() })).nullable(),
    average_rating: z.number().nullable(),
    rating_distribution: z.array(z.object({ star: z.number(), count: z.number(), percentage: z.number() })).nullable(),
    text_responses: z.array(z.string()).nullable(),
  })),
  individual_responses: z.array(z.object({
    response_id: z.string(),
    respondent_name: z.string().nullable(),
    respondent_email: z.string().nullable(),
    submitted_at: z.string(),
    answers: z.array(z.object({
      question_id: z.string(),
      question_text: z.string(),
      question_type: z.string(),
      value: z.string().nullable(),
      values: z.array(z.string()).nullable(),
    })),
  })),
});

// ── Constants ─────────────────────────────────────────────────────────────────

export const AUDIENCE_LABELS: Record<SurveyAudience, string> = {
  parents: 'Parents',
  employees: 'Employees',
  all_staff: 'All Staff',
  classroom: 'Classroom',
  everyone: 'Everyone',
};

// ── Helper ────────────────────────────────────────────────────────────────────

const q = (values: Record<string, string | number | boolean | undefined | null>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
};

// ── API functions ─────────────────────────────────────────────────────────────

/** Admin: get count of targeted users for a given audience selection */
export async function getTargetCount(
  schoolId: string,
  audience: string,
  classroomId?: string,
): Promise<number> {
  const params = new URLSearchParams({ school_id: schoolId, audience });
  if (classroomId) params.set('classroom_id', classroomId);
  const data = await authedFetch(
    { method: 'GET', url: `/surveys/target-count?${params}` },
    z.any(),
  );
  return (data as any)?.count ?? 0;
}

/** Admin: list all surveys for management table */
export const listSurveys = (params: {
  schoolId: string;
  status?: string;
  audience?: string;
}): Promise<SurveyListItem[]> =>
  authedFetch(
    { method: 'GET', url: `/surveys?${q({ school_id: params.schoolId, status: params.status, audience: params.audience })}` },
    z.array(SurveyListItemSchema),
  ) as Promise<SurveyListItem[]>;

/** Admin: create a new survey (draft or published) */
export const createSurvey = (payload: CreateSurveyPayload): Promise<SurveyDetail> =>
  authedFetch({ method: 'POST', url: '/surveys', body: payload }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Admin: list survey templates for the create wizard */
export const listTemplates = (schoolId: string): Promise<SurveyDetail[]> =>
  authedFetch(
    { method: 'GET', url: `/surveys/templates?school_id=${schoolId}` },
    z.array(SurveyDetailSchema),
  ) as Promise<SurveyDetail[]>;

/** Any role: get full survey detail (includes questions + has_responded) */
export const getSurvey = (id: string): Promise<SurveyDetail> =>
  authedFetch({ method: 'GET', url: `/surveys/${id}` }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Admin: update survey fields / questions */
export const updateSurvey = (id: string, payload: UpdateSurveyPayload): Promise<SurveyDetail> =>
  authedFetch({ method: 'PATCH', url: `/surveys/${id}`, body: payload }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Admin: delete survey */
export const deleteSurvey = (id: string): Promise<void> =>
  authedFetch({ method: 'DELETE', url: `/surveys/${id}` }, z.unknown()).then(() => undefined);

/** Admin: publish a draft survey */
export const publishSurvey = (id: string): Promise<SurveyDetail> =>
  authedFetch({ method: 'PATCH', url: `/surveys/${id}/publish` }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Admin: close an active survey */
export const closeSurvey = (id: string): Promise<SurveyDetail> =>
  authedFetch({ method: 'PATCH', url: `/surveys/${id}/close` }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Admin: reopen a closed survey */
export const reopenSurvey = (id: string): Promise<SurveyDetail> =>
  authedFetch({ method: 'PATCH', url: `/surveys/${id}/reopen` }, SurveyDetailSchema) as Promise<SurveyDetail>;

/** Public: fetch an anonymous survey without auth */
export const getPublicSurvey = async (id: string): Promise<SurveyDetail> => {
  const res = await httpFetch<unknown>({ method: 'GET', url: `/surveys/${id}/public` }, {});
  return SurveyDetailSchema.parse(res.data) as SurveyDetail;
};

/** Admin: get aggregated report for a survey */
export const getSurveyReport = (id: string): Promise<SurveyReport> =>
  authedFetch({ method: 'GET', url: `/surveys/${id}/report` }, SurveyReportSchema) as Promise<SurveyReport>;

/** Any role: list surveys the current user should respond to */
export const listMySurveys = (params: { schoolId: string }): Promise<MySurveyItem[]> =>
  authedFetch(
    { method: 'GET', url: `/my-surveys?${q({ school_id: params.schoolId })}` },
    z.array(MySurveyItemSchema),
  ) as Promise<MySurveyItem[]>;

/** Authenticated: submit a response to a survey */
export const submitSurveyResponse = (id: string, payload: SubmitResponsePayload): Promise<void> =>
  authedFetch({ method: 'POST', url: `/surveys/${id}/responses`, body: payload }, z.unknown()).then(() => undefined);

/** Public (no auth): submit a response to an anonymous survey */
export const submitAnonymousResponse = async (id: string, payload: AnonymousSubmitPayload): Promise<void> => {
  await httpFetch<unknown>({ method: 'POST', url: `/surveys/${id}/responses/public`, body: payload }, {});
};
