import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, CheckCircle, ShieldCheck, CreditCard, HeadphonesIcon } from 'lucide-react';
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

  const advantages = [
    { icon: CheckCircle, title: t('seller.advantage_commission_title'), desc: t('seller.advantage_commission_desc'), color: 'bg-green-50 text-green-600 dark:bg-green-900/20' },
    { icon: CreditCard, title: t('seller.advantage_payment_title'), desc: t('seller.advantage_payment_desc'), color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
    { icon: HeadphonesIcon, title: t('seller.advantage_support_title'), desc: t('seller.advantage_support_desc'), color: 'bg-primary/10 text-primary' },
  ];

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white placeholder:text-gray-400";

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-8 dark:bg-gray-950 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">{t('seller.title')}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 dark:text-gray-400 sm:text-base">{t('seller.subtitle')}</p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {advantages.map((adv) => {
            const Icon = adv.icon;
            return (
              <div key={adv.title} className="rounded-[2rem] border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${adv.color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{adv.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{adv.desc}</p>
              </div>
            );
          })}
        </div>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">{t('seller.form_title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.business_name_label')}</label>
              <input type="text" required value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} placeholder={t('seller.business_name_placeholder')} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.business_desc_label')}</label>
              <textarea required rows={4} value={formData.business_description} onChange={(e) => setFormData({ ...formData, business_description: e.target.value })} placeholder={t('seller.business_desc_placeholder')} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.phone_label')}</label>
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+237 6XX XXX XXX" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.city_label')}</label>
                <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder={t('seller.city_placeholder')} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.address_label')}</label>
              <textarea required rows={2} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('seller.address_placeholder')} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400">{t('seller.id_label')}</label>
              <input type="text" required value={formData.id_document} onChange={(e) => setFormData({ ...formData, id_document: e.target.value })} placeholder={t('seller.id_placeholder')} className={inputClass} />
              <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-400"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />{t('seller.id_hint')}</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => navigate('/')} className="flex-1 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-60">
                {loading ? '...' : t('seller.submit_button')}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
