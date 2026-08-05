import Papa from 'papaparse';
import { CSVRow } from './csvValidation';

export interface ParseResult {
  data: CSVRow[];
  errors: any[];
  meta: any;
}

const SNAKE_TO_READABLE: Record<string, string> = {
  primary_parent_first_name: 'Parent First Name',
  primary_parent_last_name: 'Parent Last Name',
  primary_parent_email: 'Parent Email',
  primary_parent_phone: 'Parent Phone Number',
  primary_parent_address: 'Primary Parent Address',
  secondary_parent_first_name: 'Secondary Parent First Name',
  secondary_parent_last_name: 'Secondary Parent Last Name',
  secondary_parent_email: 'Secondary Parent Email',
  secondary_parent_phone: 'Secondary Parent Phone Number',
  child_first_name: 'Child First Name',
  child_last_name: 'Child Last Name',
  child_gender: 'Child Gender',
  child_dob: 'Child DOB',
  classroom: 'Classroom',
};

function normalizeRow(row: CSVRow): CSVRow {
  const normalized: CSVRow = {};
  for (const key of Object.keys(row)) {
    const canonical = SNAKE_TO_READABLE[key];
    normalized[canonical ?? key] = row[key];
  }
  return normalized;
}

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data as CSVRow[];
        const firstRowKeys = Object.keys(rawData[0] ?? {});
        const isSnakeCase = firstRowKeys.some(k => k in SNAKE_TO_READABLE);
        const data = isSnakeCase ? rawData.map(normalizeRow) : rawData;
        resolve({
          data,
          errors: results.errors,
          meta: results.meta
        });
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}
