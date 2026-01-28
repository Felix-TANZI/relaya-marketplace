import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { PaymentProvider, PaymentTransaction } from "@/services/api/payments";
import { initPayment } from "@/services/api/payments";

type Props = {
  orderId: number;
  defaultPhone?: string;
  amountXaf: number;
  onClose: () => void;
  onSuccess: (tx: PaymentTransaction) => void;
};

const DEFAULT_PHONE_PREFIX = "+237";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function normalizePhone(v: string) {
  const cleaned = v.replace(/\s/g, "");
  if (cleaned.startsWith("+237")) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `+237${cleaned}`;
  return cleaned;
}

function validatePhone(v: string) {
  const cleaned = v.replace(/\s/g, "");
  if (cleaned.startsWith("+237")) {
    const rest = cleaned.slice(4);
    return /^\d{9}$/.test(rest);
  }
  return /^\d{9}$/.test(cleaned);
}

export default function PaymentModal({ orderId, defaultPhone, amountXaf, onClose, onSuccess }: Props) {
  const { t } = useTranslation();

  const initialPhone = useMemo(() => defaultPhone || DEFAULT_PHONE_PREFIX, [defaultPhone]);

  const [provider, setProvider] = useState<PaymentProvider>("MTN_MOMO");
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);

    if (!validatePhone(phone)) {
      setError(t("payments.phoneInvalid", "Phone number is invalid."));
      return;
    }

    setSubmitting(true);
    try {
      const tx = await initPayment({
        order_id: orderId,
        provider,
        phone: normalizePhone(phone),
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
            <div style={{ color: "rgb(var(--muted))", fontSize: 12, marginTop: 4 }}>
              {t("payments.amount", "Amount")}: {amountXaf.toLocaleString()} FCFA
            </div>
          </div>

          <button onClick={onClose} style={iconBtnStyle()} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--bg))",
            }}
          >
            <strong>{t("common.error", "Error")}:</strong> {error}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 6 }}>
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
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 6 }}>
            {t("payments.phone", "Phone")}
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("payments.phonePh", "+2376XXXXXXXX")}
            style={inputStyle()}
            disabled={submitting}
          />
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
            {t("payments.phoneHint", "Example: +2376XXXXXXXX or 6XXXXXXXX")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnStyle()} disabled={submitting}>
            {t("common.back", "Back")}
          </button>
          <button
            onClick={onSubmit}
            style={{
              ...btnStyle(),
              background: "rgb(var(--text))",
              color: "rgb(var(--bg))",
              opacity: submitting ? 0.85 : 1,
            }}
            disabled={submitting}
          >
            {submitting ? t("payments.submitting", "Creating...") : t("payments.payNow", "Pay now")}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgb(var(--muted))" }}>
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
    border: "1px solid rgb(var(--border))",
    background: "rgb(var(--card))",
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid rgb(var(--border))",
    background: "rgb(var(--bg))",
    color: "rgb(var(--text))",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  };
}

function btnStyle(): React.CSSProperties {
  return {
    border: "1px solid rgb(var(--border))",
    background: "rgb(var(--bg))",
    color: "rgb(var(--text))",
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
    border: "1px solid rgb(var(--border))",
    background: "rgb(var(--bg))",
    color: "rgb(var(--text))",
    cursor: "pointer",
  };
}
