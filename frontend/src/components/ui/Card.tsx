import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", padding = "md", hover = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800",
      elevated: "bg-white border border-gray-100 shadow-lg dark:bg-gray-900 dark:border-gray-800",
      bordered: "border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
    };

    const paddings = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    const hoverStyles = hover ? "hover:border-primary hover:shadow-md transition-all" : "";

    return (
      <div
        ref={ref}
        className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
