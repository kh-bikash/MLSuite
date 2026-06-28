import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { FileText, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCard } from "@/lib/model-cards.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/model-cards/new")({
  head: () => ({ meta: [{ title: "New Model Card — ML Inspector" }] }),
  component: NewCardPage,
});

const SAMPLE = {
  model_name: "TriageNet",
  version: "1.2.0",
  license: "Apache-2.0",
  task: "Binary classification — urgent vs. routine support tickets",
  architecture: "DistilBERT-base fine-tuned, 67M params",
  dataset: "Internal anonymized tickets (2022–2024), 184k examples",
  context:
    "Fine-tuned for 3 epochs on a balanced sample. Validation F1 0.89, precision 0.91, recall 0.87 on a held-out 10% split. Known weaker on non-English tickets (≈12% of traffic, F1 0.71). Deployed behind a 0.6 confidence threshold; below that, tickets are routed to a human triage queue. Trained on US/EU customer data only. No PII retained after preprocessing. Carbon: ~4 hours on a single A100.",
};

function NewCardPage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateCard);
  const [form, setForm] = useState({
    model_name: "",
    version: "",
    license: "",
    task: "",
    architecture: "",
    dataset: "",
    context: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      gen({
        data: {
          model_name: form.model_name.trim(),
          version: form.version.trim() || undefined,
          license: form.license.trim() || undefined,
          task: form.task.trim() || undefined,
          architecture: form.architecture.trim() || undefined,
          dataset: form.dataset.trim() || undefined,
          context: form.context.trim(),
        },
      }),
    onSuccess: (res) => {
      toast.success("Model card generated");
      navigate({ to: "/model-cards/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = form.model_name.trim().length > 0 && form.context.trim().length >= 20;

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Draft a model card"
        description="Provide model metadata and engineering context. The AI drafts a full responsible-AI model card you can edit."
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/model-cards">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All cards
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
          <div className="card-elevated p-6">
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="model_name">Model name</Label>
                  <Input
                    id="model_name"
                    value={form.model_name}
                    onChange={set("model_name")}
                    placeholder="TriageNet"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={form.version}
                    onChange={set("version")}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="task">Task</Label>
                  <Input
                    id="task"
                    value={form.task}
                    onChange={set("task")}
                    placeholder="Binary classification"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="architecture">Architecture</Label>
                  <Input
                    id="architecture"
                    value={form.architecture}
                    onChange={set("architecture")}
                    placeholder="DistilBERT"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dataset">Training dataset</Label>
                  <Input
                    id="dataset"
                    value={form.dataset}
                    onChange={set("dataset")}
                    placeholder="Internal tickets v3"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="license">License</Label>
                  <Input
                    id="license"
                    value={form.license}
                    onChange={set("license")}
                    placeholder="Apache-2.0"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="context">Engineering context</Label>
                  <button
                    type="button"
                    onClick={() => setForm(SAMPLE)}
                    className="text-xs text-ink-soft hover:text-foreground"
                  >
                    Load sample
                  </button>
                </div>
                <Textarea
                  id="context"
                  value={form.context}
                  onChange={set("context")}
                  rows={10}
                  placeholder="Training data sources, eval metrics, known limitations, deployment thresholds, compute / carbon, privacy posture…"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-ink-soft">{form.context.length} chars · min 20</p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  className="rounded-full"
                  disabled={!canSubmit || mut.isPending}
                  onClick={() => mut.mutate()}
                >
                  {mut.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" /> Generate card
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}
