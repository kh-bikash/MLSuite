import { useMotionSettings, type MotionMode } from "./MotionSettings";
import { Gauge, Sparkles, ZapOff, Cpu, CpuIcon } from "lucide-react";

export function MotionToggle({ compact = false }: { compact?: boolean }) {
  const { motion, webgl, webglSupported, setMotion, setWebgl } = useMotionSettings();
  const modes: { id: MotionMode; label: string; icon: typeof Sparkles }[] = [
    { id: "full", label: "Full", icon: Sparkles },
    { id: "reduced", label: "Calm", icon: Gauge },
    { id: "off", label: "Off", icon: ZapOff },
  ];
  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "card-elevated p-3"}`}>
      <div className="flex items-center gap-1 rounded-full border bg-surface p-0.5 text-xs">
        {modes.map((m) => {
          const active = motion === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMotion(m.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1 transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-elegant"
                  : "text-ink-soft hover:text-foreground"
              }`}
              title={`Motion: ${m.label}`}
            >
              <m.icon className="h-3 w-3" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setWebgl(webgl === "auto" ? "off" : "auto")}
        disabled={!webglSupported}
        className="flex items-center justify-between rounded-full border bg-surface px-2.5 py-1 text-xs text-ink-soft transition hover:text-foreground disabled:opacity-50"
        title={webglSupported ? "Toggle WebGL effects" : "WebGL unavailable"}
      >
        <span className="flex items-center gap-1.5">
          {webgl === "auto" ? <Cpu className="h-3 w-3" /> : <CpuIcon className="h-3 w-3" />}
          WebGL
        </span>
        <span className="font-medium">
          {!webglSupported ? "Unsupported" : webgl === "auto" ? "On" : "Off"}
        </span>
      </button>
    </div>
  );
}
