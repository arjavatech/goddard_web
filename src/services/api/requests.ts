import {
  requestsMockApi,
  type PaymentDetails,
  type ExpenseRecord,
  type ExpenseSummary
} from '../mock/requests';

export type RequestStatus = 'Pending' | 'In Progress' | 'Completed';
export type RequestScope = 'classroom' | 'teacher' | 'school';

export type Request = {
  id: string;
  schoolId: string;
  requesterId: string;
  requesterName: string;
  requesterRole: 'employee' | 'admin' | 'superadmin';
  item: string;
  quantity: number;
  productLink?: string;
  productImage?: string; // Can be URL or Base64 string
  notes?: string;
  scope: RequestScope;
  classroomId?: string;
  classroomName?: string;
  teacherId?: string;
  teacherName?: string;
  category?: string;
  status: RequestStatus;
  createdAt: string;
  amountSpent?: number;
  paymentMethod?: string;
  purchaseDate?: string;
  paymentNotes?: string;
};

export type { PaymentDetails, ExpenseRecord, ExpenseSummary };
export type RequestExpenseData = { expenses: ExpenseRecord[]; summary: ExpenseSummary };

/**
 * Procurement requests & expenses service.
 *
 * All operations currently delegate to the mock data layer in
 * `src/services/mock/requests.ts`. Once the real backend endpoints ship,
 * swap each method body for an `authedFetch` call — the signatures here are
 * kept as the stable contract that the UI depends on.
 */
export const RequestService = {
  /** GET /requests */
  async fetchRequests(schoolId?: string, userRole?: string, userId?: string): Promise<Request[]> {
    return requestsMockApi.fetchRequests({ schoolId, role: userRole, userId });
  },

  /** POST /requests */
  async createRequest(req: Omit<Request, 'id' | 'status' | 'createdAt'>): Promise<Request> {
    return requestsMockApi.createRequest(req);
  },

  /** PATCH /requests/:id/status — update request status (Pending → In Progress → Completed) */
  async updateRequestStatus(requestId: string, status: RequestStatus): Promise<Request> {
    return requestsMockApi.updateRequestStatus(requestId, status);
  },

  /** Admin validation — moves an employee request forward for super-admin review. */
  async validateRequest(requestId: string, _schoolId?: string): Promise<Request> {
    return requestsMockApi.updateRequestStatus(requestId, 'In Progress');
  },

  /** Process a payment and record the expense ledger entry. */
  async processPayment(requestId: string, paymentDetails: PaymentDetails): Promise<Request> {
    return requestsMockApi.processPayment(requestId, paymentDetails);
  },

  /** POST /expenses — record an expense ledger entry. */
  async recordExpense(details: Omit<ExpenseRecord, 'id' | 'recordedAt'>): Promise<ExpenseRecord> {
    return requestsMockApi.recordExpense(details);
  },

  /** GET /expenses + GET /expenses/summary — expense/tracking data for analytics. */
  async fetchExpenseData(schoolId?: string): Promise<RequestExpenseData> {
    const [expenses, summary] = await Promise.all([
      requestsMockApi.fetchExpenses({ schoolId }),
      requestsMockApi.fetchExpenseSummary({ schoolId })
    ]);
    return { expenses, summary };
  },

  /** Legacy alias for processPayment — retained for existing callers. */
  async verifyRequest(
    requestId: string,
    paymentDetails: PaymentDetails
  ): Promise<Request> {
    return requestsMockApi.processPayment(requestId, paymentDetails);
  },

  /** DELETE /requests/:id */
  async deleteRequest(requestId: string): Promise<void> {
    return requestsMockApi.deleteRequest(requestId);
  }
};
