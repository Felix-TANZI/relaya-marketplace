// frontend/src/features/help/HelpPage.tsx
// Page du centre d'aide avec FAQ interactive et recherche

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
  Phone
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface CategoryInfo {
  id: string;
  icon: React.ElementType;
  color: string;
  glowColor: string;
}

export default function HelpPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Catégories d'aide
  const categories: Record<string, CategoryInfo> = {
    orders: { 
      id: 'orders', 
      icon: ShoppingCart, 
      color: 'text-holo-cyan', 
      glowColor: 'hover-glow-cyan' 
    },
    shipping: { 
      id: 'shipping', 
      icon: Truck, 
      color: 'text-holo-purple', 
      glowColor: 'hover-glow-purple' 
    },
    returns: { 
      id: 'returns', 
      icon: RotateCcw, 
      color: 'text-holo-pink', 
      glowColor: 'hover-glow-pink' 
    },
    account: { 
      id: 'account', 
      icon: Shield, 
      color: 'text-holo-cyan', 
      glowColor: 'hover-glow-cyan' 
    },
    sellers: { 
      id: 'sellers', 
      icon: Store, 
      color: 'text-holo-purple', 
      glowColor: 'hover-glow-purple' 
    },
    technical: { 
      id: 'technical', 
      icon: Wrench, 
      color: 'text-holo-pink', 
      glowColor: 'hover-glow-pink' 
    },
  };

  // FAQ items
  const faqItems: FAQItem[] = [
    {
      id: 'order_tracking',
      question: t('help.faq.order_tracking.question'),
      answer: t('help.faq.order_tracking.answer'),
      category: 'orders'
    },
    {
      id: 'payment_methods',
      question: t('help.faq.payment_methods.question'),
      answer: t('help.faq.payment_methods.answer'),
      category: 'orders'
    },
    {
      id: 'delivery_time',
      question: t('help.faq.delivery_time.question'),
      answer: t('help.faq.delivery_time.answer'),
      category: 'shipping'
    },
    {
      id: 'return_policy',
      question: t('help.faq.return_policy.question'),
      answer: t('help.faq.return_policy.answer'),
      category: 'returns'
    },
    {
      id: 'become_seller',
      question: t('help.faq.become_seller.question'),
      answer: t('help.faq.become_seller.answer'),
      category: 'sellers'
    },
    {
      id: 'account_security',
      question: t('help.faq.account_security.question'),
      answer: t('help.faq.account_security.answer'),
      category: 'account'
    },
  ];

  // Filtrer les FAQ selon la recherche et la catégorie
  const filteredFAQs = faqItems.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        
        {/* Header avec gradient animé */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-5xl mb-4">
            <span className="text-gradient animate-gradient-bg">
              {t('help.title')}
            </span>
          </h1>
          <p className="text-dark-text-secondary text-lg max-w-2xl mx-auto">
            {t('help.subtitle')}
          </p>
        </div>

        {/* Barre de recherche premium */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative group">
            <Search 
              className="absolute left-6 top-1/2 -translate-y-1/2 text-dark-text-tertiary group-focus-within:text-holo-cyan transition-colors" 
              size={24} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('help.search_placeholder')}
              className="w-full pl-16 pr-6 py-5 rounded-2xl glass-strong border border-white/20 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/30 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none text-lg"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-holographic opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity rounded-2xl" />
          </div>
        </div>

        {/* Catégories en grille */}
        <div className="mb-12">
          <h2 className="font-display font-bold text-2xl mb-6 text-center">
            {t('help.popular_topics')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(categories).map(([key, cat]) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === key;
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : key)}
                  className={`group relative overflow-hidden`}
                >
                  <Card 
                    variant="default" 
                    hover
                    className={`h-full transition-all ${
                      isSelected 
                        ? 'border-2 border-holo-cyan shadow-glow-cyan' 
                        : 'border border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl glass border border-white/10 ${cat.color} ${cat.glowColor} transition-all`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-display font-bold text-lg mb-1 text-dark-text">
                          {t(`help.categories.${key}.title`)}
                        </h3>
                        <p className="text-sm text-dark-text-secondary">
                          {t(`help.categories.${key}.description`)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>

          {selectedCategory !== 'all' && (
            <div className="text-center mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedCategory('all')}
                className="text-holo-cyan"
              >
                {t('help.all_categories')}
              </Button>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mb-12">
          {filteredFAQs.length === 0 ? (
            <Card variant="default" className="text-center py-12">
              <div className="w-16 h-16 rounded-full glass border border-white/20 flex items-center justify-center mx-auto mb-4">
                <Search className="text-dark-text-tertiary" size={32} />
              </div>
              <h3 className="font-display font-bold text-xl mb-2 text-dark-text">
                {t('help.no_results')}
              </h3>
              <p className="text-dark-text-secondary mb-6">
                {t('help.no_results_desc')}
              </p>
              <Link to="/contact">
                <Button variant="gradient">
                  <MessageCircle size={18} />
                  {t('help.contact_support')}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;
                const categoryInfo = categories[faq.category];
                
                return (
                  <Card 
                    key={faq.id} 
                    variant="default"
                    className="overflow-hidden transition-all hover:border-white/20"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full flex items-start justify-between gap-4 text-left"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-2 rounded-lg glass border border-white/10 ${categoryInfo.color} mt-1`}>
                          <categoryInfo.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display font-semibold text-lg text-dark-text mb-1">
                            {faq.question}
                          </h3>
                          {isExpanded && (
                            <p className="text-dark-text-secondary mt-3 leading-relaxed animate-slide-in-up">
                              {faq.answer}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown 
                        size={24} 
                        className={`text-dark-text-tertiary transition-transform flex-shrink-0 mt-1 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA Contact Support */}
        <Card variant="elevated" className="max-w-4xl mx-auto overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-holographic opacity-10" />
          <div className="relative text-center py-12 px-6">
            <h2 className="font-display font-bold text-3xl mb-4">
              <span className="text-gradient animate-gradient-bg">
                Besoin d'aide supplémentaire ?
              </span>
            </h2>
            <p className="text-dark-text-secondary text-lg mb-8 max-w-2xl mx-auto">
              Notre équipe support est disponible pour répondre à toutes vos questions
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/contact">
                <Button variant="gradient" size="lg">
                  <Mail size={20} />
                  Envoyer un message
                </Button>
              </Link>
              <a href="tel:+2376XXXXXXXX">
                <Button variant="secondary" size="lg">
                  <Phone size={20} />
                  Appeler le support
                </Button>
              </a>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}