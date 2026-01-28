import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/features/cart/useCart";
import { cartTotalXaf, clearCart } from "@/features/cart/cartStore";
import type { CheckoutDraft, DeliveryCity } from "./types";
import { loadCheckoutDraft, saveCheckoutDraft } from "./storage";
import { createOrder } from "@/services/api/orders";

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

export default function CheckoutPage() {
  const { t } = useTranslation();
  const items = useCart();
  const total = cartTotalXaf();
  const navigate = useNavigate();

  const initial = useMemo<CheckoutDraft>(() => {
    return (
      loadCheckoutDraft() || {
        city: "YAOUNDE",
        address: "",
        phone: DEFAULT_PHONE_PREFIX,
        note: "",
      }
    );
  }, []);

  const [draft, setDraft] = useState<CheckoutDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (patch: Partial<CheckoutDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    saveCheckoutDraft(next);
  };

  const validatePhone = (v: string) => {
    const cleaned = v.replace(/\s/g, "");
    if (cleaned.startsWith("+237")) {
      const rest = cleaned.slice(4);
      return /^\d{9}$/.test(rest);
    }
    return /^\d{9}$/.test(cleaned);
  };

  const normalizePhone = (v: string) => {
    const cleaned = v.replace(/\s/g, "");
    if (cleaned.startsWith("+237")) return cleaned;
    if (/^\d{9}$/.test(cleaned)) return `+237${cleaned}`;
    return cleaned;
  };

  const onSubmit = async () => {
    setError(null);

    if (items.length === 0) {
      setError(t("checkout.emptyCart", "Your cart is empty."));
      return;
    }
    if (!draft.address.trim()) {
      setError(t("checkout.addressRequired", "Address is required."));
      return;
    }
    if (!validatePhone(draft.phone)) {
      setError(t("checkout.phoneInvalid", "Phone number is invalid."));
      return;
    }

    const normalized: CheckoutDraft = { ...draft, phone: normalizePhone(draft.phone) };
    saveCheckoutDraft(normalized);

    setSubmitting(true);
    try {
      const payload = {
        city: normalized.city,
        address: normalized.address,
        phone: normalized.phone,
        note: normalized.note || "",
        items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
      };

      const order = await createOrder(payload);

      clearCart();
      navigate(`/order/${order.id}`);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>{t("checkout.title", "Checkout")}</h1>
        <div style={{ color: "var(--muted)" }}>{t("checkout.emptyCart", "Your cart is empty.")}</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/cart">← {t("cart.title", "Cart")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, alignItems: "start" }}>
      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <h1 style={{ marginTop: 0 }}>{t("checkout.title", "Checkout")}</h1>

        {error && (
          <div
            style={{
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--bg)",
              marginBottom: 12,
            }}
          >
            <strong>{t("common.error", "Error")}:</strong> {error}
          </div>
        )}

        <Field label={t("checkout.city", "City")}>
          <select
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value as DeliveryCity })}
            style={inputStyle()}
            disabled={submitting}
          >
            <option value="YAOUNDE">{t("checkout.yaounde", "Yaoundé")}</option>
            <option value="DOUALA">{t("checkout.douala", "Douala")}</option>
          </select>
        </Field>

        <Field label={t("checkout.address", "Address")}>
          <input
            value={draft.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder={t("checkout.addressPh", "Quarter, street, landmark...")}
            style={inputStyle()}
            disabled={submitting}
          />
        </Field>

        <Field label={t("checkout.phone", "Phone")}>
          <input
            value={draft.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder={t("checkout.phonePh", "+2376XXXXXXXX")}
            style={inputStyle()}
            disabled={submitting}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {t("checkout.phoneHint", "Example: +2376XXXXXXXX or 6XXXXXXXX")}
          </div>
        </Field>

        <Field label={t("checkout.note", "Note for delivery (optional)")}>
          <textarea
            value={draft.note || ""}
            onChange={(e) => onChange({ note: e.target.value })}
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" }}
            disabled={submitting}
          />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Link
            to="/cart"
            style={{ ...btnStyle(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            ← {t("cart.title", "Cart")}
          </Link>

          <button
            onClick={onSubmit}
            style={{ ...btnStyle(), background: "var(--text)", color: "var(--bg)", opacity: submitting ? 0.8 : 1 }}
            disabled={submitting}
          >
            {submitting ? t("checkout.submitting", "Submitting...") : t("checkout.continue", "Continue")}
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {t("checkout.summary", "Order summary")}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((i) => (
            <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ maxWidth: "70%" }}>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i.title}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {i.qty} × {i.price_xaf.toLocaleString()} FCFA
                </div>
              </div>
              <div style={{ fontWeight: 900 }}>
                {(i.qty * i.price_xaf).toLocaleString()} FCFA
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
            <span>{t("cart.total", "Total")}</span>
            <span>{total.toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
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
