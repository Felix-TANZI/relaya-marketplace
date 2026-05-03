import { useTranslation } from 'react-i18next';
import {
  Heart,
  Zap,
  Users,
  Award,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Star,
  Lightbulb,
  BarChart3,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

interface TimelineItem {
  year: string;
  event: string;
}

interface Testimonial {
  text: string;
  author: string;
  role: string;
}

interface Value {
  title: string;
  desc: string;
}

export default function AboutPage() {
  const { t } = useTranslation();

  const stats = [
    {
      value: '50k+',
      label: t('about.stats.users'),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      value: '2k+',
      label: t('about.stats.sellers'),
      icon: ShoppingCart,
      color: 'text-green-600',
    },
    {
      value: '100k+',
      label: t('about.stats.products'),
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      value: '10k+',
      label: t('about.stats.transactions'),
      icon: BarChart3,
      color: 'text-orange-600',
    },
  ];

  const values = [
    {
      key: 'trust',
      icon: Heart,
      bg: 'bg-red-100 dark:bg-red-900/20',
      color: 'text-red-600',
    },
    {
      key: 'innovation',
      icon: Lightbulb,
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      color: 'text-yellow-600',
    },
    {
      key: 'community',
      icon: Users,
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      color: 'text-blue-600',
    },
    {
      key: 'quality',
      icon: Award,
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      color: 'text-purple-600',
    },
  ];

  // Better handling of translation arrays with validation
  const teamMembers = Array.isArray(t('about.team_members', { returnObjects: true }))
    ? (t('about.team_members', { returnObjects: true }) as TeamMember[])
    : [];
  const timeline = Array.isArray(t('about.timeline', { returnObjects: true }))
    ? (t('about.timeline', { returnObjects: true }) as TimelineItem[])
    : [];
  const testimonials = Array.isArray(t('about.testimonials', { returnObjects: true }))
    ? (t('about.testimonials', { returnObjects: true }) as Testimonial[])
    : [];

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      {/* Hero Section */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-[2rem] border border-orange-100 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              À propos
            </p>
            <h1 className="mt-4 text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 text-gray-900 dark:text-white">
              {t('about.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl mb-8">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className={`w-16 h-16 ${stat.color.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/20' : stat.color.includes('green') ? 'bg-green-100 dark:bg-green-900/20' : stat.color.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-orange-100 dark:bg-orange-900/20'} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={stat.color} size={32} />
                  </div>
                  <p className="text-4xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Mission */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6">
                  <Target className="text-blue-600" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('about.mission_title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                  {t('about.mission_desc')}
                </p>
              </div>

              {/* Vision */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="text-purple-600" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('about.vision_title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                  {t('about.vision_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-2xl p-12 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-14 h-14 bg-orange-200 dark:bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="text-orange-600" size={28} />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('about.story_title')}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    {t('about.story_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Nos </span>
                <span className="text-primary">Valeurs</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Ce qui nous guide dans chaque décision
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                const valueData = t(`about.values.${value.key}`, { returnObjects: true }) as Value;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
                  >
                    <div className={`w-12 h-12 ${value.bg} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className={value.color} size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {valueData.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {valueData.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Notre </span>
                <span className="text-primary">Parcours</span>
              </h2>
            </div>

            <div className="space-y-8">
              {timeline.length > 0 ? (
                timeline.map((item: TimelineItem, index: number) => (
                  <div key={index} className="flex gap-8">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {index + 1}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-1 h-24 bg-gradient-to-b from-primary to-primary/20 mt-4"></div>
                      )}
                    </div>
                    <div className="pb-8">
                      <p className="text-2xl font-bold text-primary">{item.year}</p>
                      <p className="text-lg text-gray-700 dark:text-gray-300 mt-1">
                        {item.event}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  Chargement du parcours...
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4">
                {t('about.team_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('about.team_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.length > 0 ? (
                teamMembers.map((member: TeamMember, index: number) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
                  >
                    <div className="h-32 bg-gradient-to-r from-primary to-purple-600"></div>
                    <div className="p-6 -mt-16 relative">
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 border-4 border-white dark:border-gray-800"></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
                        {member.name}
                      </h3>
                      <p className="text-sm text-primary text-center font-medium mb-2">
                        {member.role}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {member.bio}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-600 dark:text-gray-400">
                  Chargement de l'équipe...
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4">
                {t('about.testimonials_title')}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.length > 0 ? (
                testimonials.map((testimonial: Testimonial, index: number) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-xl p-8 border border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="text-yellow-400 fill-yellow-400" size={18} />
                      ))}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                      "{testimonial.text}"
                    </p>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {testimonial.author}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-600 dark:text-gray-400">
                  Chargement des témoignages...
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4">
                {t('about.partners_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('about.partners_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: 'MTN Money', icon: '📱' },
                { name: 'Orange Money', icon: '💳' },
                { name: 'DHL', icon: '📦' },
                { name: 'Eneo', icon: '⚡' },
              ].map((partner, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all text-center border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-4xl mb-4">{partner.icon}</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {partner.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-bg-dark">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-12 max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-display font-bold mb-4">
              Rejoignez Belivay Aujourd'hui
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers de clients et vendeurs satisfaits qui font confiance à Belivay
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/catalog">
                <button className="px-8 py-3 bg-white hover:bg-gray-100 text-primary font-semibold rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                  {t('about.cta_join')}
                  <ArrowRight size={20} />
                </button>
              </Link>
              <Link to="/contact">
                <button className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all backdrop-blur-sm border border-white/30">
                  {t('about.cta_contact')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
