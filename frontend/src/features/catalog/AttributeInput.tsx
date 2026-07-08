// frontend/src/components/catalog/AttributeInput.tsx
// Composant polymorphe : rend le bon input selon values_type d'un ProductAttribute
//
// Consomme : brands.ts, colors.ts, attributes.ts 
// Réutilise : BrandAutocomplete, ColorPicker 
//
// UX :
//   - SELECT     → dropdown natif
//   - NUMBER     → input number avec suffixe unit
//   - BOOL       → toggle
//   - TEXT       → input text
//   - COLORDICT  → ColorPicker
//   - BRAND      → BrandAutocomplete
//
// Le parent reçoit toujours la valeur "brute" au bon type :
//   - string | number pour SELECT / NUMBER / TEXT / COLORDICT (slug couleur)
//   - boolean pour BOOL
//   - BrandLight (id ou objet complet, à décider) pour BRAND

import { cn } from "@/lib/cn";
import type {
  ProductAttributeEnriched,
  AttributeValueType,
} from "@/services/api/attributes";
import type { BrandLight } from "@/services/api/brands";
import { BrandAutocomplete } from "./BrandAutocomplete";
import { ColorPicker } from "./ColorPicker";

/**
 * Type union des valeurs possibles selon values_type.
 * Le parent doit narrower en fonction de attribute.values_type.
 */
export type AttributeValue =
  | string    // SELECT, TEXT, COLORDICT (slug)
  | number    // NUMBER
  | boolean   // BOOL
  | BrandLight // BRAND (objet complet ou null)
  | null;

interface AttributeInputProps {
  /** L'attribut à rendre — détermine le type d'input. */
  attribute: ProductAttributeEnriched;
  /** Valeur actuelle. Typée large — le parent narrower selon values_type. */
  value: AttributeValue;
  /** Callback avec la nouvelle valeur. */
  onChange: (value: AttributeValue) => void;
  /** Message d'erreur externe. */
  error?: string;
  /** Classes additionnelles. */
  className?: string;
  /** Désactive l'input. */
  disabled?: boolean;
  /** Attribut requis (affiche un astérisque sur le label). */
  required?: boolean;
}

export function AttributeInput({
  attribute,
  value,
  onChange,
  error,
  className = "",
  disabled = false,
  required = false,
}: AttributeInputProps) {
  const label = (
    <div className="mb-2 flex items-center justify-between">
      <label
        htmlFor={`attr-${attribute.slug}`}
        className="text-xs font-medium uppercase tracking-widest text-gray-400"
      >
        {attribute.name}
        {required && <span className="ml-1 text-red-500">*</span>}
        {attribute.unit && (
          <span className="ml-2 normal-case tracking-normal text-gray-500">
            ({attribute.unit})
          </span>
        )}
      </label>
      {attribute.is_universal && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Universel
        </span>
      )}
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {renderInputByType({
        type: attribute.values_type,
        attribute,
        value,
        onChange,
        error,
        disabled,
        label,
      })}
      {error && attribute.values_type !== "COLORDICT" && attribute.values_type !== "BRAND" && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH
// ─────────────────────────────────────────────────────────────────────────────

interface RenderProps {
  type: AttributeValueType;
  attribute: ProductAttributeEnriched;
  value: AttributeValue;
  onChange: (value: AttributeValue) => void;
  error?: string;
  disabled: boolean;
  label: React.ReactNode;
}

function renderInputByType(props: RenderProps): React.ReactNode {
  switch (props.type) {
    case "SELECT":
      return <SelectInput {...props} />;
    case "NUMBER":
      return <NumberInput {...props} />;
    case "BOOL":
      return <BoolInput {...props} />;
    case "TEXT":
      return <TextInput {...props} />;
    case "COLORDICT":
      return <ColorDictInput {...props} />;
    case "BRAND":
      return <BrandInput {...props} />;
    default:
      return (
        <div>
          {props.label}
          <p className="text-xs text-red-500">
            Type d'input non supporté : {props.type}
          </p>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

function SelectInput({ attribute, value, onChange, error, disabled, label }: RenderProps) {
  const values = attribute.values || [];
  return (
    <div>
      {label}
      <select
        id={`attr-${attribute.slug}`}
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "dark:bg-gray-800 dark:text-white",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200 dark:border-gray-700",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <option value="">Sélectionner…</option>
        {values.map((v) => (
          <option key={String(v)} value={String(v)}>
            {v}
            {attribute.unit ? ` ${attribute.unit}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({ attribute, value, onChange, error, disabled, label }: RenderProps) {
  return (
    <div>
      {label}
      <div className="relative">
        <input
          id={`attr-${attribute.slug}`}
          type="number"
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
          disabled={disabled}
          placeholder="0"
          className={cn(
            "w-full rounded-xl border bg-white px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition-all",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "dark:bg-gray-800 dark:text-white",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-200 dark:border-gray-700",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
        {attribute.unit && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
            {attribute.unit}
          </span>
        )}
      </div>
    </div>
  );
}

function BoolInput({ value, onChange, disabled, label }: RenderProps) {
  const isOn = value === true;
  return (
    <div>
      {label}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          onClick={() => onChange(!isOn)}
          disabled={disabled}
          className={cn(
            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
            isOn ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              isOn ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {isOn ? "Oui" : "Non"}
        </span>
      </div>
    </div>
  );
}

function TextInput({ attribute, value, onChange, error, disabled, label }: RenderProps) {
  return (
    <div>
      {label}
      <input
        id={`attr-${attribute.slug}`}
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={`Ex : ${attribute.name}`}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all",
          "placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
          "dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200 dark:border-gray-700",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
    </div>
  );
}

function ColorDictInput({ value, onChange, error, disabled, label }: RenderProps) {
  return (
    <div>
      {label}
      <ColorPicker
        value={typeof value === "string" ? value : null}
        onChange={(slug: string | null) => onChange(slug)}
        families={["COLOR"]}
        size="md"
        showLabels
        error={error}
        disabled={disabled}
      />
    </div>
  );
}

function BrandInput({ value, onChange, error, disabled, label }: RenderProps) {
  const brandValue: BrandLight | null =
    value && typeof value === "object" && "id" in value ? (value as BrandLight) : null;
  return (
    <div>
      {label}
      <BrandAutocomplete
        value={brandValue}
        onChange={(brand: BrandLight | null) => onChange(brand)}
        placeholder={`Rechercher une marque…`}
        error={error}
        disabled={disabled}
      />
    </div>
  );
}