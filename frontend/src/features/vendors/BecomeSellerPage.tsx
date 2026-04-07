import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { vendorsApi, type VendorApplication } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

export default function BecomeSellerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VendorApplication>({
    business_name: '',
    business_description: '',
    phone: '',
    address: '',
    city: '',
    id_document: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await vendorsApi.apply(formData);
      showToast(t('seller.submit_success'), 'success');
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Erreur inscription vendeur:', error);
      showToast(t('seller.submit_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-holographic mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-4">
            <span className="text-gradient animate-gradient-bg">{t('seller.title')}</span>
          </h1>
          <p className="text-dark-text-secondary text-lg max-w-2xl mx-auto">
            {t('seller.subtitle')}
          </p>
        </div>

        {/* Avantages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-cyan/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-cyan" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">{t('seller.advantage_commission_title')}</h3>
            <p className="text-dark-text-secondary text-sm">{t('seller.advantage_commission_desc')}</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-purple/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-purple" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">{t('seller.advantage_payment_title')}</h3>
            <p className="text-dark-text-secondary text-sm">{t('seller.advantage_payment_desc')}</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-pink/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-pink" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">{t('seller.advantage_support_title')}</h3>
            <p className="text-dark-text-secondary text-sm">{t('seller.advantage_support_desc')}</p>
          </Card>
        </div>

        {/* Formulaire */}
        <Card>
          <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
            {t('seller.form_title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.business_name_label')}
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder={t('seller.business_name_placeholder')}
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.business_desc_label')}
              </label>
              <textarea
                required
                rows={4}
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                placeholder={t('seller.business_desc_placeholder')}
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.phone_label')}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+237 6XX XXX XXX"
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.city_label')}
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t('seller.city_placeholder')}
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.address_label')}
              </label>
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('seller.address_placeholder')}
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('seller.id_label')}
              </label>
              <input
                type="text"
                required
                value={formData.id_document}
                onChange={(e) => setFormData({ ...formData, id_document: e.target.value })}
                placeholder={t('seller.id_placeholder')}
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
              <p className="mt-2 text-xs text-dark-text-tertiary">
                <AlertCircle size={14} className="inline mr-1" />
                {t('seller.id_hint')}
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="gradient"
                isLoading={loading}
                className="flex-1"
              >
                {t('seller.submit_button')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
