import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { http } from "@/services/api/http";
import { Panel, StatusPill } from "./RelayUi";

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

/** Libelles et explications des criteres, dans l'ordre d'affichage. */
const CRITERIA: Array<[string, string, string]> = [
  ["punctuality", "rl2_trust.criterion_punctuality_label", "rl2_trust.criterion_punctuality_desc"],
  ["security", "rl2_trust.criterion_security_label", "rl2_trust.criterion_security_desc"],
  ["satisfaction", "rl2_trust.criterion_satisfaction_label", "rl2_trust.criterion_satisfaction_desc"],
  ["disputes", "rl2_trust.criterion_disputes_label", "rl2_trust.criterion_disputes_desc"],
  ["seniority", "rl2_trust.criterion_seniority_label", "rl2_trust.criterion_seniority_desc"],
];

function progressTone(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 55) return "bg-blue-600";
  return "bg-amber-500";
}

function tierTone(tier: string): "emerald" | "blue" | "slate" {
  if (tier === "GOLD") return "emerald";
  if (tier === "CONFIRMED") return "blue";
  return "slate";
}

export default function RelayTrust({ onError }: { onError: (error: unknown) => void }) {
  const { t } = useTranslation();
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

  const score = trust?.score ?? 0;

  return (
    <Panel
      kicker={t("rl2_trust.kicker_public_score")}
      title={t("rl2_trust.header_title")}
      action={
        trust ? (
          <StatusPill tone={tierTone(trust.tier)}>
            <ShieldCheck size={13} className="mr-1.5" />
            {trust.tier_display}
          </StatusPill>
        ) : null
      }
    >
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-center dark:border-blue-900 dark:bg-blue-950/40">
          <div className="text-6xl font-black text-blue-700 dark:text-blue-300">
            {loading ? "…" : score.toFixed(0)}
          </div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-blue-900/55 dark:text-blue-200/60">
            {t("rl2_trust.score_out_of_100")}
          </div>
          <p className="mt-4 text-sm leading-6 text-blue-950/75 dark:text-blue-100/75">
            {t("rl2_trust.visible_to_buyer_note")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <StatusPill tone="slate">{t("rl2_trust.observations_count", { count: trust?.sample_size ?? 0 })}</StatusPill>
            {trust?.parcel_value_cap_xaf ? (
              <StatusPill tone="amber">{t("rl2_trust.value_cap", { amount: trust.parcel_value_cap_xaf.toLocaleString("fr-FR") })}</StatusPill>
            ) : trust ? (
              <StatusPill tone="emerald">{t("rl2_trust.no_value_cap")}</StatusPill>
            ) : null}
          </div>
          {trust?.candidate_tier ? (
            <p className="mt-3 text-xs font-bold text-blue-900/70 dark:text-blue-200/70">
              {t("rl2_trust.candidate_tier_note", { tier: trust.candidate_tier })}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {trust?.veto_active ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
              {t("rl2_trust.veto_active", { reason: trust.veto_reason || t("rl2_trust.veto_default_reason") })}
            </div>
          ) : null}

          {CRITERIA.map(([key, labelKey, descKey]) => {
            const entry = trust?.breakdown?.[key];
            const value = entry?.score ?? 0;
            const samples = entry?.samples ?? 0;
            return (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-950 dark:text-white">{t(labelKey)}</strong>
                  <div className="flex items-center gap-2">
                    {entry ? <StatusPill tone="slate">{t("rl2_trust.weight_pct", { weight: entry.weight })}</StatusPill> : null}
                    <StatusPill tone={samples > 0 ? "blue" : "slate"}>
                      {samples > 0 ? t("rl2_trust.score_with_samples", { value: value.toFixed(0), samples }) : t("rl2_trust.pending")}
                    </StatusPill>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(descKey)}</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${progressTone(value)}`}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                  />
                </div>
              </div>
            );
          })}

          {trust?.calculated_at ? (
            <p className="text-xs font-semibold text-slate-400">
              {t("rl2_trust.last_calculated", { date: new Date(trust.calculated_at).toLocaleString("fr-FR") })}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
