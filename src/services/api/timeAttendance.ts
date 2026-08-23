import { authedFetch, z } from "./common";

export type TimeReport = {
  reportId: string;
  employeeName: string;
  date?: string;
  checkInTime: string;
  checkOutTime?: string;
  timeWorked?: string;
  pendingCheckout: boolean;
};
export type TimeReportPerson = {
  externalEmployeeId: string;
  internalEmployeeId: string;
  employeeName: string;
};
export type TimeReportSetting = {
  settingId: string;
  reporterEmail: string;
  isDailyReportActive: boolean;
  isWeeklyReportActive: boolean;
  isBiWeeklyReportActive: boolean;
  isMonthlyReportActive: boolean;
  isBiMonthlyReportActive: boolean;
};
export type TimeReportSettingInput = Omit<TimeReportSetting, "settingId">;
export type TapTimeConnection = {
  schoolId: string;
  tapCompanyId: string;
  tapCompanyName: string;
  status: string;
  lastError?: string;
};
export type ReconciliationProposal = {
  employeeId: string;
  employeeName: string;
  entityType: string;
  role: string;
  matchType: "phone" | "email";
  matchValue: string;
  tapEmployeeId: string;
  tapEmployeeName: string;
  normalizedPhone: string;
};
export type SyncOutcome = {
  entityId: string;
  entityType: string;
  entityName: string;
  status: string;
  error?: string;
};
export type SyncResult = {
  processed: number;
  succeeded: number;
  failed: number;
  outcomes: SyncOutcome[];
};
export type TapTimeRoleLinkSummary = { total: number; linked: number };
export type TapTimeLinkedPerson = {
  entityId: string;
  entityType: string;
  role: string;
  personName: string;
  email: string;
  phoneNumber?: string;
  tapEmployeeId: string;
  tapEmployeeName?: string;
  syncStatus: string;
  linkedAt?: string;
};
export type TapTimeIntegrationDashboard = {
  overview: {
    tapTimePeopleTotal: number;
    employees: TapTimeRoleLinkSummary;
    admins: TapTimeRoleLinkSummary;
    superAdmins: TapTimeRoleLinkSummary;
    needsReview: number;
    failedSyncs: number;
  };
  linkedPeople: TapTimeLinkedPerson[];
  suggestions: ReconciliationProposal[];
};
export type TimeReportOverview = {
  reportDate: string;
  employeeCount: number;
  recordCount: number;
  completedCount: number;
  pendingCheckoutCount: number;
  workedMinutes: number;
};
export type SalaryPeriod = {
  label: string;
  startDate: string;
  endDate: string;
  employeeCount: number;
  workedMinutes: number;
};
export type ConsolidatedTimeReport = {
  externalEmployeeId: string;
  internalEmployeeId: string;
  employeeName: string;
  workedMinutes: number;
  totalTimeWorked: string;
};
export type DayTrend = TimeReportOverview;
export type TwoDayReport = {
  current: TimeReportOverview;
  previous: TimeReportOverview;
};
export type TapTimePins = Record<string, string>;
export type ConsolidatedReportSetting = { reportType?: string };
const report = z.object({
  report_id: z.string(),
  employee_name: z.string(),
  date: z.string().nullable().optional(),
  check_in_time: z.string(),
  check_out_time: z.string().nullable().optional(),
  time_worked: z.string().nullable().optional(),
  pending_checkout: z.boolean(),
});
const map = (value: z.infer<typeof report>): TimeReport => ({
  reportId: value.report_id,
  employeeName: value.employee_name,
  date: value.date || undefined,
  checkInTime: value.check_in_time,
  checkOutTime: value.check_out_time || undefined,
  timeWorked: value.time_worked || undefined,
  pendingCheckout: value.pending_checkout,
});
const reportSetting = z.object({
  setting_id: z.string(),
  reporter_email: z.string(),
  is_daily_report_active: z.boolean(),
  is_weekly_report_active: z.boolean(),
  is_bi_weekly_report_active: z.boolean(),
  is_monthly_report_active: z.boolean(),
  is_bi_monthly_report_active: z.boolean(),
});
const mapSetting = (
  value: z.infer<typeof reportSetting>,
): TimeReportSetting => ({
  settingId: value.setting_id,
  reporterEmail: value.reporter_email,
  isDailyReportActive: value.is_daily_report_active,
  isWeeklyReportActive: value.is_weekly_report_active,
  isBiWeeklyReportActive: value.is_bi_weekly_report_active,
  isMonthlyReportActive: value.is_monthly_report_active,
  isBiMonthlyReportActive: value.is_bi_monthly_report_active,
});
const settingPayload = (value: TimeReportSettingInput) => ({
  reporter_email: value.reporterEmail,
  is_daily_report_active: value.isDailyReportActive,
  is_weekly_report_active: value.isWeeklyReportActive,
  is_bi_weekly_report_active: value.isBiWeeklyReportActive,
  is_monthly_report_active: value.isMonthlyReportActive,
  is_bi_monthly_report_active: value.isBiMonthlyReportActive,
});
const connection = z.object({
  school_id: z.string(),
  tap_company_id: z.string(),
  tap_company_name: z.string(),
  status: z.string(),
  last_error: z.string().nullable().optional(),
});
const reconciliation = z.object({
  employee_id: z.string(),
  employee_name: z.string(),
  entity_type: z.string(),
  role: z.string(),
  match_type: z.enum(["phone", "email"]),
  match_value: z.string(),
  tap_employee_id: z.string(),
  tap_employee_name: z.string(),
  normalized_phone: z.string(),
});
const syncOutcome = z.object({
  entity_id: z.string(),
  entity_type: z.string(),
  entity_name: z.string(),
  status: z.string(),
  error: z.string().nullable().optional(),
});
const syncResult = z.object({
  processed: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  outcomes: z.array(syncOutcome),
});
const roleLinkSummary = z.object({ total: z.number(), linked: z.number() });
const linkedPerson = z.object({
  entity_id: z.string(), entity_type: z.string(), role: z.string(), person_name: z.string(), email: z.string(),
  phone_number: z.string().nullable().optional(), tap_employee_id: z.string(), tap_employee_name: z.string().nullable().optional(),
  sync_status: z.string(), linked_at: z.string().nullable().optional(),
});
const integrationDashboard = z.object({
  overview: z.object({
    tap_time_people_total: z.number(), employees: roleLinkSummary, admins: roleLinkSummary, super_admins: roleLinkSummary,
    needs_review: z.number(), failed_syncs: z.number(),
  }),
  linked_people: z.array(linkedPerson),
  suggestions: z.array(reconciliation),
});
const mapConnection = (
  value: z.infer<typeof connection>,
): TapTimeConnection => ({
  schoolId: value.school_id,
  tapCompanyId: value.tap_company_id,
  tapCompanyName: value.tap_company_name,
  status: value.status,
  lastError: value.last_error || undefined,
});
const mapReconciliation = (
  value: z.infer<typeof reconciliation>,
): ReconciliationProposal => ({
  employeeId: value.employee_id,
  employeeName: value.employee_name,
  entityType: value.entity_type,
  role: value.role,
  matchType: value.match_type,
  matchValue: value.match_value,
  tapEmployeeId: value.tap_employee_id,
  tapEmployeeName: value.tap_employee_name,
  normalizedPhone: value.normalized_phone,
});
const mapSyncOutcome = (value: z.infer<typeof syncOutcome>): SyncOutcome => ({
  entityId: value.entity_id,
  entityType: value.entity_type,
  entityName: value.entity_name,
  status: value.status,
  error: value.error || undefined,
});
const mapDashboard = (value: z.infer<typeof integrationDashboard>): TapTimeIntegrationDashboard => ({
  overview: {
    tapTimePeopleTotal: value.overview.tap_time_people_total,
    employees: value.overview.employees,
    admins: value.overview.admins,
    superAdmins: value.overview.super_admins,
    needsReview: value.overview.needs_review,
    failedSyncs: value.overview.failed_syncs,
  },
  linkedPeople: value.linked_people.map(person => ({
    entityId: person.entity_id, entityType: person.entity_type, role: person.role, personName: person.person_name,
    email: person.email, phoneNumber: person.phone_number || undefined, tapEmployeeId: person.tap_employee_id,
    tapEmployeeName: person.tap_employee_name || undefined, syncStatus: person.sync_status, linkedAt: person.linked_at || undefined,
  })),
  suggestions: value.suggestions.map(mapReconciliation),
});
const overview = z.object({
  report_date: z.string(),
  employee_count: z.number(),
  record_count: z.number(),
  completed_count: z.number(),
  pending_checkout_count: z.number(),
  worked_minutes: z.number(),
});
const salaryPeriod = z.object({
  label: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  employee_count: z.number(),
  worked_minutes: z.number(),
});
const consolidatedReport = z.object({
  external_employee_id: z.string(),
  internal_employee_id: z.string(),
  employee_name: z.string(),
  worked_minutes: z.number(),
  total_time_worked: z.string(),
});
const mapOverview = (value: z.infer<typeof overview>): TimeReportOverview => ({
  reportDate: value.report_date,
  employeeCount: value.employee_count,
  recordCount: value.record_count,
  completedCount: value.completed_count,
  pendingCheckoutCount: value.pending_checkout_count,
  workedMinutes: value.worked_minutes,
});
const mapSalary = (value: z.infer<typeof salaryPeriod>): SalaryPeriod => ({
  label: value.label,
  startDate: value.start_date,
  endDate: value.end_date,
  employeeCount: value.employee_count,
  workedMinutes: value.worked_minutes,
});
const mapConsolidated = (
  value: z.infer<typeof consolidatedReport>,
): ConsolidatedTimeReport => ({
  externalEmployeeId: value.external_employee_id,
  internalEmployeeId: value.internal_employee_id,
  employeeName: value.employee_name,
  workedMinutes: value.worked_minutes,
  totalTimeWorked: value.total_time_worked,
});

