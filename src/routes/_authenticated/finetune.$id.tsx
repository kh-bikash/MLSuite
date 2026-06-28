import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCheck } from "@/lib/finetune.functions";
import { ReportSection, MetricBadge } from "@/components/ReportBits";

export const Route = createFileRoute("/_authenticated/finetune/$id")({
  head: () => ({ meta: [{ title: "Fine-tuning Check" }] }),
  component: Page,
});

const verdictTone: Record<string, string> = {
  prompt_engineering_enough: "bg-emerald-100 text-emerald-700 border-emerald-200",
  use_rag: "bg-blue-100 text-blue-700 border-blue-200",
  fine_tune_recommended: "bg-amber-100 text-amber-700 border-amber-200",
  fine_tune_required: "bg-rose-100 text-rose-700 border-rose-200",
};

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const get = useServerFn(getCheck);
  const { data, isLoading } = useQuery({
    queryKey: ["finetune-check", id],
    queryFn: () => get({ data: { id } }),
  });
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (!data) return null;
  const v = (data as any).verdict || {};

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title={data.name}
        description={v.summary}
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/finetune">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-5">
          <ReportSection title="Verdict">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={`rounded-full text-sm ${verdictTone[v.verdict] ?? ""}`}
              >
                {(v.verdict || "").replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-ink-soft">
                Confidence:{" "}
                <span className="font-semibold tabular-nums">{Math.round(v.confidence ?? 0)}%</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{v.rationale}</p>
          </ReportSection>

          {v.verdict?.startsWith("fine_tune") && (
            <ReportSection title="If you fine-tune">
              <div className="grid gap-3 md:grid-cols-3">
                <MetricBadge
                  label="Min examples"
                  value={(v.if_fine_tuning?.min_dataset_size ?? 0).toLocaleString()}
                />
                <MetricBadge
                  label="Realistic size"
                  value={(v.if_fine_tuning?.realistic_dataset_size ?? 0).toLocaleString()}
                />
                <MetricBadge
                  label="Est. cost"
                  value={v.if_fine_tuning?.estimated_cost_usd ?? "—"}
                />
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div>
                  <span className="text-xs uppercase text-ink-soft">Base models</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(v.if_fine_tuning?.suggested_base_models || []).map((m: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="rounded-full font-mono text-[11px]"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ReportSection>
          )}

          {(v.alternatives_tried_first || []).length > 0 && (
            <ReportSection title="Try first">
              <div className="grid gap-2">
                {v.alternatives_tried_first.map((a: any, i: number) => (
                  <div key={i} className="rounded-lg border bg-surface/40 p-3">
                    <div className="text-sm font-medium">{a.approach}</div>
                    <div className="mt-0.5 text-xs text-ink-soft">{a.why}</div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Expected lift: {a.expected_lift}
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          <ReportSection title="Sample quality">
            <div className="grid gap-3 md:grid-cols-2">
              <MetricBadge
                label="Diversity"
                value={`${Math.round(v.sample_quality?.diversity_score ?? 0)}/100`}
              />
              <MetricBadge label="Labeling" value={v.sample_quality?.labeling_quality ?? "—"} />
            </div>
            {(v.sample_quality?.coverage_gaps || []).length > 0 && (
              <ul className="mt-3 grid gap-1 text-sm text-ink-soft">
                {v.sample_quality.coverage_gaps.map((g: string, i: number) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
            )}
          </ReportSection>

          <ReportSection title="Next steps">
            <ol className="grid gap-1.5 text-sm text-ink-soft">
              {(v.next_steps || []).map((s: string, i: number) => (
                <li key={i}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          </ReportSection>
        </div>
      </PageBody>
    </>
  );
}
