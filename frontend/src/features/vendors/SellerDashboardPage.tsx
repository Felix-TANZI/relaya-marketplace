// frontend/src/features/vendors/SellerDashboardPage.tsx
// Dashboard principal pour les vendeurs

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import {
  vendorsApi,
  type VendorProfile,
  type VendorStats,
  type VendorProduct,
} from "@/services/api/vendors";
import { useToast } from "@/context/ToastContext";

export default function SellerDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger le profil
      const profileData = await vendorsApi.getProfile();
      setProfile(profileData);

      // Si approuvé, charger les stats et produits
      if (profileData.status === "APPROVED") {
        const [statsData, productsData] = await Promise.all([
          vendorsApi.getStats(),
          vendorsApi.getProducts(),
        ]);
        setStats(statsData);
        setProducts(productsData);
      }
    } catch (err: unknown) {
      console.error("Erreur chargement dashboard:", err);
      if (err instanceof Error && err.message?.includes("404")) {
        // Pas de profil vendeur, rediriger vers l'inscription
        navigate("/become-seller");
      } else {
        setError(t("vendor.errorLoadingDashboard"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm(t("vendor.confirmDeleteProduct"))) return;

    try {
      await vendorsApi.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      showToast(t("vendor.productDeleted"), "success");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast(t("vendor.errorDeleting"), "error");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          variant: "warning" as const,
          icon: <Clock size={16} />,
          text: t("vendor.statusPending"),
        };
      case "APPROVED":
        return {
          variant: "success" as const,
          icon: <CheckCircle size={16} />,
          text: t("vendor.statusApproved"),
        };
      case "REJECTED":
        return {
          variant: "danger" as const,
          icon: <XCircle size={16} />,
          text: t("vendor.statusRejected"),
        };
      case "SUSPENDED":
        return {
          variant: "danger" as const,
          icon: <AlertCircle size={16} />,
          text: t("vendor.statusSuspended"),
        };
      default:
        return { variant: "secondary" as const, icon: null, text: status };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t("vendor.loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <Card className="max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="font-bold text-xl text-dark-text mb-2">{t("vendor.error")}</h2>
          <p className="text-dark-text-secondary mb-6">
            {error || t("vendor.unableToLoadDashboard")}
          </p>
          <Button variant="gradient" onClick={loadDashboardData}>
            {t("vendor.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  const statusBadge = getStatusBadge(profile.status);

  // Si statut en attente
  if (profile.status === "PENDING") {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-holographic/10 flex items-center justify-center mx-auto mb-6">
              <Clock className="text-holo-cyan" size={40} />
            </div>
            <h1 className="font-display font-bold text-3xl text-dark-text mb-4">
              {t("vendor.requestUnderReview")}
            </h1>
            <p className="text-dark-text-secondary mb-2">
              {t("vendor.reviewingRequest")}
            </p>
            <p className="text-dark-text-tertiary text-sm mb-6">
              {t("vendor.emailNotification")}
            </p>
            <div className="glass border border-white/10 rounded-xl p-6 text-left">
              <h3 className="font-semibold text-dark-text mb-4">
                {t("vendor.yourInfo")}
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-dark-text-tertiary">{t("vendor.business")} :</span>{" "}
                  <span className="text-dark-text">
                    {profile.business_name}
                  </span>
                </p>
                <p>
                  <span className="text-dark-text-tertiary">{t("vendor.city")} :</span>{" "}
                  <span className="text-dark-text">{profile.city}</span>
                </p>
                <p>
                  <span className="text-dark-text-tertiary">{t("vendor.phone")} :</span>{" "}
                  <span className="text-dark-text">{profile.phone}</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Si rejeté ou suspendu
  if (profile.status === "REJECTED" || profile.status === "SUSPENDED") {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-400" size={40} />
            </div>
            <h1 className="font-display font-bold text-3xl text-dark-text mb-4">
              {profile.status === "REJECTED"
                ? t("vendor.requestDenied")
                : t("vendor.accountSuspended")}
            </h1>
            <p className="text-dark-text-secondary mb-6">
              {profile.status === "REJECTED"
                ? t("vendor.requestDeniedMessage")
                : t("vendor.accountSuspendedMessage")}
            </p>
            <Button variant="secondary" onClick={() => navigate("/contact")}>
              {t("vendor.contactSupport")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard pour vendeur approuvé
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-4xl mb-2">
              <span className="text-gradient animate-gradient-bg">
                {t("vendor.vendorDashboard")}
              </span>
            </h1>
            <p className="text-dark-text-secondary">
              {t("vendor.welcome")}{" "}
              <span className="text-dark-text font-semibold">
                {profile.business_name}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" className="flex items-center gap-2">
              {statusBadge.icon}
              {statusBadge.text}
            </Badge>
            <Link to="/seller/products/new">
              <Button variant="gradient">
                <Plus size={20} />
                {t("vendor.newProduct")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    {t("vendor.totalProducts")}
                  </p>
                  <p className="font-display font-bold text-3xl text-dark-text">
                    {stats.total_products}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center">
                  <Package className="text-holo-cyan" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    {t("vendor.activeProducts")}
                  </p>
                  <p className="font-display font-bold text-3xl text-dark-text">
                    {stats.active_products}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center">
                  <TrendingUp className="text-holo-purple" size={24} />
                </div>
              </div>
            </Card>

            <Link to="/seller/orders">
              <Card className="hover:border-holo-pink transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-text-tertiary text-sm mb-1">
                      {t("vendor.orders")}
                    </p>
                    <p className="font-display font-bold text-3xl text-dark-text">
                      {stats.total_orders}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center">
                    <ShoppingBag className="text-holo-pink" size={24} />
                  </div>
                </div>
              </Card>
            </Link>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-text-tertiary text-sm mb-1">
                    {t("vendor.totalRevenue")}
                  </p>
                  <p className="font-display font-bold text-3xl text-dark-text">
                    {parseFloat(stats.total_revenue).toLocaleString()} XAF
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="text-green-400" size={24} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Liste des produits */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-dark-text">
              {t("vendor.myProducts")}
            </h2>
            <Link to="/seller/products/new">
              <Button variant="secondary" size="sm">
                <Plus size={18} />
                {t("vendor.add")}
              </Button>
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package
                className="text-dark-text-tertiary mx-auto mb-4"
                size={48}
              />
              <p className="text-dark-text-secondary mb-6">
                {t("vendor.noProducts")}
              </p>
              <Link to="/seller/products/new">
                <Button variant="gradient">
                  <Plus size={20} />
                  {t("vendor.createFirstProduct")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-dark-text-secondary text-sm font-medium">
                      {t("vendor.product")}
                    </th>
                    <th className="text-left py-3 px-4 text-dark-text-secondary text-sm font-medium">
                      {t("vendor.price")}
                    </th>
                    <th className="text-left py-3 px-4 text-dark-text-secondary text-sm font-medium">
                      {t("vendor.stock")}
                    </th>
                    <th className="text-left py-3 px-4 text-dark-text-secondary text-sm font-medium">
                      {t("vendor.status")}
                    </th>
                    <th className="text-right py-3 px-4 text-dark-text-secondary text-sm font-medium">
                      {t("vendor.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-dark-text">
                          {product.title}
                        </p>
                        <p className="text-sm text-dark-text-tertiary line-clamp-1">
                          {product.description}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-dark-text">
                          {product.price_xaf.toLocaleString()} XAF
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p
                          className={`font-medium ${product.stock_quantity > 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {product.stock_quantity}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={product.is_active ? "success" : "default"}
                        >
                          {product.is_active ? t("vendor.active") : t("vendor.inactive")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/product/${product.id}`}>
                            <button className="p-2 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all">
                              <Eye size={16} />
                            </button>
                          </Link>
                          <Link to={`/seller/products/${product.id}/edit`}>
                            <button className="p-2 rounded-lg glass border border-white/10 hover:border-holo-purple transition-all">
                              <Edit2 size={16} />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 rounded-lg glass border border-white/10 hover:border-red-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
