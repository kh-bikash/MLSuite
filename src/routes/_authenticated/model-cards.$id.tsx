import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  FileText,
  ArrowLeft,
  Loader2,
  Download,
  Target,
  Users,
  BarChart3,
  Database,
  FlaskConical,
  ShieldAlert,
  AlertTriangle,
  Leaf,
  Quote,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCard } from "@/lib/model-cards.functions";
import type { ModelCardContent } from "@/lib/model-cards.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/model-cards/$id")({
  head: () => ({ meta: [{ title: "Model Card — ML Inspector" }] }),
  component: CardDetail,
});

const sevColors: Record<string, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
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

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1.5 text-sm">
      {items.map((m, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  );
}

function toMarkdown(meta: any, c: ModelCardContent): string {
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return [
    `# ${meta.model_name}${meta.version ? ` v${meta.version}` : ""}`,
    meta.license ? `_License: ${meta.license}_` : "",
    "",
    `## Summary\n${c.summary}`,
    "",
    `## Intended Use`,
    `**Primary uses**\n${list(c.intended_use.primary_uses)}`,
    `\n**Primary users**\n${list(c.intended_use.primary_users)}`,
    `\n**Out of scope**\n${list(c.intended_use.out_of_scope)}`,
    "",
    `## Factors`,
    c.factors.relevant.length ? `**Relevant**\n${list(c.factors.relevant)}` : "",
    c.factors.evaluation.length ? `\n**Evaluation**\n${list(c.factors.evaluation)}` : "",
    "",
    `## Metrics`,
    c.metrics.map((m) => `- **${m.name}**: ${m.value}${m.notes ? ` — ${m.notes}` : ""}`).join("\n"),
    "",
    `## Training Data\n${c.training_data.description}`,
    c.training_data.sources.length ? `\n**Sources**\n${list(c.training_data.sources)}` : "",
    c.training_data.preprocessing.length
      ? `\n**Preprocessing**\n${list(c.training_data.preprocessing)}`
      : "",
    "",
    `## Evaluation Data\n${c.evaluation_data.description}\n\n_Motivation:_ ${c.evaluation_data.motivation}`,
    "",
    `## Ethical Considerations\n${list(c.ethical_considerations)}`,
    "",
    `## Caveats & Recommendations\n${list(c.caveats_and_recommendations)}`,
    c.bias_risks?.length
      ? `\n## Bias Risks\n${c.bias_risks.map((b) => `- [${b.severity}] **${b.risk}** — ${b.mitigation}`).join("\n")}`
      : "",
    c.environmental_impact
      ? `\n## Environmental Impact\n- Hardware: ${c.environmental_impact.hardware ?? "—"}\n- Hours: ${c.environmental_impact.hours_used ?? "—"}\n- Carbon: ${c.environmental_impact.carbon_emitted ?? "—"}`
      : "",
    c.citation ? `\n## Citation\n\`\`\`\n${c.citation}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function download(name: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function CardDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getCard);

  const { data, isLoading, error } = useQuery({
    queryKey: ["model-card", id],
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

  const c = (data.content ?? {}) as ModelCardContent;
  const slug = data.model_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <>
      <PageHeader
        icon={FileText}
        title={data.model_name + (data.version ? ` v${data.version}` : "")}
        description={data.task ?? "Model card"}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                download(`${slug}.md`, toMarkdown(data, c));
                toast.success("Downloaded Markdown");
              }}
            >
              <Download className="mr-1.5 h-4 w-4" /> Markdown
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                download(
                  `${slug}.json`,
                  JSON.stringify({ ...data, content: c }, null, 2),
                  "application/json",
                );
                toast.success("Downloaded JSON");
              }}
            >
              <Download className="mr-1.5 h-4 w-4" /> JSON
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"

              asChild
            >
              <Link to="/model-cards">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> All cards
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
            <div className="flex flex-wrap items-center gap-2">
              {data.license && (
                <Badge variant="outline" className="rounded-full">
                  {data.license}
                </Badge>
              )}
              {data.architecture && (
                <Badge variant="outline" className="rounded-full">
                  {data.architecture}
                </Badge>
              )}
              {data.dataset && (
                <Badge variant="outline" className="rounded-full">
                  {data.dataset}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full capitalize">
                {data.status}
              </Badge>
            </div>
            <p className="mt-4 max-w-3xl text-base leading-relaxed">{c.summary}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={Target} title="Intended use">
              <div className="grid gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Primary uses</div>
                  <div className="mt-2">
                    <Bullets items={c.intended_use?.primary_uses ?? []} />
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Out of scope</div>
                  <div className="mt-2">
                    <Bullets items={c.intended_use?.out_of_scope ?? []} />
                  </div>
                </div>
              </div>
            </Section>
            <Section icon={Users} title="Users & factors">
              <div className="grid gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Primary users</div>
                  <div className="mt-2">
                    <Bullets items={c.intended_use?.primary_users ?? []} />
                  </div>
                </div>
                {(c.factors?.relevant?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink-soft">
                      Relevant factors
                    </div>
                    <div className="mt-2">
                      <Bullets items={c.factors.relevant} />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>

          <Section icon={BarChart3} title="Metrics">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(c.metrics ?? []).map((m, i) => (
                <div key={i} className="rounded-xl border bg-surface/40 px-4 py-3">
                  <div className="text-xs text-ink-soft">{m.name}</div>
                  <div className="mt-1 font-mono text-sm">{m.value}</div>
                  {m.notes && <div className="mt-1 text-xs text-ink-soft">{m.notes}</div>}
                </div>
              ))}
            </div>
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={Database} title="Training data">
              <p className="text-sm">{c.training_data?.description}</p>
              {(c.training_data?.sources?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Sources</div>
                  <div className="mt-2">
                    <Bullets items={c.training_data.sources} />
                  </div>
                </div>
              )}
              {(c.training_data?.preprocessing?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-ink-soft">Preprocessing</div>
                  <div className="mt-2">
                    <Bullets items={c.training_data.preprocessing} />
                  </div>
                </div>
              )}
            </Section>
            <Section icon={FlaskConical} title="Evaluation data">
              <p className="text-sm">{c.evaluation_data?.description}</p>
              {c.evaluation_data?.motivation && (
                <p className="mt-3 text-sm text-ink-soft">
                  <span className="font-medium text-foreground">Motivation: </span>
                  {c.evaluation_data.motivation}
                </p>
              )}
            </Section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={ShieldAlert} title="Ethical considerations">
              <Bullets items={c.ethical_considerations ?? []} />
            </Section>
            <Section icon={AlertTriangle} title="Caveats & recommendations">
              <Bullets items={c.caveats_and_recommendations ?? []} />
            </Section>
          </div>

          {(c.bias_risks?.length ?? 0) > 0 && (
            <Section icon={ShieldAlert} title="Bias risks">
              <div className="grid gap-2">
                {c.bias_risks!.map((b, i) => (
                  <div key={i} className="rounded-xl border px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">{b.risk}</div>
                      <Badge
                        variant="outline"
                        className={`rounded-full border ${sevColors[b.severity] ?? ""}`}
                      >
                        {b.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{b.mitigation}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {c.environmental_impact && (
            <Section icon={Leaf} title="Environmental impact">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border bg-surface/40 px-4 py-3">
                  <div className="text-xs text-ink-soft">Hardware</div>
                  <div className="mt-1">{c.environmental_impact.hardware ?? "—"}</div>
                </div>
                <div className="rounded-xl border bg-surface/40 px-4 py-3">
                  <div className="text-xs text-ink-soft">Hours used</div>
                  <div className="mt-1">{c.environmental_impact.hours_used ?? "—"}</div>
                </div>
                <div className="rounded-xl border bg-surface/40 px-4 py-3">
                  <div className="text-xs text-ink-soft">Carbon</div>
                  <div className="mt-1">{c.environmental_impact.carbon_emitted ?? "—"}</div>
                </div>
              </div>
            </Section>
          )}

          {c.citation && (
            <Section icon={Quote} title="Citation">
              <pre className="overflow-auto rounded-xl border bg-surface/40 p-4 font-mono text-xs">
                {c.citation}
              </pre>
            </Section>
          )}
        </motion.div>
      </PageBody>
    </>
  );
}
