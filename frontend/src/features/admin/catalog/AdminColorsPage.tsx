// frontend/src/features/admin/catalog/AdminColorsPage.tsx
// Gestion du Dictionnaire couleurs — Admin BelivaY
//
// UX visuelle :
//   - Grille de swatches (couleurs affichées comme pastilles rondes)
//   - Tabs : Toutes / Couleurs / Finitions / Neutres / Inactives
//   - Recherche + filtres
//   - Actions : voir détail, éditer, activate/deactivate, supprimer (si non utilisée)
//   - Bulk activate/deactivate
//   - Modale detail avec preview grande + usage
//   - Modale create/edit avec color picker HTML5

import { useEffect, useState, useCallback } from "react";
import {
  Search, Check, X, RefreshCw, Eye, Plus, Edit3, Trash2,
  Palette, Droplet, Sparkles,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminColor, type AdminColorDetail,
  type ColorListFilters, type ColorUpdatePayload, type ColorFamily,
} from "@/services/api/admin";

type FamilyTab = "all" | "COLOR" | "FINISH" | "neutral" | "inactive";

const FAMILY_LABELS: Record<FamilyTab, string> = {
  all: "Toutes",
  COLOR: "Couleurs",
  FINISH: "Finitions",
  neutral: "Neutres",
  inactive: "Inactives",
};

const FAMILY_ICONS: Record<FamilyTab, React.ElementType> = {
  all: Palette,
  COLOR: Droplet,
  FINISH: Sparkles,
  neutral: Palette,
  inactive: X,
};

// ═════════════════════════════════════════════════════════════════════════════

