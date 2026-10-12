/**
 * Formation — les modules qui autorisent à tenir le comptoir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CINQ OBLIGATOIRES, UN FACULTATIF
 *
 * Le serveur décide lesquels comptent : `core_modules` et `core_total`
 * viennent de `/auth/relay-point/training/`, et `RelayTrainingCompletion`
 * refuse toute clé inconnue. L'écran ne fait donc que peindre — il ne
 * décrète pas qu'un module est obligatoire.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE COMPTEUR PORTE SUR TOUT, L'ÉTAT SUR LE NOYAU
 *
 * L'anneau affiche « 5 / 6 », parce que c'est ce que le gérant a suivi. Mais
 * « Relais formé » ne s'allume que si les cinq OBLIGATOIRES sont faits :
 * avoir suivi le module facultatif ne remplace jamais un module du noyau, et
 * un relais qui se croit formé ouvre son comptoir.
 */
import { useCallback, useEffect, useState } from "react";
import { Eye, GraduationCap, Globe, KeyRound, Package, Scale, Smartphone, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";

interface TrainingState {
  completed: string[];
  completed_count: number;
  total_modules: number;
  core_completed: number;
  core_total: number;
  core_modules: string[];
}

interface Module {
  /** Clé reconnue par `RelayTrainingCompletion.Module`. */
  key: string;
  icon: LucideIcon;
  titre: string;
  minutes: number;
}

/**
 * Le catalogue affiché.
 *
 * Les CLÉS sont celles du serveur — il refuse les autres. Les titres et les
 * durées sont du contenu pédagogique, donc côté interface.
 */
const MODULES: Module[] = [
  { key: "reception", icon: Package, titre: "Réception et scellés", minutes: 12 },
  { key: "cni", icon: KeyRound, titre: "Retrait, codes et tiers", minutes: 10 },
  { key: "stockage", icon: Smartphone, titre: "Sécurité du stockage", minutes: 8 },
  { key: "litige", icon: Scale, titre: "Constat de litige", minutes: 10 },
  { key: "relation", icon: Undo2, titre: "Relation client et avis", minutes: 6 },
  { key: "pidgin", icon: Globe, titre: "Servir en anglais et en pidgin", minutes: 15 },
];

/** Circonférence de l'anneau de progression (r = 42 dans un viewBox de 100). */
const ANNEAU = 2 * Math.PI * 42;

export default function RelayTrainingMobile({
  onError,
  onOpenModule,
}: {
  onError: (error: unknown) => void;
  /** Ouvre le contenu d'un module. */
  onOpenModule: (key: string) => void;
}) {
  const [state, setState] = useState<TrainingState | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(() => {
    http<TrainingState>("/api/auth/relay-point/training/")
      .then(setState)
      .catch((erreur) => onError(erreur))
      .finally(() => setLoading(false));
  }, [onError]);

  useEffect(() => charger(), [charger]);

  const faits = state?.completed ?? [];
  const total = MODULES.length;
  const nombreFaits = faits.length;

  // Le noyau fait foi pour l'etat « forme » : le serveur dit lesquels
  // comptent, l'ecran ne le devine pas.
  const noyau = state?.core_modules ?? [];
  const noyauTotal = state?.core_total ?? noyau.length;
  const noyauFaits = state?.core_completed ?? 0;
  const forme = noyauTotal > 0 && noyauFaits >= noyauTotal;
  const facultatifsFaits = nombreFaits - noyauFaits;

  const proportion = total > 0 ? nombreFaits / total : 0;

  return (
    <div className="space-y-4">
      {/* ── L'avancement ───────────────────────────────────────────────── */}
      <section
        className="overflow-hidden rounded-[18px] px-[18px] pb-[18px] pt-5 text-white shadow-[0_6px_18px_rgba(14,27,56,.28)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 96% -4%, rgba(239,106,0,.26) 0%, rgba(239,106,0,0) 62%),"
            + " linear-gradient(158deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
        }}
      >
        <span className="relative flex h-[104px] w-[104px] items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-white/12" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className="stroke-[#E8A10E] transition-[stroke-dasharray] duration-700"
              strokeDasharray={`${proportion * ANNEAU} ${ANNEAU}`}
            />
          </svg>
          <span className="text-[25px] font-black tabular-nums">
            {nombreFaits}/{total}
          </span>
        </span>

        <p
          className={`mt-3.5 text-[12.5px] font-black uppercase leading-none tracking-[0.09em] ${
            forme ? "text-[#52D69A]" : "text-[#8FB0FF]"
          }`}
        >
          {forme ? "Obligatoires terminés" : `${noyauFaits} / ${noyauTotal} obligatoires`}
        </p>
        <div className="mt-2 text-[22px] font-black leading-tight">
          {loading ? "…" : forme ? "Relais formé" : "Formation à terminer"}
        </div>
        <p className="mt-1.5 text-[13.5px] font-medium text-white/70">
          {forme
            ? facultatifsFaits > 0
              ? `${facultatifsFaits} module facultatif suivi en plus`
              : "Un module facultatif reste disponible"
            : `Il reste ${Math.max(0, noyauTotal - noyauFaits)} module${
                noyauTotal - noyauFaits > 1 ? "s" : ""
              } à suivre avant d'ouvrir`}
        </p>
      </section>

      {/* ── Les modules ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((module, index) => {
          const fait = faits.includes(module.key);
          // Un module hors `core_modules` est facultatif. On le lit du
          // serveur : le declarer ici le figerait dans l'interface.
          const facultatif = noyau.length > 0 && !noyau.includes(module.key);
          const Icon = module.icon;

          return (
            <section
              key={module.key}
              className="flex flex-col rounded-[14px] border border-slate-200 bg-white px-3.5 pb-3.5 pt-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900"
            >
              {/* La tuile du module. Orange quand il reste a faire et qu'il
                  est facultatif : c'est le seul qu'on propose, pas qu'on
                  reclame. */}
              <span
                className={`flex h-[64px] w-full items-center justify-center rounded-[12px] ${
                  facultatif && !fait
                    ? "bg-gradient-to-br from-[#E8A10E] to-[#EF6A00] text-white"
                    : "bg-[#0E1B38] text-[#E8A10E]"
                }`}
              >
                <Icon size={25} strokeWidth={2} />
              </span>

              <p className="mt-2.5 text-[10.5px] font-black uppercase leading-tight tracking-[0.06em] text-slate-400 dark:text-slate-500">
                Module {index + 1} · {module.minutes} min
                {facultatif ? " · facultatif" : ""}
              </p>
              <h3 className="mt-1 flex-1 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                {module.titre}
              </h3>

              {fait ? (
                <span className="mt-2.5 block rounded-[10px] bg-[#E6F4EC] py-2 text-center text-[13px] font-bold text-[#1F7A4D] dark:bg-emerald-950/40 dark:text-emerald-300">
                  Terminé
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenModule(module.key)}
                  className="pr-btn mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13.5px] font-black text-white transition active:scale-[.96]"
                >
                  <Eye size={15} strokeWidth={2.6} /> Commencer
                </button>
              )}
            </section>
          );
        })}
      </div>

      {/* ── Ce que vaut la formation ───────────────────────────────────── */}
      <section className="flex items-start gap-2.5 rounded-[14px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <GraduationCap
          size={18}
          strokeWidth={2.2}
          className="mt-[2px] flex-shrink-0 text-slate-400 dark:text-slate-500"
        />
        <p className="text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
          {/* Les durees viennent du catalogue ci-dessus : la somme suit si un
              module change, au lieu de rester figee dans une phrase. */}
          Formation initiale de 2 h : les {noyauTotal || 5} modules sur téléphone (≈{" "}
          {MODULES.filter((module) => noyau.length === 0 || noyau.includes(module.key)).reduce(
            (somme, module) => somme + module.minutes,
            0,
          )}{" "}
          min) + une séance pratique d'1 h au comptoir lors de la visite BelivaY. Un module compte
          comme fait seulement s'il est suivi jusqu'au bout, quiz compris.
        </p>
      </section>
    </div>
  );
}
