import type { Request, RequestScope, RequestStatus } from '../api/requests';

/**
 * ────────────────────────────────────────────────────────────────────────────
 * Mock procurement data layer.
 *
 * This module stands in for the real backend while the `/requests` and
 * `/expenses` endpoints do not exist yet. It owns the data (seeded from
 * localStorage) and exposes API-shaped functions so the frontend can interact
 * with it exactly like a real REST API.
 *
 * To swap in the real backend, replace the implementations in
 * `src/services/api/requests.ts` with `authedFetch` calls — the mock functions
 * here mirror the endpoint contract one-to-one and nothing else in the
 * frontend needs to change.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type PaymentDetails = {
  amountSpent: number;
  paymentMethod: string;
  purchaseDate: string;
  paymentNotes?: string;
};

export type ExpenseRecord = {
  id: string;
  requestId: string;
  schoolId: string;
  item: string;
  requesterName: string;
  requesterRole: Request['requesterRole'];
  scope: RequestScope;
  category?: string;
  quantity: number;
  classroomName?: string;
  teacherName?: string;
  amountSpent: number;
  paymentMethod: string;
  purchaseDate: string;
  paymentNotes?: string;
  recordedAt: string;
};

export type ExpenseSummary = {
  totalSpent: number;
  totalRequests: number;
  completedCount: number;
  byClassroom: { name: string; amount: number }[];
  byTeacher: { name: string; amount: number }[];
  byScope: { name: string; amount: number }[];
  byCategory: { name: string; amount: number }[];
  requestWise: {
    requestId: string;
    item: string;
    requesterName: string;
    requesterRole: Request['requesterRole'];
    amount: number;
    purchaseDate: string;
    paymentMethod: string;
  }[];
};

const REQUESTS_KEY = 'goddard_requests';
const EXPENSES_KEY = 'goddard_expenses';

// Realistic initial requests to populate lists and analytics immediately.
const INITIAL_MOCK_REQUESTS: Request[] = [
  {
    id: 'req-1',
    schoolId: 'school-1',
    requesterId: 'emp-1',
    requesterName: 'Sarah Jenkins',
    requesterRole: 'employee',
    item: 'Crayola Washable Crayons (Pack of 24)',
    quantity: 15,
    category: 'Classroom Supplies',
    scope: 'classroom',
    classroomId: 'classroom-1',
    classroomName: 'Preschool A',
    status: 'Completed',
    createdAt: '2026-07-28T09:30:00Z',
    amountSpent: 75.00,
    paymentMethod: 'Credit Card',
    purchaseDate: '2026-08-01',
    paymentNotes: 'Purchased from Target. Receipts attached.',
    productLink: 'https://www.target.com'
  },
  {
    id: 'req-2',
    schoolId: 'school-1',
    requesterId: 'emp-2',
    requesterName: 'Emily Smith',
    requesterRole: 'employee',
    item: 'STEM Building Blocks Set (Giant)',
    quantity: 3,
    category: 'STEM & Toys',
    scope: 'classroom',
    classroomId: 'classroom-2',
    classroomName: 'Preschool B',
    status: 'In Progress',
    createdAt: '2026-08-02T10:15:00Z',
    productLink: 'https://www.amazon.com',
    productImage: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'req-3',
    schoolId: 'school-1',
    requesterId: 'admin-1',
    requesterName: 'Alice Johnson',
    requesterRole: 'admin',
    item: 'Heavy Duty Office Paper Shredder',
    quantity: 1,
    category: 'Office & Equipment',
    scope: 'school',
    status: 'Completed',
    createdAt: '2026-08-03T11:00:00Z',
    amountSpent: 189.99,
    paymentMethod: 'Credit Card',
    purchaseDate: '2026-08-05',
    paymentNotes: 'Ordered via Staples business account.',
    productLink: 'https://www.staples.com'
  },
  {
    id: 'req-4',
    schoolId: 'school-1',
    requesterId: 'emp-3',
    requesterName: 'Jessica Davis',
    requesterRole: 'employee',
    item: 'Sensory Play Sand (50 lbs bag)',
    quantity: 4,
    category: 'STEM & Toys',
    scope: 'classroom',
    classroomId: 'classroom-3',
    classroomName: 'Toddler Room',
    status: 'Pending',
    createdAt: '2026-08-08T08:45:00Z',
    productLink: 'https://www.homedepot.com'
  },
  {
    id: 'req-5',
    schoolId: 'school-1',
    requesterId: 'admin-1',
    requesterName: 'Alice Johnson',
    requesterRole: 'admin',
    item: 'Expo Dry Erase Markers (Pack of 36)',
    quantity: 6,
    category: 'Classroom Supplies',
    scope: 'teacher',
    teacherId: 'emp-4',
    teacherName: 'Michael Brown',
    status: 'Completed',
    createdAt: '2026-08-05T14:20:00Z',
    amountSpent: 84.50,
    paymentMethod: 'Purchase Order',
    purchaseDate: '2026-08-06',
    paymentNotes: 'Staples PO #55431',
    productLink: 'https://www.amazon.com'
  },
  {
    id: 'req-6',
    schoolId: 'school-1',
    requesterId: 'emp-3',
    requesterName: 'Jessica Davis',
    requesterRole: 'employee',
    item: 'Childrens Board Books (Set of 12)',
    quantity: 2,
    category: 'Books & Learning',
    scope: 'classroom',
    classroomId: 'classroom-4',
    classroomName: 'Infant Room',
    status: 'Completed',
    createdAt: '2026-08-04T16:00:00Z',
    amountSpent: 48.00,
    paymentMethod: 'Credit Card',
    purchaseDate: '2026-08-06',
    paymentNotes: 'Scholastic Book Club order',
    productLink: 'https://www.scholastic.com'
  },
  {
    id: 'req-7',
    schoolId: 'school-1',
    requesterId: 'admin-1',
    requesterName: 'Alice Johnson',
    requesterRole: 'admin',
    item: 'Fellowes Laminator Machine',
    quantity: 2,
    category: 'Office & Equipment',
    scope: 'teacher',
    teacherId: 'emp-1',
    teacherName: 'Sarah Jenkins',
    status: 'Pending',
    createdAt: '2026-08-09T13:10:00Z',
    productLink: 'https://www.amazon.com'
  },
  {
    id: 'req-8',
    schoolId: 'school-1',
    requesterId: 'emp-4',
    requesterName: 'Michael Brown',
    requesterRole: 'employee',
    item: 'Outdoor Rubber Playground Balls',
    quantity: 8,
    category: 'Play & Outdoor',
    scope: 'classroom',
    classroomId: 'classroom-5',
    classroomName: 'Pre-K A',
    status: 'Completed',
    createdAt: '2026-08-03T10:00:00Z',
    amountSpent: 64.00,
    paymentMethod: 'Credit Card',
    purchaseDate: '2026-08-05',
    productLink: 'https://www.amazon.com'
  }
];

// ─── Storage helpers (simulate a database) ──────────────────────────────────

const getStoredRequests = (): Request[] => {
  if (typeof window === 'undefined') return INITIAL_MOCK_REQUESTS;
  const stored = localStorage.getItem(REQUESTS_KEY);
  if (!stored) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
    return INITIAL_MOCK_REQUESTS;
  }
  try {
    return JSON.parse(stored) as Request[];
  } catch (e) {
    console.error('Failed to parse stored requests, resetting', e);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
    return INITIAL_MOCK_REQUESTS;
  }
};

const saveStoredRequests = (requests: Request[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
};

const toExpenseRecord = (req: Request): ExpenseRecord => ({
  id: `exp-${req.id}`,
  requestId: req.id,
  schoolId: req.schoolId,
  item: req.item,
  requesterName: req.requesterName,
  requesterRole: req.requesterRole,
  scope: req.scope,
  category: req.category,
  quantity: req.quantity,
  classroomName: req.classroomName,
  teacherName: req.teacherName,
  amountSpent: req.amountSpent ?? 0,
  paymentMethod: req.paymentMethod || 'Credit Card',
  purchaseDate: req.purchaseDate || req.createdAt.slice(0, 10),
  paymentNotes: req.paymentNotes,
  recordedAt: req.purchaseDate ? new Date(req.purchaseDate + 'T12:00:00Z').toISOString() : req.createdAt
});

// Backfill the expense ledger from completed requests so analytics have data immediately.
const getStoredExpenses = (): ExpenseRecord[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EXPENSES_KEY);
  if (!stored) {
    const seeded = getStoredRequests()
      .filter(r => r.status === 'Completed' && r.amountSpent !== undefined)
      .map(toExpenseRecord);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(stored) as ExpenseRecord[];
  } catch (e) {
    console.error('Failed to parse stored expenses, resetting', e);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    return [];
  }
};

const saveStoredExpenses = (expenses: ExpenseRecord[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ─── Mock API (mirrors the future `/requests` & `/expenses` endpoints) ─────

export const requestsMockApi = {
  /** GET /requests */
  async fetchRequests(params?: { schoolId?: string; role?: string; userId?: string }): Promise<Request[]> {
    await delay(120);
    let list = getStoredRequests();
    const { schoolId, role, userId } = params || {};

    if (schoolId) {
      list = list.filter(r => r.schoolId === schoolId || r.schoolId === 'school-1');
    }

    const normalizedRole = role?.toLowerCase();
    if (normalizedRole === 'employee' && userId) {
      // Employees can only view requests they submitted.
      return list.filter(r => r.requesterId === userId);
    }

    return list;
  },

  /** POST /requests */
  async createRequest(req: Omit<Request, 'id' | 'status' | 'createdAt'>): Promise<Request> {
    await delay(150);
    const list = getStoredRequests();
    const newRequest: Request = {
      ...req,
      id: generateId('req'),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    list.push(newRequest);
    saveStoredRequests(list);
    return newRequest;
  },

  /** PATCH /requests/:id/status */
  async updateRequestStatus(requestId: string, status: RequestStatus): Promise<Request> {
    await delay(120);
    const list = getStoredRequests();
    const reqIndex = list.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Request not found');

    list[reqIndex].status = status;
    saveStoredRequests(list);
    return list[reqIndex];
  },

  /** POST /requests/:id/pay */
  async processPayment(requestId: string, payment: PaymentDetails): Promise<Request> {
    await delay(180);
    const list = getStoredRequests();
    const reqIndex = list.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Request not found');

    const req = list[reqIndex];
    req.status = 'Completed';
    req.amountSpent = payment.amountSpent;
    req.paymentMethod = payment.paymentMethod;
    req.purchaseDate = payment.purchaseDate;
    req.paymentNotes = payment.paymentNotes;
    saveStoredRequests(list);

    // Keep the expense ledger in sync (upsert to avoid duplicate entries).
    const expenses = getStoredExpenses();
    const expenseIndex = expenses.findIndex(e => e.requestId === requestId);
    const record: ExpenseRecord = {
      ...toExpenseRecord(req),
      recordedAt: new Date().toISOString()
    };
    if (expenseIndex !== -1) {
      expenses[expenseIndex] = record;
    } else {
      expenses.push(record);
    }
    saveStoredExpenses(expenses);

    return req;
  },

  /** POST /expenses */
  async recordExpense(input: Omit<ExpenseRecord, 'id' | 'recordedAt'>): Promise<ExpenseRecord> {
    await delay(150);
    const expenses = getStoredExpenses();
    const record: ExpenseRecord = {
      ...input,
      id: generateId('exp'),
      recordedAt: new Date().toISOString()
    };
    expenses.push(record);
    saveStoredExpenses(expenses);
    return record;
  },

  /** GET /expenses */
  async fetchExpenses(params?: { schoolId?: string }): Promise<ExpenseRecord[]> {
    await delay(120);
    const expenses = getStoredExpenses();
    if (!params?.schoolId) return expenses;
    return expenses.filter(e => e.schoolId === params.schoolId || e.schoolId === 'school-1');
  },

  /** GET /expenses/summary — server-side aggregated analytics */
  async fetchExpenseSummary(params?: { schoolId?: string }): Promise<ExpenseSummary> {
    await delay(180);
    const expenses = params?.schoolId
      ? getStoredExpenses().filter(e => e.schoolId === params.schoolId || e.schoolId === 'school-1')
      : getStoredExpenses();

    const totalSpent = expenses.reduce((sum, e) => sum + e.amountSpent, 0);

    const groupBy = (key: (e: ExpenseRecord) => string | undefined): { name: string; amount: number }[] => {
      const map: Record<string, number> = {};
      expenses.forEach(e => {
        const k = key(e);
        if (!k) return;
        map[k] = (map[k] || 0) + e.amountSpent;
      });
      return Object.entries(map)
        .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }))
        .sort((a, b) => b.amount - a.amount);
    };

    const requests = getStoredRequests();

    return {
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalRequests: requests.length,
      completedCount: requests.filter(r => r.status === 'Completed').length,
      byClassroom: groupBy(e => (e.scope === 'classroom' ? e.classroomName : undefined)),
      byTeacher: groupBy(e => (e.scope === 'teacher' ? e.teacherName : undefined)),
      byScope: groupBy(e => {
        if (e.scope === 'classroom') return 'Classrooms';
        if (e.scope === 'teacher') return 'Teachers';
        return 'Entire School';
      }),
      byCategory: groupBy(e => e.category || 'Classroom Supplies'),
      requestWise: expenses.map(e => ({
        requestId: e.requestId,
        item: e.item,
        requesterName: e.requesterName,
        requesterRole: e.requesterRole,
        amount: e.amountSpent,
        purchaseDate: e.purchaseDate,
        paymentMethod: e.paymentMethod
      }))
    };
  },

  /** DELETE /requests/:id */
  async deleteRequest(requestId: string): Promise<void> {
    await delay(100);
    saveStoredRequests(getStoredRequests().filter(r => r.id !== requestId));
    saveStoredExpenses(getStoredExpenses().filter(e => e.requestId !== requestId));
  }
};
