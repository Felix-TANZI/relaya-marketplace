// frontend/src/features/admin/catalog/AdminBrandsPage.tsx
// Gestion complète des Marques — Admin BelivaY
//
// Fonctionnalités :
//   - Tabs : Toutes / Vérifiées / En attente / Inactives (avec compteurs)
//   - Filtres : recherche, has_masters, tri
//   - Actions individuelles : verify/unverify, activate/deactivate, edit, delete
//   - Actions bulk : verify, unverify, activate, deactivate, MERGE
//   - Modale detail : logo, stats, fiches liées, actions contextuelles
//   - Modale create/edit : upload logo, tous les champs
//   - Modale merge : sélection cible + preview des fiches à réassigner
//   - Export CSV

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import {
  Search, Check, X, RefreshCw, Eye, ExternalLink,
  Award, Plus, Download, Upload,
  Merge, Trash2, Edit3, Globe, ImageIcon,
  AlertTriangle, BadgeCheck,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminBrand,
  type AdminBrandDetail,
  type BrandListFilters,
  type BrandUpdatePayload,
} from "@/services/api/admin";

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

type TabKey = "all" | "verified" | "pending" | "inactive";

const TAB_LABEL_KEYS: Record<TabKey, string> = {
  all: "ad3_brands.tab_all",
  verified: "ad3_brands.tab_verified",
  pending: "ad3_brands.tab_pending",
  inactive: "ad3_brands.tab_inactive",
};

const TAB_COLORS: Record<TabKey, string> = {
  all: "#6B7280",
  verified: "#059669",
  pending: "#F59E0B",
  inactive: "#9CA3AF",
};

