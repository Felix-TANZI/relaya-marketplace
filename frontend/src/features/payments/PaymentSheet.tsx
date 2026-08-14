import { useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, Download, Lock, RefreshCw, ShieldCheck, Smartphone, TriangleAlert, X } from "lucide-react";
import { CAMEROON, detectOperator, isValidNationalNumber, toE164, toNationalNumber } from "@/lib/phone";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PROVIDER_LABELS, type PaymentProvider, type PaymentTransaction } from "@/services/api/payments";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";
import { PAYMENT_TIMEOUT_S, usePaymentTransaction } from "./usePaymentTransaction";

type Props = {
  orderId: number;
  amountXaf: number;
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: (tx: PaymentTransaction) => void;
};

const RING = 2 * Math.PI * 80;

export default function PaymentSheet({ orderId, amountXaf, defaultPhone, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"method" | "phone">("method");
  const [provider, setProvider] = useState<PaymentProvider>("MTN_MOMO");
  const [phone, setPhone] = useState(() => toE164(toNationalNumber(defaultPhone || "")));
  const { phase, tx, error, secondsLeft, start, reset } = usePaymentTransaction(orderId);

  const national = toNationalNumber(phone);
  const operator = detectOperator(national);
  const phoneValid = isValidNationalNumber(national, CAMEROON);
  const amount = useMemo(() => amountXaf.toLocaleString("fr-FR"), [amountXaf]);
  const mismatch = phoneValid && operator &&
    ((provider === "MTN_MOMO" && operator.name !== "MTN") || (provider === "ORANGE_MONEY" && operator.name !== "Orange"));
  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="pf-root">
      <PfShellStyles />
      <div className="pf-backdrop" role="dialog" aria-modal="true" aria-label="Paiement">
        <div className="pf-sheet">

          {phase === "idle" && step === "method" && (
            <>
              <div className="pf-row-between pf-mb">
                <div>
                  <div className="pf-panel-title" style={{ fontSize: 17 }}>Paiement</div>
                  <div className="pf-muted-sm">Commande #{orderId}</div>
                </div>
                <button className="pf-x" onClick={onClose} aria-label="Fermer"><X size={17} /></button>
              </div>

              <div className="pf-hero">
                <i />
                <div className="pf-hero-k">Montant à payer</div>
                <div className="pf-hero-v">{amount}<span>FCFA</span></div>
              </div>

              <div className="pf-sec" style={{ padding: "20px 0 10px", color: "var(--pf-accent)" }}>Comment souhaitez-vous payer ?</div>

              {(["MTN_MOMO", "ORANGE_MONEY"] as PaymentProvider[]).map((p) => {
                const detected = operator?.name === (p === "MTN_MOMO" ? "MTN" : "Orange");
                return (
                  <button key={p} type="button" className={`pf-opt${provider === p ? " on" : ""}`} onClick={() => setProvider(p)}>
                    <OperatorLogo provider={p} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="pf-support-t">{PROVIDER_LABELS[p]}</span>
                      <span className="pf-muted-sm" style={{ display: "block", marginTop: 3 }}>
                        {national && detected ? `+237 ${national} · numéro détecté` : "Validation par code secret sur votre mobile"}
                      </span>
                      {national && detected && <span className="pf-chip" style={{ marginTop: 8, padding: "3px 9px", fontSize: 10.5 }}>Numéro enregistré</span>}
                    </span>
                    <span className="pf-radio"><Check size={13} strokeWidth={3.2} /></span>
                  </button>
                );
              })}

              <div className="pf-note-ok">
                <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
                <span><b>Escrow BelivaY</b> — votre argent est bloqué chez BelivaY et n'est versé au vendeur qu'après confirmation de la réception.</span>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => setStep("phone")}>
                Continuer avec {PROVIDER_LABELS[provider]}
              </button>
            </>
          )}

          {phase === "idle" && step === "phone" && (
            <>
              <div className="pf-row-between pf-mb">
                <button className="pf-x" onClick={() => setStep("method")} aria-label="Retour"><ArrowLeft size={17} /></button>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <div className="pf-panel-title" style={{ fontSize: 17 }}>{PROVIDER_LABELS[provider]}</div>
                  <div className="pf-muted-sm">Numéro à débiter</div>
                </div>
                <OperatorLogo provider={provider} size={38} />
              </div>

              <div className="pf-card">
                <PhoneInput value={phone} onChange={setPhone} label="Numéro de paiement" helperText="Ex : 6XX XX XX XX" autoFocus />
                {mismatch && (
                  <div className="pf-info-note">
                    <span className="pf-info-ic"><TriangleAlert size={15} /></span>
                    <div className="pf-muted-sm">Ce numéro semble être {operator?.name}, mais vous avez choisi {PROVIDER_LABELS[provider]}.</div>
                  </div>
                )}
              </div>

              <div className="pf-card" style={{ marginTop: 14 }}>
                <div className="pf-card-title pf-mb">Ce qui va se passer</div>
                {[
                  "Une demande de paiement arrive sur votre téléphone.",
                  `Vous saisissez votre code secret ${PROVIDER_LABELS[provider]}.`,
                  "La commande se confirme toute seule ici.",
                ].map((t, i) => (
                  <div key={i} className="pf-flow-row" style={{ marginBottom: 12 }}>
                    <span className="pf-flow-ic" style={{ background: "var(--pf-asoft)", color: "var(--pf-accent)", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <button className="pf-btn-accent pf-btn-block" disabled={!phoneValid} onClick={() => start(provider, toE164(national))}>
                <Lock size={16} />Payer {amount} FCFA
              </button>
              <div className="pf-muted-sm" style={{ marginTop: 9, textAlign: "center" }}>Aucun frais supplémentaire · débit unique</div>
            </>
          )}

          {phase === "pending" && (
            <>
              <div className="pf-row-between">
                <div className="pf-muted-sm">Paiement en cours</div>
                <span className="pf-chip"><OperatorLogo provider={provider} size={18} />{PROVIDER_LABELS[provider]}</span>
              </div>

              <div className="pf-ring">
                <i /><i /><i />
                <svg className="track" width="172" height="172" viewBox="0 0 172 172">
                  <circle cx="86" cy="86" r="80" fill="none" stroke="var(--pf-s3)" strokeWidth="5" />
                  <circle cx="86" cy="86" r="80" fill="none" stroke="var(--pf-accent)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={RING} strokeDashoffset={RING - RING * (secondsLeft / PAYMENT_TIMEOUT_S)}
                    style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <span className="core"><Smartphone size={44} strokeWidth={1.5} /></span>
              </div>

              <div style={{ textAlign: "center", marginTop: 22 }}>
                <div className="pf-hello" style={{ fontSize: 21 }}>Validez sur votre téléphone</div>
                <p className="pf-hello-sub" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  Une demande de <b style={{ color: "var(--pf-text)" }}>{amount} FCFA</b> a été envoyée au <b style={{ color: "var(--pf-text)" }}>+237 {national}</b>. Saisissez votre code secret pour confirmer.
                </p>
                <div className="pf-timer"><Clock size={14} />Expire dans <b>{mmss}</b></div>
              </div>

              <div className="pf-flow">
                <div className="pf-flow-row"><span className="pf-flow-ic"><Check size={13} strokeWidth={3.2} /></span>Demande envoyée à l'opérateur</div>
                <div className="pf-flow-row now"><span className="pf-flow-ic spin" />En attente de votre code secret…</div>
                <div className="pf-flow-row wait"><span className="pf-flow-ic idle" />Confirmation et mise sous séquestre</div>
              </div>

              <div className="pf-info-note">
                <span className="pf-info-ic"><Smartphone size={15} /></span>
                <div className="pf-muted-sm">
                  Rien reçu ? Composez <b style={{ color: "var(--pf-accent)" }}>{provider === "MTN_MOMO" ? "*126#" : "#150*50#"}</b> puis « Approuver le paiement ». Ne fermez pas cette page.
                </div>
              </div>

              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>Annuler le paiement</button>
            </>
          )}

          {phase === "success" && tx && (
            <>
              <div className="pf-ok-badge">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" />
                </svg>
              </div>
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <div className="pf-hello" style={{ fontSize: 24 }}>Paiement confirmé</div>
                <p className="pf-hello-sub">Commande <b style={{ color: "var(--pf-text)" }}>#{orderId}</b> · {PROVIDER_LABELS[tx.provider]}</p>
              </div>

              <div className="pf-card" style={{ marginTop: 18 }}>
                <div className="pf-row-between">
                  <span className="pf-muted-sm">Montant débité</span>
                  <span className="pf-total-row"><b>{tx.amount_xaf.toLocaleString("fr-FR")} FCFA</b></span>
                </div>
                <div style={{ margin: "12px 0", borderTop: "1px dashed var(--pf-border)" }} />
                <div className="pf-summary-row"><span className="pf-muted-sm">Référence</span><span className="pf-summary-v">{tx.id.slice(0, 8).toUpperCase()}</span></div>
                <div className="pf-summary-row"><span className="pf-muted-sm">Numéro débité</span><span className="pf-summary-v">{tx.payer_phone}</span></div>
                <div className="pf-summary-row"><span className="pf-muted-sm">Date</span><span className="pf-summary-v">{new Date(tx.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></div>
              </div>

              <div className="pf-note-ok">
                <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
                <span><b>Argent sous séquestre</b> — le vendeur ne sera payé qu'après votre confirmation de réception.</span>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => onSuccess(tx)}>Suivre ma commande</button>
              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}><Download size={15} />Télécharger le reçu</button>
            </>
          )}

          {phase === "failed" && (
            <>
              <div className="pf-err-badge"><TriangleAlert size={46} strokeWidth={1.8} /></div>
              <div style={{ textAlign: "center", marginTop: 18 }}>
                <div className="pf-hello" style={{ fontSize: 22 }}>Paiement non abouti</div>
                <p className="pf-hello-sub" style={{ fontSize: 13 }}>Aucun montant n'a été débité. Votre commande et votre adresse sont conservées.</p>
              </div>

              <div className="pf-card" style={{ marginTop: 18, borderColor: "rgba(217,45,32,.22)" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span className="pf-flow-ic" style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(217,45,32,.1)", color: "#d92d20" }}><X size={18} /></span>
                  <div>
                    <div className="pf-support-t">Transaction refusée</div>
                    <div className="pf-muted-sm" style={{ marginTop: 5, lineHeight: 1.55 }}>{error}</div>
                    {tx && <div className="pf-muted-sm" style={{ marginTop: 9, fontWeight: 700 }}>réf. {tx.id.slice(0, 8).toUpperCase()}</div>}
                  </div>
                </div>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => { reset(); setStep("method"); }}><RefreshCw size={16} />Réessayer</button>
              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>Revenir à ma commande</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
