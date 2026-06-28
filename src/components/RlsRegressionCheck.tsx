import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Client-side RLS regression check.
 * For each user-owned table, query via the authenticated client and verify:
 *  - the call succeeds (RLS policy allows the user)
 *  - every returned row's user_id matches the current user (no cross-user leak)
 *
 * A "leak" or query error indicates an RLS regression worth investigating.
 */
const USER_TABLES = [
  "projects",
  "experiment_runs",
  "dataset_audits",
  "rag_sessions",
  "model_cards",
  "prompt_suites",
  "prompt_runs",
  "benchmarks",
  "benchmark_runs",
  "chunking_sims",
  "embedding_compares",
  "cost_estimates",
  "finetune_checks",
  "audit_reports",
  "notifications",
  "reports",
  "activities",
  "audit_log",
] as const;

type Status = "idle" | "ok" | "warn" | "fail";
type Row = { table: string; status: Status; rows: number; note: string };

export function RlsRegressionCheck() {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function run() {
    setRunning(true);
    setRows([]);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required");
      setRunning(false);
      return;
    }
    const results: Row[] = [];
    for (const t of USER_TABLES) {
      try {
        const { data, error } = await supabase
          .from(t as any)
          .select("user_id")
          .limit(200);
        if (error) {
          results.push({ table: t, status: "fail", rows: 0, note: error.message });
        } else {
          const leaks = (data ?? []).filter((r: any) => r.user_id && r.user_id !== user.id).length;
          if (leaks > 0) {
            results.push({
              table: t,
              status: "fail",
              rows: data?.length ?? 0,
              note: `${leaks} cross-user row(s) returned`,
            });
          } else {
            results.push({ table: t, status: "ok", rows: data?.length ?? 0, note: "isolated" });
          }
        }
      } catch (e: any) {
        results.push({ table: t, status: "warn", rows: 0, note: e?.message ?? "unknown" });
      }
      setRows([...results]);
    }
    setRunning(false);
    const failed = results.filter((r) => r.status === "fail").length;
    if (failed === 0) toast.success("RLS regression check passed");
    else toast.error(`${failed} table(s) failed RLS isolation`);
  }

  const summary = rows.length
    ? `${rows.filter((r) => r.status === "ok").length} ok · ${rows.filter((r) => r.status === "fail").length} fail · ${rows.filter((r) => r.status === "warn").length} warn`
    : "Not run yet";

  return (
    <div className="card-elevated max-w-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ShieldCheck className="h-4 w-4" /> RLS regression check
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Verifies each user-owned table enforces row-level isolation against your session.
          </p>
        </div>
        <Button
          onClick={run}
          disabled={running}
          className="rounded-full shrink-0"
          aria-label="Run RLS regression check"
        >
          {running ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1.5 h-4 w-4" />
          )}
          {running ? "Checking…" : "Run check"}
        </Button>
      </div>

      <div className="mt-3 text-xs text-ink-soft" aria-live="polite">
        {summary}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 divide-y rounded-xl border bg-surface">
          {rows.map((r) => (
            <div
              key={r.table}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2 font-mono text-[12px]">
                {r.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                {r.status === "fail" && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                {r.status === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                {r.table}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-soft">{r.note}</span>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {r.rows} rows
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
