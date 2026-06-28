import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Scissors, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runSim } from "@/lib/chunking.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chunking/new")({
  head: () => ({ meta: [{ title: "New Chunking Simulation" }] }),
  component: Page,
});

const SAMPLE = `Acme Cloud is our flagship infrastructure platform launched in 2021. It runs containerized workloads across 14 regions worldwide.

Pricing for Acme Cloud is consumption-based: customers pay only for CPU-seconds, memory-GB-seconds, and outbound network bytes. There are no minimum fees.

Refunds: invoices can be disputed within 30 days of issue. Credits are issued at our sole discretion and never exceed 30% of the disputed amount.

Support tiers: Free gets community forums. Pro ($99/mo) gets 24h email response. Enterprise gets dedicated TAMs and 15-minute SLA for Sev-1 incidents.

Compliance: SOC 2 Type II, ISO 27001, HIPAA-eligible. Data residency available in US, EU, APAC.`;

function Page() {
  const nav = useNavigate();
  const run = useServerFn(runSim);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [query, setQuery] = useState("");
  const mut = useMutation({
    mutationFn: () => run({ data: { name, document, query: query || undefined } }),
    onSuccess: (r) => {
      toast.success("Simulation complete");
      nav({ to: "/chunking/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const canSubmit = name.trim() && document.trim().length >= 50 && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={Scissors}
        title="New chunking simulation"
        description="We'll run fixed, sliding-window, sentence, and paragraph chunking, then score them."
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/chunking">
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
            <div className="flex items-center justify-between">
              <div className="text-xs text-ink-soft">
                Paste a representative document from your corpus.
              </div>
              <button
                type="button"
                onClick={() => {
                  setName("acme-pricing-doc");
                  setDocument(SAMPLE);
                  setQuery("What is the refund policy?");
                }}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="n">Name</Label>
              <Input
                id="n"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="acme-docs-q4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q">Target query (optional)</Label>
              <Input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="The most common user question…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d">Document</Label>
              <Textarea
                id="d"
                rows={14}
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="Paste your document here…"
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Run simulation
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
