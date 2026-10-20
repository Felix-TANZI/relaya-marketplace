// frontend/src/hooks/useStorefrontCategories.ts
// Arbre des catégories de la vitrine, chargé une fois et partagé par la
// sidebar, le tiroir mobile, l'accueil et les pages catégorie.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { categoriesApi, type CategoryTreeNode } from "@/services/api/categories";
import { buildStorefrontCategories, type StorefrontCategory } from "@/data/storefrontCategories";

/* Une catégorie créée par l'admin apparaît au plus tard après ce délai. */
const TTL_MS = 5 * 60 * 1000;

// Le nom/description des catégories est traduit côté backend selon la langue
// de la requête (Accept-Language) : le cache doit donc être tenu PAR LANGUE,
// sinon basculer FR/EN réaffiche l'arbre figé dans la langue du tout premier
// chargement jusqu'à expiration du TTL.
const cached = new Map<string, { tree: CategoryTreeNode[]; at: number }>();
const inflight = new Map<string, Promise<CategoryTreeNode[]>>();

function loadTree(lang: string): Promise<CategoryTreeNode[]> {
  const hit = cached.get(lang);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.tree);
  const pending = inflight.get(lang);
  if (pending) return pending;
  const request = categoriesApi
    .tree()
    .then((tree) => {
      cached.set(lang, { tree, at: Date.now() });
      return tree;
    })
    .finally(() => {
      inflight.delete(lang);
    });
  inflight.set(lang, request);
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [tree, setTree] = useState<CategoryTreeNode[] | null>(() => cached.get(lang)?.tree ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Pas de hit en cache pour CETTE langue : on vide l'affichage plutôt que
    // de laisser l'arbre de l'ancienne langue le temps du refetch.
    setTree(cached.get(lang)?.tree ?? null);
    loadTree(lang)
      .then((next) => {
        if (!cancelled) setTree(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const loading = tree === null && !failed;
  const categories = useMemo(
    // Pendant le premier chargement, on ne montre que « Tout voir » plutôt que
    // des thèmes statiques qui seraient aussitôt remplacés.
    // `lang` est inclus pour que le texte des thèmes statiques (repli et photos
    // sans image admin) se retraduise dès le changement de langue.
    () =>
      loading
        ? buildStorefrontCategories([], t).slice(0, 1)
        : buildStorefrontCategories(tree ?? [], t),
    [loading, tree, t, lang],
  );

  return { tree: tree ?? [], categories, loading };
}

/** Pour les tests : repart d'un cache vide. */
export function resetStorefrontCategoriesCache() {
  cached.clear();
  inflight.clear();
}
