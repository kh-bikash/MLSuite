import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Sparkles,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAudits, deleteAudit } from "@/lib/datasets.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/datasets/")({
  head: () => ({ meta: [{ title: "Dataset Bias Auditor — ML Inspector" }] }),
  component: DatasetsPage,
});

const statusIcon = (s: string | null) =>
  s === "healthy" ? CheckCircle2 : s === "warning" ? AlertCircle : AlertTriangle;

function riskTone(score: number | null) {
  if (score == null) return "bg-slate-100 text-slate-700 border-slate-200";
  if (score >= 70) return "bg-rose-100 text-rose-700 border-rose-200";
  if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function DatasetsPage() {
  const list = useServerFn(listAudits);
  const del = useServerFn(deleteAudit);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dataset-audits"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dataset-audits"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Dataset Bias Auditor"
        description="Profile a dataset to surface protected attributes, class imbalance, leakage signals, and fairness risks."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/datasets/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New audit
            </Link>
          </Button>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No audits yet"
            description="Paste a CSV to scan for bias, leakage, missing values, and class skew."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/datasets/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Audit a dataset
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {data.map((row, i) => {
              const Icon = statusIcon(row.status);
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to="/datasets/$id"
                    params={{ id: row.id }}
                    className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.name}</div>
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {row.dataset_name} · {row.row_count?.toLocaleString() ?? 0} rows ·{" "}
                          {row.column_count ?? 0} cols ·{" "}
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${riskTone(row.risk_score)}`}
                      >
                        Risk {Math.round(Number(row.risk_score ?? 0))}
                      </Badge>
                      <span className="text-xs tabular-nums text-ink-soft">
                        Bias {Math.round(Number(row.bias_score ?? 0))}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Delete this audit?")) deleteMut.mutate(row.id);
                        }}
                        className="text-xs text-ink-soft opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
