import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
