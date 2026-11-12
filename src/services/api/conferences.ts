import { authedFetch, z } from './common';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClassroomTag {
  classroom_id: string;
  classroom_name: string;
}

export interface ConferenceListItem {
  id: string;
  school_id: string;
  title: string;
  description: string;
  conference_date: string;    // "YYYY-MM-DD"
  image_url: string | null;
  booking_close_at: string | null;
  status: 'active' | 'expired';
  classroom_tags: ClassroomTag[];
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  created_at: string;
}

export interface SlotDetail {
  id: string;
  start_time: string;   // "HH:MM"
  end_time: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
  my_booking_id: string | null;
}

export interface ClassroomSlotsResponse {
  classroom_id: string;
  classroom_name: string;
  slots: SlotDetail[];
}

export interface ConferenceDetail extends ConferenceListItem {
  classrooms_detail: ClassroomSlotsResponse[];
}

export interface BookingListItem {
  id: string;
  conference_id: string;
  conference_title: string;
  conference_date: string;
  image_url: string | null;
  slot_id: string;
  slot_start: string;
  slot_end: string;
  child_id: string;
  child_name: string;
  classroom_id: string;
  classroom_name: string;
  booked_at: string;
  status: string;
}

export interface BookingInfo {
  booking_id: string;
  parent_name: string;
  parent_email: string;
  child_id: string;
  child_name: string;
  booked_at: string;
}

export interface UnbookedParent {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  child_id: string;
  child_name: string;
}

export interface SlotReport {
  slot_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available: number;
  bookings: BookingInfo[];
}

export interface ClassroomReport {
  classroom_id: string;
  classroom_name: string;
  student_count: number;
  unbooked_count: number;
  slots: SlotReport[];
  unbooked_parents: UnbookedParent[];
}

export interface ConferenceReportResponse {
  conference: ConferenceListItem;
  report: ClassroomReport[];
}

