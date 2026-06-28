import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const Task = z.object({
  id: z.string(),
  prompt: z.string().min(1),
  reference: z.string().optional().default(""),
  category: z.string().optional().default("general"),
});

const ResultSchema = z.object({
  scores: z.array(
    z.object({
      model: z.string(),
      task_id: z.string(),
      score: z.number().min(0).max(100),
      rationale: z.string(),
    }),
  ),
  leaderboard: z.array(
    z.object({
      model: z.string(),
      avg_score: z.number(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      rank: z.number(),
    }),
  ),
  summary: z.string(),
});

const ImportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("general"),
  models: z.array(z.string()).min(1),
  metrics: z.array(z.string()).default([]),
  tasks: z.array(Task).min(1),
});

export const listBenchmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("benchmarks")
      .select(
        "id, name, description, category, status, tasks, models, is_public, share_token, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBenchmark = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: bench } = await context.supabase
      .from("benchmarks")
      .select("*")
      .eq("id", data.id)
      .single();
    const { data: runs } = await context.supabase
      .from("benchmark_runs")
      .select("id, status, summary, duration_ms, created_at")
      .eq("benchmark_id", data.id)
      .order("created_at", { ascending: false });
    return { benchmark: bench, runs: runs ?? [] };
  });

export const getBenchmarkRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("benchmark_runs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return run;
  });

export const createBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      name: string;
      description?: string;
      category: string;
      tasks: Array<{ id: string; prompt: string; reference?: string; category?: string }>;
      models: string[];
      metrics: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("benchmarks")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        tasks: data.tasks,
        models: data.models,
        metrics: data.metrics,
        status: "ready",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "create",
      entity_type: "benchmark",
      entity_id: row.id,
      entity_label: row.name,
    });
    return row;
  });

export const importBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { payload: unknown }) => d)
  .handler(async ({ data, context }) => {
    const parsed = ImportSchema.parse(data.payload);
    const { data: row, error } = await context.supabase
      .from("benchmarks")
      .insert({
        user_id: context.userId,
        name: parsed.name,
        description: parsed.description ?? null,
        category: parsed.category,
        tasks: parsed.tasks,
        models: parsed.models,
        metrics: parsed.metrics,
        status: "ready",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "import",
      entity_type: "benchmark",
      entity_id: row.id,
      entity_label: row.name,
      changes: { task_count: parsed.tasks.length, model_count: parsed.models.length } as any,
    });
    return row;
  });

export const deleteBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("benchmarks")
      .select("name")
      .eq("id", data.id)
      .single();
    const { error } = await context.supabase.from("benchmarks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "delete",
      entity_type: "benchmark",
      entity_id: data.id,
      entity_label: row?.name ?? null,
    });
    return { ok: true };
  });

export const shareBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const patch: { is_public: boolean; share_token: string | null } = data.enabled
      ? { is_public: true, share_token: crypto.randomUUID().replace(/-/g, "") }
      : { is_public: false, share_token: null };
    const { data: row, error } = await context.supabase
      .from("benchmarks")
      .update(patch)
      .eq("id", data.id)
      .select("id, name, is_public, share_token")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: data.enabled ? "share" : "unshare",
      entity_type: "benchmark",
      entity_id: row.id,
      entity_label: row.name,
    });
    return row;
  });

export const runBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const t0 = Date.now();
    const { data: bench, error } = await context.supabase
      .from("benchmarks")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !bench) throw new Error("Benchmark not found");

    const apiKey = process.env.OPENAI_API_KEY!;
    const provider = createAiGatewayProvider(apiKey);
    const judge = provider.chatModel("meta/llama-3.1-70b-instruct");

    const tasks = (bench.tasks as any[]).map((t) => Task.parse(t));
    const models: string[] = bench.models as string[];

    const prompt = `You are evaluating ${models.length} AI models on a benchmark suite of ${tasks.length} tasks.

Benchmark: ${bench.name}
Category: ${bench.category}
Metrics requested: ${(bench.metrics as string[]).join(", ") || "quality, correctness, helpfulness"}

Models under evaluation: ${models.join(", ")}

Tasks:
${tasks.map((t, i) => `${i + 1}. [${t.id}] (${t.category}) ${t.prompt}${t.reference ? `\n   Reference: ${t.reference}` : ""}`).join("\n")}

Simulate plausible responses for each model on each task based on their known capabilities, then score each (0-100) against the reference and produce a ranked leaderboard with strengths and weaknesses per model. Be calibrated and realistic.

IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (\`\`\`json) or any conversational text.`;

    const result = await generateText({
      model: judge,
      prompt,
      output: Output.object({ schema: ResultSchema }),
    });
    const resultData = result.output as z.infer<typeof ResultSchema>;

    const duration_ms = Date.now() - t0;
    const { data: run, error: runErr } = await context.supabase
      .from("benchmark_runs")
      .insert({
        user_id: context.userId,
        benchmark_id: bench.id,
        status: "completed",
        summary: { summary: resultData.summary, models, task_count: tasks.length } as any,
        results: resultData.scores as any,
        leaderboard: resultData.leaderboard as any,
        duration_ms,
      })
      .select()
      .single();
    if (runErr) throw new Error(runErr.message);

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "run",
      entity_type: "benchmark",
      entity_id: bench.id,
      entity_label: bench.name,
      changes: { run_id: run.id, duration_ms } as any,
    });

    const winner = resultData.leaderboard[0];
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      kind: "benchmark_run",
      title: `Benchmark "${bench.name}" finished`,
      body: winner
        ? `${winner.model} ranked #1 with avg ${Math.round(winner.avg_score)} across ${tasks.length} tasks.`
        : `Run completed in ${duration_ms}ms across ${models.length} models.`,
      link: `/benchmarks/${bench.id}/runs/${run.id}`,
    });

    return run;
  });

// Public (no-auth) accessor for shared benchmarks
export const getSharedBenchmark = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: bench } = await sb
      .from("benchmarks")
      .select(
        "id, name, description, category, tasks, models, metrics, created_at, is_public, share_token",
      )
      .eq("share_token", data.token)
      .eq("is_public", true)
      .maybeSingle();
    if (!bench) return { benchmark: null, runs: [] as any[] };
    const { data: runs } = await sb
      .from("benchmark_runs")
      .select("id, status, summary, results, leaderboard, duration_ms, created_at")
      .eq("benchmark_id", bench.id)
      .order("created_at", { ascending: false });
    return { benchmark: bench, runs: runs ?? [] };
  });
