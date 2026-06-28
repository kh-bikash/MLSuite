import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Layers, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runCompare } from "@/lib/embeddings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/embeddings/new")({
  head: () => ({ meta: [{ title: "New Embedding Comparison" }] }),
  component: Page,
});

const DEFAULT_MODELS =
  "openai/text-embedding-3-small\nopenai/text-embedding-3-large\ncohere/embed-english-v3.0\nBAAI/bge-large-en-v1.5\nvoyage-ai/voyage-3";

function Page() {
  const nav = useNavigate();
  const run = useServerFn(runCompare);
  const [name, setName] = useState("");
  const [queries, setQueries] = useState("");
  const [chunks, setChunks] = useState("");
  const [models, setModels] = useState(DEFAULT_MODELS);
  const mut = useMutation({
    mutationFn: () =>
      run({
        data: {
          name,
          queries: queries
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          chunks: chunks
            .split(/\n---+\n|\n\n+/)
            .map((s) => s.trim())
            .filter(Boolean),
          models: models
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (r) => {
      toast.success("Comparison complete");
      nav({ to: "/embeddings/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const load = () => {
    setName("support-search-v1");
    setQueries(
      "How do I cancel my annual subscription?\nWhat is the refund window?\nDoes the Pro plan include 24/7 support?",
    );
    setChunks(
      "Annual subscriptions can be cancelled from your billing portal at any time. The subscription remains active until the end of the paid period.\n---\nRefunds: full refunds are available within 30 days of purchase. After 30 days, subscriptions are non-refundable but you can downgrade.\n---\nThe Pro plan includes 24-hour email support during business days. Enterprise customers receive 24/7 support with a 15-minute Sev-1 SLA.\n---\nOur status page at status.acme.com posts real-time updates during incidents.",
    );
  };

  const canSubmit =
    name.trim() && queries.trim() && chunks.trim() && models.trim() && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={Layers}
        title="New embedding comparison"
        description="One query set, one chunk pool, many models. Quantified, not guessable."
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated mx-auto max-w-4xl p-6"
        >
          <div className="grid gap-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-ink-soft">
                Separate chunks with a blank line or <code className="text-[11px]">---</code>.
              </div>
              <button type="button" onClick={load} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Queries (one per line)</Label>
                <Textarea
                  rows={6}
                  value={queries}
                  onChange={(e) => setQueries(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label>Models (one per line)</Label>
                <Textarea
                  rows={6}
                  value={models}
                  onChange={(e) => setModels(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Candidate chunks</Label>
              <Textarea
                rows={10}
                value={chunks}
                onChange={(e) => setChunks(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Comparing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Run comparison
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
