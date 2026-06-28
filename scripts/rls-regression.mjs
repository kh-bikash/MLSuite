#!/usr/bin/env node
/**
 * RLS regression check — CI guard.
 *
 * For each user-owned table, sign in as a freshly-provisioned test user
 * (who owns no data) and query the table through the anon Data API.
 * Any row returned means RLS is not isolating rows by user_id → fail CI.
 *
 * Required env (set as GitHub Actions secrets):
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY  (or SUPABASE_ANON_KEY)
 *   SUPABASE_SERVICE_ROLE_KEY (used only to mint + delete the throwaway user)
 *
 * Exit codes: 0 pass · 1 fail (any leak or query error) · 2 misconfigured env.
 */
import { createClient } from "@supabase/supabase-js";
import { appendFileSync } from "node:fs";

function writeJobSummary(failedIssues, passedCount) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const server = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const runId = process.env.GITHUB_RUN_ID || "";
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "";
  const jobLogUrl =
    repo && runId
      ? `${server}/${repo}/actions/runs/${runId}${runAttempt ? `/attempts/${runAttempt}` : ""}`
      : "";

  const lines = ["# RLS regression"];
  if (failedIssues.length === 0) {
    lines.push("", `✅ All ${passedCount} user-owned tables isolated correctly.`);
  } else {
    lines.push(
      "",
      `❌ **${failedIssues.length} failing table${failedIssues.length === 1 ? "" : "s"}** · ${passedCount} passed`,
      "",
      "| Table | Error |",
      "| --- | --- |",
      ...failedIssues.map(
        (i) => `| \`${i.table}\` | ${String(i.reason).replace(/\|/g, "\\|").replace(/\n/g, " ")} |`,
      ),
    );
    if (jobLogUrl) {
      lines.push("", `📜 [View full script output logs](${jobLogUrl})`);
    }
  }
  lines.push("");
  appendFileSync(summaryPath, lines.join("\n"));
}

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("✗ Missing env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const TABLES = [
  "projects",
  "experiment_runs",
  "dataset_audits",
  "rag_sessions",
  "model_cards",
  "prompt_suites",
  "prompt_runs",
  "benchmarks",
  "benchmark_runs",
  "chunking_sims",
  "embedding_compares",
  "cost_estimates",
  "finetune_checks",
  "audit_reports",
  "notifications",
  "reports",
  "activities",
  "audit_log",
];

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `rls-probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@lovable.test`;
const password = crypto.randomUUID() + "Aa1!";

console.log(`→ Creating throwaway probe user ${email}`);
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr || !created.user) {
  console.error("✗ Could not create probe user:", createErr?.message);
  process.exit(2);
}
const userId = created.user.id;

const client = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error("✗ Probe sign-in failed:", signInErr.message);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  process.exit(2);
}

const DEBUG = /^(1|true|verbose|debug)$/i.test(
  process.env.RLS_DEBUG || process.env.RUNNER_DEBUG || "",
);
const annotate = (table, reason) => {
  // GitHub Actions check annotation — surfaces inline on the PR Checks tab.
  console.log(`::error title=RLS leak: ${table}::${String(reason).replace(/\r?\n/g, " ")}`);
};

const debug = (...args) => {
  if (DEBUG) console.log("  ·", ...args);
};

let failed = 0;
let passed = 0;
const issues = [];
const probeStart = Date.now();

if (DEBUG) {
  console.log("::group::Debug context");
  console.log(`  probe_user_id=${userId}`);
  console.log(`  tables=${TABLES.length}`);
  console.log(`  supabase_url=${URL}`);
  console.log("::endgroup::");
}

for (const table of TABLES) {
  const t0 = Date.now();
  const { data, error } = await client.from(table).select("user_id").limit(50);
  const ms = Date.now() - t0;
  if (error) {
    if (/permission denied|row-level security/i.test(error.message)) {
      console.log(`  ✓ ${table.padEnd(22)} denied (locked down)  ${ms}ms`);
      passed++;
    } else {
      console.log(`  ✗ ${table.padEnd(22)} error: ${error.message}`);
      annotate(table, `query error: ${error.message}`);
      issues.push({
        table,
        reason: error.message,
        kind: "query_error",
        code: error.code,
        details: error.details,
      });
      failed++;
    }
    continue;
  }
  const leaks = (data ?? []).filter((r) => r.user_id && r.user_id !== userId);
  if (leaks.length > 0) {
    const reason = `${leaks.length} cross-user rows returned`;
    console.log(`  ✗ ${table.padEnd(22)} LEAK: ${reason}`);
    annotate(table, reason);
    issues.push({
      table,
      reason,
      kind: "leak",
      leakCount: leaks.length,
      sample: leaks.slice(0, 3),
    });
    failed++;
  } else {
    console.log(`  ✓ ${table.padEnd(22)} isolated (${data?.length ?? 0} own rows)  ${ms}ms`);
    debug(`${table}: returned ${data?.length ?? 0} rows in ${ms}ms`);
    passed++;
  }
}

// Cleanup
await client.auth.signOut().catch(() => {});
const { error: delErr } = await admin.auth.admin.deleteUser(userId);
if (delErr) console.warn(`! Could not delete probe user ${userId}: ${delErr.message}`);

console.log("");
console.log(`Result: ${passed} passed, ${failed} failed in ${Date.now() - probeStart}ms`);

writeJobSummary(issues, passed);

// Failure artifact — uploaded by the workflow when present.
if (failed > 0) {
  try {
    const artifactPath = process.env.RLS_FAILURE_ARTIFACT || "rls-regression-failures.json";
    const payload = {
      generatedAt: new Date().toISOString(),
      probeUserId: userId,
      passed,
      failed,
      issues,
      env: {
        repo: process.env.GITHUB_REPOSITORY || null,
        runId: process.env.GITHUB_RUN_ID || null,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
        sha: process.env.GITHUB_SHA || null,
        ref: process.env.GITHUB_REF || null,
      },
    };
    appendFileSync(artifactPath, JSON.stringify(payload, null, 2));
    console.log(`! Wrote failure artifact → ${artifactPath}`);
  } catch (e) {
    console.warn(`! Could not write failure artifact: ${e.message}`);
  }
  console.error("");
  console.error("RLS regression FAILED — merge blocked.");
  for (const i of issues) console.error(`  • ${i.table}: ${i.reason}`);
  process.exit(1);
}
console.log("RLS regression passed.");
process.exit(0);
