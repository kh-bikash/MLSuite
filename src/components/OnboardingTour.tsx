import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mli_tour_v1";

const steps = [
  {
    title: "Welcome to ML Inspector AI",
    body: "Five focused tools for AI engineers — one calm workspace. Let's take a 30-second tour.",
  },
  {
    title: "Five independent apps",
    body: "Experiment Analyst, Bias Auditor, RAG Debugger, Model Cards, and Prompt Tester. Each has its own data and AI pipeline.",
  },
  {
    title: "Benchmark Suite",
    body: "Define multi-model, multi-task benchmarks. Run them once and get a calibrated leaderboard with strengths and weaknesses.",
  },
  {
    title: "Audit trail & exports",
    body: "Every create, run, and delete is recorded. Export your whole workspace as JSON or CSV from Settings whenever you need.",
  },
  {
    title: "Move at the speed of thought",
    body: "Press ⌘K (or Ctrl+K) anywhere to jump to any app or page instantly.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, "done");
    setOpen(false);
  }

  function next() {
    if (step >= steps.length - 1) return close();
    setStep((s) => s + 1);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="card-elevated relative w-full max-w-md overflow-hidden p-7"
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 rounded-md p-1 text-ink-soft transition hover:bg-secondary"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs text-ink-soft">
              <Sparkles className="h-3 w-3" />
              Step {step + 1} of {steps.length}
            </div>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-semibold tracking-tight">{steps[step].title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{steps[step].body}</p>
            </motion.div>

            <div className="mt-6 flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition ${
                    i <= step ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={close}
                className="text-xs text-ink-soft transition hover:text-foreground"
              >
                Skip tour
              </button>
              <Button onClick={next} className="rounded-full">
                {step >= steps.length - 1 ? "Get started" : "Next"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