export const TimeAttendanceService = {
  async reports(
    schoolId: string,
    query: Record<string, string | undefined> = {},
  ) {
    const params = new URLSearchParams({
      school_id: schoolId,
      ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)),
    });
    return (
      await authedFetch(
        { method: "GET", url: `/time-attendance/reports?${params}` },
        z.array(report),
      )
    ).map(map);
  },
  async consolidatedReports(
    schoolId: string,
    startDate: string,
    endDate: string,
  ): Promise<ConsolidatedTimeReport[]> {
    const params = new URLSearchParams({
      school_id: schoolId,
      start_date: startDate,
      end_date: endDate,
    });
    return (
      await authedFetch(
        { method: "GET", url: `/time-attendance/consolidated?${params}` },
        z.array(consolidatedReport),
      )
    ).map(mapConsolidated);
  },
  async reportPeople(schoolId: string): Promise<TimeReportPerson[]> {
    return (
      await authedFetch(
        { method: "GET", url: `/time-attendance/report-people?school_id=${schoolId}` },
        z.array(z.object({
          external_employee_id: z.string(),
          internal_employee_id: z.string(),
          employee_name: z.string(),
        })),
      )
    ).map((person) => ({
      externalEmployeeId: person.external_employee_id,
      internalEmployeeId: person.internal_employee_id,
      employeeName: person.employee_name,
    }));
  },
  async createReport(
    schoolId: string,
    payload: { externalEmployeeId: string; reportDate: string; checkInTime: string; checkOutTime?: string; reason: string },
  ) {
    return map(
      await authedFetch(
        {
          method: "POST",
          url: `/time-attendance/reports?school_id=${schoolId}`,
          body: {
            external_employee_id: payload.externalEmployeeId,
            report_date: payload.reportDate,
            check_in_time: payload.checkInTime,
            check_out_time: payload.checkOutTime,
            reason: payload.reason,
          },
        },
        report,
      ),
    );
  },
  async overview(schoolId: string, reportDate?: string) {
    return mapOverview(
      await authedFetch(
        {
          method: "GET",
          url: `/time-attendance/overview?school_id=${schoolId}${reportDate ? `&report_date=${reportDate}` : ""}`,
        },
        overview,
      ),
    );
  },
  async twoDay(schoolId: string, reportDate?: string) {
    const value = await authedFetch(
      {
        method: "GET",
        url: `/time-attendance/two-day?school_id=${schoolId}${reportDate ? `&report_date=${reportDate}` : ""}`,
      },
      z.object({ current: overview, previous: overview }),
    );
    return {
      current: mapOverview(value.current),
      previous: mapOverview(value.previous),
    };
  },
  async salary(schoolId: string, anchorDate?: string) {
    return (
      await authedFetch(
        {
          method: "GET",
          url: `/time-attendance/salary?school_id=${schoolId}${anchorDate ? `&anchor_date=${anchorDate}` : ""}`,
        },
        z.array(salaryPeriod),
      )
    ).map(mapSalary);
  },
  async dayTrends(schoolId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams({
      school_id: schoolId,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    });
    return (
      await authedFetch(
        { method: "GET", url: `/time-attendance/day-trends?${params}` },
        z.array(overview),
      )
    ).map(mapOverview);
  },
  async consolidatedReportSetting(schoolId: string): Promise<ConsolidatedReportSetting> {
    const value = await authedFetch(
      { method: "GET", url: `/time-attendance/consolidated-report-setting?school_id=${schoolId}` },
      z.object({ report_type: z.string().nullable().optional() }),
    );
    return { reportType: value.report_type || undefined };
  },
  async updateConsolidatedReportSetting(schoolId: string, reportType: string): Promise<ConsolidatedReportSetting> {
    const value = await authedFetch(
      { method: "PUT", url: `/time-attendance/consolidated-report-setting?school_id=${schoolId}`, body: { report_type: reportType } },
      z.object({ report_type: z.string().nullable().optional() }),
    );
    return { reportType: value.report_type || undefined };
  },
  async myDaily(reportDate?: string) {
    return (
      await authedFetch(
        {
          method: "GET",
          url: `/me/time-attendance/daily${reportDate ? `?report_date=${reportDate}` : ""}`,
        },
        z.array(report),
      )
    ).map(map);
  },
  async setMyPin(pin: string) {
    await authedFetch(
      { method: "POST", url: "/me/time-attendance/pin", body: { pin } },
      z.any(),
    );
  },
  async myPin() {
    return (
      (
        await authedFetch(
          { method: "GET", url: "/me/time-attendance/pin" },
          z.object({ pin: z.string().nullable().optional() }),
        )
      ).pin || undefined
    );
  },
  async setEmployeePin(schoolId: string, employeeId: string, pin: string) {
    await authedFetch(
      {
        method: "POST",
        url: `/employees/${employeeId}/tap-time-pin`,
        body: { school_id: schoolId, pin },
      },
      z.any(),
    );
  },
  async employeePin(schoolId: string, employeeId: string) {
    return (
      (
        await authedFetch(
          {
            method: "GET",
            url: `/employees/${employeeId}/tap-time-pin?school_id=${schoolId}`,
          },
          z.object({ pin: z.string().nullable().optional() }),
        )
      ).pin || undefined
    );
  },
  async setAdminPin(schoolId: string, userId: string, pin: string) {
    await authedFetch(
      {
        method: "POST",
        url: `/admins/${userId}/tap-time-pin`,
        body: { school_id: schoolId, pin },
      },
      z.any(),
    );
  },
  async adminPin(schoolId: string, userId: string) {
    return (
      (
        await authedFetch(
          {
            method: "GET",
            url: `/admins/${userId}/tap-time-pin?school_id=${schoolId}`,
          },
          z.object({ pin: z.string().nullable().optional() }),
        )
      ).pin || undefined
    );
  },
  async pins(schoolId: string): Promise<TapTimePins> {
    return (
      await authedFetch(
        { method: "GET", url: `/tap-time/pins?school_id=${schoolId}` },
        z.object({ pins: z.record(z.string(), z.string()) }),
      )
    ).pins;
  },
  async updateReport(
    schoolId: string,
    reportId: string,
    payload: { checkInTime: string; checkOutTime?: string; reason: string },
  ) {
    return map(
      await authedFetch(
        {
          method: "PATCH",
          url: `/time-attendance/reports/${reportId}?school_id=${schoolId}`,
          body: {
            check_in_time: payload.checkInTime,
            check_out_time: payload.checkOutTime,
            reason: payload.reason,
          },
        },
        report,
      ),
    );
  },
  async deleteReport(schoolId: string, reportId: string, reason: string) {
    await authedFetch(
      {
        method: "DELETE",
        url: `/time-attendance/reports/${reportId}?school_id=${schoolId}&reason=${encodeURIComponent(reason)}`,
      },
      z.any(),
    );
  },
  async reportSettings(schoolId: string) {
    return (
      await authedFetch(
        {
          method: "GET",
          url: `/time-attendance/report-settings?school_id=${schoolId}`,
        },
        z.array(reportSetting),
      )
    ).map(mapSetting);
  },
  async createReportSetting(schoolId: string, payload: TimeReportSettingInput) {
    return mapSetting(
      await authedFetch(
        {
          method: "POST",
          url: `/time-attendance/report-settings?school_id=${schoolId}`,
          body: settingPayload(payload),
        },
        reportSetting,
      ),
    );
  },
  async updateReportSetting(
    schoolId: string,
    settingId: string,
    payload: TimeReportSettingInput,
  ) {
    return mapSetting(
      await authedFetch(
        {
          method: "PATCH",
          url: `/time-attendance/report-settings/${settingId}?school_id=${schoolId}`,
          body: settingPayload(payload),
        },
        reportSetting,
      ),
    );
  },
  async deleteReportSetting(schoolId: string, settingId: string) {
    await authedFetch(
      {
        method: "DELETE",
        url: `/time-attendance/report-settings/${settingId}?school_id=${schoolId}`,
      },
      z.any(),
    );
  },
  async connection(schoolId: string) {
    const result = await authedFetch(
      { method: "GET", url: `/tap-time/connections?school_id=${schoolId}` },
      connection.nullable(),
    );
    return result ? mapConnection(result) : null;
  },
  async connect(schoolId: string, connectionCode: string) {
    return mapConnection(
      await authedFetch(
        {
          method: "POST",
          url: "/tap-time/connections",
          body: { school_id: schoolId, connection_code: connectionCode },
        },
        connection,
      ),
    );
  },
  async disconnect(schoolId: string) {
    return mapConnection(
      await authedFetch(
        { method: "DELETE", url: `/tap-time/connections/${schoolId}` },
        connection,
      ),
    );
  },
  async retrySync(schoolId: string): Promise<SyncResult> {
    const result = await authedFetch(
      { method: "POST", url: `/tap-time/connections/${schoolId}/retry-sync` },
      syncResult,
    );
    return {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      outcomes: result.outcomes.map(mapSyncOutcome),
    };
  },
  async reconciliation(schoolId: string) {
    return (
      await authedFetch(
        {
          method: "GET",
          url: `/tap-time/connections/${schoolId}/reconciliation`,
        },
        z.array(reconciliation),
      )
    ).map(mapReconciliation);
  },
  async dashboard(schoolId: string): Promise<TapTimeIntegrationDashboard> {
    return mapDashboard(await authedFetch(
      { method: "GET", url: `/tap-time/connections/${schoolId}/dashboard` },
      integrationDashboard,
    ));
  },
  async confirmReconciliation(schoolId: string, value: ReconciliationProposal) {
    await authedFetch(
      {
        method: "POST",
        url: `/tap-time/connections/${schoolId}/reconciliation`,
        body: {
          employee_id: value.employeeId,
          tap_employee_id: value.tapEmployeeId,
          entity_type: value.entityType,
        },
      },
      z.any(),
    );
  },
};
