// frontend/src/features/payments/PaymentReceipt.tsx
import { useEffect, useState } from "react";
import { Check, Copy, Printer, ShieldCheck, X } from "lucide-react";
import { listPaymentsByOrder, PROVIDER_LABELS, type PaymentTransaction } from "@/services/api/payments";
import type { Order } from "@/types/order";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";

export function PaymentReceipt({ order, onClose }: { order: Order; onClose: () => void }) {
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
      <div className="pf-backdrop pf-screen-only" role="dialog" aria-modal="true" aria-label="Reçu de paiement">
        <div className="pf-sheet" style={{ maxWidth: 520 }}>

          <div className="pf-row-between pf-mb">
            <div>
              <div className="pf-panel-title" style={{ fontSize: 17 }}>Reçu de paiement</div>
              <div className="pf-muted-sm">Commande #{order.id} · {date.toLocaleDateString("fr-FR", { dateStyle: "long" })}</div>
            </div>
            <button className="pf-x" onClick={onClose} aria-label="Fermer"><X size={17} /></button>
          </div>

          {/* Montant */}
          <div className="pf-hero">
            <i />
            <div className="pf-hero-k">{paid ? "Payé" : order.payment_status}</div>
            <div className="pf-hero-v">{nf(order.total_xaf)}<span>FCFA</span></div>
            <div style={{ position: "relative", marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {tx && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                  <OperatorLogo provider={tx.provider} size={20} />{PROVIDER_LABELS[tx.provider]}
                </span>
              )}
              <button onClick={copyRef} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}Réf. {ref}
              </button>
            </div>
          </div>

          {/* Métadonnées */}
          <div className="pf-card" style={{ marginTop: 14, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>Client</div>
                <div className="pf-summary-v" style={{ marginTop: 5 }}>{order.customer_phone}</div>
              </div>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>{order.delivery_mode === "PICKUP" ? "Retrait" : "Livraison"}</div>
                <div className="pf-summary-v" style={{ marginTop: 5, fontWeight: 600, lineHeight: 1.45 }}>{order.city}</div>
              </div>
              <div>
                <div className="pf-sec" style={{ padding: 0 }}>Encaissé par</div>
                <div className="pf-summary-v" style={{ marginTop: 5 }}>BelivaY · séquestre</div>
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
              <div className="pf-summary-row"><span className="pf-muted-sm">Sous-total</span><span className="pf-summary-v">{nf(order.subtotal_xaf)} FCFA</span></div>
              <div className="pf-summary-row"><span className="pf-muted-sm">Livraison</span><span className="pf-summary-v">{order.delivery_fee_xaf === 0 ? "Gratuit" : `${nf(order.delivery_fee_xaf)} FCFA`}</span></div>
              <div className="pf-total-row" style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--pf-border)" }}>
                <span className="pf-muted-sm">Total payé</span><b>{nf(order.total_xaf)} FCFA</b>
              </div>
            </div>
          </div>

          <div className="pf-note-ok">
            <ShieldCheck size={17} style={{ flexShrink: 0, color: "#128a45" }} />
            <span>Ce reçu vaut justificatif : il porte la référence opérateur et l'état du séquestre.</span>
          </div>

          <button className="pf-btn-accent pf-btn-block" onClick={() => window.print()}>
            <Printer size={16} />Imprimer / enregistrer en A4
          </button>
          <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>Fermer</button>
        </div>
      </div>

      {/* ── Feuille A4, uniquement à l'impression ── */}
      <div className="pf-print-only">
        <div className="pf-a4">
          <div className="pf-a4-head">
            <i />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", opacity: .8 }}>Reçu de paiement</div>
                <div style={{ marginTop: 10, fontSize: 40, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>
                  {nf(order.total_xaf)} <span style={{ fontSize: 16, opacity: .8 }}>FCFA</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 12.5, opacity: .9 }}>
                  Référence {ref} · {date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                </div>
              </div>
              <img src="/belivay-logo.png" alt="BelivaY" style={{ height: 34, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            {paid && <span className="pf-a4-stamp"><Check size={14} strokeWidth={3} />Payé · sous séquestre</span>}
          </div>

          <div className="pf-a4-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, marginTop: 18 }}>
              <div><div className="pf-a4-k">Client</div><div className="pf-a4-v">{order.customer_phone}</div></div>
              <div>
                <div className="pf-a4-k">Moyen de paiement</div>
                <div className="pf-a4-v">{tx ? PROVIDER_LABELS[tx.provider] : "—"}</div>
              </div>
              <div>
                <div className="pf-a4-k">Commande</div>
                <div className="pf-a4-v">#{order.id}</div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="pf-a4-k">{order.delivery_mode === "PICKUP" ? "Point de retrait" : "Adresse de livraison"}</div>
              <div className="pf-a4-v" style={{ fontWeight: 600, lineHeight: 1.5 }}>{order.city} · {order.address}</div>
            </div>

            <table className="pf-a4-tbl" style={{ marginTop: 30 }}>
              <thead><tr><th>Article</th><th className="num">Qté</th><th className="num">P.U.</th><th className="num">Total</th></tr></thead>
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
              <div><span>Sous-total</span><b>{nf(order.subtotal_xaf)} FCFA</b></div>
              <div><span>Livraison</span><b>{nf(order.delivery_fee_xaf)} FCFA</b></div>
              <div><span>Frais de service</span><b>0 FCFA</b></div>
              <div className="total"><span>Total payé</span><b>{nf(order.total_xaf)} FCFA</b></div>
            </div>

            <div style={{ marginTop: "auto", marginBottom: 26, padding: 16, borderRadius: 12, background: "rgba(18,138,69,.08)", border: "1px solid rgba(18,138,69,.2)", fontSize: 11.5, lineHeight: 1.6, color: "rgba(26,20,32,.7)" }}>
              <b style={{ color: "#0f6b37" }}>Escrow BelivaY</b> — le montant est conservé par BelivaY et versé au vendeur 72h après la
              livraison, ou dès confirmation de réception. Ce reçu vaut justificatif de paiement.
            </div>
          </div>

          <div className="pf-a4-foot">
            <img src="/belivay-logo.png" alt="BelivaY" style={{ height: 24, objectFit: "contain", opacity: .8 }} />
            <div style={{ flex: 1, fontSize: 10.5, lineHeight: 1.6, color: "rgba(26,20,32,.5)" }}>
              BelivaY SARL · Yaoundé, Cameroun · support@belivay.com · belivay.com<br />
              Document généré automatiquement — ne nécessite pas de signature.
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(26,20,32,.35)" }}>{ref}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
