import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useRef } from "react";
import {
  Activity,
  ShieldCheck,
  Network,
  FileText,
  FlaskConical,
  Gauge,
  History,
  ArrowRight,
  Sparkles,
  Command,
  Zap,
  Lock,
  Scissors,
  GitCompare,
  DollarSign,
  Cpu,
  ClipboardCheck,
} from "lucide-react";
import { ShaderOrb } from "@/components/ShaderOrb";
import { ThreeBackground } from "@/components/ThreeBackground";
import { useMotionSettings } from "@/components/MotionSettings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ML Inspector AI — The AI Engineering Toolkit" },
      {
        name: "description",
        content:
          "Debug failed runs, audit datasets, fix RAG pipelines, document models, benchmark and regression-test prompts. Six focused tools, one calm workspace.",
      },
    ],
  }),
  component: Landing,
});

const apps = [
  {
    num: "01",
    icon: Activity,
    name: "Experiment Failure Analyst",
    desc: "Root-cause failed training runs in seconds.",
    tag: "Core",
  },
  {
    num: "02",
    icon: ShieldCheck,
    name: "Dataset Bias Auditor",
    desc: "Surface bias, leakage, and risk before launch.",
    tag: "Core",
  },
  {
    num: "03",
    icon: Network,
    name: "RAG Pipeline Debugger",
    desc: "Diagnose retrieval, grounding, hallucinations.",
    tag: "Core",
  },
  {
    num: "04",
    icon: FileText,
    name: "Model Card Generator",
    desc: "Ship compliant documentation in one click.",
    tag: "Core",
  },
  {
    num: "05",
    icon: FlaskConical,
    name: "Prompt Regression Tester",
    desc: "Unit tests for prompts across frontier models.",
    tag: "Core",
  },
  {
    num: "06",
    icon: Gauge,
    name: "Benchmark Suite",
    desc: "Score models across tasks. Share read-only reports.",
    tag: "Core",
  },
  {
    num: "07",
    icon: Scissors,
    name: "Chunking Strategy Simulator",
    desc: "Compare chunking strategies, send winners to RAG.",
    tag: "New",
  },
  {
    num: "08",
    icon: GitCompare,
    name: "Embedding Model Comparator",
    desc: "Precision, recall, MRR, nDCG across providers.",
    tag: "New",
  },
  {
    num: "09",
    icon: DollarSign,
    name: "LLM Cost Estimator",
    desc: "Right-size models by cost, quality, and latency.",
    tag: "New",
  },
  {
    num: "10",
    icon: Cpu,
    name: "Fine-tuning Readiness",
    desc: "Decide if your task actually needs fine-tuning.",
    tag: "New",
  },
  {
    num: "11",
    icon: ClipboardCheck,
    name: "AI Product Audit Report",
    desc: "Boardroom-ready PDF with risk and governance scores.",
    tag: "New",
  },
];

const features = [
  { icon: Command, title: "Command palette", desc: "Jump anywhere with ⌘K." },
  { icon: Zap, title: "AI Copilot", desc: "Structured reasoning tuned per app." },
  { icon: Lock, title: "Audit trail", desc: "Every action logged. Searchable, exportable." },
  { icon: History, title: "Versioned runs", desc: "Compare, share, and export anywhere." },
];

const stats = [
  { v: "11", l: "focused apps" },
  { v: "100%", l: "your data" },
  { v: "<2s", l: "AI verdicts" },
  { v: "∞", l: "test cases" },
];

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Scale + fade in as the section enters the viewport (impulsive zoom). */
function ZoomReveal({
  children,
  className = "",
  from = 0.92,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 30%"] });
  const s = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 });
  const scale = useTransform(s, [0, 0.5, 1], reduce ? [1, 1, 1] : [from, 1, 1.02]);
  const opacity = useTransform(s, [0, 0.4, 1], [0.4, 1, 1]);
  return (
    <motion.div ref={ref} style={{ scale, opacity }} className={className}>
      {children}
    </motion.div>
  );
}

