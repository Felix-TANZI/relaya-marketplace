import { useCallback, useEffect, useState } from "react";
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
  ["punctuality", "Ponctualité réception", "Délai entre la réception du colis et sa remise à l'acheteur."],
  ["security", "Sécurité stockage", "Preuves de chaîne de garde déposées à chaque étape."],
  ["satisfaction", "Satisfaction acheteur", "Notes laissées par les acheteurs après leur retrait."],
  ["disputes", "Retraits sans litige", "Absence de litige sur les colis passés par le point relais."],
  ["seniority", "Ancienneté", "Durée d'activité du point relais sur la plateforme."],
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
      kicker="Score public"
      title="Trust Score Point Relais"
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
            Trust / 100
          </div>
          <p className="mt-4 text-sm leading-6 text-blue-950/75 dark:text-blue-100/75">
            Visible par l'acheteur au moment du choix du point relais.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <StatusPill tone="slate">{trust?.sample_size ?? 0} observations</StatusPill>
            {trust?.parcel_value_cap_xaf ? (
              <StatusPill tone="amber">Plafond {trust.parcel_value_cap_xaf.toLocaleString("fr-FR")} FCFA</StatusPill>
            ) : trust ? (
              <StatusPill tone="emerald">Aucun plafond de valeur</StatusPill>
            ) : null}
          </div>
          {trust?.candidate_tier ? (
            <p className="mt-3 text-xs font-bold text-blue-900/70 dark:text-blue-200/70">
              Palier {trust.candidate_tier} en observation.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {trust?.veto_active ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
              Veto actif : {trust.veto_reason || "score plafonné par BelivaY."}
            </div>
          ) : null}

          {CRITERIA.map(([key, label, description]) => {
            const entry = trust?.breakdown?.[key];
            const value = entry?.score ?? 0;
            const samples = entry?.samples ?? 0;
            return (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-950 dark:text-white">{label}</strong>
                  <div className="flex items-center gap-2">
                    {entry ? <StatusPill tone="slate">poids {entry.weight} %</StatusPill> : null}
                    <StatusPill tone={samples > 0 ? "blue" : "slate"}>
                      {samples > 0 ? `${value.toFixed(0)}/100 · ${samples} obs.` : "En attente"}
                    </StatusPill>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
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
              Dernier calcul : {new Date(trust.calculated_at).toLocaleString("fr-FR")}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
