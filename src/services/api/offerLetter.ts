import { authedFetch, z } from './common';

export type OfferLetterField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  filloutParam: string;
  required?: boolean;
};

export type OfferLetterStatus =
  | 'draft'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'active'
  | 'rejected';

export type OfferLetter = {
  id: string;
  schoolId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  salary?: number;
  salaryCurrency?: string;
  joiningDate?: string;
  additionalNotes?: string;
  customFields?: Record<string, string>;
  filloutFormId?: string;
  prefillUrl?: string;
  filloutSubmissionId?: string;
  filloutEditLink?: string;
  filloutPdfLink?: string;
  status: OfferLetterStatus;
  sentAt?: string;
  employeeRespondedAt?: string;
  employeeRejectionReason?: string;
  adminReviewedAt?: string;
  adminRejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOfferLetterRequest = {
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  salary?: number;
  salaryCurrency?: string;
  joiningDate?: string;
  additionalNotes?: string;
  customFields?: Record<string, string>;
};

export type UpdateOfferLetterRequest = Partial<Omit<CreateOfferLetterRequest, 'schoolId'>>;

export type AdminReviewRequest = {
  approved: boolean;
  rejectionReason?: string;
};

function mapOfferLetter(raw: any): OfferLetter {
  return {
    id: raw.id ?? '',
    schoolId: raw.school_id ?? '',
    employeeId: raw.employee_id ?? '',
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? undefined,
    role: raw.role ?? '',
    salary: raw.salary ?? undefined,
    salaryCurrency: raw.salary_currency ?? undefined,
    joiningDate: raw.joining_date ?? undefined,
    additionalNotes: raw.additional_notes ?? undefined,
    customFields: raw.custom_fields ?? undefined,
    filloutFormId: raw.fillout_form_id ?? undefined,
    prefillUrl: raw.prefill_url ?? undefined,
    filloutSubmissionId: raw.fillout_submission_id ?? undefined,
    filloutEditLink: raw.fillout_edit_link ?? undefined,
    filloutPdfLink: raw.fillout_pdf_link ?? undefined,
    status: raw.status ?? 'draft',
    sentAt: raw.sent_at ?? undefined,
    employeeRespondedAt: raw.employee_responded_at ?? undefined,
    employeeRejectionReason: raw.employee_rejection_reason ?? undefined,
    adminReviewedAt: raw.admin_reviewed_at ?? undefined,
    adminRejectionReason: raw.admin_rejection_reason ?? undefined,
    createdAt: raw.created_at ?? undefined,
    updatedAt: raw.updated_at ?? undefined,
  };
}

export const OfferLetterService = {
  async createOfferLetter(employeeId: string, req: CreateOfferLetterRequest): Promise<OfferLetter> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: `/employees/${employeeId}/offer-letter`,
        body: {
          school_id: req.schoolId,
          first_name: req.firstName,
          last_name: req.lastName,
          email: req.email,
          phone: req.phone,
          role: req.role,
          salary: req.salary,
          salary_currency: req.salaryCurrency,
          joining_date: req.joiningDate,
          additional_notes: req.additionalNotes,
          custom_fields: req.customFields && Object.keys(req.customFields).length > 0 ? req.customFields : undefined,
        },
      },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async updateOfferLetter(employeeId: string, schoolId: string, req: UpdateOfferLetterRequest): Promise<OfferLetter> {
    const data = await authedFetch(
      {
        method: 'PATCH',
        url: `/employees/${employeeId}/offer-letter?school_id=${schoolId}`,
        body: {
          first_name: req.firstName,
          last_name: req.lastName,
          phone: req.phone,
          role: req.role,
          salary: req.salary,
          salary_currency: req.salaryCurrency,
          joining_date: req.joiningDate,
          additional_notes: req.additionalNotes,
          custom_fields: req.customFields && Object.keys(req.customFields).length > 0 ? req.customFields : undefined,
        },
      },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async getOfferLetter(employeeId: string, schoolId: string): Promise<OfferLetter> {
    const data = await authedFetch(
      { method: 'GET', url: `/employees/${employeeId}/offer-letter?school_id=${schoolId}` },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async sendOfferLetter(employeeId: string, schoolId: string): Promise<OfferLetter> {
    const data = await authedFetch(
      { method: 'POST', url: `/employees/${employeeId}/offer-letter/send?school_id=${schoolId}` },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async resendOfferLetter(employeeId: string, schoolId: string): Promise<OfferLetter> {
    const data = await authedFetch(
      { method: 'POST', url: `/employees/${employeeId}/offer-letter/resend?school_id=${schoolId}` },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async adminReviewOffer(employeeId: string, schoolId: string, req: AdminReviewRequest): Promise<OfferLetter> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: `/employees/${employeeId}/offer-letter/review?school_id=${schoolId}`,
        body: { approved: req.approved, rejection_reason: req.rejectionReason },
      },
      z.any(),
    );
    return mapOfferLetter(data);
  },

  async listOfferLetters(schoolId: string): Promise<OfferLetter[]> {
    const data = await authedFetch(
      { method: 'GET', url: `/offer-letters?school_id=${schoolId}` },
      z.array(z.any()),
    );
    return data.map(mapOfferLetter);
  },

  async updateOfferLetterConfig(schoolId: string, filloutFormId?: string, offerLetterFields?: OfferLetterField[]): Promise<void> {
    await authedFetch(
      {
        method: 'PATCH',
        url: `/schools/${schoolId}/offer-letter-config`,
        body: {
          fillout_form_id: filloutFormId ?? null,
          offer_letter_fields: offerLetterFields ?? null,
        },
      },
      z.any(),
    );
  },
};