function Landing() {
  const { effectiveAnimate } = useMotionSettings();
  const heroRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Hero scroll-driven motion
  const { scrollYProgress: heroProg } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProg, [0, 1], [0, reduce ? 0 : 140]);
  const heroScale = useTransform(heroProg, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroOpacity = useTransform(heroProg, [0, 1], [1, 0.2]);
  const bgY = useTransform(heroProg, [0, 1], [0, reduce ? 0 : -120]);

  // Page-wide progress indicator
  const { scrollYProgress: pageProg } = useScroll({ target: rootRef });
  const progress = useSpring(pageProg, { stiffness: 120, damping: 30, mass: 0.2 });

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-clip bg-background text-foreground"
    >
      {/* Scroll progress bar */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress, transformOrigin: "0% 50%" }}
        className="fixed inset-x-0 top-0 z-50 h-[2px] bg-gradient-to-r from-primary via-accent to-primary"
      />

      {/* Persistent ambient WebGL background — covers the entire scroll */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20">
        <ThreeBackground variant="ambient" opacity={0.55} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10
          bg-[radial-gradient(80%_60%_at_50%_-10%,transparent,hsl(var(--background)/0.55)_70%,hsl(var(--background)/0.9))]"
      />

      {/* Nav */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </motion.div>
            <span className="text-[14px] font-semibold tracking-tight">ML Inspector AI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] text-ink-soft md:flex">
            <a href="#apps" className="story-link transition hover:text-foreground">
              Apps
            </a>
            <a href="#features" className="story-link transition hover:text-foreground">
              Features
            </a>
            <Link to="/auth" className="story-link transition hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <Link
            to="/auth"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
          >
            Get started
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.header>

      {/* Hero */}
      <div ref={heroRef} className="relative">
        <motion.div
          style={{ y: bgY }}
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]"
        >
          <div className="absolute inset-0">
            <ThreeBackground variant="hero" opacity={1} />
          </div>
          <div className="absolute inset-0 opacity-80">
            <ShaderOrb className="h-full w-full" height={900} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        </motion.div>

        <motion.section
          style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
          className="mx-auto max-w-4xl px-6 pb-32 pt-28 text-center md:pt-36"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] text-ink-soft backdrop-blur"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            The AI engineering toolkit
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease }}
            className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight text-foreground md:text-7xl"
          >
            <AnimatedWords text="Inspect, debug, and document" />
            <br className="hidden md:block" />
            <span className="text-ink-soft">
              <AnimatedWords text=" your AI systems." delayStart={0.55} />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-ink-soft"
          >
            Eleven focused applications for ML engineers, AI researchers, and product teams. One
            calm, fast workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/auth"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition hover:shadow-lg hover:-translate-y-0.5"
            >
              Open the workspace
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#apps"
              className="inline-flex items-center rounded-full border border-border bg-surface/80 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:bg-secondary"
            >
              See the apps
            </a>
          </motion.div>

          {effectiveAnimate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="mt-20 flex justify-center"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-9 w-5 items-start justify-center rounded-full border border-border/70 p-1"
              >
                <span className="h-1.5 w-1 rounded-full bg-foreground/60" />
              </motion.div>
            </motion.div>
          )}
        </motion.section>
      </div>

      {/* Stats */}
      <ZoomReveal className="mx-auto max-w-6xl px-6" from={0.96}>
        <div className="grid grid-cols-2 divide-y divide-border border-y border-border bg-background/40 backdrop-blur-sm md:grid-cols-4 md:divide-x md:divide-y-0">
          {stats.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease }}
              whileHover={{ y: -4 }}
              className="px-6 py-10 text-center"
            >
              <div className="text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
                {s.v}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                {s.l}
              </div>
            </motion.div>
          ))}
        </div>
      </ZoomReveal>

      {/* Apps */}
      <section id="apps" className="relative mx-auto max-w-6xl px-6 py-32">
        <Reveal className="mb-16 flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
              Applications
            </div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Eleven disciplines, one workspace.
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <Sparkles className="h-3 w-3" /> 5 new tools — Chunking, Embeddings, Cost,
              Fine-tuning, Audit
            </div>
          </div>
          <p className="max-w-sm text-[15px] text-ink-soft">
            Each app is its own product, with its own pipeline. Shared auth, projects, audit, and
            command palette.
          </p>
        </Reveal>

        <ZoomReveal from={0.94}>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border/80 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, i) => (
              <motion.div
                key={app.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden bg-surface/90 p-8 backdrop-blur-sm transition-colors hover:bg-secondary/40"
              >
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative flex items-start justify-between">
                  <motion.div
                    whileHover={{ rotate: -6, scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-foreground transition group-hover:border-accent/40"
                  >
                    <app.icon className="h-4 w-4" />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    {app.tag === "New" && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
                        New
                      </span>
                    )}
                    <span className="font-mono text-[11px] tracking-wider text-ink-soft">
                      {app.num}
                    </span>
                  </div>
                </div>
                <h3 className="relative mt-8 text-[17px] font-semibold tracking-tight">
                  {app.name}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{app.desc}</p>
                <motion.div
                  className="relative mt-6 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100"
                  initial={false}
                >
                  Explore <ArrowRight className="h-3 w-3" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </ZoomReveal>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative border-t border-border bg-surface-2/70 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-6xl px-6 py-32">
          <Reveal className="mb-14 max-w-xl">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
              Built-in
            </div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Power, with restraint.
            </h2>
          </Reveal>
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                whileHover={{ x: 6 }}
                className="flex gap-5 border-t border-border pt-6"
              >
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-foreground"
                >
                  <f.icon className="h-4 w-4" />
                </motion.div>
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">{f.title}</div>
                  <div className="mt-1 text-sm text-ink-soft">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <ThreeBackground variant="nebula" opacity={0.7} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
        </div>
        <ZoomReveal className="mx-auto max-w-3xl px-6 py-32 text-center" from={0.9}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="text-4xl font-semibold tracking-tight md:text-6xl"
          >
            Ready when you are.
          </motion.h2>
          <p className="mx-auto mt-4 max-w-md text-ink-soft">Onboarding takes under a minute.</p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mt-8 inline-block"
          >
            <Link
              to="/auth"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:shadow-lg"
            >
              Open the workspace{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </ZoomReveal>
      </div>

      <footer className="border-t border-border bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-ink-soft">
          <span>© {new Date().getFullYear()} ML Inspector AI</span>
          <Link to="/auth" className="transition hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Word-by-word fade/rise for headline. Respects reduced-motion. */
function AnimatedWords({ text, delayStart = 0 }: { text: string; delayStart?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  const words = text.split(" ");
  return (
    <AnimatePresence>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: delayStart + i * 0.08, ease }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </AnimatePresence>
  );
}
