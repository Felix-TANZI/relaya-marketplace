/**
 * Activation et partenariat — où en est l'ouverture du relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIX ÉTAPES, TOUTES VÉRIFIÉES
 *
 * Chaque étape se lit d'un état réel : les pièces du dossier
 * (`ComplianceDocument`), le numéro de versement (`PayoutAccount`), la
 * visite de terrain, la formation (`RelayTrainingCompletion`), la capacité
 * et les horaires déclarés sur le profil.
 *
 * Aucune n'est cochée « parce que le compte est approuvé ». Un gérant à qui
 * l'on montre six coches alors qu'il manque sa convention découvrira le
 * problème le jour où un versement ne partira pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI N'EXISTE PAS ENCORE
 *
 * `RelayPointProfile` ne porte aucun statut de partenaire fondateur ni
 * d'exclusivité de zone. Ces avantages sont contractuels et écrits ici
 * comme tels — l'écran les présente comme les termes du partenariat, pas
 * comme des réglages lus quelque part.
 */
import { useEffect, useState } from "react";
import { BadgeCheck, Check, CreditCard, Download, FileText, MapPin, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";

interface ComplianceDocument {
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
  updated_at?: string;
}

interface TrainingState {
  completed_count: number;
  total_modules: number;
  core_completed: number;
  core_total: number;
}

export interface RelayActivationProps {
  relay: {
    name: string;
    city: string;
    address: string;
    /** ISO 8601 — date de création du compte relais. */
    openedAt: string;
    capacity: number;
    hours: string;
  };
  documents: ComplianceDocument[];
  /** Le numéro de versement est-il vérifié par code ? */
  payoutVerified: boolean;
}

/** Les termes du partenariat. Contractuels, pas lus d'une table. */
const TERMES: Array<{ icon: LucideIcon; titre: string; detail: string }> = [
  { icon: MapPin, titre: "Exclusivité 300 m", detail: "pendant 6 mois" },
  { icon: BadgeCheck, titre: "Zéro caution", detail: "rien à avancer" },
  { icon: Tag, titre: "Matériel fourni", detail: "étiquettes et sacs" },
  { icon: CreditCard, titre: "Payé le vendredi", detail: "sans frais" },
];

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Type de pièce portant la convention signée. */
const TYPE_CONVENTION = "PARTNERSHIP_AGREEMENT";

export default function RelayActivation({ relay, documents, payoutVerified }: RelayActivationProps) {
  const [training, setTraining] = useState<TrainingState | null>(null);

  useEffect(() => {
    let vivant = true;
    http<TrainingState>("/api/auth/relay-point/training/")
      .then((etat) => {
        if (vivant) setTraining(etat);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  const piece = (type: string) => documents.find((document) => document.document_type === type) ?? null;
  const validee = (type: string) => piece(type)?.status === "APPROVED";

  const convention = piece(TYPE_CONVENTION);
  const formationFaite = Boolean(
    training && training.core_total > 0 && training.core_completed >= training.core_total,
  );

  /**
   * Les six étapes, chacune adossée à ce que le serveur sait.
   *
   * L'ordre est celui du parcours réel : on ne visite pas un local avant
   * d'avoir identifié son gérant.
   */
  const ETAPES: Array<{ titre: string; detail: string; fait: boolean }> = [
    {
      titre: "Dossier du gérant",
      detail: "Pièce d'identité, votre portrait et la façade",
      fait: validee("MANAGER_ID") && validee("PREMISES_PHOTOS"),
    },
    {
      titre: "Numéro de versement vérifié",
      detail: "Confirmé par code SMS, reçoit les versements",
      fait: payoutVerified,
    },
    {
      titre: "Convention signée",
      detail: "Sans caution, sans dépôt, sans frais d'entrée",
      fait: validee(TYPE_CONVENTION),
    },
    {
      titre: "Visite de BelivaY",
      detail: "Local, rangement et zone de remise contrôlés",
      fait: validee("FIELD_VALIDATION"),
    },
    {
      titre: "Formation suivie",
      detail: training
        ? `Les ${training.core_total} modules obligatoires`
        : "Les modules obligatoires",
      fait: formationFaite,
    },
    {
      titre: "Capacité et horaires déclarés",
      detail: "Le relais passe « Ouvert » pour les clients",
      fait: relay.capacity > 0 && relay.hours.trim().length > 0,
    },
  ];

  const faites = ETAPES.filter((etape) => etape.fait).length;
  const ouverture = relay.openedAt ? new Date(relay.openedAt) : null;
  const lieu = relay.city || relay.address;

  return (
    <div className="space-y-4">
      {/* ── La carte de partenariat ────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[14px] border-2 border-[#E8A10E] bg-white px-5 pb-5 pt-5 shadow-[0_2px_10px_rgba(232,161,14,.18)] dark:border-amber-600/70 dark:bg-slate-900">
        <img
          src="/belivay-logo.png"
          alt="BelivaY"
          className="mx-auto h-8 w-auto object-contain dark:brightness-0 dark:invert"
        />
        {/*
          La maquette titre « PARTENAIRE FONDATEUR · 50 PREMIERS RELAIS ».
          `RelayPointProfile` ne porte aucun statut de ce genre : l'afficher
          pour tous en ferait une mention decorative, et pour personne une
          mention fausse. On annonce donc ce qui est vrai de tout partenaire.
        */}
        <p className="mt-3 text-center text-[12px] font-black uppercase leading-tight tracking-[0.09em] text-[#B84A00] dark:text-amber-400">
          Point relais partenaire BelivaY
        </p>
        <h2 className="mt-2 text-center text-[23px] font-black leading-[1.14] tracking-[-0.03em] text-slate-900 dark:text-white">
          {relay.name}
          {lieu ? ` · ${lieu}` : ""}
        </h2>
        <p className="mt-2 text-center text-[13.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          Point relais partenaire indépendant
          {ouverture && !Number.isNaN(ouverture.getTime())
            ? ` · ouvert le ${JOUR_LONG.format(ouverture)}`
            : ""}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {TERMES.map((terme) => (
            <div key={terme.titre} className="flex items-start gap-2.5">
              <terme.icon
                size={17}
                strokeWidth={2.4}
                className="mt-[2px] flex-shrink-0 text-[#EF6A00] dark:text-orange-400"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-black leading-tight text-slate-900 dark:text-white">
                  {terme.titre}
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
                  {terme.detail}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Les six étapes ────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
            Les 6 étapes d'activation
          </h3>
          <span
            className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-bold tabular-nums ${
              faites === ETAPES.length
                ? "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-[#F0DA9C] bg-[#FFF4D6] text-[#8A5A00] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {faites} / {ETAPES.length}
          </span>
        </div>

        <ol className="mt-3">
          {ETAPES.map((etape, index) => {
            const dernier = index === ETAPES.length - 1;
            return (
              <li key={etape.titre} className="flex gap-3">
                {/* La pastille et son fil. Le fil s'arrete a la derniere
                    etape : le prolonger ferait croire a une septieme. */}
                <span className="flex w-[30px] flex-shrink-0 flex-col items-center" aria-hidden>
                  <span
                    className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-black ${
                      etape.fait
                        ? "bg-[#EF6A00] text-white"
                        : "border-2 border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    {etape.fait ? <Check size={16} strokeWidth={3.5} /> : index + 1}
                  </span>
                  {dernier ? null : (
                    <span
                      className={`w-[2px] flex-1 ${
                        etape.fait ? "bg-[#F6CFA8]" : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    />
                  )}
                </span>

                <span className={`min-w-0 flex-1 ${dernier ? "pb-1" : "pb-4"}`}>
                  <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                    {index + 1}. {etape.titre}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                    {etape.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── La convention ─────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300">
            <FileText size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-tight text-slate-900 dark:text-white">
              Convention de partenariat
            </div>
            <p className="mt-1 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
              {/* La date vient de la piece elle-meme. Sans piece, on ne
                  pretend pas qu'elle est signee. */}
              {convention?.updated_at
                ? `Signée le ${JOUR_LONG.format(new Date(convention.updated_at))}`
                : "Pas encore au dossier"}
            </p>
          </div>
          {convention?.file_url ? (
            <a
              href={convention.file_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Télécharger la convention"
              className="flex-shrink-0 rounded-lg p-2 text-[#EF6A00] transition active:scale-[.92] dark:text-orange-400"
            >
              <Download size={20} strokeWidth={2.4} />
            </a>
          ) : (
            <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-[5px] text-[12.5px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              À venir
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
