import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Activity, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeExperiment } from "@/lib/experiments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/experiments/new")({
  head: () => ({ meta: [{ title: "New Experiment Analysis — ML Inspector" }] }),
  component: NewExperimentPage,
});

const FRAMEWORKS = [
  "PyTorch",
  "TensorFlow",
  "JAX",
  "HuggingFace Transformers",
  "Keras",
  "Lightning",
  "Other",
];

const SAMPLE = `Epoch 1/20 - loss: 2.301 - acc: 0.112 - val_loss: 2.298 - val_acc: 0.121
Epoch 2/20 - loss: 2.300 - acc: 0.118 - val_loss: 2.299 - val_acc: 0.119
Epoch 3/20 - loss: NaN - acc: 0.099 - val_loss: NaN - val_acc: 0.100
Warning: gradient overflow detected, skipping step
Epoch 4/20 - loss: NaN - acc: 0.099 - val_loss: NaN - val_acc: 0.100
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB`;

function NewExperimentPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeExperiment);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("PyTorch");
  const [raw, setRaw] = useState("");

  const mut = useMutation({
    mutationFn: () => analyze({ data: { name, framework, raw_log: raw } }),
    onSuccess: (res) => {
      toast.success("Analysis complete");
      navigate({ to: "/experiments/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = name.trim().length > 0 && raw.trim().length >= 20 && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={Activity}
        title="New Experiment"
        description="Paste a training log. AI will diagnose the failure."
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/experiments">
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
            <div className="grid gap-2">
              <Label htmlFor="name">Experiment name</Label>
              <Input
                id="name"
                placeholder="resnet50-cifar-run-42"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="log">Training log</Label>
                <button
                  type="button"
                  onClick={() => {
                    setRaw(SAMPLE);
                    if (!name) setName("sample-run");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Load sample
                </button>
              </div>
              <Textarea
                id="log"
                rows={14}
                placeholder="Paste raw stdout / training logs here…"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-ink-soft">{raw.length.toLocaleString()} characters</p>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Analyze
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
