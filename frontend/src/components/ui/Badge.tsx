import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "cyan" | "purple" | "pink" | "success" | "warning" | "error";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-white/10 text-dark-text-secondary border border-white/10",
      cyan: "bg-holo-cyan/10 text-holo-cyan border border-holo-cyan/30",
      purple: "bg-holo-purple/10 text-holo-purple border border-holo-purple/30",
      pink: "bg-holo-pink/10 text-holo-pink border border-holo-pink/30",
      success: "bg-green-500/10 text-green-400 border border-green-500/30",
      warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
      error: "bg-red-500/10 text-red-400 border border-red-500/30",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };