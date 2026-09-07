# Mock APIs — `requestsMockApi`

**File:** `src/services/mock/requests.ts`  
**Storage:** `localStorage` keys — `goddard_requests`, `goddard_expenses`

---

## API Reference

### `fetchRequests(params?)`
**GET /requests**

```ts
fetchRequests(params?: { schoolId?: string; role?: string; userId?: string }): Promise<Request[]>
```

- Admins get all requests for the school
- Employees only get their own requests (`requesterId === userId`)

---

### `createRequest(req)`
**POST /requests**

```ts
createRequest(req: Omit<Request, 'id' | 'status' | 'createdAt'>): Promise<Request>
```

- Auto-sets `status: 'Pending'` and `createdAt` to now

---

### `updateRequestStatus(requestId, status)`
**PATCH /requests/:id/status**

```ts
updateRequestStatus(requestId: string, status: RequestStatus): Promise<Request>
```

- `RequestStatus`: `'Pending' | 'In Progress' | 'Completed'`

---

### `processPayment(requestId, payment)`
**POST /requests/:id/pay**

```ts
processPayment(requestId: string, payment: PaymentDetails): Promise<Request>

type PaymentDetails = {
  amountSpent: number;
  paymentMethod: string;
  purchaseDate: string;
  paymentNotes?: string;
}
```

- Sets status to `Completed`, upserts into expense ledger

---

### `recordExpense(input)`
**POST /expenses**

```ts
recordExpense(input: Omit<ExpenseRecord, 'id' | 'recordedAt'>): Promise<ExpenseRecord>
```

---

### `fetchExpenses(params?)`
**GET /expenses**

```ts
fetchExpenses(params?: { schoolId?: string }): Promise<ExpenseRecord[]>
```

---

### `fetchExpenseSummary(params?)`
**GET /expenses/summary**

```ts
fetchExpenseSummary(params?: { schoolId?: string }): Promise<ExpenseSummary>

type ExpenseSummary = {
  totalSpent: number;
  totalRequests: number;
  completedCount: number;
  byClassroom: { name: string; amount: number }[];
  byTeacher:   { name: string; amount: number }[];
  byScope:     { name: string; amount: number }[];
  byCategory:  { name: string; amount: number }[];
  requestWise: {
    requestId: string;
    item: string;
    requesterName: string;
    requesterRole: string;
    amount: number;
    purchaseDate: string;
    paymentMethod: string;
  }[];
}
```

---

### `deleteRequest(requestId)`
**DELETE /requests/:id**

```ts
deleteRequest(requestId: string): Promise<void>
```

- Removes request + linked expense record

---

## Seed Data (8 initial requests)

| ID | Item | Requester | Scope | Classroom / Teacher | Status | Amount |
|----|------|-----------|-------|----------------------|--------|--------|
| req-1 | Crayola Washable Crayons (x15) | Sarah Jenkins | classroom | Preschool A | Completed | $75.00 |
| req-2 | STEM Building Blocks Set (x3) | Emily Smith | classroom | Preschool B | In Progress | — |
| req-3 | Heavy Duty Office Paper Shredder (x1) | Alice Johnson | school | — | Completed | $189.99 |
| req-4 | Sensory Play Sand 50lbs (x4) | Jessica Davis | classroom | Toddler Room | Pending | — |
| req-5 | Expo Dry Erase Markers (x6) | Alice Johnson | teacher | Michael Brown | Completed | $84.50 |
| req-6 | Children's Board Books Set (x2) | Jessica Davis | classroom | Infant Room | Completed | $48.00 |
| req-7 | Fellowes Laminator Machine (x2) | Alice Johnson | teacher | Sarah Jenkins | Pending | — |
| req-8 | Outdoor Rubber Playground Balls (x8) | Michael Brown | classroom | Pre-K A | Completed | $64.00 |

**Total seeded expenses:** $461.49 across 5 completed requests

---

## Types

```ts
type RequestScope = 'classroom' | 'teacher' | 'school';
type RequestStatus = 'Pending' | 'In Progress' | 'Completed';

type Request = {
  id: string;
  schoolId: string;
  requesterId: string;
  requesterName: string;
  requesterRole: 'employee' | 'admin';
  item: string;
  quantity: number;
  category?: string;
  scope: RequestScope;
  classroomId?: string;
  classroomName?: string;
  teacherId?: string;
  teacherName?: string;
  status: RequestStatus;
  createdAt: string;
  amountSpent?: number;
  paymentMethod?: string;
  purchaseDate?: string;
  paymentNotes?: string;
  productLink?: string;
  productImage?: string;
};

type ExpenseRecord = {
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
```
