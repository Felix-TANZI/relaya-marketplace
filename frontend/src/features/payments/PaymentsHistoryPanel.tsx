import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleCheckBig, Download, RefreshCw, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listMyPayments, PROVIDER_LABELS, type PaymentStatus, type PaymentTransaction } from "@/services/api/payments";
import { ordersApi } from "@/services/api/orders";
import type { Order } from "@/types/order";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";
import { PaymentReceipt } from "./PaymentReceipt";

type Filter = "all" | "SUCCESS" | "PENDING" | "FAILED";

const FILTERS: { key: Filter; labelKey: string }[] = [
  { key: "all", labelKey: "pm2_history_panel.filter_all" },
  { key: "SUCCESS", labelKey: "pm2_history_panel.filter_success" },
  { key: "PENDING", labelKey: "pm2_history_panel.filter_pending" },
  { key: "FAILED", labelKey: "pm2_history_panel.filter_failed" },
];

const TONE: Record<PaymentStatus, "ok" | "wait" | "err" | "mut"> = {
  SUCCESS: "ok", INITIATED: "wait", PENDING: "wait", FAILED: "err", CANCELLED: "mut",
};

const LABEL_KEY: Record<PaymentStatus, string> = {
  SUCCESS: "pm2_history_panel.status_success",
  INITIATED: "pm2_history_panel.status_initiated",
  PENDING: "pm2_history_panel.status_pending",
  FAILED: "pm2_history_panel.status_failed",
  CANCELLED: "pm2_history_panel.status_cancelled",
};

export function PaymentsHistoryPanel() {
  const { t } = useTranslation();
  const [txs, setTxs] = useState<PaymentTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  // Compte des echecs sur 12 mois glissants. Calcule au chargement et non
  // pendant le rendu : `Date.now()` y serait une impurete.
  const [failedRecent, setFailedRecent] = useState(0);

  // Les setState vivent tous dans des callbacks asynchrones : l'effet de
  // montage ne declenche aucun rendu en cascade.
  const fetchAll = useCallback(
    () =>
      Promise.all([listMyPayments().catch(() => []), ordersApi.getMyOrders().catch(() => [])])
        .then(([t, o]) => {
          setTxs(t);
          setOrders(o);
          const yearAgo = Date.now() - 365 * 24 * 3600 * 1000;
          setFailedRecent(
            t.filter((x) => (x.status === "FAILED" || x.status === "CANCELLED")
              && new Date(x.created_at).getTime() > yearAgo).length,
          );
        })
        .finally(() => setLoading(false)),
    [],
  );

  /** Rechargement manuel : reaffiche les squelettes le temps de l'appel. */
  const load = () => { setLoading(true); void fetchAll(); };

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const nf = (n: number) => n.toLocaleString("fr-FR");

  const stats = useMemo(() => {
    const ok = txs.filter((t) => t.status === "SUCCESS");
    const escrow = orders
      .filter((o) => o.payment_status === "PAID" && !["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"].includes(o.fulfillment_status))
      .reduce((s, o) => s + o.total_xaf, 0);
    return {
      ok: ok.length,
      spent: ok.reduce((s, t) => s + t.amount_xaf, 0),
      failed: failedRecent,
      escrow,
    };
  }, [txs, orders, failedRecent]);

  const filtered = filter === "all" ? txs : txs.filter((t) => (filter === "PENDING" ? t.status === "PENDING" || t.status === "INITIATED" : t.status === filter));

  const cards = [
    { ic: <CircleCheckBig size={19} />, v: String(stats.ok), l: t("pm2_history_panel.card_success"), bg: "rgba(18,138,69,.12)", fg: "#128a45" },
    { ic: <Wallet size={19} />, v: `${nf(stats.spent)} FCFA`, l: t("pm2_history_panel.card_spent"), bg: "var(--pf-asoft)", fg: "var(--pf-accent)" },
    { ic: <TriangleAlert size={19} />, v: String(stats.failed), l: t("pm2_history_panel.card_failed"), bg: "rgba(217,45,32,.1)", fg: "#d92d20" },
    { ic: <ShieldCheck size={19} />, v: `${nf(stats.escrow)} FCFA`, l: t("pm2_history_panel.card_escrow"), bg: "var(--pf-s3)", fg: "var(--pf-text2)" },
  ];

  return (
    <>
      <PfShellStyles />

      <div className="pf-panel-head">
        <div>
          <div className="pf-panel-title">{t("pm2_history_panel.title")}</div>
          <div className="pf-panel-sub">{t("pm2_history_panel.subtitle")}</div>
        </div>
        <button className="pf-x" onClick={load} aria-label={t("pm2_history_panel.refresh")}><RefreshCw size={15} /></button>
      </div>

      {/* Synthèse */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.l} className="pf-glass-panel" style={{ display: "flex", alignItems: "center", gap: 13, padding: 16 }}>
            <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 13, background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {c.ic}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="pf-name" style={{ fontSize: 18 }}>{c.v}</div>
              <div className="pf-muted-sm">{c.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="pf-type-toggle" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const n = f.key === "all" ? txs.length
            : f.key === "PENDING" ? txs.filter((t) => t.status === "PENDING" || t.status === "INITIATED").length
            : txs.filter((t) => t.status === f.key).length;
          return (
            <button key={f.key} type="button" className={`pf-type-btn${filter === f.key ? " on" : ""}`} onClick={() => setFilter(f.key)}>
              {t(f.labelKey)}<span style={{ marginLeft: 7, opacity: .7, fontVariantNumeric: "tabular-nums" }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="pf-glass-panel" style={{ height: 74, opacity: .5 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-ic"><Wallet size={22} /></span>
          <div className="pf-empty-t">{t("pm2_history_panel.empty_title")}</div>
          <div className="pf-muted-sm">
            {filter === "all" ? t("pm2_history_panel.empty_all") : t("pm2_history_panel.empty_category")}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((tx) => {
            const order = orders.find((o) => o.id === tx.order);
            const reason = tx.raw_payload?.failure_reason;
            return (
              <div key={tx.id} className="pf-card" style={{ padding: 15 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
                  <OperatorLogo provider={tx.provider} size={40} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div className="pf-order-id">{PROVIDER_LABELS[tx.provider] ?? tx.provider}</div>
                    <div className="pf-muted-sm">
                      {t("pm2_history_panel.order_number", { id: tx.order })} · {new Date(tx.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pf-order-total" style={{ fontSize: 15 }}>{nf(tx.amount_xaf)} FCFA</div>
                    <div className="pf-muted-sm" style={{ fontWeight: 700 }}>{t("pm2_history_panel.reference", { ref: tx.id.slice(0, 8).toUpperCase() })}</div>
                  </div>
                  <span className={`pf-badge-state ${TONE[tx.status]}`}>{t(LABEL_KEY[tx.status])}</span>
                </div>

                {reason && (
                  <div className="pf-muted-sm" style={{ marginTop: 10, padding: "9px 12px", borderRadius: 12, background: "rgba(217,45,32,.08)", border: "1px solid rgba(217,45,32,.18)" }}>
                    {reason}{tx.raw_payload?.failure_code ? ` · ${t("pm2_history_panel.failure_code", { code: tx.raw_payload.failure_code })}` : ""}
                  </div>
                )}

                {tx.status === "SUCCESS" && order && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button className="pf-btn-ghost" style={{ marginTop: 0 }} onClick={() => setReceiptOrder(order)}>
                      <Download size={14} />{t("pm2_history_panel.receipt")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {receiptOrder && <PaymentReceipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </>
  );
}
