import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gauge, Sparkles, Trophy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { getSharedBenchmark } from "@/lib/benchmarks.functions";
import { ShaderOrb } from "@/components/ShaderOrb";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/share/benchmarks/$token")({
  head: () => ({
    meta: [
      { title: "Shared benchmark — ML Inspector AI" },
      { name: "description", content: "A public benchmark report shared from ML Inspector AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedBenchmarkPage,
});

function SharedBenchmarkPage() {
  const { token } = useParams({ from: "/share/benchmarks/$token" });
  const fn = useServerFn(getSharedBenchmark);
  const { data, isLoading } = useQuery({
    queryKey: ["shared-benchmark", token],
    queryFn: () => fn({ data: { token } }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!data?.benchmark) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
          <p className="mt-2 text-sm text-ink-soft">
            This benchmark may have been unshared or deleted.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const b = data.benchmark;
  const tasks = (b.tasks as any[]) || [];
  const models = (b.models as string[]) || [];
  const metrics = (b.metrics as string[]) || [];
  const lastRun = data.runs[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden border-b">
        <ShaderOrb className="absolute inset-0 h-full w-full opacity-70" height={360} />
        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-ink-soft transition hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" /> ML Inspector AI
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl"
          >
            {b.name}
          </motion.h1>
          {b.description && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 max-w-2xl text-base text-ink-soft"
            >
              {b.description}
            </motion.p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="rounded-full bg-background/70">
              {b.category}
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/70">
              {tasks.length} tasks
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/70">
              {models.length} models
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/70">
              Shared {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {lastRun ? (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">
              <Trophy className="h-4 w-4" /> Latest leaderboard
            </h2>
            <div className="mt-4 grid gap-2">
              {((lastRun.leaderboard as any[]) ?? []).map((row, i) => (
                <motion.div
                  key={row.model}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-elevated flex items-start gap-4 p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.model}</div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {Math.round(row.avg_score)}
                      </div>
                    </div>
                    {row.strengths?.length > 0 && (
                      <div className="mt-1 text-xs text-emerald-700">
                        + {row.strengths.join(", ")}
                      </div>
                    )}
                    {row.weaknesses?.length > 0 && (
                      <div className="mt-0.5 text-xs text-rose-700">
                        − {row.weaknesses.join(", ")}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ) : (
          <div className="card-elevated p-6 text-sm text-ink-soft">
            This benchmark hasn't been run yet.
          </div>
        )}

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">
            <Gauge className="h-4 w-4" /> Tasks
          </h2>
          <div className="card-elevated mt-4 divide-y">
            {tasks.map((t, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="font-mono">{t.id}</span>
                  <Badge variant="outline" className="rounded-full">
                    {t.category}
                  </Badge>
                </div>
                <div className="mt-1 text-sm">{t.prompt}</div>
                {t.reference && (
                  <div className="mt-1 text-xs italic text-ink-soft">ref: {t.reference}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {metrics.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
              Metrics
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {metrics.map((m) => (
                <Badge key={m} variant="outline" className="rounded-full">
                  {m}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 border-t pt-6 text-center text-xs text-ink-soft">
          Published with{" "}
          <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">
            ML Inspector AI
          </Link>
        </footer>
      </main>
    </div>
  );
}
