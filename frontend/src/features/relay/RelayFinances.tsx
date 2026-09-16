import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarClock, ReceiptText, Wallet } from "lucide-react";
import { http } from "@/services/api/http";
import { PayoutAccountVerificationCard } from "@/components/payments/PayoutAccountVerificationCard";
import { Panel, StatusPill } from "./RelayUi";

interface PartnerDue {
  payee_code: string;
  display_label: string;
  due_xaf: number;
  released_not_settled_xaf: number;
  in_settlement_xaf: number;
  not_yet_due_xaf: number;
  next_settlement_cycle: string;
  blockers: string[];
}

interface PartnerPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  requested_at: string;
  settled_at: string | null;
}

interface RelayTariff {
  parcel_size: string;
  parcel_size_label: string;
  amount_xaf: number;
  is_accepted: boolean;
  is_negotiated: boolean;
}

/** DRF renvoie soit une liste nue, soit une page {results}. */
function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const page = payload as { results?: T[] } | null;
  return page?.results ?? [];
}

function xaf(value: number) {
  return `${(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function payoutTone(status: string): "emerald" | "amber" | "red" | "slate" {
  if (status === "PAID") return "emerald";
  if (["FAILED", "REJECTED", "REVERSED", "UNKNOWN"].includes(status)) return "red";
  if (status === "CANCELLED") return "slate";
  return "amber";
}

export default function RelayFinances({ onError }: { onError: (error: unknown) => void }) {
  const { t } = useTranslation();
  const [due, setDue] = useState<PartnerDue | null>(null);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [tariffs, setTariffs] = useState<RelayTariff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Les trois lectures sont independantes : un module indisponible ne doit
      // pas vider toute la page finances.
      const [dueResult, payoutResult, tariffResult] = await Promise.allSettled([
        http<PartnerDue>("/api/payments/v2/partner/due/"),
        http<unknown>("/api/payments/v2/partner/payouts/"),
        http<unknown>("/api/payments/v2/partner/relay-tariff/"),
      ]);
      if (cancelled) return;

      if (dueResult.status === "fulfilled") setDue(dueResult.value);
      else onError(dueResult.reason);
      setPayouts(payoutResult.status === "fulfilled" ? asList<PartnerPayout>(payoutResult.value) : []);
      setTariffs(tariffResult.status === "fulfilled" ? asList<RelayTariff>(tariffResult.value) : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const totalPaid = payouts
    .filter((payout) => payout.status === "PAID")
    .reduce((sum, payout) => sum + payout.amount_xaf, 0);

  const cards: Array<[typeof Wallet, string, string, string]> = [
    [Banknote, t("rl2_finances.card_amount_due"), xaf(due?.due_xaf ?? 0), t("rl2_finances.card_amount_due_body")],
    [Wallet, t("rl2_finances.card_already_paid"), xaf(totalPaid), t("rl2_finances.card_already_paid_body", { count: payouts.filter((p) => p.status === "PAID").length })],
    [ReceiptText, t("rl2_finances.card_in_settlement"), xaf(due?.in_settlement_xaf ?? 0), t("rl2_finances.card_in_settlement_body")],
    [CalendarClock, t("rl2_finances.card_next_cycle"), due?.next_settlement_cycle || "—", t("rl2_finances.card_next_cycle_body")],
  ];

  return (
    <div className="space-y-5">
      <Panel kicker={t("rl2_finances.kicker_settlements")} title={t("rl2_finances.title_momo")}>
        <div className="grid gap-4 md:grid-cols-4">
          {cards.map(([Icon, label, value, body]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
              <Icon className="text-blue-700 dark:text-blue-300" />
              <div className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{label}</div>
              <div className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{loading ? "…" : value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        {due?.blockers?.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {t("rl2_finances.payout_blocked", { reasons: due.blockers.join(" · ") })}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <PayoutAccountVerificationCard ownerRole="RELAY_POINT" accent="#1D4ED8" />

        <Panel kicker={t("rl2_finances.kicker_contract")} title={t("rl2_finances.tariff_grid_title")}>
          {loading ? (
            <p className="text-sm font-semibold text-slate-500">{t("rl2_finances.loading_grid")}</p>
          ) : tariffs.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("rl2_finances.no_grid")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {tariffs.map((tariff) => (
                <div
                  key={tariff.parcel_size}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800"
                >
                  <div>
                    <div className="font-black text-slate-950 dark:text-white">{tariff.parcel_size_label}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {tariff.is_negotiated ? t("rl2_finances.tariff_negotiated") : t("rl2_finances.tariff_default")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={tariff.is_accepted ? "emerald" : "red"}>
                      {tariff.is_accepted ? t("rl2_finances.tariff_accepted") : t("rl2_finances.tariff_refused")}
                    </StatusPill>
                    <strong className="text-sm text-slate-950 dark:text-white">{xaf(tariff.amount_xaf)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        kicker={t("rl2_finances.kicker_traceability")}
        title={t("rl2_finances.payouts_history_title")}
        action={<StatusPill tone={payouts.length > 0 ? "blue" : "slate"}>{payouts.length}</StatusPill>}
      >
        {loading ? (
          <p className="text-sm font-semibold text-slate-500">{t("rl2_finances.loading_payouts")}</p>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {t("rl2_finances.no_payouts")}
          </div>
        ) : (
          <>
          {/* Sous 768px le tableau imposait un defilement lateral de 620px :
              on sert la meme donnee en cartes empilees, lisibles au pouce. */}
          <div className="grid gap-2.5 md:hidden">
            {payouts.map((payout) => (
              <article
                key={payout.reference}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-slate-950 dark:text-white">{payout.reference}</div>
                    <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">{xaf(payout.amount_xaf)}</div>
                  </div>
                  <StatusPill tone={payoutTone(payout.status)}>{payout.status_label}</StatusPill>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t("rl2_finances.momo_label")}</dt>
                    <dd className="mt-0.5 truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {payout.payee_msisdn_masked || "—"}
                      {payout.payee_operator ? ` · ${payout.payee_operator}` : ""}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t("rl2_finances.settled_on_label")}</dt>
                    <dd className="mt-0.5 truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {payout.settled_at ? new Date(payout.settled_at).toLocaleDateString("fr-FR") : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="pb-2">{t("rl2_finances.table_reference")}</th>
                  <th className="pb-2">{t("rl2_finances.table_amount")}</th>
                  <th className="pb-2">{t("rl2_finances.table_momo_number")}</th>
                  <th className="pb-2">{t("rl2_finances.table_status")}</th>
                  <th className="pb-2">{t("rl2_finances.table_settled_on")}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.reference} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-bold text-slate-950 dark:text-white">{payout.reference}</td>
                    <td className="py-3 font-black text-slate-950 dark:text-white">{xaf(payout.amount_xaf)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {payout.payee_msisdn_masked || "—"} {payout.payee_operator ? `· ${payout.payee_operator}` : ""}
                    </td>
                    <td className="py-3">
                      <StatusPill tone={payoutTone(payout.status)}>{payout.status_label}</StatusPill>
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {payout.settled_at ? new Date(payout.settled_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panel>
    </div>
  );
}
