import { type ReactNode, useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Network,
  FileText,
  FlaskConical,
  Settings,
  Bell,
  Sparkles,
  Search,
  LogOut,
  Command,
  Gauge,
  History,
  Scissors,
  Layers,
  DollarSign,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CommandPalette } from "./CommandPalette";
import { OnboardingTour } from "./OnboardingTour";
import { MotionToggle } from "./MotionToggle";
import { AnimatePresence, motion } from "framer-motion";
import { presetForPath } from "@/lib/route-presets";
import { useMotionSettings } from "./MotionSettings";
import { ThreeBackground } from "./ThreeBackground";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { group: "Apps" as const },
  { to: "/experiments", label: "Experiment Analyst", icon: Activity },
  { to: "/datasets", label: "Bias Auditor", icon: ShieldCheck },
  { to: "/rag", label: "RAG Debugger", icon: Network },
  { to: "/model-cards", label: "Model Cards", icon: FileText },
  { to: "/prompts", label: "Prompt Tester", icon: FlaskConical },
  { to: "/benchmarks", label: "Benchmarks", icon: Gauge },
  { group: "RAG & Models" as const },
  { to: "/chunking", label: "Chunking Simulator", icon: Scissors },
  { to: "/embeddings", label: "Embedding Comparator", icon: Layers },
  { to: "/costs", label: "Cost Estimator", icon: DollarSign },
  { to: "/finetune", label: "Fine-tune Readiness", icon: GraduationCap },
  { to: "/audit-reports", label: "Audit Reports", icon: ClipboardCheck },
  { group: "Workspace" as const },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/audit", label: "Audit Trail", icon: History },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data ?? { id: user.id, email: user.email, full_name: user.email?.split("@")[0] };
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      {/* Global ambient WebGL backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <ThreeBackground variant="nebula" opacity={0.95} />
        <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-transparent to-background/40" />
      </div>
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
          <div className="flex items-center gap-2 px-5 py-5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">ML Inspector AI</span>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="mx-3 mb-3 flex items-center justify-between rounded-lg border bg-surface px-3 py-2 text-sm text-ink-soft transition hover:bg-secondary"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> Search
            </span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>

          <nav className="flex-1 overflow-y-auto px-2 py-2">
            {nav.map((item, i) =>
              "group" in item ? (
                <div
                  key={i}
                  className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {item.group}
                </div>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group mx-1 my-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    pathname === item.to || pathname.startsWith(item.to + "/")
                      ? "bg-secondary font-medium text-foreground"
                      : "text-ink-soft hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ),
            )}
          </nav>

          <div className="border-t p-3 space-y-3">
            <MotionToggle compact />
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase">
                {profile?.full_name?.[0] ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{profile?.full_name ?? "User"}</div>
                <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
              </div>
              <button
                onClick={signOut}
                className="rounded-md p-1.5 text-ink-soft transition hover:bg-secondary hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b bg-background/80 px-6 py-3 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">ML Inspector AI</span>
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-md border bg-surface p-2"
            >
              <Command className="h-4 w-4" />
            </button>
          </div>
          <RouteTransition pathname={pathname}>{children}</RouteTransition>
        </main>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <OnboardingTour />
      </div>
    </div>
  );
}

function RouteTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const preset = presetForPath(pathname);
  const { effectiveAnimate } = useMotionSettings();
  const duration = effectiveAnimate ? preset.duration : 0;
  const y = effectiveAnimate ? preset.y : 0;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -Math.min(y, 6) }}
        transition={{ duration, ease: preset.ease }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
