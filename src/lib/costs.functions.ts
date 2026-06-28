import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const ResultSchema = z.object({
  summary: z.string(),
  recommendation: z.object({
    model: z.string(),
    reason: z.string(),
    expected_monthly_cost_usd: z.number(),
  }),
  models: z
    .array(
      z.object({
        name: z.string(),
        input_cost_per_1m: z.number(),
        output_cost_per_1m: z.number(),
        monthly_cost_usd: z.number(),
        latency_p50_ms: z.number().int(),
        quality_score: z.number().min(0).max(100),
        verdict: z.enum(["best_value", "premium", "budget", "skip"]),
        notes: z.string(),
      }),
    )
    .min(3)
    .max(10),
  cost_levers: z.array(z.string()).min(1).max(8),
});

export const listEstimates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("cost_estimates")
      .select("id, name, use_case, monthly_requests, recommendation, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEstimate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("cost_estimates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteEstimate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("cost_estimates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runEstimate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      name: string;
      use_case: string;
      input_tokens: number;
      output_tokens: number;
      monthly_requests: number;
      latency_target?: string;
      quality_priority?: string;
    }) =>
      z
        .object({
          name: z.string().min(1).max(200),
          use_case: z.string().min(10).max(4000),
          input_tokens: z.number().int().min(1).max(2_000_000),
          output_tokens: z.number().int().min(1).max(200_000),
          monthly_requests: z.number().int().min(1).max(1_000_000_000),
          latency_target: z.string().max(60).optional(),
          quality_priority: z.string().max(60).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const gateway = createAiGatewayProvider(key);

    const monthlyInputM = (data.input_tokens * data.monthly_requests) / 1_000_000;
    const monthlyOutputM = (data.output_tokens * data.monthly_requests) / 1_000_000;

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: ResultSchema }),
      system:
        "You are an LLM economics analyst. Recommend the best model for the workload across cost, quality, and latency. Use current public per-1M-token prices for the major providers (OpenAI gpt-4o / gpt-4o-mini, Anthropic Claude 3.5 Sonnet / Haiku, Google Gemini 1.5 / 2.5 Pro / Flash, DeepSeek, Llama hosted). monthly_cost_usd = monthlyInputM*input_cost + monthlyOutputM*output_cost. Compare at least 5 frontier+budget candidates. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `Name: ${data.name}\n` +
        `Use case: ${data.use_case}\n` +
        `Per request — input tokens: ${data.input_tokens}, output tokens: ${data.output_tokens}\n` +
        `Monthly requests: ${data.monthly_requests}\n` +
        `Monthly input (M tokens): ${monthlyInputM.toFixed(3)}\n` +
        `Monthly output (M tokens): ${monthlyOutputM.toFixed(3)}\n` +
        `Latency target: ${data.latency_target ?? "no preference"}\n` +
        `Quality priority: ${data.quality_priority ?? "balanced"}`,
    });

    const out = result.output as z.infer<typeof ResultSchema>;
    const { data: row, error } = await (context.supabase as any)
      .from("cost_estimates")
      .insert({
        owner_id: context.userId,
        name: data.name,
        use_case: data.use_case,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
        monthly_requests: data.monthly_requests,
        latency_target: data.latency_target ?? null,
        quality_priority: data.quality_priority ?? null,
        results: out,
        recommendation: out.recommendation,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("activities").insert({
      user_id: context.userId,
      app: "costs",
      action: "estimated",
      entity_id: row.id,
      meta: { name: data.name },
    });
    return { id: row.id };
  });
