// frontend/src/features/admin/VendorsManagementPage.tsx
// Page d'administration des vendeurs

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ban,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { adminApi } from "@/services/api/admin";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import type { VendorProfile } from "@/services/api/vendors";

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export default function VendorsManagementPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<VendorStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listVendors(filterStatus || undefined);
      setVendors(data);
    } catch (error) {
      console.error("Erreur chargement vendeurs:", error);
      showToast(t("admin.errorLoadingVendors"), "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, showToast, t]);

  useEffect(() => {
    loadVendors();
  }, [filterStatus, loadVendors]);

  const handleApprove = async (vendor: VendorProfile) => {
    const confirmed = await confirm({
      title: t("admin.approveVendorTitle"),
      message: t("admin.approveVendorMessage", { name: vendor.business_name }),
      type: "success",
      confirmText: t("admin.approve"),
      cancelText: t("admin.cancelAction"),
    });

    if (!confirmed) return;

    try {
      setActionLoading(vendor.id);
      await adminApi.approveVendor(vendor.id);
      showToast(t("admin.vendorApproved"), "success");
      loadVendors();
    } catch (error) {
      console.error("Erreur approbation:", error);
      showToast(t("admin.errorApproving"), "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (vendor: VendorProfile) => {
    const confirmed = await confirm({
      title: t("admin.rejectVendorTitle"),
      message: t("admin.rejectVendorMessage", { name: vendor.business_name }),
      type: "danger",
      confirmText: t("admin.reject"),
      cancelText: t("admin.cancelAction"),
    });

    if (!confirmed) return;

    try {
      setActionLoading(vendor.id);
      await adminApi.rejectVendor(vendor.id);
      showToast(t("admin.vendorRejected"), "success");
      loadVendors();
    } catch (error) {
      console.error("Erreur rejet:", error);
      showToast(t("admin.errorRejecting"), "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (vendor: VendorProfile) => {
    const confirmed = await confirm({
      title: t("admin.suspendVendorTitle"),
      message: t("admin.suspendVendorMessage", { name: vendor.business_name }),
      type: "warning",
      confirmText: t("admin.suspend"),
      cancelText: t("admin.cancelAction"),
    });

    if (!confirmed) return;

    try {
      setActionLoading(vendor.id);
      await adminApi.suspendVendor(vendor.id);
      showToast(t("admin.vendorSuspended"), "success");
      loadVendors();
    } catch (error) {
      console.error("Erreur suspension:", error);
      showToast(t("admin.errorSuspending"), "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: VendorStatus) => {
    switch (status) {
      case "PENDING":
        return { variant: "warning" as const, text: t("admin.statusPending"), icon: Clock };
      case "APPROVED":
        return {
          variant: "success" as const,
          text: t("admin.statusApproved"),
          icon: CheckCircle,
        };
      case "REJECTED":
        return { variant: "error" as const, text: t("admin.statusRejected"), icon: XCircle };
      case "SUSPENDED":
        return { variant: "default" as const, text: t("admin.statusSuspended"), icon: Ban };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Filtrer par recherche
  const filteredVendors = vendors.filter((vendor) => {
    const query = searchQuery.toLowerCase();
    return (
      vendor.business_name.toLowerCase().includes(query) ||
      vendor.username.toLowerCase().includes(query) ||
      vendor.email.toLowerCase().includes(query) ||
      vendor.phone.toLowerCase().includes(query)
    );
  });

  // Statistiques
  const stats = {
    total: vendors.length,
    pending: vendors.filter((v) => v.status === "PENDING").length,
    approved: vendors.filter((v) => v.status === "APPROVED").length,
    rejected: vendors.filter((v) => v.status === "REJECTED").length,
    suspended: vendors.filter((v) => v.status === "SUSPENDED").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t("admin.loadingVendors")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-2">
            <span className="text-gradient animate-gradient-bg">
              {t("admin.vendorsManagement")}
            </span>
          </h1>
          <p className="text-dark-text-secondary">
            {t("admin.vendorsManagementDescription")}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="text-center">
            <p className="text-dark-text-tertiary text-sm mb-1">{t("admin.total")}</p>
            <p className="font-display font-bold text-3xl text-dark-text">
              {stats.total}
            </p>
          </Card>
          <Card className="text-center border-yellow-500/30">
            <p className="text-dark-text-tertiary text-sm mb-1">{t("admin.statusPending")}</p>
            <p className="font-display font-bold text-3xl text-yellow-400">
              {stats.pending}
            </p>
          </Card>
          <Card className="text-center border-green-500/30">
            <p className="text-dark-text-tertiary text-sm mb-1">{t("admin.approved")}</p>
            <p className="font-display font-bold text-3xl text-green-400">
              {stats.approved}
            </p>
          </Card>
          <Card className="text-center border-red-500/30">
            <p className="text-dark-text-tertiary text-sm mb-1">{t("admin.rejected")}</p>
            <p className="font-display font-bold text-3xl text-red-400">
              {stats.rejected}
            </p>
          </Card>
          <Card className="text-center border-gray-500/30">
            <p className="text-dark-text-tertiary text-sm mb-1">{t("admin.suspended")}</p>
            <p className="font-display font-bold text-3xl text-gray-400">
              {stats.suspended}
            </p>
          </Card>
        </div>

        {/* Filtres */}
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
                placeholder={t("admin.searchVendorsPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-colors"
              />
            </div>

            {/* Filtre statut */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-dark-text-tertiary" />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as VendorStatus | "")
                }
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-colors"
              >
                <option value="">{t("admin.allStatuses")}</option>
                <option value="PENDING">{t("admin.statusPending")}</option>
                <option value="APPROVED">{t("admin.approved")}</option>
                <option value="REJECTED">{t("admin.rejected")}</option>
                <option value="SUSPENDED">{t("admin.suspended")}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Liste vendeurs */}
        {filteredVendors.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="mx-auto mb-4 text-dark-text-tertiary" size={48} />
            <p className="text-dark-text-secondary">
              {searchQuery ? t("admin.noVendorsFound") : t("admin.noVendors")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVendors.map((vendor) => {
              const statusBadge = getStatusBadge(vendor.status as VendorStatus);
              const isLoading = actionLoading === vendor.id;

              return (
                <Card key={vendor.id} padding="none">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-display font-bold text-xl text-dark-text">
                            {vendor.business_name}
                          </h3>
                          <Badge
                            variant={statusBadge.variant}
                            className="flex items-center gap-1"
                          >
                            <statusBadge.icon size={12} />
                            {statusBadge.text}
                          </Badge>
                        </div>
                        <p className="text-sm text-dark-text-secondary mb-3">
                          {vendor.business_description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-dark-text-secondary">
                            <Users size={14} />
                            <span>{vendor.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-dark-text-secondary">
                            <Mail size={14} />
                            <span>{vendor.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-dark-text-secondary">
                            <Phone size={14} />
                            <span>{vendor.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-dark-text-secondary">
                            <MapPin size={14} />
                            <span>{vendor.city}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 text-xs text-dark-text-tertiary">
                        <Calendar size={12} />
                        {t("admin.requestFrom")} {formatDate(vendor.created_at)}
                        {vendor.approved_at && (
                          <span className="ml-2">
                            • {t("admin.approvedOn")} {formatDate(vendor.approved_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {vendor.status === "PENDING" && (
                          <>
                            <Button
                              variant="gradient"
                              size="sm"
                              onClick={() => handleApprove(vendor)}
                              disabled={isLoading}
                            >
                              <CheckCircle size={16} />
                              {t("admin.approve")}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReject(vendor)}
                              disabled={isLoading}
                            >
                              <XCircle size={16} />
                              {t("admin.reject")}
                            </Button>
                          </>
                        )}
                        {vendor.status === "APPROVED" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSuspend(vendor)}
                            disabled={isLoading}
                          >
                            <Ban size={16} />
                            {t("admin.suspend")}
                          </Button>
                        )}
                        {vendor.status === "SUSPENDED" && (
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => handleApprove(vendor)}
                            disabled={isLoading}
                          >
                            <CheckCircle size={16} />
                            {t("admin.reactivate")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
