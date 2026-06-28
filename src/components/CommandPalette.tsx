import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Network,
  FileText,
  FlaskConical,
  Settings,
  Bell,
  Gauge,
  History,
  Scissors,
  Layers,
  DollarSign,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navigate" },
  { to: "/experiments", label: "Experiment Failure Analyst", icon: Activity, group: "Apps" },
  { to: "/datasets", label: "Dataset Bias Auditor", icon: ShieldCheck, group: "Apps" },
  { to: "/rag", label: "RAG Pipeline Debugger", icon: Network, group: "Apps" },
  { to: "/model-cards", label: "Model Card Generator", icon: FileText, group: "Apps" },
  { to: "/prompts", label: "Prompt Regression Tester", icon: FlaskConical, group: "Apps" },
  { to: "/benchmarks", label: "Benchmark Suite", icon: Gauge, group: "Apps" },
  { to: "/chunking", label: "Chunking Strategy Simulator", icon: Scissors, group: "RAG & Models" },
  { to: "/embeddings", label: "Embedding Model Comparator", icon: Layers, group: "RAG & Models" },
  { to: "/costs", label: "LLM Cost Estimator", icon: DollarSign, group: "RAG & Models" },
  {
    to: "/finetune",
    label: "Fine-tuning Readiness Checker",
    icon: GraduationCap,
    group: "RAG & Models",
  },
  {
    to: "/audit-reports",
    label: "AI Product Audit Reports",
    icon: ClipboardCheck,
    group: "RAG & Models",
  },
  { to: "/reports", label: "Reports", icon: FileText, group: "Workspace" },
  { to: "/audit", label: "Audit Trail", icon: History, group: "Workspace" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Workspace" },
  { to: "/settings", label: "Settings", icon: Settings, group: "Workspace" },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to an app, page, or action…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <CommandItem
                  key={i.to}
                  value={i.label}
                  onSelect={() => {
                    navigate({ to: i.to });
                    onOpenChange(false);
                  }}
                >
                  <i.icon className="mr-2 h-4 w-4" />
                  {i.label}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
