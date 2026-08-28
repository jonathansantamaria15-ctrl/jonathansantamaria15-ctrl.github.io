import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-chrome-text text-chrome-bg hover:opacity-90 disabled:opacity-40",
  secondary:
    "bg-chrome-surface text-chrome-text border border-chrome-border hover:bg-chrome-border/40",
  ghost: "text-chrome-text hover:bg-chrome-surface",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded-md",
  md: "text-sm px-3.5 py-2 rounded-lg",
  lg: "text-base px-5 py-3 rounded-lg",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={clsx(
      "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-text disabled:cursor-not-allowed",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";
