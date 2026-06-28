import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = [
  "experiment_runs",
  "dataset_audits",
  "rag_sessions",
  "model_cards",
  "prompt_suites",
  "prompt_runs",
  "prompt_results",
  "benchmarks",
  "benchmark_runs",
  "audit_log",
  "notifications",
  "reports",
] as const;

type Table = (typeof TABLES)[number];

export const exportAllData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const out: Record<string, any[]> = {};
    for (const t of TABLES) {
      const { data } = await context.supabase.from(t).select("*");
      out[t] = (data ?? []) as any[];
    }
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "export",
      entity_type: "workspace",
      entity_label: "Full data export",
    });
    return {
      exported_at: new Date().toISOString(),
      user_id: context.userId,
      data: out as any,
    };
  });

export const exportTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { table: Table; format: "json" | "csv" }) => d)
  .handler(async ({ data, context }) => {
    if (!TABLES.includes(data.table)) throw new Error("Unknown table");
    const { data: rows, error } = await context.supabase.from(data.table).select("*");
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "export",
      entity_type: data.table,
      entity_label: `${data.table} (${data.format})`,
      changes: { count: rows?.length ?? 0 },
    });
    if (data.format === "json") {
      return {
        content: JSON.stringify(rows ?? [], null, 2),
        mime: "application/json",
        ext: "json",
      };
    }
    const list = rows ?? [];
    if (list.length === 0) return { content: "", mime: "text/csv", ext: "csv" };
    const cols = Array.from(new Set(list.flatMap((r) => Object.keys(r as object))));
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      cols.join(","),
      ...list.map((r: any) => cols.map((c) => esc(r[c])).join(",")),
    ].join("\n");
    return { content: csv, mime: "text/csv", ext: "csv" };
  });
