import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: function AuthenticatedLayout() {
    const navigate = useNavigate();
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session) {
          navigate({ to: "/auth", replace: true });
        } else {
          setIsAuthed(true);
        }
      });
    }, [navigate]);

    if (!isAuthed) {
      return null; // Prevent hydration mismatch by matching server output
    }

    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  },
});
