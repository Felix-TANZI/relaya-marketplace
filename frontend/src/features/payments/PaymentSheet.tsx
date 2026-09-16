import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <div className="pf-backdrop" role="dialog" aria-modal="true" aria-label={t('cl1_payment_sheet.payment')}>
        <div className="pf-sheet">

          {phase === "idle" && step === "method" && (
            <>
              <div className="pf-row-between pf-mb">
                <div>
                  <div className="pf-panel-title" style={{ fontSize: 17 }}>{t('cl1_payment_sheet.payment')}</div>
                  <div className="pf-muted-sm">{t('cl1_payment_sheet.order_hash', { orderId })}</div>
                </div>
                <button className="pf-x" onClick={onClose} aria-label={t('cl1_payment_sheet.close')}><X size={17} /></button>
              </div>

              <div className="pf-hero">
                <i />
                <div className="pf-hero-k">{t('cl1_payment_sheet.amount_to_pay')}</div>
                <div className="pf-hero-v">{amount}<span>FCFA</span></div>
              </div>

              <div className="pf-sec" style={{ padding: "20px 0 10px", color: "var(--pf-accent)" }}>{t('cl1_payment_sheet.how_would_you_like_to_pay')}</div>

              {(["MTN_MOMO", "ORANGE_MONEY"] as PaymentProvider[]).map((p) => {
                const detected = operator?.name === (p === "MTN_MOMO" ? "MTN" : "Orange");
                return (
                  <button key={p} type="button" className={`pf-opt${provider === p ? " on" : ""}`} onClick={() => setProvider(p)}>
                    <OperatorLogo provider={p} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="pf-support-t">{PROVIDER_LABELS[p]}</span>
                      <span className="pf-muted-sm" style={{ display: "block", marginTop: 3 }}>
                        {national && detected ? t('cl1_payment_sheet.number_detected', { national }) : t('cl1_payment_sheet.secret_code_validation_hint')}
                      </span>
                      {national && detected && <span className="pf-chip" style={{ marginTop: 8, padding: "3px 9px", fontSize: 10.5 }}>{t('cl1_payment_sheet.number_registered')}</span>}
                    </span>
                    <span className="pf-radio"><Check size={13} strokeWidth={3.2} /></span>
                  </button>
                );
              })}

              <div className="pf-note-ok">
                <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
                <span><b>{t('cl1_payment_sheet.escrow_belivay')}</b> {t('cl1_payment_sheet.escrow_desc')}</span>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => setStep("phone")}>
                {t('cl1_payment_sheet.continue_with', { provider: PROVIDER_LABELS[provider] })}
              </button>
            </>
          )}

          {phase === "idle" && step === "phone" && (
            <>
              <div className="pf-row-between pf-mb">
                <button className="pf-x" onClick={() => setStep("method")} aria-label={t('cl1_payment_sheet.back')}><ArrowLeft size={17} /></button>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <div className="pf-panel-title" style={{ fontSize: 17 }}>{PROVIDER_LABELS[provider]}</div>
                  <div className="pf-muted-sm">{t('cl1_payment_sheet.number_to_debit')}</div>
                </div>
                <OperatorLogo provider={provider} size={38} />
              </div>

              <div className="pf-card">
                <PhoneInput value={phone} onChange={setPhone} label={t('cl1_payment_sheet.payment_number')} helperText={t('cl1_payment_sheet.phone_example')} autoFocus />
                {mismatch && (
                  <div className="pf-info-note">
                    <span className="pf-info-ic"><TriangleAlert size={15} /></span>
                    <div className="pf-muted-sm">{t('cl1_payment_sheet.number_mismatch', { operator: operator?.name, provider: PROVIDER_LABELS[provider] })}</div>
                  </div>
                )}
              </div>

              <div className="pf-card" style={{ marginTop: 14 }}>
                <div className="pf-card-title pf-mb">{t('cl1_payment_sheet.what_will_happen')}</div>
                {[
                  t('cl1_payment_sheet.step_prompt_arrives'),
                  t('cl1_payment_sheet.step_enter_secret_code', { provider: PROVIDER_LABELS[provider] }),
                  t('cl1_payment_sheet.step_order_confirms'),
                ].map((flowStep, i) => (
                  <div key={i} className="pf-flow-row" style={{ marginBottom: 12 }}>
                    <span className="pf-flow-ic" style={{ background: "var(--pf-asoft)", color: "var(--pf-accent)", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                    <span>{flowStep}</span>
                  </div>
                ))}
              </div>

              <button className="pf-btn-accent pf-btn-block" disabled={!phoneValid} onClick={() => start(provider, toE164(national))}>
                <Lock size={16} />{t('cl1_payment_sheet.pay_amount', { amount })}
              </button>
              <div className="pf-muted-sm" style={{ marginTop: 9, textAlign: "center" }}>{t('cl1_payment_sheet.no_extra_fees')}</div>
            </>
          )}

          {phase === "pending" && (
            <>
              <div className="pf-row-between">
                <div className="pf-muted-sm">{t('cl1_payment_sheet.payment_in_progress')}</div>
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
                <div className="pf-hello" style={{ fontSize: 21 }}>{t('cl1_payment_sheet.confirm_on_your_phone')}</div>
                <p className="pf-hello-sub" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  {t('cl1_payment_sheet.request_sent_prefix')} <b style={{ color: "var(--pf-text)" }}>{amount} FCFA</b> {t('cl1_payment_sheet.request_sent_middle')} <b style={{ color: "var(--pf-text)" }}>+237 {national}</b>. {t('cl1_payment_sheet.request_sent_suffix')}
                </p>
                <div className="pf-timer"><Clock size={14} />{t('cl1_payment_sheet.expires_in')} <b>{mmss}</b></div>
              </div>

              <div className="pf-flow">
                <div className="pf-flow-row"><span className="pf-flow-ic"><Check size={13} strokeWidth={3.2} /></span>{t('cl1_payment_sheet.request_sent_to_operator')}</div>
                <div className="pf-flow-row now"><span className="pf-flow-ic spin" />{t('cl1_payment_sheet.waiting_for_secret_code')}</div>
                <div className="pf-flow-row wait"><span className="pf-flow-ic idle" />{t('cl1_payment_sheet.confirmation_and_escrow')}</div>
              </div>

              <div className="pf-info-note">
                <span className="pf-info-ic"><Smartphone size={15} /></span>
                <div className="pf-muted-sm">
                  {t('cl1_payment_sheet.nothing_received_prefix')} <b style={{ color: "var(--pf-accent)" }}>{provider === "MTN_MOMO" ? "*126#" : "#150*50#"}</b> {t('cl1_payment_sheet.nothing_received_suffix')}
                </div>
              </div>

              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>{t('cl1_payment_sheet.cancel_payment')}</button>
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
                <div className="pf-hello" style={{ fontSize: 24 }}>{t('cl1_payment_sheet.payment_confirmed')}</div>
                <p className="pf-hello-sub">{t('cl1_payment_sheet.order_label')} <b style={{ color: "var(--pf-text)" }}>#{orderId}</b> · {PROVIDER_LABELS[tx.provider]}</p>
              </div>

              <div className="pf-card" style={{ marginTop: 18 }}>
                <div className="pf-row-between">
                  <span className="pf-muted-sm">{t('cl1_payment_sheet.amount_debited')}</span>
                  <span className="pf-total-row"><b>{tx.amount_xaf.toLocaleString("fr-FR")} FCFA</b></span>
                </div>
                <div style={{ margin: "12px 0", borderTop: "1px dashed var(--pf-border)" }} />
                <div className="pf-summary-row"><span className="pf-muted-sm">{t('cl1_payment_sheet.reference')}</span><span className="pf-summary-v">{tx.id.slice(0, 8).toUpperCase()}</span></div>
                <div className="pf-summary-row"><span className="pf-muted-sm">{t('cl1_payment_sheet.number_debited')}</span><span className="pf-summary-v">{tx.payer_phone}</span></div>
                <div className="pf-summary-row"><span className="pf-muted-sm">{t('cl1_payment_sheet.date')}</span><span className="pf-summary-v">{new Date(tx.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></div>
              </div>

              <div className="pf-note-ok">
                <ShieldCheck size={18} style={{ flexShrink: 0, color: "#128a45" }} />
                <span><b>{t('cl1_payment_sheet.escrowed_money')}</b> {t('cl1_payment_sheet.escrowed_money_desc')}</span>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => onSuccess(tx)}>{t('cl1_payment_sheet.track_my_order')}</button>
              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}><Download size={15} />{t('cl1_payment_sheet.download_receipt')}</button>
            </>
          )}

          {phase === "failed" && (
            <>
              <div className="pf-err-badge"><TriangleAlert size={46} strokeWidth={1.8} /></div>
              <div style={{ textAlign: "center", marginTop: 18 }}>
                <div className="pf-hello" style={{ fontSize: 22 }}>{t('cl1_payment_sheet.payment_unsuccessful')}</div>
                <p className="pf-hello-sub" style={{ fontSize: 13 }}>{t('cl1_payment_sheet.no_amount_debited')}</p>
              </div>

              <div className="pf-card" style={{ marginTop: 18, borderColor: "rgba(217,45,32,.22)" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span className="pf-flow-ic" style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(217,45,32,.1)", color: "#d92d20" }}><X size={18} /></span>
                  <div>
                    <div className="pf-support-t">{t('cl1_payment_sheet.transaction_declined')}</div>
                    <div className="pf-muted-sm" style={{ marginTop: 5, lineHeight: 1.55 }}>{error}</div>
                    {tx && <div className="pf-muted-sm" style={{ marginTop: 9, fontWeight: 700 }}>{t('cl1_payment_sheet.ref_short', { ref: tx.id.slice(0, 8).toUpperCase() })}</div>}
                  </div>
                </div>
              </div>

              <button className="pf-btn-accent pf-btn-block" onClick={() => { reset(); setStep("method"); }}><RefreshCw size={16} />{t('cl1_payment_sheet.retry')}</button>
              <button className="pf-btn-ghost pf-btn-block" onClick={onClose}>{t('cl1_payment_sheet.back_to_my_order')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