export default function AdminColorsPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [colors, setColors] = useState<AdminColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    all: 0, COLOR: 0, FINISH: 0, neutral: 0, inactive: 0,
  });

  const [tab, setTab] = useState<FamilyTab>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<AdminColorDetail | null | "new">(null);

  const filtersFromTab = (t: FamilyTab): ColorListFilters => {
    switch (t) {
      case "COLOR": return { family: "COLOR" };
      case "FINISH": return { family: "FINISH" };
      case "neutral": return { is_neutral: true };
      case "inactive": return { is_active: false };
      default: return {};
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ColorListFilters = { ...filtersFromTab(tab) };
      if (search.trim()) filters.search = search.trim();
      const data = await adminApi.listColors(filters);
      setColors(data);
      setSelectedIds(new Set());
    } catch { showToast("Erreur chargement", "error"); }
    finally { setLoading(false); }
  }, [tab, search, showToast]);

  useEffect(() => { load(); }, [load]);

  const loadCounts = useCallback(async () => {
    try {
      const [all, color, finish, neutral, inactive] = await Promise.all([
        adminApi.listColors({}),
        adminApi.listColors({ family: "COLOR" }),
        adminApi.listColors({ family: "FINISH" }),
        adminApi.listColors({ is_neutral: true }),
        adminApi.listColors({ is_active: false }),
      ]);
      setCounts({
        all: all.length, COLOR: color.length, FINISH: finish.length,
        neutral: neutral.length, inactive: inactive.length,
      });
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts, colors.length]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleActivate = async (c: AdminColor) => {
    try { await adminApi.activateColor(c.id); showToast(`${c.name} activée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleDeactivate = async (c: AdminColor) => {
    try { await adminApi.deactivateColor(c.id); showToast(`${c.name} désactivée`, "success"); load(); }
    catch { showToast("Erreur", "error"); }
  };
  const handleDelete = async (c: AdminColor) => {
    const ok = await confirm({
      title: `Supprimer ${c.name} ?`,
      message: c.used_by_variants_count > 0
        ? `⚠️ Cette couleur est référencée par ${c.used_by_variants_count} variant(s). La suppression sera refusée. Utilise plutôt "Désactiver".`
        : "Aucun variant ne la référence. Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteColor(c.id);
      showToast(`${c.name} supprimée`, "success"); load();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Impossible.";
      showToast(msg, "error");
    }
  };

  const bulkAction = async (label: string, fn: (ids: number[]) => Promise<{ updated_count: number }>) => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `${label} ${selectedIds.size} couleur(s) ?`,
      message: "Immédiat.", type: "info",
    });
    if (!ok) return;
    try {
      const res = await fn(Array.from(selectedIds));
      showToast(`${res.updated_count} couleur(s) traitée(s)`, "success");
      load();
    } catch { showToast("Erreur", "error"); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === colors.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(colors.map((c) => c.id)));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
            color: T.text, marginBottom: 4,
          }}>Dictionnaire couleurs</h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {counts.COLOR} couleurs · {counts.FINISH} finitions
            {counts.inactive > 0 && ` · ${counts.inactive} désactivée${counts.inactive > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} style={btnGhost(T)}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <button onClick={() => setEditItem("new")} style={btnPrimary(T)}>
            <Plus size={12} /> Nouvelle entrée
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "COLOR", "FINISH", "neutral", "inactive"] as FamilyTab[]).map((k) => {
          const isActive = tab === k;
          const count = counts[k];
          const Icon = FAMILY_ICONS[k];
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              background: isActive ? T.red : T.cardAlt,
              color: isActive ? "#fff" : T.text,
              border: `1px solid ${isActive ? T.red : T.border}`, cursor: "pointer",
            }}>
              <Icon size={12} />
              {FAMILY_LABELS[k]}
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : T.card,
                color: isActive ? "#fff" : T.muted,
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
            placeholder="Nom (FR ou EN) ou slug..."
            style={{
              width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10,
              fontSize: 12.5, background: T.input, color: T.text,
              border: `1px solid ${T.inputBorder}`, outline: "none",
            }}
          />
        </div>

        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <button onClick={() => setViewMode("grid")} style={{
            padding: "9px 12px", fontSize: 11.5, fontWeight: 600,
            background: viewMode === "grid" ? T.red : T.cardAlt,
            color: viewMode === "grid" ? "#fff" : T.muted,
            border: "none", cursor: "pointer",
          }}>Grille</button>
          <button onClick={() => setViewMode("list")} style={{
            padding: "9px 12px", fontSize: 11.5, fontWeight: 600,
            background: viewMode === "list" ? T.red : T.cardAlt,
            color: viewMode === "list" ? "#fff" : T.muted,
            border: "none", cursor: "pointer",
          }}>Liste</button>
        </div>

        {selectedIds.size > 0 && (
          <>
            <span style={{
              fontSize: 11.5, fontWeight: 700, color: T.red,
              padding: "6px 12px", background: T.red + "15", borderRadius: 20,
            }}>{selectedIds.size} sélectionnée(s)</span>
            <button onClick={() => bulkAction("Activer", adminApi.bulkActivateColors)}
              style={btnColored("#059669")}>
              <Check size={11} /> Activer
            </button>
            <button onClick={() => bulkAction("Désactiver", adminApi.bulkDeactivateColors)}
              style={btnColored("#DC2626")}>
              <X size={11} /> Désactiver
            </button>
          </>
        )}
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div style={{
          padding: 60, textAlign: "center", color: T.muted,
          background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
        }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          Chargement...
        </div>
      ) : colors.length === 0 ? (
        <div style={{
          padding: 60, textAlign: "center", color: T.muted,
          background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
        }}>
          <Palette size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>Aucune entrée dans ce filtre.</p>
        </div>
      ) : viewMode === "grid" ? (
        <ColorGrid colors={colors} T={T} selectedIds={selectedIds}
          onToggle={toggleSelect}
          onDetail={setDetailId}
          onEdit={async (c) => {
            try { const d = await adminApi.getColorDetail(c.id); setEditItem(d); }
            catch { showToast("Erreur", "error"); }
          }}
          onActivate={handleActivate} onDeactivate={handleDeactivate}
        />
      ) : (
        <ColorList colors={colors} T={T} selectedIds={selectedIds}
          onToggle={toggleSelect} onToggleAll={toggleAll}
          onDetail={setDetailId}
          onEdit={async (c) => {
            try { const d = await adminApi.getColorDetail(c.id); setEditItem(d); }
            catch { showToast("Erreur", "error"); }
          }}
          onActivate={handleActivate} onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      )}

      {/* Modales */}
      {detailId !== null && (
        <ColorDetailModal
          colorId={detailId}
          onClose={() => setDetailId(null)}
          onModified={() => { setDetailId(null); load(); }}
          onEdit={(d) => { setDetailId(null); setEditItem(d); }}
        />
      )}
      {editItem !== null && (
        <ColorFormModal
          color={editItem === "new" ? null : editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load(); }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED STYLES
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

// ═════════════════════════════════════════════════════════════════════════════
// GRID VIEW — swatches visuelles
// ═════════════════════════════════════════════════════════════════════════════

function ColorGrid({
  colors, T, selectedIds, onToggle, onDetail, onEdit,
  onActivate, onDeactivate,
}: {
  colors: AdminColor[]; T: AdminTokens; selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onDetail: (id: number) => void; onEdit: (c: AdminColor) => void;
  onActivate: (c: AdminColor) => void; onDeactivate: (c: AdminColor) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 12,
    }}>
      {colors.map((c) => (
        <ColorCard key={c.id} color={c} T={T}
          isSelected={selectedIds.has(c.id)}
          onToggle={() => onToggle(c.id)}
          onDetail={() => onDetail(c.id)}
          onEdit={() => onEdit(c)}
          onActivate={() => onActivate(c)}
          onDeactivate={() => onDeactivate(c)}
        />
      ))}
    </div>
  );
}

function ColorCard({
  color, T, isSelected, onToggle, onDetail, onEdit, onActivate, onDeactivate,
}: {
  color: AdminColor; T: AdminTokens; isSelected: boolean;
  onToggle: () => void; onDetail: () => void; onEdit: () => void;
  onActivate: () => void; onDeactivate: () => void;
}) {
  const hex = color.hex_code || "#E5E7EB";
  return (
    <div style={{
      background: T.card,
      borderRadius: 16, border: `2px solid ${isSelected ? T.red : T.border}`,
      overflow: "hidden", position: "relative",
      opacity: color.is_active ? 1 : 0.55,
    }}>
      {/* Checkbox */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
      </div>

      {/* Big swatch */}
      <button onClick={onDetail} style={{
        width: "100%", height: 100, background: hex,
        border: "none", cursor: "pointer", display: "block", position: "relative",
        backgroundImage: color.pattern_url ? `url(${color.pattern_url})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        {!color.is_active && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.4)", color: "#fff",
            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
          }}>DÉSACTIVÉE</div>
        )}
      </button>

      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3,
              display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
            }}>
              {color.name}
              {color.is_neutral && (
                <span title="Couleur neutre" style={{
                  fontSize: 9, fontWeight: 700, background: T.cardAlt, color: T.muted,
                  padding: "1px 6px", borderRadius: 4,
                }}>N</span>
              )}
            </div>
            {color.name_en && (
              <div style={{ fontSize: 10.5, color: T.mutedL, fontStyle: "italic" }}>
                {color.name_en}
              </div>
            )}
          </div>
          <FamilyBadge family={color.family} T={T} />
        </div>

        <div style={{
          marginTop: 8, fontSize: 10, color: T.mutedL,
          fontFamily: "monospace", display: "flex", justifyContent: "space-between",
        }}>
          <span>{color.hex_code || "—"}</span>
          {color.used_by_variants_count > 0 && (
            <span>{color.used_by_variants_count} var.</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
          <IconBtn onClick={onEdit} title="Modifier" T={T}><Edit3 size={11} /></IconBtn>
          {color.is_active ? (
            <IconBtn onClick={onDeactivate} title="Désactiver" T={T} color="#DC2626">
              <X size={11} />
            </IconBtn>
          ) : (
            <IconBtn onClick={onActivate} title="Activer" T={T} color="#059669">
              <Check size={11} />
            </IconBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, T, color, children }: {
  onClick: () => void; title: string; T: AdminTokens; color?: string; children: React.ReactNode;
}) {
  const c = color ?? T.text;
  return (
    <button onClick={onClick} title={title} style={{
      padding: "5px 6px", borderRadius: 6,
      background: color ? c + "18" : T.cardAlt, color: c,
      border: `1px solid ${color ? c + "44" : T.border}`, cursor: "pointer",
      display: "flex", alignItems: "center",
    }}>{children}</button>
  );
}

function FamilyBadge({ family }: { family: ColorFamily; T: AdminTokens }) {
  const color = family === "COLOR" ? "#2563EB" : "#7C3AED";
  return (
    <span style={{
      display: "inline-block", padding: "2px 6px", borderRadius: 4,
      fontSize: 9, fontWeight: 700, background: color + "18", color,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>{family}</span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LIST VIEW — tableau compact
// ═════════════════════════════════════════════════════════════════════════════

function ColorList({
  colors, T, selectedIds, onToggle, onToggleAll,
  onDetail, onEdit, onActivate, onDeactivate, onDelete,
}: {
  colors: AdminColor[]; T: AdminTokens;
  selectedIds: Set<number>;
  onToggle: (id: number) => void; onToggleAll: () => void;
  onDetail: (id: number) => void; onEdit: (c: AdminColor) => void;
  onActivate: (c: AdminColor) => void; onDeactivate: (c: AdminColor) => void;
  onDelete: (c: AdminColor) => void;
}) {
  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
              <th style={{ padding: "12px 16px", width: 40 }}>
                <input type="checkbox"
                  checked={selectedIds.size === colors.length && colors.length > 0}
                  onChange={onToggleAll} />
              </th>
              <th style={thStyle}>Couleur</th>
              <th style={thStyle}>Famille</th>
              <th style={thStyle}>Hex</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Usage</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((c) => (
              <tr key={c.id} style={{
                borderBottom: `1px solid ${T.border}`,
                background: selectedIds.has(c.id) ? T.cardAlt : T.card,
                opacity: c.is_active ? 1 : 0.6,
              }}>
                <td style={{ padding: "10px 16px" }}>
                  <input type="checkbox" checked={selectedIds.has(c.id)}
                    onChange={() => onToggle(c.id)} />
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <button onClick={() => onDetail(c.id)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "transparent", border: "none", cursor: "pointer", padding: 0,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: c.hex_code || "#E5E7EB",
                      border: `2px solid ${T.border}`, flexShrink: 0,
                    }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {c.name}
                        {c.is_neutral && (
                          <span style={{
                            marginLeft: 4, fontSize: 9, background: T.cardAlt, color: T.muted,
                            padding: "1px 5px", borderRadius: 3,
                          }}>N</span>
                        )}
                      </div>
                      {c.name_en && (
                        <div style={{ fontSize: 10.5, color: T.mutedL, fontStyle: "italic" }}>{c.name_en}</div>
                      )}
                    </div>
                  </button>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <FamilyBadge family={c.family} T={T} />
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <code style={{
                    fontSize: 11, background: T.cardAlt, padding: "3px 7px",
                    borderRadius: 4, color: T.text, fontFamily: "monospace",
                  }}>{c.hex_code || "—"}</code>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  {c.is_active ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#059669",
                      background: "#05966918", padding: "2px 8px", borderRadius: 20,
                    }}>ACTIVE</span>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                      background: "#9CA3AF18", padding: "2px 8px", borderRadius: 20,
                    }}>INACTIVE</span>
                  )}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.text }}>
                  {c.used_by_variants_count > 0
                    ? `${c.used_by_variants_count} variant(s)`
                    : <span style={{ color: T.mutedL }}>—</span>}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <IconBtn onClick={() => onDetail(c.id)} title="Détails" T={T}>
                      <Eye size={11} />
                    </IconBtn>
                    <IconBtn onClick={() => onEdit(c)} title="Modifier" T={T}>
                      <Edit3 size={11} />
                    </IconBtn>
                    {c.is_active ? (
                      <IconBtn onClick={() => onDeactivate(c)} title="Désactiver" T={T} color="#DC2626">
                        <X size={11} />
                      </IconBtn>
                    ) : (
                      <IconBtn onClick={() => onActivate(c)} title="Activer" T={T} color="#059669">
                        <Check size={11} />
                      </IconBtn>
                    )}
                    {c.used_by_variants_count === 0 && (
                      <IconBtn onClick={() => onDelete(c)} title="Supprimer" T={T} color="#DC2626">
                        <Trash2 size={11} />
                      </IconBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left", fontSize: 11,
  fontWeight: 700, textTransform: "uppercase", color: "#6B7280",
  letterSpacing: "0.05em",
};

// ═════════════════════════════════════════════════════════════════════════════
// DETAIL MODAL
// ═════════════════════════════════════════════════════════════════════════════

function ColorDetailModal({ colorId, onClose, onModified, onEdit }: {
  colorId: number;
  onClose: () => void; onModified: () => void;
  onEdit: (d: AdminColorDetail) => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<AdminColorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getColorDetail(colorId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) showToast("Erreur chargement", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [colorId, showToast]);

  const toggle = async (activate: boolean) => {
    if (!detail) return;
    try {
      const updated = activate
        ? await adminApi.activateColor(detail.id)
        : await adminApi.deactivateColor(detail.id);
      setDetail(updated);
      showToast(activate ? "Activée" : "Désactivée", "success");
      onModified();
    } catch { showToast("Erreur", "error"); }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Supprimer ${detail.name} ?`, message: "Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteColor(detail.id);
      showToast("Supprimée", "success");
      onClose(); onModified();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Impossible.";
      showToast(msg, "error");
    }
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
          {/* Header avec preview grande */}
          <div style={{
            padding: "24px 28px", borderBottom: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "20px 20px 0 0",
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: detail.hex_code || "#E5E7EB",
              backgroundImage: detail.pattern_url ? `url(${detail.pattern_url})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
              border: `3px solid ${T.border}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <FamilyBadge family={detail.family} T={T} />
                {detail.is_neutral && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: T.card, color: T.muted,
                    padding: "2px 8px", borderRadius: 4,
                  }}>NEUTRE</span>
                )}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>
                {detail.name}
              </h2>
              {detail.name_en && (
                <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", marginTop: 2 }}>
                  {detail.name_en}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <code style={{
                  fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                  color: T.text, fontFamily: "monospace", border: `1px solid ${T.border}`,
                }}>{detail.slug}</code>
                {detail.hex_code && (
                  <code style={{
                    fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                    color: T.text, fontFamily: "monospace",
                  }}>{detail.hex_code}</code>
                )}
                {!detail.is_active && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: "#DC262618",
                    color: "#DC2626", padding: "2px 8px", borderRadius: 20,
                  }}>INACTIVE</span>
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
          <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Stats */}
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
              }}>Utilisation</div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
                background: T.cardAlt, padding: 14, borderRadius: 12,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
                    Variants total
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 2 }}>
                    {detail.stats.variants_using}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
                    Approuvés
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#059669", marginTop: 2 }}>
                    {detail.stats.approved_variants_using}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
                    Suppression
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, marginTop: 2,
                    color: detail.is_deletable ? "#059669" : "#DC2626",
                  }}>
                    {detail.is_deletable ? "Possible" : "Bloquée"}
                  </div>
                </div>
              </div>
            </div>

            {/* Display order */}
            <div style={{ fontSize: 12, color: T.muted }}>
              Ordre d'affichage : <strong style={{ color: T.text }}>{detail.display_order}</strong>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "16px 28px", borderTop: `1px solid ${T.border}`,
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
              {detail.is_active ? (
                <button onClick={() => toggle(false)} style={btnColored("#DC2626")}>
                  <X size={13} /> Désactiver
                </button>
              ) : (
                <button onClick={() => toggle(true)} style={btnColored("#059669")}>
                  <Check size={13} /> Activer
                </button>
              )}
            </div>
            <div>
              {detail.is_deletable && (
                <button onClick={handleDelete} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
                  borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                  background: "#DC2626", color: "#fff", border: "none", cursor: "pointer",
                }}>
                  <Trash2 size={13} /> Supprimer
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

