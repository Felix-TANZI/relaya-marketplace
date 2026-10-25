// frontend/src/features/interets/InteretsPage.tsx
// « Ce qui t'intéresse » — feuille de route D9 :
//   « Proposer à la première ouverture une page où le client choisit les types de produits qui l'intéressent ;
//     il peut la passer et modifier ses choix dans son profil. »
// Les choix (les univers, c'est-à-dire les catégories racines de la vitrine) partent dans PUT /api/me/interets :
// l'accueil et les Flash Deals sont ensuite rangés dans cet ordre (GET /api/catalog/home/, /flash-deals/).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import useStorefrontCategories from "@/hooks/useStorefrontCategories";
import { http } from "@/services/api/http";

/** Marque « déjà proposée » : la page ne revient pas d'elle-même, le client la retrouve dans son profil. */
export const CLE_INTERETS_PROPOSES = "belivay_interets_proposes";

export function marquerInteretsProposes() {
  try {
    window.localStorage.setItem(CLE_INTERETS_PROPOSES, "1");
  } catch {
    /* navigation privée : la page pourra revenir, sans gravité */
  }
}

export function interetsDejaProposes() {
  try {
    return window.localStorage.getItem(CLE_INTERETS_PROPOSES) === "1";
  } catch {
    return true;
  }
}

export default function InteretsPage() {
  const navigate = useNavigate();
  const { categories, loading } = useStorefrontCategories();
  const univers = categories.filter((c) => c.slug !== "all" && c.node);
  const [choix, setChoix] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    http<string[]>("/api/me/interets").then(setChoix).catch(() => undefined);
  }, []);

  const basculer = (slug: string) =>
    setChoix((actuels) => (actuels.includes(slug) ? actuels.filter((s) => s !== slug) : [...actuels, slug]));

  const terminer = () => {
    marquerInteretsProposes();
    navigate("/");
  };

  const enregistrer = async () => {
    setEnCours(true);
    setErreur("");
    try {
      await http("/api/me/interets", { method: "PUT", body: JSON.stringify({ univers: choix }) });
      terminer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Qu'est-ce qui t'intéresse ?</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Choisis tes univers : ils passeront en premier sur l'accueil et dans les ventes flash. Tu peux changer d'avis
        à tout moment dans ton profil.
      </p>
      {loading ? (
        <p className="mt-6 text-sm">Chargement…</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {univers.map((u) => {
            const actif = choix.includes(u.slug);
            const Icone = u.icon;
            return (
              <button
                key={u.slug}
                type="button"
                aria-pressed={actif}
                onClick={() => basculer(u.slug)}
                className={`relative flex items-center gap-3 rounded-2xl border p-4 text-left font-semibold transition ${
                  actif ? "border-primary bg-primary/10 text-primary" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                <Icone size={20} />
                <span>{u.name}</span>
                {actif && <Check size={16} className="absolute right-3 top-3" />}
              </button>
            );
          })}
        </div>
      )}
      {erreur && <p role="alert" className="mt-4 text-sm text-red-600">{erreur}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={enCours}
          onClick={() => void enregistrer()}
          className="rounded-full bg-primary px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          Enregistrer mes choix
        </button>
        <button type="button" onClick={terminer} className="rounded-full border px-6 py-3 font-bold">
          Passer
        </button>
      </div>
    </div>
  );
}
