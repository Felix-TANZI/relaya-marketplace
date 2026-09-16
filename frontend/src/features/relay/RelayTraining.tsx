import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  titleKey: string;
  minutes: number;
  isNew?: boolean;
  pointKeys: string[];
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
    titleKey: "rl2_training.module_reception_title",
    minutes: 20,
    pointKeys: [
      "rl2_training.module_reception_point_1",
      "rl2_training.module_reception_point_2",
      "rl2_training.module_reception_point_3",
      "rl2_training.module_reception_point_4",
    ],
  },
  {
    key: "cni",
    emoji: "🪪",
    titleKey: "rl2_training.module_cni_title",
    minutes: 15,
    pointKeys: [
      "rl2_training.module_cni_point_1",
      "rl2_training.module_cni_point_2",
      "rl2_training.module_cni_point_3",
      "rl2_training.module_cni_point_4",
    ],
  },
  {
    key: "stockage",
    emoji: "🔒",
    titleKey: "rl2_training.module_storage_title",
    minutes: 18,
    isNew: true,
    pointKeys: [
      "rl2_training.module_storage_point_1",
      "rl2_training.module_storage_point_2",
      "rl2_training.module_storage_point_3",
      "rl2_training.module_storage_point_4",
    ],
  },
  {
    key: "litige",
    emoji: "⚖️",
    titleKey: "rl2_training.module_dispute_title",
    minutes: 22,
    pointKeys: [
      "rl2_training.module_dispute_point_1",
      "rl2_training.module_dispute_point_2",
      "rl2_training.module_dispute_point_3",
      "rl2_training.module_dispute_point_4",
    ],
  },
  {
    key: "relation",
    emoji: "🤝",
    titleKey: "rl2_training.module_relation_title",
    minutes: 14,
    pointKeys: [
      "rl2_training.module_relation_point_1",
      "rl2_training.module_relation_point_2",
      "rl2_training.module_relation_point_3",
      "rl2_training.module_relation_point_4",
    ],
  },
  {
    key: "pidgin",
    emoji: "🗣️",
    titleKey: "rl2_training.module_pidgin_title",
    minutes: 16,
    isNew: true,
    pointKeys: [
      "rl2_training.module_pidgin_point_1",
      "rl2_training.module_pidgin_point_2",
      "rl2_training.module_pidgin_point_3",
      "rl2_training.module_pidgin_point_4",
    ],
  },
];

function ModuleMeta({ module, mandatory }: { module: TrainingModule; mandatory: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <Clock3 size={13} className="text-slate-400" />
      {t("rl2_training.module_minutes", { minutes: module.minutes })} <span aria-hidden>🪙</span>
      {mandatory ? <span className="text-red-500"> · {t("rl2_training.mandatory")}</span> : null}
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
  const { t } = useTranslation();
  const [understood, setUnderstood] = useState(false);
  const title = t(module.titleKey);

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
      aria-label={title}
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
              {title}
            </h2>
            <div className="mt-1">
              <ModuleMeta module={module} mandatory={mandatory} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("rl2_training.close")}
            className="rounded-full bg-red-500 p-1.5 text-white transition hover:bg-red-600"
          >
            <X size={15} strokeWidth={3} />
          </button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{t("rl2_training.key_points_heading")}</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <ol className="space-y-2.5">
          {module.pointKeys.map((pointKey, index) => (
            <li key={pointKey} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-slate-700 dark:text-slate-200">{t(pointKey)}</span>
            </li>
          ))}
        </ol>

        {done ? (
          <>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
              <CheckCircle2 className="flex-shrink-0 text-emerald-600" size={18} />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                {t("rl2_training.already_validated")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              {t("rl2_training.close")}
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
              {t("rl2_training.understood_checkbox")}
            </label>
            <button
              type="button"
              disabled={!understood || busy}
              onClick={onValidate}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {busy ? t("rl2_training.validating") : t("rl2_training.validate_module_button")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RelayTraining({ onError }: { onError: (error: unknown) => void }) {
  const { t } = useTranslation();
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
      setJustValidated(t(module.titleKey));
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
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t("rl2_training.header_title")}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t("rl2_training.header_subtitle")}
          </p>
        </div>
      </section>

      {justValidated ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 size={17} className="flex-shrink-0" />
            {t("rl2_training.module_validated_notice", { title: justValidated, points: state?.points_per_module ?? 30 })}
          </p>
          <button
            type="button"
            onClick={() => setJustValidated(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label={t("rl2_training.close")}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-[0_14px_30px_rgba(30,64,175,.25)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/85">{t("rl2_training.completed_modules_label")}</span>
            <span aria-hidden className="text-lg">🎓</span>
          </div>
          <div className="mt-2 text-4xl font-black">
            {completed.length}
            <span className="text-xl text-blue-200/80">/{total}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-100/80">{t("rl2_training.progress_pct", { pct: progressPct })}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t("rl2_training.core_track_label")}</span>
          <div className="mt-2 text-4xl font-black text-slate-950 dark:text-white">
            {state?.core_completed ?? 0}/{state?.core_total ?? 3}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t("rl2_training.required_for_activation")}</div>
        </article>

        <article className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 p-5 text-white shadow-[0_14px_30px_rgba(30,64,175,.25)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/85">{t("rl2_training.advantages_earned_label")}</span>
            <span aria-hidden className="text-lg">🪙</span>
          </div>
          <div className="mt-2 text-4xl font-black">{state?.points ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-blue-100/80">{t("rl2_training.per_module", { points: state?.points_per_module ?? 30 })}</div>
        </article>
      </section>

      <Panel
        kicker={t("rl2_training.kicker_journey")}
        title={t("rl2_training.progression_title")}
        action={
          <StatusPill tone={coreDone ? "emerald" : "amber"}>{coreDone ? t("rl2_training.core_validated") : t("rl2_training.core_in_progress")}</StatusPill>
        }
      >
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-[width] duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("rl2_training.progression_description")}
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
                    <h3 className="font-black leading-tight text-slate-950 dark:text-white">{t(module.titleKey)}</h3>
                    {module.isNew && !done ? (
                      <span className="rounded-md border border-blue-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:text-blue-300">
                        {t("rl2_training.new_badge")}
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
                {done ? t("rl2_training.review_module") : t("rl2_training.start_module")}
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
