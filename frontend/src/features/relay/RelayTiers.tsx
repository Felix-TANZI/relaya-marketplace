/**
 * Paliers — où en est le relais, et ce que la marche suivante lui apporte.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN PALIER SE MÉRITE SUR DEUX CONDITIONS, PAS UNE
 *
 * `ROLE_TIER_RULES[RELAY_POINT]` exige un SCORE **et** un VOLUME : Confirmé
 * demande 65 points et 31 colis, Premium 75 points et 101 colis. Un gérant
 * irréprochable sur vingt colis reste Starter, et il doit le savoir — sinon
 * il attend une promotion qui ne viendra pas, et croit le système cassé.
 *
 * L'échelle n'est pas recopiée ici : elle arrive du serveur
 * (`trust_score_payload.tier_rules`). Les seuils du point relais ne sont pas
 * ceux du livreur, et une constante dupliquée finirait par annoncer un
 * palier que le serveur n'accorde pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CHAQUE PALIER DONNE
 *
 * Les avantages, eux, sont contractuels et ne vivent dans aucune table. Ils
 * sont donc écrits ci-dessous — et c'est assumé : ce sont des engagements,
 * pas des données. Ils ne bougeront que si le contrat bouge.
 */
import { useEffect, useState } from "react";
import { Check, Layers } from "lucide-react";
import { http } from "@/services/api/http";

interface TierRule {
  tier: string;
  tier_display: string;
  min_score: number;
  min_volume: number;
  audit_required: boolean;
}

interface TrustPayload {
  score: number;
  tier: string;
  tier_display: string;
  volume: number;
  candidate_tier: string;
  candidate_tier_display: string;
  candidate_since: string | null;
  tier_rules: TierRule[];
  hysteresis_days: number;
  hysteresis_points: number;
}

/** Les avantages par palier — engagements contractuels, pas données. */
const AVANTAGES: Record<string, string[]> = {
  NEW: [
    "Colis petits, moyens et encombrants (sauf si vous refusez les encombrants)",
    "Versement chaque vendredi, sans frais",
    "Accompagnement renforcé du support les 30 premiers jours",
  ],
  CONFIRMED: [
    "Badge « Confirmé » visible au choix du relais",
    "Proposé en premier aux clients de votre zone",
    "Hausse de capacité jusqu'à +20 % validée à distance, sans attendre une visite",
    "Colis de plus de 100 000 F orientés en priorité vers vous",
  ],
  GOLD: [
    "Tous les avantages Confirmé",
    "+25 F par colis remis (bonus qualité)",
    "Étagères BelivaY offertes pour agrandir",
    "Relais ambassadeur : prime pour chaque nouveau relais recruté et ouvert",
  ],
};

/** L'ordre de l'échelle, du bas vers le haut. */
const ORDRE = ["NEW", "CONFIRMED", "GOLD"];

const LIBELLE_DEFAUT: Record<string, string> = {
  NEW: "Starter",
  CONFIRMED: "Confirmé",
  GOLD: "Premium",
};

const nf = (n: number) => n.toLocaleString("fr-FR");

