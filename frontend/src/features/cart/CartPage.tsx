import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Minus, Package, Plus, ShieldCheck, ShoppingCart, Store, Trash2, Truck, Undo2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { V29_PRODUCTS as mockProducts } from "@/data/v29Products";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "@/features/payments/OperatorLogo";
import CartRecommendationsSection from "@/components/cart/CartRecommendationsSection";

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, updateQuantity, itemCount, addItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<number[]>(() => items.map((i) => i.id));
  const itemIdsKey = items.map((i) => i.id).join(",");
  const [lastItemIdsKey, setLastItemIdsKey] = useState(itemIdsKey);
  const [removedItem, setRemovedItem] = useState<(typeof items)[number] | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  if (itemIdsKey !== lastItemIdsKey) {
    setLastItemIdsKey(itemIdsKey);
    setSelectedIds((current) => {
      const ids = items.map((i) => i.id);
      return [...current.filter((id) => ids.includes(id)), ...ids.filter((id) => !current.includes(id))];
    });
  }

  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const fmt = (n: number) => `${Math.round(n).toLocaleString(locale)} FCFA`;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = items.filter((i) => selectedIdSet.has(i.id));
  const selectedItemCount = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const selectedTotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = selectedItems.length > 0 ? 2000 : 0;
  const savings = Math.round(selectedTotal * 0.04);
  const allSelected = selectedItems.length === items.length;

  const toggleSelection = (id: number) =>
    setSelectedIds((c) => (c.includes(id) ? c.filter((i) => i !== id) : [...c, id]));

  const guard = (e: React.MouseEvent) => {
    if (selectedItems.length === 0) { e.preventDefault(); return; }
    window.sessionStorage.setItem(CHECKOUT_SELECTED_CART_IDS_KEY, JSON.stringify(selectedIds));
  };

  const removeWithUndo = (id: number) => {
    const item = items.find((candidate) => candidate.id === id) ?? null;
    setRemovedItem(item);
    removeItem(id);
    window.setTimeout(() => setRemovedItem((current) => current?.id === id ? null : current), 5000);
  };

  if (items.length === 0) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page">
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div className="pf-glass-panel pf-anim" style={{ textAlign: "center", padding: 32 }}>
              <span className="pf-notif-ic" style={{ margin: "0 auto 16px", width: 60, height: 60, borderRadius: 20 }}>
                <ShoppingCart size={26} />
              </span>
              <div className="pf-panel-title">{t("cart.empty")}</div>
              <p className="pf-panel-sub" style={{ maxWidth: 380, margin: "8px auto 0" }}>{t("cart.empty_desc")}</p>
              <Link to="/catalog">
                <button className="pf-btn-accent" style={{ marginTop: 20 }}><Package size={15} />{t("cart.explore")}</button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const suggestions = (() => {
    const map: Record<string, string[]> = {
      shoes: ["femme", "homme", "beaute"], femme: ["shoes", "beaute", "maison"], homme: ["shoes", "tech"],
      phone: ["tech", "maison"], tech: ["phone", "maison"], beaute: ["femme", "super"],
      maison: ["tech", "super"], super: ["beaute", "maison"], sport: ["shoes", "homme"], bebe: ["femme", "super"],
    };
    const inCart = new Set(items.map((i) => i.id));
    const cats = new Set<string>();
    items.forEach((i) => { const m = mockProducts.find((p) => p.id === i.id); if (m?.category?.slug) cats.add(m.category.slug); });
    const targets = new Set<string>();
    cats.forEach((c) => (map[c] || []).forEach((x) => targets.add(x)));
    if (!targets.size) mockProducts.slice(0, 4).forEach((p) => p.category?.slug && targets.add(p.category.slug));
    return mockProducts.filter((p) => !inCart.has(p.id) && p.category?.slug && targets.has(p.category.slug)).slice(0, 6);
  })();

  return (
    <>
      <PfShellStyles />
      <div className="pf-root pf-page">
        <div className="pf-wrap">

          {/* En-tête : même grammaire que .pf-ident du profil */}
          <div className="pf-ident pf-anim">
            <span className="pf-notif-ic"><ShoppingCart size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pf-name">Mon panier</div>
              <div className="pf-meta">
                <span>{selectedItemCount} sélectionné{selectedItemCount > 1 ? "s" : ""}</span>
                <span>{itemCount} article{itemCount > 1 ? "s" : ""}</span>
              </div>
            </div>
            <button className="pf-btn-ghost" onClick={() => setSelectedIds(allSelected ? [] : items.map((i) => i.id))}>
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          <div className="pf-flex" style={{ marginTop: 22 }}>
            <div className="pf-main">
              <div className="pf-card pf-anim" style={{ padding: 0, overflow: "hidden" }}>
                {items.map((item) => {
                  const selected = selectedIdSet.has(item.id);
                  const link = `/product/${item.id}${item.isDemo ? "?mock=1" : ""}`;
                  return (
                    <div key={item.id} className={`pf-line${selected ? "" : " off"}`}>
                      <button
                        className={`pf-tick${selected ? " on" : ""}`}
                        onClick={() => toggleSelection(item.id)}
                        aria-pressed={selected}
                        aria-label={`Sélectionner ${item.name}`}
                      >
                        <Check size={12} strokeWidth={3.2} />
                      </button>

                      <Link to={link} className="pf-thumb">
                        {item.image ? <img src={item.image} alt={item.name} /> : <Package size={26} strokeWidth={1.6} />}
                      </Link>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <Link to={link} style={{ flex: 1, minWidth: 0 }}>
                            <div className="pf-support-t">{item.name}</div>
                          </Link>
                          <button className="pf-del" onClick={() => removeWithUndo(item.id)} aria-label={`Retirer ${item.name}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {(item.color || item.storage) && (
                          <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {item.color && <span className="pf-tag">{item.color}</span>}
                            {item.storage && <span className="pf-tag">{item.storage}</span>}
                          </div>
                        )}

                        <div className="pf-row-between" style={{ marginTop: 11 }}>
                          <div>
                            <div className="pf-order-total" style={{ fontSize: 15, color: "var(--pf-text)" }}>{fmt(item.price * item.quantity)}</div>
                            {item.quantity > 1 && <div className="pf-muted-sm">{fmt(item.price)} / unité</div>}
                          </div>
                          <div className="pf-qty">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuer"><Minus size={13} /></button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Augmenter"><Plus size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {suggestions.length > 0 && (
                <section className="pf-card pf-anim">
                  <div className="pf-row-between pf-mb">
                    <span className="pf-card-title">Complétez votre commande</span>
                  </div>
                  <div className="pf-xsell">
                    {suggestions.map((p) => {
                      const price = p.price_final || p.price_xaf;
                      const img = p.images?.[0]?.image_url || p.media?.[0]?.url;
                      return (
                        <div key={p.id} className="pf-xcard">
                          <Link to={`/product/${p.id}?mock=1`}>
                            <div className="img">{img ? <img src={img} alt={p.title} loading="lazy" /> : <Package size={22} className="pf-muted" />}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.35, color: "var(--pf-text)" }}>{p.title}</div>
                            <div className="pf-order-total" style={{ marginTop: 3, fontSize: 12 }}>{fmt(price)}</div>
                          </Link>
                          <button
                            className="pf-btn-accent"
                            style={{ marginTop: 8, width: "100%", justifyContent: "center", padding: "7px 10px", fontSize: 11 }}
                            onClick={() => addItem({ id: p.id, name: p.title, price, quantity: 1, image: img, isDemo: true })}
                          >
                            + Ajouter
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* ═══ Cart Recommendations Section ═══ */}
            {items.length > 0 && (
              <CartRecommendationsSection 
                cartMasterIds={items.map(item => item.id).filter(Boolean)}
                limit={5}
              />
            )}

            {/* Récapitulatif */}
            <aside className="pf-side" data-tutorial="cart-summary">
              <div className="pf-glass-panel pf-anim">
                <div className="pf-k">Récapitulatif</div>

                <div style={{ marginTop: 14 }}>
                  <div className="pf-summary-row"><span className="pf-muted-sm">{t("cart.subtotal")}</span><span className="pf-summary-v">{fmt(selectedTotal)}</span></div>
                  <div className="pf-summary-row"><span className="pf-muted-sm">{t("cart.shipping")}</span><span className="pf-summary-v">{shippingCost > 0 ? fmt(shippingCost) : "—"}</span></div>
                  {savings > 0 && (
                    <div className="pf-summary-row"><span className="pf-muted-sm">Économie estimée</span><span className="pf-summary-v" style={{ color: "#128a45" }}>− {fmt(savings)}</span></div>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <button type="button" onClick={() => setPromoOpen((current) => !current)} className="pf-link" style={{ fontSize: 12 }}>
                    {promoOpen ? "Masquer le code promotionnel" : "Ajouter un code promotionnel"}
                  </button>
                  {promoOpen && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <input
                        value={promoCode}
                        onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                        placeholder="CODE PROMO"
                        className="pf-input"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button type="button" className="pf-btn-ghost">Appliquer</button>
                    </div>
                  )}
                </div>

                <div style={{ margin: "14px 0", borderTop: "1px dashed var(--pf-border)" }} />
                <div className="pf-total-row">
                  <span className="pf-muted-sm">{t("cart.total")}</span>
                  <b>{fmt(selectedTotal + shippingCost)}</b>
                </div>

                <div style={{ marginTop: 16, padding: 13, borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                  <div className="pf-sec" style={{ padding: 0 }}>Moyens acceptés</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <OperatorLogo provider="MTN_MOMO" size={34} />
                    <OperatorLogo provider="ORANGE_MONEY" size={34} />
                    <OperatorLogo provider="VISA" size={34} />
                    <OperatorLogo provider="MASTERCARD" size={34} />
                  </div>
                </div>

                <Link to="/checkout" onClick={guard}>
                  <button className="pf-btn-accent pf-btn-block"><Truck size={16} />Passer commande<ArrowRight size={15} /></button>
                </Link>
                <Link to="/checkout?mode=pickup" onClick={guard}>
                  <button className="pf-btn-ghost pf-btn-block"><Store size={15} />Payer au retrait (centre BelivaY)</button>
                </Link>
                <Link to="/catalog">
                  <button className="pf-btn-ghost pf-btn-block" style={{ border: "none", background: "transparent", color: "var(--pf-text2)" }}>
                    Continuer mes achats
                  </button>
                </Link>

                <div className="pf-info-note">
                  <span className="pf-info-ic"><ShieldCheck size={15} /></span>
                  <div>
                    <div className="pf-support-t" style={{ fontSize: 13 }}>Escrow BelivaY</div>
                    <div className="pf-muted-sm">Paiement protégé jusqu'à la réception. Livraison suivie 24–72h Cameroun &amp; CEMAC.</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {removedItem && (
        <div className="fixed bottom-20 left-1/2 z-[90] flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl lg:bottom-6">
          <span className="truncate">{removedItem.name} retiré du panier</span>
          <button type="button" onClick={() => { addItem(removedItem); setRemovedItem(null); }} className="inline-flex shrink-0 items-center gap-1 font-bold text-orange-300">
            <Undo2 size={15} /> Annuler
          </button>
        </div>
      )}
    </>
  );
}
