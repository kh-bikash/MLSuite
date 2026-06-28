import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (
      d: {
        search?: string;
        action?: string | null;
        entity_type?: string | null;
        since?: string | null;
        limit?: number;
      } = {},
    ) => d,
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 300, 500));
    if (data.action) q = q.eq("action", data.action);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    if (data.since) q = q.gte("created_at", data.since);
    if (data.search && data.search.trim()) {
      const s = data.search.trim().replace(/[,()]/g, " ");
      q = q.or(`entity_label.ilike.%${s}%,entity_type.ilike.%${s}%,action.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const auditFacets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("audit_log")
      .select("action, entity_type")
      .order("created_at", { ascending: false })
      .limit(500);
    const actions = Array.from(new Set((data ?? []).map((r: any) => r.action))).sort();
    const entities = Array.from(new Set((data ?? []).map((r: any) => r.entity_type))).sort();
    return { actions, entities };
  });

export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      action: string;
      entity_type: string;
      entity_id?: string;
      entity_label?: string;
      changes?: Record<string, unknown>;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id ?? null,
      entity_label: data.entity_label ?? null,
      changes: (data.changes ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