// ═════════════════════════════════════════════════════════════════════════════
// UTILS
// ═════════════════════════════════════════════════════════════════════════════

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const filtersFromTab = (tab: TabKey): BrandListFilters => {
  switch (tab) {
    case "verified": return { is_verified: true };
    case "pending": return { is_verified: false, is_active: true };
    case "inactive": return { is_active: false };
    default: return {};
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminBrandsPage() {
  const T = useAdminTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // ── State données ───────────────────────────────────────────────────
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ all: 0, verified: 0, pending: 0, inactive: 0 });

  // ── State filtres ───────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [hasMasters, setHasMasters] = useState<"any" | "yes" | "no">("any");
  const [ordering, setOrdering] = useState<string>("-is_verified,name");

  // ── State UI ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editBrand, setEditBrand] = useState<AdminBrandDetail | null | "new">(null);
  const [mergeMode, setMergeMode] = useState(false);

  // ── Chargement liste ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BrandListFilters = { ...filtersFromTab(tab), ordering };
      if (search.trim()) filters.search = search.trim();
      if (hasMasters === "yes") filters.has_masters = true;
      else if (hasMasters === "no") filters.has_masters = false;

      const data = await adminApi.listBrands(filters);
      setBrands(data);
      setSelectedIds(new Set());
    } catch {
      showToast(t("ad3_brands.toast_error_load"), "error");
    } finally {
      setLoading(false);
    }
  }, [tab, search, hasMasters, ordering, showToast, t]);

  useEffect(() => { load(); }, [load]);

  // ── Compteurs tabs (recalculés à chaque changement de liste) ────────
  const loadCounts = useCallback(async () => {
    try {
      const [all, verified, pending, inactive] = await Promise.all([
        adminApi.listBrands({}),
        adminApi.listBrands({ is_verified: true }),
        adminApi.listBrands({ is_verified: false, is_active: true }),
        adminApi.listBrands({ is_active: false }),
      ]);
      setCounts({
        all: all.length, verified: verified.length,
        pending: pending.length, inactive: inactive.length,
      });
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts, brands.length]);

  // ── Actions individuelles ───────────────────────────────────────────
  const handleVerify = async (b: AdminBrand) => {
    try { await adminApi.verifyBrand(b.id); showToast(t("ad3_brands.toast_verified", { name: b.name }), "success"); load(); }
    catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
  };
  const handleUnverify = async (b: AdminBrand) => {
    try { await adminApi.unverifyBrand(b.id); showToast(t("ad3_brands.toast_unverified", { name: b.name }), "success"); load(); }
    catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
  };
  const handleActivate = async (b: AdminBrand) => {
    try { await adminApi.activateBrand(b.id); showToast(t("ad3_brands.toast_activated", { name: b.name }), "success"); load(); }
    catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
  };
  const handleDeactivate = async (b: AdminBrand) => {
    const ok = await confirm({
      title: t("ad3_brands.confirm_deactivate_title", { name: b.name }),
      message: t("ad3_brands.confirm_deactivate_message"),
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.deactivateBrand(b.id); showToast(t("ad3_brands.toast_deactivated", { name: b.name }), "success"); load(); }
    catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
  };
  const handleDelete = async (b: AdminBrand) => {
    const ok = await confirm({
      title: t("ad3_brands.confirm_delete_title", { name: b.name }),
      message: b.master_products_count > 0
        ? t(b.master_products_count > 1 ? "ad3_brands.confirm_delete_blocked_message_plural" : "ad3_brands.confirm_delete_blocked_message", { count: b.master_products_count })
        : t("ad3_brands.confirm_delete_safe_message"),
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteBrand(b.id);
      showToast(t("ad3_brands.toast_deleted", { name: b.name }), "success");
      load();
    } catch (err: unknown) {
      const message = (err as { detail?: string })?.detail
        ?? t("ad3_brands.error_delete_blocked_fallback");
      showToast(message, "error");
    }
  };

  // ── Bulk actions ────────────────────────────────────────────────────
  const bulkAction = async (
    label: string,
    fn: (ids: number[]) => Promise<{ updated_count: number }>,
    warning?: boolean,
  ) => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: t(selectedIds.size > 1 ? "ad3_brands.bulk_confirm_title_plural" : "ad3_brands.bulk_confirm_title", { label, count: selectedIds.size }),
      message: t("ad3_brands.bulk_confirm_message"),
      type: warning ? "warning" : "info",
    });
    if (!ok) return;
    try {
      const res = await fn(Array.from(selectedIds));
      showToast(t(res.updated_count > 1 ? "ad3_brands.toast_bulk_success_plural" : "ad3_brands.toast_bulk_success", { count: res.updated_count }), "success");
      load();
    } catch { showToast(t("ad3_brands.toast_error_bulk"), "error"); }
  };

  // ── Sélection ───────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === brands.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(brands.map((b) => b.id)));
  };

  // ── Merge mode ──────────────────────────────────────────────────────
  const selectedBrandsForMerge = useMemo(
    () => brands.filter((b) => selectedIds.has(b.id)),
    [brands, selectedIds],
  );

  const openMerge = () => {
    if (selectedIds.size < 2) {
      showToast(t("ad3_brands.toast_merge_min_two"), "warning");
      return;
    }
    setMergeMode(true);
  };

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const url = adminApi.exportBrandsCsvUrl(filtersFromTab(tab));
    // Ouvre dans un nouvel onglet — le browser gère le téléchargement grâce
    // au header Content-Disposition
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Header T={T} counts={counts}
        onCreateNew={() => setEditBrand("new")}
        onExport={handleExportCsv}
        onRefresh={load} loading={loading} />

      {/* Tabs */}
      <TabsBar T={T} tab={tab} setTab={setTab} counts={counts} />

      {/* Toolbar */}
      <Toolbar
        T={T} search={search} setSearch={setSearch}
        hasMasters={hasMasters} setHasMasters={setHasMasters}
        ordering={ordering} setOrdering={setOrdering}
        selectedCount={selectedIds.size}
        onBulkVerify={() => bulkAction(t("ad3_brands.bulk_btn_verify"), adminApi.bulkVerifyBrands)}
        onBulkUnverify={() => bulkAction(t("ad3_brands.bulk_confirm_label_unverify"), adminApi.bulkUnverifyBrands)}
        onBulkActivate={() => bulkAction(t("ad3_brands.bulk_btn_activate"), adminApi.bulkActivateBrands)}
        onBulkDeactivate={() => bulkAction(t("ad3_brands.bulk_btn_deactivate"), adminApi.bulkDeactivateBrands, true)}
        onOpenMerge={openMerge}
      />

      {/* Tableau */}
      <BrandsTable
        T={T} brands={brands} loading={loading}
        selectedIds={selectedIds}
        onToggle={toggleSelect} onToggleAll={toggleSelectAll}
        onDetail={setDetailId}
        onEdit={async (b) => {
          try {
            const detail = await adminApi.getBrandDetail(b.id);
            setEditBrand(detail);
          } catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
        }}
        onVerify={handleVerify} onUnverify={handleUnverify}
        onActivate={handleActivate} onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />

      {/* Modale detail */}
      {detailId !== null && (
        <BrandDetailModal
          brandId={detailId}
          onClose={() => setDetailId(null)}
          onModified={() => { setDetailId(null); load(); }}
          onEdit={(d) => { setDetailId(null); setEditBrand(d); }}
        />
      )}

      {/* Modale create/edit */}
      {editBrand !== null && (
        <BrandFormModal
          brand={editBrand === "new" ? null : editBrand}
          onClose={() => setEditBrand(null)}
          onSaved={() => { setEditBrand(null); load(); }}
        />
      )}

      {/* Modale merge */}
      {mergeMode && (
        <BrandMergeModal
          candidates={selectedBrandsForMerge}
          onClose={() => setMergeMode(false)}
          onMerged={() => { setMergeMode(false); load(); }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HEADER
// ═════════════════════════════════════════════════════════════════════════════

function Header({ T, counts, onCreateNew, onExport, onRefresh, loading }: {
  T: AdminTokens;
  counts: { pending: number; all: number };
  onCreateNew: () => void; onExport: () => void; onRefresh: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
          color: T.text, marginBottom: 4,
        }}>{t("ad3_brands.header_title")}</h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          {counts.pending > 0 && (
            <>
              <strong style={{ color: TAB_COLORS.pending }}>
                {t(counts.pending > 1 ? "ad3_brands.header_pending_label_plural" : "ad3_brands.header_pending_label", { count: counts.pending })}
              </strong>{" · "}
            </>
          )}
          {t(counts.all > 1 ? "ad3_brands.header_total_label_plural" : "ad3_brands.header_total_label", { count: counts.all })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onRefresh} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: T.cardAlt, color: T.muted,
          border: `1px solid ${T.border}`, cursor: "pointer",
        }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {t("ad3_brands.btn_refresh")}
        </button>
        <button onClick={onExport} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: T.cardAlt, color: T.text,
          border: `1px solid ${T.border}`, cursor: "pointer",
        }}>
          <Download size={12} /> {t("ad3_brands.btn_export_csv")}
        </button>
        <button onClick={onCreateNew} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: T.red, color: "#fff",
          border: "none", cursor: "pointer",
        }}>
          <Plus size={12} /> {t("ad3_brands.btn_new_brand")}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TABS
