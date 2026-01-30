import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, TrendingUp, Shield, Truck, Star } from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-holo-cyan/10 via-holo-purple/10 to-holo-pink/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,245,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(182,76,255,0.1),transparent_50%)]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-8">
              <TrendingUp className="text-holo-cyan" size={20} />
              <span className="text-sm font-medium">{t('hero.title')}</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="bg-gradient-holographic bg-clip-text text-transparent animate-gradient-bg">
                Relaya
              </span>
              <br />
              <span className="text-dark-text">{t('hero.subtitle')}</span>
            </h1>

            <p className="text-xl text-dark-text-secondary mb-12 leading-relaxed max-w-2xl mx-auto">
              {t('hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/catalog">
                <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-holographic animate-gradient-bg text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                  <ShoppingBag size={20} />
                  {t('hero.cta_explore')}
                  <ArrowRight size={20} />
                </button>
              </Link>

              <Link to="/sell">
                <button className="w-full sm:w-auto px-8 py-4 rounded-xl glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all font-semibold">
                  {t('hero.cta_sell')}
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-holo-cyan mb-2">10K+</div>
                <div className="text-sm text-dark-text-secondary">{t('home.featured_title')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-holo-purple mb-2">5K+</div>
                <div className="text-sm text-dark-text-secondary">{t('footer.sellers')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-holo-pink mb-2">50K+</div>
                <div className="text-sm text-dark-text-secondary">{t('home.clients')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              {t('home.categories_title')}
            </h2>
            <p className="text-dark-text-secondary">
              {t('home.categories_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/catalog?category=${category.name}`}
                className="group"
              >
                <div className="glass rounded-2xl p-6 border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-holographic opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="text-lg font-semibold mb-1">{category.name}</div>
                  <div className="text-sm text-dark-text-tertiary">{category.count}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Relaya Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              {t('home.why_title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="glass rounded-2xl p-8 border border-white/10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-holo-cyan/20 to-holo-cyan/5 flex items-center justify-center">
                <Shield className="text-holo-cyan" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('home.why_secure_title')}</h3>
              <p className="text-dark-text-secondary">
                {t('home.why_secure_desc')}
              </p>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-holo-purple/20 to-holo-purple/5 flex items-center justify-center">
                <Truck className="text-holo-purple" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('home.why_fast_title')}</h3>
              <p className="text-dark-text-secondary">
                {t('home.why_fast_desc')}
              </p>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-holo-pink/20 to-holo-pink/5 flex items-center justify-center">
                <Star className="text-holo-pink" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('home.why_trust_title')}</h3>
              <p className="text-dark-text-secondary">
                {t('home.why_trust_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="glass rounded-3xl p-12 border border-white/10 text-center max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-holographic opacity-5" />
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
                {t('home.cta_title')}
              </h2>
              <p className="text-dark-text-secondary mb-8">
                {t('home.cta_description')}
              </p>
              <Link to="/register">
                <button className="px-8 py-4 rounded-xl bg-gradient-holographic animate-gradient-bg text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                  {t('home.cta_button')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Mock data for categories
const categories = [
  { name: 'Électronique', count: '2.5K+' },
  { name: 'Mode', count: '1.8K+' },
  { name: 'Maison', count: '1.2K+' },
  { name: 'Sports', count: '800+' },
  { name: 'Livres', count: '500+' },
  { name: 'Jouets', count: '600+' },
];