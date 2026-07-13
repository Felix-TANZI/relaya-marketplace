// frontend/src/features/admin/catalog/AdminVariantsPage.tsx
// Modération des Variants — Admin BelivaY (v2 pro)
//
// UX améliorée :
//   - Configuration visuelle : pastilles couleur (COLORDICT) + pill badges
//   - Filtres avancés : catégorie parente, sous-catégorie, recherche
//   - Modale de détail 2 colonnes : image + config + stats + siblings + offres
//     enrichies (nom vendeur, username, boutique, tous cliquables)
//   - Historique de modération complet, actions avec commentaire

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search, Check, X, RefreshCw, Eye, ExternalLink, Package,
  Filter, ChevronDown, Store, Calendar, DollarSign,
  Layers, Tag, TrendingUp, AlertCircle, ImageIcon,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminVariant,
  type AdminVariantDetail,
  type AdminVariantOffer,
  type AdminVariantResolvedAxis,
  type AdminVariantSibling,
  type VariantModerationFilters,
} from "@/services/api/admin";
import { colorsApi, type ColorDictionaryEntry } from "@/services/api/colors";
import { categoriesApi, type CategoryTreeNode } from "@/services/api/categories";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

type StatusTab = "all" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  APPROVED: "#059669",
  REJECTED: "#DC2626",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

// ═════════════════════════════════════════════════════════════════════════════
// UTILS
// ═════════════════════════════════════════════════════════════════════════════

