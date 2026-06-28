import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Scissors, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { listSims, deleteSim } from "@/lib/chunking.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chunking/")({
  head: () => ({ meta: [{ title: "Chunking Simulator — ML Inspector" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listSims);
  const del = useServerFn(deleteSim);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["chunking-sims"], queryFn: () => list() });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chunking-sims"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={Scissors}
        title="Chunking Strategy Simulator"
        description="Test fixed-size, sliding-window, sentence, and paragraph chunking on your actual documents before you build the RAG pipeline."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/chunking/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New simulation
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
            icon={Scissors}
            title="No simulations yet"
            description="Paste a document, optionally add a target query, and see which chunking strategy wins."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/chunking/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Run a simulation
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
                  to="/chunking/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">
                      {row.recommendation?.strategy ?? "—"} ·{" "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm("Delete?")) delMut.mutate(row.id);
                    }}
                    className="text-xs text-ink-soft opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
