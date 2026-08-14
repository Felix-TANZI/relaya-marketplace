import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Lock, Package, ShieldCheck, Store, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ordersApi } from '@/services/api/orders';
import { useToast } from '@/context/ToastContext';
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PfShellStyles } from "@/styles/pfShell";
import PaymentSheet from "@/features/payments/PaymentSheet";
import { OperatorLogo } from "@/features/payments/OperatorLogo";
import { getDefaultPaymentMethod } from "@/features/payments/SavedPaymentMethods";
import type { PaymentTransaction } from "@/services/api/payments";

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

const PICKUP_CENTERS = {
  "Yaoundé": [
    { id: "yaounde-mokolo", name: "Centre BelivaY Mokolo", address: "Mokolo, face marché central", hours: "Lun-Sam · 8h30-18h30" },
    { id: "yaounde-bastos", name: "Centre BelivaY Bastos", address: "Bastos, rond-point Nlongkak", hours: "Lun-Sam · 9h00-18h00" },
  ],
  "Douala": [
    { id: "douala-akwa", name: "Centre BelivaY Akwa", address: "Akwa, boulevard de la Liberté", hours: "Lun-Sam · 8h30-18h30" },
    { id: "douala-bonapriso", name: "Centre BelivaY Bonapriso", address: "Bonapriso, av. Charles de Gaulle", hours: "Lun-Sam · 9h00-18h00" },
  ],
} as const;

