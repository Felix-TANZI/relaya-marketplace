// frontend/src/features/payments/PaymentReceipt.tsx
import { useEffect, useState } from "react";
import { Check, Copy, Printer, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listPaymentsByOrder, PROVIDER_LABELS, type PaymentTransaction } from "@/services/api/payments";
import type { Order } from "@/types/order";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";

export function PaymentReceipt({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useTranslation();
  const [tx, setTx] = useState<PaymentTransaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listPaymentsByOrder(order.id)
      .then((l) => setTx(l.find((t) => t.status === "SUCCESS") ?? l[0] ?? null))
      .catch(() => setTx(null));
  }, [order.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const nf = (n: number) => n.toLocaleString("fr-FR");
  const date = new Date(order.updated_at || order.created_at);
  const ref = tx ? tx.id.slice(0, 8).toUpperCase() : "—";
  const paid = order.payment_status === "PAID";

  const copyRef = () => {
    navigator.clipboard?.writeText(ref).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="pf-root" id="pf-doc-root">
      <PfShellStyles />

      {/* ── Modale à l'écran ── */}
      <div className="pf-backdrop pf-screen-only" role="dialog" aria-modal="true" aria-label={t("pm2_receipt.title")}>
        <div className="pf-sheet" style={{ maxWidth: 520 }}>

          <div className="pf-row-between pf-mb">
            <div>
              <div className="pf-panel-title" style={{ fontSize: 17 }}>{t("pm2_receipt.title")}</div>
              <div className="pf-muted-sm">{t("pm2_receipt.order_number", { id: order.id })} · {date.toLocaleDateString("fr-FR", { dateStyle: "long" })}</div>
            </div>
            <button className="pf-x" onClick={onClose} aria-label={t("pm2_receipt.close")}><X size={17} /></button>
          </div>

          {/* Montant */}
          <div className="pf-hero">
            <i />
            <div className="pf-hero-k">{paid ? t("pm2_receipt.paid") : order.payment_status}</div>
            <div className="pf-hero-v">{nf(order.total_xaf)}<span>FCFA</span></div>
            <div style={{ position: "relative", marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {tx && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                  <OperatorLogo provider={tx.provider} size={20} />{PROVIDER_LABELS[tx.provider]}
                </span>
              )}
              <button onClick={copyRef} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}{t("pm2_receipt.reference", { ref })}
              </button>
            </div>
          </div>

          {/* Métadonnées */}
          <div className="pf-card" style={{ marginTop: 14, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>{t("pm2_receipt.client")}</div>
                <div className="pf-summary-v" style={{ marginTop: 5 }}>{order.customer_phone}</div>
              </div>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>{order.delivery_mode === "PICKUP" ? t("pm2_receipt.pickup") : t("pm2_receipt.delivery")}</div>
                <div className="pf-summary-v" style={{ marginTop: 5, fontWeight: 600, lineHeight: 1.45 }}>{order.city}</div>
              </div>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>{t("pm2_receipt.collected_by")}</div>
                <div className="pf-summary-v" style={{ marginTop: 5 }}>{t("pm2_receipt.collected_by_value")}</div>
              </div>
            </div>
          </div>

          {/* Lignes */}
          <div className="pf-card" style={{ marginTop: 14, padding: "8px 16px 16px" }}>
            {order.items.map((it) => (
              <div key={it.id} className="pf-order-line">
                <div className="pf-order-mid">
                  <div className="pf-order-id" style={{ fontWeight: 600 }}>{it.title_snapshot}</div>
                  <div className="pf-muted-sm">{it.qty} × {nf(it.price_xaf_snapshot)} FCFA</div>
                </div>
                <div className="pf-order-total" style={{ color: "var(--pf-text)" }}>{nf(it.line_total_xaf)} FCFA</div>
              </div>
            ))}

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--pf-border)" }}>
              <div className="pf-summary-row"><span className="pf-muted-sm">{t("pm2_receipt.subtotal")}</span><span className="pf-summary-v">{nf(order.subtotal_xaf)} FCFA</span></div>
              <div className="pf-summary-row"><span className="pf-muted-sm">{t("pm2_receipt.delivery")}</span><span className="pf-summary-v">{order.delivery_fee_xaf === 0 ? t("pm2_receipt.free") : `${nf(order.delivery_fee_xaf)} FCFA`}</span></div>
              <div className="pf-total-row" style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--pf-border)" }}>
                <span className="pf-muted-sm">{t("pm2_receipt.total_paid")}</span><b>{nf(order.total_xaf)} FCFA</b>
              </div>
            </div>
          </div>

          <div className="pf-note-ok">
            <ShieldCheck size={17} style={{ flexShrink: 0, color: "#128a45" }} />
            <span>{t("pm2_receipt.proof_note")}</span>
          </div>

          <button className="pf-btn-accent pf-btn-block" onClick={() => window.print()}>
            <Printer size={16} />{t("pm2_receipt.print")}
          </button>
          <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>{t("pm2_receipt.close_button")}</button>
        </div>
      </div>

      {/* ── Feuille A4, uniquement à l'impression ── */}
      <div className="pf-print-only">
        <div className="pf-a4">
          <div className="pf-a4-head">
            <i />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", opacity: .8 }}>{t("pm2_receipt.title")}</div>
                <div style={{ marginTop: 10, fontSize: 40, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>
                  {nf(order.total_xaf)} <span style={{ fontSize: 16, opacity: .8 }}>FCFA</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 12.5, opacity: .9 }}>
                  {t("pm2_receipt.reference_long", { ref })} · {date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                </div>
              </div>
              <img src="/belivay-logo.png" alt="BelivaY" style={{ height: 34, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            {paid && <span className="pf-a4-stamp"><Check size={14} strokeWidth={3} />{t("pm2_receipt.paid_escrow_stamp")}</span>}
          </div>

          <div className="pf-a4-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, marginTop: 18 }}>
              <div><div className="pf-a4-k">{t("pm2_receipt.client")}</div><div className="pf-a4-v">{order.customer_phone}</div></div>
              <div>
                <div className="pf-a4-k">{t("pm2_receipt.payment_method")}</div>
                <div className="pf-a4-v">{tx ? PROVIDER_LABELS[tx.provider] : "—"}</div>
              </div>
              <div>
                <div className="pf-a4-k">{t("pm2_receipt.order")}</div>
                <div className="pf-a4-v">#{order.id}</div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="pf-a4-k">{order.delivery_mode === "PICKUP" ? t("pm2_receipt.pickup_point") : t("pm2_receipt.delivery_address")}</div>
              <div className="pf-a4-v" style={{ fontWeight: 600, lineHeight: 1.5 }}>{order.city} · {order.address}</div>
            </div>

            <table className="pf-a4-tbl" style={{ marginTop: 30 }}>
              <thead><tr><th>{t("pm2_receipt.col_item")}</th><th className="num">{t("pm2_receipt.col_qty")}</th><th className="num">{t("pm2_receipt.col_unit_price")}</th><th className="num">{t("pm2_receipt.col_total")}</th></tr></thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.title_snapshot}</td>
                    <td className="num">{it.qty}</td>
                    <td className="num">{nf(it.price_xaf_snapshot)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{nf(it.line_total_xaf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pf-a4-sum">
              <div><span>{t("pm2_receipt.subtotal")}</span><b>{nf(order.subtotal_xaf)} FCFA</b></div>
              <div><span>{t("pm2_receipt.delivery")}</span><b>{nf(order.delivery_fee_xaf)} FCFA</b></div>
              <div><span>{t("pm2_receipt.service_fee")}</span><b>0 FCFA</b></div>
              <div className="total"><span>{t("pm2_receipt.total_paid")}</span><b>{nf(order.total_xaf)} FCFA</b></div>
            </div>

            <div style={{ marginTop: "auto", marginBottom: 26, padding: 16, borderRadius: 12, background: "rgba(18,138,69,.08)", border: "1px solid rgba(18,138,69,.2)", fontSize: 11.5, lineHeight: 1.6, color: "rgba(26,20,32,.7)" }}>
              <b style={{ color: "#0f6b37" }}>{t("pm2_receipt.escrow_label")}</b> — {t("pm2_receipt.escrow_detail")}
            </div>
          </div>

          <div className="pf-a4-foot">
            <img src="/belivay-logo.png" alt="BelivaY" style={{ height: 24, objectFit: "contain", opacity: .8 }} />
            <div style={{ flex: 1, fontSize: 10.5, lineHeight: 1.6, color: "rgba(26,20,32,.5)" }}>
              BelivaY SARL · Yaoundé, Cameroun · support@belivay.com · belivay.com<br />
              {t("pm2_receipt.auto_generated_note")}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(26,20,32,.35)" }}>{ref}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
