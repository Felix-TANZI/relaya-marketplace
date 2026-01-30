// frontend/src/features/cart/CartPage.tsx
// Page du panier d'achat
// Affiche les articles dans le panier, le résumé des coûts et les options de paiement

import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();

  const shippingCost = 2000; // Frais de livraison fixes
  const finalTotal = total + shippingCost;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <ShoppingCart className="text-dark-text-tertiary" size={48} />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-text mb-4">
            {t('cart.empty')}
          </h1>
          <p className="text-dark-text-secondary mb-8">
            {t('cart.empty_desc')}
          </p>
          <Link to="/catalog">
            <Button variant="gradient" size="lg">
              <Package size={20} />
              {t('cart.explore')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-2">
            <span className="text-gradient animate-gradient-bg">{t('cart.title')}</span>
          </h1>
          <p className="text-dark-text-secondary">
            {itemCount} {itemCount > 1 ? t('cart.items') : t('cart.item')} {t('cart.in_cart')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id} padding="none">
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-dark-bg-tertiary">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-dark-text-tertiary" size={32} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-text mb-1 truncate">
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.color && <Badge variant="default">{item.color}</Badge>}
                      {item.storage && <Badge variant="default">{item.storage}</Badge>}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center glass border border-white/10 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-white/5 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-4 py-2 font-medium text-dark-text min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-white/5 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-dark-text-secondary hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-display font-bold text-xl text-gradient animate-gradient-bg">
                      {(item.price * item.quantity).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                    </p>
                    <p className="text-sm text-dark-text-tertiary mt-1">
                      {item.price.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')} × {item.quantity}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
                {t('cart.summary')}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t('cart.subtotal')} ({itemCount} {itemCount > 1 ? t('cart.items') : t('cart.item')})</span>
                  <span className="font-semibold text-dark-text">
                    {total.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                  </span>
                </div>

                <div className="flex justify-between text-dark-text-secondary">
                  <span>{t('cart.shipping')}</span>
                  <span className="font-semibold text-dark-text">
                    {shippingCost.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                  </span>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="font-display font-bold text-lg text-dark-text">
                      {t('cart.total')}
                    </span>
                    <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                      {finalTotal.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                    </span>
                  </div>
                </div>
              </div>

              <Link to="/checkout">
                <Button variant="gradient" size="lg" className="w-full mb-4">
                  {t('cart.checkout')}
                  <ArrowRight size={20} />
                </Button>
              </Link>

              <Link to="/catalog">
                <Button variant="secondary" size="md" className="w-full">
                  {t('cart.continue_shopping')}
                </Button>
              </Link>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3 text-sm text-dark-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-holo-cyan/10 flex items-center justify-center flex-shrink-0">
                    <Package className="text-holo-cyan" size={16} />
                  </div>
                  <span>{t('cart.fast_delivery')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-dark-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-holo-purple/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="text-holo-purple" size={16} />
                  </div>
                  <span>{t('cart.secure_payment')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}