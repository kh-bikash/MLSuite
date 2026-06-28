import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { Gauge, Loader2, Trophy, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getBenchmarkRun } from "@/lib/benchmarks.functions";

export const Route = createFileRoute("/_authenticated/benchmarks/$id/runs/$runId")({
  head: () => ({ meta: [{ title: "Benchmark run" }] }),
  component: RunPage,
});

function RunPage() {
  const { id, runId } = useParams({ from: "/_authenticated/benchmarks/$id/runs/$runId" });
  const get = useServerFn(getBenchmarkRun);
  const { data: run, isLoading } = useQuery({
    queryKey: ["benchmark-run", runId],
    queryFn: () => get({ data: { id: runId } }),
  });

  if (isLoading || !run) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const leaderboard: any[] = (run.leaderboard as any[]) || [];
  const results: any[] = (run.results as any[]) || [];
  const summary = (run.summary as any)?.summary as string | undefined;
  const models: string[] = Array.from(new Set(results.map((r) => r.model)));
  const tasks: string[] = Array.from(new Set(results.map((r) => r.task_id)));

  function scoreFor(model: string, task: string) {
    return results.find((r) => r.model === model && r.task_id === task);
  }

  function scoreColor(s: number) {
    if (s >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (s >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  }

  return (
    <>
      <PageHeader
        icon={Gauge}
        title="Run results"
        description={summary || "Benchmark execution complete."}
        actions={
          <Link
            to="/benchmarks/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-4 py-2 text-sm transition hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to suite
          </Link>
        }
      />
      <PageBody>
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">
            <Trophy className="h-4 w-4" /> Leaderboard
          </div>
          <div className="mt-4 grid gap-2">
            {leaderboard.map((row, i) => (
              <div
                key={row.model}
                className="flex items-start gap-4 rounded-xl border bg-surface p-4"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{row.model}</div>
                    <div className="text-lg font-semibold tabular-nums">
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
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated mt-6 overflow-x-auto p-6">
          <div className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
            Scores by task
          </div>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="border-b py-2 pr-4">Task</th>
                {models.map((m) => (
                  <th key={m} className="border-b px-3 py-2">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t} className="align-top">
                  <td className="border-b py-3 pr-4 font-mono text-xs">{t}</td>
                  {models.map((m) => {
                    const s = scoreFor(m, t);
                    if (!s)
                      return (
                        <td key={m} className="border-b px-3 py-3 text-ink-soft">
                          —
                        </td>
                      );
                    return (
                      <td key={m} className="border-b px-3 py-3">
                        <div
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${scoreColor(s.score)}`}
                        >
                          {Math.round(s.score)}
                        </div>
                        <div className="mt-1 max-w-[260px] text-xs text-ink-soft">
                          {s.rationale}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>
    </>
  );
}
