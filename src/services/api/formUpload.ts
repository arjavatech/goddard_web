export interface FormUploadRequest {
  file: File;
  assignmentId: string;
  entityType: 'student' | 'employee';
}

export interface MockUploadRecord {
  id: string;
  assignmentId: string;
  entityType: 'student' | 'employee';
  formTemplateId: string;
  formName: string;
  studentName?: string;
  parentName?: string;
  parentEmail?: string;
  classroomId?: string;
  classroomName?: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  schoolId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  submittedAt: string;
  status: string;
}

const MOCK_UPLOADED_FORMS_KEY = 'mock_uploaded_forms';

export function getMockUploadedForms(): MockUploadRecord[] {
  const data = localStorage.getItem(MOCK_UPLOADED_FORMS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveMockUploadedForm(form: MockUploadRecord) {
  const forms = getMockUploadedForms();
  const existingIndex = forms.findIndex(f => f.assignmentId === form.assignmentId);
  if (existingIndex >= 0) {
    forms[existingIndex] = form;
  } else {
    forms.push(form);
  }
  localStorage.setItem(MOCK_UPLOADED_FORMS_KEY, JSON.stringify(forms));
}

export function updateMockUploadStatus(assignmentId: string, status: string): boolean {
  const forms = getMockUploadedForms();
  const existingIndex = forms.findIndex(f => f.assignmentId === assignmentId);
  if (existingIndex >= 0) {
    forms[existingIndex].status = status;
    localStorage.setItem(MOCK_UPLOADED_FORMS_KEY, JSON.stringify(forms));
    return true;
  }
  return false;
}

export function isMockRecord(assignmentId: string): boolean {
  const forms = getMockUploadedForms();
  return forms.some(f => f.assignmentId === assignmentId);
}

const DB_NAME = 'GoddardMockDB';
const STORE_NAME = 'mockPdfs';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveMockPdfToIdb(assignmentId: string, file: File): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, assignmentId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMockPdfFromIdb(assignmentId: string): Promise<File | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(assignmentId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * MOCK ONLY: This function simulates uploading a form PDF.
 * It stores only metadata in localStorage to appear in the Review Queue.
 * 
 * Future Backend API Contract:
 * - Endpoint: POST /api/form-assignments/upload
 * - HTTP Method: POST
 * - Content-Type: multipart/form-data
 * - Request Fields:
 *   - file (binary PDF)
 *   - assignmentId (string)
 *   - entityType ('student' | 'employee')
 * - Expected Response: 200 OK, JSON { success: true, url: string }
 * 
 * @param request The upload request payload
 * @param mockMetadata Extra data needed ONLY for the frontend mock Review Queue
 */
export async function uploadFormMock(
  request: FormUploadRequest, 
  mockMetadata: Omit<MockUploadRecord, 'id' | 'assignmentId' | 'entityType' | 'fileName' | 'fileType' | 'fileSize' | 'submittedAt' | 'status'>
): Promise<{ success: boolean; url: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const newItem: MockUploadRecord = {
    id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    assignmentId: request.assignmentId,
    entityType: request.entityType,
    fileName: request.file.name,
    fileType: request.file.type,
    fileSize: request.file.size,
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
    ...mockMetadata,
  };

  saveMockUploadedForm(newItem);

  // Save file to IndexedDB for preview
  try {
    await saveMockPdfToIdb(request.assignmentId, request.file);
  } catch (err) {
    console.error('Failed to save mock PDF to IndexedDB', err);
  }

  // Return a dummy URL since we don't store base64/blobs for mock.
  return { success: true, url: '#' };
}
