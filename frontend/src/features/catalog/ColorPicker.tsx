// frontend/src/components/catalog/ColorPicker.tsx
// Sélecteur de couleurs/finitions basé sur ColorDictionary
//
// UX :
//   - Grille de pastilles rondes rendues depuis hex_code
//   - Label lisible auto-calculé (noir ou blanc selon luminance WCAG)
//   - Sélection contrôlée : le parent stocke le slug (pas l'entrée complète)
//   - Deux sections optionnelles : COLOR + FINISH (grouped)
//   - Filtre "neutres uniquement" optionnel

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  colorsApi,
  getReadableTextColor,
  type ColorDictionaryEntry,
  type ColorFamily,
} from "@/services/api/colors";

interface ColorPickerProps {
  /** Slug de l'entrée sélectionnée (COLOR ou FINISH). */
  value: string | null;
  /** Callback quand une entrée est sélectionnée. */
  onChange: (slug: string | null, entry: ColorDictionaryEntry | null) => void;
  /** Label du bloc. */
  label?: string;
  /**
   * Familles à afficher.
   *   - ["COLOR"] : seulement les couleurs (défaut)
   *   - ["FINISH"] : seulement les finitions
   *   - ["COLOR", "FINISH"] : les deux, section par section
   */
  families?: ColorFamily[];
  /** Ne montrer que les neutres (Noir, Blanc, Gris, Titane...). */
  neutralOnly?: boolean;
  /** Taille des pastilles (défaut : md). */
  size?: "sm" | "md" | "lg";
  /** Afficher le nom sous chaque pastille. */
  showLabels?: boolean;
  /** Message d'erreur externe. */
  error?: string;
  /** Classes additionnelles. */
  className?: string;
  /** Désactive la sélection. */
  disabled?: boolean;
}

const SIZE_MAP = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-12 w-12 text-xs",
  lg: "h-16 w-16 text-sm",
};

export function ColorPicker({
  value,
  onChange,
  label,
  families = ["COLOR"],
  neutralOnly = false,
  size = "md",
  showLabels = true,
  error,
  className = "",
  disabled = false,
}: ColorPickerProps) {
  const [entries, setEntries] = useState<ColorDictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    colorsApi
      .grouped()
      .then((grouped) => {
        if (controller.signal.aborted) return;
        const merged: ColorDictionaryEntry[] = [];
        for (const family of families) {
          merged.push(...(grouped[family] || []));
        }
        const filtered = neutralOnly
          ? merged.filter((e) => e.is_neutral)
          : merged;
        setEntries(filtered);
        setFetchError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFetchError("Impossible de charger le dictionnaire des couleurs.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [families, neutralOnly]);

  const handleClick = (entry: ColorDictionaryEntry) => {
    if (disabled) return;
    if (value === entry.slug) {
      onChange(null, null);
    } else {
      onChange(entry.slug, entry);
    }
  };

  // Grouper par family pour affichage sectionné si plusieurs familles
  const grouped = families.reduce<Record<ColorFamily, ColorDictionaryEntry[]>>(
    (acc, family) => {
      acc[family] = entries.filter((e) => e.family === family);
      return acc;
    },
    { COLOR: [], FINISH: [] } as Record<ColorFamily, ColorDictionaryEntry[]>,
  );

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
          <Loader2 size={14} className="animate-spin" />
          Chargement des couleurs…
        </div>
      )}

      {fetchError && (
        <p className="text-xs text-red-500">{fetchError}</p>
      )}

      {!isLoading && !fetchError && entries.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Aucune couleur disponible.
        </p>
      )}

      {!isLoading && !fetchError && entries.length > 0 && (
        <div className="space-y-4">
          {families.map((family) => {
            const familyEntries = grouped[family];
            if (familyEntries.length === 0) return null;
            const showSectionTitle = families.length > 1;

            return (
              <div key={family}>
                {showSectionTitle && (
                  <p className="mb-2 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
                    {family === "COLOR" ? "Couleurs" : "Finitions"}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {familyEntries.map((entry) => (
                    <ColorSwatch
                      key={entry.id}
                      entry={entry}
                      isSelected={value === entry.slug}
                      onSelect={() => handleClick(entry)}
                      size={size}
                      showLabel={showLabels}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SWATCH INTERNE
// ─────────────────────────────────────────────────────────────────────────────

interface ColorSwatchProps {
  entry: ColorDictionaryEntry;
  isSelected: boolean;
  onSelect: () => void;
  size: "sm" | "md" | "lg";
  showLabel: boolean;
  disabled: boolean;
}

function ColorSwatch({
  entry,
  isSelected,
  onSelect,
  size,
  showLabel,
  disabled,
}: ColorSwatchProps) {
  const bgStyle = entry.hex_code
    ? { backgroundColor: entry.hex_code }
    : entry.pattern_url
      ? {
          backgroundImage: `url("${entry.pattern_url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  const checkColor = entry.hex_code
    ? getReadableTextColor(entry.hex_code)
    : "#000";

  const hasBg = Boolean(entry.hex_code || entry.pattern_url);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={entry.name}
      title={entry.name}
      className={cn(
        "flex flex-col items-center gap-1 transition-transform",
        disabled ? "cursor-not-allowed opacity-50" : "hover:scale-105",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-2 shadow-sm transition-all",
          SIZE_MAP[size],
          isSelected
            ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
            : "border-gray-200 dark:border-gray-700",
          !hasBg && "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800",
        )}
        style={bgStyle}
      >
        {isSelected && <Check size={size === "sm" ? 12 : 16} style={{ color: checkColor }} />}
      </span>
      {showLabel && (
        <span
          className={cn(
            "max-w-[80px] truncate text-center text-[11px]",
            isSelected
              ? "font-semibold text-gray-900 dark:text-white"
              : "text-gray-600 dark:text-gray-400",
          )}
        >
          {entry.name}
        </span>
      )}
    </button>
  );
}