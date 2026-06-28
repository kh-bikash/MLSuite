import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FlaskConical, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSuites, deleteSuite } from "@/lib/prompts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prompts/")({
  head: () => ({ meta: [{ title: "Prompt Regression Tester — ML Inspector" }] }),
  component: PromptsPage,
});

function PromptsPage() {
  const list = useServerFn(listSuites);
  const del = useServerFn(deleteSuite);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["prompt-suites"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt-suites"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={FlaskConical}
        title="Prompt Regression Tester"
        description="Define suites, run them across frontier models, and catch regressions before they ship."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/prompts/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New suite
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
            icon={FlaskConical}
            title="No suites yet"
            description="Define test cases, pick models, and run multi-model evals with similarity and LLM-judge scoring."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/prompts/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Create a suite
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {data.map((row, i) => {
              const models = (row.models ?? []) as string[];
              const cases = (row.cases ?? []) as unknown[];
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to="/prompts/$id"
                    params={{ id: row.id }}
                    className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.name}</div>
                        <div className="mt-0.5 truncate text-xs text-ink-soft">
                          {row.description ?? "—"} ·{" "}
                          {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {cases.length} cases
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {models.length} models
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Delete this suite and all runs?")) deleteMut.mutate(row.id);
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
