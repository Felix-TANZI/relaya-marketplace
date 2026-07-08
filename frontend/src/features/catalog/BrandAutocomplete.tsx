// frontend/src/components/catalog/BrandAutocomplete.tsx
// Autocomplete marques avec debounce, keyboard nav, et option "proposer une nouvelle marque"
//
// Consomme : brandsApi.autocomplete + brandsApi.propose
//
// UX :
//   - Debounce 300ms sur la recherche (évite le spam backend)
//   - Navigation clavier : flèches haut/bas + Enter pour sélectionner, Esc pour fermer
//   - Verified brands affichées avec badge vert
//   - Si aucun résultat après recherche, propose "+ Créer la marque 'Xxx'"
//   - Gestion propre du 409 Conflict (marque déjà existante → auto-select)

import { useEffect, useRef, useState, useCallback } from "react";
import { Check, Plus, X, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  brandsApi,
  type BrandLight,
} from "@/services/api/brands";

interface BrandAutocompleteProps {
  /** Marque actuellement sélectionnée (contrôlé par le parent). */
  value: BrandLight | null;
  /** Callback quand une marque est sélectionnée ou effacée. */
  onChange: (brand: BrandLight | null) => void;
  /** Label optionnel affiché au-dessus. */
  label?: string;
  /** Placeholder. */
  placeholder?: string;
  /** Filtre pour ne suggérer QUE des marques vérifiées. */
  verifiedOnly?: boolean;
  /** Autoriser la proposition d'une nouvelle marque (défaut: true). */
  allowPropose?: boolean;
  /** Message d'erreur externe (validation form parent). */
  error?: string;
  /** Nombre max de suggestions (défaut: 8). */
  limit?: number;
  /** Classes additionnelles pour le wrapper. */
  className?: string;
  /** Désactive l'input. */
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

export function BrandAutocomplete({
  value,
  onChange,
  label,
  placeholder = "Rechercher une marque…",
  verifiedOnly = false,
  allowPropose = true,
  error,
  limit = 8,
  className = "",
  disabled = false,
}: BrandAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BrandLight[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [isProposing, setIsProposing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch avec debounce ────────────────────────────────────────────
  const fetchSuggestions = useCallback(
    async (q: string) => {
      setIsLoading(true);
      try {
        const results = await brandsApi.autocomplete({
          q,
          verified_only: verifiedOnly,
          limit,
        });
        setSuggestions(results);
        setHighlightIdx(results.length > 0 ? 0 : -1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [verifiedOnly, limit],
  );

  useEffect(() => {
    // Ne pas rechercher tant qu'une marque est sélectionnée
    if (value || !isOpen) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, value, fetchSuggestions]);

  // ── Fermeture sur clic extérieur ───────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Sélection d'une marque ─────────────────────────────────────────
  const selectBrand = (brand: BrandLight) => {
    onChange(brand);
    setQuery("");
    setIsOpen(false);
    setProposeError(null);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery("");
    setProposeError(null);
    inputRef.current?.focus();
  };

  // ── Proposer une nouvelle marque ───────────────────────────────────
  const proposeBrand = async () => {
    const name = query.trim();
    if (!name || name.length < 2) return;

    setIsProposing(true);
    setProposeError(null);

    try {
      const brand = await brandsApi.propose({ name });
      // Convertir Brand complet en BrandLight
      selectBrand({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo_url: brand.logo_url,
        is_verified: brand.is_verified,
      });
    } catch (err) {
      // Gestion 409 : marque existe déjà — on essaie de la sélectionner
      const message = err instanceof Error ? err.message : "";
      if (message.includes("409") || message.toLowerCase().includes("existe")) {
        // Recherche immédiate + auto-select
        try {
          const results = await brandsApi.autocomplete({ q: name, limit: 5 });
          const existing = results.find(
            (b) => b.name.toLowerCase() === name.toLowerCase(),
          );
          if (existing) {
            selectBrand(existing);
            return;
          }
        } catch {
          // ignore
        }
        setProposeError("Cette marque existe déjà, mais nous n'arrivons pas à la retrouver.");
      } else {
        setProposeError("Erreur lors de la création. Réessayez.");
      }
    } finally {
      setIsProposing(false);
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) =>
          suggestions.length > 0 ? Math.min(prev + 1, suggestions.length - 1) : -1,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0 && suggestions[highlightIdx]) {
          selectBrand(suggestions[highlightIdx]);
        } else if (
          allowPropose &&
          query.trim().length >= 2 &&
          suggestions.length === 0
        ) {
          proposeBrand();
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const showPropose =
    allowPropose &&
    !isLoading &&
    !value &&
    query.trim().length >= 2 &&
    suggestions.length === 0 &&
    isOpen;

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}

      {/* Input ou marque sélectionnée */}
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm dark:bg-primary/10">
          {value.logo_url && (
            <img
              src={value.logo_url}
              alt=""
              className="h-6 w-6 rounded object-contain"
            />
          )}
          <span className="flex-1 font-medium text-gray-900 dark:text-white">
            {value.name}
          </span>
          {value.is_verified && (
            <span
              className="flex items-center gap-1 text-xs font-medium text-green-600"
              title="Marque vérifiée"
            >
              <Check size={14} />
              Vérifiée
            </span>
          )}
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-900 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Changer de marque"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
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
          {isLoading && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
              size={16}
            />
          )}
        </div>
      )}

      {/* Dropdown de suggestions */}
      {isOpen && !value && (suggestions.length > 0 || showPropose) && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {suggestions.map((brand, idx) => (
            <button
              key={brand.id}
              type="button"
              role="option"
              aria-selected={idx === highlightIdx}
              onClick={() => selectBrand(brand)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                idx === highlightIdx
                  ? "bg-primary/5 text-gray-900 dark:bg-primary/10 dark:text-white"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt=""
                  className="h-6 w-6 rounded object-contain"
                />
              ) : (
                <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
              )}
              <span className="flex-1 font-medium">{brand.name}</span>
              {brand.is_verified && (
                <Check
                  size={14}
                  className="text-green-600"
                  aria-label="Vérifiée"
                />
              )}
            </button>
          ))}

          {showPropose && (
            <button
              type="button"
              onClick={proposeBrand}
              disabled={isProposing}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-primary/10"
            >
              {isProposing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Créer la marque « {query.trim()} »
            </button>
          )}
        </div>
      )}

      {/* Messages d'erreur */}
      {proposeError && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={12} />
          {proposeError}
        </p>
      )}
      {error && !proposeError && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}