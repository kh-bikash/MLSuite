import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { History, Loader2, Search, X, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAuditLog, auditFacets } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit trail" }] }),
  component: AuditPage,
});

const actionColor: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-rose-50 text-rose-700 border-rose-200",
  run: "bg-violet-50 text-violet-700 border-violet-200",
  export: "bg-amber-50 text-amber-700 border-amber-200",
  share: "bg-sky-50 text-sky-700 border-sky-200",
  unshare: "bg-slate-50 text-slate-700 border-slate-200",
  import: "bg-teal-50 text-teal-700 border-teal-200",
};

const RANGES = [
  { id: "all", label: "All", days: null as number | null },
  { id: "1d", label: "24h", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
];

function AuditPage() {
  const list = useServerFn(listAuditLog);
  const facetsFn = useServerFn(auditFacets);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const [entity, setEntity] = useState<string | null>(null);
  const [range, setRange] = useState("all");

  const since = useMemo(() => {
    const r = RANGES.find((x) => x.id === range);
    if (!r?.days) return null;
    return new Date(Date.now() - r.days * 86400_000).toISOString();
  }, [range]);

  const { data: facets } = useQuery({ queryKey: ["audit-facets"], queryFn: () => facetsFn() });
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", search, action, entity, since],
    queryFn: () => list({ data: { search, action, entity_type: entity, since } }),
  });

  function downloadCsv() {
    const rows = data ?? [];
    if (rows.length === 0) return;
    const cols = ["created_at", "action", "entity_type", "entity_label", "entity_id"];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      cols.join(","),
      ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = search || action || entity || range !== "all";

  return (
    <>
      <PageHeader
        icon={History}
        title="Audit trail"
        description="A tamper-evident record of every create, update, run, share, and export across your workspace."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={downloadCsv}
            disabled={!data?.length}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
      <PageBody>
        <div className="card-elevated mb-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label, entity, or action…"
              className="pl-9"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Action
            </span>
            <Chip active={!action} onClick={() => setAction(null)} label="All" />
            {facets?.actions.map((a) => (
              <Chip
                key={a}
                active={action === a}
                onClick={() => setAction(action === a ? null : a)}
                label={a}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Entity
            </span>
            <Chip active={!entity} onClick={() => setEntity(null)} label="All" />
            {facets?.entities.map((e) => (
              <Chip
                key={e}
                active={entity === e}
                onClick={() => setEntity(entity === e ? null : e)}
                label={e}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Range
            </span>
            {RANGES.map((r) => (
              <Chip
                key={r.id}
                active={range === r.id}
                onClick={() => setRange(r.id)}
                label={r.label}
              />
            ))}
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setAction(null);
                  setEntity(null);
                  setRange("all");
                }}
                className="ml-auto inline-flex items-center gap-1 text-xs text-ink-soft transition hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={History}
            title={hasFilters ? "No matches" : "No activity yet"}
            description={
              hasFilters
                ? "Try clearing filters or widening the date range."
                : "Actions you take in the workspace will be recorded here."
            }
          />
        ) : (
          <div className="card-elevated divide-y">
            <AnimatePresence initial={false}>
              {data.map((row: any, i: number) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.008, 0.2) }}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`rounded-full uppercase ${actionColor[row.action] ?? ""}`}
                    >
                      {row.action}
                    </Badge>
                    <span className="font-medium text-foreground">{row.entity_type}</span>
                    {row.entity_label && (
                      <span className="truncate text-ink-soft">· {row.entity_label}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-surface text-ink-soft hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
