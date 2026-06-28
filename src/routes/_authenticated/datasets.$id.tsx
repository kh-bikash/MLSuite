import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Beaker,
  Gauge,
  FileSearch,
  Wrench,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAudit } from "@/lib/datasets.functions";

export const Route = createFileRoute("/_authenticated/datasets/$id")({
  head: () => ({ meta: [{ title: "Audit — ML Inspector" }] }),
  component: AuditDetail,
});

const priColors: Record<string, string> = {
  now: "bg-rose-50 text-rose-700 border-rose-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  later: "bg-slate-50 text-slate-600 border-slate-200",
};

function riskTone(score: number) {
  if (score >= 70) return "bg-rose-100 text-rose-700 border-rose-200";
  if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="card-elevated p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-soft" />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function AuditDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getAudit);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dataset-audit", id],
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

  const StatusIcon =
    data.status === "healthy"
      ? CheckCircle2
      : data.status === "warning"
        ? AlertCircle
        : AlertTriangle;
  const fairness = (data.fairness ?? {}) as any;
  const stats = (data.stats ?? {}) as any;
  const protectedAttrs = (data.protected_attributes ?? []) as any[];
  const recs = (data.recommendations ?? []) as any[];
  const profile = (stats.profile ?? []) as any[];

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title={data.name}
        description={`${data.dataset_name} · ${data.row_count?.toLocaleString() ?? 0} rows · ${data.column_count ?? 0} columns`}
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/datasets">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All audits
            </Link>
          </Button>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5"
        >
          {/* Verdict */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Verdict</div>
                  <p className="mt-1 max-w-3xl text-base">
                    {(data as any).summary ?? fairness?.target_skew ?? "Audit complete."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-full border ${riskTone(Number(data.risk_score ?? 0))}`}
                >
                  Risk {Math.round(Number(data.risk_score ?? 0))}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full border ${riskTone(Number(data.bias_score ?? 0))}`}
                >
                  Bias {Math.round(Number(data.bias_score ?? 0))}
                </Badge>
              </div>
            </div>
          </div>

          {/* Protected attributes */}
          {protectedAttrs.length > 0 && (
            <Section icon={Users} title="Protected attributes detected">
              <div className="grid gap-2">
                {protectedAttrs.map((p, i) => (
                  <div key={i} className="rounded-xl border bg-surface/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm">{p.column}</div>
                      <div className="text-xs text-ink-soft">{p.distribution_note}</div>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{p.reason}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Fairness */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={Beaker} title="Class imbalance">
              {(fairness.imbalance_findings ?? []).length === 0 ? (
                <p className="text-sm text-ink-soft">No major imbalance findings.</p>
              ) : (
                <div className="grid gap-2">
                  {fairness.imbalance_findings.map((f: any, i: number) => (
                    <div key={i} className="rounded-xl border px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">
                          {f.column} · {f.group}
                        </span>
                        <span className="tabular-nums text-ink-soft">
                          {Number(f.share_pct).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-foreground"
                          style={{ width: `${Math.min(100, Number(f.share_pct))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-ink-soft">{f.concern}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section icon={FileSearch} title="Leakage signals">
              {(fairness.leakage_signals ?? []).length === 0 ? (
                <p className="text-sm text-ink-soft">No obvious leakage detected.</p>
              ) : (
                <div className="grid gap-2">
                  {fairness.leakage_signals.map((l: any, i: number) => (
                    <div key={i} className="rounded-xl border px-4 py-3">
                      <div className="font-mono text-sm">{l.column}</div>
                      <p className="mt-1 text-sm text-ink-soft">{l.evidence}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Stats */}
          <Section icon={Gauge} title="Data quality">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                  Missing values
                </div>
                {(stats.missing_value_columns ?? []).length === 0 ? (
                  <p className="text-sm text-ink-soft">No notable missingness.</p>
                ) : (
                  <div className="grid gap-1.5">
                    {stats.missing_value_columns.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-mono">{m.column}</span>
                        <span className="tabular-nums text-ink-soft">
                          {Number(m.missing_pct).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {stats.duplicate_estimate && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink-soft">Duplicates</div>
                    <p className="text-ink-soft">{stats.duplicate_estimate}</p>
                  </div>
                )}
                {fairness.target_skew && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink-soft">Target skew</div>
                    <p className="text-ink-soft">{fairness.target_skew}</p>
                  </div>
                )}
                {stats.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink-soft">Notes</div>
                    <p className="text-ink-soft">{stats.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Column profile */}
          {profile.length > 0 && (
            <Section icon={FileSearch} title="Column profile">
              <div className="grid gap-2 md:grid-cols-2">
                {profile.map((c: any) => (
                  <div key={c.column} className="rounded-xl border bg-surface/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{c.column}</span>
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                        {c.type}
                      </Badge>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-ink-soft">
                      <span>{c.unique_count.toLocaleString()} unique</span>
                      <span>{Number(c.missing_pct).toFixed(1)}% missing</span>
                    </div>
                    {c.top_values?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.top_values.slice(0, 3).map((t: any, i: number) => (
                          <span
                            key={i}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[11px]"
                          >
                            {String(t.value).slice(0, 18) || "∅"} · {Number(t.pct).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommendations */}
          <Section icon={Wrench} title="Recommendations">
            <div className="grid gap-2">
              {recs.map((r: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-xl border px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{r.title}</div>
                    <p className="mt-1 text-sm text-ink-soft">{r.action}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full border ${priColors[r.priority] ?? ""}`}
                  >
                    {r.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>
      </PageBody>
    </>
  );
}
