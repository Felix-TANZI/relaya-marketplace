/**
 * Les avis des clients.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE NOTE QU'ON SUBIT, DES PHRASES QU'ON PEUT CORRIGER
 *
 * La moyenne ne dit rien d'actionnable : un gérant à 4,6 ne sait pas s'il
 * doit ouvrir plus tôt ou ranger mieux. Ce sont les MOTS qui le disent.
 *
 * D'où le bloc « Ce qui revient le plus », calculé sur les commentaires
 * réels : cinq thèmes, comptés, colorés selon qu'ils félicitent ou
 * reprochent. C'est la seule partie de l'écran sur laquelle on peut agir
 * dès le lendemain.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LES AVIS NE SE RÉPONDENT PAS ICI
 *
 * L'anonymat V5 ch.1 interdit le contact direct avec un acheteur. Un avis
 * blessant ou faux se conteste auprès de BelivaY, par la messagerie — pas
 * par une réponse publique. Le bandeau du bas le dit, parce que c'est le
 * premier réflexe de quiconque a déjà tenu un commerce.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { http } from "@/services/api/http";

interface RelayReview {
  id: number;
  rating: number;
  comment: string;
  author_initials: string;
  parcel_ref: string;
  thanked_at: string | null;
  created_at: string;
}

interface RelayReviewPayload {
  summary: { average: number; count: number; distribution: Record<string, number> };
  results: RelayReview[];
}

const NIVEAUX = [5, 4, 3, 2, 1];

/**
 * Les thèmes cherchés dans les commentaires.
 *
 * Rien de savant : un mot-clé, une couleur. Un thème vert félicite, un
 * ambre prévient, un rouge reproche. La liste est volontairement courte —
 * cinq étiquettes se lisent, quinze se survolent.
 */
const THEMES: Array<{ label: string; tone: "good" | "warn" | "bad"; mots: string[] }> = [
  { label: "Rapide", tone: "good", mots: ["rapide", "vite", "rapidement", "efficace"] },
  { label: "Accueillant", tone: "good", mots: ["accueil", "aimable", "gentil", "souriant", "sympa", "poli"] },
  { label: "Bien rangé", tone: "good", mots: ["range", "propre", "organise", "ordre", "soigne"] },
  { label: "Attente", tone: "warn", mots: ["attente", "attendre", "attendu", "queue", "monde", "lent"] },
  { label: "Horaires", tone: "bad", mots: ["horaire", "ferme", "fermait", "fermeture", "retard"] },
];

const THEME_TONE: Record<"good" | "warn" | "bad", string> = {
  good: "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F]",
  warn: "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A]",
  bad: "border-[#F2B8B8] bg-[#FDECEC] text-[#D84B4B]",
};

const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** « hier », « lundi », « 12 sept. » — l'échelle que l'on a en tête. */
function quand(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const jour = new Date(date);
  jour.setHours(0, 0, 0, 0);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const ecart = Math.round((aujourdhui.getTime() - jour.getTime()) / 86_400_000);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 7) return JOUR_SEMAINE.format(date);
  return JOUR_COURT.format(date);
}

/** Sans accents ni casse : « rangé » et « range » sont le même mot. */
function aplatir(texte: string) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Etoiles({ note, taille = "text-[15px]" }: { note: number; taille?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] leading-none ${taille}`} aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <span key={index} aria-hidden className={index <= note ? "text-[#F58A1F]" : "text-slate-300 dark:text-slate-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function RelayReviews({ onError }: { onError: (error: unknown) => void }) {
  // Etat vide des le depart : un echec de chargement laisse alors l'ecran
  // dans sa forme « aucun avis » sans avoir a le reecrire depuis le catch.
  const [payload, setPayload] = useState<RelayReviewPayload>({
    summary: { average: 0, count: 0, distribution: {} },
    results: [],
  });

  // Chargement par `.then` et non par `await` : la mise a jour d'etat doit
  // vivre dans un callback, pas dans le corps de l'effet, sinon elle declenche
  // un rendu en cascade — meme motif que les autres ecrans du portail.
  const load = useCallback(() => {
    http<RelayReviewPayload>("/api/shipping/relay-point/reviews/")
      .then(setPayload)
      .catch(onError);
  }, [onError]);

  useEffect(load, [load]);

  const { summary, results: reviews } = payload;
  const total = summary.count;

  /** Les thèmes réellement présents, du plus cité au moins cité. */
  const themes = useMemo(() => {
    const textes = reviews.map((review) => aplatir(review.comment || ""));
    return THEMES.map((theme) => ({
      ...theme,
      compte: textes.filter((texte) => theme.mots.some((mot) => texte.includes(mot))).length,
    }))
      .filter((theme) => theme.compte > 0)
      .sort((a, b) => b.compte - a.compte);
  }, [reviews]);

  return (
    <div className="space-y-4">
      {/* ── La note ──────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[18px] bg-gradient-to-br from-[#F79020] via-[#F07E16] to-[#E85D04] px-5 pb-5 pt-5 text-white shadow-[0_8px_22px_rgba(232,93,4,.3)]">
        <div className="flex items-end gap-4">
          <span className="text-[52px] font-black leading-[0.85] tracking-[-0.03em]">
            {total > 0 ? summary.average.toFixed(1).replace(".", ",") : "—"}
          </span>
          <div className="min-w-0 pb-1">
            <Etoiles note={Math.round(summary.average)} taille="text-[19px]" />
            <div className="mt-1 truncate text-[13px] font-medium text-white/90">
              {total > 0 ? `${total} avis` : "Aucun avis pour l'instant"}
            </div>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {NIVEAUX.map((niveau) => {
            const compte = summary.distribution[String(niveau)] ?? 0;
            const part = total > 0 ? (compte / total) * 100 : 0;
            return (
              <li key={niveau} className="flex items-center gap-2.5">
                <span className="w-2 flex-shrink-0 text-[13px] font-black">{niveau}</span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-700"
                    style={{ width: `${part}%` }}
                  />
                </span>
                <span className="w-6 flex-shrink-0 text-right text-[13px] font-black">{compte}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Ce qui revient ───────────────────────────────────────────────── */}
      {themes.length > 0 ? (
        <section>
          <h3 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Ce qui revient le plus
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((theme) => (
              <span
                key={theme.label}
                className={`rounded-full border px-3.5 py-[6px] text-[13px] font-semibold ${THEME_TONE[theme.tone]}`}
              >
                {theme.label} · {theme.compte}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Les avis ─────────────────────────────────────────────────────
          Décalés une ligne sur deux : la colonne de cartes identiques se lit
          comme un tableau, l'alternance comme des voix distinctes. */}
      {reviews.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-[13.5px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
          Les avis arrivent sept jours après le premier retrait.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review, index) => (
            <li
              key={review.id}
              className={`rounded-[14px] border border-slate-200/70 bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900 ${
                index % 2 === 0 ? "mr-5" : "ml-5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <Etoiles note={review.rating} />
                <span className="flex-shrink-0 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                  {quand(review.created_at)}
                </span>
              </div>
              {review.comment ? (
                <p className="mt-2 text-[14.5px] font-medium leading-[1.5] text-slate-900 dark:text-white">
                  «&nbsp;{review.comment}&nbsp;»
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* ── Les règles ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <Lock size={18} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
          Les avis sont anonymes, ouverts 7 jours après le retrait. Un avis n'est retiré que pour une
          insulte, une donnée personnelle ou un hors-sujet, avec un motif tracé. Vous pouvez répondre
          en privé depuis la Messagerie.
        </p>
      </div>
    </div>
  );
}
