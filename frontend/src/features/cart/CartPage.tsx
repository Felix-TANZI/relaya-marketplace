import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft, Minus, Package, Plus, ShieldCheck, ShoppingCart, Store, Trash2, Truck, Undo2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { V29_PRODUCTS as mockProducts } from "@/data/v29Products";
import { PfShellStyles } from "@/styles/pfShell";
import AnimatedPrice from "@/components/common/AnimatedPrice";
import { OperatorLogo } from "@/features/payments/OperatorLogo";
import CartRecommendationsSection from "@/components/cart/CartRecommendationsSection";
// Réutilise la même source de favoris que features/wishlist/WishlistPage.tsx
// (API si connecté, repli localStorage sinon) pour la section "Sauvegardés"
// de l'état panier vide — sans dupliquer/modifier WishlistPage.tsx lui-même.
import { customerApi } from "@/services/api/customer";
import { hasValidAccessToken } from "@/lib/authTokens";
import { getFavoriteProductIds } from "@/lib/favorites";
import type { Product } from "@/services/api/products";

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, itemCount, addItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<number[]>(() => items.map((i) => i.id));
  // Favoris pour la section "Sauvegardés" de l'état panier vide — même repli
  // API → localStorage que WishlistPage.tsx (voir features/wishlist/WishlistPage.tsx
  // `fetchProducts`) ; déclaré avant le `return` anticipé ci-dessous pour respecter
  // les règles des hooks (toujours appelés, même quand le panier n'est pas vide).
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  useEffect(() => {
    let cancelled = false;
    const loadSaved = async () => {
      if (hasValidAccessToken()) {
        try {
          const favorites = await customerApi.getFavorites();
          if (!cancelled) setSavedProducts(favorites.map((f) => f.product));
          return;
        } catch {
          // repli sur les favoris locaux ci-dessous
        }
      }
      const ids = getFavoriteProductIds();
      if (!cancelled) setSavedProducts(mockProducts.filter((p) => ids.includes(p.id)));
    };
    void loadSaved();
    const onUpdate = () => void loadSaved();
    window.addEventListener("belivay-favorites-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("belivay-favorites-updated", onUpdate);
    };
  }, []);
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
  // ECART CONNU (CL-07 regle #1 — "un seul service serveur recalcule les
  // frais, le frontend n'affiche jamais un montant qu'il a lui-meme
  // calcule") : il n'existe aucun endpoint de devis panier cote backend
  // (verifie : pas de /cart/quote/, /orders/preview/ ni equivalent). Le seul
  // calcul serveur des frais de livraison a lieu a la creation reelle de la
  // commande (POST /orders/ -> backend/apps/orders/serializers.py
  // _compute_delivery_price -> grille par vendeur/zone, PAS un forfait plat
  // ni un seuil 30000F/50000F). Ce `shippingCost` est donc une estimation
  // placeholder affichee avant que le vrai calcul serveur n'existe ; il ne
  // doit pas etre pris pour le montant qui sera reellement facture (voir
  // features/checkout/CheckoutPage.tsx qui, lui, utilise order.total_xaf
  // renvoye par le serveur au moment du paiement). A signaler au backend
  // (ajout d'un endpoint de devis) plutot qu'a fabriquer ici.
  const shippingCost = selectedItems.length > 0 ? 2000 : 0;
  const allSelected = selectedItems.length === items.length;

  const toggleSelection = (id: number) =>
    setSelectedIds((c) => (c.includes(id) ? c.filter((i) => i !== id) : [...c, id]));

  const guard = (e: React.MouseEvent) => {
    if (selectedItems.length === 0) { e.preventDefault(); return; }
    window.sessionStorage.setItem(CHECKOUT_SELECTED_CART_IDS_KEY, JSON.stringify(selectedIds));
  };

  // ECART CONNU (CL-07 point 4) : la spec demande qu'un retrait d'article
  // recalcule le panier avec un avertissement explicite si ca fait perdre un
  // seuil de livraison offerte (ex. "tu repasses sous 30000F, la livraison
  // n'est plus gratuite"). Le modele de frais reel de ce projet n'a PAS de
  // seuil de gratuite — c'est une grille additive par vendeur/zone (voir
  // commentaire sur `shippingCost` ci-dessus) — donc cet avertissement est
  // structurellement inapplicable ici, pas simplement non code. `removeItem`
  // recalcule bien `selectedTotal`/`shippingCost` en reactif a chaque retrait.
  //
  // ECART CONNU (CL-07 point 5 — etats du panier) : non geres faute de champ
  // API correspondant (pas de donnee a fabriquer) : colis XL forcant la
  // bascule domicile (CartItem n'a pas de classe de colis, cf. commentaire
  // existant dans features/vendors/v2/commandes/helpers.ts qui fait le meme
  // constat cote vendeur) ; article retire par le serveur pour prix change /
  // rupture (CartContext ne revalide jamais le prix/stock au chargement, il
  // relit juste ce qui a ete sauvegarde) ; panier "hors ligne" fige. Le cas
  // "visiteur non connecte" est en revanche deja correct : la route /cart
  // n'est pas protegee (voir app/routes/router.tsx) et la connexion n'est
  // exigee qu'a /checkout.
  const removeWithUndo = (id: number) => {
    const item = items.find((candidate) => candidate.id === id) ?? null;
    setRemovedItem(item);
    removeItem(id);
    window.setTimeout(() => setRemovedItem((current) => current?.id === id ? null : current), 5000);
  };

  if (items.length === 0) {
    const isFr = i18n.language === "fr";
    return (
      <>
        <PfShellStyles />
        {/*
          Maquette Panier_vide.jpg : panier vide = header minimal dédié
          (flèche retour + "Mon panier" + bandeau sécurité paiement), pas le
          chrome marketplace complet (logo/recherche/cloche/panier/avatar) posé
          par app/layout/Header.tsx + TopAdBar. Ces deux-là vivent hors de ce
          fichier (rendus par AppLayout sur toutes les routes) : on ne peut pas
          les conditionner depuis CartPage sans les toucher, donc on les masque
          par CSS tant que cet état est monté. `--belivay-header-h` (mesuré par
          useFixedHeaderHeight via un ResizeObserver sur <header>) retombe de
          lui-même à 0 une fois le header masqué ; on force aussi le padding
          du conteneur principal à 0 pour éviter un flash de l'écart avant
          cette re-mesure.
        */}
        <style>{`
          header { display: none !important; }
          [data-fixed-top-bar] { display: none !important; }
          #main-content { padding-top: 0 !important; }
        `}</style>
        <div className="pf-root pf-page">
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {/* Bandeau sécurité paiement */}
            <div
              className="pf-anim"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14,
                padding: "8px 14px", borderRadius: 999, background: "rgba(16,185,129,.12)",
                color: "#059669", fontSize: 12, fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              {isFr ? "Paiement sécurisé via MoMo · Escrow BelivaY" : "Secure payment via MoMo · BelivaY Escrow"}
            </div>

            {/* Header minimal : flèche retour + titre, remplace le header du site */}
            <div className="pf-anim" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label={isFr ? "Retour" : "Back"}
                style={{
                  width: 38, height: 38, flexShrink: 0, borderRadius: 12,
                  border: "1px solid var(--pf-border)", background: "var(--pf-s3)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="pf-panel-title" style={{ fontSize: 21 }}>{t("cl1_cart.my_cart")}</div>
            </div>

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

            {/*
              Section "Sauvegardés" (favoris) — maquette Panier_vide.jpg.
              N'affiche rien si la liste de favoris de l'utilisateur est vide :
              pas d'articles inventés. Source des données : même repli
              API → localStorage que features/wishlist/WishlistPage.tsx.
            */}
            {savedProducts.length > 0 && (
              <section className="pf-anim" style={{ marginTop: 28 }}>
                <div className="pf-card-title" style={{ marginBottom: 12 }}>
                  {isFr ? "Sauvegardés" : "Saved"}
                </div>
                <div className="pf-card" style={{ padding: 0, overflow: "hidden" }}>
                  {savedProducts.slice(0, 4).map((product) => {
                    const price = product.price_final ?? product.price_xaf;
                    const img = product.images?.[0]?.image_url || product.media?.[0]?.url;
                    return (
                      <div key={product.id} className="pf-line" style={{ alignItems: "center" }}>
                        <Link to={`/product/${product.id}`} className="pf-thumb" style={{ width: 54, height: 54 }}>
                          {img ? <img src={img} alt={product.title} /> : <Package size={20} strokeWidth={1.6} />}
                        </Link>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/product/${product.id}`}>
                            <div className="pf-support-t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</div>
                          </Link>
                          <div className="pf-order-total" style={{ fontSize: 13, marginTop: 3 }}>{fmt(price)}</div>
                        </div>
                        <button
                          type="button"
                          className="pf-btn-ghost"
                          style={{ flexShrink: 0 }}
                          onClick={() => addItem({
                            id: product.id,
                            name: product.title,
                            price,
                            quantity: 1,
                            image: img,
                            master_id: product.master ?? undefined,
                            isDemo: mockProducts.some((p) => p.id === product.id),
                          })}
                        >
                          {isFr ? "Remettre" : "Add back"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <Link to="/wishlist" className="pf-link" style={{ fontSize: 12.5 }}>
                    {isFr ? "Tout voir" : "See all"} · {savedProducts.length}
                  </Link>
                </div>
              </section>
            )}
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
              <div className="pf-name">{t('cl1_cart.my_cart')}</div>
              <div className="pf-meta">
                <span>{t(selectedItemCount > 1 ? 'cl1_cart.selected_count_plural' : 'cl1_cart.selected_count', { count: selectedItemCount })}</span>
                <span>{t(itemCount > 1 ? 'cl1_cart.item_count_plural' : 'cl1_cart.item_count', { count: itemCount })}</span>
              </div>
            </div>
            <button className="pf-btn-ghost" onClick={() => setSelectedIds(allSelected ? [] : items.map((i) => i.id))}>
              {allSelected ? t('cl1_cart.deselect_all') : t('cl1_cart.select_all')}
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
                        aria-label={t('cl1_cart.select_item_aria', { name: item.name })}
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
                          <button className="pf-del" onClick={() => removeWithUndo(item.id)} aria-label={t('cl1_cart.remove_item_aria', { name: item.name })}>
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
                            <div className="pf-order-total" style={{ fontSize: 15, color: "var(--pf-text)" }}>
                              <AnimatedPrice value={item.price * item.quantity} formatter={fmt} />
                            </div>
                            {item.quantity > 1 && <div className="pf-muted-sm">{fmt(item.price)} {t('cl1_cart.per_unit')}</div>}
                          </div>
                          <div className="pf-qty">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={t('cl1_cart.decrease_aria')}><Minus size={13} /></button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={t('cl1_cart.increase_aria')}><Plus size={13} /></button>
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
                    <span className="pf-card-title">{t('cl1_cart.complete_your_order')}</span>
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
                            + {t('cl1_cart.add')}
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
                cartMasterIds={items.map(item => item.master_id).filter((id): id is number => Boolean(id))}
                limit={5}
              />
            )}

            {/* Récapitulatif */}
            <aside className="pf-side" data-tutorial="cart-summary">
              <div className="pf-glass-panel pf-anim">
                <div className="pf-k">{t('cl1_cart.summary')}</div>

                <div style={{ marginTop: 14 }}>
                  <div className="pf-summary-row"><span className="pf-muted-sm">{t("cart.subtotal")}</span><span className="pf-summary-v">{fmt(selectedTotal)}</span></div>
                  <div className="pf-summary-row"><span className="pf-muted-sm">{t("cart.shipping")}</span><span className="pf-summary-v">{shippingCost > 0 ? fmt(shippingCost) : "—"}</span></div>
                  {/* "Economie estimee" (cl1_cart.estimated_savings) retiree : c'etait
                      Math.round(selectedTotal * 0.04), un pourcentage invente sans
                      aucune donnee API (pas de prix barre / original_price sur
                      CartItem). Regle d'or du projet : ne jamais fabriquer une
                      donnee qu'une API n'expose pas. A reintroduire seulement si le
                      backend expose un vrai montant d'economie (ex. prix barre par
                      article). */}
                </div>

                <div style={{ marginTop: 14 }}>
                  <button type="button" onClick={() => setPromoOpen((current) => !current)} className="pf-link" style={{ fontSize: 12 }}>
                    {promoOpen ? t('cl1_cart.hide_promo_code') : t('cl1_cart.add_promo_code')}
                  </button>
                  {promoOpen && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <input
                        value={promoCode}
                        onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                        placeholder={t('cl1_cart.promo_code_placeholder')}
                        className="pf-input"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button type="button" className="pf-btn-ghost">{t('cl1_cart.apply')}</button>
                    </div>
                  )}
                </div>

                <div style={{ margin: "14px 0", borderTop: "1px dashed var(--pf-border)" }} />
                <div className="pf-total-row">
                  <span className="pf-muted-sm">{t("cart.total")}</span>
                  <b><AnimatedPrice value={selectedTotal + shippingCost} formatter={fmt} /></b>
                </div>

                {/* CL-07 point 3 : la spec demande d'afficher "Carte : 2% de frais de
                    service" si cette info existe cote API/config. Verifie : aucun
                    champ de frais carte n'est expose au client (voir commentaire sur
                    le prestataire carte non choisi dans CheckoutPage.tsx) — on
                    n'affiche donc que les logos, sans inventer un pourcentage. */}
                <div style={{ marginTop: 16, padding: 13, borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                  <div className="pf-sec" style={{ padding: 0 }}>{t('cl1_cart.accepted_methods')}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <OperatorLogo provider="MTN_MOMO" size={34} />
                    <OperatorLogo provider="ORANGE_MONEY" size={34} />
                    <OperatorLogo provider="VISA" size={34} />
                    <OperatorLogo provider="MASTERCARD" size={34} />
                  </div>
                </div>

                <Link to="/checkout" onClick={guard}>
                  <button className="pf-btn-accent pf-btn-block"><Truck size={16} />{t('cl1_cart.place_order')}<ArrowRight size={15} /></button>
                </Link>
                {/*
                  ECART CONNU (CL-07 point 2, a trancher) : ce bouton ("pay_on_pickup")
                  n'est PAS le "paiement au comptoir" de la spec. Il bascule juste le
                  MODE de livraison sur un retrait en point relais ; le paiement reste
                  en ligne (MTN/Orange/Carte) immediatement, via le meme CheckoutPage.
                  Le vrai "paiement au comptoir" de la spec (payer cash a l'arrivee au
                  relais, propose seulement sous 50 000F et si le relais est eligible,
                  sinon message explicite) n'existe nulle part cote backend (pas de
                  cash_on_pickup / comptoir / seuil dans apps/orders ou apps/payments).
                  Non fabrique ici : afficher un seuil 50000F ou une eligibilite
                  inventee serait une donnee que l'API ne fournit pas.
                */}
                <Link to="/checkout?mode=pickup" onClick={guard}>
                  <button className="pf-btn-ghost pf-btn-block"><Store size={15} />{t('cl1_cart.pay_on_pickup')}</button>
                </Link>
                <Link to="/catalog">
                  <button className="pf-btn-ghost pf-btn-block" style={{ border: "none", background: "transparent", color: "var(--pf-text2)" }}>
                    {t('cl1_cart.continue_shopping')}
                  </button>
                </Link>

                <div className="pf-info-note">
                  <span className="pf-info-ic"><ShieldCheck size={15} /></span>
                  <div>
                    <div className="pf-support-t" style={{ fontSize: 13 }}>{t('cl1_cart.escrow_title')}</div>
                    <div className="pf-muted-sm">{t('cl1_cart.escrow_desc')}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {removedItem && (
        <div className="fixed bottom-20 left-1/2 z-[90] flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl lg:bottom-6">
          <span className="truncate">{t('cl1_cart.item_removed', { name: removedItem.name })}</span>
          <button type="button" onClick={() => { addItem(removedItem); setRemovedItem(null); }} className="inline-flex shrink-0 items-center gap-1 font-bold text-orange-300">
            <Undo2 size={15} /> {t('cl1_cart.undo')}
          </button>
        </div>
      )}
    </>
  );
}
