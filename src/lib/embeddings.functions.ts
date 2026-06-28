import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const ResultSchema = z.object({
  summary: z.string(),
  winner: z.string(),
  models: z
    .array(
      z.object({
        name: z.string(),
        avg_relevance: z.number().min(0).max(100),
        precision_at_3: z.number().min(0).max(100),
        recall_at_5: z.number().min(0).max(100),
        mrr: z.number().min(0).max(1).describe("Mean reciprocal rank (0-1)."),
        ndcg_at_5: z.number().min(0).max(1).describe("Normalized DCG @5 (0-1)."),
        diversity_score: z
          .number()
          .min(0)
          .max(100)
          .describe("Result diversity / coverage of distinct chunks."),
        semantic_drift: z
          .number()
          .min(0)
          .max(100)
          .describe("Tendency to drift to lexically-similar but off-topic results (lower better)."),
        est_latency_ms: z.number().int().min(1).max(5000),
        est_cost_per_1m_tokens_usd: z.number().min(0).max(100),
        latency_class: z.enum(["fast", "medium", "slow"]),
        cost_class: z.enum(["low", "medium", "high"]),
        strengths: z.array(z.string()).max(5),
        weaknesses: z.array(z.string()).max(5),
        per_query: z
          .array(
            z.object({
              query: z.string(),
              top_chunk_indexes: z.array(z.number().int()).max(5),
              relevance: z.number().min(0).max(100),
            }),
          )
          .max(20),
      }),
    )
    .min(1)
    .max(8),
  recommendation: z.object({
    pick: z.string(),
    reason: z.string(),
    runner_up: z.string().optional(),
    tradeoffs: z.string().optional(),
  }),
});

export const listCompares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("embedding_compares")
      .select("id, name, winner, created_at, models")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCompare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("embedding_compares")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteCompare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("embedding_compares")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runCompare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { name: string; queries: string[]; chunks: string[]; models: string[] }) =>
    z
      .object({
        name: z.string().min(1).max(200),
        queries: z.array(z.string().min(1).max(1000)).min(1).max(20),
        chunks: z.array(z.string().min(1).max(4000)).min(2).max(60),
        models: z.array(z.string().min(1).max(120)).min(2).max(8),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const gateway = createAiGatewayProvider(key);

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: ResultSchema }),
      system:
        "You are an information-retrieval expert. Simulate how each embedding model would rank the candidate chunks for each query, using known characteristics (e.g. OpenAI text-embedding-3-* favor semantic paraphrase; BGE excels at multilingual & domain; Cohere multilingual is strong cross-lingual; voyage-* excels at long context). Compute realistic retrieval metrics: avg_relevance (0-100), precision@3, recall@5, MRR (0-1), nDCG@5 (0-1), diversity_score (0-100, higher = more distinct chunks retrieved across queries), semantic_drift (0-100, lower better), est_latency_ms (typical p50 per query), and est_cost_per_1m_tokens_usd. Return chunk indexes that are valid integers into the candidate list. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        `Queries:\n${data.queries.map((q, i) => `[${i}] ${q}`).join("\n")}\n\n` +
        `Candidate chunks:\n${data.chunks.map((c, i) => `[${i}] ${c.slice(0, 400)}`).join("\n")}\n\n` +
        `Models to compare:\n${data.models.join(", ")}`,
    });

    const out = result.output as z.infer<typeof ResultSchema>;
    const { data: row, error } = await (context.supabase as any)
      .from("embedding_compares")
      .insert({
        owner_id: context.userId,
        name: data.name,
        queries: data.queries,
        chunks: data.chunks,
        models: data.models,
        results: out,
        winner: out.winner,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("activities").insert({
      user_id: context.userId,
      app: "embeddings",
      action: "compared",
      entity_id: row.id,
      meta: { name: data.name, winner: out.winner },
    });
    return { id: row.id };
  });
