import { useCallback, useEffect, useState } from "react";
import { Clock, Download, Lock, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
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

  const steps = [
    { title: "Paiement initié", time: fmtDate(last?.created_at ?? order.created_at),
      desc: last ? `Demande ${PROVIDER_LABELS[last.provider]} envoyée au ${last.payer_phone}.` : "Commande créée.",
      state: last ? "done" : "cur" },
    { title: paid ? "Paiement confirmé" : "En attente de confirmation", time: paid ? fmtDate(order.updated_at) : "—",
      desc: paid ? `${order.total_xaf.toLocaleString("fr-FR")} FCFA débités.` : "Aucun montant n'a été débité pour l'instant.",
      state: paid ? "done" : "cur" },
    { title: "Fonds sous séquestre", time: released ? fmtDate(order.updated_at) : paid ? "En cours" : "À venir",
      desc: "L'argent est conservé par BelivaY pendant la préparation et la livraison.",
      state: released ? "done" : paid ? "cur" : "todo" },
    { title: "Libération au vendeur",
      time: released ? fmtDate(order.updated_at) : echeance ? fmtDate(echeance) : "À venir",
      desc: echeance && !released
        ? `Confirmation automatique le ${fmtDate(echeance)}${
          joursRestants !== null && joursRestants > 0
            ? ` — dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""}`
            : ""}, ou dès que vous confirmez la réception.`
        : "Dès que vous confirmez la réception de votre commande.",
      state: released ? "done" : "todo" },
  ] as const;

  const progress = DELIVERED.includes(order.fulfillment_status) ? 78 : paid ? 38 : 12;

  return (
    <div className="pf-stack">
      <PfShellStyles />

      <div className="pf-hero pf-anim">
        <i />
        <div className="pf-hero-k">{refunded ? "Remboursé" : paid ? "Sous séquestre" : "Reste à payer"}</div>
        <div className="pf-hero-v">{order.total_xaf.toLocaleString("fr-FR")}<span>FCFA</span></div>
        <div style={{ position: "relative", marginTop: 14, fontSize: 12, lineHeight: 1.6, opacity: .85 }}>
          {paid
            ? echeance
              // On l'ecrit en clair : cacher une echeance qui joue en
              // faveur du vendeur serait deloyal.
              ? <>Confirmation automatique le <b>{fmtDate(echeance)}</b>
                {joursRestants !== null && joursRestants > 0
                  && <> — dans <b>{joursRestants} jour{joursRestants > 1 ? "s" : ""}</b></>}
                , ou dès que vous confirmez la réception.</>
              : <>Libération au vendeur dès que vous confirmez la réception.</>
            : <>Les articles restent réservés jusqu'au paiement. Aucun débit n'a eu lieu.</>}
        </div>
        <div style={{ position: "relative", marginTop: 16, height: 7, borderRadius: 999, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${progress}%`, borderRadius: 999, background: "#fff", boxShadow: "0 0 12px rgba(255,255,255,.7)", transition: "width 1.2s cubic-bezier(.22,.61,.36,1)" }} />
        </div>
        <div style={{ position: "relative", marginTop: 9, display: "flex", justifyContent: "space-between", fontSize: 10.5, opacity: .75 }}>
          <span>Paiement</span><span>Livraison</span><span>Libération</span>
        </div>
      </div>

      {!paid && !refunded && (
        <div className="pf-card pf-anim" style={{ borderColor: "var(--pf-aring)" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <span className="pf-notif-ic"><Clock size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pf-t">Commande en attente de paiement</div>
              <div className="pf-sub">Reprenez là où vous vous êtes arrêté, rien n'est perdu.</div>
            </div>
          </div>
          <button className="pf-btn-accent pf-btn-block" onClick={() => setPaying(true)}><Lock size={16} />Reprendre le paiement</button>
        </div>
      )}

      <div className="pf-card pf-anim">
        <div className="pf-card-title" style={{ marginBottom: 20 }}>Cycle de vie du paiement</div>
        {steps.map((s, i) => (
          <div key={s.title} style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26, flexShrink: 0 }}>
              <span className={`pf-d ${s.state === "todo" ? "todo" : s.state === "cur" ? "cur" : "done"}`}>
                {s.state !== "todo" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              {i < steps.length - 1 && (
                <span style={{ flex: 1, width: 2, minHeight: 32, margin: "5px 0", background: s.state === "todo" ? "var(--pf-border)" : "var(--pf-aring)" }} />
              )}
            </div>
            <div style={{ paddingBottom: 20, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="pf-support-t" style={{ color: s.state === "todo" ? "var(--pf-muted)" : "var(--pf-text)" }}>{s.title}</span>
                <span className="pf-muted-sm">{s.time}</span>
              </div>
              <div className="pf-muted-sm" style={{ marginTop: 4, lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {txs.length > 0 && (
        <div className="pf-card pf-anim">
          <div className="pf-row-between pf-mb">
            <span className="pf-card-title">Transactions</span>
            <button className="pf-x" style={{ width: 30, height: 30 }} onClick={load} aria-label="Rafraîchir"><RefreshCw size={14} /></button>
          </div>
          {txs.map((t) => (
            <div key={t.id} className="pf-order-line">
              <OperatorLogo provider={t.provider} size={38} />
              <div className="pf-order-mid">
                <div className="pf-order-id">{PROVIDER_LABELS[t.provider]} · {t.payer_phone}</div>
                <div className="pf-muted-sm">{fmtDate(t.created_at)} · réf. {t.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <span className={`pf-badge-state ${t.status === "SUCCESS" ? "ok" : t.status === "FAILED" || t.status === "CANCELLED" ? "err" : "wait"}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {paid ? (
        <div className="pf-card pf-anim">
          <button className="pf-btn-ghost pf-btn-block" style={{ marginTop: 0 }} onClick={() => setReceipt(true)}><Download size={15} />Télécharger le reçu</button>
          <div className="pf-info-note" style={{ background: "rgba(217,45,32,.08)", borderColor: "rgba(217,45,32,.2)" }}>
            <span className="pf-info-ic" style={{ background: "rgba(217,45,32,.15)", color: "#d92d20" }}><TriangleAlert size={15} /></span>
            <div className="pf-muted-sm">Un problème avec cette commande ? Le paiement reste piloté par l'escrow et le litige est arbitré par BelivaY.</div>
          </div>
        </div>
      ) : (
        <div className="pf-note-ok">
          <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
          <span>Une commande non payée est automatiquement annulée : les articles retournent en stock et rien ne vous est débité.</span>
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