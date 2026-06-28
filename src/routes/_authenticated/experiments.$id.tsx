import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
  FileSearch,
  Gauge,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getExperiment } from "@/lib/experiments.functions";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/experiments/$id")({
  head: () => ({ meta: [{ title: "Analysis — ML Inspector" }] }),
  component: ExperimentDetail,
});

const sevColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

const priColors: Record<string, string> = {
  now: "bg-rose-50 text-rose-700 border-rose-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  later: "bg-slate-50 text-slate-600 border-slate-200",
};

function ExperimentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getExperiment);

  const { data, isLoading, error } = useQuery({
    queryKey: ["experiment", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <PageBody>
        <div className="card-elevated p-8 text-center text-sm text-ink-soft">
          {(error as Error)?.message ?? "Not found"}
        </div>
      </PageBody>
    );
  }

  const a = (data.analysis ?? {}) as any;
  const StatusIcon =
    data.status === "healthy"
      ? CheckCircle2
      : data.status === "warning"
        ? AlertCircle
        : AlertTriangle;

  return (
    <>
      <PageHeader
        icon={Activity}
        title={data.name}
        description={`${data.framework} · ${formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}`}
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/experiments">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All experiments
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-6">
          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-soft">Verdict</div>
                  <p className="mt-1 max-w-2xl text-base font-medium leading-snug">{a.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.severity && (
                  <Badge
                    variant="outline"
                    className={`rounded-full border ${sevColors[data.severity] ?? ""}`}
                  >
                    {data.severity}
                  </Badge>
                )}
                {typeof data.confidence === "number" && (
                  <Badge variant="outline" className="rounded-full">
                    <Gauge className="mr-1 h-3 w-3" /> {Math.round(Number(data.confidence) * 100)}%
                    conf
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* Metrics */}
          {a.metrics_observed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card-elevated p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Gauge className="h-4 w-4" /> Metrics observed
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric label="Final loss" value={a.metrics_observed.final_loss} />
                <Metric
                  label="Final accuracy"
                  value={a.metrics_observed.final_accuracy}
                  format="pct"
                />
                <Metric label="Epochs completed" value={a.metrics_observed.epochs_completed} />
              </div>
              {a.metrics_observed.notes && (
                <p className="mt-4 text-sm text-ink-soft">{a.metrics_observed.notes}</p>
              )}
            </motion.div>
          )}

          {/* Root causes */}
          {Array.isArray(a.root_causes) && a.root_causes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-elevated p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <FileSearch className="h-4 w-4" /> Root causes
              </h3>
              <div className="grid gap-3">
                {a.root_causes.map((c: any, i: number) => (
                  <div key={i} className="rounded-xl border bg-surface/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-sm">{c.title}</div>
                      <Badge
                        variant="outline"
                        className="rounded-full text-[10px] uppercase tracking-wider"
                      >
                        {c.category}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-soft">{c.evidence}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Repair plan */}
          {Array.isArray(a.repair_plan) && a.repair_plan.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-elevated p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4" /> Repair plan
              </h3>
              <ol className="grid gap-3">
                {a.repair_plan.map((s: any, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border bg-surface/40 p-4"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium">{s.step}</div>
                        <Badge
                          variant="outline"
                          className={`rounded-full border text-[10px] uppercase tracking-wider ${priColors[s.priority] ?? ""}`}
                        >
                          {s.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{s.rationale}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {/* Raw log */}
          <details className="card-elevated p-6">
            <summary className="cursor-pointer text-sm font-semibold">Raw log</summary>
            <pre className="mt-3 max-h-[500px] overflow-auto rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
              {data.raw_log}
            </pre>
          </details>
        </div>
      </PageBody>
    </>
  );
}

function Metric({ label, value, format }: { label: string; value: number | null; format?: "pct" }) {
  const display =
    value == null
      ? "—"
      : format === "pct"
        ? `${(value * 100).toFixed(1)}%`
        : Number(value).toLocaleString();
  return (
    <div className="rounded-xl border bg-surface/40 p-4">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{display}</div>
    </div>
  );
}
