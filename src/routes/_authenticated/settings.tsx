import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Settings as SettingsIcon,
  LogOut,
  Download,
  FileJson,
  FileText as FileTextIcon,
  Loader2,
  Package,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { exportAllData, exportTable } from "@/lib/export.functions";
import { SmokeTest } from "@/components/SmokeTest";
import { RlsRegressionCheck } from "@/components/RlsRegressionCheck";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});

const TABLES = [
  { key: "experiment_runs", label: "Experiment runs" },
  { key: "dataset_audits", label: "Dataset audits" },
  { key: "rag_sessions", label: "RAG sessions" },
  { key: "model_cards", label: "Model cards" },
  { key: "prompt_suites", label: "Prompt suites" },
  { key: "benchmarks", label: "Benchmarks" },
  { key: "benchmark_runs", label: "Benchmark runs" },
  { key: "audit_log", label: "Audit log" },
] as const;

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const exportAll = useServerFn(exportAllData);
  const exportOne = useServerFn(exportTable);
  const [exporting, setExporting] = useState<string | null>(null);
  const [bundleFormat, setBundleFormat] = useState<"json" | "csv">("json");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(TABLES.map((t) => t.key)));

  const allSelected = selected.size === TABLES.length;

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });
  const [name, setName] = useState("");
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile]);

  async function save() {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleExportAll() {
    setExporting("all");
    try {
      const result = await exportAll();
      download(
        `ml-inspector-export-${Date.now()}.json`,
        JSON.stringify(result, null, 2),
        "application/json",
      );
      toast.success("Workspace exported");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportOne(table: string, format: "json" | "csv") {
    setExporting(`${table}-${format}`);
    try {
      const result = await exportOne({ data: { table: table as any, format } });
      download(`${table}.${result.ext}`, result.content, result.mime);
      toast.success(`Exported ${table}`);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function handleBundleExport() {
    if (selected.size === 0) return toast.error("Pick at least one table");
    setExporting("bundle");
    try {
      const keys = Array.from(selected);
      const results = await Promise.all(
        keys.map((k) => exportOne({ data: { table: k as any, format: bundleFormat } })),
      );
      if (bundleFormat === "json") {
        const merged = Object.fromEntries(
          keys.map((k, i) => [k, JSON.parse(results[i].content || "[]")]),
        );
        download(
          `ml-inspector-bundle-${Date.now()}.json`,
          JSON.stringify({ exported_at: new Date().toISOString(), tables: merged }, null, 2),
          "application/json",
        );
      } else {
        // Concatenated CSV with section headers
        const parts = keys.map((k, i) => `# ${k}\n${results[i].content}`);
        download(`ml-inspector-bundle-${Date.now()}.csv`, parts.join("\n\n"), "text/csv");
      }
      toast.success(`Exported ${keys.length} tables`);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  function toggle(key: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  function resetTour() {
    localStorage.removeItem("mli_tour_v1");
    toast.success("Tour will replay on next refresh");
  }

  return (
    <>
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your profile, exports, and workspace."
      />
      <PageBody>
        <div className="grid gap-6">
          <div className="card-elevated max-w-2xl p-6">
            <h3 className="text-base font-semibold tracking-tight">Profile</h3>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button onClick={save} className="rounded-full">
                Save changes
              </Button>
            </div>
          </div>

          <div className="card-elevated max-w-2xl p-6">
            <h3 className="text-base font-semibold tracking-tight">Data export</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Download a custom bundle, the full workspace, or any single dataset.
            </p>

            <div className="mt-5 rounded-xl border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" /> Custom bundle
                </div>
                <div className="flex items-center gap-1 rounded-full border bg-background p-0.5 text-xs">
                  {(["json", "csv"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setBundleFormat(f)}
                      className={`rounded-full px-2.5 py-1 transition ${bundleFormat === f ? "bg-primary text-primary-foreground" : "text-ink-soft"}`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
                <button
                  onClick={() =>
                    setSelected(allSelected ? new Set() : new Set(TABLES.map((t) => t.key)))
                  }
                  className="rounded-full border bg-background px-2.5 py-1 transition hover:bg-secondary"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
                <span>
                  {selected.size} of {TABLES.length} selected
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {TABLES.map((t) => (
                  <label
                    key={t.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-secondary"
                  >
                    <Checkbox checked={selected.has(t.key)} onCheckedChange={() => toggle(t.key)} />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleBundleExport}
                disabled={exporting === "bundle" || selected.size === 0}
                className="mt-4 w-full rounded-full"
              >
                {exporting === "bundle" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                Download bundle
              </Button>
            </div>

            <Button
              onClick={handleExportAll}
              disabled={exporting === "all"}
              variant="outline"
              className="mt-4 rounded-full"
            >
              {exporting === "all" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Full workspace snapshot (JSON)
            </Button>

            <div className="mt-6 divide-y rounded-xl border bg-surface">
              {TABLES.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium">{t.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleExportOne(t.key, "csv")}
                      disabled={exporting === `${t.key}-csv`}
                      className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                    >
                      {exporting === `${t.key}-csv` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileTextIcon className="h-3 w-3" />
                      )}
                      CSV
                    </button>
                    <button
                      onClick={() => handleExportOne(t.key, "json")}
                      disabled={exporting === `${t.key}-json`}
                      className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                    >
                      {exporting === `${t.key}-json` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileJson className="h-3 w-3" />
                      )}
                      JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SmokeTest />

          <RlsRegressionCheck />

          <div className="card-elevated max-w-2xl p-6">
            <h3 className="text-base font-semibold tracking-tight">Onboarding</h3>
            <p className="mt-1 text-sm text-ink-soft">Replay the welcome tour at any time.</p>
            <Button onClick={resetTour} variant="outline" className="mt-4 rounded-full">
              Replay tour
            </Button>
          </div>

          <div className="card-elevated max-w-2xl p-6">
            <h3 className="text-base font-semibold tracking-tight">Session</h3>
            <p className="mt-1 text-sm text-ink-soft">Sign out of this workspace on this device.</p>
            <Button onClick={signOut} variant="outline" className="mt-4 rounded-full">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
