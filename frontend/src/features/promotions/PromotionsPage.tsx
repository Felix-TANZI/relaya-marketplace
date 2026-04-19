import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi, Product, Category } from "@/services/api/products";
import { useCart } from "@/context/CartContext";

const MOCK_PRODUCTS: Product[] = [
  { id: 1001, title: "Robe Wax Africaine Premium", slug: "robe-wax", description: "", price_xaf: 35000, discount: 40, price_final: 21000, stock_quantity: 10, is_active: true, category: { id: 1, name: "Mode Femme", slug: "femme", is_active: true }, media: [], rating_average: 4.8, reviews_count: 124, created_at: "", updated_at: "" },
  { id: 1002, title: "Smartphone Samsung Galaxy A55", slug: "samsung-a55", description: "", price_xaf: 280000, discount: 25, price_final: 210000, stock_quantity: 5, is_active: true, category: { id: 2, name: "Électronique", slug: "electronique", is_active: true }, media: [], rating_average: 4.9, reviews_count: 89, created_at: "", updated_at: "" },
  { id: 1003, title: "Crème Naturelle Karité Bio", slug: "creme-karite", description: "", price_xaf: 8500, discount: 30, price_final: 5950, stock_quantity: 50, is_active: true, category: { id: 3, name: "Beauté", slug: "beaute", is_active: true }, media: [], rating_average: 4.7, reviews_count: 203, created_at: "", updated_at: "" },
  { id: 1004, title: "Ensemble Bazin Homme Brodé", slug: "bazin-homme", description: "", price_xaf: 55000, discount: 35, price_final: 35750, stock_quantity: 8, is_active: true, category: { id: 4, name: "Mode Homme", slug: "homme", is_active: true }, media: [], rating_average: 4.6, reviews_count: 67, created_at: "", updated_at: "" },
  { id: 1005, title: "Casque Audio Bluetooth JBL", slug: "casque-jbl", description: "", price_xaf: 45000, discount: 20, price_final: 36000, stock_quantity: 15, is_active: true, category: { id: 2, name: "Électronique", slug: "electronique", is_active: true }, media: [], rating_average: 4.8, reviews_count: 156, created_at: "", updated_at: "" },
  { id: 1006, title: "Sneakers Cuir Artisanal Douala", slug: "sneakers-cuir", description: "", price_xaf: 32000, discount: 28, price_final: 23040, stock_quantity: 12, is_active: true, category: { id: 5, name: "Chaussures", slug: "chaussures", is_active: true }, media: [], rating_average: 4.5, reviews_count: 45, created_at: "", updated_at: "" },
  { id: 1007, title: "Sac à Main Wax Luxe", slug: "sac-wax", description: "", price_xaf: 22000, discount: 45, price_final: 12100, stock_quantity: 6, is_active: true, category: { id: 1, name: "Mode Femme", slug: "femme", is_active: true }, media: [], rating_average: 4.9, reviews_count: 78, created_at: "", updated_at: "" },
  { id: 1008, title: "Tablette iPad 10e génération", slug: "ipad-10", description: "", price_xaf: 320000, discount: 15, price_final: 272000, stock_quantity: 3, is_active: true, category: { id: 2, name: "Électronique", slug: "electronique", is_active: true }, media: [], rating_average: 4.9, reviews_count: 211, created_at: "", updated_at: "" },
  { id: 1009, title: "Huile Argan Pure 100ml", slug: "huile-argan", description: "", price_xaf: 12000, discount: 33, price_final: 8040, stock_quantity: 30, is_active: true, category: { id: 3, name: "Beauté", slug: "beaute", is_active: true }, media: [], rating_average: 4.7, reviews_count: 92, created_at: "", updated_at: "" },
  { id: 1010, title: "Canapé Design 3 places", slug: "canape-design", description: "", price_xaf: 280000, discount: 35, price_final: 182000, stock_quantity: 2, is_active: true, category: { id: 6, name: "Maison", slug: "maison", is_active: true }, media: [], rating_average: 4.6, reviews_count: 34, created_at: "", updated_at: "" },
  { id: 1011, title: "Montre Classique Homme Or", slug: "montre-or", description: "", price_xaf: 75000, discount: 22, price_final: 58500, stock_quantity: 7, is_active: true, category: { id: 4, name: "Mode Homme", slug: "homme", is_active: true }, media: [], rating_average: 4.8, reviews_count: 61, created_at: "", updated_at: "" },
  { id: 1012, title: "Robot Cuisine Multifonction", slug: "robot-cuisine", description: "", price_xaf: 95000, discount: 40, price_final: 57000, stock_quantity: 4, is_active: true, category: { id: 6, name: "Maison", slug: "maison", is_active: true }, media: [], rating_average: 4.7, reviews_count: 88, created_at: "", updated_at: "" },
  { id: 1013, title: "Parfum Oud Camerounais", slug: "parfum-oud", description: "", price_xaf: 18000, discount: 25, price_final: 13500, stock_quantity: 20, is_active: true, category: { id: 3, name: "Beauté", slug: "beaute", is_active: true }, media: [], rating_average: 4.9, reviews_count: 143, created_at: "", updated_at: "" },
  { id: 1014, title: "Laptop HP ProBook 14\"", slug: "hp-probook", description: "", price_xaf: 450000, discount: 18, price_final: 369000, stock_quantity: 5, is_active: true, category: { id: 2, name: "Électronique", slug: "electronique", is_active: true }, media: [], rating_average: 4.6, reviews_count: 72, created_at: "", updated_at: "" },
  { id: 1015, title: "Boubou Traditionnel Femme", slug: "boubou-femme", description: "", price_xaf: 28000, discount: 38, price_final: 17360, stock_quantity: 14, is_active: true, category: { id: 1, name: "Mode Femme", slug: "femme", is_active: true }, media: [], rating_average: 4.8, reviews_count: 97, created_at: "", updated_at: "" },
];

