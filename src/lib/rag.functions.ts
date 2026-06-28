import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const AnalysisSchema = z.object({
  summary: z.string().describe("One-sentence verdict on the RAG response quality."),
  status: z.enum(["healthy", "warning", "failed"]),
  grounding_score: z
    .number()
    .min(0)
    .max(100)
    .describe("How well the answer is supported by retrieved chunks (0-100)."),
  hallucination_score: z
    .number()
    .min(0)
    .max(100)
    .describe("Severity of unsupported / fabricated claims (0-100)."),
  retrieval_quality: z
    .number()
    .min(0)
    .max(100)
    .describe("How relevant retrieved chunks are to the question (0-100)."),
  answer_completeness: z.number().min(0).max(100),
  chunk_scores: z
    .array(
      z.object({
        index: z.number().int(),
        relevance: z.number().min(0).max(100),
        used_in_answer: z.boolean(),
        verdict: z.string(),
      }),
    )
    .max(40),
  unsupported_claims: z.array(z.object({ claim: z.string(), reason: z.string() })).max(10),
  missing_context: z
    .array(z.string())
    .max(8)
    .describe("Information needed to answer that was NOT in retrieved chunks."),
  issues: z
    .array(
      z.object({
        category: z.enum([
          "retrieval",
          "ranking",
          "chunking",
          "embedding",
          "prompting",
          "grounding",
        ]),
        title: z.string(),
        evidence: z.string(),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(10),
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

type ChunkIn = { text: string; source?: string; score?: number };

export const listSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rag_sessions")
      .select(
        "id, name, question, status, grounding_score, hallucination_score, retriever, vector_db, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("rag_sessions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Session not found");
    return row;
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rag_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const analyzeRag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      name: string;
      question: string;
      generated_answer: string;
      chunks: ChunkIn[];
      embedding_model?: string;
      retriever?: string;
      vector_db?: string;
      chunk_size?: number;
      chunk_overlap?: number;
      prompt?: string;
    }) =>
      z
        .object({
          name: z.string().min(1).max(200),
          question: z.string().min(1).max(4000),
          generated_answer: z.string().min(1).max(20000),
          chunks: z
            .array(
              z.object({
                text: z.string().min(1).max(8000),
                source: z.string().max(300).optional(),
                score: z.number().optional(),
              }),
            )
            .min(1)
            .max(30),
          embedding_model: z.string().max(120).optional(),
          retriever: z.string().max(120).optional(),
          vector_db: z.string().max(120).optional(),
          chunk_size: z.number().int().positive().optional(),
          chunk_overlap: z.number().int().min(0).optional(),
          prompt: z.string().max(8000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing OPENAI_API_KEY.");

    const gateway = createAiGatewayProvider(key);

    const chunksForPrompt = data.chunks.map((c, i) => ({
      index: i,
      source: c.source ?? null,
      retriever_score: c.score ?? null,
      text: c.text.slice(0, 2000),
    }));

    const result = await generateText({
      model: gateway("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: AnalysisSchema }),
      system:
        "You are a senior RAG systems engineer. Given a question, retrieved chunks, and the generated answer, judge grounding, hallucination, retrieval relevance, and ranking. For every chunk, return an index that exactly matches the input. Identify unsupported claims with quotes. Be precise. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (\`\`\`json) or any conversational text.",
      prompt:
        `Question:\n${data.question}\n\n` +
        `Generated answer:\n${data.generated_answer}\n\n` +
        (data.prompt ? `System / RAG prompt template:\n${data.prompt}\n\n` : "") +
        `Pipeline: retriever=${data.retriever ?? "n/a"}, embeddings=${data.embedding_model ?? "n/a"}, vector_db=${data.vector_db ?? "n/a"}, chunk_size=${data.chunk_size ?? "n/a"}, overlap=${data.chunk_overlap ?? "n/a"}\n\n` +
        `Retrieved chunks (JSON):\n${JSON.stringify(chunksForPrompt, null, 2)}`,
    });

    const analysis = result.output as z.infer<typeof AnalysisSchema>;

    const { data: inserted, error } = await context.supabase
      .from("rag_sessions")
      .insert({
        owner_id: context.userId,
        name: data.name,
        question: data.question,
        generated_answer: data.generated_answer,
        embedding_model: data.embedding_model ?? null,
        retriever: data.retriever ?? null,
        vector_db: data.vector_db ?? null,
        chunk_size: data.chunk_size ?? null,
        chunk_overlap: data.chunk_overlap ?? null,
        prompt: data.prompt ?? null,
        chunks: data.chunks,
        analysis,
        grounding_score: analysis.grounding_score,
        hallucination_score: analysis.hallucination_score,
        status: analysis.status,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("activities").insert({
      user_id: context.userId,
      app: "rag",
      action: "analyzed",
      entity_id: inserted.id,
      meta: { name: data.name, grounding: analysis.grounding_score },
    });

    return { id: inserted.id };
  });
