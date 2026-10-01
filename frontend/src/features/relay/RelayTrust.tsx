/**
 * Le Trust Score du point relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN SCORE QU'ON PEUT CONTESTER
 *
 * Une note publique qui décide du chiffre d'affaires et qu'on ne peut pas
 * expliquer, c'est une sanction. L'écran est donc construit pour répondre,
 * dans l'ordre, aux trois questions qu'un gérant pose quand son score
 * baisse : combien, à cause de quoi, et qu'est-ce que j'y peux.
 *
 * D'où les cinq critères affichés avec LEUR POIDS. Sans le poids, un gérant
 * travaille la satisfaction quand c'est la ponctualité qui le coûte — et il
 * conclut que le score est arbitraire.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE SERVEUR DONNE
 *
 * `/api/auth/trust-score/?role=RELAY_POINT` renvoie le score, le palier, le
 * détail par critère (score, poids, échantillon), le plafond de valeur et
 * l'éventuel veto. Tout ce qui est affiché ici en vient. Ce que le serveur
 * ne garde pas — l'historique du score — n'est pas inventé.
 */
import { useCallback, useEffect, useState } from "react";
import { Camera, Clock, Layers, MessageCircle, ShieldCheck, Star, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";

interface TrustBreakdownEntry {
  score: number;
  weight: number;
  samples: number;
}

export interface RelayTrustScore {
  role: string;
  score: number;
  tier: string;
  tier_display: string;
  parcel_value_cap_xaf: number | null;
  veto_active: boolean;
  veto_reason: string;
  breakdown: Record<string, TrustBreakdownEntry>;
  sample_size: number;
  candidate_tier: string;
  calculated_at: string | null;
}

/** Les cinq critères, dans l'ordre où le contrat les pèse. */
const CRITERIA: Array<[string, string]> = [
  ["punctuality", "Ponctualité"],
  ["security", "Sécurité du stockage"],
  ["satisfaction", "Satisfaction"],
  ["disputes", "Litiges"],
  ["seniority", "Ancienneté"],
];

/** Ce sur quoi un gérant peut agir dès demain matin. */
const LEVIERS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Camera, label: "Photo à chaque remise" },
  { icon: Clock, label: "Horaires tenus" },
  { icon: MessageCircle, label: "Répondre vite à BelivaY" },
];

/** Demi-cercle de la jauge : rayon 80 dans un viewBox de 200. */
const ARC = Math.PI * 80;

const JOUR = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric" });

