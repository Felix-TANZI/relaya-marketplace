// frontend/src/features/catalog/VariantSelector.tsx
// Sélecteur de Variant pour la page fiche buyer.
//
// UX  :
//   - Pour chaque axe déclaré par le master, rend un contrôle adapté :
//     * COLORDICT → pastilles rondes avec hex_code du dictionnaire couleurs
//     * SELECT    → boutons horizontaux "128 GB / 256 GB / 512 GB"
//     * NUMBER    → boutons horizontaux avec unit affichée
//     * TEXT      → dropdown natif (fallback simple)
//   - Les valeurs non disponibles (aucun variant existant pour ce combo) sont grisées
//   - Sélection contrôlée : parent stocke le variantId sélectionné
//   - Agrégation intelligente : seules les valeurs présentes dans les variants
//     réels sont proposées (pas d'options fantômes de axis.values)

import { useMemo, useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProductVariantLight, AxisValues } from "@/services/api/variants";
import type { ResolvedAxis } from "@/services/api/attributes";
import {
  colorsApi,
  getReadableTextColor,
  type ColorDictionaryEntry,
} from "@/services/api/colors";

interface VariantSelectorProps {
  /** Axes déclarés par le master (via masterAxes.variant_axes_resolved). */
  axes: ResolvedAxis[];
  /** Variants disponibles (approuvés + actifs) — via variantsApi.listByMaster. */
  variants: ProductVariantLight[];
  /** ID du variant actuellement sélectionné. */
  selectedVariantId: number | null;
  /** Callback quand un variant est sélectionné (ou aucun). */
  onChange: (variantId: number | null, variant: ProductVariantLight | null) => void;
  /** Classes additionnelles pour le conteneur. */
  className?: string;
}

