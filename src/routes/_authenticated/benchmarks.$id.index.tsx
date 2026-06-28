import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gauge,
  Play,
  Loader2,
  Trophy,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Download,
  Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBenchmark, runBenchmark, shareBenchmark } from "@/lib/benchmarks.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/benchmarks/$id/")({
  head: () => ({ meta: [{ title: "Benchmark" }] }),
  component: BenchmarkDetail,
});

function BenchmarkDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getBenchmark);
  const run = useServerFn(runBenchmark);
  const share = useServerFn(shareBenchmark);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["benchmark", id],
    queryFn: () => get({ data: { id } }),
  });

  const runMut = useMutation({
    mutationFn: () => run({ data: { id } }),
    onSuccess: () => {
      toast.success("Benchmark complete — notification sent");
      qc.invalidateQueries({ queryKey: ["benchmark", id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Run failed"),
  });

  const shareMut = useMutation({
    mutationFn: (enabled: boolean) => share({ data: { id, enabled } }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["benchmark", id] });
      qc.invalidateQueries({ queryKey: ["benchmarks"] });
      if (row.is_public) {
        const url = `${window.location.origin}/share/benchmarks/${row.share_token}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        toast.success("Public link copied to clipboard");
      } else {
        toast.success("Sharing disabled");
      }
    },
  });

  if (isLoading || !data?.benchmark) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const b = data.benchmark;
  const tasks = (b.tasks as any[]) || [];
  const models = (b.models as string[]) || [];
  const metrics = (b.metrics as string[]) || [];
  const shareUrl = b.share_token
    ? `${window.location.origin}/share/benchmarks/${b.share_token}`
    : null;

  function exportSuite() {
    const payload = {
      name: b.name,
      description: b.description,
      category: b.category,
      models,
      metrics,
      tasks: tasks.map((t: any) => ({
        id: t.id,
        prompt: t.prompt,
        reference: t.reference,
        category: t.category,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(b.name || "benchmark").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Benchmark exported");
  }

  return (
    <>
      <PageHeader
        icon={Gauge}
        title={b.name}
        description={b.description || "Multi-model benchmark suite."}
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportSuite}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => shareMut.mutate(!b.is_public)}
              disabled={shareMut.isPending}
            >
              {shareMut.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : b.is_public ? (
                <Lock className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {b.is_public ? "Stop sharing" : "Share"}
            </Button>
            <Button
              onClick={() => runMut.mutate()}
              disabled={runMut.isPending}
              className="rounded-full"
            >
              {runMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Run suite
            </Button>
          </>
        }
      />
      <PageBody>
        {shareUrl && (
          <div className="card-elevated mb-6 flex items-center gap-3 border-sky-200 bg-sky-50/40 p-4">
            <Share2 className="h-4 w-4 shrink-0 text-sky-700" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium text-sky-900">Public report link</div>
              <div className="truncate font-mono text-xs text-sky-700">{shareUrl}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs transition hover:bg-secondary"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-elevated p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Tasks</h3>
            <div className="mt-3 divide-y">
              {tasks.map((t, i) => (
                <div key={i} className="py-3">
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
          </div>

          <div className="space-y-4">
            <div className="card-elevated p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
                Models
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {models.map((m) => (
                  <Badge key={m} variant="outline" className="rounded-full">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="card-elevated p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
                Metrics
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {metrics.length === 0 ? (
                  <span className="text-xs text-ink-soft">Default scoring</span>
                ) : (
                  metrics.map((m) => (
                    <Badge key={m} variant="outline" className="rounded-full">
                      {m}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Runs</h3>
          {data.runs.length === 0 ? (
            <div className="card-elevated mt-3 p-6 text-sm text-ink-soft">
              No runs yet. Press “Run suite” to score every model on every task.
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {data.runs.map((r: any) => {
                const top = (r.summary as any)?.summary as string | undefined;
                return (
                  <Link
                    key={r.id}
                    to="/benchmarks/$id/runs/$runId"
                    params={{ id, runId: r.id }}
                    className="card-elevated flex items-center justify-between gap-3 px-5 py-4 transition hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{top ?? "Completed run"}</div>
                        <div className="text-xs text-ink-soft">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} ·{" "}
                          {r.duration_ms}ms
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-soft" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
