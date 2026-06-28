import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, ArrowLeft, Loader2, Trophy } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEstimate } from "@/lib/costs.functions";
import { ReportSection, MetricBadge } from "@/components/ReportBits";

export const Route = createFileRoute("/_authenticated/costs/$id")({
  head: () => ({ meta: [{ title: "Cost Estimate" }] }),
  component: Page,
});

const tone = (v: string) =>
  v === "best_value" ? "good" : v === "premium" ? "warn" : v === "skip" ? "bad" : "neutral";

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const get = useServerFn(getEstimate);
  const { data, isLoading } = useQuery({
    queryKey: ["cost-estimate", id],
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
        icon={DollarSign}
        title={data.name}
        description={r.summary}
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/costs">
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
              <Badge className="rounded-full bg-primary text-primary-foreground">
                {r.recommendation?.model}
              </Badge>
              <span className="text-lg font-semibold tabular-nums">
                ${Number(r.recommendation?.expected_monthly_cost_usd ?? 0).toFixed(2)}
                <span className="text-sm text-ink-soft">/mo</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{r.recommendation?.reason}</p>
          </ReportSection>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricBadge
              label="Monthly requests"
              value={Number(data.monthly_requests).toLocaleString()}
            />
            <MetricBadge
              label="Input tokens / req"
              value={Number(data.input_tokens).toLocaleString()}
            />
            <MetricBadge
              label="Output tokens / req"
              value={Number(data.output_tokens).toLocaleString()}
            />
          </div>

          <ReportSection title="All candidates">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-soft">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Model</th>
                    <th className="px-3">$/mo</th>
                    <th className="px-3">Quality</th>
                    <th className="px-3">Latency p50</th>
                    <th className="px-3">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.models || []).map((m: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{m.name}</td>
                      <td className="px-3 tabular-nums">
                        ${Number(m.monthly_cost_usd ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 tabular-nums">{Math.round(m.quality_score)}</td>
                      <td className="px-3 tabular-nums">{m.latency_p50_ms}ms</td>
                      <td className="px-3">
                        <Badge
                          variant="outline"
                          className={`rounded-full ${tone(m.verdict) === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tone(m.verdict) === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" : tone(m.verdict) === "bad" ? "bg-rose-50 text-rose-700 border-rose-200" : ""}`}
                        >
                          {m.verdict}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <ReportSection title="Cost levers">
            <ul className="grid gap-1.5 text-sm text-ink-soft">
              {(r.cost_levers || []).map((l: string, i: number) => (
                <li key={i}>• {l}</li>
              ))}
            </ul>
          </ReportSection>
        </div>
      </PageBody>
    </>
  );
}
