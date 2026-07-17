// frontend/src/features/admin/operations/MasterProductsPage.tsx
// Gestion des Fiches Maîtres — Admin BelivaY (v2 enrichie)
//
// Ajouts par rapport à la v1 :
//   - Affichage variant_axes (chips visuelles avec resolveAxes)
//   - Affichage brand_fk (logo + verified badge) au lieu du brand texte
//   - Liste des variants attachés dans la modale
//   - Modale d'édition avec brand_fk (autocomplete) + variant_axes (multi-toggle)
//   - Compteurs variants + offres, filtres par catégorie parente

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, Check, X, RefreshCw, Eye, Edit3, Trash2, Package,
  ExternalLink, Filter, ChevronDown, BadgeCheck, ImageIcon,
  AlertTriangle, Tag,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminMaster, type AdminMasterDetail,
  type MasterUpdatePayload, type AdminBrand, type AdminAttribute,
} from "@/services/api/admin";
import { productsApi, type Category } from "@/services/api/products";

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
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

export default function MasterProductsPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [parentCatId, setParentCatId] = useState<number | null>(null);
  const [subCatId, setSubCatId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<AdminMasterDetail | null>(null);

  // ── Load ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { moderation_status?: string; search?: string } = {};
      if (tab !== "all") filters.moderation_status = tab;
      if (search.trim()) filters.search = search.trim();
      setMasters(await adminApi.listMasters(filters));
    } catch {
      showToast("Erreur chargement des fiches", "error");
    } finally { setLoading(false); }
  }, [tab, search, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    productsApi.listCategories({ page_size: 200 })
      .then((r) => setCategories(r.results ?? []))
      .catch(() => {});
  }, []);

  // ── Filtrage local (catégorie) ──────────────────────────────────────
  const filtered = useMemo(() => {
    return masters.filter((m) => {
      if (subCatId && m.category !== subCatId) return false;
      if (parentCatId && !subCatId) {
        // Match sur category = parent OR parent.parent = parent
        if (m.category !== parentCatId && m.category_parent_id !== parentCatId) return false;
      }
      return true;
    });
  }, [masters, parentCatId, subCatId]);

  const counts = useMemo(() => ({
    all: masters.length,
    PENDING: masters.filter((m) => m.moderation_status === "PENDING").length,
    APPROVED: masters.filter((m) => m.moderation_status === "APPROVED").length,
    REJECTED: masters.filter((m) => m.moderation_status === "REJECTED").length,
  }), [masters]);

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parent),
    [categories],
  );
  const availableSubCats = useMemo(
    () => parentCatId ? categories.filter((c) => c.parent === parentCatId) : [],
    [parentCatId, categories],
  );

  const activeFilters = useMemo(() => {
    const list: { label: string; onRemove: () => void }[] = [];
    if (parentCatId) {
      const p = parentCategories.find((c) => c.id === parentCatId);
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
  }, [parentCatId, subCatId, parentCategories, availableSubCats]);

  // ── Actions ─────────────────────────────────────────────────────────
  const openDetail = (id: number) => setDetailId(id);
  const openEdit = async (id: number) => {
    try {
      const d = await adminApi.getMasterDetail(id);
      setEditItem(d);
    } catch { showToast("Erreur", "error"); }
  };

  const handleApprove = async (m: AdminMaster) => {
    try { await adminApi.approveMaster(m.id); showToast(`${m.title} approuvée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleReject = async (m: AdminMaster) => {
    const ok = await confirm({
      title: `Rejeter '${m.title}' ?`,
      message: "La fiche ne sera plus visible côté acheteur.",
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.rejectMaster(m.id); showToast(`${m.title} rejetée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleDelete = async (m: AdminMaster) => {
    const ok = await confirm({
      title: `Supprimer '${m.title}' ?`,
      message: `Cette action est définitive. ${m.variants_count > 0 || m.offers_count > 0 ? "⚠️ La fiche a des variants/offres attachés." : ""}`,
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.deleteMaster(m.id); showToast("Fiche supprimée", "success"); load(); setDetailId(null); }
    catch { showToast("Erreur suppression", "error"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
            color: T.text, marginBottom: 4,
          }}>Fiches Maîtres</h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {counts.PENDING > 0 && (
              <>
                <strong style={{ color: STATUS_COLORS.PENDING }}>
                  {counts.PENDING} en attente
                </strong>{" · "}
              </>
            )}
            {counts.all} fiche{counts.all > 1 ? "s" : ""} au total
          </p>
        </div>
        <button onClick={load} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: T.cardAlt, color: T.muted,
          border: `1px solid ${T.border}`, cursor: "pointer",
        }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "PENDING", "APPROVED", "REJECTED"] as StatusTab[]).map((k) => {
          const isActive = tab === k;
          const label = k === "all" ? "Toutes" : STATUS_LABELS[k];
          const count = counts[k];
          const color = k === "all" ? "#6B7280" : STATUS_COLORS[k];
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              background: isActive ? T.red : T.cardAlt,
              color: isActive ? "#fff" : T.text,
              border: `1px solid ${isActive ? T.red : T.border}`, cursor: "pointer",
            }}>
              {label}
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : color + "22",
                color: isActive ? "#fff" : color,
                padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: T.muted, pointerEvents: "none",
          }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Titre ou marque..."
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
          background: activeFilters.length > 0 ? T.red + "15" : T.cardAlt,
          color: activeFilters.length > 0 ? T.red : T.text,
          border: `1px solid ${activeFilters.length > 0 ? T.red + "40" : T.border}`,
          cursor: "pointer",
        }}>
          <Filter size={12} /> Filtres
          {activeFilters.length > 0 && (
            <span style={{
              background: T.red, color: "#fff", padding: "1px 8px",
              borderRadius: 20, fontSize: 10, fontWeight: 800,
            }}>{activeFilters.length}</span>
          )}
          <ChevronDown size={12} style={{
            transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s",
          }} />
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
          padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr auto",
          gap: 12, alignItems: "end",
        }}>
          <div>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.05em",
              display: "block", marginBottom: 6,
            }}>Catégorie parente</label>
            <select value={parentCatId ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setParentCatId(v); setSubCatId(null);
              }}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12.5,
                background: T.input, color: T.text,
                border: `1px solid ${T.inputBorder}`, outline: "none",
              }}
            >
              <option value="">Toutes</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.05em",
              display: "block", marginBottom: 6,
            }}>Sous-catégorie</label>
            <select value={subCatId ?? ""}
              onChange={(e) => setSubCatId(e.target.value ? Number(e.target.value) : null)}
              disabled={!parentCatId}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12.5,
                background: T.input, color: T.text,
                border: `1px solid ${T.inputBorder}`, outline: "none",
                opacity: !parentCatId ? 0.5 : 1,
              }}
            >
              <option value="">Toutes</option>
              {availableSubCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setParentCatId(null); setSubCatId(null); }} style={{
            padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: T.cardAlt, color: T.muted,
            border: `1px solid ${T.border}`, cursor: "pointer",
          }}>Réinitialiser</button>
        </div>
      )}

      {/* Active filters chips */}
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
      <div style={{
        background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <Package size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>Aucune fiche dans ces filtres.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead>
                <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                  <TH>Fiche</TH>
                  <TH>Catégorie</TH>
                  <TH>Marque</TH>
                  <TH>Axes de variante</TH>
                  <TH>Variants</TH>
                  <TH>Offres</TH>
                  <TH>Statut</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <MasterRow key={m.id} master={m} T={T}
                    onDetail={() => openDetail(m.id)}
                    onEdit={() => openEdit(m.id)}
                    onApprove={() => handleApprove(m)}
                    onReject={() => handleReject(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {detailId !== null && (
        <MasterDetailModal
          masterId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(d) => { setDetailId(null); setEditItem(d); }}
          onApproved={() => { setDetailId(null); load(); }}
          onRejected={() => { setDetailId(null); load(); }}
          onDeleted={() => { setDetailId(null); load(); }}
        />
      )}
      {editItem !== null && (
        <MasterEditModal
          master={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load(); }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═════════════════════════════════════════════════════════════════════════════

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "12px 16px", textAlign: "left", fontSize: 11,
      fontWeight: 700, textTransform: "uppercase", color: "#6B7280",
      letterSpacing: "0.05em",
    }}>{children}</th>
  );
}

function MasterRow({
  master, T, onDetail, onEdit, onApprove, onReject, onDelete,
}: {
  master: AdminMaster; T: AdminTokens;
  onDetail: () => void; onEdit: () => void;
  onApprove: () => void; onReject: () => void; onDelete: () => void;
}) {
  const isPending = master.moderation_status === "PENDING";
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
      <td style={{ padding: "12px 16px", minWidth: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {master.primary_image ? (
            <img src={master.primary_image} alt="" style={{
              width: 40, height: 40, borderRadius: 8, objectFit: "cover",
              border: `1px solid ${T.border}`, flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: T.cardAlt, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><ImageIcon size={16} color={T.mutedL} /></div>
          )}
          <div style={{ minWidth: 0 }}>
            <Link to={`/product/${master.slug}`} target="_blank" style={{
              fontSize: 13, fontWeight: 700, color: T.text, textDecoration: "none",
              display: "block", lineHeight: 1.3,
            }}>
              {master.title}
              <ExternalLink size={10} style={{ marginLeft: 4, verticalAlign: "middle", color: T.muted }} />
            </Link>
            <code style={{ fontSize: 10.5, color: T.mutedL, fontFamily: "monospace" }}>{master.slug}</code>
          </div>
        </div>
      </td>

      <td style={{ padding: "12px 16px", fontSize: 11.5, color: T.text }}>
        {master.category_parent_name && (
          <div style={{ color: T.mutedL, marginBottom: 2 }}>
            {master.category_parent_name} <span style={{ opacity: 0.5 }}>›</span>
          </div>
        )}
        <div style={{ fontWeight: 600 }}>{master.category_name}</div>
      </td>

      <td style={{ padding: "12px 16px" }}>
        <BrandCell master={master} T={T} />
      </td>

      <td style={{ padding: "12px 16px", minWidth: 180 }}>
        {master.axes_resolved.length === 0 ? (
          <span style={{ fontSize: 11, color: T.mutedL, fontStyle: "italic" }}>mono-variant</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {master.axes_resolved.map((ax) => (
              <span key={ax.slug}
                title={ax.found ? `${ax.name} (${ax.values_type})` : `Axe orphelin : ${ax.slug}`}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                  background: ax.found ? T.red + "15" : "#F59E0B15",
                  color: ax.found ? T.red : "#F59E0B",
                  border: `1px solid ${ax.found ? T.red + "30" : "#F59E0B30"}`,
                }}>
                {ax.found ? ax.name : `⚠ ${ax.slug}`}
              </span>
            ))}
          </div>
        )}
      </td>

      <td style={{ padding: "12px 16px", fontSize: 12, color: T.text }}>
        {master.variants_count > 0 ? (
          <div>
            <div style={{ fontWeight: 700 }}>
              {master.active_variants_count}
              <span style={{ color: T.mutedL, fontWeight: 400 }}> / {master.variants_count}</span>
            </div>
          </div>
        ) : <span style={{ color: T.mutedL }}>—</span>}
      </td>

      <td style={{ padding: "12px 16px", fontSize: 12, color: T.text }}>
        <div style={{ fontWeight: 600 }}>
          {master.active_offers_count}
          <span style={{ color: T.mutedL, fontWeight: 400 }}> / {master.offers_count}</span>
        </div>
      </td>

      <td style={{ padding: "12px 16px" }}>
        <span style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 20,
          fontSize: 10.5, fontWeight: 700,
          background: STATUS_COLORS[master.moderation_status] + "18",
          color: STATUS_COLORS[master.moderation_status],
          textTransform: "uppercase", letterSpacing: "0.03em",
        }}>{STATUS_LABELS[master.moderation_status]}</span>
      </td>

      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn onClick={onDetail} title="Détails" T={T}><Eye size={12} /></ActionBtn>
          <ActionBtn onClick={onEdit} title="Modifier" T={T}><Edit3 size={12} /></ActionBtn>
          {isPending && (
            <>
              <ActionBtn onClick={onApprove} title="Approuver" T={T} color={STATUS_COLORS.APPROVED}>
                <Check size={12} />
              </ActionBtn>
              <ActionBtn onClick={onReject} title="Rejeter" T={T} color={STATUS_COLORS.REJECTED}>
                <X size={12} />
              </ActionBtn>
            </>
          )}
          <ActionBtn onClick={onDelete} title="Supprimer" T={T} color="#DC2626">
            <Trash2 size={12} />
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ onClick, title, T, color, children }: {
  onClick: () => void; title: string; T: AdminTokens; color?: string; children: React.ReactNode;
}) {
  const c = color ?? T.text;
  return (
    <button onClick={onClick} title={title} style={{
      padding: "6px 7px", borderRadius: 7,
      background: color ? c + "18" : T.cardAlt, color: c,
      border: `1px solid ${color ? c + "44" : T.border}`, cursor: "pointer",
      display: "flex", alignItems: "center",
    }}>{children}</button>
  );
}

