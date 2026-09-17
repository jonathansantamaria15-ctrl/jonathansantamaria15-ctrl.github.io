import clsx from "clsx";

type Tone = "neutral" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-chrome-border/50 text-chrome-text",
  success: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  const borderTone: Record<Tone, string> = {
    neutral: "border-chrome-border",
    success: "border-emerald-500/40",
    warning: "border-amber-500/40",
    danger: "border-red-500/40",
  };
  return (
    <div
      role="status"
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm",
        borderTone[tone],
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