// ═════════════════════════════════════════════════════════════════════════════

function TabsBar({ T, tab, setTab, counts }: {
  T: AdminTokens; tab: TabKey; setTab: (t: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {(["all", "verified", "pending", "inactive"] as TabKey[]).map((k) => {
        const isActive = tab === k;
        const count = counts[k] ?? 0;
        const color = TAB_COLORS[k];
        return (
          <button key={k} onClick={() => setTab(k)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: isActive ? T.red : T.cardAlt,
            color: isActive ? "#fff" : T.text,
            border: `1px solid ${isActive ? T.red : T.border}`, cursor: "pointer",
          }}>
            {t(TAB_LABEL_KEYS[k])}
            <span style={{
              background: isActive ? "rgba(255,255,255,0.25)" : color + "22",
              color: isActive ? "#fff" : color,
              padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 800,
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOLBAR
// ═════════════════════════════════════════════════════════════════════════════

function Toolbar({
  T, search, setSearch, hasMasters, setHasMasters, ordering, setOrdering,
  selectedCount,
  onBulkVerify, onBulkUnverify, onBulkActivate, onBulkDeactivate, onOpenMerge,
}: {
  T: AdminTokens; search: string; setSearch: (s: string) => void;
  hasMasters: "any" | "yes" | "no"; setHasMasters: (v: "any" | "yes" | "no") => void;
  ordering: string; setOrdering: (o: string) => void;
  selectedCount: number;
  onBulkVerify: () => void; onBulkUnverify: () => void;
  onBulkActivate: () => void; onBulkDeactivate: () => void;
  onOpenMerge: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
        <Search size={14} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: T.muted, pointerEvents: "none",
        }} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("ad3_brands.search_placeholder")}
          style={{
            width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10,
            fontSize: 12.5, background: T.input, color: T.text,
            border: `1px solid ${T.inputBorder}`, outline: "none",
          }}
        />
      </div>

      <select value={hasMasters}
        onChange={(e) => setHasMasters(e.target.value as "any" | "yes" | "no")}
        style={{
          padding: "9px 12px", borderRadius: 10, fontSize: 12,
          background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
          outline: "none", cursor: "pointer",
        }}>
        <option value="any">{t("ad3_brands.filter_has_masters_any")}</option>
        <option value="yes">{t("ad3_brands.filter_has_masters_yes")}</option>
        <option value="no">{t("ad3_brands.filter_has_masters_no")}</option>
      </select>

      <select value={ordering}
        onChange={(e) => setOrdering(e.target.value)}
        style={{
          padding: "9px 12px", borderRadius: 10, fontSize: 12,
          background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
          outline: "none", cursor: "pointer",
        }}>
        <option value="-is_verified,name">{t("ad3_brands.sort_verified_first")}</option>
        <option value="name">{t("ad3_brands.sort_name_asc")}</option>
        <option value="-name">{t("ad3_brands.sort_name_desc")}</option>
        <option value="-created_at">{t("ad3_brands.sort_recent_first")}</option>
        <option value="-_masters_count">{t("ad3_brands.sort_most_used_first")}</option>
      </select>

      {selectedCount > 0 && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", background: T.red + "15",
            borderRadius: 20, border: `1px solid ${T.red}30`,
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red }}>
              {t(selectedCount > 1 ? "ad3_brands.selected_count_plural" : "ad3_brands.selected_count", { count: selectedCount })}
            </span>
          </div>
          <BulkActionButton icon={BadgeCheck} label={t("ad3_brands.bulk_btn_verify")} onClick={onBulkVerify} color={TAB_COLORS.verified} T={T} />
          <BulkActionButton icon={X} label={t("ad3_brands.bulk_btn_unverify")} onClick={onBulkUnverify} color={TAB_COLORS.pending} T={T} />
          <BulkActionButton icon={Check} label={t("ad3_brands.bulk_btn_activate")} onClick={onBulkActivate} color={TAB_COLORS.verified} T={T} />
          <BulkActionButton icon={X} label={t("ad3_brands.bulk_btn_deactivate")} onClick={onBulkDeactivate} color={"#DC2626"} T={T} />
          {selectedCount >= 2 && (
            <BulkActionButton icon={Merge} label={t("ad3_brands.bulk_btn_merge")} onClick={onOpenMerge} color={T.blue} T={T} />
          )}
        </>
      )}
    </div>
  );
}

function BulkActionButton({ icon: Icon, label, onClick, color }: {
  icon: React.ElementType; label: string; onClick: () => void;
  color: string; T: AdminTokens;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "8px 12px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
      background: color + "18", color, border: `1px solid ${color}44`,
      cursor: "pointer",
    }}>
      <Icon size={11} /> {label}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TABLEAU
// ═════════════════════════════════════════════════════════════════════════════

function BrandsTable({
  T, brands, loading, selectedIds,
  onToggle, onToggleAll, onDetail, onEdit,
  onVerify, onUnverify, onActivate, onDeactivate, onDelete,
}: {
  T: AdminTokens; brands: AdminBrand[]; loading: boolean;
  selectedIds: Set<number>;
  onToggle: (id: number) => void; onToggleAll: () => void;
  onDetail: (id: number) => void; onEdit: (b: AdminBrand) => void;
  onVerify: (b: AdminBrand) => void; onUnverify: (b: AdminBrand) => void;
  onActivate: (b: AdminBrand) => void; onDeactivate: (b: AdminBrand) => void;
  onDelete: (b: AdminBrand) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      overflow: "hidden",
    }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          {t("ad3_brands.loading")}
        </div>
      ) : brands.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
          <Award size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>{t("ad3_brands.empty_state")}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead>
              <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: "12px 16px", width: 40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size === brands.length && brands.length > 0}
                    onChange={onToggleAll} />
                </th>
                <TH>{t("ad3_brands.col_brand")}</TH>
                <TH>{t("ad3_brands.col_origin")}</TH>
                <TH>{t("ad3_brands.col_masters")}</TH>
                <TH>{t("ad3_brands.col_status")}</TH>
                <TH>{t("ad3_brands.col_proposed_by")}</TH>
                <TH>{t("ad3_brands.col_actions")}</TH>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <BrandRow key={b.id} brand={b} T={T}
                  isSelected={selectedIds.has(b.id)}
                  onToggle={() => onToggle(b.id)}
                  onDetail={() => onDetail(b.id)} onEdit={() => onEdit(b)}
                  onVerify={() => onVerify(b)} onUnverify={() => onUnverify(b)}
                  onActivate={() => onActivate(b)} onDeactivate={() => onDeactivate(b)}
                  onDelete={() => onDelete(b)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "12px 16px", textAlign: "left", fontSize: 11,
      fontWeight: 700, textTransform: "uppercase", color: "#6B7280",
      letterSpacing: "0.05em",
    }}>{children}</th>
  );
}

