// frontend/src/hooks/useStorefrontCategories.ts
// Arbre des catégories de la vitrine, chargé une fois et partagé par la
// sidebar, le tiroir mobile, l'accueil et les pages catégorie.

import { useEffect, useMemo, useState } from "react";
import { categoriesApi, type CategoryTreeNode } from "@/services/api/categories";
import { buildStorefrontCategories, type StorefrontCategory } from "@/data/storefrontCategories";

/* Une catégorie créée par l'admin apparaît au plus tard après ce délai. */
const TTL_MS = 5 * 60 * 1000;

let cached: { tree: CategoryTreeNode[]; at: number } | null = null;
let inflight: Promise<CategoryTreeNode[]> | null = null;

function loadTree(): Promise<CategoryTreeNode[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.tree);
  if (inflight) return inflight;
  const request = categoriesApi
    .tree()
    .then((tree) => {
      cached = { tree, at: Date.now() };
      return tree;
    })
    .finally(() => {
      inflight = null;
    });
  inflight = request;
  return request;
}

export interface StorefrontCategoriesState {
  /** Arbre brut en base (racines avec enfants imbriqués). Vide tant qu'il charge. */
  tree: CategoryTreeNode[];
  /** « Tout voir » puis les racines — ou les thèmes statiques en repli. */
  categories: StorefrontCategory[];
  loading: boolean;
}

export default function useStorefrontCategories(): StorefrontCategoriesState {
  const [tree, setTree] = useState<CategoryTreeNode[] | null>(() => cached?.tree ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTree()
      .then((next) => {
        if (!cancelled) setTree(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = tree === null && !failed;
  const categories = useMemo(
    // Pendant le premier chargement, on ne montre que « Tout voir » plutôt que
    // des thèmes statiques qui seraient aussitôt remplacés.
    () => (loading ? buildStorefrontCategories([]).slice(0, 1) : buildStorefrontCategories(tree ?? [])),
    [loading, tree],
  );

  return { tree: tree ?? [], categories, loading };
}

/** Pour les tests : repart d'un cache vide. */
export function resetStorefrontCategoriesCache() {
  cached = null;
  inflight = null;
}
