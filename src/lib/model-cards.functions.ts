import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const CardSchema = z.object({
  summary: z.string().describe("One-paragraph overview of the model."),
  intended_use: z.object({
    primary_uses: z.array(z.string()).min(1).max(8),
    primary_users: z.array(z.string()).min(1).max(6),
    out_of_scope: z.array(z.string()).min(1).max(8),
  }),
  factors: z.object({
    relevant: z.array(z.string()).max(8),
    evaluation: z.array(z.string()).max(8),
  }),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        notes: z.string().optional(),
      }),
    )
    .min(1)
    .max(12),
  training_data: z.object({
    description: z.string(),
    sources: z.array(z.string()).max(8),
    preprocessing: z.array(z.string()).max(8),
  }),
  evaluation_data: z.object({
    description: z.string(),
    motivation: z.string(),
  }),
  ethical_considerations: z.array(z.string()).min(1).max(10),
  caveats_and_recommendations: z.array(z.string()).min(1).max(10),
  bias_risks: z
    .array(
      z.object({
        risk: z.string(),
        mitigation: z.string(),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(8),
  environmental_impact: z
    .object({
      hardware: z.string().optional(),
      hours_used: z.string().optional(),
      carbon_emitted: z.string().optional(),
    })
    .optional(),
  citation: z.string().optional(),
});

export type ModelCardContent = z.infer<typeof CardSchema>;

export const listCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("model_cards")
      .select(
        "id, model_name, version, license, task, architecture, status, updated_at, created_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("model_cards")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Model card not found");
    return row;
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("model_cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      model_name: string;
      version?: string;
      license?: string;
      task?: string;
      architecture?: string;
      dataset?: string;
      context: string;
    }) =>
      z
        .object({
          model_name: z.string().min(1).max(200),
          version: z.string().max(60).optional(),
          license: z.string().max(120).optional(),
          task: z.string().max(200).optional(),
          architecture: z.string().max(200).optional(),
          dataset: z.string().max(200).optional(),
          context: z.string().min(20).max(20000),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing OPENAI_API_KEY.");

    const gateway = createAiGatewayProvider(key);

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: CardSchema }),
      system:
        "You are a senior ML responsible-AI engineer drafting a Google/HuggingFace-compatible Model Card. Be specific, factual, and honest about limitations. When information is missing, infer reasonable defaults from the task and architecture, but mark them as assumptions in caveats. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `Model: ${data.model_name}${data.version ? ` v${data.version}` : ""}\n` +
        `Task: ${data.task ?? "unspecified"}\n` +
        `Architecture: ${data.architecture ?? "unspecified"}\n` +
        `Training dataset: ${data.dataset ?? "unspecified"}\n` +
        `License: ${data.license ?? "unspecified"}\n\n` +
        `Engineer-provided context:\n${data.context}`,
    });

    const content = result.output as ModelCardContent;

    const { data: inserted, error } = await context.supabase
      .from("model_cards")
      .insert({
        owner_id: context.userId,
        model_name: data.model_name,
        version: data.version ?? null,
        license: data.license ?? null,
        task: data.task ?? null,
        architecture: data.architecture ?? null,
        dataset: data.dataset ?? null,
        content: content as never,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("activities").insert({
      user_id: context.userId,
      app: "model-cards",
      action: "generated",
      entity_id: inserted.id,
      meta: { model_name: data.model_name, version: data.version ?? null },
    });

    return { id: inserted.id };
  });
