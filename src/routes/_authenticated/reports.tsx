import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Reports"
        description="All exported reports across every app."
      />
      <PageBody>
        {!reports || reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Generate one from any app to see it here."
          />
        ) : (
          <div className="card-elevated divide-y">
            {reports.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 text-sm">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.app} · {r.format}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
