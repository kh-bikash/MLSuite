import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader icon={Bell} title="Notifications" />
      <PageBody>
        {!data || data.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="Notifications about your runs, audits, and reports will appear here."
          />
        ) : (
          <div className="card-elevated divide-y">
            {data.map((n: any) => (
              <div key={n.id} className="px-5 py-4">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="mt-0.5 text-sm text-ink-soft">{n.body}</div>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
