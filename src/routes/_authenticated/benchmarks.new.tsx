import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Gauge, Plus, Trash2, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBenchmark } from "@/lib/benchmarks.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/benchmarks/new")({
  head: () => ({ meta: [{ title: "New benchmark" }] }),
  component: NewBenchmark,
});

const AVAILABLE_MODELS = [
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "mistralai/mistral-large-2-instruct",
  "google/gemma-2-9b-it",
];

const CATEGORIES = [
  "general",
  "reasoning",
  "coding",
  "summarization",
  "extraction",
  "safety",
  "rag",
];

function NewBenchmark() {
  const navigate = useNavigate();
  const create = useServerFn(createBenchmark);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [models, setModels] = useState<string[]>([
    "meta/llama-3.1-8b-instruct",
    "mistralai/mixtral-8x22b-instruct-v0.1",
    "google/gemma-2-9b-it",
  ]);
  const [metrics, setMetrics] = useState("correctness, helpfulness, conciseness");
  const [tasks, setTasks] = useState([
    { id: "t1", prompt: "", reference: "", category: "general" },
  ]);

  function loadSample() {
    setName("Reasoning Sanity Check");
    setDescription("Quick benchmark across foundation models on logic and word problems.");
    setCategory("reasoning");
    setTasks([
      {
        id: "t1",
        prompt:
          "If a train leaves Boston at 3pm going 60mph and another leaves NYC at 4pm going 80mph, when do they meet given the cities are 215 miles apart?",
        reference: "Around 5:36pm; they meet ~158 miles from Boston.",
        category: "math",
      },
      {
        id: "t2",
        prompt: "Explain why monads are useful in functional programming in 3 sentences.",
        reference: "Should mention sequencing effects, composition, and abstraction over context.",
        category: "explain",
      },
      {
        id: "t3",
        prompt: "Extract every email address from: 'Reach me at a.b@x.io or backup: hi+team@co.uk'",
        reference: "a.b@x.io, hi+team@co.uk",
        category: "extraction",
      },
    ]);
  }

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          name,
          description,
          category,
          tasks: tasks.filter((t) => t.prompt.trim()),
          models,
          metrics: metrics
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (row: any) => {
      toast.success("Benchmark created");
      navigate({ to: "/benchmarks/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  function toggleModel(m: string) {
    setModels((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function updateTask(i: number, field: string, value: string) {
    setTasks((t) => t.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  return (
    <>
      <PageHeader
        icon={Gauge}
        title="New benchmark"
        description="Define the tasks, choose the models, and we'll score them all."
        actions={
          <Button variant="outline" className="rounded-full" onClick={loadSample}>
            Load sample
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="card-elevated p-6">
            <h3 className="text-base font-semibold tracking-tight">Suite</h3>
            <div className="mt-4 grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Reasoning sanity check"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="metrics">Metrics (comma-separated)</Label>
                  <Input
                    id="metrics"
                    value={metrics}
                    onChange={(e) => setMetrics(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <h3 className="text-base font-semibold tracking-tight">Models</h3>
            <p className="mt-1 text-sm text-ink-soft">Pick the models to evaluate.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleModel(m)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    models.includes(m)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-surface hover:bg-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight">Tasks</h3>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setTasks((t) => [
                    ...t,
                    { id: `t${t.length + 1}`, prompt: "", reference: "", category: "general" },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add task
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {tasks.map((task, i) => (
                <div key={i} className="rounded-xl border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      className="h-8 max-w-[120px] text-xs"
                      value={task.id}
                      onChange={(e) => updateTask(i, "id", e.target.value)}
                    />
                    <Input
                      className="h-8 max-w-[160px] text-xs"
                      value={task.category}
                      onChange={(e) => updateTask(i, "category", e.target.value)}
                      placeholder="category"
                    />
                    {tasks.length > 1 && (
                      <button
                        onClick={() => setTasks((t) => t.filter((_, idx) => idx !== i))}
                        className="text-ink-soft hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={2}
                    placeholder="Prompt to send to each model"
                    value={task.prompt}
                    onChange={(e) => updateTask(i, "prompt", e.target.value)}
                  />
                  <Textarea
                    className="mt-2"
                    rows={2}
                    placeholder="Reference answer / acceptance criteria (optional)"
                    value={task.reference}
                    onChange={(e) => updateTask(i, "reference", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-full"

              asChild
            >
              <Link to="/benchmarks">Cancel</Link>
            </Button>
            <Button
              className="rounded-full"
              onClick={() => mut.mutate()}
              disabled={
                mut.isPending ||
                !name ||
                models.length === 0 ||
                tasks.filter((t) => t.prompt.trim()).length === 0
              }
            >
              {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create benchmark
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
