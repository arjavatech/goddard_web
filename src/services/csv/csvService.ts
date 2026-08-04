import { CSVRow, validateCSVRow, ParentValidationResult } from './csvValidation';
import { parseCSVFile } from './csvParser';

export interface ProcessedParent {
  rowNumber: number;
  data: CSVRow;
  validation: ParentValidationResult;
}

export interface CSVProcessingResult {
  successful: ProcessedParent[];
  failed: ProcessedParent[];
  skipped: number;
  totalRecords: number;
  processingTimeMs: number;
}

export type ProgressCallback = (processed: number, total: number) => void;

export class CSVService {
  /**
   * Processes a CSV file in chunks to maintain UI responsiveness.
   */
  static async processCSVFile(
    file: File,
    availableClassrooms: { id: string; name: string }[],
    onProgress: ProgressCallback,
    previousSuccessful: ProcessedParent[] = []
  ): Promise<CSVProcessingResult> {
    const startTime = performance.now();
    const parseResult = await parseCSVFile(file);
    const rows = parseResult.data;
    const totalRecords = rows.length;

    const successful: ProcessedParent[] = [];
    const failed: ProcessedParent[] = [];
    let skipped = 0;
    
    // Sets to track duplicates within the file and against previous successful uploads
    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();
    
    // Pre-populate with previously successful records
    previousSuccessful.forEach(record => {
      const parentEmail = record.data['Parent Email']?.trim().toLowerCase();
      const parentPhone = record.data['Parent Phone Number']?.trim();
      const secEmail = record.data['Secondary Parent Email']?.trim().toLowerCase();
      const secPhone = record.data['Secondary Parent Phone Number']?.trim();
      
      if (parentEmail) existingEmails.add(parentEmail);
      if (parentPhone) existingPhones.add(parentPhone);
      if (secEmail) existingEmails.add(secEmail);
      if (secPhone) existingPhones.add(secPhone);
    });

    const CHUNK_SIZE = 500;
    
    for (let i = 0; i < totalRecords; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      
      // Process chunk
      for (let j = 0; j < chunk.length; j++) {
        const rowIndex = i + j;
        const row = chunk[j];
        
        // Skip completely empty rows
        if (Object.values(row).every(v => !v || v.trim() === '')) {
          continue;
        }

        const validation = validateCSVRow(row, availableClassrooms, existingEmails, existingPhones);
        
        const processedRecord: ProcessedParent = {
          rowNumber: rowIndex + 1, // 1-based index (header is implicitly row 0 in papaparse data, but usually row 1 in Excel, so data row 1 is line 2)
          data: row,
          validation
        };

        if (validation.isValid) {
          successful.push(processedRecord);
        } else {
          // Check if it failed specifically because it's a duplicate against previously stored successful records
          const isDuplicateEmail = validation.errors['Parent Email'] === 'Email already exists or is duplicated in this file' || 
                                   validation.errors['Secondary Parent Email'] === 'Email already exists or is duplicated in this file';
          const isDuplicatePhone = validation.errors['Parent Phone Number'] === 'Phone number already exists or is duplicated in this file' || 
                                   validation.errors['Secondary Parent Phone Number'] === 'Phone number already exists or is duplicated in this file';
          
          if (isDuplicateEmail || isDuplicatePhone) {
            skipped++;
          } else {
            failed.push(processedRecord);
          }
        }
      }

      onProgress(Math.min(i + CHUNK_SIZE, totalRecords), totalRecords);

      // Yield to main thread to prevent UI freezing
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const processingTimeMs = performance.now() - startTime;

    return {
      successful,
      failed,
      skipped,
      totalRecords: successful.length + failed.length + skipped,
      processingTimeMs
    };
  }

  static createParentLocal(parentData: ProcessedParent): void {
    // Local simulation of creating a parent
    // In a real scenario, this would be an API call to the backend
    console.log('Simulated Parent Creation:', parentData);
  }
}
