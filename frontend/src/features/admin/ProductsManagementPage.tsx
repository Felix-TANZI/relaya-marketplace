// frontend/src/features/admin/ProductsManagementPage.tsx
// Gestion des produits par l'administration

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminProduct } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function ProductsManagementPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters: {
        vendor?: number;
        category?: number;
        is_active?: boolean;
        search?: string;
      } = {};
      if (filterStatus === 'active') filters.is_active = true;
      if (filterStatus === 'inactive') filters.is_active = false;
      if (searchQuery) filters.search = searchQuery;
      
      const data = await adminApi.listProducts(filters);
      setProducts(data);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      showToast('Erreur de chargement des produits', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleToggleStatus = async (product: AdminProduct) => {
    const action = product.is_active ? 'désactiver' : 'activer';
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ce produit ?`,
      message: `Voulez-vous vraiment ${action} "${product.title}" ?`,
      type: product.is_active ? 'warning' : 'info',
    });

    if (!confirmed) return;

    try {
      setActionLoading(product.id);
      await adminApi.toggleProductStatus(product.id);
      showToast(`Produit ${action === 'activer' ? 'activé' : 'désactivé'} avec succès`, 'success');
      loadProducts();
    } catch (error) {
      console.error('Erreur toggle status:', error);
      showToast(`Erreur lors de l'action`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    const confirmed = await confirm({
      title: 'Supprimer ce produit ?',
      message: `Voulez-vous vraiment supprimer définitivement "${product.title}" ? Cette action est irréversible.`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      setActionLoading(product.id);
      await adminApi.deleteProduct(product.id);
      showToast('Produit supprimé avec succès', 'success');
      loadProducts();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Stats calculées
  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => p.is_active === false).length,
    outOfStock: products.filter((p) => p.stock_quantity === 0).length,
  };

  // Filtrage local par recherche
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(query) ||
      product.vendor_name.toLowerCase().includes(query) ||
      product.vendor_business.toLowerCase().includes(query) ||
      product.category_name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2">
            <span className="text-gradient animate-gradient-bg">Gestion Produits</span>
          </h1>
          <p className="text-dark-text-secondary">
            Modération et gestion de tous les produits de la plateforme
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Total Produits</p>
                <p className="font-display font-bold text-3xl">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                <Package className="text-holo-cyan" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Actifs</p>
                <p className="font-display font-bold text-3xl text-green-400">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Inactifs</p>
                <p className="font-display font-bold text-3xl text-red-400">
                  {stats.inactive}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="text-red-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-text-tertiary text-sm mb-1">Rupture Stock</p>
                <p className="font-display font-bold text-3xl text-yellow-400">
                  {stats.outOfStock}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="text-yellow-400" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres et Recherche */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                size={20}
              />
              <input
                type="text"
                placeholder="Rechercher un produit, vendeur, catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-all"
              />
            </div>

            {/* Filtre Statut */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-tertiary pointer-events-none"
                size={20}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-purple transition-all appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actifs uniquement</option>
                <option value="inactive">Inactifs uniquement</option>
              </select>
            </div>
          </div>

          {/* Compteur résultats */}
          {searchQuery && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-dark-text-secondary">
                <span className="font-bold text-holo-cyan">{filteredProducts.length}</span>{' '}
                résultat(s) pour "{searchQuery}"
              </p>
            </div>
          )}
        </Card>

        {/* Liste Produits */}
        <Card>
          <div className="overflow-x-auto">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-dark-text-secondary">
                  {searchQuery
                    ? 'Aucun produit ne correspond à votre recherche'
                    : 'Aucun produit trouvé'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Produit
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Vendeur
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Catégorie
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Prix
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Stock
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Statut
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-text-tertiary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-white/5 hover:bg-dark-bg-tertiary transition-all"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-dark-text-tertiary">
                            {product.images_count} image(s)
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm">{product.vendor_business}</p>
                          <p className="text-xs text-dark-text-tertiary">
                            @{product.vendor_name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">{product.category_name}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(product.price_xaf)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold ${
                            product.stock_quantity > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={product.is_active ? 'success' : 'error'}>
                          {product.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-dark-text-tertiary">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Voir */}
                          <Link to={`/product/${product.id}`} target="_blank">
                            <button
                              className="p-2 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all"
                              title="Voir le produit"
                            >
                              <Eye size={16} />
                            </button>
                          </Link>

                          {/* Activer/Désactiver */}
                          <button
                            onClick={() => handleToggleStatus(product)}
                            disabled={actionLoading === product.id}
                            className={`p-2 rounded-lg glass border border-white/10 transition-all ${
                              product.is_active
                                ? 'hover:border-yellow-500 hover:text-yellow-400'
                                : 'hover:border-green-500 hover:text-green-400'
                            }`}
                            title={product.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {actionLoading === product.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : product.is_active ? (
                              <Ban size={16} />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={actionLoading === product.id}
                            className="p-2 rounded-lg glass border border-white/10 hover:border-red-500 hover:text-red-400 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}