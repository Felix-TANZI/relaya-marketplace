import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] " +
          "bg-[color:var(--muted)] px-3 py-1 text-xs font-extrabold text-[color:var(--text)]",
        className
      )}
      {...props}
    />
  );
}
