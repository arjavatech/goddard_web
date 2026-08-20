import { EmailHistoryRecord } from '../types/emailHistory';

const STORAGE_KEY_PREFIX = 'goddard_email_history_';

export const emailHistoryStorage = {
  getStorageKey(schoolId: string): string {
    return `${STORAGE_KEY_PREFIX}${schoolId}`;
  },

  getAll(schoolId: string): EmailHistoryRecord[] {
    try {
      const key = this.getStorageKey(schoolId);
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data) as EmailHistoryRecord[];
    } catch (error) {
      console.error('Failed to parse email history from local storage:', error);
      return [];
    }
  },

  saveAll(schoolId: string, records: EmailHistoryRecord[]): void {
    try {
      const key = this.getStorageKey(schoolId);
      localStorage.setItem(key, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save email history to local storage:', error);
    }
  },

  add(record: EmailHistoryRecord): void {
    const records = this.getAll(record.schoolId);
    records.push(record);
    this.saveAll(record.schoolId, records);
  },

  update(schoolId: string, id: string, updates: Partial<EmailHistoryRecord>): void {
    const records = this.getAll(schoolId);
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveAll(schoolId, records);
    }
  },

  getById(schoolId: string, id: string): EmailHistoryRecord | undefined {
    const records = this.getAll(schoolId);
    return records.find(r => r.id === id);
  }
};
