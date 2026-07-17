// frontend/src/features/admin/catalog/AdminAttributesPage.tsx
// Gestion des Attributs — Admin BelivaY
//
// Fonctionnalités :
//   - Tabs par rôle : Tous / AXE / SPEC / OFFRE (avec compteurs)
//   - Filtres : values_type, is_universal, is_required, recherche
//   - Actions : voir détail, éditer, supprimer (si non utilisé), changer rôle
//   - Bulk actions : changer rôle, toggle required
//   - Modale détail avec fiches utilisatrices comme axe
//   - Modale create/edit avec values editor (JSON list)

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search, Check, X, RefreshCw, Eye, Plus, Edit3, Trash2,
  ExternalLink, Zap, Info, Tag, ImageIcon,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminAttribute, type AdminAttributeDetail,
  type AttributeListFilters, type AttributeUpdatePayload,
  type AttributeRole, type AttributeValuesType,
} from "@/services/api/admin";

type RoleTab = "all" | AttributeRole;

const ROLE_COLORS: Record<AttributeRole, string> = {
  AXE: "#DC2626",     // rouge — crée une variante
  SPEC: "#059669",    // vert — spec fixe
  OFFRE: "#F59E0B",   // orange — dépend du vendeur
};

const ROLE_LABELS: Record<AttributeRole, string> = {
  AXE: "AXE",
  SPEC: "SPEC",
  OFFRE: "OFFRE",
};

const ROLE_DESCRIPTIONS: Record<AttributeRole, string> = {
  AXE: "Crée une variante achetable",
  SPEC: "Caractéristique fixe filtrable",
  OFFRE: "Dépend du vendeur (état, garantie...)",
};

const VALUES_TYPES: AttributeValuesType[] = ["SELECT", "NUMBER", "BOOL", "TEXT", "COLORDICT", "BRAND"];

// ═════════════════════════════════════════════════════════════════════════════

