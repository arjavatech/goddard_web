// src/services/api/documentRequests.ts
export type DocumentRequestStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected';

export interface UploadedDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface DocumentRequest {
  id: string;
  schoolId: string;
  childId: string;
  title: string;
  status: DocumentRequestStatus;
  documents: UploadedDocument[];
  createdAt: string;
}

const STORAGE_KEY = 'mock_document_requests';

// Helper to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStoredRequests = (): DocumentRequest[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveRequests = (requests: DocumentRequest[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }
};

export const documentRequestsApi = {
  async createDocumentRequest(schoolId: string, childId: string, title: string): Promise<DocumentRequest> {
    await delay(300);
    const requests = getStoredRequests();
    const newRequest: DocumentRequest = {
      id: crypto.randomUUID(),
      schoolId,
      childId,
      title,
      status: 'Pending',
      documents: [],
      createdAt: new Date().toISOString(),
    };
    saveRequests([...requests, newRequest]);
    return newRequest;
  },

  async getDocumentRequestsByChild(childId: string): Promise<DocumentRequest[]> {
    await delay(200);
    const requests = getStoredRequests();
    return requests.filter(req => req.childId === childId);
  },

  async getDocumentRequestsBySchool(schoolId: string): Promise<DocumentRequest[]> {
    await delay(300);
    const requests = getStoredRequests();
    return requests.filter(req => req.schoolId === schoolId);
  },

  async updateDocumentRequestStatus(id: string, status: DocumentRequestStatus): Promise<DocumentRequest> {
    await delay(200);
    const requests = getStoredRequests();
    const index = requests.findIndex(req => req.id === id);
    if (index === -1) throw new Error('Document request not found');
    
    requests[index] = { ...requests[index], status };
    saveRequests(requests);
    return requests[index];
  },

  async updateDocumentRequestTitle(id: string, title: string): Promise<DocumentRequest> {
    await delay(200);
    const requests = getStoredRequests();
    const index = requests.findIndex(req => req.id === id);
    if (index === -1) throw new Error('Document request not found');
    
    requests[index] = { ...requests[index], title };
    saveRequests(requests);
    return requests[index];
  },

  async uploadDocumentForRequest(id: string, file: File): Promise<DocumentRequest> {
    await delay(800); // simulate upload time
    
    // Convert to base64 to persist in localStorage for this mock
    const base64Url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

    const requests = getStoredRequests();
    const index = requests.findIndex(req => req.id === id);
    if (index === -1) throw new Error('Document request not found');
    
    const newDocument: UploadedDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      url: base64Url,
      uploadedAt: new Date().toISOString(),
    };

    requests[index] = {
      ...requests[index],
      status: 'Submitted',
      documents: [...(requests[index].documents || []), newDocument],
    };
    saveRequests(requests);
    return requests[index];
  },

  async deleteDocumentRequest(id: string): Promise<void> {
    await delay(200);
    const requests = getStoredRequests();
    const updated = requests.filter(req => req.id !== id);
    saveRequests(updated);
  }
};
