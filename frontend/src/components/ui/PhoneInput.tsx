// frontend/src/components/ui/PhoneInput.tsx
import { InputHTMLAttributes, forwardRef, useEffect } from "react";
import {
  DEFAULT_COUNTRY,
  detectOperator,
  formatNational,
  isValidNationalNumber,
  toE164,
  toNationalNumber,
  type Country,
} from "@/lib/phone";

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

interface PhoneInputProps extends NativeProps {
  /** Valeur courante (accepte "+237XXXXXXXXX", "237...", ou national "6XXXXXXXX"). */
  value: string;
  /** Émet la valeur E.164 ("+237XXXXXXXXX"), ou "" si vide. */
  onChange: (value: string) => void;
  country?: Country;
  label?: string;
  error?: string;
  helperText?: string;
  /** Notifie l'état de validité du numéro (utile pour désactiver un submit). */
  onValidityChange?: (valid: boolean) => void;
  /** Affiche le badge opérateur détecté (défaut: true). */
  showOperator?: boolean;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      country = DEFAULT_COUNTRY,
      label,
      error,
      helperText,
      onValidityChange,
      showOperator = true,
      className = "",
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const national = toNationalNumber(value, country);
    const operator = detectOperator(national);
    const filled = national.length > 0;
    const valid = filled ? isValidNationalNumber(national, country) : true;
    const showRangeError = filled && !valid;
    const invalid = Boolean(error) || showRangeError;

    useEffect(() => {
      onValidityChange?.(filled && valid);
    }, [national, filled, valid, onValidityChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = toNationalNumber(e.target.value, country);
      onChange(toE164(next, country));
    };

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
            {label}
          </label>
        )}
        <div
          className={`
            flex items-center overflow-hidden rounded-xl border bg-white transition-all
            focus-within:ring-2 dark:bg-gray-800
            ${
              invalid
                ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20"
                : "border-gray-200 focus-within:border-primary focus-within:ring-primary/20 dark:border-gray-700"
            }
            ${disabled ? "opacity-60" : ""}
            ${className}
          `}
        >
          <span
            className="flex select-none items-center gap-1.5 border-r border-gray-200 px-3 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
            title={country.name}
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="font-medium">{country.dialCode}</span>
          </span>
          <input
            ref={ref}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formatNational(national)}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder ?? "6XX XX XX XX"}
            className="w-full bg-transparent px-3 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
            {...props}
          />
          {showOperator && operator && valid && (
            <span className="mr-2 whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
              {operator.name}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {!error && showRangeError && (
          <p className="mt-1.5 text-xs text-red-500">
            Numéro invalide — vérifiez l'opérateur et les 9 chiffres.
          </p>
        )}
        {helperText && !invalid && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
