import { authedFetch, z } from './common';

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
  productImage?: string;
  notes?: string;
  scope: RequestScope;
  classroomId?: string;
  classroomName?: string;
  teacherId?: string;
  teacherName?: string;
  category?: string;
  location?: string;
  status: RequestStatus;
  expectedCompletionDate?: string;
  source?: 'request' | 'manual';
  createdAt: string;
  amountSpent?: number;
  paymentMethod?: string;
  purchaseDate?: string;
  paymentNotes?: string;
  billImageUrl?: string;
};

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

export type RequestExpenseData = { expenses: ExpenseRecord[]; summary: ExpenseSummary };

// ─── Mapping helpers (backend returns snake_case) ─────────────────────────────

function mapRequest(r: any): Request {
  return {
    id: r.id,
    schoolId: r.school_id,
    requesterId: r.requester_id ?? '',
    requesterName: r.requester_name,
    requesterRole: r.requester_role as Request['requesterRole'],
    item: r.item,
    quantity: r.quantity ?? 1,
    productLink: r.product_link ?? undefined,
    productImage: r.product_image ?? undefined,
    notes: r.notes ?? undefined,
    scope: r.scope as RequestScope,
    classroomId: r.classroom_id ?? undefined,
    classroomName: r.classroom_name ?? undefined,
    teacherId: r.teacher_id ?? undefined,
    teacherName: r.teacher_name ?? undefined,
    category: r.category ?? undefined,
    location: r.location ?? undefined,
    status: r.status as RequestStatus,
    expectedCompletionDate: r.expected_completion_date ?? undefined,
    source: r.source ?? 'request',
    createdAt: r.created_at ?? new Date().toISOString(),
    amountSpent: r.amount_spent ?? undefined,
    paymentMethod: r.payment_method ?? undefined,
    purchaseDate: r.purchase_date ?? undefined,
    paymentNotes: r.payment_notes ?? undefined,
    billImageUrl: r.bill_image ?? undefined,
  };
}

function mapExpenseRecord(r: any): ExpenseRecord {
  return {
    id: r.id,
    requestId: r.id,
    schoolId: r.school_id,
    item: r.item,
    requesterName: r.requester_name,
    requesterRole: r.requester_role as Request['requesterRole'],
    scope: (r.scope ?? 'school') as RequestScope,
    category: r.category ?? undefined,
    quantity: r.quantity ?? 1,
    classroomName: r.classroom_name ?? undefined,
    teacherName: r.teacher_name ?? undefined,
    amountSpent: r.amount_spent ?? 0,
    paymentMethod: r.payment_method ?? '',
    purchaseDate: r.purchase_date ?? r.created_at?.slice(0, 10) ?? '',
    paymentNotes: r.payment_notes ?? undefined,
    recordedAt: r.created_at ?? new Date().toISOString(),
  };
}

