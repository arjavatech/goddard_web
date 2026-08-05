import { CSVProcessingResult } from './csvService';

const STORAGE_KEY_PREFIX = 'csv_upload_result_';

/**
 * Storage service layer designed to be easily swapped with real API calls
 * when backend integration is ready.
 */
export class CSVStorageService {
  /**
   * Generates the storage key specific to the current school/workspace
   */
  private static getKey(schoolId: string): string {
    return `${STORAGE_KEY_PREFIX}${schoolId}`;
  }

  /**
   * Save the processing result
   */
  static async saveProcessingResult(schoolId: string, result: CSVProcessingResult): Promise<void> {
    // Wrap in promise to mimic future async API call
    return new Promise((resolve, reject) => {
      try {
        const key = this.getKey(schoolId);
        localStorage.setItem(key, JSON.stringify(result));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fetch stored processing result
   */
  static async getProcessingResult(schoolId: string): Promise<CSVProcessingResult | null> {
    // Wrap in promise to mimic future async API call
    return new Promise((resolve) => {
      try {
        const key = this.getKey(schoolId);
        const data = localStorage.getItem(key);
        if (data) {
          resolve(JSON.parse(data) as CSVProcessingResult);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error fetching CSV processing result from storage:', error);
        resolve(null);
      }
    });
  }

  /**
   * Clear the stored processing result
   */
  static async clearProcessingResult(schoolId: string): Promise<void> {
    // Wrap in promise to mimic future async API call
    return new Promise((resolve) => {
      try {
        const key = this.getKey(schoolId);
        localStorage.removeItem(key);
        resolve();
      } catch (error) {
        console.error('Error clearing CSV processing result from storage:', error);
        resolve();
      }
    });
  }
}
