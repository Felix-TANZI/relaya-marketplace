import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShoppingCart,
  Truck,
  RotateCcw,
  Shield,
  Store,
  Wrench,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  CheckCircle,
  BookOpen,
  Video,
  Users,
  AlertCircle,
  Globe,
  Lock,
  CreditCard,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

export default function HelpPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const categories = [
    {
      id: 'orders',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      count: 2,
    },
    {
      id: 'shipping',
      icon: Truck,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
      count: 1,
    },
    {
      id: 'returns',
      icon: RotateCcw,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      count: 1,
    },
    {
      id: 'account',
      icon: Shield,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/20',
      count: 1,
    },
    {
      id: 'sellers',
      icon: Store,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      count: 1,
    },
    {
      id: 'technical',
      icon: Wrench,
      color: 'text-cyan-600',
      bg: 'bg-cyan-100 dark:bg-cyan-900/20',
      count: 1,
    },
  ];

  const faqItems: FAQItem[] = [
    {
      id: 'order_tracking',
      question: t('help.faq.order_tracking.question'),
      answer: t('help.faq.order_tracking.answer'),
      category: 'orders',
    },
    {
      id: 'payment_methods',
      question: t('help.faq.payment_methods.question'),
      answer: t('help.faq.payment_methods.answer'),
      category: 'orders',
    },
    {
      id: 'delivery_time',
      question: t('help.faq.delivery_time.question'),
      answer: t('help.faq.delivery_time.answer'),
      category: 'shipping',
    },
    {
      id: 'return_policy',
      question: t('help.faq.return_policy.question'),
      answer: t('help.faq.return_policy.answer'),
      category: 'returns',
    },
    {
      id: 'become_seller',
      question: t('help.faq.become_seller.question'),
      answer: t('help.faq.become_seller.answer'),
      category: 'sellers',
    },
    {
      id: 'account_security',
      question: t('help.faq.account_security.question'),
      answer: t('help.faq.account_security.answer'),
      category: 'account',
    },
  ];

  const guides: GuideItem[] = [
    {
      title: 'Comment passer une commande',
      description: 'Apprenez à créer un compte, naviguer, et finaliser votre première commande',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Suivi de commande en temps réel',
      description: 'Comprenez le statut de votre colis et comment le suivre',
      icon: Truck,
      color: 'text-green-600',
    },
    {
      title: 'Processus de retour',
      description: 'Étapes complètes pour retourner un produit',
      icon: RotateCcw,
      color: 'text-purple-600',
    },
    {
      title: 'Sécurité du compte',
      description: 'Protégez votre compte avec 2FA et mots de passe forts',
      icon: Lock,
      color: 'text-red-600',
    },
  ];

  const troubleshooting = [
    {
      title: 'Je n\'arrive pas à me connecter',
      description: 'Solutions pour les problèmes de connexion',
      icon: AlertCircle,
    },
    {
      title: 'Erreur de paiement',
      description: 'Dépannage des moyens de paiement',
      icon: CreditCard,
    },
    {
      title: 'Produit indisponible',
      description: 'Qu\'est-ce que cela signifie et que faire',
      icon: BarChart3,
    },
    {
      title: 'Problèmes d\'expédition',
      description: 'Issues de livraison et solutions',
      icon: Truck,
    },
  ];

  const filteredFAQs = faqItems.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute inset-0 opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                {t('help.title')}
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl mb-10 leading-relaxed">
              {t('help.subtitle')}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('help.search_placeholder')}
                className="w-full pl-14 pr-6 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white transition-all text-base shadow-lg focus:shadow-xl"
              />
              {searchQuery && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? 'résultat trouvé' : 'résultats trouvés'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-white dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { number: '24/7', label: 'Support' },
              { number: '5min', label: 'Temps moyen' },
              { number: '10k+', label: 'Clients aidés' },
              { number: '99%', label: 'Satisfaction' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.number}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4">
              <span className="text-gray-900 dark:text-white">Explorez par </span>
              <span className="text-primary">catégorie</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Sélectionnez une catégorie ou parcourez toutes les questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(isSelected ? 'all' : category.id);
                    setExpandedFAQ(null);
                  }}
                  className="text-left transition-all group"
                >
                  <div
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-7 shadow-lg hover:shadow-xl transition-all border-2 group-hover:scale-105 ${
                      isSelected
                        ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-14 h-14 ${category.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className={category.color} size={28} />
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded font-medium">
                        {category.count}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {t(`help.categories.${category.id}.title`)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {t(`help.categories.${category.id}.description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCategory !== 'all' && (
            <div className="text-center">
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-6 py-2.5 text-primary hover:text-primary-dark font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                ← Voir toutes les catégories
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold mb-2 text-gray-900 dark:text-white">
              Questions Fréquemment Posées
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-12">
              Trouvez rapidement les réponses les plus demandées
            </p>

            {filteredFAQs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg text-center border border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-6">
                  <Search className="text-gray-400" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {t('help.no_results')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  {t('help.no_results_desc')}
                </p>
                <Link to="/contact">
                  <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all mx-auto">
                    <MessageCircle size={20} />
                    {t('help.contact_support')}
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => {
                  const isExpanded = expandedFAQ === faq.id;
                  const categoryInfo = categories.find((c) => c.id === faq.category);
                  const Icon = categoryInfo?.icon;

                  return (
                    <div
                      key={faq.id}
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-200 dark:border-gray-700 ${
                        isExpanded ? 'ring-2 ring-primary/50' : ''
                      }`}
                    >
                      <button
                        onClick={() => setExpandedFAQ(isExpanded ? null : faq.id)}
                        className="w-full flex items-start justify-between gap-4 p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`w-11 h-11 ${categoryInfo?.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}
                          >
                            {Icon && (
                              <Icon className={categoryInfo?.color} size={22} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-primary mb-1">
                              {t(`help.categories.${faq.category}.title`)}
                            </p>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white leading-snug">
                              {faq.question}
                            </h3>
                          </div>
                        </div>
                        <ChevronDown
                          size={24}
                          className={`text-gray-400 transition-transform flex-shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Guides Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 mb-4">
                <Video size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  Tutoriels Vidéo
                </span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Guides </span>
                <span className="text-primary">Complets</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Maîtrisez Belivay avec nos tutoriels détaillés
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {guides.map((guide, index) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={index}
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all text-left border border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  >
                    <div className={`w-12 h-12 ${guide.color.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/20' : guide.color.includes('green') ? 'bg-green-100 dark:bg-green-900/20' : guide.color.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className={guide.color} size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{guide.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                      Voir le guide <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting Section */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-t border-b border-orange-200 dark:border-orange-800">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-200 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 mb-4">
                <AlertCircle size={16} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  Dépannage
                </span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Résoudre un </span>
                <span className="text-orange-600">Problème</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Solutions rapides pour les problèmes courants
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {troubleshooting.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all text-left border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="text-orange-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                        <div className="mt-3 flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                          Voir les solutions <span>→</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                <Users size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Communauté
                </span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Rejoignez notre </span>
                <span className="text-primary">Communauté</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                Connectez-vous avec d'autres utilisateurs, partagez vos expériences et obtenez des conseils
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Forums actifs avec modérateurs',
                  'Groupes d\'entraide entre utilisateurs',
                  'Conseils et astuces d\'experts',
                  'Événements et webinaires',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl">
                Rejoindre la communauté
              </button>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-12 border border-blue-200 dark:border-blue-800 flex items-center justify-center min-h-96">
              <div className="text-center">
                <Users className="text-primary mx-auto mb-4" size={48} />
                <p className="text-3xl font-bold text-primary">50k+</p>
                <p className="text-gray-600 dark:text-gray-400">Utilisateurs actifs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Base Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 mb-4">
                <BookOpen size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  Base de Connaissances
                </span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Articles </span>
                <span className="text-primary">Détaillés</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Documentation complète et guides d'utilisation
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Politique d\'expédition', icon: Truck },
                { title: 'Conditions d\'utilisation', icon: FileText },
                { title: 'Politique de confidentialité', icon: Lock },
                { title: 'Programme de partenariat', icon: Globe },
                { title: 'Frais et tarification', icon: CreditCard },
                { title: 'Garantie produits', icon: CheckCircle },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all text-left border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="text-primary group-hover:scale-110 transition-transform" size={24} />
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Accédez à l'article complet</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-12 max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-display font-bold mb-4">
              Vous n'avez pas trouvé de réponse ?
            </h2>
            <p className="text-white/90 text-lg mb-8">
              Notre équipe support est prête à vous aider immédiatement
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/contact">
                <button className="px-8 py-3 bg-white hover:bg-gray-100 text-primary font-semibold rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                  <Mail size={20} />
                  Contacter le support
                </button>
              </Link>
              <a href="tel:+237">
                <button className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm border border-white/30">
                  <Phone size={20} />
                  Appeler maintenant
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}