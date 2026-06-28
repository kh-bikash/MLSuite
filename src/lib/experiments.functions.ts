import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const AnalysisSchema = z.object({
  summary: z.string().describe("One-sentence verdict of what failed."),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  status: z.enum(["healthy", "warning", "failed"]),
  root_causes: z
    .array(
      z.object({
        title: z.string(),
        evidence: z.string(),
        category: z.enum([
          "data",
          "model",
          "optimizer",
          "infrastructure",
          "hyperparameter",
          "code",
          "other",
        ]),
      }),
    )
    .min(1)
    .max(5),
  metrics_observed: z.object({
    final_loss: z.number().nullable(),
    final_accuracy: z.number().nullable(),
    epochs_completed: z.number().nullable(),
    notes: z.string(),
  }),
  repair_plan: z
    .array(
      z.object({
        step: z.string(),
        rationale: z.string(),
        priority: z.enum(["now", "soon", "later"]),
      }),
    )
    .min(1)
    .max(8),
});

export const listExperiments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("experiment_runs")
      .select("id, name, framework, status, severity, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getExperiment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("experiment_runs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Experiment not found");
    return row;
  });

export const deleteExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("experiment_runs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const analyzeExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { name: string; framework: string; raw_log: string }) =>
    z
      .object({
        name: z.string().min(1).max(200),
        framework: z.string().min(1).max(80),
        raw_log: z.string().min(20).max(200_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing OPENAI_API_KEY.");

    const gateway = createAiGatewayProvider(key);

    // Truncate to keep prompts manageable
    const trimmed =
      data.raw_log.length > 60_000
        ? data.raw_log.slice(0, 30_000) + "\n...[truncated]...\n" + data.raw_log.slice(-30_000)
        : data.raw_log;

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: AnalysisSchema }),
      system:
        "You are an ML training failure analyst. Inspect raw training logs and metrics and produce a calm, specific root-cause diagnosis and a prioritized repair plan. Be concrete and cite numbers from the logs when possible. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt: `Framework: ${data.framework}\nExperiment: ${data.name}\n\n--- LOG START ---\n${trimmed}\n--- LOG END ---`,
    });

    const analysis = result.output as z.infer<typeof AnalysisSchema>;

    const { data: inserted, error } = await context.supabase
      .from("experiment_runs")
      .insert({
        owner_id: context.userId,
        name: data.name,
        framework: data.framework,
        raw_log: data.raw_log,
        status: analysis.status,
        severity: analysis.severity,
        confidence: analysis.confidence,
        metrics: analysis.metrics_observed,
        analysis,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("activities").insert({
      user_id: context.userId,
      app: "experiments",
      action: "analyzed",
      entity_id: inserted.id,
      meta: { name: data.name, severity: analysis.severity },
    });

    return { id: inserted.id };
  });
