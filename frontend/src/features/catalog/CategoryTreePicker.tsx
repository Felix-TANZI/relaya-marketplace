// frontend/src/components/catalog/CategoryTreePicker.tsx
// Champ « Catégorie » du formulaire vendeur : une liste déroulante des
// catégories créées par l'admin (« Gestion des catégories »).
//
// Consomme : categoriesApi.tree (catégories actives, non deprecated)
//
// UX :
//   - Fermé : le champ affiche la catégorie choisie (image + chemin) ou
//     « Choisir une catégorie », avec une flèche
//   - Ouvert : la liste des catégories, illustrées par l'image de l'admin ;
//     une catégorie qui a des sous-catégories s'ouvre sur elles (drill-down)
//   - Recherche directe, clavier (↑ ↓ Entrée, ← pour remonter, Échap pour fermer)
//   - La liste s'insère sous le champ (pas de surimpression) : jamais coupée
//     par un cadre du formulaire, confortable sur mobile
//   - Mode leaves-only : ne peut sélectionner QUE des feuilles (règle aussi
//     vérifiée côté serveur à l'enregistrement)

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Folder, Loader2, RefreshCw,
  Search, ShieldAlert, Store, Tag, X,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";
import {
  categoriesApi,
  findCategoryById,
  type CategoryTreeNode,
} from "@/services/api/categories";

interface CategoryTreePickerProps {
  /** ID de la catégorie sélectionnée. */
  value: number | null;
  /** Callback avec l'ID + la catégorie complète (pour accès au slug etc). */
  onChange: (id: number | null, node: CategoryTreeNode | null) => void;
  /** Label du picker. */
  label?: string;
  /** Slug racine — n'affiche que ce sous-arbre. Ex : "electronics". */
  rootSlug?: string;
  /**
   * Si true : le vendeur ne peut sélectionner QUE des feuilles.
   * Cliquer sur une catégorie parente descend dedans au lieu de la sélectionner.
   * Défaut : true (mode formulaire vendeur).
   */
  leavesOnly?: boolean;
  /** Message d'erreur externe. */
  error?: string;
  /** Classes additionnelles. */
  className?: string;
  /** Désactive la sélection. */
  disabled?: boolean;
  /** Texte du champ vide. */
  placeholder?: string;
}

interface Option {
  node: CategoryTreeNode;
  /** Chemin des ancêtres, affiché dans les résultats de recherche. */
  trail?: string;
}

const isVisible = (node: CategoryTreeNode) => !node.is_deprecated && node.is_active;
const visibleChildren = (node: CategoryTreeNode) => (node.children || []).filter(isVisible);
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function countLabel(count: number) {
  return `${count} sous-catégorie${count > 1 ? "s" : ""}`;
}

