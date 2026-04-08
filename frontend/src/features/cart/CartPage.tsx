import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();

  const shippingCost = items.length > 0 ? 2000 : 0;
  const totalWithShipping = total + shippingCost;
  const savings = Math.round(total * 0.04);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-orange-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
            <ShoppingCart size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("cart.empty")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400">
            {t("cart.empty_desc")}
          </p>
          <Link to="/catalog" className="mt-7 inline-flex">
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
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Panier
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Votre panier BelivaY
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {itemCount} {itemCount > 1 ? t("cart.items") : t("cart.item")} {t("cart.in_cart")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Sous-total
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {total.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                </div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Livraison
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {shippingCost.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                </div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Estimation
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  24–72h
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
          <section className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#fff7ef] dark:bg-gray-800">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="text-primary" size={34} />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                          {item.color ? <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">{item.color}</span> : null}
                          {item.storage ? <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">{item.storage}</span> : null}
                          <span className="rounded-full bg-green-50 px-3 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                            Livraison suivie
                          </span>
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <div className="text-2xl font-bold text-primary">
                          {(item.price * item.quantity).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {item.price.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")} / unité
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex w-fit items-center rounded-2xl border border-orange-100 bg-[#fffaf5] p-1 dark:border-gray-800 dark:bg-gray-800">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-white hover:text-primary dark:text-gray-300 dark:hover:bg-gray-900"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-[48px] text-center text-sm font-semibold text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-white hover:text-primary dark:text-gray-300 dark:hover:bg-gray-900"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside
            className="h-fit rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-24"
            data-tutorial="cart-summary"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Récapitulatif
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Total estimé
                </h2>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 text-right dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Panier</div>
                <div className="text-lg font-bold text-primary">{itemCount}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-[1.5rem] bg-[#fffaf5] p-4 dark:bg-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{t("cart.subtotal")}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {total.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{t("cart.shipping")}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {shippingCost.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-300">
                <span>Économie estimée</span>
                <span className="font-semibold">-{savings.toLocaleString("fr-FR")} XAF</span>
              </div>
              <div className="border-t border-orange-100 pt-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("cart.total")}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {totalWithShipping.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")} {t("common.currency")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Link to="/checkout" className="block">
                <Button id="checkout" variant="primary" size="lg" className="w-full rounded-2xl">
                  {t("cart.checkout")}
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/catalog" className="block">
                <Button variant="secondary" size="md" className="w-full rounded-2xl">
                  Continuer mes achats
                </Button>
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm dark:border-green-900/30 dark:bg-green-900/10">
                <ShieldCheck className="mt-0.5 text-green-600 dark:text-green-300" size={18} />
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">Escrow BelivaY</div>
                  <div className="mt-1 text-green-700 dark:text-green-300">
                    Votre paiement reste protégé jusqu’à la réception de votre commande.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Truck size={16} className="text-primary" />
                Livraison suivie 24–72h Cameroun & CEMAC
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
