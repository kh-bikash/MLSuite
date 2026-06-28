import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { FlaskConical, Sparkles, ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createSuite } from "@/lib/prompts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prompts/new")({
  head: () => ({ meta: [{ title: "New Prompt Suite — ML Inspector" }] }),
  component: NewSuitePage,
});

const AVAILABLE_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
];

type CaseDraft = { name: string; input: string; expected: string };
const emptyCase = (): CaseDraft => ({ name: "", input: "", expected: "" });

const SAMPLE = {
  name: "Support tone & policy",
  description: "Ensures the assistant stays empathetic and follows refund policy.",
  system_prompt:
    "You are Acme support. Be empathetic, concise, and never promise refunds outside the 30-day window.",
  models: [
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.1-70b-instruct",
  ],
  cases: [
    {
      name: "happy-path-refund",
      input: "I bought a license 5 days ago. Can I get a refund?",
      expected: "Confirms refund is available within 30 days, asks for order ID, empathetic tone.",
    },
    {
      name: "out-of-window",
      input: "I bought 90 days ago and want a refund.",
      expected: "Politely declines, explains 30-day window, offers downgrade or credit.",
    },
    {
      name: "frustrated-user",
      input: "This product is garbage. I demand my money back now!!!",
      expected: "Stays calm and empathetic, does not match aggression, applies refund policy.",
    },
  ],
};

function NewSuitePage() {
  const navigate = useNavigate();
  const create = useServerFn(createSuite);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    system_prompt: string;
    models: string[];
    cases: CaseDraft[];
  }>({
    name: "",
    description: "",
    system_prompt: "",
    models: ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct"],
    cases: [emptyCase()],
  });

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          system_prompt: form.system_prompt.trim() || undefined,
          models: form.models,
          cases: form.cases.map((c) => ({
            name: c.name.trim(),
            input: c.input.trim(),
            expected: c.expected.trim() || undefined,
          })),
        },
      }),
    onSuccess: (res) => {
      toast.success("Suite created");
      navigate({ to: "/prompts/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleModel = (m: string) => {
    setForm((f) => ({
      ...f,
      models: f.models.includes(m) ? f.models.filter((x) => x !== m) : [...f.models, m],
    }));
  };

  const setCase = (i: number, k: keyof CaseDraft, v: string) =>
    setForm((f) => ({ ...f, cases: f.cases.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const canSubmit =
    form.name.trim().length > 0 &&
    form.models.length > 0 &&
    form.cases.length > 0 &&
    form.cases.every((c) => c.name.trim() && c.input.trim());

  return (
    <>
      <PageHeader
        icon={FlaskConical}
        title="New prompt suite"
        description="Define a system prompt, the models to test, and the cases that must keep passing as you iterate."
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/prompts">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All suites
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
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">Suite name</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...SAMPLE, cases: SAMPLE.cases.map((c) => ({ ...c })) })
                    }
                    className="text-xs text-ink-soft hover:text-foreground"
                  >
                    Load sample
                  </button>
                </div>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Support tone & policy"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this suite protects against"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="system_prompt">System prompt</Label>
                <Textarea
                  id="system_prompt"
                  rows={4}
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="You are…"
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid gap-2">
                <Label>Models</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_MODELS.map((m) => {
                    const on = form.models.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleModel(m)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-surface text-ink-soft hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-soft">Each case runs once per selected model.</p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Test cases</h2>
                <p className="text-xs text-ink-soft">
                  Expected is a behavior description, not a literal string match.
                </p>
              </div>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => setForm({ ...form, cases: [...form.cases, emptyCase()] })}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add case
              </Button>
            </div>
            <div className="grid gap-3">
              {form.cases.map((c, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      case #{i + 1}
                    </Badge>
                    {form.cases.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, cases: form.cases.filter((_, j) => j !== i) })
                        }
                        className="text-ink-soft hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <Input
                      value={c.name}
                      onChange={(e) => setCase(i, "name", e.target.value)}
                      placeholder="case name (e.g. happy-path-refund)"
                    />
                    <Textarea
                      value={c.input}
                      rows={3}
                      onChange={(e) => setCase(i, "input", e.target.value)}
                      placeholder="User input / prompt"
                      className="font-mono text-xs"
                    />
                    <Textarea
                      value={c.expected}
                      rows={2}
                      onChange={(e) => setCase(i, "expected", e.target.value)}
                      placeholder="Expected behavior (optional, used by judge & similarity)"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              className="rounded-full"
              disabled={!canSubmit || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Create suite
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}
