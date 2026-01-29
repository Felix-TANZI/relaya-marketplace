import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--ring),0.35)] " +
  "rounded-2xl";

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "text-[rgb(var(--bg-rgb))] " +
    "bg-[rgb(var(--primary))] " +
    "hover:bg-[rgb(var(--primary-strong))] " +
    "shadow-soft",
  secondary:
    "glass border border-[rgba(var(--border-rgb),0.45)] " +
    "text-[rgb(var(--text-rgb))] " +
    "hover:bg-[rgba(var(--glass),0.85)] " +
    "shadow-soft",
  ghost:
    "text-[rgb(var(--text-rgb))] " +
    "hover:bg-[rgba(var(--glass),0.55)] " +
    "border border-transparent",
  danger:
    "text-[rgb(var(--bg-rgb))] bg-[rgb(var(--danger))] hover:opacity-90 shadow-soft",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
