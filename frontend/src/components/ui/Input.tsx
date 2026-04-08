import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm
            text-gray-900 placeholder:text-gray-400
            outline-none transition-all
            focus:border-primary focus:ring-2 focus:ring-primary/20
            dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
