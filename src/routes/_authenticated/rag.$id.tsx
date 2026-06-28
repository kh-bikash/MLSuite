import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Network,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  Layers,
  Wrench,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/rag.functions";

export const Route = createFileRoute("/_authenticated/rag/$id")({
  head: () => ({ meta: [{ title: "RAG Session — ML Inspector" }] }),
  component: SessionDetail,
});

const priColors: Record<string, string> = {
  now: "bg-rose-50 text-rose-700 border-rose-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  later: "bg-slate-50 text-slate-600 border-slate-200",
};
const sevColors: Record<string, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

function scoreTone(score: number, invert = false) {
  const s = invert ? 100 - score : score;
  if (s >= 70) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="card-elevated p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-soft" />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Meter({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  const tone = scoreTone(value, invert);
  return (
    <div className="rounded-xl border bg-surface/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-soft">{label}</span>
        <Badge variant="outline" className={`rounded-full border ${tone}`}>
          {Math.round(value)}
        </Badge>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-foreground"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function SessionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getSession);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rag-session", id],
    queryFn: () => get({ data: { id } }),
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

  const analysis = (data.analysis ?? {}) as any;
  const chunks = (data.chunks ?? []) as any[];
  const chunkScores = (analysis.chunk_scores ?? []) as any[];
  const issues = (analysis.issues ?? []) as any[];
  const recs = (analysis.recommendations ?? []) as any[];
  const unsupported = (analysis.unsupported_claims ?? []) as any[];
  const missing = (analysis.missing_context ?? []) as string[];

  const StatusIcon =
    data.status === "healthy"
      ? CheckCircle2
      : data.status === "warning"
        ? AlertCircle
        : AlertTriangle;

  const scoreForChunk = (i: number) => chunkScores.find((s) => s.index === i);

  return (
    <>
      <PageHeader
        icon={Network}
        title={data.name}
        description={`${chunks.length} chunks · ${data.retriever ?? "retriever n/a"} · ${data.embedding_model ?? "embeddings n/a"}`}
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/rag">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All sessions
            </Link>
          </Button>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5"
        >
          {/* Verdict */}
          <div className="card-elevated p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-ink-soft">Verdict</div>
                <p className="mt-1 max-w-3xl text-base">
                  {analysis.summary ?? "Analysis complete."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Meter label="Grounding" value={Number(analysis.grounding_score ?? 0)} />
              <Meter
                label="Hallucination"
                value={Number(analysis.hallucination_score ?? 0)}
                invert
              />
              <Meter label="Retrieval quality" value={Number(analysis.retrieval_quality ?? 0)} />
              <Meter label="Completeness" value={Number(analysis.answer_completeness ?? 0)} />
            </div>
          </div>

          {/* Question + Answer */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={MessageSquare} title="Question">
              <p className="whitespace-pre-wrap text-sm">{data.question}</p>
            </Section>
            <Section icon={FileText} title="Generated answer">
              <p className="whitespace-pre-wrap text-sm">{data.generated_answer}</p>
            </Section>
          </div>

          {/* Unsupported claims + missing context */}
          {(unsupported.length > 0 || missing.length > 0) && (
            <div className="grid gap-5 lg:grid-cols-2">
              {unsupported.length > 0 && (
                <Section icon={ShieldAlert} title="Unsupported claims">
                  <div className="grid gap-2">
                    {unsupported.map((u, i) => (
                      <div key={i} className="rounded-xl border bg-surface/40 px-4 py-3">
                        <p className="text-sm">"{u.claim}"</p>
                        <p className="mt-1 text-xs text-ink-soft">{u.reason}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {missing.length > 0 && (
                <Section icon={HelpCircle} title="Missing context">
                  <ul className="grid gap-1.5 text-sm">
                    {missing.map((m, i) => (
                      <li key={i} className="flex gap-2 text-ink-soft">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          {/* Chunks ranked */}
          <Section icon={Layers} title="Chunk relevance & usage">
            <div className="grid gap-2">
              {chunks.map((c, i) => {
                const s = scoreForChunk(i);
                const rel = Number(s?.relevance ?? 0);
                return (
                  <div key={i} className="rounded-xl border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-ink-soft">#{i}</span>
                        {c.source && <span className="text-ink-soft">{c.source}</span>}
                        {c.score != null && (
                          <span className="text-ink-soft">
                            retriever={Number(c.score).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s?.used_in_answer && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            used
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`rounded-full border ${scoreTone(rel)}`}
                        >
                          relevance {Math.round(rel)}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${Math.min(100, rel)}%` }}
                      />
                    </div>
                    <p className="mt-2 line-clamp-3 font-mono text-xs text-ink-soft">{c.text}</p>
                    {s?.verdict && <p className="mt-2 text-xs">{s.verdict}</p>}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Issues */}
          {issues.length > 0 && (
            <Section icon={AlertTriangle} title="Issues">
              <div className="grid gap-2">
                {issues.map((it, i) => (
                  <div key={i} className="rounded-xl border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                          {it.category}
                        </Badge>
                        <span className="text-sm font-medium">{it.title}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${sevColors[it.severity] ?? ""}`}
                      >
                        {it.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{it.evidence}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommendations */}
          <Section icon={Wrench} title="Recommendations">
            <div className="grid gap-2">
              {recs.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-xl border px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{r.title}</div>
                    <p className="mt-1 text-sm text-ink-soft">{r.action}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full border ${priColors[r.priority] ?? ""}`}
                  >
                    {r.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>
      </PageBody>
    </>
  );
}
