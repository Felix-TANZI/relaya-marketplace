import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Flame,
  Handshake,
  HeartPulse,
  Package,
  PackageX,
  Palmtree,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { http } from "@/services/api/http";
import { ModuleHeader, Panel, StatusPill } from "./RelayUi";

/**
 * Fermeture exceptionnelle du point relais.
 *
 * Declarer une absence engage BelivaY sur la logistique : la duree choisie
 * determine le sort des colis en stock (transfert > 24 h, retour vendeur
 * > 72 h). La declaration part au support via /api/contact/ et reste tracee
 * localement pour que le gerant garde l'historique de ses envois.
 */

interface ClosureParcel {
  status: string;
}

interface RelayClosureProps {
  onError: (error: unknown) => void;
  /** Identite du declarant, reprise du profil relais de la page parente. */
  relay: { name: string; email: string; phone: string };
}

interface ClosureReason {
  key: string;
  icon: typeof Palmtree;
  tone: string;
  label: string;
  rule: string;
  /** Preavis minimum en heures avant le debut de la fermeture. 0 = immediat. */
  noticeHours: number;
  /** Justificatif a fournir apres coup, affiche dans l'accuse de reception. */
  proof: string;
}

const REASONS: ClosureReason[] = [
  {
    key: "vacances",
    icon: Palmtree,
    tone: "text-emerald-600",
    label: "Vacances personnelles",
    rule: "Déclaration 48 h à l'avance",
    noticeHours: 48,
    proof: "Aucun justificatif requis.",
  },
  {
    key: "maladie",
    icon: HeartPulse,
    tone: "text-rose-600",
    label: "Maladie",
    rule: "Immédiate + certificat sous 48 h",
    noticeHours: 0,
    proof: "Certificat médical à téléverser sous 48 h dans Documents KYC.",
  },
  {
    key: "famille",
    icon: Users,
    tone: "text-indigo-600",
    label: "Urgence familiale",
    rule: "Immédiate + justificatif sous 7 j",
    noticeHours: 0,
    proof: "Justificatif à téléverser sous 7 jours dans Documents KYC.",
  },
  {
    key: "force-majeure",
    icon: Flame,
    tone: "text-orange-600",
    label: "Force majeure",
    rule: "Immédiate (incendie, inondation, vol)",
    noticeHours: 0,
    proof: "Déclaration de sinistre ou dépôt de plainte à joindre au dossier.",
  },
];

interface ClosureDuration {
  key: string;
  label: string;
  /** Duree maximale en heures, sert a determiner la regle stock applicable. */
  hours: number;
}

const DURATIONS: ClosureDuration[] = [
  { key: "24", label: "Moins de 24 h", hours: 24 },
  { key: "72", label: "24 h à 72 h", hours: 72 },
  { key: "168", label: "72 h à 7 jours", hours: 168 },
  { key: "720", label: "Plus de 7 jours", hours: 720 },
];

interface StockRule {
  key: "garde" | "transfert" | "retour";
  icon: typeof Clock3;
  title: string;
  body: string;
  /** Classes du bloc quand la regle s'applique a la duree choisie. */
  active: string;
  idle: string;
}

const STOCK_RULES: StockRule[] = [
  {
    key: "transfert",
    icon: Clock3,
    title: "Fermeture > 24 h",
    body: "transfert automatique des colis vers le PR partenaire le plus proche.",
    active: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40",
    idle: "border-blue-100 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
  },
  {
    key: "retour",
    icon: Undo2,
    title: "Fermeture > 72 h",
    body: "retour des colis aux vendeurs + remboursement de vos frais PR.",
    active: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
    idle: "border-amber-100 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
  },
];

interface ClosureDeclaration {
  id: string;
  reasonKey: string;
  reasonLabel: string;
  durationLabel: string;
  durationHours: number;
  from: string;
  to: string;
  parcelsAtDeclaration: number;
  declaredAt: string;
}

const STORAGE_KEY = "belivay.relay.closures";

function readStoredClosures(): ClosureDeclaration[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as ClosureDeclaration[]) : [];
  } catch {
    return [];
  }
}

function writeStoredClosures(closures: ClosureDeclaration[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(closures));
  } catch {
    /* quota ou navigation privee : l'historique local est un confort, pas un dû. */
  }
}

function frDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("fr-FR");
}

