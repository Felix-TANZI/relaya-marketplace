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
import { useTranslation } from "react-i18next";
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

const ROLE_DESCRIPTION_KEYS: Record<AttributeRole, string> = {
  AXE: "ad3_attributes.role_desc_axe",
  SPEC: "ad3_attributes.role_desc_spec",
  OFFRE: "ad3_attributes.role_desc_offre",
};

const VALUES_TYPES: AttributeValuesType[] = ["SELECT", "NUMBER", "BOOL", "TEXT", "COLORDICT", "BRAND"];

// ═════════════════════════════════════════════════════════════════════════════

export default function AdminAttributesPage() {
  const T = useAdminTheme();
  const { t } = useTranslation();
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
    } catch { showToast(t("ad3_attributes.toast_error_load"), "error"); }
    finally { setLoading(false); }
  }, [tab, search, valuesTypeFilter, universalFilter, showToast, t]);

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
      showToast(t("ad3_attributes.toast_role_changed", { role }), "success");
      load();
    } catch { showToast(t("ad3_attributes.toast_error_generic"), "error"); }
  };

  const handleDelete = async (attr: AdminAttribute) => {
    const ok = await confirm({
      title: t("ad3_attributes.confirm_delete_title", { name: attr.name }),
      message: attr.used_as_axis_count > 0
        ? t("ad3_attributes.confirm_delete_used_message", { count: attr.used_as_axis_count })
        : t("ad3_attributes.confirm_delete_unused_message"),
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteAttribute(attr.id);
      showToast(t("ad3_attributes.toast_deleted", { name: attr.name }), "success");
      load();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? t("ad3_attributes.error_delete_default");
      showToast(msg, "error");
    }
  };

  const bulkSetRole = async (role: AttributeRole) => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: t("ad3_attributes.confirm_bulk_role_title", { role, count: selectedIds.size }),
      message: t("ad3_attributes.confirm_bulk_role_message"),
      type: "info",
    });
    if (!ok) return;
    try {
      const res = await adminApi.bulkSetAttributesRole(Array.from(selectedIds), role);
      showToast(t("ad3_attributes.toast_bulk_updated", { count: res.updated_count }), "success");
      load();
    } catch { showToast(t("ad3_attributes.toast_error_bulk"), "error"); }
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
          }}>{t("ad3_attributes.title")}</h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {t("ad3_attributes.subtitle_counts", { axe: counts.AXE, spec: counts.SPEC, offre: counts.OFFRE })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} style={btnGhost(T)}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {t("ad3_attributes.btn_refresh")}
          </button>
          <button onClick={() => setEditItem("new")} style={btnPrimary(T)}>
            <Plus size={12} /> {t("ad3_attributes.btn_new")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "AXE", "SPEC", "OFFRE"] as RoleTab[]).map((k) => {
          const isActive = tab === k;
          const label = k === "all" ? t("ad3_attributes.tab_all") : ROLE_LABELS[k];
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
            placeholder={t("ad3_attributes.search_placeholder")}
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
          <option value="">{t("ad3_attributes.filter_all_types")}</option>
          {VALUES_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
        </select>

        <select value={universalFilter}
          onChange={(e) => setUniversalFilter(e.target.value as "any" | "yes" | "no")}
          style={selectStyle(T)}>
          <option value="any">{t("ad3_attributes.filter_universal_both")}</option>
          <option value="yes">{t("ad3_attributes.filter_universal_only")}</option>
          <option value="no">{t("ad3_attributes.filter_category_specific")}</option>
        </select>

        {selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red,
              padding: "6px 12px", background: T.red + "15", borderRadius: 20,
            }}>{t("ad3_attributes.selected_count", { count: selectedIds.size })}</span>
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
            {t("ad3_attributes.loading")}
          </div>
        ) : attributes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <Zap size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>{t("ad3_attributes.empty_state")}</p>
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
                  <TH>{t("ad3_attributes.col_name")}</TH>
                  <TH>{t("ad3_attributes.col_role")}</TH>
                  <TH>{t("ad3_attributes.col_type")}</TH>
                  <TH>{t("ad3_attributes.col_scope")}</TH>
                  <TH>{t("ad3_attributes.col_values")}</TH>
                  <TH>{t("ad3_attributes.col_usage")}</TH>
                  <TH>{t("ad3_attributes.col_actions")}</TH>
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
  const { t } = useTranslation();
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
          }}>{t("ad3_attributes.badge_universal")}</span>
        ) : (
          <span style={{ color: T.muted }}>{attr.category_name ?? "—"}</span>
        )}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: T.text }}>
        {attr.values_count > 0 ? (
          <span title={attr.values.join(", ")}>
            {t(attr.values_count > 1 ? "ad3_attributes.values_count_plural" : "ad3_attributes.values_count", { count: attr.values_count })}
          </span>
        ) : (
          <span style={{ color: T.mutedL, fontStyle: "italic" }}>{t("ad3_attributes.values_free")}</span>
        )}
        {attr.unit && <span style={{ color: T.mutedL, marginLeft: 4 }}>({attr.unit})</span>}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: T.text }}>
        {attr.used_as_axis_count > 0 ? (
          <span>{t(attr.used_as_axis_count > 1 ? "ad3_attributes.fiche_count_plural" : "ad3_attributes.fiche_count", { count: attr.used_as_axis_count })}</span>
        ) : (
          <span style={{ color: T.mutedL }}>—</span>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn onClick={onDetail} title={t("ad3_attributes.action_details")} T={T}><Eye size={12} /></ActionBtn>
          <ActionBtn onClick={onEdit} title={t("ad3_attributes.action_edit")} T={T}><Edit3 size={12} /></ActionBtn>
          {attr.role !== "AXE" && (
            <ActionBtn onClick={() => onSetRole("AXE")} title={t("ad3_attributes.action_promote_axe")} T={T}
              color={ROLE_COLORS.AXE}><Zap size={12} /></ActionBtn>
          )}
          {attr.used_as_axis_count === 0 && (
            <ActionBtn onClick={onDelete} title={t("ad3_attributes.action_delete")} T={T} color="#DC2626">
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
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<AdminAttributeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getAttributeDetail(attributeId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) showToast(t("ad3_attributes.toast_error_load"), "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attributeId, showToast, t]);

  const changeRole = async (role: AttributeRole) => {
    if (!detail || detail.role === role) return;
    try {
      const updated = await adminApi.setAttributeRole(detail.id, role);
      setDetail(updated);
      showToast(t("ad3_attributes.toast_role_changed", { role }), "success");
      onModified();
    } catch { showToast(t("ad3_attributes.toast_error_generic"), "error"); }
  };

  return (
    <ModalShell onClose={onClose} T={T}>
      {loading || !detail ? (
        <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          {t("ad3_attributes.loading")}
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
                {detail.is_universal ? t("ad3_attributes.universal_attribute_label") : (
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
                <strong style={{ color: ROLE_COLORS[detail.role] }}>{t("ad3_attributes.role_label", { role: detail.role })}</strong> — {t(ROLE_DESCRIPTION_KEYS[detail.role])}
              </div>
            </div>

            {/* Valeurs */}
            <Section title={detail.unit
              ? t("ad3_attributes.values_available_with_unit", { unit: detail.unit })
              : t("ad3_attributes.values_available")} T={T}>
              {detail.values.length === 0 ? (
                <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                  {t("ad3_attributes.no_predefined_values")}
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
            <Section title={t("ad3_attributes.section_usage")} T={T}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
                background: T.cardAlt, padding: 14, borderRadius: 12,
              }}>
                <StatCell label={t("ad3_attributes.stat_used_by_fiches")} value={detail.stats.used_as_axis_count} T={T} />
                <StatCell label={t("ad3_attributes.stat_approved_fiches")} value={detail.stats.approved_masters_using} T={T} color={ROLE_COLORS.SPEC} />
                <StatCell label={t("ad3_attributes.stat_predefined_values")} value={detail.stats.values_count} T={T} />
              </div>
            </Section>

            {/* Fiches utilisatrices */}
            {detail.used_by_masters.length > 0 && (
              <Section title={t("ad3_attributes.section_master_fiches", { slug: detail.slug })} T={T}>
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
                          {t("ad3_attributes.category_axes_label", { category: m.category_name, axes: m.variant_axes.join(", ") })}
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
                <Edit3 size={13} /> {t("ad3_attributes.action_edit")}
              </button>
              {detail.role !== "AXE" && (
                <button onClick={() => changeRole("AXE")} style={btnColored(ROLE_COLORS.AXE)}>
                  {t("ad3_attributes.action_promote_to_axe")}
                </button>
              )}
              {detail.role !== "SPEC" && (
                <button onClick={() => changeRole("SPEC")} style={btnColored(ROLE_COLORS.SPEC)}>
                  {t("ad3_attributes.action_switch_to_spec")}
                </button>
              )}
              {detail.role !== "OFFRE" && (
                <button onClick={() => changeRole("OFFRE")} style={btnColored(ROLE_COLORS.OFFRE)}>
                  {t("ad3_attributes.action_switch_to_offre")}
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
  const { t } = useTranslation();
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
      showToast(t("ad3_attributes.toast_value_exists"), "warning");
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
      showToast(t("ad3_attributes.toast_name_too_short"), "warning"); return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateAttribute(attribute.id, form);
        showToast(t("ad3_attributes.toast_updated"), "success");
      } else {
        await adminApi.createAttribute(form);
        showToast(t("ad3_attributes.toast_created"), "success");
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? t("ad3_attributes.error_generic");
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
          {isEdit ? t("ad3_attributes.form_title_edit", { name: attribute.name }) : t("ad3_attributes.form_title_new")}
        </h2>
        <button onClick={onClose} style={{
          padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
          cursor: "pointer", display: "flex",
        }}><X size={16} color={T.muted} /></button>
      </div>

      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <FormField label={t("ad3_attributes.field_name")} T={T}>
          <input type="text" value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("ad3_attributes.placeholder_name_example")}
            style={inputStyle(T)} />
        </FormField>

        {isEdit && (
          <FormField label={t("ad3_attributes.field_slug")} T={T}>
            <input type="text" value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="phone-storage"
              style={inputStyle(T)} />
          </FormField>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label={t("ad3_attributes.field_role")} T={T}>
            <select value={form.role ?? "SPEC"}
              onChange={(e) => setForm({ ...form, role: e.target.value as AttributeRole })}
              style={inputStyle(T)}>
              {(["AXE", "SPEC", "OFFRE"] as AttributeRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]} — {t(ROLE_DESCRIPTION_KEYS[r])}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t("ad3_attributes.field_values_type")} T={T}>
            <select value={form.values_type ?? "SELECT"}
              onChange={(e) => setForm({ ...form, values_type: e.target.value as AttributeValuesType })}
              style={inputStyle(T)}>
              {VALUES_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </FormField>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Toggle label={t("ad3_attributes.field_universal")} value={!!form.is_universal}
            onChange={(v) => setForm({ ...form, is_universal: v, category: v ? null : form.category })}
            T={T} />
          <Toggle label={t("ad3_attributes.field_required")} value={!!form.is_required}
            onChange={(v) => setForm({ ...form, is_required: v })} T={T} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label={t("ad3_attributes.field_unit")} T={T}>
            <input type="text" value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder={t("ad3_attributes.placeholder_unit_example")} style={inputStyle(T)} />
          </FormField>
          <FormField label={t("ad3_attributes.field_display_order")} T={T}>
            <input type="number" value={form.display_order ?? 100}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
              style={inputStyle(T)} />
          </FormField>
        </div>

        {/* Values editor */}
        {(form.values_type === "SELECT" || form.values_type === "NUMBER") && (
          <FormField label={t("ad3_attributes.field_predefined_values", { count: (form.values ?? []).length })} T={T}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } }}
                placeholder={t("ad3_attributes.placeholder_add_value")} style={inputStyle(T)} />
              <button onClick={addValue} style={{
                padding: "10px 14px", borderRadius: 10, background: T.red, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 4,
              }}><Plus size={12} /> {t("ad3_attributes.btn_add")}</button>
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
        }}>{t("ad3_attributes.btn_cancel")}</button>
        <button onClick={handleSubmit} disabled={busy}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: T.red, color: "#fff", border: "none",
            cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          {isEdit ? t("ad3_attributes.btn_save") : t("ad3_attributes.btn_create")}
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