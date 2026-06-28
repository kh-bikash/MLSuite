import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layers, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCompares, deleteCompare } from "@/lib/embeddings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/embeddings/")({
  head: () => ({ meta: [{ title: "Embedding Comparator — ML Inspector" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listCompares);
  const del = useServerFn(deleteCompare);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["embedding-compares"], queryFn: () => list() });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["embedding-compares"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={Layers}
        title="Embedding Model Comparator"
        description="Run queries through multiple embedding models against the same chunks and see which one actually retrieves the right results."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/embeddings/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New comparison
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
            icon={Layers}
            title="No comparisons yet"
            description="Pick a few embedding models, paste queries and candidate chunks, see which model wins."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/embeddings/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Compare models
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
                  to="/embeddings/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.winner && (
                      <Badge
                        className="rounded-full bg-emerald-100 text-emerald-700 border-emerald-200"
                        variant="outline"
                      >
                        Winner: {row.winner}
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
