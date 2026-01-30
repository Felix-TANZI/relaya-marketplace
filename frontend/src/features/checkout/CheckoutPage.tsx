import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "payment" | "success">("info");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "Yaoundé",
    paymentMethod: "momo",
  });

  const shippingCost = 2000;
  const finalTotal = total + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simuler l'appel API
    setTimeout(() => {
      setLoading(false);
      setStep("success");
      clearCart();
    }, 2000);
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
            Commande confirmée !
          </h1>
          <p className="text-dark-text-secondary mb-2">
            Votre commande a été passée avec succès.
          </p>
          <p className="text-dark-text-secondary mb-8">
            Vous recevrez une confirmation par SMS au <strong>{formData.phone}</strong>
          </p>
          
          <Card className="mb-6 text-left">
            <h3 className="font-semibold text-dark-text mb-4">Détails de livraison</h3>
            <div className="space-y-2 text-sm">
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">Nom:</span> {formData.firstName} {formData.lastName}
              </p>
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">Téléphone:</span> {formData.phone}
              </p>
              <p className="text-dark-text-secondary">
                <span className="text-dark-text font-medium">Adresse:</span> {formData.address}, {formData.city}
              </p>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
<Link to="/">
  <Button variant="gradient" size="lg">
    Retour à l'accueil
  </Button>
</Link>

<Link to="/catalog">
  <Button variant="secondary" size="md">
    Continuer mes achats
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
          Retour au panier
        </Link>

        <h1 className="font-display font-bold text-4xl lg:text-5xl mb-8">
          <span className="text-gradient animate-gradient-bg">Finaliser la commande</span>
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
                    Informations personnelles
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Nom"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    helperText="Pour la confirmation de commande"
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
                    Adresse de livraison
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Ville
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
                    label="Adresse complète"
                    placeholder="Quartier, rue, repère..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    helperText="Soyez précis pour faciliter la livraison"
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
                    Mode de paiement
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    { id: "momo", name: "MTN Mobile Money", icon: "📱" },
                    { id: "orange", name: "Orange Money", icon: "🟠" },
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
                  Vous recevrez une notification sur votre téléphone pour confirmer le paiement
                </p>
              </Card>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                Confirmer la commande
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h2 className="font-display font-bold text-xl text-dark-text mb-6">
                Récapitulatif
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
                      <p className="text-xs text-dark-text-tertiary">Qté: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-dark-text">
                      {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-y border-white/10">
                <div className="flex justify-between text-sm text-dark-text-secondary">
                  <span>Sous-total</span>
                  <span className="font-semibold text-dark-text">{total.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm text-dark-text-secondary">
                  <span>Livraison</span>
                  <span className="font-semibold text-dark-text">{shippingCost.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <span className="font-display font-bold text-lg text-dark-text">Total</span>
                <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                  {finalTotal.toLocaleString()} FCFA
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}