// frontend/src/features/contact/ContactPage.tsx
// Page de contact avec formulaire d'envoi d'email et informations

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { contactApi, ContactFormData } from '@/services/api/contact';
import { useToast } from '@/context/ToastContext';

export default function ContactPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      setLoading(true);
      await contactApi.sendMessage(formData);
      setSubmitted(true);
      showToast(t('contact.form.success'), 'success');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
      
      // Reset submitted state after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showToast(t('contact.form.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-5xl mb-4">
            <span className="text-gradient animate-gradient-bg">
              {t('contact.title')}
            </span>
          </h1>
          <p className="text-dark-text-secondary text-lg max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Formulaire de contact - 2/3 */}
          <div className="lg:col-span-2">
            <Card variant="elevated" className="overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-holographic" />
              
              <h2 className="font-display font-bold text-2xl mb-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-holographic">
                  <Send className="text-white" size={24} />
                </div>
                {t('contact.form.title')}
              </h2>

              {submitted ? (
                <div className="text-center py-12 animate-scale-in">
                  <div className="w-20 h-20 rounded-full bg-gradient-holographic flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-white" size={40} />
                  </div>
                  <h3 className="font-display font-bold text-2xl mb-3 text-dark-text">
                    {t('contact.form.success')}
                  </h3>
                  <p className="text-dark-text-secondary mb-8">
                    {t('contact.form.success_desc')}
                  </p>
                  <Button variant="secondary" onClick={() => setSubmitted(false)}>
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      {t('contact.form.name')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('contact.form.name_placeholder')}
                      required
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none"
                    />
                  </div>

                  {/* Email & Téléphone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-2">
                        {t('contact.form.email')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t('contact.form.email_placeholder')}
                        required
                        className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-2">
                        {t('contact.form.phone')}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={t('contact.form.phone_placeholder')}
                        className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-purple focus:ring-2 focus:ring-holo-purple/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none"
                      />
                    </div>
                  </div>

                  {/* Sujet */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      {t('contact.form.subject')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={t('contact.form.subject_placeholder')}
                      required
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-pink focus:ring-2 focus:ring-holo-pink/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      {t('contact.form.message')} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder={t('contact.form.message_placeholder')}
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    variant="gradient" 
                    size="lg" 
                    className="w-full"
                    isLoading={loading}
                  >
                    <Send size={20} />
                    {loading ? t('contact.form.sending') : t('contact.form.send')}
                  </Button>
                </form>
              )}
            </Card>
          </div>

          {/* Informations de contact - 1/3 */}
          <div className="space-y-6">
            
            {/* Info Contact */}
            <Card variant="default">
              <h3 className="font-display font-bold text-xl mb-6 text-dark-text">
                {t('contact.info.title')}
              </h3>
              <div className="space-y-4">
                {/* Email */}
                <a 
                  href="mailto:support@relaya.cm"
                  className="flex items-start gap-4 p-3 rounded-xl glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all group"
                >
                  <div className="p-2 rounded-lg bg-gradient-holographic">
                    <Mail className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark-text-tertiary mb-1">
                      {t('contact.info.email_label')}
                    </p>
                    <p className="font-semibold text-dark-text group-hover:text-holo-cyan transition-colors">
                      {t('contact.info.email_value')}
                    </p>
                  </div>
                </a>

                {/* Téléphone */}
                <a 
                  href="tel:+2376XXXXXXXX"
                  className="flex items-start gap-4 p-3 rounded-xl glass border border-white/10 hover:border-holo-purple hover-glow-purple transition-all group"
                >
                  <div className="p-2 rounded-lg bg-holo-purple/20">
                    <Phone className="text-holo-purple" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark-text-tertiary mb-1">
                      {t('contact.info.phone_label')}
                    </p>
                    <p className="font-semibold text-dark-text group-hover:text-holo-purple transition-colors">
                      {t('contact.info.phone_value')}
                    </p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a 
                  href="https://wa.me/2376XXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-3 rounded-xl glass border border-white/10 hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all group"
                >
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <MessageCircle className="text-green-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark-text-tertiary mb-1">
                      {t('contact.info.whatsapp_label')}
                    </p>
                    <p className="font-semibold text-dark-text group-hover:text-green-400 transition-colors">
                      {t('contact.info.whatsapp_value')}
                    </p>
                  </div>
                </a>

                {/* Adresse */}
                <div className="flex items-start gap-4 p-3 rounded-xl glass border border-white/10">
                  <div className="p-2 rounded-lg bg-holo-pink/20">
                    <MapPin className="text-holo-pink" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark-text-tertiary mb-1">
                      {t('contact.info.address_label')}
                    </p>
                    <p className="font-semibold text-dark-text">
                      {t('contact.info.address_value')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Horaires */}
            <Card variant="default">
              <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3 text-dark-text">
                <Clock className="text-holo-cyan" size={24} />
                {t('contact.hours.title')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-dark-text-secondary">
                    {t('contact.hours.weekdays')}
                  </span>
                  <Badge variant="cyan" className="font-mono">
                    {t('contact.hours.weekdays_hours')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-dark-text-secondary">
                    {t('contact.hours.saturday')}
                  </span>
                  <Badge variant="purple" className="font-mono">
                    {t('contact.hours.saturday_hours')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-text-secondary">
                    {t('contact.hours.sunday')}
                  </span>
                  <Badge variant="error" className="font-mono">
                    {t('contact.hours.sunday_hours')}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Réseaux sociaux */}
            <Card variant="default">
              <h3 className="font-display font-bold text-xl mb-6 text-dark-text">
                {t('contact.social.title')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all group"
                >
                  <Facebook className="text-blue-400 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-sm font-medium text-dark-text">Facebook</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10 hover:border-sky-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all group"
                >
                  <Twitter className="text-sky-400 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-sm font-medium text-dark-text">Twitter</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10 hover:border-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all group"
                >
                  <Instagram className="text-pink-400 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-sm font-medium text-dark-text">Instagram</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10 hover:border-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all group"
                >
                  <Linkedin className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-sm font-medium text-dark-text">LinkedIn</span>
                </a>
              </div>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}