export default function AdminAttributesPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ all: 0, AXE: 0, SPEC: 0, OFFRE: 0 });

  const [tab, setTab] = useState<RoleTab>("all");
  const [search, setSearch] = useState("");
  const [valuesTypeFilter, setValuesTypeFilter] = useState<AttributeValuesType | "">("");
  const [universalFilter, setUniversalFilter] = useState<"any" | "yes" | "no">("any");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<AdminAttributeDetail | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AttributeListFilters = {};
      if (tab !== "all") filters.role = tab;
      if (search.trim()) filters.search = search.trim();
      if (valuesTypeFilter) filters.values_type = valuesTypeFilter;
      if (universalFilter === "yes") filters.is_universal = true;
      else if (universalFilter === "no") filters.is_universal = false;

      const data = await adminApi.listAttributes(filters);
      setAttributes(data);
      setSelectedIds(new Set());
    } catch { showToast("Erreur chargement", "error"); }
    finally { setLoading(false); }
  }, [tab, search, valuesTypeFilter, universalFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const loadCounts = useCallback(async () => {
    try {
      const [all, axe, spec, offre] = await Promise.all([
        adminApi.listAttributes({}),
        adminApi.listAttributes({ role: "AXE" }),
        adminApi.listAttributes({ role: "SPEC" }),
        adminApi.listAttributes({ role: "OFFRE" }),
      ]);
      setCounts({ all: all.length, AXE: axe.length, SPEC: spec.length, OFFRE: offre.length });
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts, attributes.length]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleSetRole = async (attr: AdminAttribute, role: AttributeRole) => {
    if (attr.role === role) return;
    try {
      await adminApi.setAttributeRole(attr.id, role);
      showToast(`Rôle changé en ${role}`, "success");
      load();
    } catch { showToast("Erreur", "error"); }
  };

  const handleDelete = async (attr: AdminAttribute) => {
    const ok = await confirm({
      title: `Supprimer '${attr.name}' ?`,
      message: attr.used_as_axis_count > 0
        ? `⚠️ Cet attribut est utilisé par ${attr.used_as_axis_count} fiche(s). La suppression sera refusée.`
        : "Aucune fiche ne l'utilise. Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteAttribute(attr.id);
      showToast(`${attr.name} supprimé`, "success");
      load();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Impossible de supprimer.";
      showToast(msg, "error");
    }
  };

  const bulkSetRole = async (role: AttributeRole) => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Changer le rôle en ${role} pour ${selectedIds.size} attribut(s) ?`,
      message: "Cette action est immédiate.",
      type: "info",
    });
    if (!ok) return;
    try {
      const res = await adminApi.bulkSetAttributesRole(Array.from(selectedIds), role);
      showToast(`${res.updated_count} attribut(s) mis à jour`, "success");
      load();
    } catch { showToast("Erreur bulk", "error"); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === attributes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(attributes.map((a) => a.id)));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 4,
          }}>Attributs</h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {counts.AXE} axes · {counts.SPEC} specs · {counts.OFFRE} attributs vendeur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} style={btnGhost(T)}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <button onClick={() => setEditItem("new")} style={btnPrimary(T)}>
            <Plus size={12} /> Nouvel attribut
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "AXE", "SPEC", "OFFRE"] as RoleTab[]).map((k) => {
          const isActive = tab === k;
          const label = k === "all" ? "Tous" : ROLE_LABELS[k];
          const count = counts[k as keyof typeof counts] ?? 0;
          const color = k === "all" ? "#6B7280" : ROLE_COLORS[k as AttributeRole];
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
            placeholder="Nom ou slug..."
            style={{
              width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10,
              fontSize: 12.5, background: T.input, color: T.text,
              border: `1px solid ${T.inputBorder}`, outline: "none",
            }}
          />
        </div>

        <select value={valuesTypeFilter}
          onChange={(e) => setValuesTypeFilter(e.target.value as AttributeValuesType | "")}
          style={selectStyle(T)}>
          <option value="">Tous les types</option>
          {VALUES_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
        </select>

        <select value={universalFilter}
          onChange={(e) => setUniversalFilter(e.target.value as "any" | "yes" | "no")}
          style={selectStyle(T)}>
          <option value="any">Universel + spécifique</option>
          <option value="yes">Universel uniquement</option>
          <option value="no">Spécifique catégorie</option>
        </select>

        {selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red,
              padding: "6px 12px", background: T.red + "15", borderRadius: 20,
            }}>{selectedIds.size} sélectionné(s)</span>
            <button onClick={() => bulkSetRole("AXE")} style={btnColored(ROLE_COLORS.AXE)}>
              → AXE
            </button>
            <button onClick={() => bulkSetRole("SPEC")} style={btnColored(ROLE_COLORS.SPEC)}>
              → SPEC
            </button>
            <button onClick={() => bulkSetRole("OFFRE")} style={btnColored(ROLE_COLORS.OFFRE)}>
              → OFFRE
            </button>
          </>
        )}
      </div>

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
        ) : attributes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <Zap size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>Aucun attribut dans ce filtre.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "12px 16px", width: 40 }}>
                    <input type="checkbox"
                      checked={selectedIds.size === attributes.length && attributes.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <TH>Nom</TH>
                  <TH>Rôle</TH>
                  <TH>Type</TH>
                  <TH>Portée</TH>
                  <TH>Valeurs</TH>
                  <TH>Usage</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {attributes.map((a) => (
                  <AttributeRow key={a.id} attr={a} T={T}
                    isSelected={selectedIds.has(a.id)}
                    onToggle={() => toggleSelect(a.id)}
                    onDetail={() => setDetailId(a.id)}
                    onEdit={async () => {
                      try {
                        const d = await adminApi.getAttributeDetail(a.id);
                        setEditItem(d);
                      } catch { showToast("Erreur", "error"); }
                    }}
                    onSetRole={(role) => handleSetRole(a, role)}
                    onDelete={() => handleDelete(a)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {detailId !== null && (
        <AttributeDetailModal
          attributeId={detailId}
          onClose={() => setDetailId(null)}
          onModified={() => { setDetailId(null); load(); }}
          onEdit={(d) => { setDetailId(null); setEditItem(d); }}
        />
      )}
      {editItem !== null && (
        <AttributeFormModal
          attribute={editItem === "new" ? null : editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load(); }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES helpers
// ═════════════════════════════════════════════════════════════════════════════

function btnGhost(T: AdminTokens): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
    background: T.cardAlt, color: T.muted,
    border: `1px solid ${T.border}`, cursor: "pointer",
  };
}
function btnPrimary(T: AdminTokens): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
    background: T.red, color: "#fff", border: "none", cursor: "pointer",
  };
}
function btnColored(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 4,
    padding: "8px 12px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
    background: color + "18", color, border: `1px solid ${color}44`,
    cursor: "pointer",
  };
}
function selectStyle(T: AdminTokens): React.CSSProperties {
  return {
    padding: "9px 12px", borderRadius: 10, fontSize: 12,
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`, outline: "none", cursor: "pointer",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TABLE HEADER + ROW
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

function AttributeRow({
  attr, T, isSelected, onToggle, onDetail, onEdit, onSetRole, onDelete,
}: {
  attr: AdminAttribute; T: AdminTokens; isSelected: boolean;
  onToggle: () => void; onDetail: () => void; onEdit: () => void;
  onSetRole: (role: AttributeRole) => void; onDelete: () => void;
}) {
  return (
    <tr style={{
      borderBottom: `1px solid ${T.border}`,
      background: isSelected ? T.cardAlt : T.card,
    }}>
      <td style={{ padding: "12px 16px" }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
      </td>
      <td style={{ padding: "12px 16px", minWidth: 200 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
          {attr.name}
          {attr.is_required && (
            <span style={{ color: T.red, marginLeft: 4, fontWeight: 700 }}>*</span>
          )}
        </div>
        <code style={{ fontSize: 10.5, color: T.mutedL, fontFamily: "monospace" }}>{attr.slug}</code>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <RolePill role={attr.role} />
      </td>
      <td style={{ padding: "12px 16px", fontSize: 11.5, color: T.text }}>
        <code style={{ background: T.cardAlt, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
          {attr.values_type}
        </code>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12 }}>
        {attr.is_universal ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700,
            color: "#7C3AED", background: "#7C3AED18", padding: "2px 8px", borderRadius: 8,
          }}>UNIVERSEL</span>
        ) : (
          <span style={{ color: T.muted }}>{attr.category_name ?? "—"}</span>
        )}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: T.text }}>
        {attr.values_count > 0 ? (
          <span title={attr.values.join(", ")}>
            {attr.values_count} valeur{attr.values_count > 1 ? "s" : ""}
          </span>
        ) : (
          <span style={{ color: T.mutedL, fontStyle: "italic" }}>libre</span>
        )}
        {attr.unit && <span style={{ color: T.mutedL, marginLeft: 4 }}>({attr.unit})</span>}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: T.text }}>
        {attr.used_as_axis_count > 0 ? (
          <span>{attr.used_as_axis_count} fiche{attr.used_as_axis_count > 1 ? "s" : ""}</span>
        ) : (
          <span style={{ color: T.mutedL }}>—</span>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn onClick={onDetail} title="Détails" T={T}><Eye size={12} /></ActionBtn>
          <ActionBtn onClick={onEdit} title="Modifier" T={T}><Edit3 size={12} /></ActionBtn>
          {attr.role !== "AXE" && (
            <ActionBtn onClick={() => onSetRole("AXE")} title="Promouvoir AXE" T={T}
              color={ROLE_COLORS.AXE}><Zap size={12} /></ActionBtn>
          )}
          {attr.used_as_axis_count === 0 && (
            <ActionBtn onClick={onDelete} title="Supprimer" T={T} color="#DC2626">
              <Trash2 size={12} />
            </ActionBtn>
          )}
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

function RolePill({ role, size = "md" }: { role: AttributeRole; size?: "sm" | "md" }) {
  const color = ROLE_COLORS[role];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: size === "sm" ? "2px 8px" : "3px 10px",
      borderRadius: 20, fontSize: size === "sm" ? 10 : 10.5, fontWeight: 800,
      background: color + "18", color, letterSpacing: "0.05em",
    }}>{ROLE_LABELS[role]}</span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DETAIL MODAL
// ═════════════════════════════════════════════════════════════════════════════

function AttributeDetailModal({ attributeId, onClose, onModified, onEdit }: {
  attributeId: number;
  onClose: () => void; onModified: () => void;
  onEdit: (d: AdminAttributeDetail) => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<AdminAttributeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getAttributeDetail(attributeId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) showToast("Erreur chargement", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attributeId, showToast]);

  const changeRole = async (role: AttributeRole) => {
    if (!detail || detail.role === role) return;
    try {
      const updated = await adminApi.setAttributeRole(detail.id, role);
      setDetail(updated);
      showToast(`Rôle changé en ${role}`, "success");
      onModified();
    } catch { showToast("Erreur", "error"); }
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
          <div style={{
            padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "20px 20px 0 0",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: T.mutedL, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Tag size={11} />
                {detail.is_universal ? "Attribut universel" : (
                  <>
                    {detail.category_parent_name && (
                      <>{detail.category_parent_name} <span style={{ opacity: 0.5 }}>›</span> </>
                    )}
                    {detail.category_name ?? "—"}
                  </>
                )}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>
                {detail.name}
                {detail.is_required && <span style={{ color: T.red, marginLeft: 4 }}>*</span>}
              </h2>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <code style={{
                  fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                  color: T.text, fontFamily: "monospace", border: `1px solid ${T.border}`,
                }}>{detail.slug}</code>
                <RolePill role={detail.role} />
                <code style={{
                  fontSize: 10.5, background: T.card, padding: "3px 8px", borderRadius: 6,
                  color: T.text, fontFamily: "monospace",
                }}>{detail.values_type}</code>
              </div>
            </div>
            <button onClick={onClose} style={{
              padding: 8, borderRadius: 10, background: T.card,
              border: `1px solid ${T.border}`, cursor: "pointer",
              display: "flex", alignItems: "center",
            }}><X size={16} color={T.muted} /></button>
          </div>

          <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Description du rôle */}
            <div style={{
              padding: 12, background: ROLE_COLORS[detail.role] + "10",
              border: `1px solid ${ROLE_COLORS[detail.role]}30`, borderRadius: 10,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <Info size={14} color={ROLE_COLORS[detail.role]} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5 }}>
                <strong style={{ color: ROLE_COLORS[detail.role] }}>Rôle {detail.role}</strong> — {ROLE_DESCRIPTIONS[detail.role]}
              </div>
            </div>

            {/* Valeurs */}
            <Section title={`Valeurs disponibles${detail.unit ? ` (unité : ${detail.unit})` : ""}`} T={T}>
              {detail.values.length === 0 ? (
                <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                  Aucune valeur prédéfinie (saisie libre côté vendeur).
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {detail.values.map((v, i) => (
                    <code key={i} style={{
                      fontSize: 12, padding: "5px 10px", borderRadius: 8,
                      background: T.cardAlt, color: T.text, fontFamily: "monospace",
                      border: `1px solid ${T.border}`,
                    }}>{v}{detail.unit && ` ${detail.unit}`}</code>
                  ))}
                </div>
              )}
            </Section>

            {/* Stats */}
            <Section title="Utilisation" T={T}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
                background: T.cardAlt, padding: 14, borderRadius: 12,
              }}>
                <StatCell label="Fiches utilisatrices" value={detail.stats.used_as_axis_count} T={T} />
                <StatCell label="Fiches approuvées" value={detail.stats.approved_masters_using} T={T} color={ROLE_COLORS.SPEC} />
                <StatCell label="Valeurs prédéfinies" value={detail.stats.values_count} T={T} />
              </div>
            </Section>

            {/* Fiches utilisatrices */}
            {detail.used_by_masters.length > 0 && (
              <Section title={`Fiches maîtres utilisant '${detail.slug}' comme axe`} T={T}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {detail.used_by_masters.map((m) => (
                    <Link key={m.id} to={`/product/${m.slug}`} target="_blank" style={{
                      display: "flex", alignItems: "center", gap: 10, padding: 10,
                      background: T.cardAlt, borderRadius: 10, textDecoration: "none",
                      border: `1px solid ${T.border}`,
                    }}>
                      {m.primary_image ? (
                        <img src={m.primary_image} alt="" style={{
                          width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: 6, background: T.card,
                          border: `1px solid ${T.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}><ImageIcon size={14} color={T.mutedL} /></div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{m.title}</div>
                        <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                          {m.category_name} · axes : {m.variant_axes.join(", ")}
                        </div>
                      </div>
                      <ExternalLink size={11} color={T.mutedL} />
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "16px 26px", borderTop: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "0 0 20px 20px",
            display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onEdit(detail)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
                borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                background: T.card, color: T.text, border: `1px solid ${T.border}`, cursor: "pointer",
              }}>
                <Edit3 size={13} /> Modifier
              </button>
              {detail.role !== "AXE" && (
                <button onClick={() => changeRole("AXE")} style={btnColored(ROLE_COLORS.AXE)}>
                  Promouvoir en AXE
                </button>
              )}
              {detail.role !== "SPEC" && (
                <button onClick={() => changeRole("SPEC")} style={btnColored(ROLE_COLORS.SPEC)}>
                  Passer en SPEC
                </button>
              )}
              {detail.role !== "OFFRE" && (
                <button onClick={() => changeRole("OFFRE")} style={btnColored(ROLE_COLORS.OFFRE)}>
                  Passer en OFFRE
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FORM MODAL
// ═════════════════════════════════════════════════════════════════════════════

function AttributeFormModal({ attribute, onClose, onSaved }: {
  attribute: AdminAttributeDetail | null;
  onClose: () => void; onSaved: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const isEdit = attribute !== null;

  const [form, setForm] = useState<AttributeUpdatePayload>({
    name: attribute?.name ?? "",
    slug: attribute?.slug ?? "",
    role: attribute?.role ?? "SPEC",
    values_type: attribute?.values_type ?? "SELECT",
    attribute_type: attribute?.attribute_type ?? "OTHER",
    is_universal: attribute?.is_universal ?? false,
    is_required: attribute?.is_required ?? false,
    category: attribute?.category ?? null,
    values: attribute?.values ?? [],
    unit: attribute?.unit ?? "",
    display_order: attribute?.display_order ?? 100,
  });
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);

  const addValue = () => {
    const v = newValue.trim();
    if (!v) return;
    if ((form.values ?? []).includes(v)) {
      showToast("Cette valeur existe déjà", "warning");
      return;
    }
    setForm({ ...form, values: [...(form.values ?? []), v] });
    setNewValue("");
  };
  const removeValue = (v: string | number) => {
    setForm({ ...form, values: (form.values ?? []).filter((x) => x !== v) });
  };

  const handleSubmit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      showToast("Nom trop court", "warning"); return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateAttribute(attribute.id, form);
        showToast("Attribut mis à jour", "success");
      } else {
        await adminApi.createAttribute(form);
        showToast("Attribut créé", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Erreur";
      showToast(msg, "error");
    } finally { setBusy(false); }
  };

  return (
    <ModalShell onClose={onClose} T={T} maxWidth={640}>
      <div style={{
        padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "20px 20px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
          {isEdit ? `Modifier ${attribute.name}` : "Nouvel attribut"}
        </h2>
        <button onClick={onClose} style={{
          padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
          cursor: "pointer", display: "flex",
        }}><X size={16} color={T.muted} /></button>
      </div>

      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <FormField label="Nom *" T={T}>
          <input type="text" value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex : Stockage"
            style={inputStyle(T)} />
        </FormField>

        {isEdit && (
          <FormField label="Slug (auto-généré à la création)" T={T}>
            <input type="text" value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="phone-storage"
              style={inputStyle(T)} />
          </FormField>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Rôle" T={T}>
            <select value={form.role ?? "SPEC"}
              onChange={(e) => setForm({ ...form, role: e.target.value as AttributeRole })}
              style={inputStyle(T)}>
              {(["AXE", "SPEC", "OFFRE"] as AttributeRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Type de valeurs" T={T}>
            <select value={form.values_type ?? "SELECT"}
              onChange={(e) => setForm({ ...form, values_type: e.target.value as AttributeValuesType })}
              style={inputStyle(T)}>
              {VALUES_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </FormField>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Toggle label="Universel" value={!!form.is_universal}
            onChange={(v) => setForm({ ...form, is_universal: v, category: v ? null : form.category })}
            T={T} />
          <Toggle label="Obligatoire (is_required)" value={!!form.is_required}
            onChange={(v) => setForm({ ...form, is_required: v })} T={T} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Unité (ex : Go, mAh)" T={T}>
            <input type="text" value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Ex : Go" style={inputStyle(T)} />
          </FormField>
          <FormField label="Display order" T={T}>
            <input type="number" value={form.display_order ?? 100}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
              style={inputStyle(T)} />
          </FormField>
        </div>

        {/* Values editor */}
        {(form.values_type === "SELECT" || form.values_type === "NUMBER") && (
          <FormField label={`Valeurs prédéfinies (${(form.values ?? []).length})`} T={T}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } }}
                placeholder="Ajouter une valeur (Enter)" style={inputStyle(T)} />
              <button onClick={addValue} style={{
                padding: "10px 14px", borderRadius: 10, background: T.red, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 4,
              }}><Plus size={12} /> Ajouter</button>
            </div>
            {(form.values ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {(form.values ?? []).map((v, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 8, fontSize: 12,
                    background: T.cardAlt, color: T.text,
                    border: `1px solid ${T.border}`,
                  }}>
                    {v}{form.unit && ` ${form.unit}`}
                    <button onClick={() => removeValue(v)} style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: T.mutedL, padding: 0, display: "flex",
                    }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </FormField>
        )}
      </div>

      <div style={{
        padding: "16px 26px", borderTop: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "0 0 20px 20px",
        display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
          borderRadius: 10, fontSize: 12.5, fontWeight: 700,
          background: T.card, color: T.text, border: `1px solid ${T.border}`, cursor: "pointer",
        }}>Annuler</button>
        <button onClick={handleSubmit} disabled={busy}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: T.red, color: "#fff", border: "none",
            cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          {isEdit ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </ModalShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═════════════════════════════════════════════════════════════════════════════

function ModalShell({ onClose, T, maxWidth = 820, children }: {
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

function StatCell({ label, value, T, color }: {
  label: string; value: number; T: AdminTokens; color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color ?? T.text, marginTop: 2 }}>
        {value}
      </div>
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