import { Sparkles, Shield, Zap, Package } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-holo-cyan/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-holo-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-float">
            <Shield className="text-holo-cyan" size={16} />
            <span className="text-sm text-dark-text-secondary">
              Vendeurs vérifiés · Paiement sécurisé · Support réactif
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-bold text-5xl lg:text-7xl mb-6 tracking-tight">
            <span className="text-gradient animate-gradient-bg">Relaya</span>
            <br />
            <span className="text-dark-text">Marketplace Premium</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-dark-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
            Une expérience d'achat fluide, une sélection large, et une logistique pensée pour Yaoundé & Douala.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-xl bg-gradient-holographic animate-gradient-bg text-white shadow-lg hover:shadow-2xl transition-all font-medium text-lg inline-flex items-center gap-2 hover-glow-cyan">
              <Sparkles size={20} />
              Explorer maintenant
            </button>
            <button className="px-8 py-4 rounded-xl glass hover:border-holo-cyan transition-all font-medium text-lg text-dark-text hover-glow-cyan">
              Devenir vendeur
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-32 bg-dark-bg-secondary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="text-holo-cyan" size={24} />}
              title="Livraison Rapide"
              description="Suivi en temps réel de votre commande jusqu'à la livraison."
              glowClass="hover-glow-cyan"
            />
            <FeatureCard
              icon={<Shield className="text-holo-purple" size={24} />}
              title="Paiement Sécurisé"
              description="MoMo & Orange Money. Vos transactions sont protégées."
              glowClass="hover-glow-purple"
            />
            <FeatureCard
              icon={<Package className="text-holo-pink" size={24} />}
              title="Vendeurs Vérifiés"
              description="Tous nos vendeurs sont contrôlés pour votre sécurité."
              glowClass="hover-glow-pink"
            />
            <FeatureCard
              icon={<Sparkles className="text-holo-cyan" size={24} />}
              title="Sélection Premium"
              description="Des produits choisis pour leur qualité et leur authenticité."
              glowClass="hover-glow-cyan"
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="glass p-12 rounded-3xl text-center max-w-3xl mx-auto">
            <h2 className="font-display font-bold text-4xl mb-4 text-dark-text">
              Prêt à commencer ?
            </h2>
            <p className="text-lg text-dark-text-secondary mb-8">
              Rejoignez des milliers d'utilisateurs qui font confiance à Relaya pour leurs achats en ligne.
            </p>
            <button className="px-10 py-5 rounded-xl bg-gradient-holographic animate-gradient-bg text-white shadow-lg hover:shadow-2xl transition-all font-medium text-lg">
              Créer un compte gratuitement
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Types pour FeatureCard
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  glowClass: string;
}

function FeatureCard({ icon, title, description, glowClass }: FeatureCardProps) {
  return (
    <div className={`glass p-8 rounded-2xl transition-all group ${glowClass}`}>
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg mb-2 text-dark-text">
        {title}
      </h3>
      <p className="text-sm text-dark-text-secondary">
        {description}
      </p>
    </div>
  );
}