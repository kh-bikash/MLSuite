import { useRouterState } from "@tanstack/react-router";

export type RoutePreset = {
  level: "subtle" | "balanced" | "immersive";
  duration: number;
  y: number;
  ease: [number, number, number, number];
  stagger: number;
  showOrb: boolean;
  orbHeight: number;
};

const PRESETS: Record<RoutePreset["level"], Omit<RoutePreset, "level">> = {
  subtle: {
    duration: 0.18,
    y: 4,
    ease: [0.4, 0, 0.2, 1],
    stagger: 0.02,
    showOrb: false,
    orbHeight: 0,
  },
  balanced: {
    duration: 0.28,
    y: 8,
    ease: [0.22, 1, 0.36, 1],
    stagger: 0.04,
    showOrb: false,
    orbHeight: 0,
  },
  immersive: {
    duration: 0.45,
    y: 16,
    ease: [0.16, 1, 0.3, 1],
    stagger: 0.07,
    showOrb: true,
    orbHeight: 320,
  },
};

/** Map a pathname to its animation preset level. */
export function presetForPath(pathname: string): RoutePreset {
  const subtle = ["/audit", "/settings", "/notifications", "/reports"];
  const immersive = ["/dashboard", "/share"];

  if (immersive.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return { level: "immersive", ...PRESETS.immersive };
  }
  if (subtle.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return { level: "subtle", ...PRESETS.subtle };
  }
  // Detail pages (/foo/$id) are calmer than list/new pages
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[1] !== "new") {
    return { level: "subtle", ...PRESETS.subtle };
  }
  return { level: "balanced", ...PRESETS.balanced };
}

export function useRoutePreset(): RoutePreset {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return presetForPath(pathname);
}
