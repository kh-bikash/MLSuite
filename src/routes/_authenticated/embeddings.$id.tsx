import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layers, ArrowLeft, Loader2, Trophy } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCompare } from "@/lib/embeddings.functions";
import { ReportSection } from "@/components/ReportBits";

export const Route = createFileRoute("/_authenticated/embeddings/$id")({
  head: () => ({ meta: [{ title: "Embedding Comparison" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const get = useServerFn(getCompare);
  const { data, isLoading } = useQuery({
    queryKey: ["embedding-compare", id],
    queryFn: () => get({ data: { id } }),
  });
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (!data) return null;
  const r = (data as any).results || {};

  return (
    <>
      <PageHeader
        icon={Layers}
        title={data.name}
        description={r.summary}
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/embeddings">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-5">
          <ReportSection title="Recommendation">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-500" />
              <Badge
                className="rounded-full bg-emerald-100 text-emerald-700 border-emerald-200"
                variant="outline"
              >
                {r.recommendation?.pick ?? r.winner}
              </Badge>
              <p className="text-sm text-ink-soft">{r.recommendation?.reason}</p>
            </div>
          </ReportSection>

          <ReportSection title="Leaderboard">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-soft">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Model</th>
                    <th className="px-3">Relevance</th>
                    <th className="px-3">P@3</th>
                    <th className="px-3">R@5</th>
                    <th className="px-3">MRR</th>
                    <th className="px-3">nDCG@5</th>
                    <th className="px-3">Diversity</th>
                    <th className="px-3">Drift</th>
                    <th className="px-3">Latency</th>
                    <th className="px-3">$/1M tok</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.models || []).map((m: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{m.name}</td>
                      <td className="px-3 tabular-nums">{Math.round(m.avg_relevance)}</td>
                      <td className="px-3 tabular-nums">{Math.round(m.precision_at_3)}</td>
                      <td className="px-3 tabular-nums">{Math.round(m.recall_at_5)}</td>
                      <td className="px-3 tabular-nums">{(m.mrr ?? 0).toFixed(2)}</td>
                      <td className="px-3 tabular-nums">{(m.ndcg_at_5 ?? 0).toFixed(2)}</td>
                      <td className="px-3 tabular-nums">{Math.round(m.diversity_score ?? 0)}</td>
                      <td className="px-3 tabular-nums">{Math.round(m.semantic_drift ?? 0)}</td>
                      <td className="px-3 text-xs tabular-nums">
                        {m.est_latency_ms ? (
                          `${m.est_latency_ms}ms`
                        ) : (
                          <Badge variant="outline" className="rounded-full">
                            {m.latency_class}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 text-xs tabular-nums">
                        {m.est_cost_per_1m_tokens_usd != null ? (
                          `$${m.est_cost_per_1m_tokens_usd.toFixed(2)}`
                        ) : (
                          <Badge variant="outline" className="rounded-full">
                            {m.cost_class}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <div className="grid gap-3 md:grid-cols-2">
            {(r.models || []).map((m: any, i: number) => (
              <div key={i} className="card-elevated p-5">
                <div className="font-mono text-xs">{m.name}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-medium text-emerald-700">Strengths</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                      {(m.strengths || []).map((s: string, j: number) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-rose-700">Weaknesses</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                      {(m.weaknesses || []).map((s: string, j: number) => (
                        <li key={j}>{s}</li>
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