function BrandRow({
  brand, T, isSelected, onToggle, onDetail, onEdit,
  onVerify, onUnverify, onActivate, onDeactivate, onDelete,
}: {
  brand: AdminBrand; T: AdminTokens; isSelected: boolean;
  onToggle: () => void; onDetail: () => void; onEdit: () => void;
  onVerify: () => void; onUnverify: () => void;
  onActivate: () => void; onDeactivate: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <tr style={{
      borderBottom: `1px solid ${T.border}`,
      background: isSelected ? T.cardAlt : T.card,
    }}>
      <td style={{ padding: "12px 16px" }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
      </td>

      {/* Marque : logo + nom + slug */}
      <td style={{ padding: "12px 16px", minWidth: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BrandLogo src={brand.logo_url} T={T} size={44} name={brand.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.3,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {brand.name}
              {brand.is_verified && (
                <BadgeCheck size={14} style={{ color: TAB_COLORS.verified }} />
              )}
            </div>
            <div style={{ fontSize: 10.5, color: T.mutedL, marginTop: 3, fontFamily: "monospace" }}>
              {brand.slug}
            </div>
          </div>
        </div>
      </td>

      {/* Origine */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: T.text }}>
        {brand.country_of_origin ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={11} color={T.muted} />
            {brand.country_of_origin}
          </div>
        ) : (
          <span style={{ color: T.mutedL }}>—</span>
        )}
      </td>

      {/* Nb fiches */}
      <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: T.text }}>
        {brand.master_products_count}
        {brand.active_masters_count !== brand.master_products_count && (
          <span style={{ fontSize: 10, color: T.mutedL, marginLeft: 4 }}>
            {t("ad3_brands.row_active_masters_suffix", { count: brand.active_masters_count })}
          </span>
        )}
      </td>

      {/* Statuts */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {brand.is_verified ? (
            <StatusPill color={TAB_COLORS.verified} label={t("ad3_brands.status_verified")} icon={BadgeCheck} />
          ) : (
            <StatusPill color={TAB_COLORS.pending} label={t("ad3_brands.status_pending")} />
          )}
          {!brand.is_active && (
            <StatusPill color={TAB_COLORS.inactive} label={t("ad3_brands.status_inactive")} />
          )}
        </div>
      </td>

      {/* Proposée par */}
      <td style={{ padding: "12px 16px", fontSize: 11.5, color: T.text }}>
        {brand.proposed_by ? (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ color: T.muted }}>@</span>{brand.proposed_by}
          </span>
        ) : (
          <span style={{ color: T.mutedL, fontStyle: "italic" }}>{t("ad3_brands.proposed_by_admin_fallback")}</span>
        )}
      </td>

      {/* Actions */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn onClick={onDetail} title={t("ad3_brands.action_details")} icon={Eye} T={T} />
          <ActionBtn onClick={onEdit} title={t("ad3_brands.action_edit")} icon={Edit3} T={T} />
          {!brand.is_verified ? (
            <ActionBtn onClick={onVerify} title={t("ad3_brands.action_verify")} icon={BadgeCheck}
              T={T} color={TAB_COLORS.verified} />
          ) : (
            <ActionBtn onClick={onUnverify} title={t("ad3_brands.action_unverify")} icon={X}
              T={T} color={TAB_COLORS.pending} />
          )}
          {brand.is_active ? (
            <ActionBtn onClick={onDeactivate} title={t("ad3_brands.action_deactivate")} icon={X}
              T={T} color="#DC2626" />
          ) : (
            <ActionBtn onClick={onActivate} title={t("ad3_brands.action_activate")} icon={Check}
              T={T} color={TAB_COLORS.verified} />
          )}
          {brand.master_products_count === 0 && (
            <ActionBtn onClick={onDelete} title={t("ad3_brands.action_delete")} icon={Trash2}
              T={T} color="#DC2626" />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ onClick, title, icon: Icon, T, color }: {
  onClick: () => void; title: string; icon: React.ElementType;
  T: AdminTokens; color?: string;
}) {
  const c = color ?? T.text;
  return (
    <button onClick={onClick} title={title} style={{
      padding: "6px 7px", borderRadius: 7,
      background: color ? c + "18" : T.cardAlt,
      color: c,
      border: `1px solid ${color ? c + "44" : T.border}`,
      cursor: "pointer",
      display: "flex", alignItems: "center",
    }}>
      <Icon size={12} />
    </button>
  );
}

function StatusPill({ color, label, icon: Icon }: {
  color: string; label: string; icon?: React.ElementType;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: color + "18", color, textTransform: "uppercase",
      letterSpacing: "0.03em",
    }}>
      {Icon && <Icon size={10} />} {label}
    </span>
  );
}

