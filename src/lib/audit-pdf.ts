import { jsPDF } from "jspdf";

type ReportContent = {
  executive_summary?: string;
  overall_risk?: string;
  governance_score?: number;
  sections?: Record<string, string>;
  findings?: Array<{
    title: string;
    severity: string;
    category: string;
    evidence: string;
    recommendation: string;
  }>;
  compliance?: Array<{ framework: string; status: string; notes: string }>;
  sign_off_checklist?: string[];
};

const RISK_COLORS: Record<string, [number, number, number]> = {
  low: [16, 185, 129],
  medium: [245, 158, 11],
  high: [249, 115, 22],
  critical: [225, 29, 72],
};

export function buildAuditPdf(name: string, systemName: string | null, c: ReportContent) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const CW = W - M * 2;
  let y = M;

  const ensure = (need: number) => {
    if (y + need > H - M) {
      addFooter();
      doc.addPage();
      y = M;
    }
  };

  const text = (
    str: string,
    size: number,
    opts: { bold?: boolean; color?: [number, number, number]; lh?: number } = {},
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [24, 24, 27]));
    const lh = opts.lh ?? size * 1.35;
    const lines = doc.splitTextToSize(str || "", CW);
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M, y);
      y += lh;
    }
  };

  const rule = () => {
    ensure(12);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 12;
  };

  const pillBox = (label: string, rgb: [number, number, number]) => {
    const padX = 8,
      padY = 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const w = doc.getTextWidth(label) + padX * 2;
    const h = 16;
    ensure(h + 6);
    doc.setFillColor(...rgb);
    doc.roundedRect(M, y, w, h, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, M + padX, y + h - padY - 1);
    y += h + 10;
  };

  let pageNo = 0;
  const addFooter = () => {
    pageNo += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text("ML Inspector AI · Confidential — Boardroom Audit", M, H - 28);
    doc.text(`Page ${pageNo}`, W - M, H - 28, { align: "right" });
  };

  // Cover
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, W, 180, "F");
  doc.setTextColor(99, 102, 241);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AI PRODUCT AUDIT REPORT", M, 70);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(24);
  doc.text(doc.splitTextToSize(name, CW), M, 100);
  if (systemName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`System: ${systemName}`, M, 140);
  }
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text(new Date().toLocaleString(), M, 162);
  y = 210;

  // Risk pill + governance
  const risk = (c.overall_risk ?? "medium").toLowerCase();
  pillBox(`Overall risk: ${risk.toUpperCase()}`, RISK_COLORS[risk] ?? [100, 116, 139]);
  text(`Governance score: ${Math.round(c.governance_score ?? 0)} / 100`, 11, { bold: true });
  y += 8;
  rule();

  text("Executive summary", 14, { bold: true, color: [15, 23, 42] });
  y += 2;
  text(c.executive_summary ?? "—", 10.5, { color: [55, 65, 81] });
  y += 8;

  if (c.sections) {
    for (const [k, v] of Object.entries(c.sections)) {
      rule();
      text(
        k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        13,
        { bold: true, color: [15, 23, 42] },
      );
      y += 2;
      text(String(v ?? "—"), 10.5, { color: [55, 65, 81] });
      y += 6;
    }
  }

  if (c.findings?.length) {
    rule();
    text("Findings", 14, { bold: true, color: [15, 23, 42] });
    y += 4;
    c.findings.forEach((f, i) => {
      ensure(60);
      const rgb = RISK_COLORS[(f.severity || "medium").toLowerCase()] ?? [100, 116, 139];
      doc.setFillColor(...rgb);
      doc.circle(M + 3, y - 3, 3, "F");
      doc.setTextColor(...rgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${(f.severity || "").toUpperCase()} · ${f.category || ""}`, M + 12, y);
      y += 12;
      text(`${i + 1}. ${f.title}`, 11.5, { bold: true });
      text(`Evidence: ${f.evidence}`, 10, { color: [75, 85, 99] });
      text(`Recommendation: ${f.recommendation}`, 10, { color: [55, 65, 81] });
      y += 6;
    });
  }

  if (c.compliance?.length) {
    rule();
    text("Compliance alignment", 14, { bold: true, color: [15, 23, 42] });
    y += 4;
    c.compliance.forEach((cp) => {
      text(`${cp.framework} — ${cp.status}`, 11, { bold: true });
      text(cp.notes ?? "", 10, { color: [75, 85, 99] });
      y += 4;
    });
  }

  if (c.sign_off_checklist?.length) {
    rule();
    text("Board sign-off checklist", 14, { bold: true, color: [15, 23, 42] });
    y += 4;
    c.sign_off_checklist.forEach((s) => {
      ensure(16);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.8);
      doc.rect(M, y - 9, 10, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(s, CW - 18);
      doc.text(lines, M + 18, y);
      y += lines.length * 14 + 4;
    });
  }

  addFooter();
  return doc;
}

export function downloadAuditPdf(name: string, systemName: string | null, c: ReportContent) {
  const doc = buildAuditPdf(name, systemName, c);
  doc.save(`${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

export function previewAuditPdfUrl(name: string, systemName: string | null, c: ReportContent) {
  const doc = buildAuditPdf(name, systemName, c);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

export function auditPdfFileName(name: string) {
  return `${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
}

export function downloadBlobAsPdf(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