function ColorFormModal({ color, onClose, onSaved }: {
  color: AdminColorDetail | null;
  onClose: () => void; onSaved: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const isEdit = color !== null;

  const [form, setForm] = useState<ColorUpdatePayload>({
    family: color?.family ?? "COLOR",
    name: color?.name ?? "",
    name_en: color?.name_en ?? "",
    hex_code: color?.hex_code ?? "#000000",
    pattern_url: color?.pattern_url ?? "",
    is_neutral: color?.is_neutral ?? false,
    is_active: color?.is_active ?? true,
    display_order: color?.display_order ?? 100,
  });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      showToast("Nom trop court", "warning"); return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateColor(color.id, form);
        showToast("Couleur mise à jour", "success");
      } else {
        await adminApi.createColor(form);
        showToast("Couleur créée", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const detail = (err as { detail?: string; name?: string[]; hex_code?: string[] })?.detail
        ?? (err as { name?: string[] })?.name?.[0]
        ?? (err as { hex_code?: string[] })?.hex_code?.[0]
        ?? "Erreur";
      showToast(detail, "error");
    } finally { setBusy(false); }
  };

  const hex = form.hex_code ?? "#000000";

  return (
    <ModalShell onClose={onClose} T={T} maxWidth={560}>
      <div style={{
        padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "20px 20px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
          {isEdit ? `Modifier ${color.name}` : "Nouvelle entrée"}
        </h2>
        <button onClick={onClose} style={{
          padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
          cursor: "pointer", display: "flex",
        }}><X size={16} color={T.muted} /></button>
      </div>

      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: 14, background: T.cardAlt, borderRadius: 12,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: hex, border: `3px solid ${T.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            backgroundImage: form.pattern_url ? `url(${form.pattern_url})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
              {form.name || "Nom de la couleur"}
            </div>
            {form.name_en && (
              <div style={{ fontSize: 11.5, color: T.muted, fontStyle: "italic" }}>{form.name_en}</div>
            )}
            <code style={{
              fontSize: 11, background: T.card, padding: "2px 6px",
              borderRadius: 4, color: T.text, fontFamily: "monospace", marginTop: 4, display: "inline-block",
            }}>{hex}</code>
          </div>
        </div>

        <FormField label="Famille" T={T}>
          <select value={form.family ?? "COLOR"}
            onChange={(e) => setForm({ ...form, family: e.target.value as ColorFamily })}
            style={inputStyle(T)}>
            <option value="COLOR">COLOR — Couleur vraie</option>
            <option value="FINISH">FINISH — Finition / matériau</option>
          </select>
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Nom (FR) *" T={T}>
            <input type="text" value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Noir"
              style={inputStyle(T)} />
          </FormField>
          <FormField label="Nom (EN)" T={T}>
            <input type="text" value={form.name_en ?? ""}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="Ex : Black"
              style={inputStyle(T)} />
          </FormField>
        </div>

        <FormField label="Code hexadécimal" T={T}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={hex}
              onChange={(e) => setForm({ ...form, hex_code: e.target.value.toUpperCase() })}
              style={{
                width: 48, height: 40, borderRadius: 8,
                border: `1px solid ${T.inputBorder}`, cursor: "pointer",
              }}
            />
            <input type="text" value={form.hex_code ?? ""}
              onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
              placeholder="#000000"
              style={{ ...inputStyle(T), fontFamily: "monospace", textTransform: "uppercase" }}
            />
          </div>
        </FormField>

        <FormField label="URL image motif (optionnel — pour finitions à texture)" T={T}>
          <input type="url" value={form.pattern_url ?? ""}
            onChange={(e) => setForm({ ...form, pattern_url: e.target.value })}
            placeholder="https://..." style={inputStyle(T)} />
        </FormField>

        <FormField label="Display order" T={T}>
          <input type="number" value={form.display_order ?? 100}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            style={inputStyle(T)} />
        </FormField>

        <div style={{ display: "flex", gap: 16 }}>
          <Toggle label="Couleur neutre" value={!!form.is_neutral}
            onChange={(v) => setForm({ ...form, is_neutral: v })} T={T} />
          <Toggle label="Active" value={!!form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })} T={T} />
        </div>
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
        <button onClick={handleSubmit} disabled={busy} style={{
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

function ModalShell({ onClose, T, maxWidth = 720, children }: {
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