const fmtXAF = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toLocaleString("fr-FR")} FCFA`;

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const vendorFullName = (o: AdminVariantOffer) => {
  const parts = [o.vendor_first_name, o.vendor_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (o.vendor_username ?? "—");
};

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminVariantsPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // ── State données ───────────────────────────────────────────────────
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorDict, setColorDict] = useState<Record<string, ColorDictionaryEntry>>({});
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);

  // ── State filtres ───────────────────────────────────────────────────
  const [tab, setTab] = useState<StatusTab>("PENDING");
  const [search, setSearch] = useState("");
  const [parentCatId, setParentCatId] = useState<number | null>(null);
  const [subCatId, setSubCatId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── State UI ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [counts, setCounts] = useState({ all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 });

  // ── Chargement initial : couleurs + arbre catégories ────────────────
  useEffect(() => {
    colorsApi.list().then((entries) => {
      const map: Record<string, ColorDictionaryEntry> = {};
      for (const e of entries) map[e.slug] = e;
      setColorDict(map);
    }).catch(() => { /* silencieux */ });

    categoriesApi.tree().then(setCategoryTree).catch(() => { /* silencieux */ });
  }, []);

  // ── Chargement variants ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: VariantModerationFilters = {};
      if (tab !== "all") filters.moderation_status = tab;
      if (search.trim()) filters.search = search.trim();
      if (subCatId) filters.category = subCatId;
      else if (parentCatId) filters.parent_category = parentCatId;
      const data = await adminApi.listVariants(filters);
      setVariants(data);
      setSelectedIds(new Set());
    } catch {
      showToast("Erreur chargement des variants", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, search, parentCatId, subCatId, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Compteurs tabs ──────────────────────────────────────────────────
  const loadCounts = useCallback(async () => {
    try {
      const baseFilters: VariantModerationFilters = {};
      if (search.trim()) baseFilters.search = search.trim();
      if (subCatId) baseFilters.category = subCatId;
      else if (parentCatId) baseFilters.parent_category = parentCatId;

      const [all, pending, approved, rejected] = await Promise.all([
        adminApi.listVariants(baseFilters),
        adminApi.listVariants({ ...baseFilters, moderation_status: "PENDING" }),
        adminApi.listVariants({ ...baseFilters, moderation_status: "APPROVED" }),
        adminApi.listVariants({ ...baseFilters, moderation_status: "REJECTED" }),
      ]);
      setCounts({
        all: all.length, PENDING: pending.length,
        APPROVED: approved.length, REJECTED: rejected.length,
      });
    } catch { /* silencieux */ }
  }, [search, parentCatId, subCatId]);

  useEffect(() => { loadCounts(); }, [loadCounts, variants.length]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleApprove = async (v: AdminVariant) => {
    try {
      await adminApi.approveVariant(v.id);
      showToast(`Variant ${v.sku} approuvé`, "success");
      load();
    } catch { showToast("Erreur approbation", "error"); }
  };

  const handleReject = async (v: AdminVariant) => {
    const ok = await confirm({
      title: "Rejeter ce variant ?",
      message: `Le variant ${v.sku} sera rejeté. Les offres rattachées ne seront pas automatiquement rejetées.`,
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.rejectVariant(v.id);
      showToast(`Variant ${v.sku} rejeté`, "success");
      load();
    } catch { showToast("Erreur rejet", "error"); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Approuver ${selectedIds.size} variant(s) ?`,
      message: "Cette action est immédiate.",
      type: "info",
    });
    if (!ok) return;
    try {
      const res = await adminApi.bulkApproveVariants(Array.from(selectedIds));
      showToast(`${res.approved_count} variant(s) approuvé(s)`, "success");
      load();
    } catch { showToast("Erreur bulk approve", "error"); }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Rejeter ${selectedIds.size} variant(s) ?`,
      message: "Cette action est immédiate.",
      type: "warning",
    });
    if (!ok) return;
    try {
      const res = await adminApi.bulkRejectVariants(Array.from(selectedIds));
      showToast(`${res.rejected_count} variant(s) rejeté(s)`, "success");
      load();
    } catch { showToast("Erreur bulk reject", "error"); }
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
    if (selectedIds.size === variants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(variants.map((v) => v.id)));
  };

  // ── Sous-catégories dispos pour le parent sélectionné ──────────────
  const availableSubCats = useMemo(() => {
    if (!parentCatId) return [];
    const parent = categoryTree.find((c) => c.id === parentCatId);
    return parent?.children ?? [];
  }, [parentCatId, categoryTree]);

  // ── Filtres actifs (pour chips) ─────────────────────────────────────
  const activeFilters = useMemo(() => {
    const list: { label: string; onRemove: () => void }[] = [];
    if (parentCatId) {
      const p = categoryTree.find((c) => c.id === parentCatId);
      list.push({
        label: `Catégorie : ${p?.name ?? "?"}`,
        onRemove: () => { setParentCatId(null); setSubCatId(null); },
      });
    }
    if (subCatId) {
      const s = availableSubCats.find((c) => c.id === subCatId);
      list.push({
        label: `Sous-catégorie : ${s?.name ?? "?"}`,
        onRemove: () => setSubCatId(null),
      });
    }
    return list;
  }, [parentCatId, subCatId, categoryTree, availableSubCats]);

  const resetFilters = () => {
    setSearch(""); setParentCatId(null); setSubCatId(null); setShowFilters(false);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* Header */}
      <Header T={T} counts={counts} loading={loading} onRefresh={load} />

      {/* Tabs */}
      <TabsBar T={T} tab={tab} setTab={setTab} counts={counts} />

      {/* Toolbar : recherche + filtres avancés + bulk actions */}
      <Toolbar
        T={T}
        search={search} setSearch={setSearch}
        showFilters={showFilters} setShowFilters={setShowFilters}
        activeFiltersCount={activeFilters.length}
        selectedCount={selectedIds.size}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
      />

      {/* Panel filtres avancés */}
      {showFilters && (
        <FiltersPanel
          T={T}
          categoryTree={categoryTree}
          parentCatId={parentCatId} setParentCatId={setParentCatId}
          subCatId={subCatId} setSubCatId={setSubCatId}
          availableSubCats={availableSubCats}
          onReset={resetFilters}
        />
      )}

      {/* Chips filtres actifs */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
              borderRadius: 20, fontSize: 11.5, fontWeight: 600,
              background: T.red + "15", color: T.red, border: `1px solid ${T.red}30`,
            }}>
              {f.label}
              <button onClick={f.onRemove} style={{
                display: "flex", background: "transparent", border: "none",
                cursor: "pointer", color: T.red, padding: 0,
              }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tableau */}
      <VariantsTable
        T={T}
        variants={variants}
        loading={loading}
        colorDict={colorDict}
        selectedIds={selectedIds}
        onToggle={toggleSelect}
        onToggleAll={toggleSelectAll}
        onDetail={setDetailId}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Modale détail */}
      {detailId !== null && (
        <VariantDetailModal
          variantId={detailId}
          colorDict={colorDict}
          onClose={() => setDetailId(null)}
          onModerated={() => { setDetailId(null); load(); }}
          onSelectSibling={(id) => setDetailId(id)}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HEADER
// ═════════════════════════════════════════════════════════════════════════════

function Header({ T, counts, loading, onRefresh }: {
  T: AdminTokens; counts: { all: number; PENDING: number };
  loading: boolean; onRefresh: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
          color: T.text, marginBottom: 4,
        }}>
          Modération Variants
        </h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          {counts.PENDING > 0 && (
            <>
              <strong style={{ color: STATUS_COLORS.PENDING }}>
                {counts.PENDING} variant{counts.PENDING > 1 ? "s" : ""} en attente
              </strong>
              {" · "}
            </>
          )}
          {counts.all} au total dans le catalogue BelivaY
        </p>
      </div>
      <button onClick={onRefresh} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
        background: T.cardAlt, color: T.muted,
        border: `1px solid ${T.border}`, cursor: "pointer",
      }}>
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        Actualiser
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TABS
// ═════════════════════════════════════════════════════════════════════════════

function TabsBar({ T, tab, setTab, counts }: {
  T: AdminTokens; tab: StatusTab; setTab: (t: StatusTab) => void;
  counts: { all: number; PENDING: number; APPROVED: number; REJECTED: number };
}) {
  const tabs: { key: StatusTab; label: string; color: string }[] = [
    { key: "PENDING", label: STATUS_LABELS.PENDING, color: STATUS_COLORS.PENDING },
    { key: "all", label: "Tous", color: "#6B7280" },
    { key: "APPROVED", label: STATUS_LABELS.APPROVED, color: STATUS_COLORS.APPROVED },
    { key: "REJECTED", label: STATUS_LABELS.REJECTED, color: STATUS_COLORS.REJECTED },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t2) => {
        const isActive = tab === t2.key;
        const count = counts[t2.key] ?? 0;
        return (
          <button key={t2.key} onClick={() => setTab(t2.key)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: isActive ? T.red : T.cardAlt,
            color: isActive ? "#fff" : T.text,
            border: `1px solid ${isActive ? T.red : T.border}`, cursor: "pointer",
          }}>
            {t2.label}
            <span style={{
              background: isActive ? "rgba(255,255,255,0.25)" : t2.color + "22",
              color: isActive ? "#fff" : t2.color,
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
  T, search, setSearch, showFilters, setShowFilters, activeFiltersCount,
  selectedCount, onBulkApprove, onBulkReject,
}: {
  T: AdminTokens; search: string; setSearch: (s: string) => void;
  showFilters: boolean; setShowFilters: (v: boolean) => void;
  activeFiltersCount: number; selectedCount: number;
  onBulkApprove: () => void; onBulkReject: () => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
        <Search size={14} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: T.muted, pointerEvents: "none",
        }} />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="SKU, fiche, valeur d'axe..."
          style={{
            width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10,
            fontSize: 12.5, background: T.input, color: T.text,
            border: `1px solid ${T.inputBorder}`, outline: "none",
          }}
        />
      </div>

      <button onClick={() => setShowFilters(!showFilters)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
        background: activeFiltersCount > 0 ? T.red + "15" : T.cardAlt,
        color: activeFiltersCount > 0 ? T.red : T.text,
        border: `1px solid ${activeFiltersCount > 0 ? T.red + "40" : T.border}`,
        cursor: "pointer",
      }}>
        <Filter size={12} /> Filtres
        {activeFiltersCount > 0 && (
          <span style={{
            background: T.red, color: "#fff", padding: "1px 8px",
            borderRadius: 20, fontSize: 10, fontWeight: 800,
          }}>{activeFiltersCount}</span>
        )}
        <ChevronDown size={12} style={{
          transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }} />
      </button>

      {selectedCount > 0 && (
        <>
          <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
          <button onClick={onBulkApprove} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: STATUS_COLORS.APPROVED, color: "#fff",
            border: "none", cursor: "pointer",
          }}><Check size={12} /> Approuver</button>
          <button onClick={onBulkReject} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: STATUS_COLORS.REJECTED, color: "#fff",
            border: "none", cursor: "pointer",
          }}><X size={12} /> Rejeter</button>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PANEL FILTRES AVANCÉS
// ═════════════════════════════════════════════════════════════════════════════

function FiltersPanel({
  T, categoryTree, parentCatId, setParentCatId, subCatId, setSubCatId,
  availableSubCats, onReset,
}: {
  T: AdminTokens; categoryTree: CategoryTreeNode[];
  parentCatId: number | null; setParentCatId: (id: number | null) => void;
  subCatId: number | null; setSubCatId: (id: number | null) => void;
  availableSubCats: CategoryTreeNode[]; onReset: () => void;
}) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr auto",
      gap: 12, alignItems: "end",
    }}>
      <div>
        <label style={{
          fontSize: 10.5, fontWeight: 700, color: T.muted,
          textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
        }}>Catégorie parente</label>
        <select
          value={parentCatId ?? ""}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : null;
            setParentCatId(v); setSubCatId(null);
          }}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12.5,
            background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
            outline: "none",
          }}
        >
          <option value="">Toutes les catégories</option>
          {categoryTree.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{
          fontSize: 10.5, fontWeight: 700, color: T.muted,
          textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
        }}>Sous-catégorie</label>
        <select
          value={subCatId ?? ""}
          onChange={(e) => setSubCatId(e.target.value ? Number(e.target.value) : null)}
          disabled={!parentCatId || availableSubCats.length === 0}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12.5,
            background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
            outline: "none", opacity: !parentCatId ? 0.5 : 1,
          }}
        >
          <option value="">Toutes les sous-catégories</option>
          {availableSubCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <button onClick={onReset} style={{
        padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
        background: T.cardAlt, color: T.muted,
        border: `1px solid ${T.border}`, cursor: "pointer", whiteSpace: "nowrap",
      }}>Réinitialiser</button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TABLEAU
// ═════════════════════════════════════════════════════════════════════════════

function VariantsTable({
  T, variants, loading, colorDict, selectedIds,
  onToggle, onToggleAll, onDetail, onApprove, onReject,
}: {
  T: AdminTokens; variants: AdminVariant[]; loading: boolean;
  colorDict: Record<string, ColorDictionaryEntry>;
  selectedIds: Set<number>;
  onToggle: (id: number) => void; onToggleAll: () => void;
  onDetail: (id: number) => void;
  onApprove: (v: AdminVariant) => void; onReject: (v: AdminVariant) => void;
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
      ) : variants.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
          <Package size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>Aucun variant dans cet état.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size === variants.length && variants.length > 0}
                    onChange={onToggleAll} />
                </th>
                <TH>Fiche produit</TH>
                <TH>Configuration</TH>
                <TH>SKU</TH>
                <TH>Offres</TH>
                <TH>Buy Box</TH>
                <TH>Statut</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <VariantRow
                  key={v.id} variant={v} T={T} colorDict={colorDict}
                  isSelected={selectedIds.has(v.id)}
                  onToggle={() => onToggle(v.id)}
                  onDetail={() => onDetail(v.id)}
                  onApprove={() => onApprove(v)}
                  onReject={() => onReject(v)}
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

// ═════════════════════════════════════════════════════════════════════════════
// ROW
// ═════════════════════════════════════════════════════════════════════════════

function VariantRow({
  variant, T, colorDict, isSelected, onToggle, onDetail, onApprove, onReject,
}: {
  variant: AdminVariant; T: AdminTokens;
  colorDict: Record<string, ColorDictionaryEntry>;
  isSelected: boolean;
  onToggle: () => void; onDetail: () => void;
  onApprove: () => void; onReject: () => void;
}) {
  const isPending = variant.moderation_status === "PENDING";

  return (
    <tr style={{
      borderBottom: `1px solid ${T.border}`,
      background: isSelected ? T.cardAlt : T.card,
    }}>
      <td style={{ padding: "12px 16px" }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
      </td>

      {/* Fiche produit + breadcrumb */}
      <td style={{ padding: "12px 16px", minWidth: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MasterThumb src={variant.master_primary_image} T={T} size={40} />
          <div style={{ minWidth: 0 }}>
            <Link
              to={`/product/${variant.master_slug}`} target="_blank"
              style={{
                fontSize: 13, fontWeight: 700, color: T.text, textDecoration: "none",
                display: "block", lineHeight: 1.3,
              }}
            >
              {variant.master_title}
              <ExternalLink size={10} style={{ marginLeft: 4, verticalAlign: "middle", color: T.muted }} />
            </Link>
            <div style={{ fontSize: 10.5, color: T.mutedL, marginTop: 3, lineHeight: 1.4 }}>
              {variant.master_category_parent_name && (
                <>{variant.master_category_parent_name} <span style={{ opacity: 0.5 }}>›</span> </>
              )}
              {variant.master_category_name}
            </div>
          </div>
        </div>
      </td>

      {/* Configuration visuelle */}
      <td style={{ padding: "12px 16px", minWidth: 180 }}>
        <VariantConfigChips axes={variant.axes_resolved} colorDict={colorDict} T={T} size="sm" />
      </td>

      {/* SKU */}
      <td style={{ padding: "12px 16px" }}>
        <code style={{
          fontSize: 10.5, color: T.text, background: T.cardAlt,
          padding: "3px 7px", borderRadius: 4, fontFamily: "monospace",
        }}>{variant.sku}</code>
      </td>

      {/* Offres */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>
          {variant.offers_approved_count} <span style={{ color: T.mutedL, fontWeight: 400 }}>/ {variant.offers_count}</span>
        </div>
        {variant.offers_pending_count > 0 && (
          <div style={{ fontSize: 10, color: STATUS_COLORS.PENDING, marginTop: 2 }}>
            {variant.offers_pending_count} en attente
          </div>
        )}
      </td>

      {/* Buy Box */}
      <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: T.text }}>
        {variant.buy_box_price_xaf ? fmtXAF(variant.buy_box_price_xaf) : (
          <span style={{ color: T.mutedL, fontWeight: 400 }}>—</span>
        )}
      </td>

      {/* Statut */}
      <td style={{ padding: "12px 16px" }}>
        <StatusBadge status={variant.moderation_status} />
      </td>

      {/* Actions */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onDetail} title="Détails" style={{
            padding: "6px 8px", borderRadius: 8, background: T.cardAlt,
            color: T.text, border: `1px solid ${T.border}`, cursor: "pointer",
          }}><Eye size={12} /></button>
          {isPending && (
            <>
              <button onClick={onApprove} title="Approuver" style={{
                padding: "6px 8px", borderRadius: 8,
                background: STATUS_COLORS.APPROVED + "18", color: STATUS_COLORS.APPROVED,
                border: `1px solid ${STATUS_COLORS.APPROVED}44`, cursor: "pointer",
              }}><Check size={12} /></button>
              <button onClick={onReject} title="Rejeter" style={{
                padding: "6px 8px", borderRadius: 8,
                background: STATUS_COLORS.REJECTED + "18", color: STATUS_COLORS.REJECTED,
                border: `1px solid ${STATUS_COLORS.REJECTED}44`, cursor: "pointer",
              }}><X size={12} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANT VARIANTCONFIGCHIPS — pastilles couleur + pill badges
// ═════════════════════════════════════════════════════════════════════════════

function VariantConfigChips({ axes, colorDict, T, size = "md" }: {
  axes: AdminVariantResolvedAxis[];
  colorDict: Record<string, ColorDictionaryEntry>;
  T: AdminTokens; size?: "sm" | "md" | "lg";
}) {
  const chipSize = size === "sm" ? 22 : size === "lg" ? 32 : 26;
  const fontSize = size === "sm" ? 10.5 : size === "lg" ? 13 : 11.5;
  const padY = size === "sm" ? 3 : size === "lg" ? 6 : 4;
  const padX = size === "sm" ? 8 : size === "lg" ? 12 : 10;

  if (axes.length === 0) {
    return (
      <span style={{ fontSize: 11, color: T.mutedL, fontStyle: "italic" }}>
        mono-variant
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {axes.map((axis) => {
        const value = axis.value;
        if (value == null) return null;

        // COLORDICT → pastille couleur
        if (axis.values_type === "COLORDICT") {
          const entry = colorDict[String(value)];
          const hex = entry?.hex_code ?? "#E5E7EB";
          const label = entry?.name ?? String(value);
          return (
            <div key={axis.slug}
              title={`${axis.name} : ${label}`}
              style={{
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <div style={{
                width: chipSize, height: chipSize, borderRadius: "50%",
                background: hex,
                border: `2px solid ${T.border}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                position: "relative", flexShrink: 0,
              }} />
              {size !== "sm" && (
                <span style={{ fontSize, fontWeight: 600, color: T.text }}>
                  {label}
                </span>
              )}
            </div>
          );
        }

        // SELECT / NUMBER / TEXT → pill badge
        return (
          <div key={axis.slug}
            title={`${axis.name} : ${value}${axis.unit ? " " + axis.unit : ""}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: `${padY}px ${padX}px`, borderRadius: 8,
              fontSize, fontWeight: 700,
              background: T.orange + "18", color: T.orange,
              border: `1px solid ${T.orange}30`,
              whiteSpace: "nowrap",
            }}>
            {String(value)}{axis.unit && ` ${axis.unit}`}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, size = "md" }: {
  status: "PENDING" | "APPROVED" | "REJECTED"; size?: "sm" | "md";
}) {
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 9.5 : 10.5;
  return (
    <span style={{
      display: "inline-block", padding: pad, borderRadius: 20,
      fontSize: fs, fontWeight: 700, background: color + "18", color,
      textTransform: "uppercase", letterSpacing: "0.03em",
    }}>{label}</span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THUMBNAIL DU MASTER
// ═════════════════════════════════════════════════════════════════════════════

function MasterThumb({ src, T, size = 48 }: {
  src: string | null; T: AdminTokens; size?: number;
}) {
  if (!src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: T.cardAlt, border: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <ImageIcon size={size * 0.4} color={T.mutedL} />
      </div>
    );
  }
  return (
    <img src={src} alt="" style={{
      width: size, height: size, borderRadius: 8, objectFit: "cover",
      border: `1px solid ${T.border}`, flexShrink: 0,
      background: T.cardAlt,
    }} />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE DE DÉTAIL — 2 colonnes
// ═════════════════════════════════════════════════════════════════════════════

function VariantDetailModal({
  variantId, colorDict, onClose, onModerated, onSelectSibling,
}: {
  variantId: number;
  colorDict: Record<string, ColorDictionaryEntry>;
  onClose: () => void;
  onModerated: () => void;
  onSelectSibling: (id: number) => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<AdminVariantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setReason("");
    adminApi.getVariantDetail(variantId)
      .then((d) => {
        setDetail(d);
        if (modalRef.current) modalRef.current.scrollTop = 0;
      })
      .catch(() => showToast("Erreur chargement détail", "error"))
      .finally(() => setLoading(false));
  }, [variantId, showToast]);

  const doApprove = async () => {
    if (!detail) return;
    setBusy("approve");
    try {
      await adminApi.approveVariant(detail.id, reason);
      showToast("Variant approuvé", "success");
      onModerated();
    } catch { showToast("Erreur approbation", "error"); }
    finally { setBusy(null); }
  };

  const doReject = async () => {
    if (!detail) return;
    setBusy("reject");
    try {
      await adminApi.rejectVariant(detail.id, reason);
      showToast("Variant rejeté", "success");
      onModerated();
    } catch { showToast("Erreur rejet", "error"); }
    finally { setBusy(null); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 960, maxHeight: "92vh", overflow: "auto",
          background: T.card, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            Chargement...
          </div>
        ) : !detail ? (
          <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
            Détail introuvable.
          </div>
        ) : (
          <>
            <ModalHeader detail={detail} T={T} onClose={onClose} />
            <ModalBody detail={detail} colorDict={colorDict} T={T}
              onSelectSibling={onSelectSibling} />
            {detail.moderation_status === "PENDING" && (
              <ModalActions T={T} reason={reason} setReason={setReason}
                busy={busy} onApprove={doApprove} onReject={doReject} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL SUBCOMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function ModalHeader({ detail, T, onClose }: {
  detail: AdminVariantDetail; T: AdminTokens; onClose: () => void;
}) {
  return (
    <div style={{
      padding: "24px 28px", borderBottom: `1px solid ${T.border}`,
      background: T.cardAlt, borderRadius: "20px 20px 0 0",
    }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: T.mutedL, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <Tag size={11} />
        {detail.master_category_parent_name && (
          <>
            <span>{detail.master_category_parent_name}</span>
            <span style={{ opacity: 0.5 }}>›</span>
          </>
        )}
        <span style={{ fontWeight: 600 }}>{detail.master_category_name}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, lineHeight: 1.2 }}>
            {detail.master_title}
          </h2>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              fontSize: 11, background: T.card, padding: "3px 8px",
              borderRadius: 6, color: T.text, fontFamily: "monospace",
              border: `1px solid ${T.border}`,
            }}>{detail.sku}</code>
            <StatusBadge status={detail.moderation_status} />
            <span style={{ fontSize: 11, color: T.mutedL }}>
              créé le {fmtDate(detail.created_at)}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: 8, borderRadius: 10, background: T.card,
          border: `1px solid ${T.border}`, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><X size={16} color={T.muted} /></button>
      </div>
    </div>
  );
}

function ModalBody({ detail, colorDict, T, onSelectSibling }: {
  detail: AdminVariantDetail; colorDict: Record<string, ColorDictionaryEntry>;
  T: AdminTokens; onSelectSibling: (id: number) => void;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "260px 1fr", gap: 24,
      padding: "24px 28px",
    }}>
      {/* Colonne gauche : image + config + stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <MasterThumb src={detail.master_primary_image} T={T} size={260} />

        <ModalSection title="Configuration" icon={Layers} T={T}>
          <VariantConfigChips axes={detail.axes_resolved} colorDict={colorDict} T={T} size="lg" />
        </ModalSection>

        <StatsGrid stats={detail.stats} T={T} />
      </div>

      {/* Colonne droite : siblings + offres + historique */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
        {detail.sibling_variants.length > 0 && (
          <ModalSection title={`Autres variants de cette fiche (${detail.sibling_variants.length})`}
            icon={TrendingUp} T={T}>
            <SiblingsList siblings={detail.sibling_variants} colorDict={colorDict} T={T}
              onSelect={onSelectSibling} />
          </ModalSection>
        )}

        <ModalSection title={`Offres rattachées (${detail.offers.length})`}
          icon={Store} T={T}>
          {detail.offers.length === 0 ? (
            <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              Aucune offre encore rattachée à ce variant.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {detail.offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} T={T} />
              ))}
            </div>
          )}
        </ModalSection>

        {detail.moderated_at && (
          <ModalSection title="Historique de modération" icon={Calendar} T={T}>
            <div style={{ fontSize: 12.5, color: T.text }}>
              {STATUS_LABELS[detail.moderation_status]} par{" "}
              <strong>{detail.moderated_by_username ?? "—"}</strong>{" "}
              <span style={{ color: T.muted }}>
                le {fmtDateTime(detail.moderated_at)}
              </span>
            </div>
            {detail.moderation_reason && (
              <div style={{
                marginTop: 8, padding: 12, background: T.cardAlt, borderRadius: 10,
                fontSize: 12.5, color: T.text, borderLeft: `3px solid ${T.muted}`,
              }}>
                <em>« {detail.moderation_reason} »</em>
              </div>
            )}
          </ModalSection>
        )}
      </div>
    </div>
  );
}

function ModalSection({ title, icon: Icon, T, children }: {
  title: string; icon: React.ElementType; T: AdminTokens; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      }}>
        <Icon size={12} color={T.muted} />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.muted,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS GRID
// ═════════════════════════════════════════════════════════════════════════════

function StatsGrid({ stats, T }: {
  stats: AdminVariantDetail["stats"]; T: AdminTokens;
}) {
  return (
    <div style={{
      background: T.cardAlt, borderRadius: 12,
      border: `1px solid ${T.border}`, padding: 14,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.06em",
      }}>Statistiques</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatBox label="Offres approuvées" value={String(stats.approved_offers)}
          sublabel={stats.pending_offers > 0 ? `${stats.pending_offers} en attente` : undefined}
          color={STATUS_COLORS.APPROVED} T={T} />
        <StatBox label="Stock total"
          value={stats.total_stock.toLocaleString("fr-FR")} T={T} />
        <StatBox label="Prix min" value={fmtXAF(stats.price_min_xaf)} T={T} />
        <StatBox label="Prix max" value={fmtXAF(stats.price_max_xaf)} T={T} />
      </div>
    </div>
  );
}

function StatBox({ label, value, sublabel, color, T }: {
  label: string; value: string; sublabel?: string; color?: string; T: AdminTokens;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 800, color: color ?? T.text, marginTop: 2,
      }}>{value}</div>
      {sublabel && (
        <div style={{ fontSize: 9.5, color: STATUS_COLORS.PENDING, marginTop: 1 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SIBLINGS
// ═════════════════════════════════════════════════════════════════════════════

function SiblingsList({ siblings, colorDict, T, onSelect }: {
  siblings: AdminVariantSibling[];
  colorDict: Record<string, ColorDictionaryEntry>;
  T: AdminTokens; onSelect: (id: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {siblings.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 10,
            background: T.cardAlt, border: `1px solid ${T.border}`,
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.red + "60";
            e.currentTarget.style.background = T.card;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.background = T.cardAlt;
          }}
        >
          <VariantConfigChips axes={s.axes_resolved} colorDict={colorDict} T={T} size="sm" />
          <StatusBadge status={s.moderation_status} size="sm" />
        </button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OFFER CARD — riche, avec info vendeur cliquable
// ═════════════════════════════════════════════════════════════════════════════

function OfferCard({ offer, T }: { offer: AdminVariantOffer; T: AdminTokens }) {
  const fullName = vendorFullName(offer);

  return (
    <div style={{
      background: T.cardAlt, borderRadius: 12, padding: 14,
      border: `1px solid ${T.border}`, position: "relative",
    }}>
      {/* Statut badge en haut à droite */}
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <StatusBadge status={offer.moderation_status} size="sm" />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* Photo réelle */}
        {offer.real_image ? (
          <img src={offer.real_image} alt="" style={{
            width: 60, height: 60, borderRadius: 8, objectFit: "cover",
            border: `1px solid ${T.border}`, flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: 8,
            background: T.card, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ImageIcon size={20} color={T.mutedL} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nom vendeur + username */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            {offer.vendor_user_id ? (
              <Link
                to={`/admin/users/${offer.vendor_user_id}`}
                style={{
                  fontSize: 13.5, fontWeight: 700, color: T.text,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = T.red)}
                onMouseLeave={(e) => (e.currentTarget.style.color = T.text)}
              >
                {fullName}
              </Link>
            ) : (
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{fullName}</span>
            )}
            {offer.vendor_username && (
              <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 500 }}>
                @{offer.vendor_username}
              </span>
            )}
          </div>

          {/* Boutique */}
          {offer.vendor_business_name && (
            <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
              <Store size={11} color={T.muted} />
              {offer.vendor_profile_id ? (
                <Link
                  to={`/admin/vendors/${offer.vendor_profile_id}`}
                  style={{
                    fontSize: 11.5, color: T.muted, textDecoration: "none",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = T.red)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
                >{offer.vendor_business_name}</Link>
              ) : (
                <span style={{ fontSize: 11.5, color: T.muted }}>{offer.vendor_business_name}</span>
              )}
            </div>
          )}

          {/* Prix + état + stock */}
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 14,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <DollarSign size={12} color={T.muted} />
              <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                {fmtXAF(offer.price_xaf)}
              </span>
            </div>
            {offer.condition_name && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 8px",
                borderRadius: 6, background: T.blueL, color: T.blue,
              }}>{offer.condition_name}</span>
            )}
            <span style={{ fontSize: 11, color: T.muted }}>
              Stock : <strong style={{ color: T.text }}>{offer.stock_quantity}</strong>
            </span>
          </div>

          {/* Note vendeur */}
          {offer.seller_note && (
            <div style={{
              marginTop: 10, padding: 10, background: T.card, borderRadius: 8,
              fontSize: 12, color: T.text, borderLeft: `3px solid ${T.orange}`,
              fontStyle: "italic",
            }}>
              « {offer.seller_note} »
            </div>
          )}

          {/* Footer : date + action voir */}
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10.5, color: T.mutedL, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={10} /> {fmtDate(offer.created_at)}
            </span>
            {offer.vendor_profile_id && (
              <Link
                to={`/admin/vendors/${offer.vendor_profile_id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 10.5, fontWeight: 700, color: T.red,
                  textDecoration: "none",
                }}
              >
                Voir vendeur <ExternalLink size={10} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL ACTIONS (approve / reject)
// ═════════════════════════════════════════════════════════════════════════════

function ModalActions({ T, reason, setReason, busy, onApprove, onReject }: {
  T: AdminTokens; reason: string; setReason: (r: string) => void;
  busy: "approve" | "reject" | null;
  onApprove: () => void; onReject: () => void;
}) {
  return (
    <div style={{
      padding: "20px 28px", borderTop: `1px solid ${T.border}`,
      background: T.cardAlt, borderRadius: "0 0 20px 20px",
    }}>
      <label style={{
        fontSize: 10.5, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.05em",
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
      }}>
        <AlertCircle size={11} />
        Commentaire de modération (optionnel)
      </label>
      <textarea
        value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
        placeholder="Motif d'approbation ou rejet — sera visible dans l'historique..."
        style={{
          width: "100%", padding: 12, borderRadius: 10, fontSize: 13,
          background: T.input, border: `1px solid ${T.inputBorder}`,
          color: T.text, resize: "vertical", outline: "none", fontFamily: "inherit",
        }}
      />
      <div style={{
        marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end",
      }}>
        <button onClick={onReject} disabled={busy !== null} style={{
          padding: "11px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: STATUS_COLORS.REJECTED, color: "#fff", border: "none",
          cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          display: "flex", alignItems: "center", gap: 6,
        }}><X size={14} /> Rejeter le variant</button>
        <button onClick={onApprove} disabled={busy !== null} style={{
          padding: "11px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: STATUS_COLORS.APPROVED, color: "#fff", border: "none",
          cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          display: "flex", alignItems: "center", gap: 6,
        }}><Check size={14} /> Approuver le variant</button>
      </div>
    </div>
  );
}