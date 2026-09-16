import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Coins,
  Download,
  FileChartColumn,
  FileSpreadsheet,
  FileText,
  Package,
  PackageCheck,
} from "lucide-react";
import { http } from "@/services/api/http";
import { ModuleHeader, Panel, StatusPill } from "./RelayUi";

/**
 * Rapports & export du point relais.
 *
 * Tout est calcule depuis les operations reelles : les colis viennent du
 * serveur, le chiffre d'affaires de la grille tarifaire contractuelle et les
 * Avantages du bareme ci-dessous. Aucun chiffre n'est saisi en dur.
 */

interface ReportParcel {
  id: number;
  order_id: number;
  status: string;
  parcel_size: string;
  parcel_size_label: string;
  slot_code: string;
  received_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
}

interface RelayTariff {
  parcel_size: string;
  amount_xaf: number;
}

interface TrainingState {
  points: number;
}

interface PartnerDue {
  due_xaf: number;
  in_settlement_xaf: number;
  next_settlement_cycle: string;
}

interface PartnerPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  settled_at: string | null;
}

type PeriodKey = "mois" | "trimestre" | "annee";

const PERIODS: Array<{ key: PeriodKey; labelKey: string }> = [
  { key: "mois", labelKey: "rl2_reports.period_month" },
  { key: "trimestre", labelKey: "rl2_reports.period_quarter" },
  { key: "annee", labelKey: "rl2_reports.period_year" },
];

/** Bareme operationnel : chaque colis remis au bon porteur credite 2 Avantages. */
const AVANTAGES_PAR_COLIS = 2;

/** DRF renvoie soit une liste nue, soit une page {results}. */
function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const page = payload as { results?: T[] } | null;
  return page?.results ?? [];
}

function xaf(value: number) {
  return `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;
}

/** Debut de la periode selectionnee, a minuit, dans le fuseau du navigateur. */
function periodStart(period: PeriodKey, now: Date) {
  if (period === "annee") return new Date(now.getFullYear(), 0, 1);
  if (period === "trimestre") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Numero de semaine ISO 8601 : le jeudi de la semaine porte l'annee. */
function isoWeek(date: Date) {
  const cursor = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = cursor.getUTCDay() || 7;
  cursor.setUTCDate(cursor.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((cursor.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: cursor.getUTCFullYear(), week };
}

function weekKey(date: Date) {
  const { year, week } = isoWeek(date);
  return `${year}-${String(week).padStart(2, "0")}`;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Telechargement CSV : BOM UTF-8 pour qu'Excel garde les accents. */
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Ouvre un document imprimable : le gerant enregistre en PDF depuis la boite
 * d'impression du navigateur, sans dependance externe.
 */
function openPrintable(
  title: string,
  bodyHtml: string,
  onBlocked: () => void,
  labels: { print: string; close: string; footerLine1: string; footerLine2: string },
) {
  const printWindow = window.open("", "_blank", "width=980,height=1200");
  if (!printWindow) {
    onBlocked();
    return;
  }
  printWindow.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:32px 40px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0f172a;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #1d4ed8;padding-bottom:16px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-.02em;color:#1d4ed8}
  h1{font-size:19px;margin:18px 0 4px}
  .muted{color:#64748b;font-size:12px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12.5px}
  th{text-align:left;text-transform:uppercase;letter-spacing:.12em;font-size:9.5px;color:#64748b;border-bottom:2px solid #e2e8f0;padding:0 8px 8px}
  td{padding:9px 8px;border-bottom:1px solid #eef2f7}
  td.num,th.num{text-align:right}
  tfoot td{font-weight:800;border-top:2px solid #cbd5e1;border-bottom:none}
  .cards{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}
  .card{flex:1;min-width:150px;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}
  .card b{display:block;font-size:19px;margin-top:4px}
  .foot{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:10.5px;color:#64748b;line-height:1.7}
  .bar{position:fixed;top:0;left:0;right:0;background:#0f172a;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;font-size:12px}
  .bar button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:7px 14px;margin-left:8px;cursor:pointer}
  .bar .p{background:#2563eb;color:#fff}
  .bar .c{background:#e2e8f0;color:#0f172a}
  @media print{.bar{display:none}body{padding:0}}
</style></head>
<body>
  <div class="bar"><span>${title}</span><span>
    <button class="p" onclick="window.print()">${labels.print}</button>
    <button class="c" onclick="window.close()">${labels.close}</button>
  </span></div>
  <div style="height:44px"></div>
  ${bodyHtml}
  <div class="foot">
    ${labels.footerLine1}<br />
    ${labels.footerLine2}
  </div>
</body></html>`);
  printWindow.document.close();
}

