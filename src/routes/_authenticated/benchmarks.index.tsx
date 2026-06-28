import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { Gauge, Plus, Loader2, Trash2, Upload, Share2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listBenchmarks, deleteBenchmark, importBenchmark } from "@/lib/benchmarks.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/benchmarks/")({
  head: () => ({ meta: [{ title: "Benchmark Suite — ML Inspector" }] }),
  component: BenchmarksPage,
});

function BenchmarksPage() {
  const list = useServerFn(listBenchmarks);
  const del = useServerFn(deleteBenchmark);
  const imp = useServerFn(importBenchmark);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["benchmarks"], queryFn: () => list() });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["benchmarks"] });
      toast.success("Benchmark deleted");
    },
  });

  const importMut = useMutation({
    mutationFn: (payload: unknown) => imp({ data: { payload } }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["benchmarks"] });
      toast.success(`Imported "${row.name}"`);
      navigate({ to: "/benchmarks/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Invalid benchmark file"),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const payload = JSON.parse(text);
      importMut.mutate(payload);
    } catch {
      toast.error("Could not parse JSON file");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <>
      <PageHeader
        icon={Gauge}
        title="Benchmark Suite"
        description="Design multi-model evaluations. Score every model on every task and see who wins where."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={onFile}
            />
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => fileRef.current?.click()}
              disabled={importMut.isPending}
            >
              {importMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Import
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/benchmarks/new">
                <Plus className="mr-1.5 h-4 w-4" /> New benchmark
              </Link>
            </Button>
          </>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="No benchmarks yet"
            description="Create a suite of tasks and pit multiple models against it — or import an existing JSON suite."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/benchmarks/new">
                  <Plus className="mr-1.5 h-4 w-4" /> New benchmark
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {data.map((b: any, i: number) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to="/benchmarks/$id"
                  params={{ id: b.id }}
                  className="card-elevated group flex items-center justify-between gap-4 px-5 py-4 transition hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                      <Gauge className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm font-medium">
                        {b.name}
                        {b.is_public && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-medium text-sky-700">
                            <Share2 className="h-2.5 w-2.5" /> Shared
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-soft">
                        {(b.tasks as any[])?.length ?? 0} tasks · {(b.models as any[])?.length ?? 0}{" "}
                        models · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="outline" className="rounded-full">
                      {b.category}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm("Delete this benchmark?")) deleteMut.mutate(b.id);
                      }}
                      className="text-ink-soft opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
