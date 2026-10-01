import { useCallback, useEffect, useState } from "react";
import { Clock, Download, Lock, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getOrderProtection, listPaymentsByOrder, PROVIDER_LABELS, type PaymentTransaction } from "@/services/api/payments";
import type { OrderProtection } from "@/services/api/payments";
import type { Order } from "@/types/order";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";
import PaymentSheet from "./PaymentSheet";
import { PaymentReceipt } from "./PaymentReceipt";

const RELEASED: Order["fulfillment_status"][] = ["RELEASED_TO_VENDOR"];
const DELIVERED: Order["fulfillment_status"][] = ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"];

export function OrderPaymentPanel({ order, onPaid }: { order: Order; onPaid?: () => void }) {
  const { t } = useTranslation();
  const [txs, setTxs] = useState<PaymentTransaction[]>([]);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(false);

  const load = useCallback(() => {
    listPaymentsByOrder(order.id).then(setTxs).catch(() => setTxs([]));
  }, [order.id]);

  useEffect(load, [load]);

  const last = txs[0] ?? null;
  const paid = order.payment_status === "PAID";
  const refunded = order.payment_status === "REFUNDED";
  const released = RELEASED.includes(order.fulfillment_status);
  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

  // ─────────────────────────────────────────────────────────────────────
  // L'ECHEANCE VIENT DU BACKEND, PAS D'UNE CONSTANTE
  //
  // Ce panneau annoncait « 72h » en dur. Or le delai depend de la
  // politique de sequestre configuree, et peut changer.
  //
  // Surtout : passe cette echeance, la commande est confirmee AUTOMATIQUE-
  // MENT et l'argent part au vendeur. Un acheteur qui l'ignore peut perdre
  // son recours sans avoir ete prevenu — c'est la seule information dont
  // l'absence lui coute de l'argent.
  // ─────────────────────────────────────────────────────────────────────
  const [protection, setProtection] = useState<OrderProtection | null>(null);
  // Le compte a rebours est fige au chargement, pas recalcule a chaque rendu :
  // `Date.now()` pendant le rendu rendrait le composant impur, et le nombre de
  // jours sauterait au gre de re-rendus sans rapport.
  const [joursRestants, setJoursRestants] = useState<number | null>(null);

  useEffect(() => {
    let monte = true;
    getOrderProtection(order.id)
      .then((lignes) => {
        if (!monte) return;
        const ligne = lignes.find((l) => l.component === "GOODS") ?? null;
        setProtection(ligne);
        setJoursRestants(
          ligne?.auto_confirm_at
            ? Math.ceil(
              (new Date(ligne.auto_confirm_at).getTime() - Date.now()) / 86_400_000,
            )
            : null,
        );
      })
      .catch(() => {
        // Silence : une commande anterieure au module financier n'a pas de
        // sequestre. Afficher une erreur serait inquietant sans raison.
      });
    return () => { monte = false; };
  }, [order.id]);

  const echeance = protection?.auto_confirm_at ?? null;

  const progress = DELIVERED.includes(order.fulfillment_status) ? 78 : paid ? 38 : 12;

  return (
    <div className="pf-stack">
      <PfShellStyles />

      <div className="pf-hero pf-anim">
        <i />
        <div className="pf-hero-k">{refunded ? t("pm2_order_panel.hero_refunded") : paid ? t("pm2_order_panel.hero_escrow") : t("pm2_order_panel.hero_to_pay")}</div>
        <div className="pf-hero-v">{order.total_xaf.toLocaleString("fr-FR")}<span>FCFA</span></div>
        <div style={{ position: "relative", marginTop: 14, fontSize: 12, lineHeight: 1.6, opacity: .85 }}>
          {paid
            ? echeance
              // On l'ecrit en clair : cacher une echeance qui joue en
              // faveur du vendeur serait deloyal.
              ? <>{t("pm2_order_panel.hero_confirm_prefix")} <b>{fmtDate(echeance)}</b>
                {joursRestants !== null && joursRestants > 0
                  && <> — <b>{t(joursRestants > 1 ? "pm2_order_panel.countdown_days_plural" : "pm2_order_panel.countdown_days", { days: joursRestants })}</b></>}
                {t("pm2_order_panel.hero_confirm_suffix")}</>
              : <>{t("pm2_order_panel.hero_release_no_deadline")}</>
            : <>{t("pm2_order_panel.hero_not_paid")}</>}
        </div>
        <div style={{ position: "relative", marginTop: 16, height: 7, borderRadius: 999, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${progress}%`, borderRadius: 999, background: "#fff", boxShadow: "0 0 12px rgba(255,255,255,.7)", transition: "width 1.2s cubic-bezier(.22,.61,.36,1)" }} />
        </div>
        <div style={{ position: "relative", marginTop: 9, display: "flex", justifyContent: "space-between", fontSize: 10.5, opacity: .75 }}>
          <span>{t("pm2_order_panel.progress_payment")}</span><span>{t("pm2_order_panel.progress_delivery")}</span><span>{t("pm2_order_panel.progress_release")}</span>
        </div>
      </div>

      {!paid && !refunded && (
        <div className="pf-card pf-anim" style={{ borderColor: "var(--pf-aring)" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <span className="pf-notif-ic"><Clock size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pf-t">{t("pm2_order_panel.awaiting_payment_title")}</div>
              <div className="pf-sub">{t("pm2_order_panel.awaiting_payment_desc")}</div>
            </div>
          </div>
          <button className="pf-btn-accent pf-btn-block" onClick={() => setPaying(true)}><Lock size={16} />{t("pm2_order_panel.resume_payment")}</button>
        </div>
      )}

      {txs.length > 0 && (
        <div className="pf-card pf-anim">
          <div className="pf-row-between pf-mb">
            <span className="pf-card-title">{t("pm2_order_panel.transactions_title")}</span>
            <button className="pf-x" style={{ width: 30, height: 30 }} onClick={load} aria-label={t("pm2_order_panel.refresh")}><RefreshCw size={14} /></button>
          </div>
          {txs.map((tx) => (
            <div key={tx.id} className="pf-order-line">
              <OperatorLogo provider={tx.provider} size={38} />
              <div className="pf-order-mid">
                <div className="pf-order-id">{PROVIDER_LABELS[tx.provider]} · {tx.payer_phone}</div>
                <div className="pf-muted-sm">{fmtDate(tx.created_at)} · {t("pm2_order_panel.reference", { ref: tx.id.slice(0, 8).toUpperCase() })}</div>
              </div>
              <span className={`pf-badge-state ${tx.status === "SUCCESS" ? "ok" : tx.status === "FAILED" || tx.status === "CANCELLED" ? "err" : "wait"}`}>{tx.status}</span>
            </div>
          ))}
        </div>
      )}

      {paid ? (
        <div className="pf-card pf-anim">
          <button className="pf-btn-ghost pf-btn-block" style={{ marginTop: 0 }} onClick={() => setReceipt(true)}><Download size={15} />{t("pm2_order_panel.download_receipt")}</button>
          <div className="pf-info-note" style={{ background: "rgba(217,45,32,.08)", borderColor: "rgba(217,45,32,.2)" }}>
            <span className="pf-info-ic" style={{ background: "rgba(217,45,32,.15)", color: "#d92d20" }}><TriangleAlert size={15} /></span>
            <div className="pf-muted-sm">{t("pm2_order_panel.dispute_note")}</div>
          </div>
        </div>
      ) : (
        <div className="pf-note-ok">
          <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
          <span>{t("pm2_order_panel.unpaid_note")}</span>
        </div>
      )}

      {paying && (
        <PaymentSheet
          orderId={order.id}
          amountXaf={order.total_xaf}
          defaultPhone={order.customer_phone}
          onClose={() => { setPaying(false); load(); }}
          onSuccess={() => { setPaying(false); load(); onPaid?.(); }}
        />
      )}
      {receipt && <PaymentReceipt order={order} onClose={() => setReceipt(false)} />}
    </div>
  );
}