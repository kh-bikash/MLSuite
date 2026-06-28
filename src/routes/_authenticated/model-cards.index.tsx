import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCards, deleteCard } from "@/lib/model-cards.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/model-cards/")({
  head: () => ({ meta: [{ title: "Model Card Generator — ML Inspector" }] }),
  component: CardsPage,
});

function CardsPage() {
  const list = useServerFn(listCards);
  const del = useServerFn(deleteCard);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["model-cards"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["model-cards"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Model Card Generator"
        description="Generate Google- and HuggingFace-compatible model cards with AI-assisted drafting."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/model-cards/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New card
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
            icon={FileText}
            title="No model cards yet"
            description="Provide a model name, task, and a few notes — the AI drafts a complete responsible-AI model card."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/model-cards/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Draft a card
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {data.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to="/model-cards/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {row.model_name}
                        {row.version && (
                          <span className="ml-2 text-xs text-ink-soft">v{row.version}</span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-soft">
                        {row.task ?? "task unspecified"} ·{" "}
                        {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {row.license && (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {row.license}
                      </Badge>
                    )}
                    <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                      {row.status}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm("Delete this model card?")) deleteMut.mutate(row.id);
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
