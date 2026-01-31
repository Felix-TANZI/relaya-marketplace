// frontend/src/features/checkout/CheckoutPage.tsx
// Page de paiement et confirmation de commande
// Permet à l'utilisateur de saisir ses informations, choisir une méthode de paiement et confirmer la commande

import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { ordersApi } from '@/services/api/orders';
import { useToast } from '@/context/ToastContext';

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "payment" | "success">("info");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "Yaoundé",
    paymentMethod: "momo",
    orderId: 0,
  });

  const shippingCost = 2000;
  const finalTotal = total + shippingCost;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Préparer les données pour l'API
    const cityMap: Record<string, 'YAOUNDE' | 'DOUALA'> = {
  'Yaoundé': 'YAOUNDE',
  'Douala': 'DOUALA',
  'YAOUNDE': 'YAOUNDE',
  'DOUALA': 'DOUALA',
};

const orderData = {
  city: cityMap[formData.city] || 'YAOUNDE',
  address: formData.address,
  phone: formData.phone,
  note: '',
  items: items.map((item) => ({
    product_id: item.id,
    qty: item.quantity,
  })),
};

    // Créer la commande
    const order = await ordersApi.create(orderData);

    // Succès : vider le panier et passer à l'étape succès
    clearCart();
    setStep('success');

    // Stocker l'ID de commande pour l'affichage
    setFormData({ ...formData, orderId: order.id });
  } catch (error) {
    console.error('Erreur création commande:', error);
    showToast(t('checkout.error'), 'error');
  } finally {
    setLoading(false);
  }
};

  if (items.length === 0 && step !== "success") {
    navigate("/cart");
    return null;
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-holographic animate-gradient-bg flex items-center justify-center">
            <CheckCircle className="text-white" size={48} />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-text mb-4">
            {t('checkout.success_title')}
          </h1>
          {/* Afficher le numéro de commande */}
<div className="glass rounded-xl p-4 mb-4 inline-block">
  <p className="text-sm text-dark-text-secondary mb-1">
    {t('checkout.order_number')}
  </p>
  <p className="text-2xl font-bold text-holo-cyan">
    #{formData.orderId}
  </p>
</div>
          <p className="text-dark-text-secondary mb-2">
            {t('checkout.success_message')}
          </p>
          <p className="text-dark-text-secondary mb-8">
            {t('checkout.success_sms')} <strong>{formData.phone}</strong>
          </p>
          
          <Card className="mb-6 text-left">
            <h3 className="font-semibold text-dark-text mb-4">{t('checkout.delivery_details')}</h3>
            <div className="space-y-2 text-sm">
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">{t('checkout.name_label')}</span> {formData.firstName} {formData.lastName}
              </p>
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">{t('checkout.phone_label')}</span> {formData.phone}
              </p>
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">{t('checkout.address_label')}</span> {formData.address}, {formData.city}
              </p>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Link to="/">
              <Button variant="gradient" size="lg">
                {t('checkout.back_home')}
              </Button>
            </Link>

            <Link to="/catalog">
              <Button variant="secondary" size="md">
                {t('cart.continue_shopping')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          {t('checkout.back_to_cart')}
        </Link>

        <h1 className="font-display font-bold text-4xl lg:text-5xl mb-8">
          <span className="text-gradient animate-gradient-bg">{t('checkout.title')}</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-holographic animate-gradient-bg flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h2 className="font-display font-bold text-2xl text-dark-text">
                    {t('checkout.step_info')}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('checkout.first_name')}
                    placeholder={t('checkout.first_name_placeholder')}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label={t('checkout.last_name')}
                    placeholder={t('checkout.last_name_placeholder')}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                  <Input
                    label={t('checkout.phone')}
                    type="tel"
                    placeholder={t('checkout.phone_placeholder')}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    helperText={t('checkout.phone_helper')}
                    required
                  />
                </div>
              </Card>

              {/* Delivery Address */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-holographic animate-gradient-bg flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h2 className="font-display font-bold text-2xl text-dark-text">
                    {t('checkout.step_address')}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      {t('checkout.city')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Yaoundé", "Douala"].map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setFormData({ ...formData, city })}
                          className={`py-3 px-4 rounded-xl font-medium transition-all ${
                            formData.city === city
                              ? "bg-gradient-holographic animate-gradient-bg text-white"
                              : "glass border border-white/10 text-dark-text hover:border-holo-cyan"
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label={t('checkout.address')}
                    placeholder={t('checkout.address_placeholder')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    helperText={t('checkout.address_helper')}
                    required
                  />
                </div>
              </Card>

              {/* Payment Method */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-holographic animate-gradient-bg flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <h2 className="font-display font-bold text-2xl text-dark-text">
                    {t('checkout.step_payment')}
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    { id: "momo", name: t('checkout.payment_momo'), icon: "📱" },
                    { id: "orange", name: t('checkout.payment_orange'), icon: "🟠" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        formData.paymentMethod === method.id
                          ? "glass border-2 border-holo-cyan shadow-glow-cyan"
                          : "glass border border-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="text-3xl">{method.icon}</span>
                      <span className="font-medium text-dark-text">{method.name}</span>
                      {formData.paymentMethod === method.id && (
                        <CheckCircle className="text-holo-cyan ml-auto" size={24} />
                      )}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-dark-text-secondary mt-4 flex items-start gap-2">
                  <CheckCircle className="text-holo-cyan flex-shrink-0 mt-0.5" size={16} />
                  {t('checkout.payment_helper')}
                </p>
              </Card>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                {t('checkout.confirm')}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h2 className="font-display font-bold text-xl text-dark-text mb-6">
                {t('checkout.summary')}
              </h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-dark-bg-tertiary">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CreditCard className="text-dark-text-tertiary" size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-text truncate">{item.name}</p>
                      <p className="text-xs text-dark-text-tertiary">{t('checkout.quantity_short')} {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-dark-text">
                      {(item.price * item.quantity).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-y border-white/10">
                <div className="flex justify-between text-sm text-dark-text-secondary">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-semibold text-dark-text">{total.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}</span>
                </div>
                <div className="flex justify-between text-sm text-dark-text-secondary">
                  <span>{t('cart.shipping')}</span>
                  <span className="font-semibold text-dark-text">{shippingCost.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <span className="font-display font-bold text-lg text-dark-text">{t('cart.total')}</span>
                <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                  {finalTotal.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}