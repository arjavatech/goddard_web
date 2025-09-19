export type NormalizedFormStatus = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';

const COMPLETION_TERMS = new Set(['approved', 'complete', 'completed', 'accepted']);
const SUBMITTED_TERMS = new Set(['submitted', 'received']);
const NEEDS_REVISION_TERMS = new Set(['needs revision', 'needs review', 'rejected', 'returned', 'changes requested', 'declined']);
const DRAFT_TERMS = new Set(['draft', 'not started', 'new']);

export const COMPLETION_STATUSES: ReadonlySet<NormalizedFormStatus> = new Set(['Approved', 'Submitted']);

export function normalizeFormStatus(raw: string | null | undefined): NormalizedFormStatus {
  if (!raw) return 'In Progress';
  const normalized = raw.toLowerCase().replace(/[_-]/g, ' ');
  if (COMPLETION_TERMS.has(normalized)) return 'Approved';
  if (SUBMITTED_TERMS.has(normalized)) return 'Submitted';
  if (NEEDS_REVISION_TERMS.has(normalized)) return 'Needs Revision';
  if (DRAFT_TERMS.has(normalized)) return 'Draft';
  return 'In Progress';
}
