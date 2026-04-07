import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCard, MapPin, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/features/cart/useCart";
import { cartTotalXaf } from "@/features/cart/cartStore";
import { loadCheckoutDraft } from "./storage";

export default function CheckoutConfirmPage() {
  const { t } = useTranslation();
  const items = useCart();
  const total = cartTotalXaf();
  const draft = loadCheckoutDraft();
  const deliveryFee = total >= 30000 ? 0 : 2500;

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
            <Package className="mx-auto mb-4 text-primary" size={34} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('checkout.confirm_details.missing_info_title')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('checkout.confirm_details.missing_info_description')}
            </p>
            <Link
              to="/checkout"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
            >
              {t('checkout.confirm_details.back_button')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('checkout.confirm_details.breadcrumb')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {t('checkout.confirm_details.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('checkout.confirm_details.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Package size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.confirm_details.products_title')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {items.length > 1
                      ? t('checkout.confirm_details.products_count_other', { count: items.length })
                      : t('checkout.confirm_details.products_count_one', { count: items.length })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-2xl bg-[#fcfbf8] px-4 py-4 dark:bg-gray-800"
                  >
                    <div className="max-w-[70%]">
                      <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.qty} × {item.price_xaf.toLocaleString()} FCFA
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {(item.qty * item.price_xaf).toLocaleString()} FCFA
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('checkout.confirm_details.delivery_title')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('checkout.confirm_details.delivery_summary')}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#fff7ef] p-4 dark:bg-gray-800">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                    {t('checkout.confirm_details.city_label')}
                  </p>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">{draft.city}</p>
                </div>
                <div className="rounded-2xl bg-[#fff7ef] p-4 dark:bg-gray-800">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                    {t('checkout.confirm_details.phone_label')}
                  </p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <Phone size={16} className="text-primary" />
                    {draft.phone}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fff7ef] p-4 dark:bg-gray-800 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                    {t('checkout.confirm_details.address_label')}
                  </p>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">{draft.address}</p>
                  {draft.note ? (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{draft.note}</p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-white">
                {t('checkout.confirm_details.total_title')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t('checkout.confirm_details.subtotal')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {total.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t('checkout.confirm_details.delivery')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {deliveryFee === 0 ? t('checkout.confirm_details.delivery_free') : `${deliveryFee.toLocaleString()} FCFA`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 font-semibold dark:border-gray-800">
                  <span className="text-gray-900 dark:text-white">{t('checkout.confirm_details.total')}</span>
                  <span className="text-2xl text-primary">
                    {(total + deliveryFee).toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                  disabled
                >
                  <CreditCard size={18} />
                  {t('checkout.confirm_details.validate_button')}
                </button>
                <Link
                  to="/checkout"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {t('checkout.confirm_details.return_button')}
                </Link>
              </div>

              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                {t('checkout.confirm_details.payment_note')}
              </p>
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/20">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{t('checkout.confirm_details.delivery_offer_title')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('checkout.confirm_details.delivery_offer')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{t('checkout.confirm_details.secure_payment_title')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('checkout.confirm_details.secure_payment')}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
