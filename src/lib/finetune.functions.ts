import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const VerdictSchema = z.object({
  summary: z.string(),
  verdict: z.enum([
    "prompt_engineering_enough",
    "use_rag",
    "fine_tune_recommended",
    "fine_tune_required",
  ]),
  confidence: z.number().min(0).max(100),
  rationale: z.string(),
  alternatives_tried_first: z
    .array(z.object({ approach: z.string(), why: z.string(), expected_lift: z.string() }))
    .max(5),
  if_fine_tuning: z.object({
    min_dataset_size: z.number().int(),
    realistic_dataset_size: z.number().int(),
    estimated_cost_usd: z.string(),
    suggested_base_models: z.array(z.string()).max(5),
    risks: z.array(z.string()).max(5),
  }),
  sample_quality: z.object({
    diversity_score: z.number().min(0).max(100),
    coverage_gaps: z.array(z.string()).max(8),
    labeling_quality: z.enum(["poor", "okay", "good", "excellent"]),
  }),
  next_steps: z.array(z.string()).min(1).max(8),
});

export const listChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("finetune_checks")
      .select("id, name, task, verdict, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("finetune_checks")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("finetune_checks")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { name: string; task: string; description: string; samples: string[] }) =>
    z
      .object({
        name: z.string().min(1).max(200),
        task: z.string().min(2).max(200),
        description: z.string().min(20).max(8000),
        samples: z.array(z.string().min(1).max(4000)).min(1).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const gateway = createAiGatewayProvider(key);

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: VerdictSchema }),
      system:
        "You are a senior ML engineer. Decide whether fine-tuning is justified vs prompt engineering or RAG. Be skeptical: most teams do NOT need fine-tuning. Recommend cheaper approaches first when adequate. If fine-tuning is justified, estimate realistic dataset sizes (usually 1k-10k examples for instruction tuning, 10k-100k for full task tuning) and ballpark costs. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `Task type: ${data.task}\n\n` +
        `Description:\n${data.description}\n\n` +
        `Sample data (${data.samples.length} examples):\n${data.samples
          .slice(0, 15)
          .map((s, i) => `[${i}] ${s.slice(0, 600)}`)
          .join("\n")}`,
    });

    const out = result.output as z.infer<typeof VerdictSchema>;
    const { data: row, error } = await (context.supabase as any)
      .from("finetune_checks")
      .insert({
        owner_id: context.userId,
        name: data.name,
        task: data.task,
        description: data.description,
        samples: data.samples,
        verdict: out,
        recommendation: out.verdict,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("activities").insert({
      user_id: context.userId,
      app: "finetune",
      action: "checked",
      entity_id: row.id,
      meta: { name: data.name, verdict: out.verdict },
    });
    return { id: row.id };
  });