function readCheckoutSelection(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SELECTED_CART_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
  } catch { return []; }
}

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { items, clearCart, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const isPickup = new URLSearchParams(window.location.search).get("mode") === "pickup";

  const [formData, setFormData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    phone: user?.phone || getDefaultPaymentMethod()?.phone || "",
    address: "",
    city: "Yaoundé" as "Yaoundé" | "Douala",
    pickupCenterId: "yaounde-mokolo",
  });

  // `items.length` n'est pas lu par la fabrique : c'est volontairement une cle
  // de recalcul, pour relire la selection stockee quand le panier change — il
  // peut s'hydrater apres le montage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedIds = useMemo(() => readCheckoutSelection(), [items.length]);
  const checkoutItems = selectedIds.length > 0 ? items.filter((i) => selectedIds.includes(i.id)) : items;
  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = isPickup ? 0 : 2000;
  const finalTotal = subtotal + shipping;
  const centers = PICKUP_CENTERS[formData.city];
  const center = centers.find((c) => c.id === formData.pickupCenterId) ?? centers[0];
  const fmt = (n: number) => `${n.toLocaleString(locale)} FCFA`;

  const infoDone = Boolean(formData.firstName.trim() && formData.phone.trim());
  const placeDone = isPickup ? Boolean(center) : Boolean(formData.address.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localStorage.getItem('access_token')) {
      showToast('Connectez-vous pour finaliser votre commande', 'error');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        delivery_mode: isPickup ? 'PICKUP' : 'DELIVERY',
        city: formData.city === 'Douala' ? 'DOUALA' : 'YAOUNDE',
        address: isPickup ? `${center.name} - ${center.address}` : formData.address,
        customer_phone: formData.phone,
        customer_email: '',
        note: isPickup ? `CLICK_AND_COLLECT - ${center.name} - ${center.address} - ${center.hours}` : '',
        cart_items: checkoutItems.map((item) => ({
          product_id: item.id, qty: item.quantity, title: item.name,
          price_xaf: item.price, image_url: item.image, is_demo: item.isDemo,
        })),
      });
      setPayingOrderId(order.id);
    } catch (error) {
      showToast(error instanceof Error ? `Commande refusée : ${error.message}` : "Commande refusée par le serveur.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = useCallback((tx: PaymentTransaction) => {
    if (checkoutItems.length === items.length) clearCart();
    else checkoutItems.forEach((item) => removeItem(item.id));
    window.sessionStorage.removeItem(CHECKOUT_SELECTED_CART_IDS_KEY);
    window.dispatchEvent(new Event("belivay-new-notification"));
    showToast("Paiement confirmé", {
      description: `Commande #${tx.order} · ${tx.amount_xaf.toLocaleString(locale)} FCFA sous séquestre.`,
      type: "success",
    });
    navigate(`/orders/${tx.order}`);
  }, [checkoutItems, items.length, clearCart, removeItem, showToast, navigate, locale]);

  useEffect(() => {
    if (checkoutItems.length === 0 && payingOrderId === null) navigate("/cart");
  }, [checkoutItems.length, payingOrderId, navigate]);

  if (checkoutItems.length === 0 && payingOrderId === null) {
    return (
      <>
        <PfShellStyles />
        <div className="pf-root pf-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="pf-flow-ic spin" style={{ width: 44, height: 44 }} />
        </div>
      </>
    );
  }

  const steps = [
    { n: 1, label: isPickup ? "Retrait" : "Informations", done: infoDone },
    { n: 2, label: isPickup ? "Centre" : "Livraison", done: placeDone },
    { n: 3, label: "Paiement", done: false },
  ];

  const stepBadge = (n: number, done: boolean) => (
    <span className={`pf-d ${done ? "done" : "cur"}`} style={{ width: 32, height: 32, fontSize: 13.5, fontWeight: 800, flexShrink: 0 }}>
      {done ? <Check size={14} strokeWidth={3.2} color="#fff" /> : n}
    </span>
  );

  return (
    <>
      <PfShellStyles />
      <div className="pf-root pf-page" data-tour="checkout">
        <div className="pf-wrap">

          <Link to="/cart">
            <button className="pf-link" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <ArrowLeft size={16} />{t('checkout.back_to_cart')}
            </button>
          </Link>

          {/* En-tête + stepper */}
          <div className="pf-ident pf-anim">
            <span className="pf-notif-ic">{isPickup ? <Store size={20} /> : <Truck size={20} />}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="pf-k">Paiement sécurisé</div>
              <div className="pf-name" style={{ fontSize: 21, marginTop: 2 }}>
                {isPickup ? "Payer et retirer au centre" : t('checkout.title')}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {steps.map((s, i) => (
                <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {stepBadge(s.n, s.done)}
                    <span className="pf-support-t" style={{ fontSize: 12.5, color: s.done ? "var(--pf-text)" : "var(--pf-text2)" }}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && <span style={{ width: 26, height: 2, borderRadius: 2, background: s.done ? "var(--pf-aring)" : "var(--pf-border)" }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="pf-flex" style={{ marginTop: 20 }}>
            <form onSubmit={handleSubmit} className="pf-main">

              {/* 1 — Informations */}
              <section className="pf-card pf-anim">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  {stepBadge(1, infoDone)}
                  <div className="pf-card-title" style={{ fontSize: 16 }}>
                    {isPickup ? "Qui vient retirer ?" : t('checkout.step_info')}
                  </div>
                </div>
                <div className="pf-form-grid">
                  <div className="pf-field">
                    <label className="pf-label">{t('checkout.first_name')}</label>
                    <input className="pf-input" type="text" required value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder={t('checkout.first_name_placeholder')} />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">{t('checkout.last_name')}</label>
                    <input className="pf-input" type="text" required value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder={t('checkout.last_name_placeholder')} />
                  </div>
                  <div className="pf-field pf-col2">
                    <PhoneInput required
                      label={isPickup ? "Numéro pour le retrait" : t('checkout.phone')}
                      value={formData.phone}
                      onChange={(phone) => setFormData({ ...formData, phone })}
                      helperText={isPickup ? "Le code de retrait arrive par SMS sur ce numéro." : t('checkout.phone_helper')} />
                  </div>
                </div>
              </section>

              {/* 2 — Livraison / Centre */}
              <section className="pf-card pf-anim">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  {stepBadge(2, placeDone)}
                  <div className="pf-card-title" style={{ fontSize: 16 }}>
                    {isPickup ? "Choisir le centre de retrait" : t('checkout.step_address')}
                  </div>
                </div>

                <div className="pf-field" style={{ marginBottom: 16 }}>
                  <label className="pf-label">{t('checkout.city')}</label>
                  <div className="pf-type-toggle">
                    {(["Yaoundé", "Douala"] as const).map((city) => (
                      <button key={city} type="button"
                        className={`pf-type-btn${formData.city === city ? " on" : ""}`}
                        onClick={() => setFormData({ ...formData, city, pickupCenterId: PICKUP_CENTERS[city][0].id })}>
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {isPickup ? (
                  <div className="pf-addr-grid">
                    {centers.map((c) => (
                      <button key={c.id} type="button"
                        className={`pf-addr${center.id === c.id ? " def" : ""}`}
                        style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                        onClick={() => setFormData({ ...formData, pickupCenterId: c.id })}>
                        <div className="pf-addr-label">
                          <span className="pf-addr-ic"><Store size={14} /></span>
                          {c.name}
                          {center.id === c.id && <span className="pf-badge-soft">Choisi</span>}
                        </div>
                        <div className="pf-addr-line">{c.address}</div>
                        <div className="pf-k" style={{ marginTop: 8 }}>{c.hours}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pf-field">
                    <label className="pf-label">{t('checkout.address')}</label>
                    <input className="pf-input" type="text" required value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={t('checkout.address_placeholder')} />
                    <div className="pf-muted-sm" style={{ marginTop: 6 }}>{t('checkout.address_helper')}</div>
                  </div>
                )}
              </section>

              {/* 3 — Paiement */}
              <section className="pf-card pf-anim" style={{ borderColor: "var(--pf-aring)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                  {stepBadge(3, false)}
                  <div className="pf-card-title" style={{ fontSize: 16 }}>{t('checkout.step_payment')}</div>
                  <span className="pf-muted-sm" style={{ marginLeft: "auto" }}>Débit unique · aucun frais caché</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                  {([
                    { p: "MTN_MOMO" as const, n: "MTN Mobile Money", d: "Validation par code secret" },
                    { p: "ORANGE_MONEY" as const, n: "Orange Money", d: "Validation par code secret" },
                    { p: "CARD" as const, n: "Carte bancaire", d: "Visa · Mastercard" },
                  ]).map((m) => (
                    <div key={m.p} style={{ display: "flex", alignItems: "center", gap: 11, padding: 13, borderRadius: 16, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
                      <OperatorLogo provider={m.p} size={38} />
                      <div style={{ minWidth: 0 }}>
                        <div className="pf-support-t" style={{ fontSize: 12.5 }}>{m.n}</div>
                        <div className="pf-muted-sm">{m.d}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pf-info-note">
                  <span className="pf-info-ic"><ShieldCheck size={15} /></span>
                  <div className="pf-muted-sm" style={{ lineHeight: 1.6 }}>
                    Vous choisirez votre opérateur juste après. Une demande de paiement arrivera sur votre téléphone :
                    validez-la avec votre code secret, rien à recopier ici.
                  </div>
                </div>
              </section>

              <button type="submit" className="pf-btn-accent pf-btn-block" disabled={loading}>
                <Lock size={16} />{loading ? "Création de la commande…" : `Payer ${fmt(finalTotal)}`}
              </button>
            </form>

            {/* Résumé */}
            <aside className="pf-side" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Bloc montant — signature visuelle de la maquette */}
              <div className="pf-hero pf-anim">
                <i />
                <div className="pf-hero-k">Total à payer</div>
                <div className="pf-hero-v">{finalTotal.toLocaleString(locale)}<span>FCFA</span></div>
                <div style={{ position: "relative", marginTop: 14, display: "flex", gap: 18, fontSize: 12, opacity: .88 }}>
                  <span>Articles <b>{subtotal.toLocaleString(locale)}</b></span>
                  <span style={{ opacity: .4 }}>|</span>
                  <span>{isPickup ? "Retrait " : "Livraison "}<b>{shipping === 0 ? "Gratuit" : shipping.toLocaleString(locale)}</b></span>
                </div>
              </div>

              <section className="pf-glass-panel pf-anim">
                <div className="pf-card-title pf-mb">{t('checkout.summary')}</div>

                {checkoutItems.map((item) => (
                  <div key={item.id} className="pf-order-line">
                    <span className="pf-thumb" style={{ width: 46, height: 46, borderRadius: 13 }}>
                      {item.image ? <img src={item.image} alt={item.name} /> : <Package size={18} strokeWidth={1.6} />}
                    </span>
                    <div className="pf-order-mid">
                      <div className="pf-order-id" style={{ fontSize: 12.5, fontWeight: 600 }}>{item.name}</div>
                      <div className="pf-muted-sm">Qté {item.quantity}</div>
                    </div>
                    <div className="pf-order-total" style={{ color: "var(--pf-text)" }}>{fmt(item.price * item.quantity)}</div>
                  </div>
                ))}

                <div style={{ marginTop: 14, borderTop: "1px solid var(--pf-border)", paddingTop: 12 }}>
                  <div className="pf-summary-row"><span className="pf-muted-sm">{t('cart.subtotal')}</span><span className="pf-summary-v">{fmt(subtotal)}</span></div>
                  <div className="pf-summary-row">
                    <span className="pf-muted-sm">{isPickup ? "Retrait boutique" : t('cart.shipping')}</span>
                    <span className="pf-summary-v" style={isPickup ? { color: "#128a45" } : undefined}>{isPickup ? "Gratuit" : fmt(shipping)}</span>
                  </div>
                  <div className="pf-total-row" style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--pf-border)" }}>
                    <span className="pf-muted-sm">{t('cart.total')}</span><b>{fmt(finalTotal)}</b>
                  </div>
                </div>

                <div className="pf-info-note">
                  <span className="pf-info-ic"><ShieldCheck size={15} /></span>
                  <div className="pf-muted-sm">Le vendeur n'est payé qu'après votre confirmation de réception.</div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {payingOrderId !== null && (
        <PaymentSheet
          orderId={payingOrderId}
          amountXaf={finalTotal}
          defaultPhone={formData.phone}
          onClose={() => { const id = payingOrderId; setPayingOrderId(null); navigate(`/orders/${id}`); }}
          onSuccess={handlePaid}
        />
      )}
    </>
  );
}