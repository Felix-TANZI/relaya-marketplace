import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, GraduationCap, Play, RotateCcw, X } from "lucide-react";
import { http } from "@/services/api/http";
import { Panel, StatusPill } from "./RelayUi";

interface TrainingState {
  completed: string[];
  completed_count: number;
  total_modules: number;
  core_completed: number;
  core_total: number;
  points: number;
  points_per_module: number;
  core_modules: string[];
}

interface TrainingModule {
  key: string;
  emoji: string;
  title: string;
  minutes: number;
  isNew?: boolean;
  points: string[];
}

/**
 * Catalogue des modules : contenu pedagogique, donc cote interface. Les cles
 * correspondent a RelayTrainingCompletion.Module cote serveur, qui refuse toute
 * cle inconnue.
 */
const MODULES: TrainingModule[] = [
  {
    key: "reception",
    emoji: "📦",
    title: "Réception & garde des colis",
    minutes: 20,
    points: [
      "Scanner le QR de la mission à l'arrivée du livreur.",
      "Vérifier l'intégrité visuelle + l'étiquette avant d'accepter.",
      "Prendre 3 photos (face, dos, étiquette) comme preuve.",
      "Double signature gérant + livreur = transfert de responsabilité.",
    ],
  },
  {
    key: "cni",
    emoji: "🪪",
    title: "Vérification CNI & cross-check ANTIC",
    minutes: 15,
    points: [
      "Demander systématiquement la CNI au retrait.",
      "Lancer le cross-check ANTIC dans l'app.",
      "Ne remettre le colis qu'au porteur du code valide.",
      "En cas de doute, contacter le support BelivaY.",
    ],
  },
  {
    key: "stockage",
    emoji: "🔒",
    title: "Sécurité du stockage",
    minutes: 18,
    isNew: true,
    points: [
      "Garder les colis dans un espace fermé à clé.",
      "Ranger selon le numéro de slot généré par l'app.",
      "Placer les colis proches de J+7 près de l'entrée.",
      "Aucun colis perdu/volé = +25 pts de Trust « Sécurité ».",
    ],
  },
  {
    key: "litige",
    emoji: "⚖️",
    title: "Gérer un litige & le médiateur",
    minutes: 22,
    points: [
      "Colis non récupéré J+7 → décision retour livreur / BelivaY.",
      "Colis perdu/volé → plainte 117 + photos + Activa.",
      "Avis injuste → droit de réponse via médiateur (anonymisé).",
      "Rester factuel et courtois dans toute réponse.",
    ],
  },
  {
    key: "relation",
    emoji: "🤝",
    title: "Relation acheteur & avis",
    minutes: 14,
    points: [
      "Accueil rapide et souriant = meilleurs avis.",
      "Un avis 5★ rapporte +20 Avantages.",
      "Confirmer poliment l'identité sans la divulguer.",
      "Le Trust « Satisfaction » dépend de ces avis.",
    ],
  },
  {
    key: "pidgin",
    emoji: "🗣️",
    title: "Service en Pidgin",
    minutes: 16,
    isNew: true,
    points: [
      "Quelques phrases clés pour accueillir tous les acheteurs.",
      "« How na » (Pidgin) pour accueillir.",
      "Adapter la langue à la région (NW/SW anglophone).",
      "Améliore l'expérience et les avis.",
    ],
  },
];

function ModuleMeta({ module, mandatory }: { module: TrainingModule; mandatory: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <Clock3 size={13} className="text-slate-400" />
      {module.minutes} min · +30 <span aria-hidden>🪙</span>
      {mandatory ? <span className="text-red-500"> · obligatoire</span> : null}
    </div>
  );
}

