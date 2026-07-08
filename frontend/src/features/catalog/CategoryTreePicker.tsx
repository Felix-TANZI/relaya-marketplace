// frontend/src/components/catalog/CategoryTreePicker.tsx
// Sélecteur de catégorie navigable dans l'arborescence
//
// Consomme : categoriesApi.tree (Phase 4.1)
//
// UX :
//   - Navigation façon "drill-down" : on clique sur une catégorie parente, on descend
//   - Breadcrumb en haut pour remonter
//   - Filtre auto des catégories deprecated (invisible dans le nouveau formulaire)
//   - Badge orange sur les catégories à modération renforcée
//   - Mode leaves-only : ne peut sélectionner QUE des feuilles (catégories sans enfants)

import { useEffect, useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Home, Loader2, ShieldAlert } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";
import {
  categoriesApi,
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
}: CategoryTreePickerProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /** Pile de navigation : [racine, sous-catégorie, ...] */
  const [path, setPath] = useState<CategoryTreeNode[]>([]);

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
  }, [rootSlug]);

  // ── Nœuds affichés au niveau courant ───────────────────────────────
  const currentNodes = useMemo(() => {
    if (path.length === 0) return tree;
    return path[path.length - 1].children || [];
  }, [tree, path]);

  // ── Sélectionner ou descendre ──────────────────────────────────────
  const handleClick = (node: CategoryTreeNode) => {
    if (disabled) return;

    const hasChildren = (node.children || []).length > 0;

    // En mode leavesOnly, on descend TOUJOURS si des enfants existent
    if (leavesOnly && hasChildren) {
      setPath([...path, node]);
      return;
    }

    // Sinon, ce click sélectionne la catégorie
    onChange(node.id, node);
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
  };

  const goToRoot = () => {
    setPath([]);
  };

  // ── Rendu ──────────────────────────────────────────────────────────
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs dark:border-gray-700">
          <button
            type="button"
            onClick={goToRoot}
            disabled={path.length === 0 || disabled}
            className="flex items-center gap-1 text-gray-500 hover:text-primary disabled:opacity-50 dark:text-gray-400"
            aria-label="Retour à la racine"
          >
            <Home size={12} />
          </button>
          {path.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={disabled}
              className="flex items-center gap-1 text-gray-500 hover:text-primary disabled:opacity-50 dark:text-gray-400"
              aria-label="Remonter d'un niveau"
            >
              <ChevronLeft size={12} />
              Retour
            </button>
          )}
          {path.map((n, idx) => (
            <span key={n.id} className="flex items-center gap-1">
              <ChevronRight size={10} className="text-gray-400" />
              <button
                type="button"
                onClick={() => setPath(path.slice(0, idx + 1))}
                disabled={disabled}
                className="text-gray-700 hover:text-primary disabled:opacity-50 dark:text-gray-300"
              >
                {n.name}
              </button>
            </span>
          ))}
        </div>

        {/* Loading / erreur / contenu */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            Chargement…
          </div>
        )}

        {fetchError && (
          <p className="p-4 text-sm text-red-500">{fetchError}</p>
        )}

        {!isLoading && !fetchError && currentNodes.length === 0 && (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
            Aucune sous-catégorie disponible.
          </p>
        )}

        {!isLoading && !fetchError && currentNodes.length > 0 && (
          <div className="max-h-80 overflow-auto">
            {currentNodes
              .filter((n) => !n.is_deprecated && n.is_active)
              .map((node) => (
                <CategoryRow
                  key={node.id}
                  node={node}
                  isSelected={value === node.id}
                  onClick={() => handleClick(node)}
                  disabled={disabled}
                />
              ))}
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE DE CATÉGORIE
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryRowProps {
  node: CategoryTreeNode;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function CategoryRow({ node, isSelected, onClick, disabled }: CategoryRowProps) {
  const hasChildren = (node.children || []).length > 0;

  // Icône dynamique depuis Lucide selon icon_name
  const IconComponent =
    node.icon_name && node.icon_name in LucideIcons
      ? (LucideIcons[node.icon_name as keyof typeof LucideIcons] as React.ComponentType<{
          size?: number;
          className?: string;
        }>)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left text-sm transition-colors last:border-b-0",
        "hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700",
        isSelected && "bg-primary/5 dark:bg-primary/10",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {IconComponent && <IconComponent size={16} className="text-gray-400" />}
      <div className="flex-1">
        <div
          className={cn(
            "font-medium",
            isSelected
              ? "text-primary"
              : "text-gray-900 dark:text-white",
          )}
        >
          {node.name}
        </div>
        {node.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {node.description}
          </div>
        )}
      </div>

      {node.requires_admin_approval && (
        <span
          className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
          title="Modération renforcée requise pour cette catégorie"
        >
          <ShieldAlert size={10} />
          Sensible
        </span>
      )}

      {hasChildren && (
        <ChevronRight size={14} className="text-gray-400" />
      )}
    </button>
  );
}

