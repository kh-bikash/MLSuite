import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scissors, ArrowLeft, Loader2, Network } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSim } from "@/lib/chunking.functions";
import { ReportSection } from "@/components/ReportBits";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chunking/$id")({
  head: () => ({ meta: [{ title: "Chunking Simulation" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const get = useServerFn(getSim);
  const { data, isLoading } = useQuery({
    queryKey: ["chunking-sim", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (!data) return null;
  const r = (data as any).results || {};

  function sendToRag() {
    const winnerName = r.recommendation?.strategy;
    const winner =
      (r.strategies || []).find((s: any) => s.name === winnerName) || (r.strategies || [])[0];
    const sampleChunks: string[] = winner?.sample_chunks?.length
      ? winner.sample_chunks
      : ((data as any).document?.split(/\n\s*\n/).slice(0, 5) ?? []);
    const payload = {
      name: `${data.name} → rag`,
      question: (data as any).query ?? "",
      chunks: sampleChunks.map((t: string) => ({
        text: t,
        source: `${data.name} · ${winner?.name ?? "winner"}`,
      })),
      retriever: "from chunking sim",
      chunk_size: winner?.avg_tokens ? Math.round(winner.avg_tokens * 4) : undefined,
    };
    sessionStorage.setItem("rag:prefill", JSON.stringify(payload));
    toast.success("Prefilled — generate your answer and run analysis");
    nav({ to: "/rag/new" });
  }

  return (
    <>
      <PageHeader
        icon={Scissors}
        title={data.name}
        description={r.summary}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={sendToRag}>
              <Network className="mr-1.5 h-4 w-4" /> Send to RAG
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"

              asChild
            >
              <Link to="/chunking">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Link>
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-5">
          <ReportSection title="Recommended strategy">
            <div className="flex items-start gap-3">
              <Badge className="rounded-full bg-primary text-primary-foreground">
                {r.recommendation?.strategy}
              </Badge>
              <p className="text-sm text-ink-soft">{r.recommendation?.rationale}</p>
            </div>
          </ReportSection>

          <div className="grid gap-3 md:grid-cols-2">
            {(r.strategies || []).map((s: any, i: number) => (
              <div key={i} className="card-elevated p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{s.name}</h4>
                  <span className="text-xs text-ink-soft tabular-nums">{s.chunk_count} chunks</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-ink-soft">Coverage</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {Math.round(s.coverage_score)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-soft">Retrieval</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {Math.round(s.retrieval_score)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-soft">Coherence</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {Math.round(s.semantic_coherence)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-medium text-emerald-700">Pros</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                      {(s.pros || []).map((p: string, j: number) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-rose-700">Cons</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                      {(s.cons || []).map((p: string, j: number) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