/** Fiche du module : points cles, puis validation ou rappel de validation. */
function ModuleDialog({
  module,
  mandatory,
  done,
  busy,
  onValidate,
  onClose,
}: {
  module: TrainingModule;
  mandatory: boolean;
  done: boolean;
  busy: boolean;
  onValidate: () => void;
  onClose: () => void;
}) {
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={module.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Feuille ancree en bas sur telephone, modale centree des `sm`. */}
      <div className="animate-sheet-up overscroll-none-y safe-pb max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-[0_-8px_40px_rgba(2,6,23,.32)] dark:bg-slate-900 sm:animate-page-in sm:max-w-xl sm:rounded-3xl sm:p-6 sm:shadow-[0_30px_80px_rgba(15,23,42,.35)]">
        <div className="mx-auto mb-3 h-1.5 w-11 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black leading-tight text-slate-950 dark:text-white">
              <span aria-hidden>{module.emoji}</span>
              {module.title}
            </h2>
            <div className="mt-1">
              <ModuleMeta module={module} mandatory={mandatory} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full bg-red-500 p-1.5 text-white transition hover:bg-red-600"
          >
            <X size={15} strokeWidth={3} />
          </button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Points clés à retenir</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <ol className="space-y-2.5">
          {module.points.map((point, index) => (
            <li key={point} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-slate-700 dark:text-slate-200">{point}</span>
            </li>
          ))}
        </ol>

        {done ? (
          <>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
              <CheckCircle2 className="flex-shrink-0 text-emerald-600" size={18} />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Module déjà validé. Vous pouvez le revoir à tout moment.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-blue-600"
              />
              J'ai lu et compris ce module
            </label>
            <button
              type="button"
              disabled={!understood || busy}
              onClick={onValidate}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {busy ? "Validation..." : "Valider le module (+30 🪙)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RelayTraining({ onError }: { onError: (error: unknown) => void }) {
  const [state, setState] = useState<TrainingState | null>(null);
  const [openModule, setOpenModule] = useState<TrainingModule | null>(null);
  const [busy, setBusy] = useState(false);
  const [justValidated, setJustValidated] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await http<TrainingState>("/api/auth/relay-point/training/"));
    } catch (error) {
      onError(error);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const completed = state?.completed ?? [];
  const coreModules = state?.core_modules ?? [];
  const total = state?.total_modules ?? MODULES.length;
  const progressPct = total ? Math.round((completed.length / total) * 100) : 0;
  const coreDone = (state?.core_completed ?? 0) >= (state?.core_total ?? 3);

  const validate = async (module: TrainingModule) => {
    setBusy(true);
    try {
      const updated = await http<TrainingState>("/api/auth/relay-point/training/", {
        method: "POST",
        body: JSON.stringify({ module_key: module.key }),
      });
      setState(updated);
      setJustValidated(module.title);
      setOpenModule(null);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-500 text-white shadow-[0_8px_18px_rgba(2,6,23,.2)] ring-1 ring-white/25">
          <GraduationCap size={21} strokeWidth={2.4} />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Formation continue</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Modules certifiants · +30 Avantages chacun · formation initiale 2 h obligatoire
          </p>
        </div>
      </section>

      {justValidated ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 size={17} className="flex-shrink-0" />
            Module « {justValidated} » validé · +{state?.points_per_module ?? 30} Avantages crédités.
          </p>
          <button
            type="button"
            onClick={() => setJustValidated(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-[0_14px_30px_rgba(30,64,175,.25)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/85">Modules complétés</span>
            <span aria-hidden className="text-lg">🎓</span>
          </div>
          <div className="mt-2 text-4xl font-black">
            {completed.length}
            <span className="text-xl text-blue-200/80">/{total}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-100/80">{progressPct} % du parcours</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Tronc obligatoire</span>
          <div className="mt-2 text-4xl font-black text-slate-950 dark:text-white">
            {state?.core_completed ?? 0}/{state?.core_total ?? 3}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">requis pour l'activation</div>
        </article>

        <article className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 p-5 text-white shadow-[0_14px_30px_rgba(30,64,175,.25)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/85">Avantages gagnés</span>
            <span aria-hidden className="text-lg">🪙</span>
          </div>
          <div className="mt-2 text-4xl font-black">{state?.points ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-blue-100/80">+{state?.points_per_module ?? 30} par module</div>
        </article>
      </section>

      <Panel
        kicker="Parcours"
        title="Progression"
        action={
          <StatusPill tone={coreDone ? "emerald" : "amber"}>{coreDone ? "Tronc validé" : "Tronc en cours"}</StatusPill>
        }
      >
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-[width] duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          La formation initiale de 2 h (réception, vérification CNI, sécurité du stockage) est obligatoire pour activer et
          maintenir votre statut de partenaire.
        </p>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        {MODULES.map((module) => {
          const done = completed.includes(module.key);
          const mandatory = coreModules.includes(module.key);
          return (
            <article
              key={module.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-lg ${
                    done ? "bg-emerald-100 dark:bg-emerald-950" : "bg-blue-50 dark:bg-slate-800"
                  }`}
                >
                  {done ? <CheckCircle2 className="text-emerald-600" size={21} /> : <span aria-hidden>{module.emoji}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black leading-tight text-slate-950 dark:text-white">{module.title}</h3>
                    {module.isNew && !done ? (
                      <span className="rounded-md border border-blue-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:text-blue-300">
                        Nouveau
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1">
                    <ModuleMeta module={module} mandatory={mandatory} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenModule(module)}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  done
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {done ? <RotateCcw size={15} /> : <Play size={15} />}
                {done ? "Revoir le module" : "Démarrer le module"}
              </button>
            </article>
          );
        })}
      </section>

      {openModule ? (
        <ModuleDialog
          module={openModule}
          mandatory={coreModules.includes(openModule.key)}
          done={completed.includes(openModule.key)}
          busy={busy}
          onValidate={() => void validate(openModule)}
          onClose={() => setOpenModule(null)}
        />
      ) : null}
    </div>
  );
}
