import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Network, Sparkles, ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analyzeRag } from "@/lib/rag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rag/new")({
  head: () => ({ meta: [{ title: "New RAG Session — ML Inspector" }] }),
  component: NewRagPage,
});

type ChunkDraft = { text: string; source: string; score: string };

const emptyChunk = (): ChunkDraft => ({ text: "", source: "", score: "" });

const SAMPLE = {
  name: "support-bot-refunds",
  question: "What is our refund policy for annual subscriptions cancelled after 60 days?",
  answer:
    "We offer full refunds within 30 days of purchase. After 60 days, annual subscriptions are non-refundable, but you can downgrade at any time and we'll prorate the unused months as account credit.",
  retriever: "hybrid (BM25 + dense)",
  embedding: "text-embedding-3-small",
  vectorDb: "pgvector",
  chunks: [
    {
      text: "Refunds are issued in full within 30 days of the original purchase date. Contact support@acme.com to initiate.",
      source: "policies/refunds.md",
      score: "0.84",
    },
    {
      text: "Annual subscriptions purchased at a discount are not eligible for partial refunds, but customers may downgrade to monthly billing at renewal.",
      source: "policies/subscriptions.md",
      score: "0.71",
    },
    {
      text: "Holiday hours: our support team is offline December 24-26 each year. Expect responses within 2 business days.",
      source: "support/hours.md",
      score: "0.42",
    },
  ],
};

function NewRagPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeRag);

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [retriever, setRetriever] = useState("");
  const [embedding, setEmbedding] = useState("");
  const [vectorDb, setVectorDb] = useState("");
  const [chunkSize, setChunkSize] = useState("");
  const [overlap, setOverlap] = useState("");
  const [promptTpl, setPromptTpl] = useState("");
  const [chunks, setChunks] = useState<ChunkDraft[]>([emptyChunk()]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rag:prefill");
      if (!raw) return;
      sessionStorage.removeItem("rag:prefill");
      const p = JSON.parse(raw);
      if (p.name) setName(p.name);
      if (p.question) setQuestion(p.question);
      if (p.retriever) setRetriever(p.retriever);
      if (p.chunk_size) setChunkSize(String(p.chunk_size));
      if (Array.isArray(p.chunks) && p.chunks.length) {
        setChunks(
          p.chunks.map((c: any) => ({
            text: c.text ?? "",
            source: c.source ?? "",
            score: c.score != null ? String(c.score) : "",
          })),
        );
      }
      toast.info("Prefilled from chunking simulation");
    } catch {}
  }, []);

  const mut = useMutation({
    mutationFn: () =>
      analyze({
        data: {
          name,
          question,
          generated_answer: answer,
          embedding_model: embedding || undefined,
          retriever: retriever || undefined,
          vector_db: vectorDb || undefined,
          chunk_size: chunkSize ? Number(chunkSize) : undefined,
          chunk_overlap: overlap ? Number(overlap) : undefined,
          prompt: promptTpl || undefined,
          chunks: chunks
            .filter((c) => c.text.trim())
            .map((c) => ({
              text: c.text,
              source: c.source || undefined,
              score: c.score ? Number(c.score) : undefined,
            })),
        },
      }),
    onSuccess: (r) => {
      toast.success("Analysis complete");
      navigate({ to: "/rag/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadSample = () => {
    setName(SAMPLE.name);
    setQuestion(SAMPLE.question);
    setAnswer(SAMPLE.answer);
    setRetriever(SAMPLE.retriever);
    setEmbedding(SAMPLE.embedding);
    setVectorDb(SAMPLE.vectorDb);
    setChunks(SAMPLE.chunks);
  };

  const usableChunks = chunks.filter((c) => c.text.trim()).length;
  const canSubmit =
    name.trim() && question.trim() && answer.trim() && usableChunks >= 1 && !mut.isPending;

  const updateChunk = (i: number, patch: Partial<ChunkDraft>) =>
    setChunks((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeChunk = (i: number) =>
    setChunks((cs) => (cs.length === 1 ? [emptyChunk()] : cs.filter((_, idx) => idx !== i)));

  return (
    <>
      <PageHeader
        icon={Network}
        title="New RAG session"
        description="Score grounding, hallucination, retrieval relevance, and ranking against your retrieved chunks."
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/rag">
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
                Bring your own retrieval — we analyze quality, we don't replace your stack.
              </div>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Session name</Label>
              <Input
                id="name"
                placeholder="support-bot-refunds"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="q">Question</Label>
              <Textarea
                id="q"
                rows={2}
                placeholder="What did the user ask?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="a">Generated answer</Label>
              <Textarea
                id="a"
                rows={4}
                placeholder="What did your RAG pipeline answer?"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="r">Retriever</Label>
                <Input
                  id="r"
                  placeholder="dense / BM25 / hybrid"
                  value={retriever}
                  onChange={(e) => setRetriever(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="em">Embedding model</Label>
                <Input
                  id="em"
                  placeholder="text-embedding-3-small"
                  value={embedding}
                  onChange={(e) => setEmbedding(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vdb">Vector DB</Label>
                <Input
                  id="vdb"
                  placeholder="pgvector / pinecone / qdrant"
                  value={vectorDb}
                  onChange={(e) => setVectorDb(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cs">Chunk size (tokens)</Label>
                <Input
                  id="cs"
                  inputMode="numeric"
                  placeholder="512"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ov">Chunk overlap (tokens)</Label>
                <Input
                  id="ov"
                  inputMode="numeric"
                  placeholder="64"
                  value={overlap}
                  onChange={(e) => setOverlap(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pt">Prompt template (optional)</Label>
              <Textarea
                id="pt"
                rows={3}
                placeholder="The system/RAG prompt used to generate the answer."
                value={promptTpl}
                onChange={(e) => setPromptTpl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Retrieved chunks ({usableChunks})</Label>
                <button
                  type="button"
                  onClick={() => setChunks((cs) => [...cs, emptyChunk()])}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add chunk
                </button>
              </div>
              {chunks.map((c, i) => (
                <div key={i} className="rounded-xl border bg-surface/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-medium text-ink-soft">Chunk #{i + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeChunk(i)}
                      className="text-ink-soft hover:text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Chunk text…"
                    value={c.text}
                    onChange={(e) => updateChunk(i, { text: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Source (e.g. docs/refunds.md)"
                      value={c.source}
                      onChange={(e) => updateChunk(i, { source: e.target.value })}
                      className="text-xs"
                    />
                    <Input
                      placeholder="Retriever score (0–1, optional)"
                      value={c.score}
                      onChange={(e) =>
                        updateChunk(i, { score: e.target.value.replace(/[^\d.]/g, "") })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Run analysis
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
