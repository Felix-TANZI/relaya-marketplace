import { Sparkles, Shield, Zap, Package } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-border-subtle mb-8 animate-float">
              <Shield className="text-accent-cyan" size={16} />
              <span className="text-sm text-text-secondary">
                Vendeurs vérifiés · Paiement sécurisé · Support réactif
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-bold text-5xl lg:text-7xl mb-6 tracking-tight">
              <span className="gradient-holographic-text">Relaya</span>
              <br />
              <span className="text-text-primary">
                Marketplace Premium
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
              Une expérience d'achat fluide, une sélection large, et une logistique pensée pour Yaoundé & Douala.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="px-8 py-4 rounded-xl gradient-holographic text-text-inverse animate-gradient shadow-md hover:shadow-xl transition-all font-medium text-lg">
                <Sparkles size={20} className="inline mr-2" />
                Explorer maintenant
              </button>
              <button className="px-8 py-4 rounded-xl glass border-border-default hover:border-accent-cyan hover:shadow-glow-cyan transition-all font-medium text-lg">
                Devenir vendeur
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 bg-primary-secondary">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass p-8 rounded-2xl border-border-subtle hover:border-accent-cyan hover:shadow-glow-cyan transition-all group">
              <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="text-accent-cyan" size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Livraison Rapide</h3>
              <p className="text-text-secondary text-sm">
                Suivi en temps réel de votre commande jusqu'à la livraison.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass p-8 rounded-2xl border-border-subtle hover:border-accent-purple hover:shadow-glow-purple transition-all group">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="text-accent-purple" size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Paiement Sécurisé</h3>
              <p className="text-text-secondary text-sm">
                MoMo & Orange Money. Vos transactions sont protégées.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass p-8 rounded-2xl border-border-subtle hover:border-accent-pink hover:shadow-glow-pink transition-all group">
              <div className="w-12 h-12 rounded-xl bg-accent-pink/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="text-accent-pink" size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Vendeurs Vérifiés</h3>
              <p className="text-text-secondary text-sm">
                Tous nos vendeurs sont contrôlés pour votre sécurité.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass p-8 rounded-2xl border-border-subtle hover:border-accent-cyan hover:shadow-glow-cyan transition-all group">
              <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="text-accent-cyan" size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Sélection Premium</h3>
              <p className="text-text-secondary text-sm">
                Des produits choisis pour leur qualité et leur authenticité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20">
        <div className="container">
          <div className="glass p-12 rounded-3xl border-border-default text-center max-w-3xl mx-auto">
            <h2 className="font-display font-bold text-4xl mb-4">
              Prêt à commencer ?
            </h2>
            <p className="text-text-secondary text-lg mb-8">
              Rejoignez des milliers d'utilisateurs qui font confiance à Relaya pour leurs achats en ligne.
            </p>
            <button className="px-10 py-5 rounded-xl gradient-holographic text-text-inverse animate-gradient shadow-md hover:shadow-xl transition-all font-medium text-lg">
              Créer un compte gratuitement
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}