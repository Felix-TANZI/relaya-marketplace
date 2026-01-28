import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProduct } from "./api";
import type { ProductDetail } from "./types";
import { addToCart } from "@/features/cart/cartStore";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  const productId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const [item, setItem] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    getProduct(productId)
      .then((data) => {
        if (cancelled) return;
        setItem(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) {
    return (
      <div>
        <Link to="/">← {t("common.back", "Back")}</Link>
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid rgb(var(--border))",
            borderRadius: 12,
            background: "rgb(var(--card))",
          }}
        >
          <strong>{t("common.error", "Error")}:</strong>{" "}
          {t("catalog.invalidProductId", "Invalid product id")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link to="/">← {t("common.back", "Back")}</Link>
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid rgb(var(--border))",
            borderRadius: 12,
            background: "rgb(var(--card))",
          }}
        >
          <strong>{t("common.error", "Error")}:</strong> {error}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <Link to="/">← {t("common.back", "Back")}</Link>
        <div style={{ marginTop: 16, color: "rgb(var(--muted))" }}>
          {t("common.loading", "Loading...")}
        </div>
      </div>
    );
  }

  const img = item.media?.find((m) => m.media_type === "image")?.url;
  const stock = item.inventory?.quantity ?? 0;

  const onAdd = () => {
    addToCart(
      {
        productId: item.id,
        title: item.title,
        price_xaf: item.price_xaf,
        imageUrl: img,
      },
      1
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <div>
        <Link to="/">← {t("common.back", "Back")}</Link>
        <div
          style={{
            marginTop: 12,
            border: "1px solid rgb(var(--border))",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ aspectRatio: "1 / 1", background: "rgb(var(--border))" }}>
            {img ? (
              <img
                src={img}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <h1 style={{ marginTop: 0 }}>{item.title}</h1>

        <div style={{ color: "rgb(var(--muted))", marginBottom: 10 }}>
          {item.category?.name}
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          {item.price_xaf.toLocaleString()} FCFA
        </div>

        <div
          style={{
            color: stock > 0 ? "rgb(var(--text))" : "rgb(var(--muted))",
            marginBottom: 14,
          }}
        >
          {t("catalog.stock", "Stock")}: <strong>{stock}</strong>
        </div>

        <div style={{ lineHeight: 1.5 }}>{item.description || "—"}</div>

        <button
          disabled={stock <= 0}
          onClick={onAdd}
          style={{
            marginTop: 18,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgb(var(--border))",
            background: stock > 0 ? "rgb(var(--text))" : "rgb(var(--card))",
            color: stock > 0 ? "rgb(var(--bg))" : "rgb(var(--muted))",
            cursor: stock > 0 ? "pointer" : "not-allowed",
            fontWeight: 700,
          }}
        >
          {t("catalog.addToCart", "Add to cart")}
        </button>
      </div>
    </div>
  );
}