function BrandCell({ master, T }: { master: AdminMaster; T: AdminTokens }) {
  // Priorité au brand_fk (Phase 1.2), sinon fallback sur brand texte legacy
  if (master.brand_fk_name) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {master.brand_fk_logo_url ? (
          <img src={master.brand_fk_logo_url} alt="" style={{
            width: 24, height: 24, borderRadius: 6, objectFit: "contain",
            background: "#fff", padding: 2, border: `1px solid ${T.border}`,
          }} />
        ) : (
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: T.cardAlt,
            border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: T.muted,
          }}>{master.brand_fk_name.charAt(0)}</div>
        )}
        <span style={{
          fontSize: 12, fontWeight: 700, color: T.text,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {master.brand_fk_name}
          {master.brand_fk_verified && (
            <BadgeCheck size={12} style={{ color: "#059669" }} />
          )}
        </span>
      </div>
    );
  }
  // Fallback brand texte legacy
  if (master.brand) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: T.text }}>{master.brand}</span>
        <span style={{
          fontSize: 9, color: "#F59E0B", background: "#F59E0B18",
          padding: "1px 5px", borderRadius: 4, fontWeight: 700,
        }} title="Marque en texte libre — devrait être lié à une Brand canonique">
          LEGACY
        </span>
      </div>
    );
  }
  return <span style={{ color: T.mutedL }}>—</span>;
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE DETAIL
// ═════════════════════════════════════════════════════════════════════════════

