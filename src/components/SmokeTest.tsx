import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Circle, Zap } from "lucide-react";
import { toast } from "sonner";
import { analyzeExperiment } from "@/lib/experiments.functions";
import { auditDataset } from "@/lib/datasets.functions";
import { analyzeRag } from "@/lib/rag.functions";
import { generateCard } from "@/lib/model-cards.functions";
import { createSuite, runSuite } from "@/lib/prompts.functions";

type StepState = "idle" | "running" | "ok" | "fail";
type Step = {
  key: string;
  label: string;
  state: StepState;
  ms?: number;
  error?: string;
  id?: string;
};

const INITIAL: Step[] = [
  { key: "exp", label: "Experiment Analyst", state: "idle" },
  { key: "ds", label: "Bias Auditor", state: "idle" },
  { key: "rag", label: "RAG Debugger", state: "idle" },
  { key: "mc", label: "Model Card Generator", state: "idle" },
  { key: "pr", label: "Prompt Regression Tester", state: "idle" },
];

const SAMPLE_LOG = `Epoch 1/10 loss=2.31 acc=0.11
Epoch 2/10 loss=2.30 acc=0.12
Epoch 3/10 loss=NaN acc=0.10
Epoch 4/10 loss=NaN acc=0.10
RuntimeError: gradient overflow detected; learning_rate=1.0 may be too high.
Aborted at step 412.`;

const SAMPLE_CSV = `age,income,gender,defaulted
22,32000,F,0
45,71000,M,0
33,55000,F,1
51,89000,M,0
28,40000,F,1
60,120000,M,0
24,30000,F,1
47,65000,M,0
38,72000,F,0
55,99000,M,1`;

export function SmokeTest() {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [running, setRunning] = useState(false);

  const fnExp = useServerFn(analyzeExperiment);
  const fnDs = useServerFn(auditDataset);
  const fnRag = useServerFn(analyzeRag);
  const fnMc = useServerFn(generateCard);
  const fnCreate = useServerFn(createSuite);
  const fnRun = useServerFn(runSuite);

  function update(key: string, patch: Partial<Step>) {
    setSteps((s) => s.map((st) => (st.key === key ? { ...st, ...patch } : st)));
  }

  async function go<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    update(key, { state: "running" });
    const t0 = performance.now();
    try {
      const res = await fn();
      update(key, { state: "ok", ms: Math.round(performance.now() - t0) });
      return res;
    } catch (e: any) {
      update(key, {
        state: "fail",
        ms: Math.round(performance.now() - t0),
        error: e?.message ?? "failed",
      });
      return null;
    }
  }

  async function runAll() {
    setRunning(true);
    setSteps(INITIAL.map((s) => ({ ...s })));
    const stamp = new Date().toISOString().slice(11, 19);

    await go("exp", () =>
      fnExp({ data: { name: `Smoke ${stamp}`, framework: "pytorch", raw_log: SAMPLE_LOG } }),
    );
    await go("ds", () =>
      fnDs({
        data: {
          name: `Smoke ${stamp}`,
          dataset_name: "loans-mini",
          target_column: "defaulted",
          csv: SAMPLE_CSV,
        },
      }),
    );
    await go("rag", () =>
      fnRag({
        data: {
          name: `Smoke ${stamp}`,
          question: "What is the capital of France?",
          generated_answer: "Paris is the capital of France.",
          chunks: [
            {
              text: "Paris is the capital and most populous city of France.",
              source: "wiki:Paris",
              score: 0.92,
            },
            { text: "France is a country in Western Europe.", source: "wiki:France", score: 0.71 },
          ],
          retriever: "bm25",
        },
      }),
    );
    await go("mc", () =>
      fnMc({
        data: {
          model_name: `smoke-classifier-${stamp}`,
          task: "binary classification",
          architecture: "logistic regression",
          context:
            "A minimal smoke-test model trained on a tiny tabular sample to verify the model-card generator end to end.",
        },
      }),
    );
    await go("pr", async () => {
      const suite = await fnCreate({
        data: {
          name: `Smoke ${stamp}`,
          description: "Smoke test suite",
          system_prompt: "Answer concisely.",
          models: ["google/gemini-3-flash-preview"],
          cases: [{ name: "capital", input: "Capital of France?", expected: "Paris" }],
        },
      });
      return fnRun({ data: { suite_id: suite.id } });
    });

    setRunning(false);
    setSteps((curr) => {
      const ok = curr.filter((s) => s.state === "ok").length;
      const fail = curr.filter((s) => s.state === "fail").length;
      if (fail === 0) toast.success(`Smoke test passed (${ok}/5)`);
      else toast.error(`Smoke test: ${ok} passed, ${fail} failed`);
      return curr;
    });
  }

  return (
    <div className="card-elevated max-w-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">AI smoke test</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Fires one minimal request through every AI app to verify the gateway, prompts, and
            database writes end to end.
          </p>
        </div>
        <Button onClick={runAll} disabled={running} className="rounded-full">
          {running ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-1.5 h-4 w-4" />
          )}
          {running ? "Running…" : "Run smoke test"}
        </Button>
      </div>

      <ul className="mt-5 divide-y rounded-xl border bg-surface">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="flex items-center gap-2.5">
              {s.state === "idle" && <Circle className="h-4 w-4 text-muted-foreground" />}
              {s.state === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {s.state === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {s.state === "fail" && <XCircle className="h-4 w-4 text-red-600" />}
              <span className="font-medium">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              {s.ms != null && <span className="tabular-nums">{s.ms}ms</span>}
              {s.error && (
                <span className="max-w-[220px] truncate text-red-600" title={s.error}>
                  {s.error}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
