import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ClipboardCheck, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSources, generateReport } from "@/lib/audit-reports.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/audit-reports/new")({
  head: () => ({ meta: [{ title: "New Audit Report" }] }),
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const sources = useServerFn(listSources);
  const gen = useServerFn(generateReport);
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [cardId, setCardId] = useState("");
  const [promptId, setPromptId] = useState("");

  const { data: src } = useQuery({ queryKey: ["audit-sources"], queryFn: () => sources() });

  const mut = useMutation({
    mutationFn: () =>
      gen({
        data: {
          name,
          system_name: system || undefined,
          dataset_id: datasetId || undefined,
          card_id: cardId || undefined,
          prompt_id: promptId || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success("Report generated");
      nav({ to: "/audit-reports/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = name.trim() && (datasetId || cardId || promptId) && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title="New AI Product Audit Report"
        description="Pick at least one source artifact. The more you include, the richer the report."
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/audit-reports">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated mx-auto max-w-3xl p-6"
        >
          <div className="grid gap-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Report name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Q4 governance review"
                />
              </div>
              <div className="grid gap-2">
                <Label>System name</Label>
                <Input
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  placeholder="Support copilot v2"
                />
              </div>
            </div>

            <SourcePicker
              label="Dataset bias audit"
              items={src?.datasets ?? []}
              value={datasetId}
              onChange={setDatasetId}
              labelKey="name"
            />
            <SourcePicker
              label="Model card"
              items={src?.cards ?? []}
              value={cardId}
              onChange={setCardId}
              labelKey="model_name"
            />
            <SourcePicker
              label="Prompt regression suite"
              items={src?.prompts ?? []}
              value={promptId}
              onChange={setPromptId}
              labelKey="name"
            />

            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Generate report
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}

function SourcePicker({
  label,
  items,
  value,
  onChange,
  labelKey,
}: {
  label: string;
  items: any[];
  value: string;
  onChange: (v: string) => void;
  labelKey: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={`rounded-full border px-3 py-1 text-xs transition ${value === "" ? "bg-secondary" : "bg-transparent hover:bg-secondary/60"}`}
        >
          None
        </button>
        {items.length === 0 && <span className="text-xs text-ink-soft">No saved items yet.</span>}
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`rounded-full border px-3 py-1 text-xs transition ${value === it.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary/60"}`}
          >
            {it[labelKey]}
          </button>
        ))}
      </div>
    </div>
  );
}