function BrandLogo({ src, T, size = 40, name }: {
  src: string | null; T: AdminTokens; size?: number; name: string;
}) {
  if (src) {
    return (
      <img src={src} alt={name} style={{
        width: size, height: size, borderRadius: 8, objectFit: "cover",
        border: `1px solid ${T.border}`, background: "#fff",
        flexShrink: 0, padding: 4,
      }} />
    );
  }
  // Placeholder avec initiale
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: T.cardAlt, border: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 800, color: T.muted,
    }}>{name.charAt(0).toUpperCase()}</div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE DETAIL
// ═════════════════════════════════════════════════════════════════════════════

function BrandDetailModal({ brandId, onClose, onModified, onEdit }: {
  brandId: number;
  onClose: () => void; onModified: () => void;
  onEdit: (d: AdminBrandDetail) => void;
}) {
  const T = useAdminTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<AdminBrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Chargement initial avec AbortController pour éviter le set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    adminApi.getBrandDetail(brandId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) showToast(t("ad3_brands.toast_error_load_detail"), "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [brandId, showToast, t]);

  const doAction = async (fn: () => Promise<AdminBrandDetail>, msg: string) => {
    try {
      const updated = await fn();
      setDetail(updated);
      showToast(msg, "success");
      onModified();
    } catch { showToast(t("ad3_brands.toast_error_generic"), "error"); }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: t("ad3_brands.confirm_delete_detail_title", { name: detail.name }),
      message: t("ad3_brands.confirm_action_definitive"),
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteBrand(detail.id);
      showToast(t("ad3_brands.toast_deleted", { name: detail.name }), "success");
      onClose();
      onModified();
    } catch (err: unknown) {
      const message = (err as { detail?: string })?.detail
        ?? t("ad3_brands.error_delete_blocked_fallback_short");
      showToast(message, "error");
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 960, maxHeight: "92vh", overflow: "auto",
        background: T.card, borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {loading || !detail ? (
          <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            {t("ad3_brands.loading")}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "24px 28px", borderBottom: `1px solid ${T.border}`,
              background: T.cardAlt, borderRadius: "20px 20px 0 0",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <BrandLogo src={detail.logo_url} T={T} size={80} name={detail.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>
                  {detail.name}
                  {detail.is_verified && (
                    <BadgeCheck size={20} style={{
                      color: TAB_COLORS.verified, marginLeft: 8, verticalAlign: "middle",
                    }} />
                  )}
                </h2>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <code style={{
                    fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                    color: T.text, fontFamily: "monospace", border: `1px solid ${T.border}`,
                  }}>{detail.slug}</code>
                  {detail.is_verified
                    ? <StatusPill color={TAB_COLORS.verified} label={t("ad3_brands.status_verified")} icon={BadgeCheck} />
                    : <StatusPill color={TAB_COLORS.pending} label={t("ad3_brands.status_pending")} />}
                  {!detail.is_active && <StatusPill color={TAB_COLORS.inactive} label={t("ad3_brands.status_inactive")} />}
                  {detail.proposed_by && (
                    <span style={{ fontSize: 11.5, color: T.muted }}>
                      {t("ad3_brands.detail_proposed_by")} <strong style={{ color: T.text }}>@{detail.proposed_by}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} style={{
                padding: 8, borderRadius: 10, background: T.card,
                border: `1px solid ${T.border}`, cursor: "pointer",
                display: "flex", alignItems: "center",
              }}><X size={16} color={T.muted} /></button>
            </div>

            {/* Body */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24,
              padding: "24px 28px",
            }}>
              {/* Colonne gauche : info + stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {detail.description && (
                  <ModalSection title={t("ad3_brands.section_description")} T={T}>
                    <p style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                      {detail.description}
                    </p>
                  </ModalSection>
                )}

                <ModalSection title={t("ad3_brands.section_information")} T={T}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <InfoRow label={t("ad3_brands.label_country_of_origin")} value={detail.country_of_origin || "—"} T={T} />
                    <InfoRow
                      label={t("ad3_brands.label_website")}
                      value={detail.website ? (
                        <a href={detail.website} target="_blank" rel="noreferrer"
                          style={{ color: T.red, textDecoration: "none" }}>
                          {detail.website} <ExternalLink size={10} style={{ verticalAlign: "middle" }} />
                        </a>
                      ) : "—"}
                      T={T}
                    />
                    <InfoRow label={t("ad3_brands.label_created_at")} value={fmtDate(detail.created_at)} T={T} />
                    <InfoRow label={t("ad3_brands.label_updated_at")} value={fmtDate(detail.updated_at)} T={T} />
                  </div>
                </ModalSection>

                <ModalSection title={t("ad3_brands.section_statistics")} T={T}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                    background: T.cardAlt, padding: 14, borderRadius: 12,
                  }}>
                    <StatCell label={t("ad3_brands.stat_total_masters")} value={detail.stats.total_masters}
                      sub={detail.stats.active_masters !== detail.stats.total_masters
                        ? t("ad3_brands.stat_approved_suffix", { count: detail.stats.active_masters }) : undefined} T={T} />
                    <StatCell label={t("ad3_brands.stat_total_offers")} value={detail.stats.total_offers}
                      sub={detail.stats.approved_offers !== detail.stats.total_offers
                        ? t("ad3_brands.stat_approved_suffix", { count: detail.stats.approved_offers }) : undefined} T={T} />
                    <StatCell label={t("ad3_brands.stat_distinct_vendors")} value={detail.stats.distinct_vendors} T={T} />
                    <StatCell label={t("ad3_brands.stat_deletion_status")}
                      value={detail.is_deletable ? t("ad3_brands.stat_deletable_possible") : t("ad3_brands.stat_deletable_blocked")}
                      T={T} color={detail.is_deletable ? TAB_COLORS.verified : "#DC2626"} />
                  </div>
                </ModalSection>

                {detail.admin_note && (
                  <ModalSection title={t("ad3_brands.section_admin_note")} T={T}>
                    <div style={{
                      background: T.cardAlt, padding: 12, borderRadius: 10,
                      fontSize: 12.5, color: T.text, fontStyle: "italic",
                      borderLeft: `3px solid ${T.muted}`,
                    }}>« {detail.admin_note} »</div>
                  </ModalSection>
                )}
              </div>

              {/* Colonne droite : fiches attachées */}
              <div>
                <ModalSection title={t("ad3_brands.section_attached_masters", { count: detail.master_products.length })} T={T}>
                  {detail.master_products.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                      {t("ad3_brands.empty_no_masters")}
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 8,
                      maxHeight: 500, overflowY: "auto",
                    }}>
                      {detail.master_products.map((m) => (
                        <MasterCard key={m.id} master={m} T={T} />
                      ))}
                    </div>
                  )}
                </ModalSection>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{
              padding: "20px 28px", borderTop: `1px solid ${T.border}`,
              background: T.cardAlt, borderRadius: "0 0 20px 20px",
              display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => onEdit(detail)} style={btnStyle(T.text, T.card, T)}>
                  <Edit3 size={13} /> {t("ad3_brands.action_edit")}
                </button>
                {detail.is_verified ? (
                  <button onClick={() => doAction(() => adminApi.unverifyBrand(detail.id), t("ad3_brands.detail_toast_unverified"))}
                    style={btnStyle(TAB_COLORS.pending, T.card, T)}>
                    <X size={13} /> {t("ad3_brands.bulk_btn_unverify")}
                  </button>
                ) : (
                  <button onClick={() => doAction(() => adminApi.verifyBrand(detail.id), t("ad3_brands.detail_toast_verified"))}
                    style={btnStyle(TAB_COLORS.verified, T.card, T)}>
                    <BadgeCheck size={13} /> {t("ad3_brands.bulk_btn_verify")}
                  </button>
                )}
                {detail.is_active ? (
                  <button onClick={() => doAction(() => adminApi.deactivateBrand(detail.id), t("ad3_brands.detail_toast_deactivated"))}
                    style={btnStyle("#DC2626", T.card, T)}>
                    <X size={13} /> {t("ad3_brands.bulk_btn_deactivate")}
                  </button>
                ) : (
                  <button onClick={() => doAction(() => adminApi.activateBrand(detail.id), t("ad3_brands.detail_toast_activated"))}
                    style={btnStyle(TAB_COLORS.verified, T.card, T)}>
                    <Check size={13} /> {t("ad3_brands.bulk_btn_activate")}
                  </button>
                )}
              </div>
              <div>
                {detail.is_deletable && (
                  <button onClick={handleDelete} style={btnStyle("#DC2626", T.card, T, true)}>
                    <Trash2 size={13} /> {t("ad3_brands.action_delete")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(color: string, bg: string, T: AdminTokens, filled = false): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
    background: filled ? color : bg,
    color: filled ? "#fff" : color,
    border: filled ? "none" : `1px solid ${color}44`,
    cursor: "pointer",
  };
}

function ModalSection({ title, T, children }: {
  title: string; T: AdminTokens; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, T }: {
  label: string; value: React.ReactNode; T: AdminTokens;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12.5,
    }}>
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ color: T.text, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatCell({ label, value, sub, T, color }: {
  label: string; value: number | string; sub?: string; T: AdminTokens; color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color ?? T.text, marginTop: 2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9.5, color: T.mutedL, marginTop: 1 }}>{sub}</div>
      )}
    </div>
  );
}

