import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b bg-surface/40 px-8 py-7">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-8 py-8">{children}</div>;
}