export default function RelayTiers() {
  const [trust, setTrust] = useState<TrustPayload | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Repère temporel figé au montage.
   *
   * Lire l'heure pendant le rendu rendrait le composant impur : deux rendus
   * voisins pourraient annoncer « encore 5 jours » puis « encore 4 ».
   * L'initialiseur paresseux de `useState` ne s'exécute qu'une fois.
   */
  const [maintenant] = useState(() => Date.now());

  useEffect(() => {
    let vivant = true;
    http<TrustPayload>("/api/auth/trust-score/?role=RELAY_POINT")
      .then((payload) => {
        if (vivant) setTrust(payload);
      })
      .catch(() => {
        if (vivant) setTrust(null);
      })
      .finally(() => {
        if (vivant) setLoading(false);
      });
    return () => {
      vivant = false;
    };
  }, []);

  const regles = trust?.tier_rules ?? [];
  const regleDe = (tier: string) => regles.find((regle) => regle.tier === tier) ?? null;
  const rang = (tier: string) => ORDRE.indexOf(tier);
  const rangActuel = trust ? rang(trust.tier) : 0;

  /**
   * Le palier suivant, et ce qui manque pour l'atteindre.
   *
   * On nomme les deux conditions séparément : dire « encore 8 points » à
   * quelqu'un qui bloque en réalité sur le volume l'enverrait travailler la
   * mauvaise chose.
   */
  const suivant = trust && rangActuel < ORDRE.length - 1 ? ORDRE[rangActuel + 1] : null;
  const regleSuivante = suivant ? regleDe(suivant) : null;
  const pointsManquants = regleSuivante ? Math.max(0, regleSuivante.min_score - (trust?.score ?? 0)) : 0;
  const colisManquants = regleSuivante ? Math.max(0, regleSuivante.min_volume - (trust?.volume ?? 0)) : 0;

  /** Jours déjà tenus au-dessus du seuil, via `candidate_since`. */
  const joursTenus = (() => {
    if (!trust?.candidate_since) return null;
    const depuis = new Date(trust.candidate_since);
    if (Number.isNaN(depuis.getTime())) return null;
    return Math.floor((maintenant - depuis.getTime()) / 86_400_000);
  })();

  const phrase = (() => {
    if (!trust) return "";
    const score = `${nf(Math.round(trust.score))} aujourd'hui`;
    if (!regleSuivante) return `${score} · vous êtes au palier le plus haut.`;
    const manques: string[] = [];
    if (pointsManquants > 0) manques.push(`${nf(Math.ceil(pointsManquants))} points`);
    if (colisManquants > 0) manques.push(`${nf(colisManquants)} colis`);
    if (manques.length > 0) {
      return `${score} · il manque ${manques.join(" et ")} pour passer ${regleSuivante.tier_display}.`;
    }
    // Les deux conditions sont tenues : il ne reste que la duree.
    const restants = Math.max(0, trust.hysteresis_days - (joursTenus ?? 0));
    return restants > 0
      ? `${score} · encore ${restants} jour${restants > 1 ? "s" : ""} au-dessus de ${nf(regleSuivante.min_score)} pour passer ${regleSuivante.tier_display}.`
      : `${score} · conditions tenues, ${regleSuivante.tier_display} en cours de validation.`;
  })();

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Paliers
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Votre palier suit votre Trust Score, tenu dans la durée.
        </p>
      </header>

      {/* ── L'échelle ──────────────────────────────────────────────────── */}
      <section
        className="overflow-hidden rounded-[18px] px-[18px] pb-[18px] pt-5 text-white shadow-[0_6px_18px_rgba(14,27,56,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 96% -4%, rgba(239,106,0,.28) 0%, rgba(239,106,0,0) 62%),"
            + " linear-gradient(158deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
        }}
      >
        {loading ? (
          <p className="py-4 text-[13.5px] font-medium text-white/60">Lecture de votre palier…</p>
        ) : !trust ? (
          <p className="py-4 text-[13.5px] font-medium text-white/60">
            Votre Trust Score n'est pas encore disponible.
          </p>
        ) : (
          <>
            <div className="flex items-start">
              {ORDRE.map((tier, index) => {
                const regle = regleDe(tier);
                const atteint = index <= rangActuel;
                const courant = index === rangActuel;
                // Le trait qui PRECEDE ce palier est allume des que le palier
                // precedent est acquis : il montre le chemin parcouru.
                const traitAllume = index <= rangActuel;
                return (
                  <div key={tier} className="flex min-w-0 flex-1 items-start">
                    {index > 0 ? (
                      <span
                        className={`mt-[21px] h-[3px] min-w-0 flex-1 ${
                          traitAllume ? "bg-[#F58A1F]" : "bg-white/15"
                        }`}
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex flex-col items-center px-1">
                      <span
                        className={`flex h-[45px] w-[45px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-black ${
                          courant
                            ? "bg-[#F58A1F] ring-4 ring-[#F58A1F]/25"
                            : atteint
                              ? "bg-[#F58A1F]/20 text-[#E8A10E] ring-2 ring-[#F58A1F]"
                              : "bg-white/10 text-white/55"
                        }`}
                      >
                        {courant ? (
                          <span className="h-[13px] w-[13px] rounded-full bg-white" aria-hidden />
                        ) : (
                          nf(regle?.min_score ?? 0)
                        )}
                      </span>
                      <span
                        className={`mt-2 text-center text-[12.5px] font-black leading-tight ${
                          courant ? "text-[#E8A10E]" : atteint ? "text-white" : "text-white/55"
                        }`}
                      >
                        {regle?.tier_display ?? LIBELLE_DEFAUT[tier]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-[13.5px] font-medium leading-[1.5] text-white/80">{phrase}</p>
          </>
        )}
      </section>

      {/* ── Les paliers, du bas vers le haut ───────────────────────────── */}
      {ORDRE.map((tier) => {
        const regle = regleDe(tier);
        const courant = trust?.tier === tier;
        return (
          <section
            key={tier}
            className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Le liseré orange tient lieu de titre coloré : il marque la
                marche sans répéter l'orange dans le texte. */}
            <span className="block h-[3px] bg-gradient-to-r from-[#F58A1F] to-[#EF6A00]" aria-hidden />
            <div className="px-5 pb-4 pt-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
                  {regle?.tier_display ?? LIBELLE_DEFAUT[tier]}
                </h3>
                {courant ? (
                  <span className="flex-shrink-0 rounded-full border border-[#F0DA9C] bg-[#FFF4D6] px-3 py-[5px] text-[12.5px] font-bold text-[#8A5A00] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Votre palier
                  </span>
                ) : regle ? (
                  // Les DEUX conditions, pas seulement le score : c'est le
                  // volume qui bloque le plus souvent un bon relais.
                  <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-[5px] text-[12.5px] font-bold tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    ≥ {nf(regle.min_score)} · {nf(regle.min_volume)} colis
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 space-y-2.5">
                {(AVANTAGES[tier] ?? []).map((avantage) => (
                  <li key={avantage} className="flex items-start gap-2.5">
                    <Check
                      size={17}
                      strokeWidth={3}
                      className="mt-[2px] flex-shrink-0 text-[#EF6A00] dark:text-orange-400"
                    />
                    <span className="text-[14px] font-medium leading-snug text-slate-700 dark:text-slate-200">
                      {avantage}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      {/* ── Ce qui protège un palier acquis ────────────────────────────── */}
      <section className="flex items-start gap-2.5 rounded-[14px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <Layers size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0 text-slate-400 dark:text-slate-500" />
        <p className="text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
          {/* Les trois nombres viennent de `HYSTERESIS_DAYS` et
              `HYSTERESIS_POINTS` : un palier perdu est un revenu perdu, la
              phrase ne doit pas dépendre d'une constante recopiée. */}
          Un palier ne se perd qu'après {trust?.hysteresis_days ?? 14} jours sous le seuil, avec{" "}
          {nf(trust?.hysteresis_points ?? 5)} points de marge, et la descente est validée par une
          personne. Vous êtes alerté 3 points avant chaque seuil.
        </p>
      </section>
    </div>
  );
}
