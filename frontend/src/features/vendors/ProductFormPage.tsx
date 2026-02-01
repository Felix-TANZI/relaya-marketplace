// frontend/src/features/vendors/ProductFormPage.tsx
// Formulaire de création/édition de produit pour vendeurs

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Upload} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { vendorsApi } from '@/services/api/vendors';
import { categoriesApi, type Category } from '@/services/api/categories';
import { useToast } from '@/context/ToastContext';

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_xaf: '',
    stock_quantity: '',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadProduct(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      showToast('Erreur de chargement des catégories', 'error');
    }
  };

  const loadProduct = async (productId: number) => {
    try {
      setLoading(true);
      const products = await vendorsApi.getProducts();
      const product = products.find(p => p.id === productId);
      
      if (product) {
        setFormData({
          title: product.title,
          description: product.description,
          price_xaf: product.price_xaf.toString(),
          stock_quantity: product.stock_quantity.toString(),
          category: product.category.toString(),
          is_active: product.is_active,
        });
      } else {
        showToast('Produit introuvable', 'error');
        navigate('/seller/dashboard');
      }
    } catch (error) {
      console.error('Erreur chargement produit:', error);
      showToast('Erreur de chargement du produit', 'error');
      navigate('/seller/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      showToast('Le titre est requis', 'error');
      return;
    }
    if (!formData.price_xaf || parseFloat(formData.price_xaf) <= 0) {
      showToast('Le prix doit être supérieur à 0', 'error');
      return;
    }
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      showToast('Le stock ne peut pas être négatif', 'error');
      return;
    }
    if (!formData.category) {
      showToast('Veuillez sélectionner une catégorie', 'error');
      return;
    }

    try {
      setLoading(true);

      const productData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price_xaf: parseFloat(formData.price_xaf),
        stock_quantity: parseInt(formData.stock_quantity),
        category: parseInt(formData.category),
        is_active: formData.is_active,
      };

      if (isEdit && id) {
        await vendorsApi.updateProduct(parseInt(id), productData);
        showToast('Produit mis à jour avec succès', 'success');
      } else {
        await vendorsApi.createProduct(productData);
        showToast('Produit créé avec succès', 'success');
      }

      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/seller/dashboard')}
            className="flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Retour au dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-holographic/10 flex items-center justify-center">
              <Package className="text-holo-cyan" size={24} />
            </div>
            <div>
              <h1 className="font-display font-bold text-4xl">
                <span className="text-gradient animate-gradient-bg">
                  {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
                </span>
              </h1>
              <p className="text-dark-text-secondary">
                {isEdit ? 'Mettez à jour les informations de votre produit' : 'Ajoutez un nouveau produit à votre catalogue'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
              Informations du produit
            </h2>

            <div className="space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  Titre du produit *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: iPhone 15 Pro Max 256GB"
                  className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre produit en détail..."
                  className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary resize-none"
                />
              </div>

              {/* Prix et Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Prix (XAF) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.price_xaf}
                    onChange={(e) => setFormData({ ...formData, price_xaf: e.target.value })}
                    placeholder="50000"
                    className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Stock disponible *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="10"
                    className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  Catégorie *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Statut actif */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 text-holo-cyan focus:ring-holo-cyan"
                />
                <label htmlFor="is_active" className="text-sm text-dark-text-secondary cursor-pointer">
                  Produit actif (visible sur la marketplace)
                </label>
              </div>
            </div>
          </Card>

          {/* Images (à implémenter plus tard) */}
          <Card className="mb-6">
            <h2 className="font-display font-bold text-2xl text-dark-text mb-4">
              Images du produit
            </h2>
            <div className="glass border-2 border-dashed border-white/10 rounded-xl p-12 text-center">
              <Upload className="text-dark-text-tertiary mx-auto mb-4" size={48} />
              <p className="text-dark-text-secondary mb-2">Fonctionnalité à venir</p>
              <p className="text-dark-text-tertiary text-sm">
                L'upload d'images sera disponible prochainement
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/seller/dashboard')}
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
              {isEdit ? 'Mettre à jour' : 'Créer le produit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}