import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const CaseSchema = z.object({
  name: z.string().min(1).max(120),
  input: z.string().min(1).max(8000),
  expected: z.string().max(8000).optional().default(""),
});

const SuiteInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  system_prompt: z.string().max(8000).optional(),
  models: z.array(z.string().min(1).max(120)).min(1).max(6),
  cases: z.array(CaseSchema).min(1).max(20),
});

export const listSuites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("prompt_suites")
      .select("id, name, description, models, cases, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSuite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: suite, error } = await context.supabase
      .from("prompt_suites")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!suite) throw new Error("Suite not found");

    const { data: runs } = await context.supabase
      .from("prompt_runs")
      .select("id, status, summary, created_at")
      .eq("suite_id", data.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return { suite, runs: runs ?? [] };
  });

export const getRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("prompt_runs")
      .select("*, prompt_suites(name, system_prompt, cases, models)")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Run not found");

    const { data: results } = await context.supabase
      .from("prompt_results")
      .select("*")
      .eq("run_id", data.runId)
      .order("created_at", { ascending: true });

    return { run, results: results ?? [] };
  });

export const deleteSuite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prompt_suites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSuite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SuiteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("prompt_suites")
      .insert({
        owner_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        system_prompt: data.system_prompt ?? null,
        models: data.models as never,
        cases: data.cases as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

// --- Similarity: token Jaccard, robust enough for regression deltas ---
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}
function jaccard(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = tokenize(a),
    B = tokenize(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

const JudgeSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("How well the output answers the input and matches the expected behavior."),
  rationale: z.string().max(400),
  matches_expected: z.boolean(),
});

export const runSuite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { suite_id: string }) => z.object({ suite_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing OPENAI_API_KEY.");

    const { data: suite, error: serr } = await context.supabase
      .from("prompt_suites")
      .select("*")
      .eq("id", data.suite_id)
      .maybeSingle();
    if (serr) throw new Error(serr.message);
    if (!suite) throw new Error("Suite not found");

    const cases = (suite.cases ?? []) as Array<{ name: string; input: string; expected?: string }>;
    const models = (suite.models ?? []) as string[];
    if (cases.length === 0 || models.length === 0) throw new Error("Suite has no cases or models");

    const gateway = createAiGatewayProvider(key);

    const { data: run, error: rerr } = await context.supabase
      .from("prompt_runs")
      .insert({ owner_id: context.userId, suite_id: suite.id, status: "running" })
      .select("id")
      .single();
    if (rerr) throw new Error(rerr.message);

    const judgeModel = "meta/llama-3.1-70b-instruct";
    const rows: Array<{
      run_id: string;
      owner_id: string;
      case_name: string;
      model: string;
      output: string | null;
      expected: string | null;
      latency_ms: number | null;
      similarity: number | null;
      judge_score: number | null;
      tokens: number | null;
      cost: number | null;
      metadata: Record<string, unknown>;
    }> = [];

    for (const c of cases) {
      for (const model of models) {
        const t0 = Date.now();
        try {
          const gen = await generateText({
            model: gateway(model),
            system: suite.system_prompt ?? undefined,
            prompt: c.input,
          });
          const latency = Date.now() - t0;
          const output = gen.text ?? "";
          const sim = c.expected ? jaccard(output, c.expected) * 100 : 0;

          let judgeScore: number | null = null;
          let judgeRationale = "";
          let matches = false;
          try {
            const j = await generateText({
              model: gateway(judgeModel),
              output: Output.object({ schema: JudgeSchema }),
              system:
                "You are an impartial LLM judge. Score 0-100 how well the candidate output addresses the input and aligns with the expected behavior (if provided). Be strict and concise. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (\`\`\`json) or any conversational text.",
              prompt:
                `Input:\n${c.input}\n\n` +
                (c.expected ? `Expected behavior:\n${c.expected}\n\n` : "") +
                `Candidate output:\n${output}`,
            });
            const parsed = j.output as z.infer<typeof JudgeSchema>;
            judgeScore = parsed.score;
            judgeRationale = parsed.rationale;
            matches = parsed.matches_expected;
          } catch (e) {
            judgeRationale = `judge unavailable: ${(e as Error).message}`;
          }

          rows.push({
            run_id: run.id,
            owner_id: context.userId,
            case_name: c.name,
            model,
            output,
            expected: c.expected ?? null,
            latency_ms: latency,
            similarity: c.expected ? sim : null,
            judge_score: judgeScore,
            tokens: gen.usage?.totalTokens ?? null,
            cost: null,
            metadata: { rationale: judgeRationale, matches_expected: matches },
          });
        } catch (e) {
          rows.push({
            run_id: run.id,
            owner_id: context.userId,
            case_name: c.name,
            model,
            output: null,
            expected: c.expected ?? null,
            latency_ms: Date.now() - t0,
            similarity: null,
            judge_score: null,
            tokens: null,
            cost: null,
            metadata: { error: (e as Error).message },
          });
        }
      }
    }

    await context.supabase.from("prompt_results").insert(rows as never);

    // Per-model leaderboard summary
    const perModel: Record<
      string,
      {
        count: number;
        judge_total: number;
        judge_n: number;
        sim_total: number;
        sim_n: number;
        latency_total: number;
        errors: number;
      }
    > = {};
    for (const r of rows) {
      const m = (perModel[r.model] ||= {
        count: 0,
        judge_total: 0,
        judge_n: 0,
        sim_total: 0,
        sim_n: 0,
        latency_total: 0,
        errors: 0,
      });
      m.count++;
      if (r.judge_score != null) {
        m.judge_total += r.judge_score;
        m.judge_n++;
      }
      if (r.similarity != null) {
        m.sim_total += r.similarity;
        m.sim_n++;
      }
      if (r.latency_ms != null) m.latency_total += r.latency_ms;
      if (r.output == null) m.errors++;
    }
    const leaderboard = Object.entries(perModel)
      .map(([model, m]) => ({
        model,
        avg_judge: m.judge_n ? Math.round(m.judge_total / m.judge_n) : null,
        avg_similarity: m.sim_n ? Math.round(m.sim_total / m.sim_n) : null,
        avg_latency_ms: m.count ? Math.round(m.latency_total / m.count) : null,
        errors: m.errors,
        count: m.count,
      }))
      .sort((a, b) => (b.avg_judge ?? 0) - (a.avg_judge ?? 0));

    const summary = {
      total: rows.length,
      models: models.length,
      cases: cases.length,
      errors: rows.filter((r) => r.output == null).length,
      leaderboard,
    };

    await context.supabase
      .from("prompt_runs")
      .update({ status: "completed", summary: summary as never })
      .eq("id", run.id);

    await context.supabase.from("activities").insert({
      user_id: context.userId,
      app: "prompts",
      action: "ran_suite",
      entity_id: suite.id,
      meta: { run_id: run.id, total: rows.length },
    });

    return { runId: run.id };
  });
