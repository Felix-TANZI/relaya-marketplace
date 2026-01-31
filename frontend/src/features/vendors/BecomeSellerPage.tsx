// frontend/src/features/vendors/BecomeSellerPage.tsx
// Page d'inscription pour devenir vendeur sur Relaya

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { vendorsApi, type VendorApplication } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

export default function BecomeSellerPage() {
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
      showToast('Demande envoyée avec succès ! Nous examinerons votre candidature.', 'success');
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Erreur inscription vendeur:', error);
      showToast('Erreur lors de l\'envoi de la demande', 'error');
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
            <span className="text-gradient animate-gradient-bg">Devenez Vendeur</span>
          </h1>
          <p className="text-dark-text-secondary text-lg max-w-2xl mx-auto">
            Rejoignez des milliers de vendeurs sur Relaya et développez votre business au Cameroun
          </p>
        </div>

        {/* Avantages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-cyan/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-cyan" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">Commission faible</h3>
            <p className="text-dark-text-secondary text-sm">Frais compétitifs pour maximiser vos profits</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-purple/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-purple" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">Paiements sécurisés</h3>
            <p className="text-dark-text-secondary text-sm">MTN MoMo et Orange Money intégrés</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 rounded-full bg-holo-pink/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-holo-pink" size={24} />
            </div>
            <h3 className="font-semibold text-lg text-dark-text mb-2">Support dédié</h3>
            <p className="text-dark-text-secondary text-sm">Équipe disponible pour vous accompagner</p>
          </Card>
        </div>

        {/* Formulaire */}
        <Card>
          <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
            Formulaire d'inscription
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Ex: Boutique Mode Yaoundé"
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Description de l'entreprise *
              </label>
              <textarea
                required
                rows={4}
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                placeholder="Décrivez votre activité, vos produits..."
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary resize-none"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Téléphone *
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

            {/* Ville */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Ville *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: Yaoundé"
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Adresse complète *
              </label>
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Quartier, rue, repère..."
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary resize-none"
              />
            </div>

            {/* Document d'identité */}
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Numéro de document d'identité *
              </label>
              <input
                type="text"
                required
                value={formData.id_document}
                onChange={(e) => setFormData({ ...formData, id_document: e.target.value })}
                placeholder="Numéro CNI ou passeport"
                className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
              <p className="mt-2 text-xs text-dark-text-tertiary">
                <AlertCircle size={14} className="inline mr-1" />
                Cette information restera confidentielle et servira uniquement à la vérification
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="gradient"
                isLoading={loading}
                className="flex-1"
              >
                Envoyer ma demande
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}