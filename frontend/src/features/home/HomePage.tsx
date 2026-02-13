import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { productsApi, type Product, type ProductListResponse } from '@/services/api/products';

export default function HomePage() {
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tout');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response: ProductListResponse = await productsApi.list({ page_size: 8 });
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
      image: '/images/home/category-phones.png',
      link: '/catalog?category=phones' 
    },
    { 
      name: 'Électronique', 
      image: '/images/home/category-electronics.png',
      link: '/catalog?category=electronics' 
    },
    { 
      name: 'Mode et Beauté', 
      image: '/images/home/category-fashion.png',
      link: '/catalog?category=fashion' 
    },
    { 
      name: 'Maison & Supermarché', 
      image: '/images/home/category-home.png',
      link: '/catalog?category=home' 
    },
  ];

  const tabs = ['Tout', 'Téléphones', 'Mode & Beauté', 'Maison', 'Électronique', 'Supermarché'];

  const features = [
    {
      image: '/images/home/feature-selection.png',
      title: 'Grande Sélection',
      description: 'Choix de produits locaux et internationaux',
      action: 'Explorer',
      link: '/catalog'
    },
    {
      image: '/images/home/feature-secure.png',
      title: 'Commandes Sécurisées',
      description: 'Plateforme de paiement fiable et sécurisée',
      action: 'Acheter en confiance',
      link: '/catalog'
    },
    {
      image: '/images/home/feature-delivery.png',
      title: 'Livraison Rapide',
      description: 'Recevez vos achats rapidement chez vous',
      action: 'En savoir plus',
      link: '#delivery'
    }
  ];

  const whyChoose = [
    {
      image: '/images/home/icon-secure-payment.png',
      title: 'Paiements Sécurisés',
      description: 'Payez en toute tranquillité avec notre système de',
      highlight: 'paiement sécurisé.'
    },
    {
      image: '/images/home/icon-verified.png',
      title: 'Vendeurs Vérifiés',
      description: 'Achetez auprès de vendeurs de confiance pour une expérience sans souci.'
    },
    {
      image: '/images/home/icon-delivery.png',
      title: 'Livraison Fiable',
      description: 'Bénéficiez d\'une',
      highlight: 'livraison rapide',
      description2: 'et suivie à votre porte.'
    },
    {
      image: '/images/home/icon-support.png',
      title: 'Support Local Dédié',
      description: 'Notre équipe locale est là pour vous aider à tout moment.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display font-bold mb-4">
                  <span className="text-gray-700 dark:text-gray-200">Bienvenue sur </span>
                  <span className="text-primary">Belivay</span>
                  <span className="text-primary">!</span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                  Grande sélection de produits
                </p>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Commandes sécurisées
                </p>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="text-primary flex-shrink-0" size={24} />
                <span className="text-gray-700 dark:text-gray-300 text-lg">
                  Plateforme de <span className="font-semibold">paiement</span> fiable et sécurisée
                </span>
              </div>

              <div>
                <Link to="/catalog">
                  <button className="px-10 py-4 bg-primary hover:bg-primary-dark text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Voir les Offres
                  </button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <img 
                src="/images/home/hero-woman-shopping.png" 
                alt="Shopping avec Belivay" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Cards Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-center"
              >
                <div className="flex justify-center mb-6">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-60 h-60 object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {feature.description}
                </p>
                <Link to={feature.link}>
                  <button className="px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600">
                    {feature.action}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {categories.map((category) => (
              <Link 
                key={category.name}
                to={category.link}
                className="group"
              >
                <div className="bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 aspect-square flex items-center justify-center hover:scale-105 transition-transform">
                  <div className="text-center">
                    <div className="mb-4">
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-32 h-32 mx-auto object-contain"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                      {category.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Promo Products Section */}
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-center mb-4">
              <span className="text-gray-800 dark:text-white">Découvrez nos meilleures </span>
              <span className="text-primary">offres !</span>
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Profitez de promotions exceptionnelles sur une large gamme de produits populaires.
            </p>
          </div>

          <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
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
              <button className="px-10 py-4 bg-primary hover:bg-primary-dark text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                Voir plus d'offres
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section id="delivery" className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="/images/home/delivery-man.png" 
                alt="Livraison Belivay" 
                className="w-full h-auto max-w-md mx-auto"
              />
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-display font-bold">
                <span className="text-gray-800 dark:text-white">Livraison rapide et </span>
                <span className="text-primary">fiable</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Recevez vos achats à votre porte avec notre service express!
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      Bénéficiez d'une <span className="font-bold text-primary">livraison rapide</span> et suivie à votre porte.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Suivi en temps réel de votre commande
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Paiement à la livraison disponible
                    </p>
                  </div>
                </li>
              </ul>
              <div>
                <Link to="/catalog">
                  <button className="px-10 py-4 bg-primary hover:bg-primary-dark text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Voir plus d'offres
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Belivay Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              <span className="text-gray-800 dark:text-white">Pourquoi choisir </span>
              <span className="text-primary">Belivay ?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Les avantages du shopping en toute confiance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {whyChoose.map((item, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-center mb-6">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-60 h-60 object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.description}
                  {item.highlight && (
                    <span className="font-bold text-primary"> {item.highlight}</span>
                  )}
                  {item.description2 && ` ${item.description2}`}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/register">
              <button className="px-10 py-4 bg-primary hover:bg-primary-dark text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                Rejoindre Belivay
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}