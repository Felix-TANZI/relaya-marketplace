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

const TAB_LABELS: Record<TabKey, string> = {
  all: "Toutes",
  verified: "Vérifiées",
  pending: "Propositions",
  inactive: "Inactives",
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
      showToast("Erreur chargement des marques", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, search, hasMasters, ordering, showToast]);

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
    try { await adminApi.verifyBrand(b.id); showToast(`${b.name} vérifiée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleUnverify = async (b: AdminBrand) => {
    try { await adminApi.unverifyBrand(b.id); showToast(`${b.name} : vérification retirée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleActivate = async (b: AdminBrand) => {
    try { await adminApi.activateBrand(b.id); showToast(`${b.name} activée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleDeactivate = async (b: AdminBrand) => {
    const ok = await confirm({
      title: `Désactiver ${b.name} ?`,
      message: "La marque restera en base mais ne sera plus suggérée aux vendeurs.",
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.deactivateBrand(b.id); showToast(`${b.name} désactivée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleDelete = async (b: AdminBrand) => {
    const ok = await confirm({
      title: `Supprimer définitivement ${b.name} ?`,
      message: b.master_products_count > 0
        ? `⚠️ Cette marque est utilisée par ${b.master_products_count} fiche(s). La suppression sera refusée.`
        : "Aucune fiche ne l'utilise. Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteBrand(b.id);
      showToast(`${b.name} supprimée`, "success");
      load();
    } catch (err: unknown) {
      const message = (err as { detail?: string })?.detail
        ?? "Impossible de supprimer cette marque (elle est utilisée).";
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
      title: `${label} ${selectedIds.size} marque(s) ?`,
      message: "Cette action est immédiate.",
      type: warning ? "warning" : "info",
    });
    if (!ok) return;
    try {
      const res = await fn(Array.from(selectedIds));
      showToast(`${res.updated_count} marque(s) traitée(s)`, "success");
      load();
    } catch { showToast("Erreur bulk action", "error"); }
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
      showToast("Sélectionne au moins 2 marques pour fusionner", "warning");
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
        onBulkVerify={() => bulkAction("Vérifier", adminApi.bulkVerifyBrands)}
        onBulkUnverify={() => bulkAction("Retirer la vérification de", adminApi.bulkUnverifyBrands)}
        onBulkActivate={() => bulkAction("Activer", adminApi.bulkActivateBrands)}
        onBulkDeactivate={() => bulkAction("Désactiver", adminApi.bulkDeactivateBrands, true)}
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
          } catch { showToast("Erreur", "error"); }
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
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
          color: T.text, marginBottom: 4,
        }}>Marques</h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          {counts.pending > 0 && (
            <>
              <strong style={{ color: TAB_COLORS.pending }}>
                {counts.pending} proposition{counts.pending > 1 ? "s" : ""} en attente
              </strong>{" · "}
            </>
          )}
          {counts.all} marque{counts.all > 1 ? "s" : ""} au total
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
          Actualiser
        </button>
        <button onClick={onExport} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: T.cardAlt, color: T.text,
          border: `1px solid ${T.border}`, cursor: "pointer",
        }}>
          <Download size={12} /> Exporter CSV
        </button>
        <button onClick={onCreateNew} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: T.red, color: "#fff",
          border: "none", cursor: "pointer",
        }}>
          <Plus size={12} /> Nouvelle marque
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
            {TAB_LABELS[k]}
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
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
        <Search size={14} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: T.muted, pointerEvents: "none",
        }} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom ou pays..."
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
        <option value="any">Toutes les marques</option>
        <option value="yes">Utilisées uniquement</option>
        <option value="no">Non utilisées uniquement</option>
      </select>

      <select value={ordering}
        onChange={(e) => setOrdering(e.target.value)}
        style={{
          padding: "9px 12px", borderRadius: 10, fontSize: 12,
          background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
          outline: "none", cursor: "pointer",
        }}>
        <option value="-is_verified,name">Vérifiées d'abord</option>
        <option value="name">Nom A → Z</option>
        <option value="-name">Nom Z → A</option>
        <option value="-created_at">Récentes d'abord</option>
        <option value="-_masters_count">Plus utilisées d'abord</option>
      </select>

      {selectedCount > 0 && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", background: T.red + "15",
            borderRadius: 20, border: `1px solid ${T.red}30`,
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red }}>
              {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
            </span>
          </div>
          <BulkActionButton icon={BadgeCheck} label="Vérifier" onClick={onBulkVerify} color={TAB_COLORS.verified} T={T} />
          <BulkActionButton icon={X} label="Retirer ✓" onClick={onBulkUnverify} color={TAB_COLORS.pending} T={T} />
          <BulkActionButton icon={Check} label="Activer" onClick={onBulkActivate} color={TAB_COLORS.verified} T={T} />
          <BulkActionButton icon={X} label="Désactiver" onClick={onBulkDeactivate} color={"#DC2626"} T={T} />
          {selectedCount >= 2 && (
            <BulkActionButton icon={Merge} label="Fusionner" onClick={onOpenMerge} color={T.blue} T={T} />
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
  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      overflow: "hidden",
    }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          Chargement...
        </div>
      ) : brands.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
          <Award size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>Aucune marque dans cet état.</p>
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
                <TH>Marque</TH>
                <TH>Origine</TH>
                <TH>Fiches</TH>
                <TH>Statuts</TH>
                <TH>Proposée par</TH>
                <TH>Actions</TH>
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
            ({brand.active_masters_count} act.)
          </span>
        )}
      </td>

      {/* Statuts */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {brand.is_verified ? (
            <StatusPill color={TAB_COLORS.verified} label="Vérifiée" icon={BadgeCheck} />
          ) : (
            <StatusPill color={TAB_COLORS.pending} label="En attente" />
          )}
          {!brand.is_active && (
            <StatusPill color={TAB_COLORS.inactive} label="Inactive" />
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
          <span style={{ color: T.mutedL, fontStyle: "italic" }}>Admin</span>
        )}
      </td>

      {/* Actions */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn onClick={onDetail} title="Détails" icon={Eye} T={T} />
          <ActionBtn onClick={onEdit} title="Modifier" icon={Edit3} T={T} />
          {!brand.is_verified ? (
            <ActionBtn onClick={onVerify} title="Vérifier" icon={BadgeCheck}
              T={T} color={TAB_COLORS.verified} />
          ) : (
            <ActionBtn onClick={onUnverify} title="Retirer vérification" icon={X}
              T={T} color={TAB_COLORS.pending} />
          )}
          {brand.is_active ? (
            <ActionBtn onClick={onDeactivate} title="Désactiver" icon={X}
              T={T} color="#DC2626" />
          ) : (
            <ActionBtn onClick={onActivate} title="Activer" icon={Check}
              T={T} color={TAB_COLORS.verified} />
          )}
          {brand.master_products_count === 0 && (
            <ActionBtn onClick={onDelete} title="Supprimer" icon={Trash2}
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
      .catch(() => { if (!cancelled) showToast("Erreur chargement", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [brandId, showToast]);

  const doAction = async (fn: () => Promise<AdminBrandDetail>, msg: string) => {
    try {
      const updated = await fn();
      setDetail(updated);
      showToast(msg, "success");
      onModified();
    } catch { showToast("Erreur", "error"); }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Supprimer ${detail.name} ?`,
      message: "Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteBrand(detail.id);
      showToast(`${detail.name} supprimée`, "success");
      onClose();
      onModified();
    } catch (err: unknown) {
      const message = (err as { detail?: string })?.detail
        ?? "Impossible (marque utilisée).";
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
            Chargement...
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
                    ? <StatusPill color={TAB_COLORS.verified} label="Vérifiée" icon={BadgeCheck} />
                    : <StatusPill color={TAB_COLORS.pending} label="En attente" />}
                  {!detail.is_active && <StatusPill color={TAB_COLORS.inactive} label="Inactive" />}
                  {detail.proposed_by && (
                    <span style={{ fontSize: 11.5, color: T.muted }}>
                      Proposée par <strong style={{ color: T.text }}>@{detail.proposed_by}</strong>
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
                  <ModalSection title="Description" T={T}>
                    <p style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                      {detail.description}
                    </p>
                  </ModalSection>
                )}

                <ModalSection title="Informations" T={T}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <InfoRow label="Pays d'origine" value={detail.country_of_origin || "—"} T={T} />
                    <InfoRow
                      label="Site web"
                      value={detail.website ? (
                        <a href={detail.website} target="_blank" rel="noreferrer"
                          style={{ color: T.red, textDecoration: "none" }}>
                          {detail.website} <ExternalLink size={10} style={{ verticalAlign: "middle" }} />
                        </a>
                      ) : "—"}
                      T={T}
                    />
                    <InfoRow label="Créée le" value={fmtDate(detail.created_at)} T={T} />
                    <InfoRow label="Modifiée le" value={fmtDate(detail.updated_at)} T={T} />
                  </div>
                </ModalSection>

                <ModalSection title="Statistiques" T={T}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                    background: T.cardAlt, padding: 14, borderRadius: 12,
                  }}>
                    <StatCell label="Fiches maîtres" value={detail.stats.total_masters}
                      sub={detail.stats.active_masters !== detail.stats.total_masters
                        ? `${detail.stats.active_masters} approuvées` : undefined} T={T} />
                    <StatCell label="Offres cumulées" value={detail.stats.total_offers}
                      sub={detail.stats.approved_offers !== detail.stats.total_offers
                        ? `${detail.stats.approved_offers} approuvées` : undefined} T={T} />
                    <StatCell label="Vendeurs distincts" value={detail.stats.distinct_vendors} T={T} />
                    <StatCell label="Statut suppression"
                      value={detail.is_deletable ? "Possible" : "Bloquée"}
                      T={T} color={detail.is_deletable ? TAB_COLORS.verified : "#DC2626"} />
                  </div>
                </ModalSection>

                {detail.admin_note && (
                  <ModalSection title="Note admin" T={T}>
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
                <ModalSection title={`Fiches maîtres attachées (${detail.master_products.length})`} T={T}>
                  {detail.master_products.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                      Aucune fiche n'utilise encore cette marque.
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
                  <Edit3 size={13} /> Modifier
                </button>
                {detail.is_verified ? (
                  <button onClick={() => doAction(() => adminApi.unverifyBrand(detail.id), "Vérification retirée")}
                    style={btnStyle(TAB_COLORS.pending, T.card, T)}>
                    <X size={13} /> Retirer ✓
                  </button>
                ) : (
                  <button onClick={() => doAction(() => adminApi.verifyBrand(detail.id), "Marque vérifiée")}
                    style={btnStyle(TAB_COLORS.verified, T.card, T)}>
                    <BadgeCheck size={13} /> Vérifier
                  </button>
                )}
                {detail.is_active ? (
                  <button onClick={() => doAction(() => adminApi.deactivateBrand(detail.id), "Marque désactivée")}
                    style={btnStyle("#DC2626", T.card, T)}>
                    <X size={13} /> Désactiver
                  </button>
                ) : (
                  <button onClick={() => doAction(() => adminApi.activateBrand(detail.id), "Marque activée")}
                    style={btnStyle(TAB_COLORS.verified, T.card, T)}>
                    <Check size={13} /> Activer
                  </button>
                )}
              </div>
              <div>
                {detail.is_deletable && (
                  <button onClick={handleDelete} style={btnStyle("#DC2626", T.card, T, true)}>
                    <Trash2 size={13} /> Supprimer
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
          <span>{master.offers_count} offre{master.offers_count > 1 ? "s" : ""}</span>
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
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      showToast("Nom trop court (min 2 caractères)", "warning");
      return;
    }
    setBusy(true);
    try {
      const payload: BrandUpdatePayload = { ...form };
      if (logoFile) payload.logo = logoFile;
      if (isEdit) {
        await adminApi.updateBrand(brand.id, payload);
        showToast("Marque mise à jour", "success");
      } else {
        await adminApi.createBrand(payload);
        showToast("Marque créée", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const detail = (err as { detail?: string; name?: string[] })?.detail
        ?? (err as { name?: string[] })?.name?.[0]
        ?? "Erreur lors de l'enregistrement";
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
            {isEdit ? `Modifier ${brand.name}` : "Nouvelle marque"}
          </h2>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer", display: "flex",
          }}><X size={16} color={T.muted} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Logo upload */}
          <FormField label="Logo" T={T}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BrandLogo src={logoPreview} T={T} size={80} name={form.name || "?"} />
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`,
                cursor: "pointer",
              }}>
                <Upload size={12} /> Choisir un fichier
                <input type="file" accept="image/*" onChange={handleLogoChange}
                  style={{ display: "none" }} />
              </label>
            </div>
          </FormField>

          <FormField label="Nom *" T={T}>
            <TextInput value={form.name ?? ""}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Ex : Samsung" T={T} />
          </FormField>

          <FormField label="Description" T={T}>
            <TextArea value={form.description ?? ""}
              onChange={(v) => setForm({ ...form, description: v })}
              rows={3}
              placeholder="Présentation courte de la marque"
              T={T} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Pays d'origine" T={T}>
              <TextInput value={form.country_of_origin ?? ""}
                onChange={(v) => setForm({ ...form, country_of_origin: v })}
                placeholder="Ex : Corée du Sud" T={T} />
            </FormField>
            <FormField label="Site officiel" T={T}>
              <TextInput value={form.website ?? ""}
                onChange={(v) => setForm({ ...form, website: v })}
                placeholder="https://..." T={T} />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <Toggle label="Marque vérifiée"
              value={!!form.is_verified}
              onChange={(v) => setForm({ ...form, is_verified: v })} T={T} />
            <Toggle label="Marque active"
              value={!!form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })} T={T} />
          </div>

          <FormField label="Note interne (admin)" T={T}>
            <TextArea value={form.admin_note ?? ""}
              onChange={(v) => setForm({ ...form, admin_note: v })}
              rows={2}
              placeholder="Ex : 'À fusionner avec Samsung', 'Faux positif'..."
              T={T} />
          </FormField>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 26px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={btnStyle(T.text, T.card, T)}>Annuler</button>
          <button onClick={handleSubmit} disabled={busy}
            style={{ ...btnStyle(T.red, T.card, T, true), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? "Enregistrer" : "Créer"}
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
      title: `Fusionner ${sources.length} marque(s) dans ${target.name} ?`,
      message: `${totalMasters} fiche(s) maître(s) seront réassignée(s). Les marques sources seront supprimées définitivement.`,
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
        `${res.masters_reassigned} fiche(s) réassignée(s) à ${res.target_name}. ${res.sources_deleted} marque(s) supprimée(s).`,
        "success",
      );
      onMerged();
    } catch (err: unknown) {
      const detail = (err as { detail?: string; target_id?: string[] })?.detail
        ?? (err as { target_id?: string[] })?.target_id?.[0]
        ?? "Erreur fusion";
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
            <Merge size={18} /> Fusion de marques
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
              Choisir la marque cible (qui subsistera)
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
                        <StatusPill color={TAB_COLORS.pending} label="Non vérifiée" />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                      {b.master_products_count} fiche(s)
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
                La marque cible doit être <strong>vérifiée</strong> pour permettre la fusion.
                Marque d'abord <strong>{target.name}</strong> comme vérifiée.
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
              }}>Résumé de la fusion</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>
                <div>→ <strong style={{ color: TAB_COLORS.verified }}>{target.name}</strong> devient la marque canonique</div>
                <div>→ <strong>{totalMasters}</strong> fiche(s) maître(s) seront rebasculée(s)</div>
                <div>→ <strong style={{ color: "#DC2626" }}>{sources.length}</strong> marque(s) supprimée(s) : {sources.map((s) => s.name).join(", ")}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "16px 26px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={btnStyle(T.text, T.card, T)}>Annuler</button>
          <button onClick={handleMerge} disabled={!canMerge || busy}
            style={{
              ...btnStyle(T.red, T.card, T, true),
              opacity: canMerge && !busy ? 1 : 0.5,
              cursor: canMerge && !busy ? "pointer" : "not-allowed",
            }}>
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Merge size={13} />}
            Fusionner
          </button>
        </div>
      </div>
    </div>
  );
}