function mapSummary(s: any, expenseRows: any[]): ExpenseSummary {
  const byScope: { name: string; amount: number }[] = [];
  if (s?.by_scope) {
    if (s.by_scope.classroom > 0) byScope.push({ name: 'Classrooms', amount: s.by_scope.classroom });
    if (s.by_scope.teacher > 0)   byScope.push({ name: 'Teachers',   amount: s.by_scope.teacher });
    if (s.by_scope.school > 0)    byScope.push({ name: 'Entire School', amount: s.by_scope.school });
  }

  return {
    totalSpent: s?.total_spent ?? 0,
    totalRequests: expenseRows.length,
    completedCount: expenseRows.length,
    byClassroom: (s?.by_classroom ?? []).map((x: any) => ({ name: x.name, amount: x.total })),
    byTeacher:   (s?.by_teacher   ?? []).map((x: any) => ({ name: x.name, amount: x.total })),
    byScope,
    byCategory:  (s?.by_category  ?? []).map((x: any) => ({ name: x.name, amount: x.total })),
    requestWise: expenseRows
      .filter((r: any) => r.amount_spent != null)
      .map((r: any) => ({
        requestId:     r.id,
        item:          r.item,
        requesterName: r.requester_name,
        requesterRole: r.requester_role as Request['requesterRole'],
        amount:        r.amount_spent ?? 0,
        purchaseDate:  r.purchase_date ?? '',
        paymentMethod: r.payment_method ?? '',
      })),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const RequestService = {
  /** GET /requests */
  async fetchRequests(schoolId?: string, userRole?: string, userId?: string): Promise<Request[]> {
    const params = new URLSearchParams();
    if (schoolId)  params.set('schoolId', schoolId);
    if (userId)    params.set('userId', userId);
    if (userRole)  params.set('role', userRole);
    params.set('limit', '100');

    const data = await authedFetch(
      { method: 'GET', url: `/requests?${params.toString()}` },
      z.any()
    );
    const rows: any[] = data?.data ?? [];
    return rows.map(mapRequest);
  },

  /** POST /requests — image (if any) sent as base64; backend uploads to S3 */
  async createRequest(
    req: Omit<Request, 'id' | 'status' | 'createdAt'>,
    imageFile?: File,
  ): Promise<Request> {
    let imageBase64: string | undefined;
    let imageName: string | undefined;
    let imageContentType: string | undefined;

    if (imageFile) {
      imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip "data:image/...;base64," prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      imageName = imageFile.name;
      imageContentType = imageFile.type;
    }

    const data = await authedFetch(
      {
        method: 'POST',
        url: '/requests',
        body: {
          schoolId:         req.schoolId,
          requesterId:      req.requesterId,
          requesterName:    req.requesterName,
          requesterRole:    req.requesterRole,
          item:             req.item,
          quantity:         req.quantity,
          category:         req.category,
          location:         req.location,
          scope:            req.scope,
          classroomId:      req.classroomId,
          classroomName:    req.classroomName,
          teacherId:        req.teacherId,
          teacherName:      req.teacherName,
          productLink:      req.productLink,
          notes:            req.notes,
          imageBase64,
          imageName,
          imageContentType,
        },
      },
      z.any()
    );
    return mapRequest(data);
  },

  /** PATCH /requests/:id/status */
  async updateRequestStatus(requestId: string, status: RequestStatus, expectedCompletionDate?: string): Promise<Request> {
    const data = await authedFetch(
      { method: 'PATCH', url: `/requests/${requestId}/status`, body: { status, expectedCompletionDate } },
      z.any()
    );
    return mapRequest(data);
  },

  /** Admin validation — moves employee request to In Progress */
  async validateRequest(requestId: string, _schoolId?: string, expectedCompletionDate?: string): Promise<Request> {
    const data = await authedFetch(
      { method: 'PATCH', url: `/requests/${requestId}/status`, body: { status: 'In Progress', expectedCompletionDate } },
      z.any()
    );
    return mapRequest(data);
  },

  async updateExpectedCompletionDate(requestId: string, expectedCompletionDate: string): Promise<Request> {
    const data = await authedFetch(
      { method: 'PATCH', url: `/requests/${requestId}/expected-completion-date`, body: { expectedCompletionDate } },
      z.any(),
    );
    return mapRequest(data);
  },

  async updateRequest(requestId: string, request: Partial<Pick<Request,
    'item' | 'quantity' | 'category' | 'location' | 'scope' | 'classroomId' | 'classroomName' |
    'teacherId' | 'teacherName' | 'productLink' | 'productImage' | 'notes'>>, imageFile?: File): Promise<Request> {
    let imageBase64: string | undefined;
    if (imageFile) {
      imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }
    const data = await authedFetch(
      {
        method: 'PATCH', url: `/requests/${requestId}`,
        body: {
          item: request.item, quantity: request.quantity, category: request.category, location: request.location,
          scope: request.scope, classroomId: request.classroomId, classroomName: request.classroomName,
          teacherId: request.teacherId, teacherName: request.teacherName, productLink: request.productLink,
          productImage: request.productImage, notes: request.notes,
          imageBase64,
          imageName: imageFile?.name,
          imageContentType: imageFile?.type,
        },
      },
      z.any(),
    );
    return mapRequest(data);
  },

  /** POST /requests/:id/pay — mark as Completed and record payment */
  async processPayment(requestId: string, paymentDetails: PaymentDetails, billImageFile?: File): Promise<Request> {
    let billImageBase64: string | undefined;
    let billImageName: string | undefined;
    let billImageContentType: string | undefined;

    if (billImageFile) {
      billImageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(billImageFile);
      });
      billImageName = billImageFile.name;
      billImageContentType = billImageFile.type;
    }

    const data = await authedFetch(
      {
        method: 'POST',
        url: `/requests/${requestId}/pay`,
        body: {
          amountSpent:          paymentDetails.amountSpent,
          paymentMethod:        paymentDetails.paymentMethod,
          purchaseDate:         paymentDetails.purchaseDate,
          paymentNotes:         paymentDetails.paymentNotes,
          billImageBase64,
          billImageName,
          billImageContentType,
        },
      },
      z.any()
    );
    return mapRequest(data);
  },

  /** POST /expenses — manual expense entry (superadmin) */
  async recordExpense(details: Omit<ExpenseRecord, 'id' | 'recordedAt'>): Promise<ExpenseRecord> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: '/expenses',
        body: {
          schoolId:      details.schoolId,
          requesterName: details.requesterName,
          requesterRole: details.requesterRole,
          item:          details.item,
          quantity:      details.quantity,
          category:      details.category,
          scope:         details.scope,
          classroomName: details.classroomName,
          teacherName:   details.teacherName,
          amountSpent:   details.amountSpent,
          paymentMethod: details.paymentMethod,
          purchaseDate:  details.purchaseDate,
          paymentNotes:  details.paymentNotes,
        },
      },
      z.any()
    );
    return mapExpenseRecord(data);
  },

  /** GET /expenses?include=summary — expense list + analytics in one call */
  async fetchExpenseData(schoolId?: string): Promise<RequestExpenseData> {
    const params = new URLSearchParams({ include: 'summary', limit: '100' });
    if (schoolId) params.set('schoolId', schoolId);

    const data = await authedFetch(
      { method: 'GET', url: `/expenses?${params.toString()}` },
      z.any()
    );

    const rows: any[] = data?.data ?? [];
    return {
      expenses: rows.map(mapExpenseRecord),
      summary:  mapSummary(data?.summary, rows),
    };
  },

  /** Legacy alias for processPayment */
  async verifyRequest(requestId: string, paymentDetails: PaymentDetails, billImageFile?: File): Promise<Request> {
    return RequestService.processPayment(requestId, paymentDetails, billImageFile);
  },

  /** DELETE /requests/:id */
  async deleteRequest(requestId: string): Promise<void> {
    await authedFetch(
      { method: 'DELETE', url: `/requests/${requestId}` },
      z.any()
    );
  },
};