const PRODUCT_EMOJIS: Record<string, string> = {
  "Mode Femme": "👗", "Électronique": "💻", "Beauté": "💄", "Mode Homme": "👔",
  "Chaussures": "👟", "Maison": "🛋️",
};

const CATEGORY_BANNERS = [
  { label: "Flash Sale", title: "Mode Femme", disc: "Jusqu'à -40%", bg: "linear-gradient(140deg,#C84B11,#F47920)", slug: "femme" },
  { label: "Tech Week", title: "Électronique", disc: "Jusqu'à -25%", bg: "linear-gradient(140deg,#1E3A5F,#1D4ED8)", slug: "electronique" },
  { label: "Beauté Naturelle", title: "Beauté & Santé", disc: "Jusqu'à -30%", bg: "linear-gradient(140deg,#14532D,#16A34A)", slug: "beaute" },
  { label: "Home Déco", title: "Maison & Bureau", disc: "Jusqu'à -35%", bg: "linear-gradient(140deg,#3B0764,#7C3AED)", slug: "maison" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n);
}

function useCountdown(endTime: number) {
  const [remaining, setRemaining] = useState(Math.max(0, endTime - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, endTime - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { h, m, s, done: remaining === 0 };
}

interface PromoProduct extends Product {
  _score: number;
  isPremium: boolean;
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [allPromo, setAllPromo] = useState<Product[]>([]);
  const [displayed, setDisplayed] = useState<PromoProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const endTimeRef = useRef(Date.now() + 8 * 3600 * 1000);
  const countdown = useCountdown(endTimeRef.current);

  useEffect(() => {
    Promise.all([
      productsApi.list({ page_size: 100, is_active: true }),
      productsApi.listCategories({ page_size: 50, is_active: true }),
    ]).then(([prodRes, catRes]) => {
      const promos = prodRes.results.filter((p) => p.discount > 0);
      setAllPromo(promos);
      setCategories(catRes.results);
      setDisplayed(buildScoredList(promos));
    }).finally(() => setLoading(false));
  }, []);

  function buildScoredList(list: Product[]): PromoProduct[] {
    const scored = list.map((p) => ({
      ...p,
      _score: p.discount * 2 + (p.rating_average ?? 0) * 10 + (p.reviews_count ?? 0),
      isPremium: false,
    }));
    scored.sort((a, b) => b._score - a._score);
    const premiumCount = Math.max(5, Math.ceil(scored.length * 0.3));
    scored.forEach((p, i) => { p.isPremium = i < premiumCount; });
    return scored;
  }

  const filterByCat = useCallback((catSlug: string) => {
    setActiveCat(catSlug);
    const filtered = catSlug === "all"
      ? allPromo
      : allPromo.filter((p) => p.category?.slug?.toLowerCase().includes(catSlug.toLowerCase()) || p.category?.name?.toLowerCase().includes(catSlug.toLowerCase()));
    setDisplayed(buildScoredList(filtered));
  }, [allPromo]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addItem({ id: product.id, name: product.title, price: product.price_final, quantity: 1, image: product.media?.[0]?.url });
  };

  const copyCode = () => {
    navigator.clipboard.writeText("BIENVENUE10").then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const getProductImage = (p: Product) => p.media?.[0]?.url || p.images?.[0]?.image_url;

  const catFilterTabs = [
    { k: "all", l: "✨ Tout voir" },
    ...categories.slice(0, 5).map((c) => ({ k: c.slug, l: c.name })),
  ];

  return (
    <div style={{ padding: "20px 20px 72px", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Hero + Countdown ── */}
      <div style={{
        background: "linear-gradient(135deg,#0a0500,#2d0e00,#4a1800)",
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 18,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        boxShadow: "0 12px 48px rgba(244,121,32,.25),inset 0 1px 0 rgba(255,255,255,.1)",
      }}>
        {/* decorative blobs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(244,121,32,.4),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,157,77,.25),transparent 70%)", pointerEvents: "none" }} />

        <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.65, marginBottom: 6 }}>
          🔥 Offres Limitées
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 5, position: "relative", zIndex: 1 }}>
          Promotions du Moment
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16, position: "relative", zIndex: 1, lineHeight: 1.6 }}>
          {displayed.length} offres actives · Mise à jour en temps réel · Escrow garanti sur tous les achats
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { val: String(countdown.h).padStart(2, "0"), lbl: "Heures" },
            { val: String(countdown.m).padStart(2, "0"), lbl: "Min" },
            { val: String(countdown.s).padStart(2, "0"), lbl: "Sec" },
          ].map((block, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <div style={{ fontSize: 20, fontWeight: 800, color: "#F47920", marginBottom: 12 }}>:</div>}
              <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 10, padding: "8px 12px", textAlign: "center", backdropFilter: "blur(4px)", minWidth: 54 }}>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{block.val}</div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.55)", fontWeight: 700, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{block.lbl}</div>
              </div>
            </div>
          ))}
          <div style={{ marginLeft: 8, fontSize: 12, opacity: 0.65, lineHeight: 1.4 }}>
            Fin du<br />Flash Sale
          </div>
        </div>
      </div>

      {/* ── Promo code banner ── */}
      <div style={{
        background: "linear-gradient(110deg,#F0FDF4,#DCFCE7)",
        border: "1px solid #86EFAC",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 24 }}>🎁</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#15803D", marginBottom: 2 }}>
            Code Bienvenue actif — BIENVENUE10
          </div>
          <div style={{ fontSize: 12, color: "#15803D", opacity: 0.8 }}>
            -10% sur votre 1ère commande · Valable encore 48h · Applicable au checkout
          </div>
        </div>
        <button
          onClick={copyCode}
          style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {codeCopied ? "✅ Copié !" : "📋 Copier"}
        </button>
      </div>

      {/* ── Category Banners ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        {CATEGORY_BANNERS.map((b) => (
          <div
            key={b.slug}
            onClick={() => filterByCat(b.slug)}
            style={{
              background: b.bg,
              borderRadius: 12,
              padding: "16px 14px",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              minHeight: 100,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              transition: "all .3s",
              boxShadow: "0 6px 20px rgba(0,0,0,.12)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px) scale(1.02)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(0,0,0,.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.12)"; }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.09)", pointerEvents: "none" }} />
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.8)", marginBottom: 3, position: "relative", zIndex: 1 }}>{b.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.3, position: "relative", zIndex: 1 }}>{b.title}</div>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,.2)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 800, color: "#fff", marginTop: 5, position: "relative", zIndex: 1 }}>{b.disc}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs + count ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {catFilterTabs.map((c) => (
            <button
              key={c.k}
              onClick={() => filterByCat(c.k)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: activeCat === c.k ? "none" : "1.5px solid #E5E7EB",
                background: activeCat === c.k ? "#F47920" : "#fff",
                color: activeCat === c.k ? "#fff" : "#374151",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all .2s",
              }}
            >
              {c.l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>
          {displayed.length} produits en promo
        </div>
      </div>

      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 16, fontWeight: 800 }}>
          <div style={{ width: 3, height: 18, background: "#F47920", borderRadius: 2 }} />
          Produits en promotion
        </div>
        <span
          onClick={() => filterByCat("all")}
          style={{ fontSize: 12, fontWeight: 700, color: "#F47920", cursor: "pointer" }}
        >
          Tout voir
        </span>
      </div>

      {/* ── Product Grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ background: "#F3F4F6", borderRadius: 14, height: 240, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48 }}>🏷️</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12, color: "#111827" }}>Aucune promo</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginTop: 6 }}>Revenez bientôt !</div>
        </div>
      ) : (
        <PromoGrid products={displayed} onAddToCart={handleAddToCart} onClickProduct={(id) => navigate(`/product/${id}`)} getImage={getProductImage} />
      )}
    </div>
  );
}

function PromoGrid({ products, onAddToCart, onClickProduct, getImage }: {
  products: PromoProduct[];
  onAddToCart: (e: React.MouseEvent, p: Product) => void;
  onClickProduct: (id: number) => void;
  getImage: (p: Product) => string | undefined;
}) {
  const normal = products.filter((p) => !p.isPremium);
  const premium = products.filter((p) => p.isPremium);

  const rows: React.ReactNode[] = [];
  let ni = 0, pi = 0;
  let type: "normal" | "premium" = "normal";

  while (ni < normal.length || pi < premium.length) {
    if (type === "normal" && ni < normal.length) {
      const batch = normal.slice(ni, ni + 6);
      rows.push(
        <div key={`n-${ni}`} style={{ display: "contents" }}>
          {batch.map((p, i) => <PromoCard key={p.id} product={p} idx={ni + i} onAddToCart={onAddToCart} onClickProduct={onClickProduct} getImage={getImage} />)}
        </div>
      );
      ni += 6;
      type = "premium";
    } else if (type === "premium" && pi < premium.length) {
      const batch = premium.slice(pi, pi + 5);
      rows.push(
        <div key={`p-${pi}`} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {batch.map((p, i) => <PromoCard key={p.id} product={p} idx={pi + i} isPremiumRow onAddToCart={onAddToCart} onClickProduct={onClickProduct} getImage={getImage} />)}
        </div>
      );
      pi += 5;
      type = "normal";
    } else {
      if (ni < normal.length) {
        const batch = normal.slice(ni, ni + 6);
        rows.push(
          <div key={`nr-${ni}`} style={{ display: "contents" }}>
            {batch.map((p, i) => <PromoCard key={p.id} product={p} idx={ni + i} onAddToCart={onAddToCart} onClickProduct={onClickProduct} getImage={getImage} />)}
          </div>
        );
        ni += 6;
      }
      if (pi < premium.length) {
        const batch = premium.slice(pi, pi + 5);
        rows.push(
          <div key={`pr-${pi}`} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
            {batch.map((p, i) => <PromoCard key={p.id} product={p} idx={pi + i} isPremiumRow onAddToCart={onAddToCart} onClickProduct={onClickProduct} getImage={getImage} />)}
          </div>
        );
        pi += 5;
      }
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
      {rows}
    </div>
  );
}

function PromoCard({ product: p, isPremiumRow = false, onAddToCart, onClickProduct, getImage }: {
  product: PromoProduct;
  idx: number;
  isPremiumRow?: boolean;
  onAddToCart: (e: React.MouseEvent, p: Product) => void;
  onClickProduct: (id: number) => void;
  getImage: (p: Product) => string | undefined;
}) {
  const [hovered, setHovered] = useState(false);
  const img = getImage(p);
  const saved = p.price_xaf - p.price_final;
  const stars = Math.round(p.rating_average ?? 0);

  return (
    <div
      onClick={() => onClickProduct(p.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 14,
        border: hovered ? "1px solid #F47920" : p.isPremium ? "1px solid rgba(244,121,32,.2)" : "1px solid #E5E7EB",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all .25s",
        position: "relative",
        boxShadow: hovered
          ? "0 8px 28px rgba(244,121,32,.15),0 2px 6px rgba(0,0,0,.05)"
          : p.isPremium
          ? "0 2px 10px rgba(244,121,32,.08)"
          : "0 1px 6px rgba(0,0,0,.05)",
        transform: hovered ? "translateY(-5px)" : "none",
      }}
    >
      {/* Image */}
      <div style={{ height: isPremiumRow ? 150 : 130, position: "relative", overflow: "hidden", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img ? (
          <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
        ) : (
          <span style={{ fontSize: 42 }}>🛍️</span>
        )}
        <span style={{
          position: "absolute", top: 8, right: 8,
          background: "linear-gradient(135deg,#EF4444,#B91C1C)",
          color: "#fff", fontSize: 10, fontWeight: 800,
          padding: "4px 8px", borderRadius: 999,
        }}>
          -{p.discount}%
        </span>
        {p.isPremium && (
          <span style={{ position: "absolute", top: 8, left: 8, background: "#F47920", color: "#fff", fontSize: 8.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>
            ⭐ TOP
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: isPremiumRow ? "10px 12px 12px" : "9px 10px 10px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#F47920", marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span>
          {p.category?.name ?? "Produit"}
        </div>
        <div style={{ fontSize: isPremiumRow ? 12.5 : 11.5, fontWeight: 700, lineHeight: 1.35, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
          {p.title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 6 }}>
          <span style={{ fontSize: isPremiumRow ? 15 : 13, fontWeight: 800, color: "#F47920" }}>{fmt(p.price_final)}</span>
          {p.price_xaf !== p.price_final && (
            <span style={{ fontSize: 10, color: "#9CA3AF", textDecoration: "line-through" }}>{fmt(p.price_xaf)}</span>
          )}
        </div>
        {saved > 0 && (
          <div style={{ fontSize: 9.5, color: "#15803D", fontWeight: 700, background: "#DCFCE7", padding: "1px 5px", borderRadius: 4, display: "inline-block", marginBottom: 4 }}>
            -{fmt(saved)}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "4px 0 6px" }}>
          <span style={{ fontSize: 11, color: "#FBBF24" }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
          <span style={{ fontSize: 9, color: "#9CA3AF" }}>({p.reviews_count ?? 0})</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#16A34A" }}>🚚 Livraison rapide</span>
        </div>
        <button
          onClick={(e) => onAddToCart(e, p)}
          style={{ width: "100%", padding: 6, background: "#F47920", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "background .14s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#E65A0D")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#F47920")}
        >
          🛒 Ajouter
        </button>
      </div>
    </div>
  );
}
