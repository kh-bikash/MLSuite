import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Sparkles, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listReports, deleteReport } from "@/lib/audit-reports.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/audit-reports/")({
  head: () => ({ meta: [{ title: "AI Audit Reports — ML Inspector" }] }),
  component: Page,
});

const riskTone: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

function Page() {
  const list = useServerFn(listReports);
  const del = useServerFn(deleteReport);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["audit-reports"], queryFn: () => list() });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-reports"] });
      toast.success("Deleted");
    },
  });

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title="AI Product Audit Reports"
        description="One boardroom-ready report that combines your bias audit, model card, and prompt regression results."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/audit-reports/new">
              <Sparkles className="mr-1.5 h-4 w-4" /> New report
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
            icon={ClipboardCheck}
            title="No reports yet"
            description="Bundle your existing artifacts into a single AI governance report."
            action={
              <Button
                className="rounded-full"

                asChild
              >
                <Link to="/audit-reports/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Generate report
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
                  to="/audit-reports/$id"
                  params={{ id: row.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">
                      {row.system_name ?? "—"} ·{" "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.content?.overall_risk && (
                      <Badge
                        variant="outline"
                        className={`rounded-full ${riskTone[row.content.overall_risk] ?? ""}`}
                      >
                        {row.content.overall_risk} risk
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
