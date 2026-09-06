import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShoppingCart,
  Truck,
  RotateCcw,
  Shield,
  Store,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  CreditCard,
  Scale,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

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
      category: 'payments',
    },
    {
      id: 'mobile_money_operators',
      question: t('help.faq.mobile_money_operators.question'),
      answer: t('help.faq.mobile_money_operators.answer'),
      category: 'payments',
    },
    {
      id: 'escrow',
      question: t('help.faq.escrow.question'),
      answer: t('help.faq.escrow.answer'),
      category: 'payments',
    },
    {
      id: 'delivery_time',
      question: t('help.faq.delivery_time.question'),
      answer: t('help.faq.delivery_time.answer'),
      category: 'shipping',
    },
    {
      id: 'pickup_relay',
      question: t('help.faq.pickup_relay.question'),
      answer: t('help.faq.pickup_relay.answer'),
      category: 'shipping',
    },
    {
      id: 'delivery_delay',
      question: t('help.faq.delivery_delay.question'),
      answer: t('help.faq.delivery_delay.answer'),
      category: 'shipping',
    },
    {
      id: 'return_policy',
      question: t('help.faq.return_policy.question'),
      answer: t('help.faq.return_policy.answer'),
      category: 'returns',
    },
    {
      id: 'dispute_arbitration',
      question: t('help.faq.dispute_arbitration.question'),
      answer: t('help.faq.dispute_arbitration.answer'),
      category: 'disputes',
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
    {
      id: 'privacy_anonymity',
      question: t('help.faq.privacy_anonymity.question'),
      answer: t('help.faq.privacy_anonymity.answer'),
      category: 'account',
    },
  ];

  const categories = [
    { id: 'orders', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { id: 'shipping', icon: Truck, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    { id: 'returns', icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    { id: 'payments', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { id: 'disputes', icon: Scale, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { id: 'account', icon: Shield, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
    { id: 'sellers', icon: Store, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  ].map((category) => ({
    ...category,
    count: faqItems.filter((faq) => faq.category === category.id).length,
  }));

  const filteredFAQs = faqItems.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      {/* Hero Section */}
      <section className="py-10">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto rounded-[2rem] border border-orange-100 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Centre d'aide
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900 dark:text-white">
              {t('help.title')}
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
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? t('help.result_found') : t('help.results_found')}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4">
              <span className="text-gray-900 dark:text-white">{t('help.categories_title_prefix')} </span>
              <span className="text-primary">{t('help.categories_title_suffix')}</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('help.categories_subtitle')}
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
                ← {t('help.view_all_categories')}
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
              {t('help.faq_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-12">
              {t('help.faq_subtitle')}
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

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-12 max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-display font-bold mb-4">
              {t('help.cta_title')}
            </h2>
            <p className="text-white/90 text-lg mb-8">
              {t('help.cta_subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/contact">
                <button className="px-8 py-3 bg-white hover:bg-gray-100 text-primary font-semibold rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                  <Mail size={20} />
                  {t('help.contact_support')}
                </button>
              </Link>
              <a href="tel:+237">
                <button className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm border border-white/30">
                  <Phone size={20} />
                  {t('help.call_now')}
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
