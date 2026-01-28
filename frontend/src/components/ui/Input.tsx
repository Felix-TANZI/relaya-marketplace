import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl px-4 text-sm",
        "text-[rgb(var(--text))] placeholder:text-[rgba(var(--subtext),0.9)]",
        "bg-[rgba(var(--glass),0.55)] border border-[rgba(var(--border),0.40)]",
        "backdrop-blur-md shadow-soft",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--ring),0.30)]",
        className
      )}
      {...props}
    />
  );
}
