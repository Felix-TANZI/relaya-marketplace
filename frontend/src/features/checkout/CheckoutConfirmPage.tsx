import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/features/cart/useCart";
import { cartTotalXaf } from "@/features/cart/cartStore";
import { loadCheckoutDraft } from "./storage";

export default function CheckoutConfirmPage() {
  const { t } = useTranslation();
  const items = useCart();
  const total = cartTotalXaf();
  const draft = loadCheckoutDraft();

  if (!draft) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>{t("checkout.confirmTitle", "Confirm")}</h1>
        <div style={{ color: "var(--muted)" }}>
          {t("checkout.missingDraft", "Missing delivery information.")}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to="/checkout">← {t("checkout.title", "Checkout")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("checkout.confirmTitle", "Confirm")}</h1>

      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>{t("checkout.deliveryInfo", "Delivery info")}</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {t("checkout.city", "City")}: <strong style={{ color: "var(--text)" }}>{draft.city}</strong>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {t("checkout.address", "Address")}: <strong style={{ color: "var(--text)" }}>{draft.address}</strong>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {t("checkout.phone", "Phone")}: <strong style={{ color: "var(--text)" }}>{draft.phone}</strong>
        </div>
        {draft.note ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {t("checkout.note", "Note")}: <strong style={{ color: "var(--text)" }}>{draft.note}</strong>
          </div>
        ) : null}
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{t("checkout.summary", "Order summary")}</div>

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

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <Link to="/checkout" style={{ ...btnStyle(), textDecoration: "none" }}>
            ← {t("checkout.title", "Checkout")}
          </Link>

          <button style={{ ...btnStyle(), background: "var(--text)", color: "var(--bg)" }} disabled>
            {t("checkout.payNext", "Payment (next step)")}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          {t("checkout.paymentComingSoon", "Mobile Money payment will be added next.")}
        </div>
      </div>
    </div>
  );
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
