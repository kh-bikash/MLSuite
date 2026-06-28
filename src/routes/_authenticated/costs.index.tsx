import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DollarSign, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listEstimates, deleteEstimate } from "@/lib/costs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/costs/")({
  head: () => ({ meta: [{ title: "LLM Cost Estimator — ML Inspector" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listEstimates);
  const del = useServerFn(deleteEstimate);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["cost-estimates"], queryFn: () => list() });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-estimates"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={DollarSign}
        title="LLM Cost Estimator"
        description="Describe your workload and get a cost / quality / latency tradeoff with a concrete model recommendation."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/costs/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New estimate
            </Link>
          </Button>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No estimates yet"
            description="Skip hours of manual benchmarking. Describe your workload, get the right model."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/costs/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Estimate cost
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {data.map((row: any, i: number) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to="/costs/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">
                      {row.use_case?.slice(0, 100)} ·{" "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.recommendation?.model && (
                      <Badge
                        variant="outline"
                        className="rounded-full bg-primary/10 text-primary border-primary/30"
                      >
                        {row.recommendation.model} · $
                        {Number(row.recommendation.expected_monthly_cost_usd ?? 0).toFixed(2)}/mo
                      </Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm("Delete?")) delMut.mutate(row.id);
                      }}
                      className="text-xs text-ink-soft opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