/** Statut derive des dates : une declaration passee est close, pas annulable. */
function closureStatus(closure: ClosureDeclaration): { label: string; tone: "blue" | "emerald" | "slate" } {
  const now = new Date();
  const from = new Date(`${closure.from}T00:00:00`);
  const to = new Date(`${closure.to}T23:59:59`);
  if (now < from) return { label: "Programmée", tone: "blue" };
  if (now > to) return { label: "Terminée", tone: "slate" };
  return { label: "En cours", tone: "emerald" };
}

export default function RelayClosure({ onError, relay }: RelayClosureProps) {
  const [stockCount, setStockCount] = useState(0);
  const [reasonKey, setReasonKey] = useState(REASONS[0].key);
  const [durationKey, setDurationKey] = useState(DURATIONS[0].key);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [closures, setClosures] = useState<ClosureDeclaration[]>(readStoredClosures);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const parcels = await http<ClosureParcel[]>("/api/shipping/relay-point/parcels/");
        if (cancelled) return;
        setStockCount(
          (Array.isArray(parcels) ? parcels : []).filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status)).length,
        );
      } catch (error) {
        if (!cancelled) onError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const reason = REASONS.find((item) => item.key === reasonKey) ?? REASONS[0];
  const duration = DURATIONS.find((item) => item.key === durationKey) ?? DURATIONS[0];

  /** Regle stock effectivement declenchee par la duree choisie. */
  const activeRule: StockRule["key"] = duration.hours > 72 ? "retour" : duration.hours > 24 ? "transfert" : "garde";

  const error = useMemo(() => {
    if (!from || !to) return "Renseignez les dates de début et de fin de fermeture.";
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Dates invalides.";
    if (end < start) return "La date de fin ne peut pas précéder la date de début.";

    if (reason.noticeHours > 0) {
      const noticeMs = reason.noticeHours * 3600_000;
      if (start.getTime() - Date.now() < noticeMs) {
        return `« ${reason.label} » exige un préavis de ${reason.noticeHours} h : choisissez une date de début plus lointaine, ou déclarez un autre motif si la situation est urgente.`;
      }
    }

    // Coherence duree / dates : eviter qu'une absence d'une semaine soit
    // annoncee comme "moins de 24 h", ce qui fausserait le sort des colis.
    const spanHours = (end.getTime() - start.getTime()) / 3600_000;
    if (spanHours > duration.hours + 24) {
      return `La période saisie dépasse la durée « ${duration.label} » : ajustez la durée prévue pour que BelivaY applique la bonne règle de transfert.`;
    }

    return null;
  }, [duration.hours, duration.label, from, reason.label, reason.noticeHours, to]);

  const submit = async () => {
    if (error) {
      setFeedback({ tone: "error", text: error });
      return;
    }
    setBusy(true);
    setFeedback(null);

    const consigne =
      activeRule === "retour"
        ? "Fermeture > 72 h : retour des colis aux vendeurs et remboursement des frais PR."
        : activeRule === "transfert"
          ? "Fermeture > 24 h : transfert des colis vers le point relais partenaire le plus proche."
          : "Fermeture < 24 h : les colis restent en garde sur place.";

    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relay.name,
          email: relay.email,
          phone: relay.phone,
          subject: `[Point relais] Fermeture exceptionnelle — ${reason.label}`,
          message: [
            `Point relais : ${relay.name}`,
            `Motif : ${reason.label}`,
            `Durée prévue : ${duration.label}`,
            `Période : du ${frDate(from)} au ${frDate(to)}`,
            `Colis en stock au moment de la déclaration : ${stockCount}`,
            `Consigne logistique applicable : ${consigne}`,
            `Justificatif : ${reason.proof}`,
          ].join("\n"),
        }),
      });

      const declaration: ClosureDeclaration = {
        id: `${Date.now()}`,
        reasonKey: reason.key,
        reasonLabel: reason.label,
        durationLabel: duration.label,
        durationHours: duration.hours,
        from,
        to,
        parcelsAtDeclaration: stockCount,
        declaredAt: new Date().toISOString(),
      };
      const next = [declaration, ...closures];
      setClosures(next);
      writeStoredClosures(next);
      setFrom("");
      setTo("");
      setFeedback({
        tone: "success",
        text: `Fermeture déclarée du ${frDate(declaration.from)} au ${frDate(declaration.to)}. ${consigne} ${reason.proof}`,
      });
    } catch (submitError) {
      onError(submitError);
      setFeedback({ tone: "error", text: "La déclaration n'a pas pu être transmise. Réessayez dans un instant." });
    } finally {
      setBusy(false);
    }
  };

  const removeClosure = (id: string) => {
    const next = closures.filter((closure) => closure.id !== id);
    setClosures(next);
    writeStoredClosures(next);
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={CalendarOff}
        title="Fermeture exceptionnelle"
        subtitle="Déclarez une absence · BelivaY coordonne le transfert des colis"
        tone="text-rose-600 dark:text-rose-400"
      />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <Package size={18} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
        <p className="text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
          Vous avez actuellement <strong className="font-black">{stockCount} colis</strong> en stock. En cas de fermeture prolongée,
          ils seront transférés ou retournés (voir règles ci-dessous).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel icon={ClipboardList} title="Motifs & délais de déclaration">
          <div className="space-y-2.5">
            {REASONS.map((item) => {
              const Icon = item.icon;
              const selected = item.key === reasonKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setReasonKey(item.key)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                      : "border-transparent bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon size={19} strokeWidth={2.3} className={`mt-0.5 flex-shrink-0 ${item.tone}`} />
                  <span className="min-w-0">
                    <span className="block font-black text-slate-950 dark:text-white">{item.label}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">{item.rule}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel icon={Package} title="Gestion des colis en stock">
          <div className="space-y-3">
            {STOCK_RULES.map((rule) => {
              const Icon = rule.icon;
              const applies = activeRule === rule.key;
              return (
                <div key={rule.key} className={`rounded-2xl border p-4 transition ${applies ? rule.active : rule.idle}`}>
                  <div className="flex items-start gap-3">
                    <Icon
                      size={18}
                      strokeWidth={2.4}
                      className={`mt-0.5 flex-shrink-0 ${rule.key === "retour" ? "text-amber-600 dark:text-amber-300" : "text-blue-600 dark:text-blue-300"}`}
                    />
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                      <strong
                        className={`font-black ${rule.key === "retour" ? "text-amber-800 dark:text-amber-200" : "text-blue-800 dark:text-blue-200"}`}
                      >
                        {rule.title}
                      </strong>{" "}
                      : {rule.body}
                    </p>
                  </div>
                  {applies ? (
                    <div className="mt-3 pl-7">
                      <StatusPill tone={rule.key === "retour" ? "amber" : "blue"}>
                        Règle applicable à votre durée · {stockCount} colis concernés
                      </StatusPill>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <Handshake size={18} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                  BelivaY assure toute la <strong className="font-black">coordination logistique</strong> du transfert.
                </p>
              </div>
            </div>

            {activeRule === "garde" ? (
              <p className="pl-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Durée courte sélectionnée : aucun mouvement de stock n'est déclenché, vous restez responsable des colis.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel icon={CalendarOff} title="Déclarer une fermeture">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Motif</span>
            <select
              value={reasonKey}
              onChange={(event) => setReasonKey(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {REASONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Durée prévue</span>
            <select
              value={durationKey}
              onChange={(event) => setDurationKey(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {DURATIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Du</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Au</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Justificatif attendu : {reason.proof}
        </p>

        {feedback ? (
          <div
            className={`mt-4 flex items-start gap-2 rounded-2xl border p-4 text-sm font-bold leading-6 ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
            }`}
          >
            {feedback.tone === "success" ? (
              <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            )}
            {feedback.text}
          </div>
        ) : error && (from || to) ? (
          <p className="mt-4 flex items-start gap-2 text-sm font-bold leading-6 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={busy || Boolean(error)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_10px_22px_-12px_rgba(29,78,216,.9)] transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarOff size={16} strokeWidth={2.6} />
          {busy ? "Transmission…" : "Déclarer la fermeture"}
        </button>
      </Panel>

      {closures.length > 0 ? (
        <Panel
          icon={PackageX}
          title="Fermetures déclarées"
          action={<StatusPill tone="slate">{closures.length}</StatusPill>}
        >
          <div className="space-y-2.5">
            {closures.map((closure) => {
              const status = closureStatus(closure);
              return (
                <div
                  key={closure.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800"
                >
                  <div className="min-w-0">
                    <div className="font-black text-slate-950 dark:text-white">{closure.reasonLabel}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Du {frDate(closure.from)} au {frDate(closure.to)} · {closure.durationLabel} ·{" "}
                      {closure.parcelsAtDeclaration} colis au moment de la déclaration
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    <button
                      type="button"
                      onClick={() => removeClosure(closure.id)}
                      aria-label={`Retirer la fermeture du ${frDate(closure.from)}`}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    >
                      <Trash2 size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Cet historique est conservé sur cet appareil. Le support BelivaY reste la référence en cas de litige sur une absence.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
