import { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  CheckCircle,
  HelpCircle,
  Zap,
  ChevronDown
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      
      setTimeout(() => setSubmitted(false), 5000);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactMethods = [
    {
      icon: Phone,
      title: 'Téléphone',
      value: '+237 6XX XX XX XX',
      link: 'tel:+237',
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
      delay: 'Réponse immédiate'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'contact@belivay.com',
      link: 'mailto:contact@belivay.com',
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      delay: 'Sous 24h'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      value: '+237 6XX XX XX XX',
      link: 'https://wa.me/237',
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/10',
      delay: 'Réponse rapide'
    },
    {
      icon: MapPin,
      title: 'Adresse',
      value: 'Yaoundé, Cameroun',
      link: '#',
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      delay: 'Visite sur RDV'
    }
  ];

  const socialLinks = [
    { icon: Facebook, name: 'Facebook', link: '#', color: 'hover:text-blue-500' },
    { icon: Instagram, name: 'Instagram', link: '#', color: 'hover:text-pink-500' },
    { icon: Twitter, name: 'Twitter', link: '#', color: 'hover:text-sky-500' }
  ];

  const faqs = [
    {
      question: "Quels sont vos délais de livraison ?",
      answer: "Nous livrons sous 2-5 jours ouvrables en livraison standard et 24-48h en express sur tout le Cameroun."
    },
    {
      question: "Comment suivre ma commande ?",
      answer: "Connectez-vous à votre compte et accédez à 'Mes commandes' pour suivre votre colis en temps réel."
    },
    {
      question: "Puis-je retourner un produit ?",
      answer: "Oui, vous disposez de 10 jours pour retourner un produit non conforme ou si vous changez d'avis."
    },
    {
      question: "Quels modes de paiement acceptez-vous ?",
      answer: "Nous acceptons Mobile Money (MTN, Orange), cartes bancaires et paiement à la livraison."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Contactez-nous
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Notre équipe est à votre écoute pour répondre à toutes vos questions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Formulaire de contact - 2 colonnes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                Envoyez-nous un message
              </h2>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={24} />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-400">Message envoyé !</p>
                    <p className="text-sm text-green-600 dark:text-green-500">Nous vous répondrons dans les 24h.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="+237 6XX XX XX XX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Objet *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    placeholder="Ex: Question sur ma commande #12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
                    placeholder="Décrivez votre demande en détail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Envoyer le message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* FAQ Rapide */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <HelpCircle className="text-blue-600" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Questions fréquentes
                </h3>
              </div>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                      <ChevronDown 
                        size={20} 
                        className={`text-gray-500 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                
                  <a
                  href="/help"
                  className="text-primary hover:underline font-medium text-sm"
                >
                  Voir toutes les questions →
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar - Informations de contact */}
          <div className="space-y-6">
            {/* Support prioritaire */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="text-white" size={20} />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Besoin urgent ?
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Pour les urgences, contactez-nous directement par téléphone ou WhatsApp
              </p>
              <div className="flex gap-3">
                
                  <a
                  href="tel:+237"
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-center font-semibold text-sm hover:shadow-md transition-all"
                >
                  📞 Appeler
                </a>
                
                  <a
                  href="https://wa.me/237"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-center font-semibold text-sm hover:bg-green-600 transition-all"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>

            {/* Moyens de contact */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                Nos coordonnées
              </h3>
              <div className="space-y-4">
                {contactMethods.map((method, index) => (
                  <a
                    key={index}
                    href={method.link}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group"
                  >
                    <div className={`w-10 h-10 ${method.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <method.icon className={method.color} size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {method.title}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                        {method.value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {method.delay}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Heures d'ouverture */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="text-orange-600" size={20} />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Heures d'ouverture
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lundi - Vendredi</span>
                  <span className="font-semibold text-gray-900 dark:text-white">8h - 18h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Samedi</span>
                  <span className="font-semibold text-gray-900 dark:text-white">9h - 14h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dimanche</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Fermé</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  💡 Support WhatsApp disponible 24h/24
                </p>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                Suivez-nous
              </h3>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.link}
                    className={`w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center transition-all ${social.color} hover:scale-110`}
                  >
                    <social.icon size={20} />
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Restez informé des nouveautés, offres et actualités
              </p>
            </div>

            {/* Centre d'aide */}
            <div className="bg-gradient-to-br from-primary/10 to-purple-100/50 dark:from-primary/20 dark:to-purple-900/20 rounded-2xl p-6 border border-primary/20">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                Centre d'aide
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Consultez nos guides et tutoriels pour des réponses immédiates
              </p>
              
                <a
                href="/help"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-primary font-semibold rounded-lg hover:shadow-md transition-all"
              >
                Accéder au centre d'aide
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