export default function RelayReports({ onError }: { onError: (error: unknown) => void }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("mois");
  const [parcels, setParcels] = useState<ReportParcel[]>([]);
  const [tariffs, setTariffs] = useState<RelayTariff[]>([]);
  const [avantagesFormation, setAvantagesFormation] = useState(0);
  const [due, setDue] = useState<PartnerDue | null>(null);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Chaque source est independante : une brique indisponible ne doit pas
      // vider tout le rapport.
      const [parcelResult, tariffResult, trainingResult, dueResult, payoutResult] = await Promise.allSettled([
        http<unknown>("/api/shipping/relay-point/parcels/"),
        http<unknown>("/api/payments/v2/partner/relay-tariff/"),
        http<TrainingState>("/api/auth/relay-point/training/"),
        http<PartnerDue>("/api/payments/v2/partner/due/"),
        http<unknown>("/api/payments/v2/partner/payouts/"),
      ]);
      if (cancelled) return;

      if (parcelResult.status === "fulfilled") setParcels(asList<ReportParcel>(parcelResult.value));
      else onError(parcelResult.reason);

      setTariffs(tariffResult.status === "fulfilled" ? asList<RelayTariff>(tariffResult.value) : []);
      setAvantagesFormation(trainingResult.status === "fulfilled" ? trainingResult.value.points || 0 : 0);
      setDue(dueResult.status === "fulfilled" ? dueResult.value : null);
      setPayouts(payoutResult.status === "fulfilled" ? asList<PartnerPayout>(payoutResult.value) : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const tariffBySize = useMemo(() => {
    const map = new Map<string, number>();
    tariffs.forEach((tariff) => map.set(tariff.parcel_size, tariff.amount_xaf || 0));
    return map;
  }, [tariffs]);

  const report = useMemo(() => {
    const now = new Date();
    const start = periodStart(period, now);

    const inPeriod = (value: string | null) => {
      const date = parseDate(value);
      return date && date >= start && date <= now ? date : null;
    };

    // Une semaine = un seau. Les receptions et les retraits alimentent le meme
    // seau pour que le taux de remise soit lisible ligne a ligne.
    const buckets = new Map<
      string,
      { label: string; sortKey: string; recus: number; remis: number; revenus: number; avantages: number }
    >();

    const bucketFor = (date: Date) => {
      const key = weekKey(date);
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: t("rl2_reports.week_label", { week: isoWeek(date).week }),
          sortKey: key,
          recus: 0,
          remis: 0,
          revenus: 0,
          avantages: 0,
        });
      }
      return buckets.get(key)!;
    };

    let recus = 0;
    let remis = 0;
    let revenus = 0;

    parcels.forEach((parcel) => {
      const receivedAt = inPeriod(parcel.received_at);
      if (receivedAt) {
        recus += 1;
        bucketFor(receivedAt).recus += 1;
      }

      const pickedUpAt = inPeriod(parcel.picked_up_at);
      if (pickedUpAt) {
        const revenu = tariffBySize.get(parcel.parcel_size) ?? 0;
        remis += 1;
        revenus += revenu;
        const bucket = bucketFor(pickedUpAt);
        bucket.remis += 1;
        bucket.revenus += revenu;
        bucket.avantages += AVANTAGES_PAR_COLIS;
      }
    });

    const rows = [...buckets.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const avantagesOperations = remis * AVANTAGES_PAR_COLIS;

    return {
      start,
      now,
      rows,
      recus,
      remis,
      revenus,
      taux: recus > 0 ? Math.round((remis / recus) * 100) : 0,
      avantagesOperations,
      avantagesTotal: avantagesOperations + avantagesFormation,
      tarifManquant: remis > 0 && tariffBySize.size === 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avantagesFormation, parcels, period, tariffBySize, t]);

  const periodLabel = t(PERIODS.find((item) => item.key === period)?.labelKey ?? "");
  const rangeLabel = `${report.start.toLocaleDateString("fr-FR")} → ${report.now.toLocaleDateString("fr-FR")}`;
  const stamp = new Date().toISOString().slice(0, 10);
  const blocked = () => setNotice(t("rl2_reports.popup_blocked"));

  const printLabels = {
    print: t("rl2_reports.print_button"),
    close: t("rl2_reports.print_close"),
    footerLine1: t("rl2_reports.print_footer_line1"),
    footerLine2: t("rl2_reports.print_footer_line2"),
  };

  const exportSyntheseCsv = () => {
    downloadCsv(`belivay-relais-synthese-${period}-${stamp}.csv`, [
      [t("rl2_reports.csv_synthese_comment")],
      [t("rl2_reports.csv_period_comment"), periodLabel, rangeLabel],
      [],
      [
        t("rl2_reports.table_col_week"),
        t("rl2_reports.table_col_received"),
        t("rl2_reports.table_col_delivered"),
        t("rl2_reports.csv_col_rate_pct"),
        t("rl2_reports.csv_col_revenue_fcfa"),
        t("rl2_reports.table_col_advantages"),
      ],
      ...report.rows.map((row) => [
        row.label,
        row.recus,
        row.remis,
        row.recus > 0 ? Math.round((row.remis / row.recus) * 100) : 0,
        Math.round(row.revenus),
        row.avantages,
      ]),
      [],
      [t("rl2_reports.csv_total_label"), report.recus, report.remis, report.taux, Math.round(report.revenus), report.avantagesOperations],
      [t("rl2_reports.csv_training_advantages_label"), avantagesFormation],
    ]);
  };

  const exportActiviteCsv = () => {
    const lignes = parcels
      .filter((parcel) => {
        const received = parseDate(parcel.received_at);
        const picked = parseDate(parcel.picked_up_at);
        return (received && received >= report.start) || (picked && picked >= report.start);
      })
      .sort((a, b) => (a.received_at || "").localeCompare(b.received_at || ""));

    downloadCsv(`belivay-relais-activite-${period}-${stamp}.csv`, [
      [t("rl2_reports.csv_activite_comment")],
      [t("rl2_reports.csv_period_comment"), periodLabel, rangeLabel],
      [],
      [
        t("rl2_reports.table_col_reference"),
        t("rl2_reports.csv_col_slot"),
        t("rl2_reports.csv_col_size"),
        t("rl2_reports.table_col_status"),
        t("rl2_reports.csv_col_received_at"),
        t("rl2_reports.csv_col_delivered_at"),
        t("rl2_reports.csv_col_returned_at"),
        t("rl2_reports.csv_col_revenue_fcfa"),
      ],
      ...lignes.map((parcel) => [
        `BV-${parcel.order_id}`,
        parcel.slot_code || "—",
        parcel.parcel_size_label || parcel.parcel_size || "—",
        parcel.status,
        parcel.received_at ? new Date(parcel.received_at).toLocaleString("fr-FR") : "—",
        parcel.picked_up_at ? new Date(parcel.picked_up_at).toLocaleString("fr-FR") : "—",
        parcel.returned_at ? new Date(parcel.returned_at).toLocaleString("fr-FR") : "—",
        parcel.picked_up_at ? Math.round(tariffBySize.get(parcel.parcel_size) ?? 0) : 0,
      ]),
    ]);
  };

  const documentHead = (titre: string) => `
    <div class="head">
      <div><div class="brand">BelivaY</div><div class="muted">${t("rl2_reports.print_brand_sub")}</div></div>
      <div style="text-align:right" class="muted">${t("rl2_reports.print_edited_on", { date: new Date().toLocaleString("fr-FR") })}<br />${t("rl2_reports.print_period_label", { period: periodLabel, range: rangeLabel })}</div>
    </div>
    <h1>${titre}</h1>`;

  const exportSynthesePdf = () => {
    const lignes = report.rows
      .map(
        (row) => `<tr>
          <td>${row.label}</td>
          <td class="num">${row.recus}</td>
          <td class="num">${row.remis}</td>
          <td class="num">${row.recus > 0 ? Math.round((row.remis / row.recus) * 100) : 0} %</td>
          <td class="num">${xaf(row.revenus)}</td>
          <td class="num">${row.avantages}</td>
        </tr>`,
      )
      .join("");

    openPrintable(
      t("rl2_reports.synthese_doc_title"),
      `${documentHead(t("rl2_reports.synthese_doc_h1"))}
      <div class="cards">
        <div class="card"><span class="muted">${t("rl2_reports.card_received")}</span><b>${report.recus}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_delivered")}</span><b>${report.remis}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_rate")}</span><b>${report.taux} %</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_revenue")}</span><b>${xaf(report.revenus)}</b></div>
      </div>
      <table>
        <thead><tr><th>${t("rl2_reports.table_col_week")}</th><th class="num">${t("rl2_reports.table_col_received")}</th><th class="num">${t("rl2_reports.table_col_delivered")}</th><th class="num">${t("rl2_reports.table_col_rate")}</th><th class="num">${t("rl2_reports.table_col_revenue")}</th><th class="num">${t("rl2_reports.table_col_advantages")}</th></tr></thead>
        <tbody>${lignes || `<tr><td colspan="6">${t("rl2_reports.table_empty_period")}</td></tr>`}</tbody>
        <tfoot><tr><td>${t("rl2_reports.csv_total_label")}</td><td class="num">${report.recus}</td><td class="num">${report.remis}</td><td class="num">${report.taux} %</td><td class="num">${xaf(report.revenus)}</td><td class="num">${report.avantagesOperations}</td></tr></tfoot>
      </table>`,
      blocked,
      printLabels,
    );
  };

  const exportBordereauMomo = () => {
    const lignes = payouts
      .map(
        (payout) => `<tr>
          <td>${payout.reference}</td>
          <td>${payout.payee_msisdn_masked || "—"} ${payout.payee_operator || ""}</td>
          <td>${payout.status_label || payout.status}</td>
          <td>${payout.settled_at ? new Date(payout.settled_at).toLocaleDateString("fr-FR") : "—"}</td>
          <td class="num">${xaf(payout.amount_xaf)}</td>
        </tr>`,
      )
      .join("");
    const totalVerse = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + (p.amount_xaf || 0), 0);

    openPrintable(
      t("rl2_reports.bordereau_doc_title"),
      `${documentHead(t("rl2_reports.bordereau_doc_h1"))}
      <div class="cards">
        <div class="card"><span class="muted">${t("rl2_reports.card_ca_period")}</span><b>${xaf(report.revenus)}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_already_paid")}</span><b>${xaf(totalVerse)}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_amount_due")}</span><b>${xaf(due?.due_xaf ?? 0)}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_next_cycle")}</span><b style="font-size:15px">${due?.next_settlement_cycle || "—"}</b></div>
      </div>
      <table>
        <thead><tr><th>${t("rl2_reports.table_col_reference")}</th><th>${t("rl2_reports.table_col_momo_account")}</th><th>${t("rl2_reports.table_col_status")}</th><th>${t("rl2_reports.table_col_settled_at")}</th><th class="num">${t("rl2_reports.table_col_amount")}</th></tr></thead>
        <tbody>${lignes || `<tr><td colspan="5">${t("rl2_reports.table_empty_payouts")}</td></tr>`}</tbody>
        <tfoot><tr><td colspan="4">${t("rl2_reports.table_total_paid")}</td><td class="num">${xaf(totalVerse)}</td></tr></tfoot>
      </table>`,
      blocked,
      printLabels,
    );
  };

  const exportReleveAvantages = () => {
    const lignes = report.rows
      .map(
        (row) => `<tr><td>${row.label}</td><td class="num">${row.remis}</td><td class="num">+${row.avantages}</td></tr>`,
      )
      .join("");

    openPrintable(
      t("rl2_reports.releve_doc_title"),
      `${documentHead(t("rl2_reports.releve_doc_h1"))}
      <div class="cards">
        <div class="card"><span class="muted">${t("rl2_reports.card_ops_advantages")}</span><b>${report.avantagesOperations}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_training_advantages")}</span><b>${avantagesFormation}</b></div>
        <div class="card"><span class="muted">${t("rl2_reports.card_total_period")}</span><b>${report.avantagesTotal}</b></div>
      </div>
      <p class="muted" style="margin-top:14px">${t("rl2_reports.bareme_note", { count: AVANTAGES_PAR_COLIS })}</p>
      <table>
        <thead><tr><th>${t("rl2_reports.table_col_week")}</th><th class="num">${t("rl2_reports.table_col_delivered_parcels")}</th><th class="num">${t("rl2_reports.table_col_advantages")}</th></tr></thead>
        <tbody>${lignes || `<tr><td colspan="3">${t("rl2_reports.table_empty_advantages")}</td></tr>`}</tbody>
        <tfoot><tr><td>${t("rl2_reports.table_subtotal_ops")}</td><td class="num">${report.remis}</td><td class="num">+${report.avantagesOperations}</td></tr></tfoot>
      </table>`,
      blocked,
      printLabels,
    );
  };

  const cards: Array<{ label: string; value: string; hint: string; icon: typeof Package; filled: boolean }> = [
    { label: t("rl2_reports.card_received"), value: String(report.recus), hint: t("rl2_reports.card_hint_period"), icon: Package, filled: true },
    { label: t("rl2_reports.card_delivered"), value: String(report.remis), hint: t("rl2_reports.card_hint_rate", { rate: report.taux }), icon: PackageCheck, filled: true },
    { label: t("rl2_reports.card_revenue"), value: Math.round(report.revenus).toLocaleString("fr-FR"), hint: t("rl2_reports.card_hint_fcfa"), icon: BarChart3, filled: false },
    { label: t("rl2_reports.card_advantages_earned"), value: String(report.avantagesTotal), hint: t("rl2_reports.card_hint_training", { count: avantagesFormation }), icon: Coins, filled: true },
  ];

  const exportables: Array<{ icon: typeof FileText; titre: string; detail: string; action: () => void }> = [
    { icon: FileText, titre: t("rl2_reports.export_bordereau_title"), detail: t("rl2_reports.export_bordereau_detail"), action: exportBordereauMomo },
    { icon: BarChart3, titre: t("rl2_reports.export_activite_title"), detail: t("rl2_reports.export_activite_detail"), action: exportActiviteCsv },
    { icon: Coins, titre: t("rl2_reports.export_avantages_title"), detail: t("rl2_reports.export_avantages_detail"), action: exportReleveAvantages },
  ];

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={FileChartColumn}
        title={t("rl2_reports.header_title")}
        subtitle={t("rl2_reports.header_subtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportSyntheseCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <Download size={15} strokeWidth={2.6} /> {t("rl2_reports.btn_csv")}
            </button>
            <button
              type="button"
              onClick={exportSynthesePdf}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              <FileText size={15} strokeWidth={2.6} /> {t("rl2_reports.btn_pdf")}
            </button>
          </div>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{notice}</div>
      ) : null}

      {/* Bascule de periode : tout l'ecran (cartes, tableau, exports) suit. */}
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPeriod(item.key)}
            aria-pressed={period === item.key}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              period === item.key
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, filled }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl p-5 ${
              filled
                ? "bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-[0_12px_26px_-14px_rgba(29,78,216,.9)]"
                : "border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            }`}
          >
            <Icon
              size={18}
              strokeWidth={2.4}
              className={`absolute right-4 top-4 ${filled ? "text-white/45" : "text-slate-300 dark:text-slate-600"}`}
            />
            <div className={`text-[11px] font-black uppercase tracking-[0.14em] ${filled ? "text-white/75" : "text-slate-400"}`}>
              {label}
            </div>
            <div className="mt-2 text-3xl font-black leading-none">{loading ? "…" : value}</div>
            <div className={`mt-2 text-xs font-bold ${filled ? "text-white/70" : "text-slate-500 dark:text-slate-400"}`}>{hint}</div>
          </div>
        ))}
      </div>

      {report.tarifManquant ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          {t("rl2_reports.no_tariff_notice")}
        </div>
      ) : null}

      <Panel
        icon={BarChart3}
        title={t("rl2_reports.weekly_detail_title")}
        action={<StatusPill tone={report.rows.length > 0 ? "blue" : "slate"}>{periodLabel}</StatusPill>}
      >
        {loading ? (
          <p className="text-sm font-semibold text-slate-500">{t("rl2_reports.loading_operations")}</p>
        ) : report.rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {t("rl2_reports.empty_operations")}
          </div>
        ) : (
          <>
          {/* Variante telephone du tableau : six colonnes ne tiennent pas sous
              768px, chaque semaine devient une carte autonome. */}
          <div className="grid gap-2.5 md:hidden">
            {report.rows.map((row) => {
              const taux = row.recus > 0 ? Math.round((row.remis / row.recus) * 100) : 0;
              return (
                <article
                  key={row.sortKey}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] font-black text-slate-950 dark:text-white">{row.label}</span>
                    <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                      {taux} %
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t("rl2_reports.mobile_received_label")}</div>
                      <div className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">{row.recus}</div>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{t("rl2_reports.mobile_delivered_label")}</div>
                      <div className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">{row.remis}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {row.avantages} <span className="text-amber-500">◉</span> {t("rl2_reports.advantages_suffix")}
                    </span>
                    <strong className="text-sm font-black text-slate-950 dark:text-white">{xaf(row.revenus)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="pb-3">{t("rl2_reports.table_col_week")}</th>
                  <th className="pb-3 text-right">{t("rl2_reports.table_col_received")}</th>
                  <th className="pb-3 text-right">{t("rl2_reports.table_col_delivered")}</th>
                  <th className="pb-3 text-center">{t("rl2_reports.table_col_rate")}</th>
                  <th className="pb-3 text-right">{t("rl2_reports.table_col_revenue")}</th>
                  <th className="pb-3 text-right">{t("rl2_reports.table_col_advantages")}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => {
                  const taux = row.recus > 0 ? Math.round((row.remis / row.recus) * 100) : 0;
                  return (
                    <tr key={row.sortKey} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-3.5 font-semibold text-slate-600 dark:text-slate-300">{row.label}</td>
                      <td className="py-3.5 text-right font-black text-slate-950 dark:text-white">{row.recus}</td>
                      <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">{row.remis}</td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                          {taux} %
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-950 dark:text-white">{xaf(row.revenus)}</td>
                      <td className="py-3.5 text-right font-bold text-slate-600 dark:text-slate-300">
                        {row.avantages} <span className="text-amber-500">◉</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panel>

      <Panel icon={FileSpreadsheet} title={t("rl2_reports.documents_title")}>
        <div className="grid gap-4 md:grid-cols-3">
          {exportables.map(({ icon: Icon, titre, detail, action }) => (
            <div key={titre} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Icon size={22} strokeWidth={2.2} className="text-blue-700 dark:text-blue-300" />
              <h3 className="mt-4 font-black text-slate-950 dark:text-white">{titre}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{detail}</p>
              <button
                type="button"
                onClick={action}
                disabled={loading}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {t("rl2_reports.download_button")}
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
