import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const ResultSchema = z.object({
  summary: z.string(),
  recommendation: z.object({
    strategy: z.string(),
    rationale: z.string(),
    config: z.object({
      chunk_size: z.number().optional(),
      overlap: z.number().optional()
    }).optional(),
  }),
  strategies: z
    .array(
      z.object({
        name: z.string(),
        chunk_count: z.number().int(),
        avg_tokens: z.number(),
        coverage_score: z.number().min(0).max(100),
        retrieval_score: z.number().min(0).max(100),
        semantic_coherence: z.number().min(0).max(100),
        pros: z.array(z.string()).max(6),
        cons: z.array(z.string()).max(6),
        sample_chunks: z.array(z.string()).max(4),
      }),
    )
    .min(1)
    .max(8),
});

function fixedChunks(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}
function slidingChunks(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < text.length; i += step) out.push(text.slice(i, i + size));
  return out;
}
function sentenceChunks(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}
function paragraphChunks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const listSims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("chunking_sims")
      .select("id, name, query, created_at, recommendation")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("chunking_sims")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteSim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("chunking_sims")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runSim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { name: string; document: string; query?: string }) =>
    z
      .object({
        name: z.string().min(1).max(200),
        document: z.string().min(50).max(60000),
        query: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const gateway = createAiGatewayProvider(key);

    const strategies = [
      { name: "Fixed (512 chars)", chunks: fixedChunks(data.document, 512) },
      { name: "Sliding (512 / 128 overlap)", chunks: slidingChunks(data.document, 512, 128) },
      { name: "Sentence-level", chunks: sentenceChunks(data.document) },
      { name: "Paragraph-level", chunks: paragraphChunks(data.document) },
    ];

    const strategiesForPrompt = strategies.map((s) => ({
      name: s.name,
      chunk_count: s.chunks.length,
      avg_chars: Math.round(
        s.chunks.reduce((a, c) => a + c.length, 0) / Math.max(1, s.chunks.length),
      ),
      first_chunks: s.chunks.slice(0, 3),
    }));

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: ResultSchema }),
      system:
        "You are a senior RAG engineer. Evaluate chunking strategies for retrieval quality. avg_tokens ≈ avg_chars / 4. Be specific. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.",
      prompt:
        (data.query ? `Target query: ${data.query}\n\n` : "") +
        `Document preview (first 4k chars):\n${data.document.slice(0, 4000)}\n\n` +
        `Strategies tested:\n${JSON.stringify(strategiesForPrompt, null, 2)}`,
    });

    const out = result.output as z.infer<typeof ResultSchema>;
    const { data: row, error } = await (context.supabase as any)
      .from("chunking_sims")
      .insert({
        owner_id: context.userId,
        name: data.name,
        document: data.document,
        query: data.query ?? null,
        strategies: strategiesForPrompt,
        results: out,
        recommendation: out.recommendation,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("activities").insert({
      user_id: context.userId,
      app: "chunking",
      action: "simulated",
      entity_id: row.id,
      meta: { name: data.name },
    });
    return { id: row.id };
  });
