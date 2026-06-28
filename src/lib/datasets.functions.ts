import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const AuditSchema = z.object({
  summary: z.string().describe("One-sentence verdict on dataset health and bias."),
  status: z.enum(["healthy", "warning", "failed"]),
  risk_score: z.number().min(0).max(100).describe("Overall risk 0-100, higher = riskier."),
  bias_score: z.number().min(0).max(100).describe("Bias severity 0-100."),
  protected_attributes: z
    .array(
      z.object({
        column: z.string(),
        reason: z.string(),
        distribution_note: z.string(),
      }),
    )
    .max(8),
  fairness: z.object({
    imbalance_findings: z
      .array(
        z.object({
          column: z.string(),
          group: z.string(),
          share_pct: z.number(),
          concern: z.string(),
        }),
      )
      .max(10),
    leakage_signals: z.array(z.object({ column: z.string(), evidence: z.string() })).max(8),
    target_skew: z.string().nullable(),
  }),
  stats: z.object({
    missing_value_columns: z
      .array(z.object({ column: z.string(), missing_pct: z.number() }))
      .max(20),
    duplicate_estimate: z.string().nullable(),
    notes: z.string(),
  }),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        action: z.string(),
        priority: z.enum(["now", "soon", "later"]),
      }),
    )
    .min(1)
    .max(8),
});

// Tiny CSV parser (handles quoted fields, commas, escaped quotes)
function parseCSV(text: string, maxRows = 500): { headers: string[]; rows: string[][] } {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (field.length || row.length) {
          row.push(field);
          out.push(row);
          row = [];
          field = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (out.length > maxRows) break;
      } else field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  const headers = out.shift() ?? [];
  return { headers, rows: out };
}

function profileColumns(headers: string[], rows: string[][]) {
  return headers.map((h, idx) => {
    const values = rows.map((r) => r[idx] ?? "");
    const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined);
    const missingPct = rows.length ? ((rows.length - nonEmpty.length) / rows.length) * 100 : 0;
    const uniq = new Set(nonEmpty);
    const numericCount = nonEmpty.filter((v) => /^-?\d+(\.\d+)?$/.test(v.trim())).length;
    const isNumeric = nonEmpty.length > 0 && numericCount / nonEmpty.length > 0.85;
    // top categories
    const counts = new Map<string, number>();
    if (!isNumeric) {
      for (const v of nonEmpty) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({
        value,
        count,
        pct: nonEmpty.length ? (count / nonEmpty.length) * 100 : 0,
      }));
    return {
      column: h,
      type: isNumeric ? "numeric" : "categorical",
      missing_pct: Number(missingPct.toFixed(2)),
      unique_count: uniq.size,
      sample_size: nonEmpty.length,
      top_values: top,
    };
  });
}

export const listAudits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dataset_audits")
      .select(
        "id, name, dataset_name, status, risk_score, bias_score, row_count, column_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dataset_audits")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Audit not found");
    return row;
  });

export const deleteAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dataset_audits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const auditDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { name: string; dataset_name: string; target_column?: string; csv: string }) =>
      z
        .object({
          name: z.string().min(1).max(200),
          dataset_name: z.string().min(1).max(200),
          target_column: z.string().max(120).optional(),
          csv: z.string().min(20).max(2_000_000),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing OPENAI_API_KEY.");

    const { headers, rows } = parseCSV(data.csv, 1000);
    if (headers.length === 0) throw new Error("Could not parse CSV: no headers found.");
    if (rows.length === 0) throw new Error("Could not parse CSV: no data rows found.");

    const profile = profileColumns(headers, rows);

    const gateway = createAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: AuditSchema }),
      system:
        "You are a senior ML fairness and data-quality auditor. Given a column profile derived from a CSV, identify protected attributes, class imbalance, leakage risk, missingness, and target skew. Be specific, cite column names and percentages. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `Dataset: ${data.dataset_name}\nRows analyzed: ${rows.length}\nColumns: ${headers.length}\n` +
        (data.target_column ? `Target column (user-declared): ${data.target_column}\n` : "") +
        `\nColumn profile (JSON):\n${JSON.stringify(profile, null, 2)}`,
    });

    const analysis = result.output as z.infer<typeof AuditSchema>;

    const { data: inserted, error } = await context.supabase
      .from("dataset_audits")
      .insert({
        owner_id: context.userId,
        name: data.name,
        dataset_name: data.dataset_name,
        status: analysis.status,
        risk_score: analysis.risk_score,
        bias_score: analysis.bias_score,
        row_count: rows.length,
        column_count: headers.length,
        protected_attributes: analysis.protected_attributes,
        fairness: analysis.fairness,
        stats: { ...analysis.stats, profile },
        recommendations: analysis.recommendations,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("activities").insert({
      user_id: context.userId,
      app: "datasets",
      action: "audited",
      entity_id: inserted.id,
      meta: { name: data.name, risk_score: analysis.risk_score },
    });

    return { id: inserted.id };
  });
