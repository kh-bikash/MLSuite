import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

export type MotionMode = "full" | "reduced" | "off";
export type WebglMode = "auto" | "off";

type Ctx = {
  motion: MotionMode;
  webgl: WebglMode;
  webglSupported: boolean;
  setMotion: (m: MotionMode) => void;
  setWebgl: (w: WebglMode) => void;
  effectiveAnimate: boolean; // motion !== off
  effectiveWebgl: boolean; // webgl auto & supported & motion !== off
};

const MotionCtx = createContext<Ctx | null>(null);

function detectWebgl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function MotionSettingsProvider({ children }: { children: ReactNode }) {
  const [motion, setMotionState] = useState<MotionMode>("full");
  const [webgl, setWebglState] = useState<WebglMode>("auto");
  const [webglSupported, setWebglSupported] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sup = detectWebgl();
    setWebglSupported(sup);
    const m = (localStorage.getItem("mli.motion") as MotionMode) || "full";
    const w = (localStorage.getItem("mli.webgl") as WebglMode) || "auto";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setMotionState(reduce && !localStorage.getItem("mli.motion") ? "reduced" : m);
    setWebglState(w);
  }, []);

  const setMotion = (m: MotionMode) => {
    setMotionState(m);
    try {
      localStorage.setItem("mli.motion", m);
    } catch {}
  };
  const setWebgl = (w: WebglMode) => {
    setWebglState(w);
    try {
      localStorage.setItem("mli.webgl", w);
    } catch {}
  };

  const value = useMemo<Ctx>(
    () => ({
      motion,
      webgl,
      webglSupported,
      setMotion,
      setWebgl,
      effectiveAnimate: motion !== "off",
      effectiveWebgl: mounted && webgl === "auto" && webglSupported && motion !== "off",
    }),
    [motion, webgl, webglSupported, mounted],
  );

  const reduced = motion !== "full";

  return (
    <MotionCtx.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </MotionCtx.Provider>
  );
}

export function useMotionSettings() {
  const v = useContext(MotionCtx);
  if (!v) throw new Error("MotionSettingsProvider missing");
  return v;
}
