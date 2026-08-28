import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-chrome-border bg-chrome-surface p-5 shadow-card",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-chrome-muted">
        {label}
      </span>
      <span className="text-2xl font-semibold text-chrome-text">{value}</span>
      {hint ? <span className="text-xs text-chrome-muted">{hint}</span> : null}
    </Card>
  );
}
