import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "./useCart";
import { cartTotalXaf, setQty, removeFromCart, clearCart } from "./cartStore";

export default function CartPage() {
  const { t } = useTranslation();
  const items = useCart();
  const total = cartTotalXaf();

  if (items.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>{t("cart.title", "Cart")}</h1>
        <div style={{ color: "rgb(var(--muted))" }}>
          {t("cart.empty", "Your cart is empty.")}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to="/">← {t("common.back", "Back")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("cart.title", "Cart")}</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((i) => (
          <div
            key={i.productId}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr auto",
              gap: 12,
              alignItems: "center",
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                overflow: "hidden",
                background: "rgb(var(--border))",
              }}
            >
              {i.imageUrl ? (
                <img src={i.imageUrl} alt={i.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>

            <div>
              <div style={{ fontWeight: 800 }}>{i.title}</div>
              <div style={{ color: "rgb(var(--muted))", fontSize: 13 }}>
                {i.price_xaf.toLocaleString()} FCFA
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setQty(i.productId, i.qty - 1)} style={btnStyle()}>
                  -
                </button>
                <div style={{ minWidth: 28, textAlign: "center", fontWeight: 800 }}>{i.qty}</div>
                <button onClick={() => setQty(i.productId, i.qty + 1)} style={btnStyle()}>
                  +
                </button>

                <button onClick={() => removeFromCart(i.productId)} style={{ ...btnStyle(), marginLeft: 10 }}>
                  {t("cart.remove", "Remove")}
                </button>
              </div>
            </div>

            <div style={{ fontWeight: 900 }}>{(i.qty * i.price_xaf).toLocaleString()} FCFA</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          borderTop: "1px solid rgb(var(--border))",
          paddingTop: 14,
          flexWrap: "wrap",
        }}
      >
        <button onClick={clearCart} style={btnStyle()}>
          {t("cart.clear", "Clear cart")}
        </button>

        <div style={{ fontSize: 18, fontWeight: 900 }}>
          {t("cart.total", "Total")}: {total.toLocaleString()} FCFA
        </div>

        <Link
          to="/checkout"
          style={{
            ...btnStyle(),
            textDecoration: "none",
            background: "rgb(var(--text))",
            color: "rgb(var(--bg))",
          }}
        >
          {t("checkout.title", "Checkout")}
        </Link>
      </div>

      <div style={{ marginTop: 14 }}>
        <Link to="/">← {t("common.back", "Back")}</Link>
      </div>
    </div>
  );
}

function btnStyle(): React.CSSProperties {
  return {
    border: "1px solid rgb(var(--border))",
    background: "rgb(var(--bg))",
    color: "rgb(var(--text))",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  };
}