export function VariantSelector({
  axes,
  variants,
  selectedVariantId,
  onChange,
  className = "",
}: VariantSelectorProps) {
  // Valeurs actuellement sélectionnées, indexées par slug d'axe
  // Modifications locales du user (clics sur les pastilles/boutons).
  // Vide au mount — le user n'a encore rien changé.
  const [localOverrides, setLocalOverrides] = useState<AxisValues>({});
  // Sélection effective = axis_values du variant courant + overrides du user.
  // Les overrides remplacent les valeurs du variant sélectionné quand il y a conflit.
  // Sélection effective = axis_values du variant sélectionné + overrides locaux
  const selection = useMemo<AxisValues>(() => {
    const base: AxisValues = {};
    if (selectedVariantId) {
      const v = variants.find((x) => x.id === selectedVariantId);
      if (v) Object.assign(base, v.axis_values);
    }
    return { ...base, ...localOverrides };
  }, [selectedVariantId, variants, localOverrides]);
  const [colorDict, setColorDict] = useState<Record<string, ColorDictionaryEntry>>({});


  // ── Charger le dictionnaire des couleurs (une seule fois) ──────────
  useEffect(() => {
    const hasColorAxis = axes.some((a) => a.values_type === "COLORDICT");
    if (!hasColorAxis) return;

    let cancelled = false;
    colorsApi
      .list()
      .then((entries) => {
        if (cancelled) return;
        const map: Record<string, ColorDictionaryEntry> = {};
        for (const e of entries) map[e.slug] = e;
        setColorDict(map);
      })
      .catch(() => {
        /* silencieux */
      });

    return () => {
      cancelled = true;
    };
  }, [axes]);


  // ── Agrégation : pour chaque axe, valeurs disponibles + valeurs "achetables" ──
  const availableValues = useMemo(() => {
    const map: Record<string, { value: string; available: boolean }[]> = {};

    for (const axis of axes) {
      // Toutes les valeurs distinctes pour cet axe dans les variants
      const allValues = new Set<string>();
      for (const v of variants) {
        const val = v.axis_values[axis.slug];
        if (val !== undefined && val !== null) {
          allValues.add(String(val));
        }
      }

      // Pour chaque valeur, checker si elle est "achetable" compte tenu de la
      // sélection actuelle sur les autres axes
      const otherSelection: AxisValues = {};
      for (const otherAxis of axes) {
        if (otherAxis.slug === axis.slug) continue;
        if (selection[otherAxis.slug] !== undefined) {
          otherSelection[otherAxis.slug] = selection[otherAxis.slug];
        }
      }

      map[axis.slug] = Array.from(allValues)
        .sort((a, b) => {
          // Tri numérique si les 2 sont des nombres, sinon alphanumérique
          const na = Number(a);
          const nb = Number(b);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        })
        .map((value) => {
          const available = variants.some((v) => {
            if (String(v.axis_values[axis.slug]) !== value) return false;
            for (const [otherSlug, otherVal] of Object.entries(otherSelection)) {
              if (String(v.axis_values[otherSlug]) !== String(otherVal)) {
                return false;
              }
            }
            return true;
          });
          return { value, available };
        });
    }

    return map;
  }, [axes, variants, selection]);

  // ── Handler de clic sur une valeur ──────────────────────────────────
  const handleSelect = (axisSlug: string, value: string) => {
    // Le user clique sur une valeur. Deux stratégies possibles :
    //   1. Combinaison actuelle + nouvelle valeur = variant existant → on switch
    //   2. Pas de match exact → on bascule vers un variant qui a AU MOINS cette
    //      nouvelle valeur (comportement Amazon : "explorer" en cliquant)

    // Stratégie 1 : chercher un match exact
    const newSelection = { ...selection, [axisSlug]: value };
    const allAxesSelected = axes.every(
      (a) => newSelection[a.slug] !== undefined && newSelection[a.slug] !== null,
    );

    let matching: ProductVariantLight | undefined;
    if (allAxesSelected) {
      matching = variants.find((v) => {
        return axes.every(
          (a) => String(v.axis_values[a.slug] ?? "") === String(newSelection[a.slug] ?? ""),
        );
      });
    }

    if (matching) {
      // Match exact : on change de variant proprement
      setLocalOverrides({});
      if (matching.id !== selectedVariantId) {
        onChange(matching.id, matching);
      }
      return;
    }

    // Stratégie 2 : bascule intelligente — trouver n'importe quel variant qui a
    // cette valeur pour cet axe. On adopte tous ses axis_values, ce qui change
    // potentiellement les autres axes (comportement Amazon).
    const fallback = variants.find(
      (v) => String(v.axis_values[axisSlug] ?? "") === value,
    );

    if (fallback) {
      setLocalOverrides({});
      if (fallback.id !== selectedVariantId) {
        onChange(fallback.id, fallback);
      }
      return;
    }

    // Aucune bascule possible (jamais atteint en pratique car la valeur vient
    // d'un variant existant) — on stocke juste l'override et on informe le parent
    setLocalOverrides(newSelection);
    if (selectedVariantId !== null) {
      onChange(null, null);
    }
  };

  if (axes.length === 0 || variants.length === 0) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {axes.map((axis) => {
        const values = availableValues[axis.slug] ?? [];
        if (values.length === 0) return null;

        return (
          <div key={axis.slug}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {axis.name}
              </span>
              {selection[axis.slug] !== undefined && (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  : {axis.values_type === "COLORDICT" && colorDict[String(selection[axis.slug])]
                      ? colorDict[String(selection[axis.slug])].name
                      : String(selection[axis.slug])}
                  {axis.unit && ` ${axis.unit}`}
                </span>
              )}
            </div>

            {axis.values_type === "COLORDICT" ? (
              <ColorRow
                values={values}
                colorDict={colorDict}
                selected={selection[axis.slug]}
                onSelect={(v) => handleSelect(axis.slug, v)}
              />
            ) : (
              <SelectRow
                values={values}
                unit={axis.unit}
                selected={selection[axis.slug]}
                onSelect={(v) => handleSelect(axis.slug, v)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  values: { value: string; available: boolean }[];
  selected: string | number | undefined;
  onSelect: (value: string) => void;
}

/** Rangée de pastilles couleur (axe COLORDICT). */
function ColorRow({
  values,
  colorDict,
  selected,
  onSelect,
}: RowProps & { colorDict: Record<string, ColorDictionaryEntry> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(({ value, available }) => {
        const entry = colorDict[value];
        const hex = entry?.hex_code || "#E5E7EB";
        const label = entry?.name || value;
        const isSelected = String(selected) === value;
        const checkColor = getReadableTextColor(hex);

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            title={available ? label : `${label} (indisponible)`}
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                : "border-gray-200 hover:border-gray-400 dark:border-gray-700",
              !available && "cursor-not-allowed opacity-40 grayscale",
              available && "hover:scale-105",
            )}
            style={{ backgroundColor: hex }}
          >
            {isSelected && (
              <Check size={16} style={{ color: checkColor }} />
            )}
            {!available && (
              <span
                className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-white/60 to-transparent"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Rangée de boutons horizontaux (axes SELECT / NUMBER). */
function SelectRow({
  values,
  unit,
  selected,
  onSelect,
}: RowProps & { unit: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(({ value, available }) => {
        const isSelected = String(selected) === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              "min-w-[64px] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all",
              isSelected
                ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
              !available &&
                "cursor-not-allowed line-through opacity-40 hover:border-gray-200 dark:hover:border-gray-700",
            )}
          >
            {value}
            {unit && ` ${unit}`}
          </button>
        );
      })}
    </div>
  );
}