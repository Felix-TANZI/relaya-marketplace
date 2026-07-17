import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { V29_PRODUCTS as mockProducts } from "@/data/v29Products";

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, updateQuantity, itemCount, addItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<number[]>(() => items.map((item) => item.id));
  const itemIdsKey = items.map((item) => item.id).join(",");
  const [lastItemIdsKey, setLastItemIdsKey] = useState(itemIdsKey);

  // Sync the selection with the cart contents during render (keep existing, add new).
  if (itemIdsKey !== lastItemIdsKey) {
    setLastItemIdsKey(itemIdsKey);
    setSelectedIds((current) => {
      const itemIds = items.map((item) => item.id);
      const kept = current.filter((id) => itemIds.includes(id));
      const added = itemIds.filter((id) => !current.includes(id));
      return [...kept, ...added];
    });
  }

  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const fmt = (n: number) => `${Math.round(n).toLocaleString(locale)} FCFA`;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = items.filter((item) => selectedIdSet.has(item.id));
  const selectedItemCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = selectedItems.length > 0 ? 2000 : 0;
  const totalWithShipping = selectedTotal + shippingCost;
  const savings = Math.round(selectedTotal * 0.04);
  const allSelected = selectedItems.length === items.length;

  const toggleSelection = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  };

  const persistCheckoutSelection = () => {
    window.sessionStorage.setItem(CHECKOUT_SELECTED_CART_IDS_KEY, JSON.stringify(selectedIds));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-lg rounded-[1.75rem] border border-orange-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
            <ShoppingCart size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {t("cart.empty")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t("cart.empty_desc")}
          </p>
          <Link to="/catalog" className="mt-6 inline-flex">
            <Button variant="primary" size="lg">
              <Package size={18} />
              {t("cart.explore")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5f1] px-3 pb-24 pt-4 dark:bg-gray-950 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-6xl">
        {/* ══════════ EN-TÊTE SLIM ══════════ */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
              <ShoppingCart size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">Mon panier</h1>
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
                {selectedItemCount} sélectionné{selectedItemCount > 1 ? "s" : ""} · {itemCount} article{itemCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(allSelected ? [] : items.map((item) => item.id))}
            className="flex-shrink-0 rounded-full border border-orange-200 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-orange-50 dark:border-primary/30 dark:hover:bg-primary/10 sm:text-xs"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_350px] lg:items-start">
          {/* ══════════ COLONNE ARTICLES ══════════ */}
          <div className="min-w-0 space-y-4">
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {items.map((item) => {
                const selected = selectedIdSet.has(item.id);
                const lineTotal = item.price * item.quantity;
                const productLink = `/product/${item.id}${item.isDemo ? "?mock=1" : ""}`;
                return (
                  <div key={item.id} className={`flex gap-3 p-3 transition ${selected ? "" : "opacity-55"}`}>
                    <label className="flex shrink-0 items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-orange-200 text-primary focus:ring-primary"
                        aria-label={`Sélectionner ${item.name}`}
                      />
                    </label>

                    <Link
                      to={productLink}
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff7ef] transition hover:opacity-90 dark:bg-gray-800 sm:h-20 sm:w-20"
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="text-primary" size={26} />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={productLink} className="block min-w-0">
                          <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 transition hover:text-primary dark:text-white sm:text-sm">
                            {item.name}
                          </h2>
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Retirer ${item.name}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {(item.color || item.storage) && (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {item.color ? <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{item.color}</span> : null}
                          {item.storage ? <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{item.storage}</span> : null}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[14px] font-black text-gray-900 dark:text-white sm:text-[15px]">{fmt(lineTotal)}</div>
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{fmt(item.price)} / unité</div>
                          )}
                        </div>

                        <div className="inline-flex flex-shrink-0 items-center rounded-full border border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Diminuer la quantité"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:text-primary dark:text-gray-300"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-[13px] font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Augmenter la quantité"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:text-primary dark:text-gray-300"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cross-sell : produits complémentaires */}
            {items.length > 0 && (() => {
              const complementMap: Record<string, string[]> = {
                "shoes": ["femme", "homme", "beaute"],
                "femme": ["shoes", "beaute", "maison"],
                "homme": ["shoes", "tech"],
                "phone": ["tech", "maison"],
                "tech": ["phone", "maison"],
                "beaute": ["femme", "super"],
                "maison": ["tech", "super"],
                "super": ["beaute", "maison"],
                "sport": ["shoes", "homme"],
                "bebe": ["femme", "super"],
              };
              const cartItemIds = new Set(items.map((i) => i.id));
              const cartCategories = new Set<string>();
              for (const item of items) {
                const mock = mockProducts.find((m) => m.id === item.id);
                if (mock?.category?.slug) cartCategories.add(mock.category.slug);
              }
              const targetCats = new Set<string>();
              cartCategories.forEach((cat) => {
                (complementMap[cat] || []).forEach((c) => targetCats.add(c));
              });
              if (targetCats.size === 0) {
                mockProducts.slice(0, 4).forEach((p) => { if (p.category?.slug) targetCats.add(p.category.slug); });
              }
              const suggestions = mockProducts
                .filter((p) => !cartItemIds.has(p.id) && p.category?.slug && targetCats.has(p.category.slug))
                .slice(0, 6);
              if (suggestions.length === 0) return null;
              return (
                <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-4 w-[3px] rounded bg-primary" />
                    <h3 className="text-[13px] font-extrabold text-gray-900 dark:text-white">Complétez votre commande</h3>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                    {suggestions.map((product) => {
                      const price = product.price_final || product.price_xaf;
                      const img = product.images?.[0]?.image_url || product.media?.[0]?.url;
                      return (
                        <div key={product.id} className="w-[120px] flex-shrink-0">
                          <Link to={`/product/${product.id}?mock=1`} className="block">
                            <div className="mb-1.5 flex h-[90px] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                              {img ? (
                                <img src={img} alt={product.title} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Package size={22} className="text-gray-300" />
                              )}
                            </div>
                            <p className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-800 dark:text-white">{product.title}</p>
                            <p className="mt-0.5 text-[12px] font-extrabold text-primary">{fmt(price)}</p>
                          </Link>
                          <button
                            type="button"
                            onClick={() => addItem({ id: product.id, name: product.title, price, quantity: 1, image: img, isDemo: true })}
                            className="mt-1.5 w-full rounded-lg bg-primary px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary-dark"
                          >
                            + Ajouter
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>

          {/* ══════════ RÉCAPITULATIF ══════════ */}
          <aside
            className="min-w-0 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-24"
            data-tutorial="cart-summary"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Récapitulatif</h2>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span>{t("cart.subtotal")}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{fmt(selectedTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span>{t("cart.shipping")}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{shippingCost > 0 ? fmt(shippingCost) : "—"}</span>
              </div>
              {savings > 0 && (
                <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                  <span>Économie estimée</span>
                  <span className="font-semibold">− {fmt(savings)}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-dashed border-gray-200 dark:border-gray-700" />

            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("cart.total")}</span>
              <span className="text-xl font-black text-primary sm:text-2xl">{fmt(totalWithShipping)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to="/checkout"
                className="block"
                onClick={(event) => {
                  if (selectedItems.length === 0) {
                    event.preventDefault();
                    return;
                  }
                  persistCheckoutSelection();
                }}
              >
                <Button variant="primary" size="lg" className="w-full min-w-0 rounded-2xl text-sm">
                  <Truck size={18} />
                  <span className="sm:hidden">Passer commande</span>
                  <span className="hidden sm:inline">Passer commande (avec livraison)</span>
                  <ArrowRight className="hidden sm:block" size={18} />
                </Button>
              </Link>
              <Link
                to="/checkout?mode=pickup"
                className="block"
                onClick={(event) => {
                  if (selectedItems.length === 0) {
                    event.preventDefault();
                    return;
                  }
                  persistCheckoutSelection();
                }}
              >
                <Button variant="secondary" size="lg" className="w-full min-w-0 rounded-2xl text-sm">
                  <Store size={18} />
                  <span className="sm:hidden">Payer au retrait</span>
                  <span className="hidden sm:inline">Payer maintenant (retrait au centre BelivaY)</span>
                </Button>
              </Link>
              <Link to="/catalog" className="block">
                <Button variant="ghost" size="md" className="w-full rounded-2xl">
                  Continuer mes achats
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50 p-3 text-[12px] dark:border-green-900/30 dark:bg-green-900/10">
              <ShieldCheck className="mt-0.5 shrink-0 text-green-600 dark:text-green-300" size={16} />
              <div>
                <div className="font-semibold text-green-800 dark:text-green-200">Escrow BelivaY</div>
                <div className="mt-0.5 text-green-700 dark:text-green-300">Paiement protégé jusqu'à la réception de votre commande.</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
              <Truck size={14} className="text-primary" />
              Livraison suivie 24–72h Cameroun &amp; CEMAC
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}