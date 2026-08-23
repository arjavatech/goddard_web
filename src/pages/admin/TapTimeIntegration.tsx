import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Link2,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useUserContext } from "../../contexts/UserContext";
import {
  TimeAttendanceService,
  type ReconciliationProposal,
  type SyncOutcome,
  type TapTimeConnection,
} from "../../services/api/timeAttendance";

/** School-scoped setup. The active Super Admin can link only their own school. */
export function TapTimeIntegration() {
  const { userData, schoolName } = useUserContext();
  const schoolId = userData?.schoolId;
  const [connection, setConnection] = useState<TapTimeConnection | null>();
  const [code, setCode] = useState("");
  const [proposals, setProposals] = useState<ReconciliationProposal[]>([]);
  const [pendingProposal, setPendingProposal] =
    useState<ReconciliationProposal | null>(null);
  const [syncOutcomes, setSyncOutcomes] = useState<SyncOutcome[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const loadConnection = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setConnection(await TimeAttendanceService.connection(schoolId));
    } catch {
      setConnection(undefined);
      setError("Unable to load the Tap-Time connection for this school.");
    } finally {
      setLoading(false);
    }
  };
  const loadReconciliation = async () => {
    if (!schoolId) return;
    try {
      setProposals(await TimeAttendanceService.reconciliation(schoolId));
    } catch {
      setError("Unable to load employee matches.");
    }
  };
  useEffect(() => {
    void loadConnection();
  }, [schoolId]);
  useEffect(() => {
    if (connection?.status === "active") void loadReconciliation();
    else setProposals([]);
  }, [connection?.status, schoolId]);
  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId) return;
    setWorking(true);
    setError("");
    try {
      await TimeAttendanceService.connect(schoolId, code.trim());
      setCode("");
      setMessage(`${schoolName} is now connected to Tap-Time.`);
      await loadConnection();
    } catch {
      setError(
        "Unable to connect this company. Confirm that the one-time code is active and belongs to this school’s Tap-Time company.",
      );
    } finally {
      setWorking(false);
    }
  };
  const disconnect = async () => {
    if (
      !schoolId ||
      !window.confirm(
        `Disconnect ${schoolName} from Tap-Time? Employee links and audit history are retained.`,
      )
    )
      return;
    setWorking(true);
    try {
      await TimeAttendanceService.disconnect(schoolId);
      setConnection(null);
      setProposals([]);
      setSyncOutcomes([]);
      setMessage("Tap-Time company disconnected.");
    } catch {
      setError("Unable to disconnect the company.");
    } finally {
      setWorking(false);
    }
  };
  const retry = async () => {
    if (!schoolId) return;
    setWorking(true);
    setError("");
    try {
      const result = await TimeAttendanceService.retrySync(schoolId);
      setSyncOutcomes(
        result.outcomes.filter((value) => value.status === "failed"),
      );
      setMessage(
        `Tap-Time sync completed: ${result.succeeded} successful, ${result.failed} need review.`,
      );
      await loadReconciliation();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to run Tap-Time sync.");
    } finally {
      setWorking(false);
    }
  };
  const confirm = async (proposal: ReconciliationProposal) => {
    if (!schoolId) return;
    setWorking(true);
    try {
      await TimeAttendanceService.confirmReconciliation(schoolId, proposal);
      setProposals((values) =>
        values.filter(
          (value) =>
            value.employeeId !== proposal.employeeId ||
            value.entityType !== proposal.entityType,
        ),
      );
      setSyncOutcomes((values) =>
        values.filter(
          (value) =>
            value.entityId !== proposal.employeeId ||
            value.entityType !== proposal.entityType,
        ),
      );
      setMessage(`${proposal.role} mapping confirmed.`);
      setPendingProposal(null);
    } catch {
      setError(
        `Unable to confirm this ${proposal.role.toLowerCase()} mapping.`,
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <AdminLayout>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-950">
            Tap-Time Setup
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Link the existing Tap-Time company for {schoolName}.
          </p>
        </div>
        {message && (
          <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!schoolId ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Your school context is unavailable. Please sign in again before
            connecting Tap-Time.
          </p>
        ) : loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
          </div>
        ) : connection?.status === "active" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Connected company
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {connection.tapCompanyName}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => void retry()}
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync people
                </button>
                <button
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                  onClick={() => void disconnect()}
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            </div>
            {connection.lastError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Last sync error: {connection.lastError}
              </p>
            )}
            {syncOutcomes.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Sync needs review</p>
                <ul className="mt-2 space-y-1">
                  {syncOutcomes.map((outcome) => (
                    <li key={`${outcome.entityType}-${outcome.entityId}`}>
                      {outcome.entityName} ({outcome.entityType.replace("_", " ")}): {outcome.error || "Unable to sync"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Suggested people matches
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Only exact one-to-one phone or email matches appear. Review and confirm each mapping manually.
                  </p>
                </div>
                <button
                  className="text-sm font-semibold text-blue-700"
                  onClick={() => void loadReconciliation()}
                >
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Goddard person</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Tap-Time employee</th>
                      <th className="p-3">Match</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((value) => (
                      <tr
                        className="border-t border-slate-100"
                        key={value.employeeId}
                      >
                        <td className="p-3 font-medium">
                          {value.employeeName}
                        </td>
                        <td className="p-3">{value.role}</td>
                        <td className="p-3">{value.tapEmployeeName}</td>
                        <td className="p-3">Exact {value.matchType}: {value.matchValue}</td>
                        <td className="p-3">
                          <button
                            disabled={working}
                            className="font-semibold text-blue-700 disabled:opacity-50"
                            onClick={() => setPendingProposal(value)}
                          >
                            Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!proposals.length && (
                      <tr>
                        <td colSpan={5} className="p-5 text-slate-500">
                          No unambiguous phone or email matches to review.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Connect your Tap-Time company
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This connection is only for <strong>{schoolName}</strong>; it
                  does not create or rename a Tap-Time company.
                </p>
              </div>
            </div>
            <ol className="mt-5 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <span>
                  In Tap-Time, sign in as the owner or administrator of this
                  school’s company and generate a one-time connection code.
                </span>
              </li>
              <li className="flex gap-3">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <span>
                  Paste that code below. It expires after 15 minutes and can be
                  redeemed only once.
                </span>
              </li>
              <li className="flex gap-3">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <span>
                  After connecting, run employee sync and review any suggested
                  phone-number matches.
                </span>
              </li>
            </ol>
            <form onSubmit={connect} className="mt-5">
              <label className="block text-sm font-semibold text-slate-800">
                Tap-Time one-time connection code
                <input
                  required
                  minLength={16}
                  className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Paste the connection code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
              <button
                disabled={working || !code.trim()}
                type="submit"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {working && <Loader2 className="h-4 w-4 animate-spin" />}Connect
                Tap-Time
              </button>
            </form>
          </section>
        )}
      </main>
      <Dialog
        open={!!pendingProposal}
        onOpenChange={(open) => {
          if (!open && !working) setPendingProposal(null);
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-lg"
          hideCloseButton={working}
          preventClose={working}
        >
          <DialogHeader className="mb-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm Tap-Time Match
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Review the existing Tap-Time record before creating this one-to-one mapping.
            </DialogDescription>
          </DialogHeader>
          {pendingProposal && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Goddard person</p>
                <p className="mt-1 font-semibold text-slate-900">{pendingProposal.employeeName}</p>
                <p className="text-slate-500">{pendingProposal.role}</p>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tap-Time record</p>
                <p className="mt-1 font-semibold text-slate-900">{pendingProposal.tapEmployeeName}</p>
                <p className="text-slate-500">Exact {pendingProposal.matchType} match: {pendingProposal.matchValue}</p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              variant="outline"
              disabled={working}
              onClick={() => setPendingProposal(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              disabled={working || !pendingProposal}
              onClick={() => pendingProposal && void confirm(pendingProposal)}
              className="w-full bg-[#0F2D52] text-white hover:bg-[#163c69] sm:w-auto"
            >
              {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {working ? "Confirming..." : "Confirm Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
