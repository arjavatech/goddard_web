import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Clock3,
  Edit3,
  LayoutGrid,
  List,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useUserContext } from "../../contexts/UserContext";
import {
  TimeAttendanceService,
  type ConsolidatedReportSetting,
  type ConsolidatedTimeReport,
  type TimeReport,
  type TimeReportPerson,
  type TimeReportSetting,
  type TimeReportSettingInput,
} from "../../services/api/timeAttendance";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DataGrid, type ColumnDef } from "../../components/ui/data-grid";
import { SortDropdown, sortItems } from "../../components/ui/sort-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { usePagination } from "../../hooks/usePagination";
import { usePageSize } from "../../hooks/usePageSize";
import { useToast } from "../../contexts/ToastContext";

const today = () => new Date().toISOString().slice(0, 10);
const blankRecipient: TimeReportSettingInput = {
  reporterEmail: "",
  isDailyReportActive: true,
  isWeeklyReportActive: false,
  isBiWeeklyReportActive: false,
  isMonthlyReportActive: false,
  isBiMonthlyReportActive: false,
};
const scheduleFields = [
  ["isDailyReportActive", "Daily"],
  ["isWeeklyReportActive", "Weekly"],
  ["isBiWeeklyReportActive", "Bi-weekly"],
  ["isMonthlyReportActive", "Monthly"],
  ["isBiMonthlyReportActive", "Bi-monthly"],
] as const;
const frequencyOptions = [
  "Daily",
  "Weekly",
  "Biweekly",
  "Monthly",
  "Bimonthly",
];
type ReportView = "daily" | "range" | "salary" | "pending";
type ViewMode = "table" | "card";
type SalaryReportType = "Weekly" | "Biweekly" | "Monthly" | "Bimonthly";

const toIsoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const weeksInMonth = (year: number, month: number) => {
  const lastDay = new Date(year, month, 0);
  const current = new Date(year, month - 1, 1);
  while (current.getDay() !== 1 && current <= lastDay) current.setDate(current.getDate() + 1);
  const weeks: { label: string; startDate: string; endDate: string }[] = [];
  while (current <= lastDay) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    const actualEnd = end > lastDay ? lastDay : end;
    weeks.push({
      label: `Week ${weeks.length + 1}: ${start.getDate()} ${start.toLocaleString("default", { month: "short" })} – ${actualEnd.getDate()} ${actualEnd.toLocaleString("default", { month: "short" })}`,
      startDate: toIsoDate(start),
      endDate: toIsoDate(actualEnd),
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
const toTimeInput = (value?: string) => (value ? value.slice(11, 16) : "");
const toReportDateTime = (reportDate: string, time: string) =>
  `${reportDate}T${time}:00`;
const formatHours = (minutes = 0) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const formatWorkedTime = (value?: string) => {
  if (!value) return "—";
  const [hours, minutes] = value.split(":");
  if (hours === undefined || minutes === undefined) return value;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};
const frequencies = (value: TimeReportSetting | TimeReportSettingInput) =>
  scheduleFields.filter(([key]) => value[key]).map(([, label]) => label);
const consolidatedLabel = (value?: string) =>
  ({
    Daily: "Daily",
    Weekly: "Weekly",
    Biweekly: "Bi-weekly",
    Monthly: "Monthly",
    Bimonthly: "Bi-monthly",
  })[value || ""] || "Not configured";

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Table view"
        onClick={() => onChange("table")}
        className={`h-9 rounded-lg px-3 ${viewMode === "table" ? "bg-[#0F2D52] text-white hover:bg-[#163c69] hover:text-white" : "text-slate-500"}`}
      >
        <List className="mr-2 h-4 w-4" />
        Table View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Card view"
        onClick={() => onChange("card")}
        className={`h-9 rounded-lg px-3 ${viewMode === "card" ? "bg-[#0F2D52] text-white hover:bg-[#163c69] hover:text-white" : "text-slate-500"}`}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Card View
      </Button>
    </div>
  );
}

function SettingsPanel({ schoolId }: { schoolId?: string }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TimeReportSetting[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedReportSetting>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("email");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>(
    () =>
      (localStorage.getItem("timeAttendanceSettingsView") as ViewMode) ||
      "table",
  );
  const [itemsPerPage, setItemsPerPage] = usePageSize(
    "time-attendance-settings",
    10,
  );
  const [recipientDialog, setRecipientDialog] = useState(false);
  const [editing, setEditing] = useState<TimeReportSetting>();
  const [recipient, setRecipient] =
    useState<TimeReportSettingInput>(blankRecipient);
  const [removeTarget, setRemoveTarget] = useState<TimeReportSetting>();
  const [consolidatedDialog, setConsolidatedDialog] = useState(false);
  const [consolidatedDraft, setConsolidatedDraft] = useState("Weekly");
  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [saved, frequency] = await Promise.all([
        TimeAttendanceService.reportSettings(schoolId),
        TimeAttendanceService.consolidatedReportSetting(schoolId),
      ]);
      setSettings(saved);
      setConsolidated(frequency);
    } catch {
      showToast("error", "Unable to load report settings.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [schoolId]);
  const filtered = useMemo(
    () =>
      sortItems(
        settings.filter((item) =>
          `${item.reporterEmail} ${frequencies(item).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
        sortBy,
        sortOrder,
        (item, key) =>
          key === "frequency"
            ? frequencies(item).join(" ")
            : item.reporterEmail,
      ),
    [settings, search, sortBy, sortOrder],
  );
  const { currentPage, totalPages, paginatedData, setCurrentPage } =
    usePagination({ data: filtered, itemsPerPage });
  const setMode = (mode: ViewMode) => {
    localStorage.setItem("timeAttendanceSettingsView", mode);
    setViewMode(mode);
  };
  const openCreate = () => {
    setEditing(undefined);
    setRecipient(blankRecipient);
    setRecipientDialog(true);
  };
  const openEdit = (value: TimeReportSetting) => {
    setEditing(value);
    setRecipient({
      reporterEmail: value.reporterEmail,
      isDailyReportActive: value.isDailyReportActive,
      isWeeklyReportActive: value.isWeeklyReportActive,
      isBiWeeklyReportActive: value.isBiWeeklyReportActive,
      isMonthlyReportActive: value.isMonthlyReportActive,
      isBiMonthlyReportActive: value.isBiMonthlyReportActive,
    });
    setRecipientDialog(true);
  };
  const saveRecipient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId) return;
    const chosen = frequencies(recipient);
    if (!chosen.length || chosen.length > 2) {
      showToast("error", "Select one or two report frequencies.");
      return;
    }
    setSaving(true);
    try {
      if (editing)
        await TimeAttendanceService.updateReportSetting(
          schoolId,
          editing.settingId,
          recipient,
        );
      else await TimeAttendanceService.createReportSetting(schoolId, recipient);
      showToast(
        "success",
        editing ? "Report recipient updated." : "Report recipient added.",
      );
      setRecipientDialog(false);
      await load();
    } catch {
      showToast("error", "Unable to save the report recipient.");
    } finally {
      setSaving(false);
    }
  };
  const removeRecipient = async () => {
    if (!schoolId || !removeTarget) return;
    setSaving(true);
    try {
      await TimeAttendanceService.deleteReportSetting(
        schoolId,
        removeTarget.settingId,
      );
      showToast("success", "Report recipient removed.");
      setRemoveTarget(undefined);
      await load();
    } catch {
      showToast("error", "Unable to remove the report recipient.");
    } finally {
      setSaving(false);
    }
  };
  const saveConsolidated = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      setConsolidated(
        await TimeAttendanceService.updateConsolidatedReportSetting(
          schoolId,
          consolidatedDraft,
        ),
      );
      showToast("success", "Consolidated report frequency updated.");
      setConsolidatedDialog(false);
    } catch {
      showToast("error", "Unable to update the consolidated frequency.");
    } finally {
      setSaving(false);
    }
  };
  const actions = (item: TimeReportSetting) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-400"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl bg-white">
        <DropdownMenuItem onClick={() => openEdit(item)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => setRemoveTarget(item)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const columns: ColumnDef<TimeReportSetting>[] = [
    {
      id: "email",
      header: "Email Address",
      className: "w-1/2",
      cell: (item) => (
        <span className="font-semibold text-slate-800">
          {item.reporterEmail}
        </span>
      ),
    },
    {
      id: "frequency",
      header: "Frequency",
      className: "w-1/3",
      cell: (item) => (
        <div className="flex flex-wrap gap-1.5">
          {frequencies(item).map((label) => (
            <span
              key={label}
              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
            >
              {label}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-20 text-right",
      hideInCardBody: true,
      cell: actions,
    },
  ];
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F2D52]">
            Report Settings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure email notifications and report frequencies.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
            className="rounded-xl"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            className="bg-[#0F2D52] text-white hover:bg-[#163c69]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Setting
          </Button>
        </div>
      </div>
      <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EFF5FB] p-2.5 text-[#0F2D52]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Email Report Settings
              </h3>
              <p className="text-sm text-slate-500">
                Configure email addresses and their report frequencies.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search email settings..."
                className="h-10 rounded-xl border-slate-200 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <SortDropdown
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                options={[
                  { label: "Email (A–Z)", sortBy: "email", sortOrder: "asc" },
                  { label: "Email (Z–A)", sortBy: "email", sortOrder: "desc" },
                  {
                    label: "Frequency (A–Z)",
                    sortBy: "frequency",
                    sortOrder: "asc",
                  },
                  {
                    label: "Frequency (Z–A)",
                    sortBy: "frequency",
                    sortOrder: "desc",
                  },
                ]}
                labels={{ email: "Email", frequency: "Frequency" }}
                onSort={(by, order) => {
                  setSortBy(by);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl"
              />
              <ViewToggle viewMode={viewMode} onChange={setMode} />
            </div>
          </div>
          <DataGrid
            data={paginatedData}
            columns={columns}
            viewMode={viewMode}
            loading={loading}
            loadingMessage="Loading report settings..."
            emptyMessage="No report recipients found."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            tableLayout="auto"
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            renderCard={(item) => (
              <Card
                key={item.settingId}
                className="rounded-2xl border-slate-100 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="break-all font-bold text-slate-900">
                    {item.reporterEmail}
                  </p>
                  {actions(item)}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {frequencies(item).map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          />
        </div>
      </Card>
      <Card className="mt-6 overflow-hidden rounded-2xl border-slate-100 shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EFF5FB] p-2.5 text-[#0F2D52]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Email Consolidated Report Settings
              </h3>
              <p className="text-sm text-slate-500">
                Choose when the school’s consolidated report is sent.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            {consolidatedLabel(consolidated.reportType)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setConsolidatedDraft(consolidated.reportType || "Weekly");
              setConsolidatedDialog(true);
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </Card>
      <Dialog
        open={recipientDialog}
        onOpenChange={(open) => !saving && setRecipientDialog(open)}
      >
        <DialogContent className="w-[95vw] max-w-lg rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Report Recipient" : "Add Report Recipient"}
            </DialogTitle>
            <DialogDescription>
              Choose up to two report frequencies for this email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRecipient} className="mt-4 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">
              Email Address
              <Input
                required
                type="email"
                value={recipient.reporterEmail}
                onChange={(event) =>
                  setRecipient((value) => ({
                    ...value,
                    reporterEmail: event.target.value,
                  }))
                }
                placeholder="name@example.com"
                className="mt-2 h-10 rounded-xl"
              />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">
                Report Frequencies
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {scheduleFields.map(([key, label]) => {
                  const disabled =
                    !recipient[key] && frequencies(recipient).length >= 2;
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 text-sm ${disabled ? "text-slate-400" : "text-slate-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={recipient[key]}
                        disabled={disabled}
                        onChange={() =>
                          setRecipient((value) => ({
                            ...value,
                            [key]: !value[key],
                          }))
                        }
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setRecipientDialog(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                type="submit"
                className="bg-[#0F2D52] text-white hover:bg-[#163c69]"
              >
                {editing ? "Save Changes" : "Add Recipient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && !saving && setRemoveTarget(undefined)}
      >
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle>Remove Report Recipient?</DialogTitle>
            <DialogDescription>
              {removeTarget?.reporterEmail} will no longer receive scheduled
              reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setRemoveTarget(undefined)}
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() => void removeRecipient()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={consolidatedDialog}
        onOpenChange={(open) => !saving && setConsolidatedDialog(open)}
      >
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle>Consolidated Report Frequency</DialogTitle>
            <DialogDescription>
              Select when this school receives its consolidated time report.
            </DialogDescription>
          </DialogHeader>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Frequency
            <select
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={consolidatedDraft}
              onChange={(event) => setConsolidatedDraft(event.target.value)}
            >
              {frequencyOptions.map((option) => (
                <option value={option} key={option}>
                  {consolidatedLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setConsolidatedDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() => void saveConsolidated()}
              className="bg-[#0F2D52] text-white hover:bg-[#163c69]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function TimeAttendance() {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;
  const { showToast } = useToast();
  const [tab, setTab] = useState<"summary" | "settings">("summary");
  const [view, setView] = useState<ReportView>("daily");
  const [reportDate, setReportDate] = useState(today());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reports, setReports] = useState<TimeReport[]>([]);
  const [consolidatedReports, setConsolidatedReports] = useState<ConsolidatedTimeReport[]>([]);
  const [rangeLoaded, setRangeLoaded] = useState(false);
  const [salaryLoaded, setSalaryLoaded] = useState(false);
  const [salaryType, setSalaryType] = useState<SalaryReportType>("Weekly");
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryWeekIndex, setSalaryWeekIndex] = useState(0);
  const [salaryHalf, setSalaryHalf] = useState<"first" | "second">("first");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("checkIn");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(
    () =>
      (localStorage.getItem("timeAttendanceReportsView") as ViewMode) ||
      "table",
  );
  const [itemsPerPage, setItemsPerPage] = usePageSize(
    "time-attendance-reports",
    10,
  );
  const [editing, setEditing] = useState<TimeReport>();
  const [editReportDate, setEditReportDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<TimeReport>();
  const [reportPeople, setReportPeople] = useState<TimeReportPerson[]>([]);
  const [createDialog, setCreateDialog] = useState(false);
  const [newPersonId, setNewPersonId] = useState("");
  const [newReportDate, setNewReportDate] = useState(today());
  const [newCheckInTime, setNewCheckInTime] = useState("");
  const [newCheckOutTime, setNewCheckOutTime] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);
  const availableWeeks = useMemo(() => weeksInMonth(salaryYear, salaryMonth), [salaryYear, salaryMonth]);
  const salaryRange = useMemo(() => {
    if (salaryType === "Biweekly") {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }
    if (salaryType === "Weekly") return availableWeeks[salaryWeekIndex];
    const lastDay = new Date(salaryYear, salaryMonth, 0).getDate();
    if (salaryType === "Monthly") return { startDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-01`, endDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
    return salaryHalf === "first"
      ? { startDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-01`, endDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-15` }
      : { startDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-16`, endDate: `${salaryYear}-${String(salaryMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
  }, [salaryType, salaryYear, salaryMonth, salaryWeekIndex, salaryHalf, availableWeeks]);
  const loadReports = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      if (["daily", "pending"].includes(view))
        setReports(
          await TimeAttendanceService.reports(schoolId, {
            report_date: view === "daily" ? reportDate : undefined,
            pending_checkout: view === "pending" ? "true" : undefined,
          }),
        );
    } catch {
      showToast("error", "Unable to load time reports.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (tab === "summary" && ["daily", "pending"].includes(view)) void loadReports();
  }, [schoolId, tab, view, reportDate]);
  const loadConsolidated = async (period: { startDate: string; endDate: string }, kind: "range" | "salary") => {
    if (!schoolId || !period.startDate || !period.endDate) return;
    if (period.startDate > period.endDate) {
      showToast("error", "End date must be on or after the start date.");
      return;
    }
    setLoading(true);
    try {
      setConsolidatedReports(await TimeAttendanceService.consolidatedReports(schoolId, period.startDate, period.endDate));
      if (kind === "range") setRangeLoaded(true);
      else setSalaryLoaded(true);
      setCurrentPage(1);
    } catch {
      showToast("error", "Unable to load the consolidated report.");
    } finally {
      setLoading(false);
    }
  };
  const rawData = ["salary", "range"].includes(view) ? consolidatedReports : reports;
  const filtered = useMemo(
    () =>
      sortItems(
        (rawData as any[]).filter((item) =>
          JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
        ),
        sortBy,
        sortOrder,
        (item, key) =>
          key === "name"
            ? item.employeeName || ""
            : key === "checkIn"
              ? item.checkInTime || ""
              : key === "hours"
                ? item.workedMinutes || 0
                : item.date || "",
      ),
    [rawData, search, sortBy, sortOrder],
  );
  const { currentPage, totalPages, paginatedData, setCurrentPage } =
    usePagination({ data: filtered, itemsPerPage });
  const setMode = (mode: ViewMode) => {
    localStorage.setItem("timeAttendanceReportsView", mode);
    setViewMode(mode);
  };
  const editReport = async () => {
    if (!schoolId || !editing || !checkInTime || !reason.trim()) return;
    const selectedReportDate = editReportDate || editing.date || reportDate;
    const checkInDateTime = toReportDateTime(selectedReportDate, checkInTime);
    const checkOutDateTime = checkOutTime
      ? toReportDateTime(selectedReportDate, checkOutTime)
      : undefined;
    if (
      checkOutDateTime &&
      new Date(checkOutDateTime).getTime() - new Date(checkInDateTime).getTime() < 60_000
    ) {
      showToast(
        "error",
        "Check-out time must be at least one minute later than check-in time.",
      );
      return;
    }
    setSaving(true);
    try {
      await TimeAttendanceService.updateReport(schoolId, editing.reportId, {
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        reason,
      });
      showToast("success", "Time report updated.");
      setEditing(undefined);
      await loadReports();
    } catch {
      showToast("error", "Unable to update this report.");
    } finally {
      setSaving(false);
    }
  };
  const deleteReport = async () => {
    if (!schoolId || !deleting || !reason.trim()) return;
    setSaving(true);
    try {
      await TimeAttendanceService.deleteReport(
        schoolId,
        deleting.reportId,
        reason,
      );
      showToast("success", "Time report deleted.");
      setDeleting(undefined);
      await loadReports();
    } catch {
      showToast("error", "Unable to delete this report.");
    } finally {
      setSaving(false);
    }
  };
  const openCreateReport = async () => {
    if (!schoolId) return;
    try {
      const people = await TimeAttendanceService.reportPeople(schoolId);
      setReportPeople(people);
      setNewPersonId(people[0]?.externalEmployeeId || "");
      setNewReportDate(view === "daily" ? reportDate : today());
      setNewCheckInTime("");
      setNewCheckOutTime("");
      setNewReason("");
      setCreateDialog(true);
    } catch {
      showToast("error", "Unable to load people for a new report.");
    }
  };
  const createReport = async () => {
    if (!schoolId || !newPersonId || !newCheckInTime || !newReason.trim()) return;
    const checkInDateTime = toReportDateTime(newReportDate, newCheckInTime);
    const checkOutDateTime = newCheckOutTime
      ? toReportDateTime(newReportDate, newCheckOutTime)
      : undefined;
    if (checkOutDateTime && new Date(checkOutDateTime).getTime() - new Date(checkInDateTime).getTime() < 60_000) {
      showToast("error", "Check-out time must be at least one minute later than check-in time.");
      return;
    }
    setSaving(true);
    try {
      await TimeAttendanceService.createReport(schoolId, {
        externalEmployeeId: newPersonId,
        reportDate: newReportDate,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        reason: newReason,
      });
      showToast("success", "Time report created.");
      setCreateDialog(false);
      await loadReports();
    } catch {
      showToast("error", "Unable to create this time report.");
    } finally {
      setSaving(false);
    }
  };
  const reportActions = (item: TimeReport) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-400"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl bg-white">
        <DropdownMenuItem
          onClick={() => {
            setEditing(item);
            setEditReportDate(item.date || reportDate);
            setCheckInTime(toTimeInput(item.checkInTime));
            setCheckOutTime(toTimeInput(item.checkOutTime));
            setReason("");
          }}
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => {
            setDeleting(item);
            setReason("");
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const reportColumns: ColumnDef<TimeReport>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: (item) => (
        <span className="font-semibold text-slate-800">
          {item.employeeName}
        </span>
      ),
    },
    { id: "date", header: "Date", cell: (item) => item.date || "—" },
    {
      id: "in",
      header: "Check In",
      cell: (item) => formatTime(item.checkInTime),
    },
    {
      id: "out",
      header: "Check Out",
      cell: (item) =>
        item.pendingCheckout ? (
          <span className="font-semibold text-amber-700">Pending</span>
        ) : (
          formatTime(item.checkOutTime)
        ),
    },
    {
      id: "hours",
      header: "Hours",
      cell: (item) => formatWorkedTime(item.timeWorked),
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-20 text-right",
      hideInCardBody: true,
      cell: reportActions,
    },
  ];
  const consolidatedColumns: ColumnDef<ConsolidatedTimeReport>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: (item) => <span className="font-semibold text-slate-800">{item.employeeName}</span>,
    },
    {
      id: "hours",
      header: "Total Time Worked",
      cell: (item) => <span className="font-semibold text-[#2563eb]">{formatWorkedTime(item.totalTimeWorked)}</span>,
    },
  ];
  return (
    <AdminLayout>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#0F2D52]">
            Time & Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review working hours and configure who receives scheduled reports.
          </p>
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "summary" | "settings")}
          className="mb-6"
        >
          <TabsList className="h-auto rounded-none border-b border-slate-200 bg-transparent p-0">
            <TabsTrigger
              value="summary"
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold data-[state=active]:border-[#0F2D52] data-[state=active]:bg-transparent data-[state=active]:text-[#0F2D52]"
            >
              Report Summary
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold data-[state=active]:border-[#0F2D52] data-[state=active]:bg-transparent data-[state=active]:text-[#0F2D52]"
            >
              Report Settings
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "settings" ? (
          <SettingsPanel schoolId={schoolId} />
        ) : (
          <section>
            <div className="mb-5 flex flex-wrap gap-2">
              {(
                [
                  ["daily", "Daily"],
                  ["range", "Date Range"],
                  ["salary", "Salaried Report"],
                  ["pending", "Pending Checkouts"],
                ] as [ReportView, string][]
              ).map(([key, label]) => (
                <Button
                  key={key}
                  variant="ghost"
                  onClick={() => {
                    setView(key);
                    setSortBy(key === "daily" ? "checkIn" : "name");
                    setSortOrder("desc");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 ${view === key ? "bg-[#0F2D52] text-white hover:bg-[#163c69] hover:text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Card className="rounded-2xl border-slate-100 p-5 shadow-sm">
              {view === "range" && (
                <div className="mb-6">
                  <h2 className="text-xl font-extrabold text-[#0F2D52]">Date Range Report</h2>
                  <p className="mt-1 text-sm text-slate-500">View consolidated employee working hours for a selected period.</p>
                </div>
              )}
              {view === "salary" && (
                <div className="mb-6">
                  <h2 className="text-xl font-extrabold text-[#0F2D52]">{salaryType} Report</h2>
                  <p className="mt-1 text-sm text-slate-500">Select a report type and view consolidated employee hours.</p>
                </div>
              )}
              <div className="mb-7">
                {view === "daily" && (
                  <label className="block w-full max-w-[260px] text-xs font-bold uppercase tracking-wider text-slate-500">
                    Report Date
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      type="date"
                      value={reportDate}
                      onChange={(event) => setReportDate(event.target.value)}
                    />
                  </label>
                )}
                {view === "range" && (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Start Date
                      <Input
                        className="mt-1.5 h-10 rounded-xl"
                        type="date"
                      value={startDate}
                        onChange={(event) => { setStartDate(event.target.value); setRangeLoaded(false); setConsolidatedReports([]); }}
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      End Date
                      <Input
                        className="mt-1.5 h-10 rounded-xl"
                        type="date"
                      value={endDate}
                        onChange={(event) => { setEndDate(event.target.value); setRangeLoaded(false); setConsolidatedReports([]); }}
                      />
                    </label>
                    <Button disabled={loading || !startDate || !endDate} onClick={() => void loadConsolidated({ startDate, endDate }, "range")} className="h-10 rounded-xl bg-[#0F2D52] text-white hover:bg-[#163c69]">
                      {loading ? "Loading..." : "Load Report"}
                    </Button>
                  </div>
                )}
                {view === "salary" && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Report Type</p>
                      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {(["Weekly", "Biweekly", "Monthly", "Bimonthly"] as SalaryReportType[]).map((type) => (
                          <Button key={type} variant="outline" onClick={() => { setSalaryType(type); setSalaryLoaded(false); setConsolidatedReports([]); }} className={`h-10 rounded-xl ${salaryType === type ? "border-[#0F2D52] bg-[#0F2D52] text-white hover:bg-[#163c69] hover:text-white" : "border-slate-200"}`}>{type}</Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {salaryType !== "Biweekly" && <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Year<select value={salaryYear} onChange={(event) => { setSalaryYear(Number(event.target.value)); setSalaryLoaded(false); setConsolidatedReports([]); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}
                      {salaryType !== "Biweekly" && <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Month<select value={salaryMonth} onChange={(event) => { setSalaryMonth(Number(event.target.value)); setSalaryWeekIndex(0); setSalaryLoaded(false); setConsolidatedReports([]); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index, 1).toLocaleString("default", { month: "long" })}</option>)}</select></label>}
                      {salaryType === "Weekly" && <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Week<select value={salaryWeekIndex} onChange={(event) => { setSalaryWeekIndex(Number(event.target.value)); setSalaryLoaded(false); setConsolidatedReports([]); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{availableWeeks.map((week, index) => <option key={week.startDate} value={index}>{week.label}</option>)}</select></label>}
                      {salaryType === "Bimonthly" && <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Period<select value={salaryHalf} onChange={(event) => { setSalaryHalf(event.target.value as "first" | "second"); setSalaryLoaded(false); setConsolidatedReports([]); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="first">First Half (1–15)</option><option value="second">Second Half (16–end)</option></select></label>}
                    </div>
                    <Button disabled={loading || !salaryRange} onClick={() => salaryRange && void loadConsolidated(salaryRange, "salary")} className="h-10 rounded-xl bg-[#0F2D52] text-white hover:bg-[#163c69]">{loading ? "Loading..." : "Load Report"}</Button>
                  </div>
                )}
              </div>
              <div className={`mb-5 flex flex-wrap items-center gap-3 ${((view === "range" && !rangeLoaded) || (view === "salary" && !salaryLoaded)) ? "hidden" : ""}`}>
                <div className="relative w-full min-w-[260px] flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search reports..."
                    className="h-10 rounded-xl border-slate-200 pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                  {["daily", "pending"].includes(view) && (
                    <Button
                      onClick={() => void openCreateReport()}
                      className="h-10 rounded-xl bg-[#0F2D52] text-white hover:bg-[#163c69]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Report
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => {
                      if (view === "range") void loadConsolidated({ startDate, endDate }, "range");
                      else if (view === "salary" && salaryRange) void loadConsolidated(salaryRange, "salary");
                      else void loadReports();
                    }}
                    className="h-10 rounded-xl"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                  <SortDropdown
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    options={
                      view === "daily"
                        ? [
                            { label: "Check-In Time (Earliest First)", sortBy: "checkIn", sortOrder: "asc" },
                            { label: "Check-In Time (Latest First)", sortBy: "checkIn", sortOrder: "desc" },
                            { label: "Name (A–Z)", sortBy: "name", sortOrder: "asc" },
                            { label: "Name (Z–A)", sortBy: "name", sortOrder: "desc" },
                          ]
                        : [
                            { label: "Name (A–Z)", sortBy: "name", sortOrder: "asc" },
                            { label: "Name (Z–A)", sortBy: "name", sortOrder: "desc" },
                            { label: "Hours (Highest First)", sortBy: "hours", sortOrder: "desc" },
                            { label: "Hours (Lowest First)", sortBy: "hours", sortOrder: "asc" },
                          ]
                    }
                    labels={{ checkIn: "Check-In Time", date: "Date", name: "Name", hours: "Hours" }}
                    onSort={(by, order) => {
                      setSortBy(by);
                      setSortOrder(order);
                      setCurrentPage(1);
                    }}
                    className="h-10 rounded-xl"
                  />
                  <ViewToggle viewMode={viewMode} onChange={setMode} />
                </div>
              </div>
              {(view === "range" && !rangeLoaded) || (view === "salary" && !salaryLoaded) ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">{view === "range" ? "Select dates above and click Load Report to view data." : "Select report options above and click Load Report to view data."}</p>
                </div>
              ) : <DataGrid
                data={paginatedData}
                columns={
                  ["daily", "pending"].includes(view)
                    ? reportColumns
                    : consolidatedColumns
                }
                viewMode={viewMode}
                loading={loading}
                loadingMessage="Loading time reports..."
                emptyMessage="No matching reports found."
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
                tableLayout="auto"
                gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                renderCard={(item: any) => (
                  <Card className="rounded-2xl border-slate-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.employeeName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.date || ""}
                        </p>
                      </div>
                      {item.reportId && ["daily", "pending"].includes(view) && reportActions(item)}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {item.timeWorked && (
                        <p>
                          Hours:{" "}
                          <span className="font-semibold text-slate-800">
                            {formatWorkedTime(item.timeWorked)}
                          </span>
                        </p>
                      )}
                      {item.totalTimeWorked && (
                        <p>
                          Total Time Worked: <span className="font-semibold text-[#2563eb]">{formatWorkedTime(item.totalTimeWorked)}</span>
                        </p>
                      )}
                      {typeof item.workedMinutes === "number" && (
                        <p>
                          Hours:{" "}
                          <span className="font-semibold text-slate-800">
                            {formatHours(item.workedMinutes)}
                          </span>
                        </p>
                      )}
                      {typeof item.employeeCount === "number" && (
                        <p>
                          Employees:{" "}
                          <span className="font-semibold text-slate-800">
                            {item.employeeCount}
                          </span>
                        </p>
                      )}
                    </div>
                  </Card>
                )}
              />}
            </Card>
          </section>
        )}
        <Dialog open={createDialog} onOpenChange={(open) => !saving && setCreateDialog(open)}>
          <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
            <DialogHeader>
              <DialogTitle>Add Time Report</DialogTitle>
              <DialogDescription>Create a completed report or a pending check-out entry.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Person
                <select value={newPersonId} onChange={(event) => setNewPersonId(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  {reportPeople.map((person) => <option key={person.externalEmployeeId} value={person.externalEmployeeId}>{person.employeeName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Report Date
                <Input required type="date" value={newReportDate} onChange={(event) => setNewReportDate(event.target.value)} className="mt-2 h-10 rounded-xl" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Check-In Time
                <Input required type="time" step="60" value={newCheckInTime} onChange={(event) => setNewCheckInTime(event.target.value)} className="mt-2 h-10 rounded-xl" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Check-Out Time <span className="font-normal text-slate-400">(optional)</span>
                <Input type="time" step="60" value={newCheckOutTime} onChange={(event) => setNewCheckOutTime(event.target.value)} className="mt-2 h-10 rounded-xl" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Reason
                <textarea required value={newReason} onChange={(event) => setNewReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" />
              </label>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" disabled={saving} onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button disabled={saving || !newPersonId || !newCheckInTime || !newReason.trim()} onClick={() => void createReport()} className="bg-[#0F2D52] text-white hover:bg-[#163c69]">Create Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!editing}
          onOpenChange={(open) => !open && !saving && setEditing(undefined)}
        >
          <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
            <DialogHeader>
              <DialogTitle>Edit Time Report</DialogTitle>
              <DialogDescription>
                Changes require a reason and are recorded in the report audit
                history.
              </DialogDescription>
            </DialogHeader>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Report Date
              <Input
                required
                type="date"
                value={editReportDate}
                onChange={(event) => setEditReportDate(event.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Check-In Time
              <Input
                required
                type="time"
                step="60"
                value={checkInTime}
                onChange={(event) => setCheckInTime(event.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Check-Out Time
              <Input
                type="time"
                step="60"
                value={checkOutTime}
                onChange={(event) => setCheckOutTime(event.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Reason
              <textarea
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </label>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </Button>
              <Button
                disabled={saving || !checkInTime || !reason.trim()}
                onClick={() => void editReport()}
                className="bg-[#0F2D52] text-white hover:bg-[#163c69]"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!deleting}
          onOpenChange={(open) => !open && !saving && setDeleting(undefined)}
        >
          <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
            <DialogHeader>
              <DialogTitle>Delete Time Report?</DialogTitle>
              <DialogDescription>
                This report will be removed. Enter a reason to continue.
              </DialogDescription>
            </DialogHeader>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Reason
              <textarea
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </label>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setDeleting(undefined)}
              >
                Cancel
              </Button>
              <Button
                disabled={saving || !reason.trim()}
                onClick={() => void deleteReport()}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AdminLayout>
  );
}
