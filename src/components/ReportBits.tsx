import { motion } from "framer-motion";

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-6"
    >
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </motion.div>
  );
}

export function MetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-secondary text-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-surface/40 p-3 text-[11px] font-mono leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
