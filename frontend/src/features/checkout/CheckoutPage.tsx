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
import { locationApi, type LocationPrecisionResult } from '@/services/api/location';
import { customerApi, type NearbyRelayPoint } from '@/services/api/customer';

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

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
  const [addressPrecision, setAddressPrecision] = useState<LocationPrecisionResult | null>(null);
  const [addressAnalyzing, setAddressAnalyzing] = useState(false);
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const isPickup = new URLSearchParams(window.location.search).get("mode") === "pickup";

  const [formData, setFormData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    phone: user?.phone || getDefaultPaymentMethod()?.phone || "",
    district: "",
    address: "",
    city: "Yaoundé" as "Yaoundé" | "Douala",
    deliveryLatitude: null as number | null,
    deliveryLongitude: null as number | null,
  });
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [allowThirdPartyPickup, setAllowThirdPartyPickup] = useState(false);
  const [thirdPartyPickup, setThirdPartyPickup] = useState({ name: "", phone: "" });
  const [relayPoints, setRelayPoints] = useState<NearbyRelayPoint[]>([]);
  const [relayLoading, setRelayLoading] = useState(false);
  const [selectedRelayId, setSelectedRelayId] = useState<number | null>(null);
  const [buyerCoords, setBuyerCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus("not_found");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((p) => ({
          ...p,
          deliveryLatitude: pos.coords.latitude,
          deliveryLongitude: pos.coords.longitude,
        }));
        setGpsStatus("found");
      },
      () => setGpsStatus("not_found"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // `items.length` n'est pas lu par la fabrique : c'est volontairement une cle
  // de recalcul, pour relire la selection stockee quand le panier change — il
  // peut s'hydrater apres le montage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedIds = useMemo(() => readCheckoutSelection(), [items.length]);
  const checkoutItems = selectedIds.length > 0 ? items.filter((i) => selectedIds.includes(i.id)) : items;
  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = isPickup ? 0 : 2000;
  const finalTotal = subtotal + shipping;
  const fmt = (n: number) => `${n.toLocaleString(locale)} FCFA`;

  // Point le plus proche AVEC de la place — regle verrouillee : on ne trie
  // jamais par disponibilite, seulement par distance, pour que l'acheteur
  // voie clairement pourquoi un point plus loin a ete retenu (le(s)
  // precedent(s) etaient complets).
  const recommendedRelay = relayPoints.find((r) => r.has_space) ?? null;
  const selectedRelay = relayPoints.find((r) => r.id === selectedRelayId) ?? recommendedRelay;
  const selectedRelayIsNotNearest = Boolean(
    selectedRelay && relayPoints.length > 0 && relayPoints[0].id !== selectedRelay.id,
  );

  const infoDone = Boolean(formData.firstName.trim() && formData.phone.trim());
  const placeDone = isPickup ? Boolean(selectedRelay) : Boolean(formData.address.trim() && formData.district.trim());

  useEffect(() => {
    setAddressPrecision(null);
  }, [formData.address, formData.city]);

  useEffect(() => {
    if (!isPickup || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setBuyerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setBuyerCoords(null),
      { enableHighAccuracy: true, timeout: 6000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPickup]);

  useEffect(() => {
    if (!isPickup) return;
    let cancelled = false;
    setRelayLoading(true);
    const cityCode = formData.city === 'Douala' ? 'DOUALA' : 'YAOUNDE';
    customerApi.getNearbyRelayPoints({ city: cityCode, lat: buyerCoords?.lat, lng: buyerCoords?.lng })
      .then((points) => {
        if (cancelled) return;
        setRelayPoints(points);
        setSelectedRelayId((current) => {
          if (current && points.some((p) => p.id === current)) return current;
          return points.find((p) => p.has_space)?.id ?? null;
        });
      })
      .catch(() => { if (!cancelled) setRelayPoints([]); })
      .finally(() => { if (!cancelled) setRelayLoading(false); });
    return () => { cancelled = true; };
  }, [isPickup, formData.city, buyerCoords]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localStorage.getItem('access_token')) {
      showToast('Connectez-vous pour finaliser votre commande', 'error');
      navigate('/login');
      return;
    }
    if (!isPickup) {
      const ok = await analyzeDeliveryAddress();
      if (!ok) return;
    }
    if (allowThirdPartyPickup && (!thirdPartyPickup.name.trim() || !thirdPartyPickup.phone.trim())) {
      showToast("Indiquez le nom et le téléphone de la personne autorisée à retirer le colis.", "error");
      return;
    }
    if (isPickup && !selectedRelay) {
      showToast("Aucun point relais disponible pour le moment dans cette ville.", "error");
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        delivery_mode: isPickup ? 'PICKUP' : 'DELIVERY',
        city: formData.city === 'Douala' ? 'DOUALA' : 'YAOUNDE',
        district: isPickup ? undefined : formData.district,
        address: isPickup ? `${selectedRelay!.name} - ${selectedRelay!.address}` : formData.address,
        relay_point_id: isPickup ? selectedRelay!.id : undefined,
        customer_phone: formData.phone,
        customer_email: '',
        note: '',
        address_precision: isPickup ? undefined : addressPrecision ?? undefined,
        delivery_latitude: isPickup ? undefined : formData.deliveryLatitude,
        delivery_longitude: isPickup ? undefined : formData.deliveryLongitude,
        authorized_pickup_name: allowThirdPartyPickup ? thirdPartyPickup.name.trim() : '',
        authorized_pickup_phone: allowThirdPartyPickup ? thirdPartyPickup.phone.trim() : '',
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
                  <div className="pf-field pf-col2">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={allowThirdPartyPickup}
                        onChange={(e) => setAllowThirdPartyPickup(e.target.checked)} />
                      <span className="pf-label" style={{ margin: 0 }}>
                        Une autre personne viendra récupérer le colis à ma place
                      </span>
                    </label>
                    {allowThirdPartyPickup && (
                      <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                          <label className="pf-label">Nom de cette personne</label>
                          <input className="pf-input" type="text" required={allowThirdPartyPickup}
                            value={thirdPartyPickup.name}
                            onChange={(e) => setThirdPartyPickup({ ...thirdPartyPickup, name: e.target.value })}
                            placeholder="Nom et prénom" />
                        </div>
                        <div className="pf-field">
                          <PhoneInput required={allowThirdPartyPickup}
                            label="Téléphone de cette personne"
                            value={thirdPartyPickup.phone}
                            onChange={(phone) => setThirdPartyPickup({ ...thirdPartyPickup, phone })} />
                        </div>
                      </div>
                    )}
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
                        onClick={() => { setFormData({ ...formData, city }); setSelectedRelayId(null); }}>
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {isPickup ? (
                  <>
                    {selectedRelayIsNotNearest && (
                      <div className="pf-muted-sm" style={{
                        marginBottom: 12, padding: "10px 14px", borderRadius: 12,
                        background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412",
                      }}>
                        Le(s) point(s) relais le(s) plus proche(s) sont complets — nous vous proposons celui-ci, un peu plus loin mais disponible.
                      </div>
                    )}
                    {relayLoading ? (
                      <div className="pf-muted-sm">Recherche des points relais…</div>
                    ) : relayPoints.length === 0 ? (
                      <div className="pf-muted-sm" style={{ color: "#dc2626" }}>
                        Aucun point relais actif dans cette ville pour le moment.
                      </div>
                    ) : (
                      <div className="pf-addr-grid">
                        {relayPoints.map((r) => (
                          <button key={r.id} type="button" disabled={!r.has_space}
                            className={`pf-addr${selectedRelay?.id === r.id ? " def" : ""}`}
                            style={{ textAlign: "left", cursor: r.has_space ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: r.has_space ? 1 : 0.5 }}
                            onClick={() => r.has_space && setSelectedRelayId(r.id)}>
                            <div className="pf-addr-label">
                              <span className="pf-addr-ic"><Store size={14} /></span>
                              {r.name}
                              {selectedRelay?.id === r.id && <span className="pf-badge-soft">Choisi</span>}
                              {!r.has_space && <span className="pf-badge-soft" style={{ background: "#fee2e2", color: "#991b1b" }}>Complet</span>}
                            </div>
                            <div className="pf-addr-line">{r.address}</div>
                            <div className="pf-k" style={{ marginTop: 8 }}>
                              {r.opening_hours}
                              {r.distance_km != null && ` · ${r.distance_km} km`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="pf-field" style={{ marginBottom: 16 }}>
                      <label className="pf-label">Quartier</label>
                      <input className="pf-input" type="text" required value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="Ex: Bastos" />
                    </div>

                    <button type="button" onClick={handleUseGps} disabled={gpsStatus === "loading"}
                      className="pf-btn-block" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        marginBottom: 16, padding: "10px 14px", borderRadius: 12,
                        background: "var(--pf-s3)", border: "1px solid var(--pf-border)",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>
                      {gpsStatus === "found" ? <Check size={14} /> : <Lock size={14} style={{ opacity: 0 }} />}
                      {gpsStatus === "found" ? "Position enregistrée" : gpsStatus === "loading" ? "Localisation en cours…" : "Utiliser ma position GPS"}
                    </button>
                    {gpsStatus === "not_found" && (
                      <div className="pf-muted-sm" style={{ marginTop: -8, marginBottom: 16, color: "#dc2626" }}>
                        Position indisponible — autorisez la géolocalisation ou décrivez précisément votre adresse ci-dessous.
                      </div>
                    )}

                    <div className="pf-field">
                      <label className="pf-label">{t('checkout.address')}</label>
                      <input className="pf-input" type="text" required value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        onBlur={() => void analyzeDeliveryAddress()}
                        placeholder={t('checkout.address_placeholder')} />
                      <div className="pf-muted-sm" style={{ marginTop: 6 }}>{t('checkout.address_helper')}</div>
                    </div>
                  </>
                )}
                {!isPickup && addressAnalyzing && (
                  <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950/20 dark:text-orange-200" style={{ marginTop: 12 }}>
                    Analyse de la zone en cours...
                  </div>
                )}
                {!isPickup && addressPrecision && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70" style={{ marginTop: 12 }}>
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