function MasterCard({ master, T }: {
  master: AdminBrandDetail["master_products"][number]; T: AdminTokens;
}) {
  const { t } = useTranslation();
  return (
    <Link to={`/product/${master.slug}`} target="_blank" style={{
      display: "flex", alignItems: "center", gap: 10, padding: 10,
      background: T.cardAlt, borderRadius: 10, textDecoration: "none",
      border: `1px solid ${T.border}`,
    }}>
      {master.primary_image ? (
        <img src={master.primary_image} alt="" style={{
          width: 40, height: 40, borderRadius: 6, objectFit: "cover",
          border: `1px solid ${T.border}`, flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: 6, background: T.card,
          border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}><ImageIcon size={16} color={T.mutedL} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
          {master.title}
        </div>
        <div style={{ fontSize: 10.5, color: T.muted, marginTop: 3, display: "flex", gap: 6, alignItems: "center" }}>
          <span>{master.category_name}</span>
          <span>·</span>
          <span>{t(master.offers_count > 1 ? "ad3_brands.offers_count_plural" : "ad3_brands.offers_count", { count: master.offers_count })}</span>
          {master.moderation_status !== "APPROVED" && (
            <StatusPill color={TAB_COLORS.pending} label={master.moderation_status} />
          )}
        </div>
      </div>
      <ExternalLink size={11} color={T.mutedL} />
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE CREATE / EDIT
// ═════════════════════════════════════════════════════════════════════════════

function BrandFormModal({ brand, onClose, onSaved }: {
  brand: AdminBrandDetail | null;   // null = création
  onClose: () => void; onSaved: () => void;
}) {
  const T = useAdminTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isEdit = brand !== null;

  const [form, setForm] = useState<BrandUpdatePayload>({
    name: brand?.name ?? "",
    description: brand?.description ?? "",
    country_of_origin: brand?.country_of_origin ?? "",
    website: brand?.website ?? "",
    is_active: brand?.is_active ?? true,
    is_verified: brand?.is_verified ?? true,
    admin_note: brand?.admin_note ?? "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brand?.logo_url ?? null);
  const [busy, setBusy] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void ensureImageUnderLimit(file).then((compressed) => {
      setLogoFile(compressed);
      setLogoPreview(URL.createObjectURL(compressed));
    });
  };

  const handleSubmit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      showToast(t("ad3_brands.validation_name_too_short"), "warning");
      return;
    }
    setBusy(true);
    try {
      const payload: BrandUpdatePayload = { ...form };
      if (logoFile) payload.logo = logoFile;
      if (isEdit) {
        await adminApi.updateBrand(brand.id, payload);
        showToast(t("ad3_brands.toast_updated"), "success");
      } else {
        await adminApi.createBrand(payload);
        showToast(t("ad3_brands.toast_created"), "success");
      }
      onSaved();
    } catch (err: unknown) {
      const detail = (err as { detail?: string; name?: string[] })?.detail
        ?? (err as { name?: string[] })?.name?.[0]
        ?? t("ad3_brands.error_save_fallback");
      showToast(detail, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 110, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 600, maxHeight: "92vh", overflow: "auto",
        background: T.card, borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "20px 20px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
            {isEdit ? t("ad3_brands.form_title_edit", { name: brand.name }) : t("ad3_brands.btn_new_brand")}
          </h2>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer", display: "flex",
          }}><X size={16} color={T.muted} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Logo upload */}
          <FormField label={t("ad3_brands.field_logo")} T={T}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BrandLogo src={logoPreview} T={T} size={80} name={form.name || "?"} />
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`,
                cursor: "pointer",
              }}>
                <Upload size={12} /> {t("ad3_brands.btn_choose_file")}
                <input type="file" accept="image/*" onChange={handleLogoChange}
                  style={{ display: "none" }} />
              </label>
            </div>
          </FormField>

          <FormField label={t("ad3_brands.field_name")} T={T}>
            <TextInput value={form.name ?? ""}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder={t("ad3_brands.placeholder_name_example")} T={T} />
          </FormField>

          <FormField label={t("ad3_brands.field_description")} T={T}>
            <TextArea value={form.description ?? ""}
              onChange={(v) => setForm({ ...form, description: v })}
              rows={3}
              placeholder={t("ad3_brands.placeholder_description")}
              T={T} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label={t("ad3_brands.label_country_of_origin")} T={T}>
              <TextInput value={form.country_of_origin ?? ""}
                onChange={(v) => setForm({ ...form, country_of_origin: v })}
                placeholder={t("ad3_brands.placeholder_country_example")} T={T} />
            </FormField>
            <FormField label={t("ad3_brands.field_website_official")} T={T}>
              <TextInput value={form.website ?? ""}
                onChange={(v) => setForm({ ...form, website: v })}
                placeholder="https://..." T={T} />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <Toggle label={t("ad3_brands.toggle_verified")}
              value={!!form.is_verified}
              onChange={(v) => setForm({ ...form, is_verified: v })} T={T} />
            <Toggle label={t("ad3_brands.toggle_active")}
              value={!!form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })} T={T} />
          </div>

          <FormField label={t("ad3_brands.field_admin_note")} T={T}>
            <TextArea value={form.admin_note ?? ""}
              onChange={(v) => setForm({ ...form, admin_note: v })}
              rows={2}
              placeholder={t("ad3_brands.placeholder_admin_note_example")}
              T={T} />
          </FormField>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 26px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={btnStyle(T.text, T.card, T)}>{t("ad3_brands.btn_cancel")}</button>
          <button onClick={handleSubmit} disabled={busy}
            style={{ ...btnStyle(T.red, T.card, T, true), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? t("ad3_brands.btn_save") : t("ad3_brands.btn_create")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FORM UTILS
// ═════════════════════════════════════════════════════════════════════════════

function FormField({ label, T, children }: {
  label: string; T: AdminTokens; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 10.5, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, T }: {
  value: string; onChange: (v: string) => void; placeholder?: string; T: AdminTokens;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
        background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
        outline: "none",
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, T }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  rows?: number; T: AdminTokens;
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
        background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
        outline: "none", resize: "vertical", fontFamily: "inherit",
      }}
    />
  );
}

function Toggle({ label, value, onChange, T }: {
  label: string; value: boolean; onChange: (v: boolean) => void; T: AdminTokens;
}) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
      padding: "8px 12px", borderRadius: 10, background: T.cardAlt,
      border: `1px solid ${T.border}`,
    }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{label}</span>
    </label>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE MERGE
// ═════════════════════════════════════════════════════════════════════════════

function BrandMergeModal({ candidates, onClose, onMerged }: {
  candidates: AdminBrand[];
  onClose: () => void; onMerged: () => void;
}) {
  const T = useAdminTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [targetId, setTargetId] = useState<number | null>(
    candidates.find((b) => b.is_verified)?.id ?? candidates[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);

  const target = candidates.find((b) => b.id === targetId);
  const sources = candidates.filter((b) => b.id !== targetId);
  const totalMasters = sources.reduce((sum, b) => sum + b.master_products_count, 0);

  const canMerge = target?.is_verified && sources.length > 0;

  const handleMerge = async () => {
    if (!target || sources.length === 0) return;
    const ok = await confirm({
      title: t(sources.length > 1 ? "ad3_brands.confirm_merge_title_plural" : "ad3_brands.confirm_merge_title", { count: sources.length, name: target.name }),
      message: t(totalMasters > 1 ? "ad3_brands.confirm_merge_message_plural" : "ad3_brands.confirm_merge_message", { count: totalMasters }),
      type: "warning",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await adminApi.mergeBrands({
        target_id: target.id,
        source_ids: sources.map((b) => b.id),
      });
      showToast(
        `${t(res.masters_reassigned > 1 ? "ad3_brands.toast_merge_reassigned_plural" : "ad3_brands.toast_merge_reassigned", { count: res.masters_reassigned, name: res.target_name })} ${t(res.sources_deleted > 1 ? "ad3_brands.toast_merge_deleted_plural" : "ad3_brands.toast_merge_deleted", { count: res.sources_deleted })}`,
        "success",
      );
      onMerged();
    } catch (err: unknown) {
      const detail = (err as { detail?: string; target_id?: string[] })?.detail
        ?? (err as { target_id?: string[] })?.target_id?.[0]
        ?? t("ad3_brands.error_merge_fallback");
      showToast(detail, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 110, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 720, maxHeight: "92vh", overflow: "auto",
        background: T.card, borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "20px 20px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 800, color: T.text, margin: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Merge size={18} /> {t("ad3_brands.merge_modal_title")}
          </h2>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer", display: "flex",
          }}><X size={16} color={T.muted} /></button>
        </div>

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Sélection de la cible */}
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10,
            }}>
              {t("ad3_brands.merge_choose_target_label")}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidates.map((b) => (
                <label key={b.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 12,
                  borderRadius: 12, cursor: "pointer",
                  background: targetId === b.id ? T.red + "15" : T.cardAlt,
                  border: `2px solid ${targetId === b.id ? T.red : T.border}`,
                }}>
                  <input type="radio" checked={targetId === b.id}
                    onChange={() => setTargetId(b.id)} />
                  <BrandLogo src={b.logo_url} T={T} size={40} name={b.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.name}</span>
                      {b.is_verified && <BadgeCheck size={14} color={TAB_COLORS.verified} />}
                      {!b.is_verified && (
                        <StatusPill color={TAB_COLORS.pending} label={t("ad3_brands.status_not_verified")} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                      {t(b.master_products_count > 1 ? "ad3_brands.merge_candidate_masters_count_plural" : "ad3_brands.merge_candidate_masters_count", { count: b.master_products_count })}
                      {b.country_of_origin && ` · ${b.country_of_origin}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Warning si cible non vérifiée */}
          {target && !target.is_verified && (
            <div style={{
              padding: 12, background: TAB_COLORS.pending + "18",
              borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start",
              border: `1px solid ${TAB_COLORS.pending}44`,
            }}>
              <AlertTriangle size={14} color={TAB_COLORS.pending} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: T.text }}>
                {t("ad3_brands.merge_target_must_be_pre")} <strong>{t("ad3_brands.merge_target_verified_word")}</strong> {t("ad3_brands.merge_target_must_be_post")}
                {" "}<strong>{target.name}</strong> {t("ad3_brands.merge_target_must_be_tail")}
              </div>
            </div>
          )}

          {/* Récap */}
          {target && sources.length > 0 && (
            <div style={{
              padding: 14, background: T.cardAlt, borderRadius: 12,
              border: `1px solid ${T.border}`,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
              }}>{t("ad3_brands.merge_summary_title")}</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>
                <div>→ <strong style={{ color: TAB_COLORS.verified }}>{target.name}</strong> {t("ad3_brands.merge_summary_becomes_canonical")}</div>
                <div>→ <strong>{totalMasters}</strong> {t(totalMasters > 1 ? "ad3_brands.merge_summary_masters_reassigned_plural" : "ad3_brands.merge_summary_masters_reassigned")}</div>
                <div>→ <strong style={{ color: "#DC2626" }}>{sources.length}</strong> {t(sources.length > 1 ? "ad3_brands.merge_summary_sources_deleted_plural" : "ad3_brands.merge_summary_sources_deleted")} {sources.map((s) => s.name).join(", ")}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "16px 26px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={btnStyle(T.text, T.card, T)}>{t("ad3_brands.btn_cancel")}</button>
          <button onClick={handleMerge} disabled={!canMerge || busy}
            style={{
              ...btnStyle(T.red, T.card, T, true),
              opacity: canMerge && !busy ? 1 : 0.5,
              cursor: canMerge && !busy ? "pointer" : "not-allowed",
            }}>
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Merge size={13} />}
            {t("ad3_brands.bulk_btn_merge")}
          </button>
        </div>
      </div>
    </div>
  );
}