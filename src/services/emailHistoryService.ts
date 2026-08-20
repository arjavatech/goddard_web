import { EmailHistoryRecord, EmailHistoryFilters, EmailHistoryPaginatedResponse, EmailHistorySummary } from '../types/emailHistory';
import { emailHistoryStorage } from './emailHistoryStorage';

export const emailHistoryService = {
  async getHistory(schoolId: string, filters: EmailHistoryFilters): Promise<EmailHistoryPaginatedResponse> {
    // Simulate network delay for backend-ready feel
    await new Promise(resolve => setTimeout(resolve, 300));

    let records = emailHistoryStorage.getAll(schoolId);

    // Apply Date Range filter
    if (filters.dateFrom && filters.dateTo) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);

      records = records.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= from && recordDate <= to;
      });
    }

    // Apply Status filter
    if (filters.status && filters.status !== 'All Status') {
      records = records.filter(record => record.status === filters.status);
    }

    // Apply Email Type filter
    if (filters.emailType && filters.emailType !== 'All Types') {
      records = records.filter(record => record.emailType === filters.emailType);
    }

    // Apply Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      records = records.filter(record => 
        (record.recipientName?.toLowerCase().includes(query)) ||
        (record.recipientEmail?.toLowerCase().includes(query)) ||
        (record.subject?.toLowerCase().includes(query))
      );
    }

    // Sort by createdAt descending
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Summary
    const summary: EmailHistorySummary = {
      totalSent: records.filter(r => r.status === 'sent' || r.status === 'delivered').length,
      delivered: records.filter(r => r.status === 'delivered').length,
      failed: records.filter(r => r.status === 'failed').length,
      processing: records.filter(r => r.status === 'queued' || r.status === 'processing' || r.status === 'retrying').length,
    };

    // Apply Pagination
    const total = records.length;
    const startIndex = (filters.page - 1) * filters.pageSize;
    const paginatedItems = records.slice(startIndex, startIndex + filters.pageSize);

    return {
      items: paginatedItems,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      summary
    };
  },

  async getSummary(schoolId: string, dateFrom?: string, dateTo?: string): Promise<EmailHistorySummary> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let records = emailHistoryStorage.getAll(schoolId);

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      records = records.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= from && recordDate <= to;
      });
    }

    return {
      totalSent: records.filter(r => r.status === 'sent' || r.status === 'delivered').length,
      delivered: records.filter(r => r.status === 'delivered').length,
      failed: records.filter(r => r.status === 'failed').length,
      processing: records.filter(r => r.status === 'queued' || r.status === 'processing' || r.status === 'retrying').length,
    };
  },

  async getById(schoolId: string, id: string): Promise<EmailHistoryRecord | undefined> {
    return emailHistoryStorage.getById(schoolId, id);
  },

  async create(record: Omit<EmailHistoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailHistoryRecord> {
    const newRecord: EmailHistoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    emailHistoryStorage.add(newRecord);
    return newRecord;
  },

  async update(schoolId: string, id: string, updates: Partial<EmailHistoryRecord>): Promise<void> {
    emailHistoryStorage.update(schoolId, id, updates);
  }
};
