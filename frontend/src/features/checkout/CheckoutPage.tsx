import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle, Clipboard, Clock3, Package, ShieldCheck, User, Phone, MapPin, Store, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ordersApi } from '@/services/api/orders';
import { locationApi, type LocationPrecisionResult } from '@/services/api/location';
import { useToast } from '@/context/ToastContext';
import { PhoneInput } from "@/components/ui/PhoneInput";

/* ── Confetti ── */
function launchConfetti(el: HTMLElement) {
  const colors = ['#F47920','#FF9D4D','#16A34A','#3B82F6','#EC4899','#FBBF24','#7C3AED','#EF4444'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;top:-10px;left:${Math.random()*100}%;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.5?'50%':'2px'};pointer-events:none;`;
    p.animate([
      { transform:'translateY(0) rotate(0)', opacity:1 },
      { transform:`translateY(${600+Math.random()*400}px) rotate(${360+Math.random()*720}deg)`, opacity:0 },
    ], { duration:1800+Math.random()*1200, easing:'cubic-bezier(.25,.46,.45,.94)', fill:'forwards' });
    el.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

const PAY_STEPS = [
  { text: "Connexion sécurisée...", pct: 15 },
  { text: "Vérification du compte...", pct: 35 },
  { text: "Traitement du paiement...", pct: 60 },
  { text: "Confirmation en cours...", pct: 85 },
  { text: "Paiement confirmé !", pct: 100 },
];

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";
const CHECKOUT_DRAFT_KEY = "belivay_checkout_draft";

const PICKUP_CENTERS = {
  "Yaoundé": [
    {
      id: "yaounde-mokolo",
      name: "Centre BelivaY Mokolo",
      address: "Mokolo, face marché central, Yaoundé",
      hours: "Lun-Sam · 8h30-18h30",
    },
    {
      id: "yaounde-bastos",
      name: "Centre BelivaY Bastos",
      address: "Bastos, rond-point Nlongkak, Yaoundé",
      hours: "Lun-Sam · 9h00-18h00",
    },
  ],
  "Douala": [
    {
      id: "douala-akwa",
      name: "Centre BelivaY Akwa",
      address: "Akwa, boulevard de la Liberté, Douala",
      hours: "Lun-Sam · 8h30-18h30",
    },
    {
      id: "douala-bonapriso",
      name: "Centre BelivaY Bonapriso",
      address: "Bonapriso, avenue Charles de Gaulle, Douala",
      hours: "Lun-Sam · 9h00-18h00",
    },
  ],
} as const;

function readCheckoutSelection() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SELECTED_CART_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { items, isHydrated, clearCart, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const initialPickup = new URLSearchParams(window.location.search).get("mode") === "pickup";
  const [receiptMode, setReceiptMode] = useState<"delivery" | "pickup">(initialPickup ? "pickup" : "delivery");
  const isPickup = receiptMode === "pickup";
  const [checkoutStage, setCheckoutStage] = useState(1);
  const [phoneValid, setPhoneValid] = useState(false);
  const [paymentPhoneValid, setPaymentPhoneValid] = useState(false);
  const [addressPrecision, setAddressPrecision] = useState<LocationPrecisionResult | null>(null);
  const [addressAnalyzing, setAddressAnalyzing] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);
  const [payOverlay, setPayOverlay] = useState(false);
  const [payStep, setPayStep] = useState(0);

  useEffect(() => {
    if (!payOverlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [payOverlay]);

  const [formData, setFormData] = useState(() => {
    let draft: Record<string, string> = {};
    try { draft = JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY) || "{}"); } catch { /* ignore invalid local draft */ }
    return {
      firstName: draft.firstName || user?.first_name || "",
      lastName: draft.lastName || user?.last_name || "",
      phone: draft.phone || user?.phone || "",
      paymentPhone: draft.paymentPhone || user?.phone || "",
      address: draft.address || "",
      city: draft.city || "Yaoundé",
      pickupCenterId: draft.pickupCenterId || "yaounde-mokolo",
      deliverySpeed: draft.deliverySpeed || "standard",
      promoCode: draft.promoCode || "",
      orderId: 0,
    };
  });
  const [step, setStep] = useState<"form" | "success">("form");

  const selectedCheckoutIds = useMemo(() => readCheckoutSelection(), [items.length]);
  const checkoutItems = selectedCheckoutIds.length > 0
    ? items.filter((item) => selectedCheckoutIds.includes(item.id))
    : items;
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = isPickup ? 0 : formData.deliverySpeed === "express" ? 4500 : 2000;
  const finalTotal = checkoutSubtotal + shippingCost;
  const pickupCenters = PICKUP_CENTERS[formData.city as keyof typeof PICKUP_CENTERS] ?? PICKUP_CENTERS["Yaoundé"];
  const selectedPickupCenter = pickupCenters.find((center) => center.id === formData.pickupCenterId) ?? pickupCenters[0];

  useEffect(() => {
    const { orderId: _orderId, ...draft } = formData;
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [formData]);

  useEffect(() => {
    if (step === "success") return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!formData.address && !formData.phone && !formData.paymentPhone) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [formData.address, formData.paymentPhone, formData.phone, step]);

  const runPayment = useCallback(async () => {
    setPayOverlay(true);
    setPayStep(0);
    for (let i = 0; i < PAY_STEPS.length; i++) {
      setPayStep(i);
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    }
    let orderId = Math.floor(10000 + Math.random() * 90000);
    try {
      const cityMap: Record<string, 'YAOUNDE' | 'DOUALA'> = { 'Yaoundé': 'YAOUNDE', 'Douala': 'DOUALA' };
      const order = await ordersApi.create({
        delivery_mode: isPickup ? 'PICKUP' : 'DELIVERY',
        city: cityMap[formData.city] || 'YAOUNDE',
        address: isPickup ? `${selectedPickupCenter.name} - ${selectedPickupCenter.address}` : formData.address,
        address_precision: isPickup ? undefined : addressPrecision ?? undefined,
        customer_phone: formData.phone,
        customer_email: '',
        note: isPickup
          ? `CLICK_AND_COLLECT - ${selectedPickupCenter.name} - ${selectedPickupCenter.address} - ${selectedPickupCenter.hours}`
          : '',
        cart_items: checkoutItems.map((item) => ({
          product_id: item.id,
          qty: item.quantity,
          title: item.name,
          price_xaf: item.price,
          image_url: item.image,
          is_demo: item.isDemo,
        })),
      });
      orderId = order.id;
    } catch (error) {
      setPayOverlay(false);
      showToast(
        error instanceof Error
          ? `Commande refusee par le backend: ${error.message}`
          : "Commande refusee par le backend.",
        "error",
      );
      throw error;
    }
    if (checkoutItems.length === items.length) {
      clearCart();
    } else {
      checkoutItems.forEach((item) => removeItem(item.id));
    }
    window.sessionStorage.removeItem(CHECKOUT_SELECTED_CART_IDS_KEY);
    setPayOverlay(false);
    setFormData(prev => ({ ...prev, orderId }));
    setStep('success');
    window.dispatchEvent(new Event("belivay-new-notification"));
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
    showToast("Commande confirmée. Vous pouvez maintenant suivre sa préparation.", "success");
    requestAnimationFrame(() => { if (confettiRef.current) launchConfetti(confettiRef.current); });
  }, [addressPrecision, checkoutItems, formData, isPickup, items.length, clearCart, removeItem, selectedPickupCenter, showToast, navigate]);

  useEffect(() => {
    setAddressPrecision(null);
  }, [formData.address, formData.city]);

  const analyzeDeliveryAddress = useCallback(async () => {
    if (isPickup) return true;
    const address = formData.address.trim();
    if (address.length < 4) {
      showToast("Ajoutez un quartier ou un repère de livraison.", "error");
      return false;
    }
    if (addressPrecision && addressPrecision.city === formData.city) return true;

    setAddressAnalyzing(true);
    try {
      const result = await locationApi.refine({ city: formData.city, address });
      setAddressPrecision(result);
      if (result.needsMoreDetail && result.precisionScore < 55) {
        showToast(result.followUpQuestion || "Ajoutez un repère plus précis pour le livreur.", "error");
        return false;
      }
      const precisionText = result.precisionLabel === "moyen" ? "moyenne" : result.precisionLabel;
      showToast(`Adresse ${precisionText} pour la livraison.`, "success");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analyse de l'adresse indisponible.", "error");
      return false;
    } finally {
      setAddressAnalyzing(false);
    }
  }, [addressPrecision, formData.address, formData.city, isPickup, showToast]);

  const handleContinue = useCallback(async () => {
    if (checkoutStage === 2 && !isPickup) {
      const ok = await analyzeDeliveryAddress();
      if (!ok) return;
    }
    setCheckoutStage((stage) => stage + 1);
  }, [analyzeDeliveryAddress, checkoutStage, isPickup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localStorage.getItem('access_token')) {
      showToast('Connectez-vous pour finaliser votre commande', 'error');
      navigate('/login');
      return;
    }
    if (!phoneValid || !paymentPhoneValid || (!isPickup && !formData.address.trim())) {
      showToast("Complétez les informations requises avant de confirmer.", "error");
      return;
    }
    setLoading(true);
    try {
      await runPayment();
    } catch {
      // L'erreur est deja affichee dans runPayment.
    } finally {
      setLoading(false);
    }
  };

  // Redirect to cart if empty
  useEffect(() => {
    if (isHydrated && checkoutItems.length === 0 && step !== "success") navigate("/cart");
  }, [checkoutItems.length, isHydrated, step, navigate]);

  if (!isHydrated || (checkoutItems.length === 0 && step !== "success")) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] dark:bg-gray-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" /></div>;
  }

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white placeholder:text-gray-400";

  // ── Payment loading overlay ──
  if (payOverlay) {
    const ps = PAY_STEPS[payStep];
    return (
      <div className="fixed inset-0 z-[9999] flex h-dvh min-h-dvh items-center justify-center bg-[#fff7ef] px-4 dark:bg-gray-950">
        <div className="w-[90%] max-w-sm rounded-lg border border-orange-100 bg-white p-8 text-center shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 h-[52px] w-[52px] rounded-full border-4 border-gray-200 border-t-primary dark:border-gray-700" style={{ animation: 'spin 650ms linear infinite' }} />
          <p className="text-[15px] font-bold text-gray-900 dark:text-white">{ps.text}</p>
          <p className="mt-1 text-xs text-gray-500">Gardez cette page ouverte pendant la confirmation CamPay.</p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${ps.pct}%` }} />
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Success screen ──
  if (step === "success") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#f8f5f1] py-20 dark:bg-gray-950 px-4">
        {/* Confetti container */}
        <div ref={confettiRef} className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden" />
        <div className="mx-auto max-w-md text-center">
          <style>{`@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20" style={{ animation: 'popIn 450ms cubic-bezier(.34,1.56,.64,1)' }}>
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('checkout.success_title')}</h1>
          <div className="mx-auto mt-4 inline-block rounded-lg bg-white px-6 py-4 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-xs text-gray-400">Commande</p>
            <p className="mt-1 text-2xl font-bold text-primary">#{formData.orderId}</p>
          </div>
          <button type="button" onClick={() => navigator.clipboard.writeText(String(formData.orderId))} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"><Clipboard size={15} /> Copier la référence</button>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('checkout.success_message')}</p>
          <div className="mt-6 rounded-lg border border-gray-100 bg-white p-5 text-left shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {isPickup ? "Retrait au centre BelivaY" : t('checkout.delivery_details')}
            </h3>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span>{formData.firstName} {formData.lastName}</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /><span>{formData.phone}</span></div>
              {isPickup ? (
                <>
                  <div className="flex items-center gap-2"><Store size={14} className="text-green-500" /><span className="font-medium text-green-700 dark:text-green-400">{selectedPickupCenter.name}</span></div>
                  <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 text-gray-400" /><span>{selectedPickupCenter.address}</span></div>
                  <div className="mt-4 rounded-lg border border-dashed border-green-300 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30"><p className="text-xs font-bold uppercase text-green-700">Code de retrait</p><p className="mt-1 text-2xl font-black tracking-[0.2em] text-green-900">BVY-{String(formData.orderId).padStart(6, "0")}</p></div>
                </>
              ) : (
                <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span>{formData.address}, {formData.city}</span></div>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link to={`/orders/${formData.orderId}`} className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">Suivre cette commande</Link>
            <Link to="/catalog" className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Continuer mes achats</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ──
  return (
    <div className="min-h-screen bg-[#f8f5f1] px-3 pb-24 pt-4 dark:bg-gray-950 sm:px-4 sm:py-8" data-tour="checkout">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between"><Link to="/cart" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400"><ArrowLeft size={18} />{t('checkout.back_to_cart')}</Link><img src="/belivay-logo.png" alt="BelivaY" className="h-9 w-auto object-contain" /></div>

        {/* Header with mode indicator */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800 sm:mb-8 sm:p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isPickup ? "bg-green-50 text-green-600 dark:bg-green-900/20" : "bg-primary/10 text-primary"}`}>
              {isPickup ? <Store size={20} /> : <Truck size={20} />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Paiement</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {isPickup ? "Payer et retirer au centre BelivaY" : t('checkout.title')}
              </h1>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {["Réception", "Coordonnées", "Paiement", "Vérification"].map((label, index) => {
            const number = index + 1;
            return <button key={label} type="button" onClick={() => setCheckoutStage(number)} className={`flex min-h-14 items-center justify-center gap-2 border-r border-gray-100 px-2 text-xs font-bold last:border-r-0 dark:border-gray-800 ${checkoutStage === number ? "bg-primary text-white" : number < checkoutStage ? "text-green-700" : "text-gray-500"}`}>{number < checkoutStage ? <Check size={15} /> : <span>{number}</span>}<span className="hidden sm:inline">{label}</span></button>;
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6">

            {checkoutStage === 1 && (
              <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Comment souhaitez-vous recevoir la commande ?</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setReceiptMode("delivery")} className={`flex min-h-28 items-start gap-4 rounded-lg border-2 p-4 text-left ${!isPickup ? "border-primary bg-orange-50 dark:bg-primary/10" : "border-gray-200 dark:border-gray-700"}`}><Truck className="mt-0.5 shrink-0 text-primary" /><span><strong className="block text-gray-900 dark:text-white">Livraison à domicile</strong><span className="mt-1 block text-sm text-gray-500">À partir de 2 000 FCFA, selon la vitesse choisie.</span></span></button>
                  <button type="button" onClick={() => setReceiptMode("pickup")} className={`flex min-h-28 items-start gap-4 rounded-lg border-2 p-4 text-left ${isPickup ? "border-green-600 bg-green-50 dark:bg-green-950/20" : "border-gray-200 dark:border-gray-700"}`}><Store className="mt-0.5 shrink-0 text-green-600" /><span><strong className="block text-gray-900 dark:text-white">Retrait en point relais</strong><span className="mt-1 block text-sm text-gray-500">Gratuit, avec code de retrait après disponibilité.</span></span></button>
                </div>
              </section>
            )}

            {/* Infos personnelles - only for delivery mode */}
            {checkoutStage === 2 && !isPickup && (
              <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">1</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_info')}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.first_name')}</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder={t('checkout.first_name_placeholder')} className={inputClass} /></div>
                  <div><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.last_name')}</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder={t('checkout.last_name_placeholder')} className={inputClass} /></div>
                  <div className="sm:col-span-2"><PhoneInput required label={t('checkout.phone')} value={formData.phone} onChange={(phone) => setFormData({ ...formData, phone })} onValidityChange={setPhoneValid} helperText={t('checkout.phone_helper')} /></div>
                </div>
              </section>
            )}

            {checkoutStage === 2 && isPickup && (
              <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">1</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informations de retrait</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.first_name')}</label>
                    <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder={t('checkout.first_name_placeholder')} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.last_name')}</label>
                    <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder={t('checkout.last_name_placeholder')} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <PhoneInput
                      required
                      label="Numéro pour le retrait"
                      value={formData.phone}
                      onChange={(phone) => setFormData({ ...formData, phone })}
                      onValidityChange={setPhoneValid}
                      helperText="Ce numéro servira à envoyer le code et les informations de retrait."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Address - only for delivery */}
            {checkoutStage === 2 && !isPickup && (
              <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">2</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_address')}</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('checkout.city')}</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  {addressAnalyzing && (
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950/20 dark:text-orange-200">
                      Analyse de la zone en cours...
                    </div>
                  )}
                  {addressPrecision && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Précision adresse</p>
                          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{addressPrecision.driverHint}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          addressPrecision.precisionScore >= 75
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : addressPrecision.precisionScore >= 55
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {addressPrecision.precisionScore}/100
                        </span>
                      </div>
                      {addressPrecision.landmarks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {addressPrecision.landmarks.map((landmark) => (
                            <span key={landmark} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700">
                              {landmark}
                            </span>
                          ))}
                        </div>
                      )}
                      {addressPrecision.semanticMatches.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {addressPrecision.semanticMatches.map((match) => (
                            <p key={match.label} className="text-xs text-gray-500 dark:text-gray-400">
                              <strong className="text-gray-700 dark:text-gray-200">{match.label}</strong> · {match.reason}
                            </p>
                          ))}
                        </div>
                      )}
                      {addressPrecision.needsMoreDetail && (
                        <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{addressPrecision.followUpQuestion}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">Vitesse de livraison</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[{ id: "standard", label: "Standard", detail: "24 à 72 h · 2 000 FCFA" }, { id: "express", label: "Express", detail: "Le jour même avant l'heure limite · 4 500 FCFA" }].map((speed) => <button key={speed.id} type="button" onClick={() => setFormData({ ...formData, deliverySpeed: speed.id })} className={`rounded-lg border p-3 text-left ${formData.deliverySpeed === speed.id ? "border-primary bg-orange-50 dark:bg-primary/10" : "border-gray-200 dark:border-gray-700"}`}><strong className="block text-sm text-gray-900 dark:text-white">{speed.label}</strong><span className="text-xs text-gray-500">{speed.detail}</span></button>)}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Pickup info box */}
            {checkoutStage === 2 && isPickup && (
              <section className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-800 dark:bg-green-900/20 sm:p-6">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-800">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Retrait au centre BelivaY</h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                      Choisissez le centre où votre colis sera gardé. Vous recevrez les informations de retrait sur le numéro indiqué.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-green-700 dark:text-green-300">Ville de retrait</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {["Yaoundé", "Douala"].map((city) => {
                        const nextCenters = PICKUP_CENTERS[city as keyof typeof PICKUP_CENTERS];
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setFormData({ ...formData, city, pickupCenterId: nextCenters[0].id })}
                            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${formData.city === city ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "border border-green-200 bg-white text-green-800 hover:border-green-500 dark:border-green-800 dark:bg-gray-900 dark:text-green-200"}`}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-green-700 dark:text-green-300">Centre BelivaY</label>
                    <div className="grid gap-3">
                      {pickupCenters.map((center) => (
                        <button
                          key={center.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, pickupCenterId: center.id })}
                          className={`rounded-2xl border p-4 text-left transition-all ${selectedPickupCenter.id === center.id ? "border-green-600 bg-white shadow-lg shadow-green-600/10 dark:bg-gray-900" : "border-green-200 bg-white/70 hover:border-green-500 dark:border-green-800 dark:bg-gray-900/70"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100">
                              <Store size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-green-900 dark:text-green-100">{center.name}</p>
                              <p className="mt-1 text-sm text-green-700 dark:text-green-300">{center.address}</p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-600 dark:text-green-400">{center.hours}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Payment - always shown */}
            {checkoutStage === 3 && <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
                  {isPickup ? "2" : "3"}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.step_payment')}</h2>
              </div>
              <div className="rounded-lg border-2 border-primary bg-orange-50 p-4 dark:bg-primary/10">
                <div className="flex items-start gap-3"><Phone className="mt-0.5 shrink-0 text-primary" /><div><p className="font-bold text-gray-900 dark:text-white">Mobile Money sécurisé par CamPay</p><p className="mt-1 text-sm text-gray-500">MTN Mobile Money ou Orange Money. L’opérateur est détecté avec le numéro.</p></div></div>
                <div className="mt-4"><PhoneInput required label="Numéro à débiter" value={formData.paymentPhone} onChange={(paymentPhone) => setFormData({ ...formData, paymentPhone })} onValidityChange={setPaymentPhoneValid} helperText="Une demande de confirmation sera envoyée sur ce téléphone." /></div>
              </div>
              <div className="mt-4"><label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">Code promotionnel</label><input value={formData.promoCode} onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })} placeholder="Ex. BIENVENUE" className={inputClass} /></div>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={14} />
                {t('checkout.payment_helper')}
              </p>
            </section>}

            {checkoutStage === 4 && <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="text-xl font-bold text-gray-900 dark:text-white">Vérifiez avant de payer</h2><div className="mt-4 divide-y divide-gray-100 text-sm dark:divide-gray-800"><p className="flex justify-between gap-4 py-3"><span className="text-gray-500">Réception</span><strong className="text-right">{isPickup ? selectedPickupCenter.name : `${addressPrecision?.driverHint || formData.address}, ${formData.city}`}</strong></p>{!isPickup && addressPrecision && <p className="flex justify-between py-3"><span className="text-gray-500">Précision</span><strong>{addressPrecision.precisionScore}/100 · {addressPrecision.precisionLabel}</strong></p>}<p className="flex justify-between py-3"><span className="text-gray-500">Contact</span><strong>{formData.phone || "À compléter"}</strong></p><p className="flex justify-between py-3"><span className="text-gray-500">Paiement</span><strong>Mobile Money</strong></p><p className="flex justify-between py-3"><span className="text-gray-500">Montant</span><strong className="text-primary">{finalTotal.toLocaleString(locale)} FCFA</strong></p></div><p className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-xs font-semibold text-green-800 dark:bg-green-950/20 dark:text-green-300"><ShieldCheck size={16} className="shrink-0" /> Le paiement reste protégé jusqu’à la confirmation de réception selon les règles BelivaY.</p></section>}

            <div className="flex gap-3">
              {checkoutStage > 1 && <button type="button" onClick={() => setCheckoutStage((stage) => stage - 1)} className="min-h-12 flex-1 rounded-lg border border-gray-200 bg-white px-5 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">Précédent</button>}
              {checkoutStage < 4 ? <button type="button" onClick={handleContinue} disabled={addressAnalyzing} className="min-h-12 flex-1 rounded-lg bg-primary px-5 text-sm font-bold text-white disabled:opacity-60">{addressAnalyzing ? "Analyse..." : "Continuer"}</button> : <button type="submit" disabled={loading} className="min-h-12 flex-1 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-60">{loading ? "Confirmation..." : "Payer maintenant"}</button>}
            </div>
          </form>

          {/* Order Summary sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-white">{t('checkout.summary')}</h2>
              <div className="space-y-3">
                {checkoutItems.map((item) => (
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
                  <span className="font-semibold text-gray-900 dark:text-white">{checkoutSubtotal.toLocaleString(locale)} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{isPickup ? "Retrait boutique" : t('cart.shipping')}</span>
                  <span className={`font-semibold ${isPickup ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                    {isPickup ? "0 FCFA" : `${shippingCost.toLocaleString(locale)} FCFA`}
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
