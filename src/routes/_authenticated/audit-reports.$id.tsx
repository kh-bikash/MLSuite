import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  Download,
  FileText,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getReport } from "@/lib/audit-reports.functions";
import { ReportSection, MetricBadge } from "@/components/ReportBits";
import { previewAuditPdfUrl, auditPdfFileName, downloadBlobAsPdf } from "@/lib/audit-pdf";

export const Route = createFileRoute("/_authenticated/audit-reports/$id")({
  head: () => ({ meta: [{ title: "AI Audit Report" }] }),
  component: Page,
});

const riskTone: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};
const sevTone: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
};

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const get = useServerFn(getReport);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-report", id],
    queryFn: () => get({ data: { id } }),
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ZOOM_KEY = "mli_audit_pdf_zoom";
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const raw = window.localStorage.getItem(ZOOM_KEY);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) && n >= 0.5 && n <= 2 ? n : 1;
  });
  const [exportStatus, setExportStatus] = useState<
    "idle" | "rendering" | "saving" | "done" | "error"
  >("idle");

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Keyboard navigation while the preview dialog is open: +/= zoom in, -/_ zoom out, 0 reset, d download
  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if ((e.key === "+" || e.key === "=") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        zoomIn();
      } else if ((e.key === "-" || e.key === "_") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      } else if ((e.key === "d" || e.key === "D") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        exportPdf();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, previewUrl, zoom]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading report</span>
      </div>
    );
  if (!data) return null;
  const c = (data as any).content || {};
  const fileName = auditPdfFileName(data.name);

  function download() {
    const md = renderMarkdown(data.name, data.system_name, c);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/[^a-z0-9]+/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generatePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setExportStatus("rendering");
    const url = previewAuditPdfUrl(data.name, data.system_name, c);
    setPreviewUrl(url);
    setExportStatus("idle");
    return url;
  }

  function openPreview() {
    generatePreview();
    setPreviewOpen(true);
  }

  function exportPdf() {
    try {
      setExportStatus("rendering");
      const url = previewUrl ?? previewAuditPdfUrl(data.name, data.system_name, c);
      if (!previewUrl) setPreviewUrl(url);
      setExportStatus("saving");
      downloadBlobAsPdf(url, fileName);
      setExportStatus("done");
      window.setTimeout(() => setExportStatus("idle"), 2400);
    } catch {
      setExportStatus("error");
      window.setTimeout(() => setExportStatus("idle"), 3000);
    }
  }

  const zoomIn = () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const resetZoom = () => setZoom(1);

  const exportLabel =
    exportStatus === "rendering"
      ? "Rendering…"
      : exportStatus === "saving"
        ? "Saving…"
        : exportStatus === "done"
          ? "Saved"
          : exportStatus === "error"
            ? "Failed — retry"
            : "Boardroom PDF";

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title={data.name}
        description={data.system_name ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button
              className="rounded-full"
              onClick={openPreview}
              aria-label={`Preview boardroom PDF for ${data.name} before exporting`}
              aria-haspopup="dialog"
            >
              <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" /> Preview PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={exportPdf}
              disabled={exportStatus === "rendering" || exportStatus === "saving"}
              aria-label={`Download boardroom PDF for ${data.name}. Status: ${exportLabel}`}
              aria-live="polite"
            >
              {exportStatus === "rendering" || exportStatus === "saving" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : exportStatus === "done" ? (
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {exportLabel}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={download}
              aria-label={`Download Markdown for ${data.name}`}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Markdown
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"

              aria-label="Back to audit reports"
              asChild
            >
              <Link to="/audit-reports">
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> Back
              </Link>
            </Button>
          </div>
        }
      />

      <Dialog
        open={previewOpen}
        onOpenChange={(o) => {
          if (!o) closePreview();
          else setPreviewOpen(true);
        }}
      >
        <DialogContent className="max-w-5xl p-0 gap-0" aria-describedby="audit-pdf-preview-desc">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle>Boardroom PDF preview</DialogTitle>
            <DialogDescription id="audit-pdf-preview-desc">
              Verify the rendered report before exporting. Use the zoom controls to inspect details;
              the downloaded PDF matches this preview exactly.
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex items-center justify-between gap-2 border-b bg-surface/40 px-4 py-2"
            role="toolbar"
            aria-label="PDF preview controls — keyboard: plus to zoom in, minus to zoom out, zero to reset, Cmd/Ctrl+D to download"
          >
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                aria-keyshortcuts="-"
                aria-label="Zoom out (minus key)"
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span
                className="min-w-14 text-center text-xs tabular-nums text-ink-soft"
                aria-live="polite"
                aria-atomic="true"
              >
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={zoomIn}
                disabled={zoom >= 2}
                aria-keyshortcuts="+ ="
                aria-label="Zoom in (plus key)"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={resetZoom}
                disabled={zoom === 1}
                aria-keyshortcuts="0"
                aria-label="Reset zoom to 100 percent (zero key)"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span aria-live="polite" aria-atomic="true" className="font-medium">
                {exportStatus !== "idle" ? exportLabel : ""}
              </span>
              <span aria-hidden="true">{fileName}</span>
            </div>
          </div>

          <div
            className="h-[70vh] overflow-auto bg-secondary/30"
            tabIndex={0}
            aria-label={`PDF preview viewport for ${data.name}, zoom ${Math.round(zoom * 100)} percent`}
          >
            {previewUrl ? (
              <div
                style={{
                  width: `${100 / zoom}%`,
                  height: `${100 / zoom}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  src={previewUrl}
                  title={`PDF preview for ${data.name}`}
                  className="h-full w-full border-0"
                />
              </div>
            ) : (
              <div
                className="flex h-full items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Rendering preview</span>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={closePreview}
              aria-label="Close preview dialog"
            >
              Close
            </Button>
            <Button
              className="rounded-full"
              onClick={exportPdf}
              disabled={exportStatus === "rendering" || exportStatus === "saving"}
              aria-label={`Download the previewed PDF as ${fileName}. Status: ${exportLabel}`}
              aria-keyshortcuts="Meta+D Control+D"
            >
              {exportStatus === "rendering" || exportStatus === "saving" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : exportStatus === "done" ? (
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {exportStatus === "idle" ? "Download PDF" : exportLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageBody>
        <div className="grid gap-5">
          <ReportSection title="Executive summary">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={`rounded-full ${riskTone[c.overall_risk] ?? ""}`}>
                Overall risk: {c.overall_risk}
              </Badge>
              <MetricBadge
                label="Governance"
                value={`${Math.round(c.governance_score ?? 0)}/100`}
              />
            </div>
            <p className="text-sm leading-relaxed text-foreground">{c.executive_summary}</p>
          </ReportSection>

          {c.sections &&
            Object.entries(c.sections).map(([k, v]: [string, any]) => (
              <ReportSection
                key={k}
                title={k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{v}</p>
              </ReportSection>
            ))}

          <ReportSection title="Findings">
            <div className="grid gap-2">
              {(c.findings || []).map((f: any, i: number) => (
                <div key={i} className="rounded-lg border bg-surface/40 p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`rounded-full ${sevTone[f.severity] ?? ""}`}
                    >
                      {f.severity}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {f.category}
                    </Badge>
                    <div className="text-sm font-medium">{f.title}</div>
                  </div>
                  <div className="mt-2 text-xs text-ink-soft">
                    <span className="font-medium text-foreground">Evidence:</span> {f.evidence}
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    <span className="font-medium text-foreground">Recommendation:</span>{" "}
                    {f.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>

          {(c.compliance || []).length > 0 && (
            <ReportSection title="Compliance alignment">
              <div className="grid gap-2">
                {c.compliance.map((cp: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-surface/40 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{cp.framework}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">{cp.notes}</div>
                    </div>
                    <Badge variant="outline" className="rounded-full shrink-0">
                      {cp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          <ReportSection title="Sign-off checklist">
            <ul className="grid gap-1.5 text-sm">
              {(c.sign_off_checklist || []).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" /> {s}
                </li>
              ))}
            </ul>
          </ReportSection>
        </div>
      </PageBody>
    </>
  );
}

function renderMarkdown(name: string, system: string | null, c: any) {
  const fnLines = (c.findings || [])
    .map(
      (f: any) =>
        `### ${f.title}\n- **Severity:** ${f.severity}\n- **Category:** ${f.category}\n- **Evidence:** ${f.evidence}\n- **Recommendation:** ${f.recommendation}`,
    )
    .join("\n\n");
  const sect = Object.entries(c.sections || {})
    .map(([k, v]) => `## ${k.replace(/_/g, " ")}\n${v}`)
    .join("\n\n");
  return `# ${name}\n${system ? `_System: ${system}_\n\n` : ""}**Overall risk:** ${c.overall_risk}  •  **Governance:** ${c.governance_score}/100\n\n## Executive summary\n${c.executive_summary}\n\n${sect}\n\n## Findings\n${fnLines}\n\n## Sign-off checklist\n${(c.sign_off_checklist || []).map((s: string) => `- [ ] ${s}`).join("\n")}\n`;
}