export default function RelayTrust({
  onError,
  onNavigate,
}: {
  onError: (error: unknown) => void;
  onNavigate?: (tab: "avis" | "niveaux") => void;
}) {
  const [trust, setTrust] = useState<RelayTrustScore | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrust(await http<RelayTrustScore>("/api/auth/trust-score/?role=RELAY_POINT"));
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const score = Math.min(100, Math.max(0, Math.round(trust?.score ?? 0)));
  const rempli = (score / 100) * ARC;

  return (
    <div className="space-y-4">
      {/* ── La note ──────────────────────────────────────────────────────
          Une jauge plutôt qu'un chiffre seul : le score se lit d'abord comme
          une position — ce qui reste à gagner, et de quel côté on penche. */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-6 text-center shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="relative mx-auto w-full max-w-[260px]">
          <svg viewBox="0 0 200 118" className="w-full" aria-hidden>
            <defs>
              <linearGradient id="trust-arc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2F5FD8" />
                <stop offset="55%" stopColor="#8A8AA8" />
                <stop offset="100%" stopColor="#E8590C" />
              </linearGradient>
            </defs>
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              strokeWidth="17"
              strokeLinecap="round"
              className="stroke-slate-200 dark:stroke-slate-700"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#trust-arc)"
              strokeWidth="17"
              strokeLinecap="round"
              strokeDasharray={`${rempli} ${ARC}`}
              className="transition-[stroke-dasharray] duration-700"
            />
          </svg>

          <div className="absolute inset-x-0 bottom-1">
            <div className="text-[52px] font-black leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
              {loading ? "—" : score}
            </div>
            <div className="mt-1 text-[13px] font-medium text-slate-400 dark:text-slate-500">sur 100</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#E8EEFC] px-3.5 py-[6px] text-[13px] font-bold text-[#2A5BD7] dark:bg-blue-950 dark:text-blue-200">
            {trust?.tier_display || "Palier en attente"}
          </span>
          {/* Le palier candidat est la seule projection que le serveur donne.
              On ne fabrique pas de « +2 cette semaine » : l'historique du
              score n'est pas conservé. */}
          {trust?.candidate_tier && trust.candidate_tier !== trust.tier ? (
            <span className="rounded-full bg-[#E8F6EC] px-3.5 py-[6px] text-[13px] font-bold text-[#2E7D4F] dark:bg-emerald-950 dark:text-emerald-300">
              En passe de devenir {trust.candidate_tier}
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
          Visible par les clients quand ils choisissent leur relais.
          {trust?.calculated_at ? (
            <>
              {" "}Calculé <strong className="font-black text-slate-700 dark:text-slate-200">
                {JOUR.format(new Date(trust.calculated_at))}
              </strong>
              {trust.sample_size > 0 ? ` sur ${trust.sample_size} opérations.` : "."}
            </>
          ) : (
            " Il reste à 0 tant que BelivaY n'a pas assez d'opérations pour le calculer."
          )}
        </p>
      </section>

      {/* ── Le détail ────────────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Les 5 critères
        </h3>

        <ul className="mt-3 space-y-3.5">
          {CRITERIA.map(([cle, label]) => {
            const entree = trust?.breakdown?.[cle];
            const valeur = Math.min(100, Math.max(0, Math.round(entree?.score ?? 0)));
            const poids = Math.round((entree?.weight ?? 0) * 100);
            return (
              <li key={cle}>
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 text-[15.5px] font-black leading-tight text-slate-900 dark:text-white">
                    {label}
                  </span>
                  {poids > 0 ? (
                    <span className="flex-shrink-0 text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
                      poids {poids} %
                    </span>
                  ) : null}
                  <span className="w-[38px] flex-shrink-0 text-right text-[21px] font-black leading-none text-slate-900 dark:text-white">
                    {valeur}
                  </span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#E9A93A] to-[#2F5FD8] transition-[width] duration-700"
                    style={{ width: `${valeur}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[13px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
          Ponctualité : colis reçus à l'heure et remis sans attente. Sécurité : scellés contrôlés,
          photos de remise, aucun colis perdu. Ancienneté : monte avec le temps sans incident.
        </p>
        <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
          Recalcul chaque nuit, baisse de 8 points au plus par recalcul, score gelé après 30 jours
          sans activité. Un dossier en cours ne vous pénalise jamais. Chaque calcul et chaque
          décision restent dans un journal consultable.
        </p>
      </section>

      {/* ── Les trois leviers ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {LEVIERS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-[14px] border border-slate-200/70 bg-white px-3.5 py-3.5 shadow-[0_2px_6px_rgba(15,23,42,.05)] dark:border-slate-800 dark:bg-slate-900"
          >
            <Icon size={20} strokeWidth={2.2} className="text-[#E8590C] dark:text-orange-400" />
            <div className="mt-3 text-[14px] font-black leading-tight text-slate-900 dark:text-white">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Ce qui ne se décide pas tout seul ────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-[14px] border border-[#F2C4C4] bg-[#FDECEC] px-4 py-3.5 dark:border-red-900 dark:bg-red-950/40">
        <TriangleAlert size={19} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#D84B4B] dark:text-red-300" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-[#8A3B3B] dark:text-red-100/85">
          {trust?.veto_active && trust.veto_reason
            ? trust.veto_reason
            : "Un colis perdu ou ouvert au relais ouvre une enquête. Une sanction n'est jamais automatique : proposée par le système, elle est validée par une personne, avec un motif écrit, et vous pouvez la contester une fois."}
        </p>
      </div>

      {/* ── Les deux détours ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.("avis")}
          className="flex items-center justify-center gap-2.5 rounded-[14px] border border-slate-200/70 bg-white px-3 py-3.5 text-[15px] font-bold text-slate-800 shadow-[0_2px_6px_rgba(15,23,42,.05)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <Star size={18} strokeWidth={2.2} /> Avis clients
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("niveaux")}
          className="flex items-center justify-center gap-2.5 rounded-[14px] border border-slate-200/70 bg-white px-3 py-3.5 text-[15px] font-bold text-slate-800 shadow-[0_2px_6px_rgba(15,23,42,.05)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <Layers size={18} strokeWidth={2.2} /> Paliers
        </button>
      </div>

      {/* ── Le plafond ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-[14px] bg-[#EEF3FE] px-4 py-3.5 dark:bg-blue-950/40">
        <ShieldCheck size={19} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#5B7FC7] dark:text-blue-300" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-[#4A5E8A] dark:text-blue-100/80">
          {trust?.parcel_value_cap_xaf
            ? `Votre palier plafonne la valeur d'un colis à ${trust.parcel_value_cap_xaf.toLocaleString("fr-FR")} F. Au-delà, le colis est orienté vers un relais d'un palier supérieur.`
            : "Pas de plafond de valeur par colis pour les relais : la protection vient des preuves photo, du PIN de remise et, dès 100 000 F, du porteur nommé par le client avec pièce vérifiée."}
        </p>
      </div>
    </div>
  );
}
