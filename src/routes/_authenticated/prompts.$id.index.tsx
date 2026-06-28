import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  FlaskConical,
  ArrowLeft,
  Loader2,
  Play,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSuite, runSuite } from "@/lib/prompts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prompts/$id/")({
  head: () => ({ meta: [{ title: "Prompt Suite — ML Inspector" }] }),
  component: SuiteDetail,
});

function toneFromScore(s: number | null | undefined) {
  if (s == null) return "bg-slate-50 text-slate-600 border-slate-200";
  if (s >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function SuiteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getSuite);
  const run = useServerFn(runSuite);

  const { data, isLoading, error } = useQuery({
    queryKey: ["prompt-suite", id],
    queryFn: () => get({ data: { id } }),
  });

  const runMut = useMutation({
    mutationFn: () => run({ data: { suite_id: id } }),
    onSuccess: (res) => {
      toast.success("Run complete");
      qc.invalidateQueries({ queryKey: ["prompt-suite", id] });
      navigate({ to: "/prompts/$id/runs/$runId", params: { id, runId: res.runId } });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const { suite, runs } = data;
  const cases = (suite.cases ?? []) as Array<{ name: string; input: string; expected?: string }>;
  const models = (suite.models ?? []) as string[];

  return (
    <>
      <PageHeader
        icon={FlaskConical}
        title={suite.name}
        description={suite.description ?? `${cases.length} cases × ${models.length} models`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full"
              disabled={runMut.isPending}
              onClick={() => runMut.mutate()}
            >
              {runMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" /> Run suite
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"

              asChild
            >
              <Link to="/prompts">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> All suites
              </Link>
            </Button>
          </div>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5"
        >
          <div className="card-elevated p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">System prompt</div>
                <pre className="mt-2 overflow-auto rounded-xl border bg-surface/40 p-3 font-mono text-xs">
                  {suite.system_prompt ?? "—"}
                </pre>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">Models</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {models.map((m) => (
                    <Badge key={m} variant="outline" className="rounded-full text-[10px]">
                      {m}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 text-xs uppercase tracking-wide text-ink-soft">Cases</div>
                <div className="mt-2 grid gap-1.5">
                  {cases.map((c, i) => (
                    <div key={i} className="rounded-lg border px-3 py-2 text-xs">
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-0.5 line-clamp-1 font-mono text-ink-soft">{c.input}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-ink-soft" />
              <h2 className="text-sm font-semibold tracking-tight">Runs</h2>
            </div>
            {runs.length === 0 ? (
              <div className="rounded-xl border bg-surface/40 px-4 py-6 text-center text-sm text-ink-soft">
                No runs yet. Hit "Run suite" to execute every case against every model.
              </div>
            ) : (
              <div className="grid gap-2">
                {runs.map((r) => {
                  const summary = (r.summary ?? {}) as {
                    total?: number;
                    errors?: number;
                    leaderboard?: Array<{
                      model: string;
                      avg_judge: number | null;
                      avg_latency_ms: number | null;
                    }>;
                  };
                  const top = summary.leaderboard?.[0];
                  return (
                    <Link
                      key={r.id}
                      to="/prompts/$id/runs/$runId"
                      params={{ id, runId: r.id }}
                      className="group flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition hover:bg-surface/40"
                    >
                      <div className="flex items-center gap-3">
                        {r.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : r.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            Run · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-ink-soft">
                            {summary.total ?? 0} results · {summary.errors ?? 0} errors
                            {top && (
                              <>
                                {" "}
                                · top: <span className="font-mono">{top.model}</span> (
                                {top.avg_judge ?? "—"})
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {top?.avg_judge != null && (
                          <Badge
                            variant="outline"
                            className={`rounded-full border ${toneFromScore(top.avg_judge)}`}
                          >
                            judge {top.avg_judge}
                          </Badge>
                        )}
                        {top?.avg_latency_ms != null && (
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            <Clock className="mr-1 h-3 w-3" /> {top.avg_latency_ms}ms
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-ink-soft transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}