export interface ConferenceStats {
  total_conferences: number;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface SlotInput {
  id?: string;        // present for existing slots being updated
  start_time: string;
  end_time: string;
  capacity: number;
}

export interface ClassroomSlotsInput {
  classroom_id: string;
  slots: SlotInput[];
}

export interface CreateConferencePayload {
  school_id: string;
  school_subdomain?: string;
  title: string;
  description: string;
  conference_date: string;  // "YYYY-MM-DD"
  image_url?: string | null;
  image_data?: string | null;   // base64-encoded image (no data-URL prefix); backend uploads to S3
  booking_close_at?: string | null;
  classrooms: ClassroomSlotsInput[];
}

export interface UpdateConferencePayload {
  title?: string;
  description?: string;
  conference_date?: string;
  image_url?: string | null;
  booking_close_at?: string | null;
  classrooms?: ClassroomSlotsInput[];
}

export interface BookSlotPayload {
  conference_id: string;
  slot_id: string;
  child_id: string;
  school_id: string;
}

export interface UpdateBookingPayload {
  slot_id: string;
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ClassroomTagSchema = z.object({
  classroom_id: z.string(),
  classroom_name: z.string(),
});

const ConferenceListItemSchema = z.object({
  id: z.string(),
  school_id: z.string(),
  title: z.string(),
  description: z.string(),
  conference_date: z.string(),
  image_url: z.string().nullable(),
  booking_close_at: z.string().nullable(),
  status: z.string(),
  classroom_tags: z.array(ClassroomTagSchema),
  total_slots: z.number(),
  booked_slots: z.number(),
  available_slots: z.number(),
  created_at: z.string(),
});

const SlotDetailSchema = z.object({
  id: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  capacity: z.number(),
  booked_count: z.number(),
  is_available: z.boolean(),
  my_booking_id: z.string().nullable(),
});

const ClassroomSlotsResponseSchema = z.object({
  classroom_id: z.string(),
  classroom_name: z.string(),
  slots: z.array(SlotDetailSchema),
});

const ConferenceDetailSchema = ConferenceListItemSchema.extend({
  classrooms_detail: z.array(ClassroomSlotsResponseSchema),
});

const BookingListItemSchema = z.object({
  id: z.string(),
  conference_id: z.string(),
  conference_title: z.string(),
  conference_date: z.string(),
  image_url: z.string().nullable(),
  slot_id: z.string(),
  slot_start: z.string(),
  slot_end: z.string(),
  child_id: z.string(),
  child_name: z.string(),
  classroom_id: z.string(),
  classroom_name: z.string(),
  booked_at: z.string(),
  status: z.string(),
});

const ConferenceStatsSchema = z.object({
  total_conferences: z.number(),
  total_slots: z.number(),
  booked_slots: z.number(),
  available_slots: z.number(),
});

const ConferenceReportSchema = z.object({
  conference: ConferenceListItemSchema,
  report: z.array(z.object({
    classroom_id: z.string(),
    classroom_name: z.string(),
    student_count: z.number(),
    unbooked_count: z.number(),
    slots: z.array(z.object({
      slot_id: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      capacity: z.number(),
      booked_count: z.number(),
      available: z.number(),
      bookings: z.array(z.object({
        booking_id: z.string(),
        parent_name: z.string(),
        parent_email: z.string(),
        child_id: z.string(),
        child_name: z.string(),
        booked_at: z.string(),
      })),
    })),
    unbooked_parents: z.array(z.object({
      parent_id: z.string(),
      parent_name: z.string(),
      parent_email: z.string(),
      child_id: z.string(),
      child_name: z.string(),
    })),
  })),
});

// ── API functions ─────────────────────────────────────────────────────────────

const q = (values: Record<string, string | number | boolean | undefined | null>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return params.toString();
};

/** Admin: list all conferences */
export const listConferences = (schoolId: string): Promise<ConferenceListItem[]> =>
  authedFetch(
    { method: 'GET', url: `/conferences?school_id=${schoolId}` },
    z.array(ConferenceListItemSchema),
  ) as Promise<ConferenceListItem[]>;

/** Admin: summary stats */
export const getConferenceStats = (schoolId: string): Promise<ConferenceStats> =>
  authedFetch(
    { method: 'GET', url: `/conferences/stats?school_id=${schoolId}` },
    ConferenceStatsSchema,
  ) as Promise<ConferenceStats>;

/** Admin: create conference */
export const createConference = (payload: CreateConferencePayload): Promise<ConferenceListItem> =>
  authedFetch(
    { method: 'POST', url: '/conferences', body: payload },
    ConferenceListItemSchema,
  ) as Promise<ConferenceListItem>;

/** Admin/any: get conference detail */
export const getConference = (id: string): Promise<ConferenceDetail> =>
  authedFetch(
    { method: 'GET', url: `/conferences/${id}` },
    ConferenceDetailSchema,
  ) as Promise<ConferenceDetail>;

/** Admin: update conference */
export const updateConference = (id: string, payload: UpdateConferencePayload): Promise<ConferenceListItem> =>
  authedFetch(
    { method: 'PATCH', url: `/conferences/${id}`, body: payload },
    ConferenceListItemSchema,
  ) as Promise<ConferenceListItem>;

/** Admin: delete conference */
export const deleteConference = (id: string): Promise<void> =>
  authedFetch({ method: 'DELETE', url: `/conferences/${id}` }, z.any()) as Promise<void>;

/** Admin: get conference report */
export const getConferenceReport = (id: string): Promise<ConferenceReportResponse> =>
  authedFetch(
    { method: 'GET', url: `/conferences/${id}/report` },
    ConferenceReportSchema,
  ) as Promise<ConferenceReportResponse>;

/** Admin: send reminders to all unbooked parents */
export const sendConferenceReminders = (id: string): Promise<{ reminders_sent: number }> =>
  authedFetch(
    { method: 'POST', url: `/conferences/${id}/remind` },
    z.object({ reminders_sent: z.number() }),
  ) as Promise<{ reminders_sent: number }>;

/** Admin: send reminder to a single parent */
export const sendConferenceReminderToParent = (id: string, parentEmail: string): Promise<{ reminders_sent: number }> =>
  authedFetch(
    { method: 'POST', url: `/conferences/${id}/remind`, body: { parent_email: parentEmail } },
    z.object({ reminders_sent: z.number() }),
  ) as Promise<{ reminders_sent: number }>;

/** Parent: list available conferences for their children */
export const listMyConferences = (schoolId: string, childId?: string): Promise<ConferenceListItem[]> =>
  authedFetch(
    { method: 'GET', url: `/my-conferences?${q({ school_id: schoolId, child_id: childId })}` },
    z.array(ConferenceListItemSchema),
  ) as Promise<ConferenceListItem[]>;

/** Parent: get slots for a specific classroom in a conference */
export const getConferenceSlots = (conferenceId: string, classroomId: string): Promise<SlotDetail[]> =>
  authedFetch(
    { method: 'GET', url: `/conferences/${conferenceId}/slots?classroom_id=${classroomId}` },
    z.array(SlotDetailSchema),
  ) as Promise<SlotDetail[]>;

/** Parent: book a slot */
export const bookSlot = (payload: BookSlotPayload): Promise<BookingListItem> =>
  authedFetch(
    { method: 'POST', url: '/conference-bookings', body: payload },
    BookingListItemSchema,
  ) as Promise<BookingListItem>;

/** Parent: list own bookings */
export const listMyBookings = (schoolId: string): Promise<BookingListItem[]> =>
  authedFetch(
    { method: 'GET', url: `/my-conference-bookings?school_id=${schoolId}` },
    z.array(BookingListItemSchema),
  ) as Promise<BookingListItem[]>;

/** Parent: change slot */
export const updateBooking = (bookingId: string, payload: UpdateBookingPayload): Promise<BookingListItem> =>
  authedFetch(
    { method: 'PATCH', url: `/conference-bookings/${bookingId}`, body: payload },
    BookingListItemSchema,
  ) as Promise<BookingListItem>;

/** Parent: cancel booking */
export const cancelBooking = (bookingId: string): Promise<void> =>
  authedFetch({ method: 'DELETE', url: `/conference-bookings/${bookingId}` }, z.any()) as Promise<void>;
