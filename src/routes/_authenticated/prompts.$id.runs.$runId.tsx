import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { FlaskConical, ArrowLeft, Loader2, Trophy, Clock, AlertTriangle } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRun } from "@/lib/prompts.functions";

export const Route = createFileRoute("/_authenticated/prompts/$id/runs/$runId")({
  head: () => ({ meta: [{ title: "Suite Run — ML Inspector" }] }),
  component: RunDetail,
});

function tone(s: number | null | undefined) {
  if (s == null) return "bg-slate-50 text-slate-600 border-slate-200";
  if (s >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function RunDetail() {
  const { id, runId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getRun);

  const { data, isLoading, error } = useQuery({
    queryKey: ["prompt-run", runId],
    queryFn: () => get({ data: { runId } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <PageBody>
        <div className="card-elevated p-8 text-center text-sm text-ink-soft">
          {(error as Error)?.message ?? "Not found"}
        </div>
      </PageBody>
    );
  }

  const { run, results } = data;
  const suite = (run as any).prompt_suites as { name: string; cases: any; models: any } | null;
  const cases = (suite?.cases ?? []) as Array<{ name: string; input: string; expected?: string }>;
  const models = (suite?.models ?? []) as string[];
  const summary = (run.summary ?? {}) as {
    total?: number;
    errors?: number;
    leaderboard?: Array<{
      model: string;
      avg_judge: number | null;
      avg_similarity: number | null;
      avg_latency_ms: number | null;
      errors: number;
      count: number;
    }>;
  };
  const leaderboard = summary.leaderboard ?? [];

  const resultFor = (caseName: string, model: string) =>
    results.find((r) => r.case_name === caseName && r.model === model);

  return (
    <>
      <PageHeader
        icon={FlaskConical}
        title={`${suite?.name ?? "Suite"} · Run`}
        description={`${summary.total ?? results.length} results · ${summary.errors ?? 0} errors`}
        actions={
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => navigate({ to: "/prompts/$id", params: { id } })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to suite
          </Button>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5"
        >
          <div className="card-elevated p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-ink-soft" />
              <h2 className="text-sm font-semibold tracking-tight">Leaderboard</h2>
            </div>
            <div className="grid gap-2">
              {leaderboard.map((m, i) => (
                <div
                  key={m.model}
                  className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs font-medium">
                      {i + 1}
                    </div>
                    <div className="font-mono text-sm">{m.model}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`rounded-full border ${tone(m.avg_judge)}`}>
                      judge {m.avg_judge ?? "—"}
                    </Badge>
                    {m.avg_similarity != null && (
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${tone(m.avg_similarity)}`}
                      >
                        sim {m.avg_similarity}
                      </Badge>
                    )}
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      <Clock className="mr-1 h-3 w-3" /> {m.avg_latency_ms ?? "—"}ms
                    </Badge>
                    {m.errors > 0 && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" /> {m.errors}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">Results matrix</h2>
            <div className="grid gap-4">
              {cases.map((c) => (
                <div key={c.name} className="rounded-xl border p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="mt-1 line-clamp-2 font-mono text-xs text-ink-soft">
                      {c.input}
                    </div>
                    {c.expected && (
                      <div className="mt-1 line-clamp-1 text-xs text-ink-soft">
                        <span className="font-medium">expected:</span> {c.expected}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {models.map((m) => {
                      const r = resultFor(c.name, m);
                      const meta = (r?.metadata ?? {}) as {
                        rationale?: string;
                        matches_expected?: boolean;
                        error?: string;
                      };
                      return (
                        <div key={m} className="rounded-lg border bg-surface/40 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="font-mono text-xs">{m}</div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`rounded-full border text-[10px] ${tone(r?.judge_score ?? null)}`}
                              >
                                judge {r?.judge_score ?? "—"}
                              </Badge>
                              {r?.similarity != null && (
                                <Badge
                                  variant="outline"
                                  className={`rounded-full border text-[10px] ${tone(Math.round(r.similarity))}`}
                                >
                                  sim {Math.round(r.similarity)}
                                </Badge>
                              )}
                              <Badge variant="outline" className="rounded-full text-[10px]">
                                <Clock className="mr-1 h-3 w-3" /> {r?.latency_ms ?? "—"}ms
                              </Badge>
                              {r?.tokens != null && (
                                <Badge variant="outline" className="rounded-full text-[10px]">
                                  {r.tokens} tok
                                </Badge>
                              )}
                            </div>
                          </div>
                          {r?.output ? (
                            <pre className="overflow-auto whitespace-pre-wrap rounded-md border bg-background p-2 font-mono text-xs">
                              {r.output}
                            </pre>
                          ) : (
                            <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                              {meta.error ?? "No output"}
                            </div>
                          )}
                          {meta.rationale && (
                            <div className="mt-2 text-xs text-ink-soft">
                              <span className="font-medium text-foreground">Judge: </span>
                              {meta.rationale}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}
