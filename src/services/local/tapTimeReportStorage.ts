import { v4 as uuidv4 } from 'uuid';
import { TapTimeEmployeeStorage } from './tapTimeEmployeeStorage';

export type ReportFrequency = 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Bimonthly';

export interface TapTimeReportSetting {
  id: string;
  email: string;
  frequencies: ReportFrequency[];
}

export interface TapTimeAttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO String
  checkOutTime: string | null; // ISO String or null
}

const SETTINGS_STORAGE_KEY = 'goddard_tap_time_report_settings';
const ATTENDANCE_STORAGE_KEY = 'goddard_tap_time_attendance_records';
const SEED_FLAG_KEY = 'goddard_tap_time_attendance_seeded';

class TapTimeReportStorageService {
  // --- Settings Management ---
  getSettings(): TapTimeReportSetting[] {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse Tap-Time report settings from localStorage', e);
      return [];
    }
  }

  addSetting(setting: Omit<TapTimeReportSetting, 'id'>): TapTimeReportSetting {
    const settings = this.getSettings();
    const newSetting: TapTimeReportSetting = {
      ...setting,
      id: uuidv4()
    };
    settings.push(newSetting);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return newSetting;
  }

  updateSetting(id: string, updates: Partial<Omit<TapTimeReportSetting, 'id'>>): TapTimeReportSetting | null {
    const settings = this.getSettings();
    const index = settings.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    settings[index] = { ...settings[index], ...updates };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return settings[index];
  }

  deleteSetting(id: string): void {
    const settings = this.getSettings();
    const filtered = settings.filter(s => s.id !== id);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(filtered));
  }

  // --- Attendance Records Management ---
  getAttendanceRecords(): TapTimeAttendanceRecord[] {
    this.seedAttendanceDataIfEmpty();
    
    try {
      const data = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse Tap-Time attendance records from localStorage', e);
      return [];
    }
  }

  getRecordsForDate(date: string): TapTimeAttendanceRecord[] {
    const all = this.getAttendanceRecords();
    return all.filter(r => r.date === date);
  }

  getRecordsForDateRange(startDate: string, endDate: string): TapTimeAttendanceRecord[] {
    const all = this.getAttendanceRecords();
    return all.filter(r => r.date >= startDate && r.date <= endDate);
  }

  addAttendanceRecord(record: Omit<TapTimeAttendanceRecord, 'id'>): TapTimeAttendanceRecord {
    const records = this.getAttendanceRecords();
    const newRecord: TapTimeAttendanceRecord = {
      ...record,
      id: uuidv4()
    };
    records.push(newRecord);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    return newRecord;
  }

  updateAttendanceRecord(id: string, updates: Partial<TapTimeAttendanceRecord>): TapTimeAttendanceRecord | null {
    const records = this.getAttendanceRecords();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = { ...records[index], ...updates };
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    return records[index];
  }

  // --- Seeder ---
  private seedAttendanceDataIfEmpty() {
    if (localStorage.getItem(SEED_FLAG_KEY)) {
      return; // Already seeded
    }

    const employees = TapTimeEmployeeStorage.getEmployees();
    if (employees.length === 0) {
      return; // No employees to seed for
    }

    const newRecords: TapTimeAttendanceRecord[] = [];
    
    // Generate data for the last 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Seed attendance for ~80% of employees each day
      employees.forEach(emp => {
        if (Math.random() < 0.8) {
          // Check-in between 7:00 AM and 9:00 AM
          const checkInDate = new Date(date);
          checkInDate.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
          
          // Check-out between 3:00 PM and 6:00 PM
          let checkOutTime: string | null = null;
          
          // 95% chance they checked out, unless it's today
          const isToday = i === 0;
          if (!isToday || Math.random() < 0.7) {
            const checkOutDate = new Date(date);
            checkOutDate.setHours(15 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0);
            checkOutTime = checkOutDate.toISOString();
          }

          newRecords.push({
            id: uuidv4(),
            employeeId: emp.id,
            date: dateString,
            checkInTime: checkInDate.toISOString(),
            checkOutTime
          });
        }
      });
    }

    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(newRecords));
    localStorage.setItem(SEED_FLAG_KEY, 'true');
  }
}

export const TapTimeReportStorage = new TapTimeReportStorageService();
