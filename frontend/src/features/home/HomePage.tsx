import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { productsApi } from '@/services/api/products';

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  images?: { id: number; image_url: string; is_primary: boolean }[];
  discount?: number;
}

interface ProductsResponse {
  results: Product[];
  count: number;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsApi.list({ page_size: 8 }) as ProductsResponse;
        setPromoProducts(response.results || []);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    { 
      name: 'Téléphones & Tablettes', 
      image: '/images/category-phones.png',
      link: '/catalog?category=phones' 
    },
    { 
      name: 'Électronique', 
      image: '/images/category-electronics.png',
      link: '/catalog?category=electronics' 
    },
    { 
      name: 'Mode et Beauté', 
      image: '/images/category-fashion.png',
      link: '/catalog?category=fashion' 
    },
    { 
      name: 'Maison & Supermarché', 
      image: '/images/category-home.png',
      link: '/catalog?category=home' 
    },
  ];

  const tabs = ['Tout', 'Téléphones', 'Mode & Beauté', 'Maison', 'Électronique', 'Supermarché'];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-bg-light-alt to-bg-light dark:from-bg-dark dark:to-bg-dark-alt py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display font-bold mb-4">
                  <span className="text-text-light dark:text-text-dark">Bienvenue sur </span>
                  <span className="text-primary">Belivay</span>
                  <span className="text-text-light dark:text-text-dark">!</span>
                </h1>
                <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  Grande sélection de produits
                </p>
                <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary">
                  Commandes sécurisées
                </p>
              </div>

              <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
                <CheckCircle className="text-primary flex-shrink-0" size={24} />
                <span>Plateforme de <strong className="text-text-light dark:text-text-dark">paiement</strong> fiable et sécurisée</span>
              </div>

              <Link to="/catalog">
                <button className="px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  Voir les Offres
                </button>
              </Link>
            </div>

            <div className="relative">
              <img 
                src="/images/hero-woman.png" 
                alt="Shopping on Belivay" 
                className="w-full h-auto max-w-lg mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white dark:bg-bg-dark-alt">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-8 text-center space-y-4">
              <div className="flex justify-center">
                <img 
                  src="/images/feature-shopping.png" 
                  alt="Grande Sélection" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-text-light dark:text-text-dark">
                Grande Sélection
              </h3>
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                Choix de produits locaux<br />et internationaux
              </p>
              <button className="px-6 py-2 bg-white dark:bg-bg-dark text-text-light dark:text-text-dark rounded-lg shadow hover:shadow-md transition-all text-sm font-medium">
                Explorer
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-3xl p-8 text-center space-y-4">
              <div className="flex justify-center">
                <img 
                  src="/images/feature-mobile.png" 
                  alt="Commandes Sécurisées" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-text-light dark:text-text-dark">
                Commandes Sécurisées
              </h3>
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                Plateforme de paiement fiable et sécurisée
              </p>
              <button className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:shadow-md transition-all text-sm font-medium">
                Acheter en confience
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-3xl p-8 text-center space-y-4">
              <div className="flex justify-center">
                <img 
                  src="/images/feature-delivery.png" 
                  alt="Livraison Rapide" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-text-light dark:text-text-dark">
                Livraison <span className="text-primary">Rapide</span>
              </h3>
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                Recevez vos achats rapidement chez vous
              </p>
              <button className="px-6 py-2 bg-white dark:bg-bg-dark text-text-light dark:text-text-dark rounded-lg shadow hover:shadow-md transition-all text-sm font-medium">
                En savoir plus
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-bg-light dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.name}
                to={category.link}
                className="group"
              >
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-6 text-center space-y-4 hover:shadow-lg transition-all">
                  <div className="flex justify-center">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-24 h-24 object-contain group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="py-16 bg-white dark:bg-bg-dark-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              <span className="text-text-light dark:text-text-dark">Découvrez nos meilleures </span>
              <span className="text-primary">offres !</span>
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-2xl mx-auto">
              Profitez de promotions exceptionnelles sur une large gamme de produits populaires.
            </p>
          </div>

          <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className="px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-all hover:bg-primary/10 hover:text-primary text-text-light-secondary dark:text-text-dark-secondary first:bg-primary first:text-white"
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {promoProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} showPromo />
              ))}
            </div>
          )}

          <div className="text-center">
            <Link to="/catalog">
              <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                Voir plus d'offres
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="/images/delivery-man.png" 
                alt="Livraison rapide" 
                className="w-full h-auto max-w-md mx-auto"
              />
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-display font-bold">
                <span className="text-text-light dark:text-text-dark">Livraison rapide et </span>
                <span className="text-primary">fiable</span>
              </h2>
              <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary">
                Recevez vos achats à votre porte avec notre service express!
              </p>
              <Link to="/shipping">
                <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  Voir plus d'offres
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Belivay Section */}
      <section className="py-16 bg-bg-light dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              <span className="text-text-light dark:text-text-dark">Pourquoi choisir </span>
              <span className="text-primary">Belivay ?</span>
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Les avantages du shopping en toute confiance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-bg-dark-alt rounded-3xl p-8 text-center space-y-4 shadow-soft hover:shadow-soft-lg transition-all">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <img 
                    src="/images/icon-security.png" 
                    alt="Paiements Sécurisés" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-text-light dark:text-text-dark">
                Paiements Sécurisés
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Payez en toute tranquillité avec notre système de <strong>paiement sécurisé.</strong>
              </p>
            </div>

            <div className="bg-white dark:bg-bg-dark-alt rounded-3xl p-8 text-center space-y-4 shadow-soft hover:shadow-soft-lg transition-all">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <img 
                    src="/images/icon-verified.png" 
                    alt="Vendeurs Vérifiés" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-text-light dark:text-text-dark">
                Vendeurs <span className="text-primary">Vérifiés</span>
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Achetez auprès de vendeurs de confiance pour une expérience sans souci.
              </p>
            </div>

            <div className="bg-white dark:bg-bg-dark-alt rounded-3xl p-8 text-center space-y-4 shadow-soft hover:shadow-soft-lg transition-all">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <img 
                    src="/images/icon-truck.png" 
                    alt="Livraison Fiable" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-text-light dark:text-text-dark">
                Livraison <span className="text-primary">Fiable</span>
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Bénéficiez d'une <strong>livraison rapide</strong> et suivie à votre porte.
              </p>
            </div>

            <div className="bg-white dark:bg-bg-dark-alt rounded-3xl p-8 text-center space-y-4 shadow-soft hover:shadow-soft-lg transition-all">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <img 
                    src="/images/icon-support.png" 
                    alt="Support Local Dédié" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-text-light dark:text-text-dark">
                Support Local <span className="text-primary">Dédié</span>
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Notre équipe locale est là pour vous aider à tout moment.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/register">
              <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                Rejoindre Belivay
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}