/**
 * Statut du relais — ce que voit le gérant quand son relais n'est pas ouvert.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS FAÇONS DE NE PAS ÊTRE OUVERT, ET ELLES NE SE VALENT PAS
 *
 * « En configuration » se répare — il reste des étapes. « Suspendu » se
 * subit — BelivaY a fermé l'accès. « Fermé » se choisit — le gérant l'a
 * déclaré. Les confondre ferait chercher une case à cocher là où il faut
 * appeler le support, ou l'inverse.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA LISTE EST LA MÊME QUE L'ACTIVATION, ET C'EST VOULU
 *
 * Les six étapes viennent des mêmes états réels : pièces du dossier,
 * numéro de versement, convention, visite, formation, capacité et horaires.
 * Deux listes qui divergeraient laisseraient le gérant cocher une étape sur
 * un écran sans que l'autre bouge.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarX2, Check, ChevronRight, Clock3, GraduationCap, Store } from "lucide-react";
import { http } from "@/services/api/http";
import type { RelayTab } from "./relayNav";

interface ComplianceDocument {
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  updated_at?: string;
}

interface TrainingState {
  core_completed: number;
  core_total: number;
}

/** La sanction en cours — voir `_sanction_payload` cote serveur. */
interface Sanction {
  level: number;
  level_display: string;
  max_level: number;
  reason: string;
  /** Une personne a-t-elle tranche, ou le systeme ? */
  issued_by_human: boolean;
  since: string;
  expires_at: string | null;
}

interface TrustPayload {
  sanction: Sanction | null;
  veto_score_cap: number;
}

/** Une fermeture declaree, gardee sur cet appareil. */
interface Fermeture {
  reasonLabel: string;
  from: string;
  to: string;
  jours: number;
}

const STORAGE_FERMETURES = "belivay.relay.closures";

function lireDerniereFermeture(): Fermeture | null {
  try {
    const brut = window.localStorage.getItem(STORAGE_FERMETURES);
    const lu = brut ? JSON.parse(brut) : [];
    return Array.isArray(lu) && lu.length > 0 ? lu[0] : null;
  } catch {
    return null;
  }
}

type Onglet = "configuration" | "suspendu" | "ferme";

const ONGLETS: Array<{ key: Onglet; label: string }> = [
  { key: "configuration", label: "En configuration" },
  { key: "suspendu", label: "Suspendu" },
  { key: "ferme", label: "Fermé" },
];

