import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import type { BusinessTheme } from "@/lib/types";

/**
 * A button styled entirely from theme.button_style + the --tenant-* CSS
 * vars set by ThemeProvider — the same markup renders differently per
 * tenant with zero per-restaurant code.
 */
export function TenantButton({
  buttonStyle = "solid",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { buttonStyle?: BusinessTheme["button_style"] }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-tenant px-4 py-2.5 text-sm font-medium transition-transform active:scale-[0.98] disabled:opacity-50";

  const styleClasses: Record<BusinessTheme["button_style"], string> = {
    solid: "bg-tenant-primary text-white shadow-sm",
    outline: "border-2 border-tenant-primary text-tenant-primary bg-transparent",
    ghost: "text-tenant-primary bg-tenant-surface border border-tenant-primary",
    pill: "bg-tenant-primary text-white shadow-sm !rounded-full",
  };

  return <button className={clsx(base, styleClasses[buttonStyle], className)} {...props} />;
}
