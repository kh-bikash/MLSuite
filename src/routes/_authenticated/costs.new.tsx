import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { DollarSign, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runEstimate } from "@/lib/costs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/costs/new")({
  head: () => ({ meta: [{ title: "New Cost Estimate" }] }),
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const run = useServerFn(runEstimate);
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [inT, setInT] = useState("1500");
  const [outT, setOutT] = useState("400");
  const [vol, setVol] = useState("100000");
  const [latency, setLatency] = useState("");
  const [quality, setQuality] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      run({
        data: {
          name,
          use_case: useCase,
          input_tokens: Number(inT),
          output_tokens: Number(outT),
          monthly_requests: Number(vol),
          latency_target: latency || undefined,
          quality_priority: quality || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success("Estimate complete");
      nav({ to: "/costs/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const canSubmit =
    name.trim() &&
    useCase.trim().length >= 10 &&
    Number(inT) > 0 &&
    Number(outT) > 0 &&
    Number(vol) > 0 &&
    !mut.isPending;

  return (
    <>
      <PageHeader
        icon={DollarSign}
        title="New cost estimate"
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/costs">
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
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="support-chatbot-mvp"
              />
            </div>
            <div className="grid gap-2">
              <Label>Use case</Label>
              <Textarea
                rows={3}
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Customer support chatbot answering questions over our help center…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Input tokens / req</Label>
                <Input
                  inputMode="numeric"
                  value={inT}
                  onChange={(e) => setInT(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Output tokens / req</Label>
                <Input
                  inputMode="numeric"
                  value={outT}
                  onChange={(e) => setOutT(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Monthly requests</Label>
                <Input
                  inputMode="numeric"
                  value={vol}
                  onChange={(e) => setVol(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Latency target</Label>
                <Input
                  value={latency}
                  onChange={(e) => setLatency(e.target.value)}
                  placeholder="e.g. p50 < 800ms"
                />
              </div>
              <div className="grid gap-2">
                <Label>Quality priority</Label>
                <Input
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  placeholder="e.g. balanced / max-quality / cheap"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Estimating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Get recommendation
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
