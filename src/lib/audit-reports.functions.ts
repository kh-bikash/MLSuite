import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const ReportSchema = z.object({
  executive_summary: z.string(),
  overall_risk: z.enum(["low", "medium", "high", "critical"]),
  governance_score: z.number().min(0).max(100),
  sections: z.object({
    system_overview: z.string(),
    intended_use: z.string(),
    data_governance: z.string(),
    fairness_and_bias: z.string(),
    safety_and_reliability: z.string(),
    transparency: z.string(),
    accountability: z.string(),
  }),
  findings: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        category: z.enum([
          "bias",
          "safety",
          "privacy",
          "reliability",
          "compliance",
          "transparency",
        ]),
        evidence: z.string(),
        recommendation: z.string(),
      }),
    )
    .min(1)
    .max(20),
  compliance: z
    .array(
      z.object({
        framework: z.string(),
        status: z.enum(["aligned", "partial", "gap", "not_applicable"]),
        notes: z.string(),
      }),
    )
    .max(8),
  sign_off_checklist: z.array(z.string()).min(3).max(15),
});

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("audit_reports")
      .select("id, name, system_name, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("audit_reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("audit_reports")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [datasets, cards, prompts] = await Promise.all([
      context.supabase
        .from("dataset_audits")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("model_cards")
        .select("id, model_name, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("prompt_suites")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      datasets: datasets.data ?? [],
      cards: cards.data ?? [],
      prompts: prompts.data ?? [],
    };
  });

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      name: string;
      system_name?: string;
      dataset_id?: string;
      card_id?: string;
      prompt_id?: string;
    }) =>
      z
        .object({
          name: z.string().min(1).max(200),
          system_name: z.string().max(200).optional(),
          dataset_id: z.string().uuid().optional(),
          card_id: z.string().uuid().optional(),
          prompt_id: z.string().uuid().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const [datasetRow, cardRow, promptRow] = await Promise.all([
      data.dataset_id
        ? context.supabase
            .from("dataset_audits")
            .select("*")
            .eq("id", data.dataset_id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      data.card_id
        ? context.supabase.from("model_cards").select("*").eq("id", data.card_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      data.prompt_id
        ? context.supabase.from("prompt_suites").select("*").eq("id", data.prompt_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const gateway = createAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: ReportSchema }),
      system:
        "You are a senior AI-governance auditor producing a boardroom-ready AI Product Audit Report. Synthesize the provided artifacts (dataset bias audit, model card, prompt regression suite) into a coherent narrative. Be specific, cite evidence from the inputs, and align findings to NIST AI RMF, EU AI Act, and ISO/IEC 42001 where relevant. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `System: ${data.system_name ?? data.name}\n\n` +
        `--- Dataset audit ---\n${JSON.stringify(datasetRow?.data ?? "not provided", null, 2).slice(0, 6000)}\n\n` +
        `--- Model card ---\n${JSON.stringify(cardRow?.data ?? "not provided", null, 2).slice(0, 6000)}\n\n` +
        `--- Prompt suite ---\n${JSON.stringify(promptRow?.data ?? "not provided", null, 2).slice(0, 4000)}`,
    });

    const content = result.output as z.infer<typeof ReportSchema>;
    const { data: row, error } = await (context.supabase as any)
      .from("audit_reports")
      .insert({
        owner_id: context.userId,
        name: data.name,
        system_name: data.system_name ?? null,
        source_dataset_id: data.dataset_id ?? null,
        source_card_id: data.card_id ?? null,
        source_prompt_id: data.prompt_id ?? null,
        content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("activities").insert({
      user_id: context.userId,
      app: "audit-reports",
      action: "generated",
      entity_id: row.id,
      meta: { name: data.name, risk: content.overall_risk },
    });
    return { id: row.id };
  });
