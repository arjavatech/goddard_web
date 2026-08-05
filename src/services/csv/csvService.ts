import { CSVRow, validateCSVRow, ParentValidationResult, DUPLICATE_RECORD_ERROR } from './csvValidation';
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
  static async processCSVFile(
    file: File,
    availableClassrooms: { id: string; name: string }[],
    onProgress: ProgressCallback
  ): Promise<CSVProcessingResult> {
    const startTime = performance.now();
    const parseResult = await parseCSVFile(file);
    const rows = parseResult.data;
    const totalRecords = rows.length;

    const successful: ProcessedParent[] = [];
    const failed: ProcessedParent[] = [];
    let skipped = 0;

    const existingRecordKeys = new Set<string>();

    const CHUNK_SIZE = 500;

    for (let i = 0; i < totalRecords; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const rowIndex = i + j;
        const row = chunk[j];

        if (Object.values(row).every(v => !v || v.trim() === '')) {
          continue;
        }

        const validation = validateCSVRow(row, availableClassrooms, existingRecordKeys);

        const processedRecord: ProcessedParent = {
          rowNumber: rowIndex + 1,
          data: row,
          validation
        };

        if (validation.isValid) {
          successful.push(processedRecord);
        } else {
          const isDuplicate = validation.errors['Parent Email'] === DUPLICATE_RECORD_ERROR;
          if (isDuplicate) {
            skipped++;
          } else {
            failed.push(processedRecord);
          }
        }
      }

      onProgress(Math.min(i + CHUNK_SIZE, totalRecords), totalRecords);
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
}