export function CategoryTreePicker({
  value,
  onChange,
  label,
  rootSlug,
  leavesOnly = true,
  error,
  className = "",
  disabled = false,
  placeholder = "Choisir une catégorie",
}: CategoryTreePickerProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  /** Pile de navigation : [racine, sous-catégorie, ...] */
  const [path, setPath] = useState<CategoryTreeNode[]>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Charger l'arbre ────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    categoriesApi
      .tree({ root_slug: rootSlug })
      .then((data) => {
        if (controller.signal.aborted) return;
        setTree(data);
        setFetchError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFetchError("Impossible de charger les catégories.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [rootSlug, reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setFetchError(null);
    setReloadKey((k) => k + 1);
  };

  // ── Catégorie choisie (affichée dans le champ fermé) ───────────────
  const selectedMatch = useMemo(
    () => (value !== null ? findCategoryById(tree, value) : null),
    [tree, value],
  );
  const selectedPath = selectedMatch
    ? [...selectedMatch.ancestors.map((a) => a.name), selectedMatch.node.name].join(" › ")
    : "";
  const selectedIsSensitive = selectedMatch
    ? [selectedMatch.node, ...selectedMatch.ancestors].some((n) => n.requires_admin_approval)
    : false;

  // ── Ouverture / fermeture ──────────────────────────────────────────
  const openPanel = () => {
    if (disabled) return;
    // On rouvre au niveau de la catégorie déjà choisie.
    setPath(selectedMatch ? selectedMatch.ancestors : []);
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  };
  const closePanel = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // ── Options affichées : niveau courant, ou résultats de recherche ──
  const currentNodes = useMemo(() => {
    const nodes = path.length === 0 ? tree : path[path.length - 1].children || [];
    return nodes.filter(isVisible);
  }, [tree, path]);

  const searchResults = useMemo<Option[] | null>(() => {
    const needle = normalize(query.trim());
    if (needle.length < 2) return null;
    const results: Option[] = [];
    const walk = (nodes: CategoryTreeNode[], trail: string[]) => {
      for (const node of nodes.filter(isVisible)) {
        const kids = visibleChildren(node);
        const selectable = !leavesOnly || kids.length === 0;
        if (selectable && normalize(`${trail.join(" ")} ${node.name}`).includes(needle)) {
          results.push({ node, trail: trail.join(" › ") });
        }
        walk(kids, [...trail, node.name]);
      }
    };
    walk(tree, []);
    return results.slice(0, 30);
  }, [leavesOnly, query, tree]);

  const options: Option[] = searchResults ?? currentNodes.map((node) => ({ node }));
  const safeIndex = Math.min(activeIndex, Math.max(options.length - 1, 0));

  // ── Choisir : descendre dans un parent, ou sélectionner et fermer ──
  const choose = (node: CategoryTreeNode) => {
    if (disabled) return;
    const hasChildren = visibleChildren(node).length > 0;

    // En mode leavesOnly, on descend TOUJOURS si des enfants existent
    if (leavesOnly && hasChildren) {
      setPath(searchResults ? [...(findCategoryById(tree, node.id)?.ancestors ?? []), node] : [...path, node]);
      setQuery("");
      setActiveIndex(0);
      return;
    }

    onChange(node.id, node);
    closePanel();
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
    setActiveIndex(0);
  };

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(safeIndex + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(safeIndex - 1, 0));
    } else if (event.key === "Enter" && options[safeIndex]) {
      event.preventDefault();
      choose(options[safeIndex].node);
    } else if ((event.key === "ArrowLeft" || event.key === "Backspace") && !query && path.length > 0) {
      event.preventDefault();
      goBack();
    }
  };

  // Garde l'option active visible pendant la navigation au clavier.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, safeIndex]);

  const parent = path[path.length - 1];
  const listboxId = `category-listbox-${rootSlug ?? "all"}`;

  // ── Rendu ──────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      {label && (
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}

      {/* Champ : catégorie choisie + flèche */}
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors dark:bg-gray-800",
          open
            ? "border-primary ring-2 ring-primary/20"
            : error
              ? "border-red-400"
              : "border-gray-200 hover:border-primary dark:border-gray-700",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {selectedMatch ? (
          <CategoryThumb node={selectedMatch.node} size={32} />
        ) : (
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700">
            <Tag size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          {selectedMatch ? (
            <>
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {selectedMatch.node.name}
              </span>
              {selectedMatch.ancestors.length > 0 && (
                <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {selectedPath}
                </span>
              )}
            </>
          ) : (
            <span className="block truncate text-sm text-gray-400">
              {isLoading ? "Chargement des catégories…" : placeholder}
            </span>
          )}
        </span>
        {isLoading ? (
          <Loader2 size={16} className="flex-shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown
            size={18}
            className={cn("flex-shrink-0 text-gray-400 transition-transform", open && "rotate-180 text-primary")}
          />
        )}
      </button>

      {/* Rappel : là où l'acheteur trouvera le produit */}
      {selectedMatch && !open && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <Store size={11} className="text-primary" />
          Visible chez les acheteurs dans : <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedPath}</span>
          {selectedIsSensitive && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
              <ShieldAlert size={10} /> Validation renforcée
            </span>
          )}
        </p>
      )}

      {/* Liste déroulante */}
      {open && (
        <div
          onKeyDown={onPanelKeyDown}
          className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {/* Recherche */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <Search size={13} className="flex-shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              placeholder="Rechercher (ex : robes, casques…)"
              aria-label="Rechercher une catégorie"
              aria-controls={listboxId}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="text-gray-400 hover:text-primary"
                aria-label="Effacer la recherche"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* En-tête : niveau courant */}
          {!searchResults && (
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900/40">
              {parent ? (
                <>
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-0.5 font-semibold text-gray-600 hover:text-primary dark:text-gray-300"
                    aria-label="Remonter d'un niveau"
                  >
                    <ChevronLeft size={14} />
                    Retour
                  </button>
                  <span className="truncate text-gray-500 dark:text-gray-400">
                    Sous-catégories de <span className="font-semibold text-gray-800 dark:text-gray-100">« {parent.name} »</span>
                  </span>
                </>
              ) : (
                <span className="font-semibold uppercase tracking-wider text-gray-400">
                  Catégories BelivaY
                </span>
              )}
            </div>
          )}

          {/* Contenu */}
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Chargement…
            </div>
          ) : fetchError ? (
            <div className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="text-red-500">{fetchError}</span>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"
              >
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          ) : options.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              {searchResults
                ? `Aucune catégorie ne correspond à « ${query.trim()} ».`
                : tree.length === 0
                  ? "Aucune catégorie n'a encore été créée par l'équipe BelivaY."
                  : "Aucune sous-catégorie disponible."}
            </p>
          ) : (
            <div ref={listRef} id={listboxId} role="listbox" aria-label="Catégories" className="max-h-72 overflow-auto py-1">
              {options.map(({ node, trail }, index) => (
                <CategoryOption
                  key={node.id}
                  index={index}
                  node={node}
                  trail={trail}
                  isSelected={value === node.id}
                  isActive={index === safeIndex}
                  onHover={() => setActiveIndex(index)}
                  onClick={() => choose(node)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIGNETTE — image de l'admin, sinon icône Lucide, sinon dossier
// ─────────────────────────────────────────────────────────────────────────────

/** Icône Lucide choisie par l'admin (dossier par défaut), déjà rendue. */
function renderCategoryIcon(name: string, size: number) {
  const icon = name && name in LucideIcons
    ? (LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>)
    : Folder;
  return createElement(icon, { size });
}

function CategoryThumb({ node, size }: { node: CategoryTreeNode; size: number }) {
  if (node.image_url) {
    return (
      <img
        src={node.image_url}
        alt=""
        loading="lazy"
        className="flex-shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700"
      style={{ width: size, height: size }}
    >
      {renderCategoryIcon(node.icon_name, Math.round(size * 0.48))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION DE LA LISTE
// ─────────────────────────────────────────────────────────────────────────────

function CategoryOption({ index, node, trail, isSelected, isActive, onHover, onClick }: {
  index: number;
  node: CategoryTreeNode;
  trail?: string;
  isSelected: boolean;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const kids = visibleChildren(node).length;
  const meta = trail || (kids > 0 ? countLabel(kids) : node.description);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-index={index}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
        isActive ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50 dark:hover:bg-gray-700",
      )}
    >
      <CategoryThumb node={node} size={36} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium", isSelected ? "text-primary" : "text-gray-900 dark:text-white")}>
          {node.name}
        </div>
        {meta && (
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">{meta}</div>
        )}
      </div>

      {node.requires_admin_approval && (
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
          title="Modération renforcée requise pour cette catégorie"
        >
          <ShieldAlert size={10} />
          Sensible
        </span>
      )}

      {kids > 0 ? (
        <ChevronRight size={15} className="flex-shrink-0 text-gray-400" />
      ) : isSelected ? (
        <Check size={15} className="flex-shrink-0 text-primary" />
      ) : null}
    </div>
  );
}
