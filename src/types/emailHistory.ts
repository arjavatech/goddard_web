export type EmailHistoryStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'retrying';

export interface EmailHistoryRecord {
  id: string;
  schoolId: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  status: EmailHistoryStatus;
  attemptCount: number;
  queuedAt?: string;
  processingAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  provider?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: EmailHistoryStatus | 'All Status';
  emailType?: string | 'All Types';
  search?: string;
  page: number;
  pageSize: number;
}

export interface EmailHistorySummary {
  totalSent: number;
  delivered: number;
  failed: number;
  processing: number;
}

export interface EmailHistoryPaginatedResponse {
  items: EmailHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: EmailHistorySummary;
}
