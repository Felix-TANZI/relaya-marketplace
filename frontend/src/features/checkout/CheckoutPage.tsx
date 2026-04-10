import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, CheckCircle, Package, ShieldCheck, User, Phone, MapPin, Store, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ordersApi } from '@/services/api/orders';
import { useToast } from '@/context/ToastContext';

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const isPickup = new URLSearchParams(window.location.search).get("mode") === "pickup";

  const [formData, setFormData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    phone: user?.phone || "",
    address: "",
    city: "Yaoundé",
    paymentMethod: "momo",
    orderId: 0,
  });
  const [step, setStep] = useState<"form" | "success">("form");

  const shippingCost = isPickup ? 0 : 2000;
  const finalTotal = total + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!localStorage.getItem('access_token')) {
        showToast('Connectez-vous pour finaliser votre commande', 'error');
        navigate('/login');
        return;
      }
      const cityMap: Record<string, 'YAOUNDE' | 'DOUALA'> = { 'Yaoundé': 'YAOUNDE', 'Douala': 'DOUALA' };
      const order = await ordersApi.create({
        city: cityMap[formData.city] || 'YAOUNDE',
        address: isPickup ? 'Retrait en boutique' : formData.address,
        customer_phone: formData.phone,
        customer_email: '',
        note: isPickup ? 'CLICK_AND_COLLECT - Retrait en boutique' : '',
        cart_items: items.map((item) => ({ product_id: item.id, qty: item.quantity })),
      });
      clearCart();
      setStep('success');
      setFormData({ ...formData, orderId: order.id });
      // Dispatch notification
      window.dispatchEvent(new Event("belivay-new-notification"));
    } catch (error) {
      console.error('Erreur création commande:', error);
      showToast(t('checkout.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0 && step !== "success") navigate("/cart");
  }, [items.length, step, navigate]);

  if (items.length === 0 && step !== "success") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] dark:bg-gray-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" /></div>;
  }

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white placeholder:text-gray-400";

  // ── Success screen ──
  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] py-20 dark:bg-gray-950 px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('checkout.success_title')}</h1>
          <div className="mx-auto mt-4 inline-block rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-xs text-gray-400">Commande</p>
            <p className="mt-1 text-2xl font-bold text-primary">#{formData.orderId}</p>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('checkout.success_message')}</p>
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {isPickup ? "Retrait en boutique" : t('checkout.delivery_details')}
            </h3>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span>{formData.firstName} {formData.lastName}</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /><span>{formData.phone}</span></div>
              {isPickup ? (
                <div className="flex items-center gap-2"><Store size={14} className="text-green-500" /><span className="font-medium text-green-700 dark:text-green-400">Click & Collect · {formData.city}</span></div>
              ) : (
                <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span>{formData.address}, {formData.city}</span></div>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/" className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">{t('checkout.back_home')}</Link>
            <Link to="/orders" className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Voir mes commandes</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ──
  return (
    <div className="min-h-screen bg-[#f8f5f1] py-8 dark:bg-gray-950 px-4" data-tour="checkout">
      <div className="container mx-auto max-w-6xl">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400">
          <ArrowLeft size={18} />{t('checkout.back_to_cart')}
        </Link>

        {/* Header with mode indicator */}
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isPickup ? "bg-green-50 text-green-600 dark:bg-green-900/20" : "bg-primary/10 text-primary"}`}>
              {isPickup ? <Store size={20} /> : <Truck size={20} />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Paiement</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {isPickup ? "Payer et retirer en boutique" : t('checkout.title')}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Infos personnelles - only for delivery mode, or minimal for pickup */}
            {!isPickup && (
              <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">1</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_info')}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.first_name')}</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder={t('checkout.first_name_placeholder')} className={inputClass} /></div>
                  <div><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.last_name')}</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder={t('checkout.last_name_placeholder')} className={inputClass} /></div>
                  <div className="sm:col-span-2"><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.phone')}</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={t('checkout.phone_placeholder')} className={inputClass} /><p className="mt-1.5 text-xs text-gray-400">{t('checkout.phone_helper')}</p></div>
                </div>
              </section>
            )}

            {/* Address - only for delivery */}
            {!isPickup && (
              <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">2</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_address')}</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.city')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Yaoundé", "Douala"].map((city) => (
                        <button key={city} type="button" onClick={() => setFormData({ ...formData, city })}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${formData.city === city ? "bg-primary text-white shadow-lg shadow-primary/20" : "border border-gray-200 bg-white text-gray-700 hover:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.address')}</label>
                    <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('checkout.address_placeholder')} className={inputClass} />
                    <p className="mt-1.5 text-xs text-gray-400">{t('checkout.address_helper')}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Pickup info box */}
            {isPickup && (
              <section className="rounded-[2rem] border border-green-200 bg-green-50 p-6 shadow-sm dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-800">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Retrait en boutique</h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                      Payez maintenant et récupérez votre commande directement chez le vendeur.
                      Vous recevrez un SMS avec l'adresse exacte et les horaires de retrait sur votre numéro <strong>{formData.phone || user?.phone || "enregistré"}</strong>.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Payment - always shown */}
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
                  {isPickup ? "1" : "3"}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_payment')}</h2>
              </div>
              <div className="space-y-3">
                {[
                  { id: "momo", name: t('checkout.payment_momo'), icon: <CreditCard size={20} /> },
                  { id: "orange", name: t('checkout.payment_orange'), icon: <CreditCard size={20} /> },
                ].map((method) => (
                  <button key={method.id} type="button" onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${formData.paymentMethod === method.id ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{method.icon}</div>
                    <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{method.name}</span>
                    {formData.paymentMethod === method.id && <CheckCircle className="text-primary" size={22} />}
                  </button>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={14} />
                {t('checkout.payment_helper')}
              </p>
            </section>

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-60">
              <CreditCard size={18} />{loading ? '...' : isPickup ? "Payer maintenant" : t('checkout.confirm')}
            </button>
          </form>

          {/* Order Summary sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-white">{t('checkout.summary')}</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#fcfbf8] dark:bg-gray-800">
                      {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="text-gray-300" size={20} /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-400">Qté {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{(item.price * item.quantity).toLocaleString(locale)} FCFA</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm dark:border-gray-800">
                <div className="flex justify-between text-gray-500">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{total.toLocaleString(locale)} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{isPickup ? "Retrait boutique" : t('cart.shipping')}</span>
                  <span className={`font-semibold ${isPickup ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                    {isPickup ? "Gratuit" : `${shippingCost.toLocaleString(locale)} FCFA`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-white">{t('cart.total')}</span>
                  <span className="text-2xl font-bold text-primary">{finalTotal.toLocaleString(locale)} FCFA</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
