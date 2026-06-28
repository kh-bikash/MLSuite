import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Network,
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
import { listSessions, deleteSession } from "@/lib/rag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rag/")({
  head: () => ({ meta: [{ title: "RAG Pipeline Debugger — ML Inspector" }] }),
  component: RagPage,
});

const statusIcon = (s: string | null) =>
  s === "healthy" ? CheckCircle2 : s === "warning" ? AlertCircle : AlertTriangle;

function scoreTone(score: number | null, invert = false) {
  if (score == null) return "bg-slate-100 text-slate-700 border-slate-200";
  const s = invert ? 100 - score : score;
  if (s >= 70) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function RagPage() {
  const list = useServerFn(listSessions);
  const del = useServerFn(deleteSession);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["rag-sessions"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rag-sessions"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={Network}
        title="RAG Pipeline Debugger"
        description="Diagnose retrieval, grounding, ranking, and hallucination issues across your RAG stack."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/rag/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New session
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
            icon={Network}
            title="No RAG sessions yet"
            description="Paste a question, retrieved chunks, and the generated answer to score grounding and hallucination."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/rag/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Analyze a session
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
                    to="/rag/$id"
                    params={{ id: row.id }}
                    className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.name}</div>
                        <div className="mt-0.5 truncate text-xs text-ink-soft">
                          {row.question ?? "—"} ·{" "}
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${scoreTone(Number(row.grounding_score ?? 0))}`}
                      >
                        Grounding {Math.round(Number(row.grounding_score ?? 0))}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${scoreTone(Number(row.hallucination_score ?? 0), true)}`}
                      >
                        Halluc {Math.round(Number(row.hallucination_score ?? 0))}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Delete this session?")) deleteMut.mutate(row.id);
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