const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export default function RelayStatus({
  status,
  documents,
  payoutVerified,
  capacity,
  hours,
  onNavigate,
}: {
  /** Statut du profil : APPROVED, PENDING, SUSPENDED. */
  status: string;
  documents: ComplianceDocument[];
  payoutVerified: boolean;
  capacity: number;
  hours: string;
  onNavigate: (tab: RelayTab) => void;
}) {
  const [training, setTraining] = useState<TrainingState | null>(null);
  const [trust, setTrust] = useState<TrustPayload | null>(null);
  const [fermeture] = useState(lireDerniereFermeture);

  useEffect(() => {
    let vivant = true;
    http<TrainingState>("/api/auth/relay-point/training/")
      .then((etat) => {
        if (vivant) setTraining(etat);
      })
      .catch(() => undefined);
    http<TrustPayload>("/api/auth/trust-score/?role=RELAY_POINT")
      .then((payload) => {
        if (vivant) setTrust(payload);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  // L'onglet s'ouvre sur l'etat REEL du relais : un gerant suspendu ne doit
  // pas avoir a chercher pourquoi il ne recoit plus de colis.
  const [onglet, setOnglet] = useState<Onglet>(
    status === "SUSPENDED" ? "suspendu" : "configuration",
  );

  const piece = (type: string) => documents.find((d) => d.document_type === type) ?? null;
  const validee = (type: string) => piece(type)?.status === "APPROVED";
  const visite = piece("FIELD_VALIDATION");
  const formationFaite = Boolean(
    training && training.core_total > 0 && training.core_completed >= training.core_total,
  );

  const ETAPES: Array<{ titre: string; detail: string; fait: boolean; cible: RelayTab }> = [
    {
      titre: "Dossier du gérant",
      detail: validee("MANAGER_ID") ? "Vérifié" : "À envoyer",
      fait: validee("MANAGER_ID") && validee("PREMISES_PHOTOS"),
      cible: "kyc",
    },
    {
      titre: "Numéro de versement",
      detail: payoutVerified ? "Vérifié" : "À confirmer par code",
      fait: payoutVerified,
      cible: "finances",
    },
    {
      titre: "Convention",
      detail: validee("PARTNERSHIP_AGREEMENT") ? "Signée" : "À signer",
      fait: validee("PARTNERSHIP_AGREEMENT"),
      cible: "inscription",
    },
    {
      titre: "Visite de BelivaY",
      detail:
        visite?.status === "APPROVED" && visite.updated_at
          ? `Faite le ${JOUR_MOIS.format(new Date(visite.updated_at))}`
          : "À planifier",
      fait: visite?.status === "APPROVED",
      cible: "inscription",
    },
    {
      titre: "Formation",
      detail: training
        ? `${training.core_completed} module${training.core_completed > 1 ? "s" : ""} sur ${training.core_total}`
        : "À suivre",
      fait: formationFaite,
      cible: "formation",
    },
    {
      titre: "Capacité et horaires",
      detail: capacity > 0 && hours.trim() ? "Déclarés" : "À déclarer",
      fait: capacity > 0 && hours.trim().length > 0,
      cible: "capacite",
    },
  ];

  const sanction = trust?.sanction ?? null;

  const faites = ETAPES.filter((e) => e.fait).length;
  const restantes = ETAPES.length - faites;

  /** Le bandeau sombre, selon l'onglet. */
  const bandeau = {
    configuration: {
      kicker: `En configuration · ${faites} / ${ETAPES.length}`,
      titre:
        restantes === 0
          ? "Tout est prêt pour ouvrir"
          : `Encore ${restantes} étape${restantes > 1 ? "s" : ""} avant d'ouvrir`,
      corps:
        "Tant que le relais n'est pas ouvert, aucun colis ne vous est envoyé et les clients ne vous voient pas.",
    },
    suspendu: {
      kicker: "Suspendu par BelivaY",
      titre: "Votre relais ne reçoit plus",
      corps:
        "Une suspension se lève par BelivaY, pas depuis le portail. Écrivez au support depuis la messagerie : vos colis en stock restent à remettre.",
    },
    ferme: {
      kicker: "Fermeture déclarée",
      titre: "Vous avez fermé vous-même",
      corps:
        "Les clients voient votre date de réouverture. Selon la durée, vos colis restent en garde ou partent au relais le plus proche.",
    },
  }[onglet];

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Statut du relais
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Ce que voit le gérant quand son relais n'est pas « Ouvert ».
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Statut"
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#E8EDF8] p-1 dark:bg-slate-800/70"
      >
        {ONGLETS.map((item) => {
          const on = item.key === onglet;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setOnglet(item.key)}
              className={`rounded-[11px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(60,35,15,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <section
        className="overflow-hidden rounded-[18px] px-[18px] pb-[18px] pt-4 text-white shadow-[0_6px_18px_rgba(14,27,56,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 96% -4%, rgba(239,106,0,.26) 0%, rgba(239,106,0,0) 62%),"
            + " linear-gradient(158deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
        }}
      >
        <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#E8A10E]">
          {bandeau.kicker}
        </p>
        <div className="mt-2 text-[21px] font-black leading-tight">{bandeau.titre}</div>
        <p className="mt-2 text-[13.5px] font-medium leading-[1.5] text-white/80">{bandeau.corps}</p>
      </section>

      {/* La liste n'a de sens que pour la configuration : une suspension ne se
          repare pas en cochant des cases. */}
      {onglet === "configuration" ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-2 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {ETAPES.map((etape) => (
              <li key={etape.titre}>
                <button
                  type="button"
                  onClick={() => onNavigate(etape.cible)}
                  className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition active:scale-[.99]"
                >
                  <span
                    className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${
                      etape.fait
                        ? "bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300"
                    }`}
                  >
                    {etape.fait ? (
                      <Check size={18} strokeWidth={3} />
                    ) : etape.titre === "Formation" ? (
                      <GraduationCap size={18} strokeWidth={2.2} />
                    ) : (
                      <Clock3 size={18} strokeWidth={2.2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {etape.titre}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                      {etape.detail}
                    </span>
                  </span>
                  {etape.fait ? (
                    <span className="flex-shrink-0 rounded-full border border-[#BFE3CF] bg-[#E6F4EC] px-3 py-[5px] text-[12.5px] font-semibold text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Fait
                    </span>
                  ) : (
                    <ChevronRight size={18} className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Suspendu ───────────────────────────────────────────────────────
          Le liseré rouge n'est pas décoratif : une suspension arrête les
          colis ET gèle le score. Elle se conteste, elle ne se répare pas. */}
      {onglet === "suspendu" ? (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <span className="block h-[3px] bg-[#B42318]" aria-hidden />
          <div className="px-5 pb-5 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[#FDECEA] text-[#B42318] dark:bg-red-950/50 dark:text-red-300">
                <AlertTriangle size={21} strokeWidth={2.2} />
              </span>
              <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
                Relais suspendu
              </h3>
            </div>

            <p className="mt-3.5 text-[14px] font-medium leading-[1.55] text-slate-600 dark:text-slate-300">
              {sanction ? (
                <>
                  Depuis le {JOUR_MOIS.format(new Date(sanction.since))} · niveau {sanction.level} sur{" "}
                  {sanction.max_level}
                  {/* Une decision humaine et une sanction automatique ne se
                      contestent pas de la meme facon : on le dit. */}
                  {sanction.issued_by_human
                    ? ", validé par une personne de BelivaY"
                    : ", appliqué automatiquement"}
                  . Motif écrit : {sanction.reason}
                </>
              ) : (
                <>Aucune suspension n'est active sur votre relais aujourd'hui.</>
              )}{" "}
              Aucun nouveau colis ne vous est envoyé. Les colis déjà en stock partent vers le relais
              le plus proche ; les remises en cours restent possibles.
            </p>

            <button
              type="button"
              onClick={() => onNavigate("litiges")}
              className="pr-btn mt-4 w-full rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97]"
            >
              Voir la décision et le motif
            </button>
            <button
              type="button"
              onClick={() => onNavigate("messagerie")}
              className="mt-2.5 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Contester
            </button>
          </div>
        </section>
      ) : null}

      {onglet === "suspendu" ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ["Contestation", "une fois, réponse sous 72 h ouvrées", false],
              ["Versements", "maintenus pour les opérations faites", false],
              [
                "Trust Score",
                // Le plafond vient de `VETO_SCORE_CAP`, pas d'un nombre
                // recopie : c'est lui qui bride reellement le score.
                `gelé sous ${Math.round((trust?.veto_score_cap ?? 39) + 1)} pendant la suspension`,
                true,
              ],
              ["Au retour", "période probatoire", false],
            ].map(([terme, valeur, alerte]) => (
              <div key={String(terme)} className="flex items-start justify-between gap-4 py-3">
                <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{terme}</dt>
                <dd
                  className={`text-right text-[14px] font-black ${
                    alerte ? "text-[#B42318] dark:text-red-400" : "text-slate-900 dark:text-white"
                  }`}
                >
                  {valeur}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* ── Fermé ──────────────────────────────────────────────────────── */}
      {onglet === "ferme" ? (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <span className="block h-[3px] bg-[#8A5A00]" aria-hidden />
          <div className="px-5 pb-5 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[#FFF4D6] text-[#8A5A00] dark:bg-amber-950/50 dark:text-amber-300">
                <CalendarX2 size={21} strokeWidth={2.2} />
              </span>
              <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
                Fermé temporairement
              </h3>
            </div>

            <p className="mt-3.5 text-[14px] font-medium leading-[1.55] text-slate-600 dark:text-slate-300">
              {fermeture ? (
                <>
                  {fermeture.reasonLabel} du {JOUR_MOIS.format(new Date(`${fermeture.from}T00:00:00`))}{" "}
                  au {JOUR_MOIS.format(new Date(`${fermeture.to}T00:00:00`))}. Réouverture le{" "}
                  {JOUR_MOIS.format(
                    new Date(new Date(`${fermeture.to}T00:00:00`).getTime() + 86_400_000),
                  )}
                  .{" "}
                  {/* Pas de relais nomme : aucune donnee ne dit vers lequel
                      les colis partent, et en inventer un enverrait le gerant
                      repondre une adresse fausse a ses clients. */}
                  {fermeture.jours > 1
                    ? "Vos colis partent au relais partenaire le plus proche ; les clients sont prévenus et reçoivent un nouveau code."
                    : "Vos colis restent en garde chez vous ; les clients voient votre date de réouverture."}
                </>
              ) : (
                <>
                  Aucune fermeture n'est déclarée depuis cet appareil. Déclarez-en une pour prévenir
                  BelivaY et vos clients.
                </>
              )}
            </p>

            <button
              type="button"
              onClick={() => onNavigate("fermeture")}
              className="mt-4 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {fermeture ? "Modifier ou rouvrir plus tôt" : "Déclarer une fermeture"}
            </button>
          </div>
        </section>
      ) : null}

      <p className="flex items-start gap-2.5 rounded-[14px] bg-[#EAF0FF] px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-[#1E4BC4] dark:bg-blue-950/40 dark:text-blue-200">
        <Store size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />
        Le statut s'affiche aussi dans la pastille de l'en-tête : « En configuration », « Suspendu »
        (rouge) ou « Fermé jusqu'au … » (ambre).
      </p>
    </div>
  );
}
