import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listChecks, deleteCheck } from "@/lib/finetune.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finetune/")({
  head: () => ({ meta: [{ title: "Fine-tuning Readiness — ML Inspector" }] }),
  component: Page,
});

const verdictTone: Record<string, string> = {
  prompt_engineering_enough: "bg-emerald-100 text-emerald-700 border-emerald-200",
  use_rag: "bg-blue-100 text-blue-700 border-blue-200",
  fine_tune_recommended: "bg-amber-100 text-amber-700 border-amber-200",
  fine_tune_required: "bg-rose-100 text-rose-700 border-rose-200",
};

function Page() {
  const list = useServerFn(listChecks);
  const del = useServerFn(deleteCheck);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["finetune-checks"], queryFn: () => list() });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finetune-checks"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="Fine-tuning Readiness Checker"
        description="Before you spend $10k on fine-tuning, find out if prompt engineering + RAG would solve it."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/finetune/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New check
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
            icon={GraduationCap}
            title="No checks yet"
            description="Describe your task and paste sample data — we'll tell you whether fine-tuning is justified."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/finetune/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Run a check
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
                  to="/finetune/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">
                      {row.task} ·{" "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.verdict?.verdict && (
                      <Badge
                        variant="outline"
                        className={`rounded-full ${verdictTone[row.verdict.verdict] ?? ""}`}
                      >
                        {row.verdict.verdict.replace(/_/g, " ")}
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
