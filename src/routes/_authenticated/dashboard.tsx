import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody } from "@/components/PageHeader";
import { ShaderOrb } from "@/components/ShaderOrb";
import {
  Activity,
  ShieldCheck,
  Network,
  FileText,
  FlaskConical,
  ArrowUpRight,
  Sparkles,
  Scissors,
  Layers,
  DollarSign,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ML Inspector AI" }] }),
  component: Dashboard,
});

const apps = [
  {
    to: "/experiments",
    name: "Experiment Failure Analyst",
    icon: Activity,
    table: "experiment_runs",
    desc: "Diagnose training failures.",
  },
  {
    to: "/datasets",
    name: "Dataset Bias Auditor",
    icon: ShieldCheck,
    table: "dataset_audits",
    desc: "Audit fairness & risk.",
  },
  {
    to: "/rag",
    name: "RAG Pipeline Debugger",
    icon: Network,
    table: "rag_sessions",
    desc: "Fix retrieval & grounding.",
  },
  {
    to: "/model-cards",
    name: "Model Card Generator",
    icon: FileText,
    table: "model_cards",
    desc: "Generate documentation.",
  },
  {
    to: "/prompts",
    name: "Prompt Regression Tester",
    icon: FlaskConical,
    table: "prompt_suites",
    desc: "Test prompts at scale.",
  },
  {
    to: "/chunking",
    name: "Chunking Strategy Simulator",
    icon: Scissors,
    table: "chunking_sims",
    desc: "Pick the right chunking before RAG.",
  },
  {
    to: "/embeddings",
    name: "Embedding Model Comparator",
    icon: Layers,
    table: "embedding_compares",
    desc: "Quantify which embedder wins.",
  },
  {
    to: "/costs",
    name: "LLM Cost Estimator",
    icon: DollarSign,
    table: "cost_estimates",
    desc: "Optimal model for your workload.",
  },
  {
    to: "/finetune",
    name: "Fine-tuning Readiness",
    icon: GraduationCap,
    table: "finetune_checks",
    desc: "Do you actually need to fine-tune?",
  },
  {
    to: "/audit-reports",
    name: "AI Product Audit Reports",
    icon: ClipboardCheck,
    table: "audit_reports",
    desc: "Boardroom-ready governance.",
  },
] as const;

function Dashboard() {
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const results = await Promise.all(
        apps.map(async (a) => {
          const { count } = await supabase
            .from(a.table as any)
            .select("*", { count: "exact", head: true });
          return [a.table, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, number>;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  return (
    <>
      <div className="relative overflow-hidden border-b">
        <ShaderOrb className="absolute inset-0 h-full w-full" height={320} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative px-8 py-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-xs font-medium text-ink-soft"
          >
            <Sparkles className="h-3.5 w-3.5" /> Workspace
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl"
          >
            Welcome back.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-3 max-w-xl text-sm text-ink-soft md:text-base"
          >
            Six focused tools for debugging, evaluating, auditing, benchmarking, and documenting AI
            systems — all in one calm workspace.
          </motion.p>
        </div>
      </div>
      <PageBody>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app, i) => (
            <motion.div
              key={app.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Link
                to={app.to}
                className="card-elevated group block p-6 transition hover:shadow-pop"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground">
                    <app.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-ink-soft transition group-hover:text-foreground" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">{app.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{app.desc}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {counts?.[app.table] ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">items</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Recent activity</h2>
          <div className="card-elevated divide-y">
            {!recent || recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-soft">No activity yet.</div>
            ) : (
              recent.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                      {a.app}
                    </span>
                    <span>{a.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
