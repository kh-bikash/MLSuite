import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
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
import { listExperiments, deleteExperiment } from "@/lib/experiments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/experiments/")({
  head: () => ({ meta: [{ title: "Experiment Failure Analyst — ML Inspector" }] }),
  component: ExperimentsPage,
});

const sevColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusIcon = (s: string | null) =>
  s === "healthy" ? CheckCircle2 : s === "warning" ? AlertCircle : AlertTriangle;

function ExperimentsPage() {
  const list = useServerFn(listExperiments);
  const del = useServerFn(deleteExperiment);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={Activity}
        title="Experiment Failure Analyst"
        description="Drop in raw training logs. Get a root-cause analysis, severity score, and a prioritized repair plan."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/experiments/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New analysis
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
            icon={Activity}
            title="No experiments analyzed yet"
            description="Paste a training log to get a root-cause analysis in seconds."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/experiments/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Analyze a run
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
                    to="/experiments/$id"
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
                          {row.framework} ·{" "}
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {row.severity && (
                        <Badge
                          variant="outline"
                          className={`rounded-full border ${sevColors[row.severity] ?? ""}`}
                        >
                          {row.severity}
                        </Badge>
                      )}
                      {typeof row.confidence === "number" && (
                        <span className="text-xs tabular-nums text-ink-soft">
                          {Math.round(Number(row.confidence) * 100)}%
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Delete this analysis?")) deleteMut.mutate(row.id);
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
