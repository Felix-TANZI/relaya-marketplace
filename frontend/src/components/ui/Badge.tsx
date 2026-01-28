import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] " +
          "bg-[rgb(var(--muted))] px-3 py-1 text-xs font-extrabold text-[rgb(var(--text))]",
        className
      )}
      {...props}
    />
  );
}