function MasterDetailModal({
  masterId, onClose, onEdit, onApproved, onRejected, onDeleted,
}: {
  masterId: number;
  onClose: () => void;
  onEdit: (d: AdminMasterDetail) => void;
  onApproved: () => void; onRejected: () => void; onDeleted: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<AdminMasterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getMasterDetail(masterId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) showToast("Erreur chargement", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [masterId, showToast]);

  const doApprove = async () => {
    if (!detail) return;
    try { await adminApi.approveMaster(detail.id); showToast("Approuvée", "success"); onApproved(); }
    catch { showToast("Erreur", "error"); }
  };
  const doReject = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Rejeter '${detail.title}' ?`, message: "La fiche ne sera plus visible.",
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.rejectMaster(detail.id); showToast("Rejetée", "success"); onRejected(); }
    catch { showToast("Erreur", "error"); }
  };
  const doDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Supprimer '${detail.title}' ?`, message: "Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try { await adminApi.deleteMaster(detail.id); showToast("Supprimée", "success"); onDeleted(); }
    catch { showToast("Erreur", "error"); }
  };

  return (
    <ModalShell onClose={onClose} T={T}>
      {loading || !detail ? (
        <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          Chargement...
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "20px 20px 0 0",
          }}>
            <div style={{ fontSize: 11, color: T.mutedL, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Tag size={11} />
              {detail.category_parent_name && (
                <>{detail.category_parent_name} <span style={{ opacity: 0.5 }}>›</span> </>
              )}
              <strong>{detail.category_name}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>
                  {detail.title}
                </h2>
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <code style={{
                    fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                    color: T.text, fontFamily: "monospace", border: `1px solid ${T.border}`,
                  }}>{detail.slug}</code>
                  <span style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 20,
                    fontSize: 10.5, fontWeight: 700,
                    background: STATUS_COLORS[detail.moderation_status] + "18",
                    color: STATUS_COLORS[detail.moderation_status],
                    textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>{STATUS_LABELS[detail.moderation_status]}</span>
                  {detail.moderated_by_username && (
                    <span style={{ fontSize: 11, color: T.mutedL }}>
                      par @{detail.moderated_by_username}
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
          </div>

          {/* Body */}
          <div style={{ padding: "22px 26px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
            {/* Left col : image + basic */}
            <div>
              {detail.primary_image ? (
                <img src={detail.primary_image} alt="" style={{
                  width: 220, height: 220, borderRadius: 12, objectFit: "cover",
                  border: `1px solid ${T.border}`,
                }} />
              ) : (
                <div style={{
                  width: 220, height: 220, borderRadius: 12, background: T.cardAlt,
                  border: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><ImageIcon size={48} color={T.mutedL} /></div>
              )}
              {detail.all_images.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {detail.all_images.slice(0, 5).map((img) => (
                    <img key={img.id} src={img.url} alt="" style={{
                      width: 40, height: 40, borderRadius: 6, objectFit: "cover",
                      border: `1px solid ${T.border}`,
                      opacity: img.is_primary ? 1 : 0.7,
                    }} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Marque</div>
                <BrandCell master={detail} T={T} />
              </div>
            </div>

            {/* Right col : description + axes + variants + offers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
              {detail.description && (
                <Section title="Description" T={T}>
                  <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {detail.description}
                  </p>
                </Section>
              )}

              <Section title="Axes de variante" T={T}>
                {detail.axes_resolved.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                    Fiche mono-variant (aucun axe).
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {detail.axes_resolved.map((ax) => (
                      <span key={ax.slug} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "5px 12px", borderRadius: 10,
                        fontSize: 12, fontWeight: 700,
                        background: ax.found ? T.red + "15" : "#F59E0B15",
                        color: ax.found ? T.red : "#F59E0B",
                        border: `1px solid ${ax.found ? T.red + "30" : "#F59E0B30"}`,
                      }}>
                        {!ax.found && <AlertTriangle size={11} />}
                        {ax.name}
                        {ax.unit && <span style={{ opacity: 0.7 }}>({ax.unit})</span>}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`Variants (${detail.variants.length})`} T={T}>
                {detail.variants.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                    Aucun variant créé.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                    {detail.variants.map((v) => (
                      <div key={v.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: 10, background: T.cardAlt, borderRadius: 8,
                        border: `1px solid ${T.border}`,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                            {v.display_name}
                          </div>
                          <code style={{ fontSize: 10, color: T.mutedL, fontFamily: "monospace" }}>
                            {v.sku}
                          </code>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: T.muted }}>{v.offers_count} offre(s)</span>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 20,
                            fontSize: 10, fontWeight: 700,
                            background: STATUS_COLORS[v.moderation_status] + "18",
                            color: STATUS_COLORS[v.moderation_status],
                          }}>{STATUS_LABELS[v.moderation_status]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`Offres (${detail.offers_count})`} T={T}>
                <div style={{ fontSize: 13, color: T.text }}>
                  <strong>{detail.active_offers_count}</strong>
                  <span style={{ color: T.muted, marginLeft: 4 }}>approuvées et actives</span>
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "16px 26px", borderTop: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "0 0 20px 20px",
            display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onEdit(detail)} style={btnStyle(T.text, T.card, T)}>
                <Edit3 size={13} /> Modifier
              </button>
              {detail.moderation_status === "PENDING" && (
                <>
                  <button onClick={doApprove} style={btnStyle(STATUS_COLORS.APPROVED, T.card, T, true)}>
                    <Check size={13} /> Approuver
                  </button>
                  <button onClick={doReject} style={btnStyle(STATUS_COLORS.REJECTED, T.card, T, true)}>
                    <X size={13} /> Rejeter
                  </button>
                </>
              )}
            </div>
            <button onClick={doDelete} style={btnStyle("#DC2626", T.card, T)}>
              <Trash2 size={13} /> Supprimer
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE EDIT — avec brand_fk (autocomplete) + variant_axes (multi-toggle)
// ═════════════════════════════════════════════════════════════════════════════

function MasterEditModal({ master, categories, onClose, onSaved }: {
  master: AdminMasterDetail;
  categories: Category[];
  onClose: () => void; onSaved: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();

  const [form, setForm] = useState<MasterUpdatePayload>({
    title: master.title,
    description: master.description,
    category: master.category,
    brand_fk: master.brand_fk_id,
    variant_axes: master.variant_axes,
  });
  const [busy, setBusy] = useState(false);

  // Brand autocomplete
  const [brandSearch, setBrandSearch] = useState(master.brand_fk_name ?? "");
  const [brandOptions, setBrandOptions] = useState<AdminBrand[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<{ id: number; name: string; logo: string | null } | null>(
    master.brand_fk_id ? {
      id: master.brand_fk_id, name: master.brand_fk_name ?? "",
      logo: master.brand_fk_logo_url,
    } : null,
  );

  useEffect(() => {
    if (brandSearch.trim().length < 2) { setBrandOptions([]); return; }
    const timer = setTimeout(() => {
      adminApi.listBrands({ search: brandSearch.trim(), is_active: true })
        .then((data) => setBrandOptions(data.slice(0, 10)))
        .catch(() => setBrandOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [brandSearch]);

  // Attributs AXE disponibles pour la catégorie sélectionnée
  const [availableAxes, setAvailableAxes] = useState<AdminAttribute[]>([]);
  useEffect(() => {
    if (!form.category) { setAvailableAxes([]); return; }
    // Charger les attributs AXE : universels + catégorie sélectionnée
    Promise.all([
      adminApi.listAttributes({ role: "AXE", is_universal: true }),
      adminApi.listAttributes({ role: "AXE", category: form.category }),
    ]).then(([univ, cat]) => {
      const map = new Map<string, AdminAttribute>();
      [...univ, ...cat].forEach((a) => map.set(a.slug, a));
      setAvailableAxes(Array.from(map.values()));
    }).catch(() => setAvailableAxes([]));
  }, [form.category]);

  const toggleAxis = (slug: string) => {
    const current = form.variant_axes ?? [];
    if (current.includes(slug)) {
      setForm({ ...form, variant_axes: current.filter((s) => s !== slug) });
    } else {
      setForm({ ...form, variant_axes: [...current, slug] });
    }
  };

  const handleSubmit = async () => {
    if (!form.title || form.title.trim().length < 2) {
      showToast("Titre requis", "warning"); return;
    }
    setBusy(true);
    try {
      const payload: MasterUpdatePayload = {
        title: form.title,
        description: form.description,
        category: form.category,
        brand_fk: selectedBrand?.id ?? null,
        variant_axes: form.variant_axes,
      };
      await adminApi.updateMaster(master.id, payload);
      showToast("Fiche mise à jour", "success");
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Erreur";
      showToast(msg, "error");
    } finally { setBusy(false); }
  };

  const axesChanged = useMemo(() => {
    return JSON.stringify([...(form.variant_axes ?? [])].sort())
      !== JSON.stringify([...master.variant_axes].sort());
  }, [form.variant_axes, master.variant_axes]);

  return (
    <ModalShell onClose={onClose} T={T} maxWidth={720}>
      <div style={{
        padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "20px 20px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
          Modifier {master.title}
        </h2>
        <button onClick={onClose} style={{
          padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
          cursor: "pointer", display: "flex",
        }}><X size={16} color={T.muted} /></button>
      </div>

      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Titre *" T={T}>
          <input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={inputStyle(T)} />
        </FormField>

        <FormField label="Description" T={T}>
          <textarea value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} style={{ ...inputStyle(T), resize: "vertical" }} />
        </FormField>

        <FormField label="Catégorie" T={T}>
          <select value={form.category ?? ""}
            onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
            style={inputStyle(T)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent ? "  › " : ""}{c.name}
              </option>
            ))}
          </select>
        </FormField>

        {/* Brand autocomplete */}
        <FormField label="Marque canonique (brand_fk)" T={T}>
          <div style={{ position: "relative" }}>
            {selectedBrand ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: 10,
                background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.border}`,
              }}>
                {selectedBrand.logo ? (
                  <img src={selectedBrand.logo} alt="" style={{
                    width: 28, height: 28, borderRadius: 6, objectFit: "contain",
                    background: "#fff", padding: 2,
                  }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: T.card,
                    border: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: T.muted,
                  }}>{selectedBrand.name.charAt(0)}</div>
                )}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.text }}>
                  {selectedBrand.name}
                </div>
                <button onClick={() => { setSelectedBrand(null); setBrandSearch(""); }} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 6, borderRadius: 6, color: T.muted, display: "flex",
                }}><X size={14} /></button>
              </div>
            ) : (
              <>
                <input value={brandSearch}
                  onChange={(e) => { setBrandSearch(e.target.value); setShowBrandDropdown(true); }}
                  onFocus={() => setShowBrandDropdown(true)}
                  placeholder="Rechercher une marque..."
                  style={inputStyle(T)} />
                {showBrandDropdown && brandOptions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 10, maxHeight: 240, overflowY: "auto",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  }}>
                    {brandOptions.map((b) => (
                      <button key={b.id} onClick={() => {
                        setSelectedBrand({ id: b.id, name: b.name, logo: b.logo_url });
                        setShowBrandDropdown(false);
                        setBrandSearch("");
                      }} style={{
                        width: "100%", padding: 10, textAlign: "left",
                        background: "transparent", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        borderBottom: `1px solid ${T.border}`,
                      }}>
                        {b.logo_url ? (
                          <img src={b.logo_url} alt="" style={{
                            width: 24, height: 24, borderRadius: 4, objectFit: "contain", background: "#fff", padding: 2,
                          }} />
                        ) : (
                          <div style={{
                            width: 24, height: 24, borderRadius: 4, background: T.cardAlt,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, color: T.muted,
                          }}>{b.name.charAt(0)}</div>
                        )}
                        <span style={{ fontSize: 12.5, color: T.text, flex: 1 }}>{b.name}</span>
                        {b.is_verified && <BadgeCheck size={12} color="#059669" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </FormField>

        {/* Variant axes multi-select */}
        <FormField label={`Axes de variante (${(form.variant_axes ?? []).length} sélectionné${(form.variant_axes ?? []).length > 1 ? "s" : ""})`} T={T}>
          {availableAxes.length === 0 ? (
            <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              Aucun attribut AXE disponible pour cette catégorie.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableAxes.map((a) => {
                const isSelected = (form.variant_axes ?? []).includes(a.slug);
                return (
                  <button key={a.id} onClick={() => toggleAxis(a.slug)} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", borderRadius: 10,
                    fontSize: 12, fontWeight: 700,
                    background: isSelected ? T.red : T.cardAlt,
                    color: isSelected ? "#fff" : T.text,
                    border: `1px solid ${isSelected ? T.red : T.border}`, cursor: "pointer",
                  }}>
                    {isSelected && <Check size={11} />}
                    {a.name}
                    {a.is_universal && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, opacity: 0.8,
                        background: "rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: 3,
                      }}>UNIV</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {axesChanged && master.variants.length > 0 && (
            <div style={{
              marginTop: 8, padding: 10, background: "#F59E0B18",
              borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8,
              border: "1px solid #F59E0B30",
            }}>
              <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11.5, color: T.text }}>
                Changer les axes est bloqué car <strong>{master.variants.length} variant(s)</strong> existent.
                Supprime-les d'abord.
              </div>
            </div>
          )}
        </FormField>
      </div>

      <div style={{
        padding: "16px 26px", borderTop: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "0 0 20px 20px",
        display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <button onClick={onClose} style={btnStyle(T.text, T.card, T)}>Annuler</button>
        <button onClick={handleSubmit} disabled={busy}
          style={{ ...btnStyle(T.red, T.card, T, true), opacity: busy ? 0.6 : 1 }}>
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          Enregistrer
        </button>
      </div>
    </ModalShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═════════════════════════════════════════════════════════════════════════════

function ModalShell({ onClose, T, maxWidth = 900, children }: {
  onClose: () => void; T: AdminTokens; maxWidth?: number; children: React.ReactNode;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth, maxHeight: "92vh", overflow: "auto",
        background: T.card, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>{children}</div>
    </div>
  );
}

function Section({ title, T, children }: {
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

function inputStyle(T: AdminTokens): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
    background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
    outline: "none", fontFamily: "inherit",
  };
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