import Papa from 'papaparse';
import { CSVRow } from './csvValidation';

export interface ParseResult {
  data: CSVRow[];
  errors: any[];
  meta: any;
}

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data as CSVRow[],
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
