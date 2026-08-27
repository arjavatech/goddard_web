import { authedFetch, z } from './common';

export type DocumentRequest = { id:string; school_id:string; audience:'student'|'employee'; document_name:string; instructions?:string; due_date?:string; status:string; submitted:number; pending:number; approved:number; rejected:number; total:number };
export type DocumentAssignment = { id:string; request_id:string; school_id:string; audience:'student'|'employee'; document_name:string; instructions?:string; due_date?:string; request_status:string; status:string; derived_status:string; subject_name:string; parent_name?:string; parent_email?:string; classroom_name?:string; employee_email?:string; submitted_at?:string; reviewed_at?:string; rejection_reason?:string; latest_submission_id?:string; latest_file_name?:string; latest_content_type?:string; latest_file_size_bytes?:number; version_count:number };
export type AssignmentPage = { items:DocumentAssignment[]; total:number; page:number; limit:number };
export type DocumentRecipient = { id:string; name:string; email?:string; classroom_name?:string };
export type DocumentReminderResponse = { total_sent:number; total_failed:number; failed_emails:string[]; message:string };

const query = (values:Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
};

export const fetchDocumentRequests = (schoolId:string, audience?:string) => authedFetch({ method:'GET', url:`/document-requests?${query({school_id:schoolId,audience})}` }, z.array(z.any())) as Promise<DocumentRequest[]>;
export const fetchDocumentRecipients = (schoolId:string, audience:'student'|'employee') => authedFetch({ method:'GET', url:`/document-request-recipients?${query({school_id:schoolId,audience})}` }, z.array(z.any())) as Promise<DocumentRecipient[]>;
export const fetchDocumentAssignments = (options:Record<string, string | number | undefined>, review = false) => authedFetch({ method:'GET', url:`/${review ? 'document-assignments/review-queue' : 'document-assignments'}?${query(options)}` }, z.any()) as Promise<AssignmentPage>;
export const createDocumentRequest = (body:unknown) => authedFetch({ method:'POST', url:'/document-requests', body }, z.any()) as Promise<DocumentRequest>;
export const publishDocumentRequest = (id:string) => authedFetch({ method:'POST', url:`/document-requests/${id}/publish` }, z.any()) as Promise<DocumentRequest>;
export const reviewDocument = (id:string, status:'approved'|'rejected', reason?:string) => authedFetch({ method:'POST', url:`/document-assignments/${id}/review`, body:{status, reason} }, z.any()) as Promise<DocumentAssignment>;
export const documentFileUrl = (submissionId:string, download = false) => authedFetch({ method:'GET', url:`/document-submissions/${submissionId}/file?download=${download}` }, z.any()) as Promise<{url:string}>;
export const fetchMyDocumentAssignments = (options:Record<string, string | number | undefined>) => authedFetch({ method:'GET', url:`/my-document-assignments?${query(options)}` }, z.any()) as Promise<AssignmentPage>;
export const documentUploadIntent = (id:string, file:File) => authedFetch({ method:'POST', url:`/document-assignments/${id}/upload-intent`, body:{file_name:file.name,content_type:file.type,file_size_bytes:file.size} }, z.any()) as Promise<{storage_key:string;upload_url:string}>;
export const completeDocumentUpload = (id:string, body:unknown) => authedFetch({ method:'POST', url:`/document-assignments/${id}/complete-upload`, body }, z.any()) as Promise<DocumentAssignment>;
export const sendDocumentReminders = (schoolId:string, assignmentIds:string[]) => authedFetch({ method:'POST', url:'/document-assignments/reminders', body:{school_id:schoolId,assignment_ids:assignmentIds} }, z.any()) as Promise<DocumentReminderResponse>;
export const fetchDocumentHistory = (id:string) => authedFetch({ method:'GET', url:`/document-assignments/${id}/history` }, z.array(z.any())) as Promise<Array<{id:string;event_type:string;actor_name?:string;reason?:string;created_at:string}>>;
