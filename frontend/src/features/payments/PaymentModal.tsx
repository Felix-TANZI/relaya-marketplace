import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentProvider, PaymentTransaction } from "@/services/api/payments";
import { initPayment } from "@/services/api/payments";
import { CAMEROON, detectOperator, formatNational, isValidNationalNumber, toE164, toNationalNumber } from "@/lib/phone";

type Props = {
  orderId: number;
  defaultPhone?: string;
  amountXaf: number;
  onClose: () => void;
  onSuccess: (tx: PaymentTransaction) => void;
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

export default function PaymentModal({ orderId, defaultPhone, amountXaf, onClose, onSuccess }: Props) {
  const { t } = useTranslation();

  const initialPhone = useMemo(() => toE164(toNationalNumber(defaultPhone || "")), [defaultPhone]);

  const [provider, setProvider] = useState<PaymentProvider>("MTN_MOMO");
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);

    if (!isValidNationalNumber(toNationalNumber(phone), CAMEROON)) {
      setError(t("payments.phoneInvalid", "Phone number is invalid."));
      return;
    }

    setSubmitting(true);
    try {
      const tx = await initPayment({
        order_id: orderId,
        provider,
        phone: toE164(toNationalNumber(phone)),
      });
      onSuccess(tx);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle()}>
      <div style={modalStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t("payments.title", "Pay with Mobile Money")}</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              {t("payments.amount", "Amount")}: {amountXaf.toLocaleString()} FCFA
            </div>
          </div>

          <button onClick={onClose} style={iconBtnStyle()} aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <strong>{t("common.error", "Error")}:</strong> {error}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            {t("payments.provider", "Provider")}
          </div>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as PaymentProvider)}
            style={inputStyle()}
            disabled={submitting}
          >
            <option value="MTN_MOMO">{t("payments.mtn", "MTN Mobile Money")}</option>
            <option value="ORANGE_MONEY">{t("payments.orange", "Orange Money")}</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            {t("payments.phone", "Phone")}
          </div>
          {(() => {
            const national = toNationalNumber(phone);
            const op = detectOperator(national);
            const valid = national.length === 0 || isValidNationalNumber(national, CAMEROON);
            return (
              <>
                <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                    title={CAMEROON.name}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{CAMEROON.flag}</span>+237
                  </span>
                  <input
                    value={formatNational(national)}
                    onChange={(e) => setPhone(toE164(toNationalNumber(e.target.value)))}
                    placeholder={t("payments.phonePh", "6XX XX XX XX")}
                    type="tel"
                    inputMode="tel"
                    style={{ ...inputStyle(), border: `1px solid ${valid ? "var(--border)" : "#ef4444"}` }}
                    disabled={submitting}
                  />
                </div>
                <div style={{ fontSize: 12, color: valid ? "var(--muted)" : "#ef4444", marginTop: 6 }}>
                  {!valid
                    ? t("payments.phoneInvalid", "Phone number is invalid.")
                    : op
                      ? `${op.name} · ${t("payments.phoneHint", "Ex: 6XX XX XX XX")}`
                      : t("payments.phoneHint", "Ex: 6XX XX XX XX")}
                </div>
              </>
            );
          })()}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnStyle()} disabled={submitting}>
            {t("common.back", "Back")}
          </button>
          <button
            onClick={onSubmit}
            style={{ ...btnStyle(), background: "var(--text)", color: "var(--bg)", opacity: submitting ? 0.85 : 1 }}
            disabled={submitting}
          >
            {submitting ? t("payments.submitting", "Creating...") : t("payments.payNow", "Pay now")}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          {t("payments.devNote", "Dev mode: this creates a mock transaction. Provider integration will come next.")}
        </div>
      </div>
    </div>
  );
}

function overlayStyle(): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    zIndex: 50,
  };
}

function modalStyle(): React.CSSProperties {
  return {
    width: "min(520px, 100%)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--card)",
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  };
}

function btnStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  };
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    cursor: "pointer",
    fontWeight: 900,
  };
}
