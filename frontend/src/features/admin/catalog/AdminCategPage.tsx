// frontend/src/features/admin/catalog/AdminCategoriesPage.tsx
// Gestion de l'arborescence des Catégories — Admin BelivaY (v3 fix)
//
// v3 — Corrections :
//   - FIX crash IconPicker : lucide-react exporte des non-icônes (Icon,
//     dynamicIconImports, LucideIcon, etc.). On liste maintenant les icônes
//     via dynamicIconImports (source officielle garantie) avec fallback
//     filtre strict basé sur $$typeof forwardRef.
//   - ErrorBoundary autour de la grille du picker pour capturer tout edge case
//   - renderLucideIcon défensif : refuse les noms non whitelistés

import {
  useEffect, useState, useCallback, useMemo, createElement, useRef,
  Component, type ReactNode, type ErrorInfo,
} from "react";
import { Link } from "react-router-dom";
import {
  Search, Check, X, RefreshCw, Eye, Plus, Edit3, Trash2,
  ChevronRight, ChevronDown, Folder, FolderOpen, ImageIcon,
  AlertTriangle, ExternalLink, FolderTree, Shield, ArrowUp, ArrowDown,
  Sparkles, Boxes, BookOpen, Grid3x3, XCircle,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminTokens } from "@/hooks/useAdminTheme";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import {
  adminApi,
  type AdminCategory, type AdminCategoryTreeNode,
  type AdminCategoryDetail, type CategoryUpdatePayload, type CategoryFlag,
} from "@/services/api/admin";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═════════════════════════════════════════════════════════════════════════════

const LEVEL_COLORS = [
  "#111827", "#F47920", "#059669", "#0891B2", "#7C3AED",
];

// Noms d'exports lucide-react qui NE SONT PAS des icônes valides.
// Pertinent uniquement pour le fallback (path 2 ci-dessous).
const NON_ICON_EXPORTS = new Set([
  "Icon", "LucideIcon", "createLucideIcon",
  "icons", "dynamicIconImports", "default",
  "LucideProps", "IconNode", "IconNodeChild",
]);

/**
 * Convertit un nom kebab-case ('user-check', 'a-arrow-down')
 * en PascalCase ('UserCheck', 'AArrowDown').
 */
function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : ""))
    .join("");
}

/**
 * Liste GARANTIE de vraies icônes lucide-react.
 *
 * Stratégie en 2 niveaux :
 *
 * 1. PRIORITÉ : utiliser `dynamicIconImports` de lucide (objet officiel
 *    listant toutes les icônes en kebab-case). C'est LA source de vérité.
 *    On convertit chaque clé en PascalCase et on vérifie que l'export
 *    correspondant existe.
 *
 * 2. FALLBACK : si `dynamicIconImports` n'est pas disponible (edge case,
 *    version majeure future), filtrer les exports via :
 *    - blacklist des non-icônes connus
 *    - vérification $$typeof (les icônes sont créées via forwardRef)
 *    - déduplication des alias
 */
const ALL_LUCIDE_ICONS: string[] = (() => {
  const lucide = LucideIcons as unknown as Record<string, unknown>;

  // ── Path 1 : source officielle via dynamicIconImports ────────────
  const dynImports = lucide.dynamicIconImports as Record<string, unknown> | undefined;
  if (dynImports && typeof dynImports === "object") {
    const names = Object.keys(dynImports)
      .map(kebabToPascal)
      .filter((name) => !!lucide[name])   // sanity check : l'export existe
      .sort();
    if (names.length > 0) return names;
  }

  // ── Path 2 : fallback avec filtre strict ─────────────────────────
  const seen = new Set<unknown>();
  return Object.entries(LucideIcons)
    .filter(([name, value]) => {
      if (NON_ICON_EXPORTS.has(name)) return false;
      if (typeof value !== "object" && typeof value !== "function") return false;
      if (!/^[A-Z]/.test(name)) return false;

      // Les icônes lucide sont créées via React.forwardRef, elles
      // ont donc un $$typeof = Symbol(react.forward_ref).
      // Cela exclut les objets bruts et les fonctions helper.
      const $$typeof = (value as { $$typeof?: symbol }).$$typeof;
      if (!$$typeof) return false;
      const typeStr = String($$typeof);
      if (!typeStr.includes("forward_ref") && !typeStr.includes("react.")) {
        return false;
      }

      // Dédupliquer les alias (Group → Users, etc.)
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map(([name]) => name)
    .sort();
})();

/** Set pour lookup O(1) — utilisé par renderLucideIcon. */
const VALID_ICON_NAMES = new Set(ALL_LUCIDE_ICONS);

// ═════════════════════════════════════════════════════════════════════════════
// UTILS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Rend une icône lucide de manière DÉFENSIVE.
 * Retourne null si :
 * - le nom est vide
 * - le nom n'est pas dans la whitelist des icônes valides
 * - l'export lucide correspondant n'existe pas
 */
function renderLucideIcon(name: string, size = 14, color?: string): React.ReactNode {
  if (!name) return null;
  if (!VALID_ICON_NAMES.has(name)) return null;
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  if (!IconComponent) return null;
  return createElement(IconComponent, { size, color });
}

function collectAllIds(nodes: AdminCategoryTreeNode[]): number[] {
  const ids: number[] = [];
  const walk = (n: AdminCategoryTreeNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

function filterTree(
  nodes: AdminCategoryTreeNode[], predicate: (n: AdminCategoryTreeNode) => boolean,
): AdminCategoryTreeNode[] {
  const out: AdminCategoryTreeNode[] = [];
  for (const n of nodes) {
    const kids = filterTree(n.children, predicate);
    if (predicate(n) || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — 3e couche de protection (si un icône passe la whitelist
// mais crashe quand même, on capture au lieu de casser toute la page).
// ═════════════════════════════════════════════════════════════════════════════

interface IconGridErrorBoundaryState {
  hasError: boolean;
}

class IconGridErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  IconGridErrorBoundaryState
> {
  state: IconGridErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): IconGridErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log discret — pas obligatoire mais utile pour debugging
    console.warn("[IconPicker] Rendering error caught:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminCategoriesPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [tree, setTree] = useState<AdminCategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<AdminCategoryDetail | null | "new">(null);
  const [newParentId, setNewParentId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCategoriesTree();
      setTree(data);
      setSelectedIds(new Set());
      if (expandedIds.size === 0) {
        setExpandedIds(new Set(data.map((r) => r.id)));
      }
    } catch { showToast("Erreur chargement", "error"); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    return filterTree(tree, (n) =>
      n.name.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q),
    );
  }, [tree, search]);

  useEffect(() => {
    if (search.trim()) {
      setExpandedIds(new Set(collectAllIds(filteredTree)));
    }
  }, [search, filteredTree]);

  const stats = useMemo(() => {
    const all = collectAllIds(tree);
    let deprecated = 0, inactive = 0, requiresApproval = 0;
    const walk = (n: AdminCategoryTreeNode) => {
      if (n.is_deprecated) deprecated++;
      if (!n.is_active) inactive++;
      if (n.requires_admin_approval) requiresApproval++;
      n.children.forEach(walk);
    };
    tree.forEach(walk);
    return { total: all.length, deprecated, inactive, requiresApproval };
  }, [tree]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedIds(new Set(collectAllIds(tree)));
  const collapseAll = () => setExpandedIds(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleFlag = async (cat: AdminCategory, flag: CategoryFlag, newValue: boolean) => {
    try {
      if (flag === "is_active") await adminApi.toggleCategoryActive(cat.id, newValue);
      else if (flag === "is_deprecated") await adminApi.toggleCategoryDeprecated(cat.id, newValue);
      else await adminApi.toggleCategoryApproval(cat.id, newValue);
      showToast(`${cat.name} mis à jour`, "success");
      load();
    } catch { showToast("Erreur", "error"); }
  };

  const handleMoveOrder = async (cat: AdminCategory, delta: number) => {
    const newOrder = Math.max(0, cat.display_order + delta);
    try {
      await adminApi.moveCategoryOrder(cat.id, newOrder);
      load();
    } catch { showToast("Erreur", "error"); }
  };

  const handleDelete = async (cat: AdminCategory) => {
    const ok = await confirm({
      title: `Supprimer '${cat.name}' ?`,
      message: cat.children_count > 0 || cat.masters_count > 0 || cat.attributes_count > 0
        ? `⚠️ ${cat.children_count} sous-catégorie(s), ${cat.masters_count} fiche(s), ${cat.attributes_count} attribut(s) attachés. La suppression sera refusée.`
        : "Action définitive.",
      type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteCategory(cat.id);
      showToast(`${cat.name} supprimée`, "success");
      load();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Impossible.";
      showToast(msg, "error");
    }
  };

  const openEdit = async (cat: AdminCategory) => {
    try {
      const detail = await adminApi.getCategoryDetail(cat.id);
      setEditItem(detail);
    } catch { showToast("Erreur", "error"); }
  };

  const openCreateChild = (parent: AdminCategory | null) => {
    setNewParentId(parent?.id ?? null);
    setEditItem("new");
  };

  const bulkFlag = async (flag: CategoryFlag, value: boolean) => {
    if (selectedIds.size === 0) return;
    const label = value
      ? (flag === "is_active" ? "Activer" : flag === "is_deprecated" ? "Marquer deprecated" : "Activer modération renforcée")
      : (flag === "is_active" ? "Désactiver" : flag === "is_deprecated" ? "Retirer deprecated" : "Désactiver modération renforcée");
    const ok = await confirm({
      title: `${label} ${selectedIds.size} catégorie(s) ?`,
      message: "Immédiat.", type: "info",
    });
    if (!ok) return;
    try {
      const res = await adminApi.bulkSetCategoriesFlag(Array.from(selectedIds), flag, value);
      showToast(`${res.updated_count} catégorie(s) mise(s) à jour`, "success");
      load();
    } catch { showToast("Erreur", "error"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
            color: T.text, marginBottom: 4,
          }}>Catégories</h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {stats.total} catégorie{stats.total > 1 ? "s" : ""} au total
            {stats.deprecated > 0 && ` · ${stats.deprecated} deprecated`}
            {stats.inactive > 0 && ` · ${stats.inactive} inactive${stats.inactive > 1 ? "s" : ""}`}
            {stats.requiresApproval > 0 && ` · ${stats.requiresApproval} en modération renforcée`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} style={btnGhost(T)}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <button onClick={() => openCreateChild(null)} style={btnPrimary(T)}>
            <Plus size={12} /> Nouvelle catégorie
          </button>
        </div>
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

        <button onClick={expandAll} style={btnGhost(T)} title="Tout déplier">
          <ChevronDown size={12} /> Tout déplier
        </button>
        <button onClick={collapseAll} style={btnGhost(T)} title="Tout replier">
          <ChevronRight size={12} /> Tout replier
        </button>

        {selectedIds.size > 0 && (
          <>
            <span style={{
              fontSize: 11.5, fontWeight: 700, color: T.red,
              padding: "6px 12px", background: T.red + "15", borderRadius: 20,
            }}>{selectedIds.size} sélectionnée(s)</span>
            <button onClick={() => bulkFlag("is_deprecated", true)}
              style={btnColored("#DC2626")}>
              <AlertTriangle size={11} /> Deprecated
            </button>
            <button onClick={() => bulkFlag("is_deprecated", false)}
              style={btnColored("#059669")}>
              <Check size={11} /> Retirer deprecated
            </button>
            <button onClick={() => bulkFlag("requires_admin_approval", true)}
              style={btnColored("#F59E0B")}>
              <Shield size={11} /> Mod. renforcée
            </button>
          </>
        )}
      </div>

      {/* Arbre */}
      <div style={{
        background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            Chargement...
          </div>
        ) : filteredTree.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
            <FolderTree size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>
              {search ? "Aucune catégorie ne correspond à la recherche." : "Aucune catégorie."}
            </p>
          </div>
        ) : (
          <div>
            {filteredTree.map((node) => (
              <TreeNode key={node.id} node={node} T={T} level={0}
                expandedIds={expandedIds} onToggleExpand={toggleExpand}
                selectedIds={selectedIds} onToggleSelect={toggleSelect}
                onDetail={setDetailId} onEdit={openEdit}
                onCreateChild={openCreateChild}
                onDelete={handleDelete}
                onToggleFlag={handleToggleFlag}
                onMoveOrder={handleMoveOrder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {detailId !== null && (
        <CategoryDetailModal
          categoryId={detailId}
          onClose={() => setDetailId(null)}
          onModified={() => { setDetailId(null); load(); }}
          onEdit={(d) => { setDetailId(null); setEditItem(d); }}
          onCreateChild={(parent) => { setDetailId(null); openCreateChild(parent); }}
        />
      )}
      {editItem !== null && (
        <CategoryFormModal
          category={editItem === "new" ? null : editItem}
          initialParentId={editItem === "new" ? newParentId : null}
          tree={tree}
          onClose={() => { setEditItem(null); setNewParentId(null); }}
          onSaved={() => { setEditItem(null); setNewParentId(null); load(); }}
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

// ═════════════════════════════════════════════════════════════════════════════
// TREE NODE (récursif)
// ═════════════════════════════════════════════════════════════════════════════

function TreeNode({
  node, T, level,
  expandedIds, onToggleExpand,
  selectedIds, onToggleSelect,
  onDetail, onEdit, onCreateChild, onDelete,
  onToggleFlag, onMoveOrder,
}: {
  node: AdminCategoryTreeNode; T: AdminTokens; level: number;
  expandedIds: Set<number>; onToggleExpand: (id: number) => void;
  selectedIds: Set<number>; onToggleSelect: (id: number) => void;
  onDetail: (id: number) => void; onEdit: (cat: AdminCategory) => void;
  onCreateChild: (parent: AdminCategory) => void;
  onDelete: (cat: AdminCategory) => void;
  onToggleFlag: (cat: AdminCategory, flag: CategoryFlag, value: boolean) => void;
  onMoveOrder: (cat: AdminCategory, delta: number) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const levelColor = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 16px",
        paddingLeft: 16 + level * 24,
        borderBottom: `1px solid ${T.border}`,
        background: isSelected ? T.cardAlt : T.card,
        opacity: node.is_active ? 1 : 0.6,
      }}>
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(node.id)}
          style={{ flexShrink: 0 }} />

        {hasChildren ? (
          <button onClick={() => onToggleExpand(node.id)} style={{
            padding: 2, background: "transparent", border: "none",
            cursor: "pointer", color: T.muted, display: "flex",
            flexShrink: 0,
          }}>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div style={{ width: 20, flexShrink: 0 }} />
        )}

        <div style={{
          width: 24, height: 24, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0, color: levelColor,
        }}>
          {node.icon_name ? (
            renderLucideIcon(node.icon_name, 14, levelColor) ||
            (hasChildren
              ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />)
              : <Folder size={14} />)
          ) : (
            hasChildren
              ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />)
              : <Folder size={14} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: T.text,
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          }}>
            {node.name}
            <LevelBadge level={node.level} />
            {node.is_deprecated && <FlagBadge label="DEPRECATED" color="#DC2626" />}
            {node.requires_admin_approval && <FlagBadge label="MOD-RENFORCÉE" color="#F59E0B" />}
            {!node.is_active && <FlagBadge label="INACTIVE" color="#6B7280" />}
          </div>
          <div style={{ fontSize: 10.5, color: T.mutedL, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <code style={{ fontFamily: "monospace" }}>{node.slug}</code>
            {node.children_count > 0 && (
              <span>· {node.children_count} enfant{node.children_count > 1 ? "s" : ""}</span>
            )}
            {node.masters_count > 0 && (
              <span>· {node.masters_count} fiche{node.masters_count > 1 ? "s" : ""}</span>
            )}
            {node.attributes_count > 0 && (
              <span>· {node.attributes_count} attr.</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={() => onMoveOrder(node, -1)} title="Monter" T={T}>
            <ArrowUp size={11} />
          </IconBtn>
          <IconBtn onClick={() => onMoveOrder(node, 1)} title="Descendre" T={T}>
            <ArrowDown size={11} />
          </IconBtn>
          <IconBtn onClick={() => onCreateChild(node)} title="Ajouter enfant" T={T} color={T.red}>
            <Plus size={11} />
          </IconBtn>
          <IconBtn onClick={() => onDetail(node.id)} title="Détails" T={T}>
            <Eye size={11} />
          </IconBtn>
          <IconBtn onClick={() => onEdit(node)} title="Modifier" T={T}>
            <Edit3 size={11} />
          </IconBtn>
          {node.is_active ? (
            <IconBtn onClick={() => onToggleFlag(node, "is_active", false)}
              title="Désactiver" T={T} color="#DC2626">
              <X size={11} />
            </IconBtn>
          ) : (
            <IconBtn onClick={() => onToggleFlag(node, "is_active", true)}
              title="Activer" T={T} color="#059669">
              <Check size={11} />
            </IconBtn>
          )}
          {node.children_count === 0 && node.masters_count === 0 && node.attributes_count === 0 && (
            <IconBtn onClick={() => onDelete(node)} title="Supprimer" T={T} color="#DC2626">
              <Trash2 size={11} />
            </IconBtn>
          )}
        </div>
      </div>

      {isExpanded && node.children.map((child) => (
        <TreeNode key={child.id} node={child} T={T} level={level + 1}
          expandedIds={expandedIds} onToggleExpand={onToggleExpand}
          selectedIds={selectedIds} onToggleSelect={onToggleSelect}
          onDetail={onDetail} onEdit={onEdit}
          onCreateChild={onCreateChild} onDelete={onDelete}
          onToggleFlag={onToggleFlag} onMoveOrder={onMoveOrder}
        />
      ))}
    </>
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

function LevelBadge({ level }: { level: number }) {
  const color = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
      background: color, color: "#fff", letterSpacing: "0.03em",
    }}>N{level}</span>
  );
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 3,
      background: color + "18", color, letterSpacing: "0.05em",
    }}>{label}</span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ICON PICKER MODAL — grille visuelle avec 3 couches de protection
// ═════════════════════════════════════════════════════════════════════════════

function IconPickerModal({ currentValue, onSelect, onClose }: {
  currentValue: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const T = useAdminTheme();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_LUCIDE_ICONS;
    const q = query.trim().toLowerCase();
    return ALL_LUCIDE_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  const suggestions = useMemo(() => {
    return [
      { label: "Téléphone", keys: ["Smartphone", "Phone"] },
      { label: "Ordinateur", keys: ["Monitor", "Laptop"] },
      { label: "Casque", keys: ["Headphones", "Music"] },
      { label: "Maison", keys: ["Home", "House"] },
      { label: "Voiture", keys: ["Car", "CarFront"] },
      { label: "Vêtement", keys: ["Shirt", "ShoppingBag"] },
      { label: "Nourriture", keys: ["Utensils", "Coffee"] },
      { label: "Livre", keys: ["Book", "BookOpen"] },
    ];
  }, []);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 120, padding: 20, backdropFilter: "blur(6px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 780, maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        background: T.card, borderRadius: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h2 style={{
                fontSize: 18, fontWeight: 800, color: T.text, margin: 0,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Sparkles size={16} style={{ color: T.red }} />
                Choisir une icône
              </h2>
              <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
                {ALL_LUCIDE_ICONS.length} icônes disponibles. Clique pour sélectionner.
              </p>
            </div>
            <button onClick={onClose} style={{
              padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
              cursor: "pointer", display: "flex",
            }}><X size={16} color={T.muted} /></button>
          </div>

          {/* Recherche */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: T.muted, pointerEvents: "none",
            }} />
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : smartphone, home, book, car..."
              style={{
                width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10,
                fontSize: 13, background: T.input, color: T.text,
                border: `1px solid ${T.inputBorder}`, outline: "none",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, borderRadius: 4, color: T.muted, display: "flex",
              }}><XCircle size={14} /></button>
            )}
          </div>

          {/* Suggestions rapides */}
          {!query && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: T.mutedL, marginBottom: 6,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>Suggestions rapides</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {suggestions.map((s) => (
                  <button key={s.label} onClick={() => setQuery(s.keys[0])} style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: T.card, color: T.text,
                    border: `1px solid ${T.border}`, cursor: "pointer",
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Résultats — protégés par ErrorBoundary */}
        <IconGridErrorBoundary fallback={
          <div style={{ padding: 40, textAlign: "center", color: T.muted, flex: 1 }}>
            <AlertTriangle size={28} color="#F59E0B" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, marginBottom: 4 }}>Un problème est survenu lors du rendu.</p>
            <p style={{ fontSize: 11.5, color: T.mutedL }}>
              Ferme cette modale et réessaie. Si le problème persiste, contacte l'équipe technique.
            </p>
          </div>
        }>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.muted, flex: 1 }}>
              <ImageIcon size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>Aucune icône ne correspond à "{query}".</p>
            </div>
          ) : (
            <>
              {query && (
                <div style={{
                  padding: "8px 26px", fontSize: 11.5, color: T.muted,
                  background: T.cardAlt, borderBottom: `1px solid ${T.border}`,
                }}>
                  {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                </div>
              )}
              <div style={{
                flex: 1, overflowY: "auto", padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                gap: 6, alignContent: "start",
              }}>
                {filtered.map((name) => (
                  <IconGridCell key={name} name={name}
                    isSelected={name === currentValue}
                    T={T}
                    onClick={() => { onSelect(name); onClose(); }}
                  />
                ))}
              </div>
            </>
          )}
        </IconGridErrorBoundary>

        {/* Footer */}
        <div style={{
          padding: "14px 26px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center",
        }}>
          {currentValue ? (
            <button onClick={() => { onSelect(""); onClose(); }} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: T.card, color: "#DC2626", border: `1px solid #DC262644`,
              cursor: "pointer",
            }}>
              <XCircle size={12} /> Retirer l'icône
            </button>
          ) : <div />}
          <button onClick={onClose} style={{
            padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: T.card, color: T.text,
            border: `1px solid ${T.border}`, cursor: "pointer",
          }}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Cellule d'icône extraite en composant dédié pour éviter les fonctions
 * anonymes dans le map et permettre à React de bien mémoriser.
 */
function IconGridCell({ name, isSelected, T, onClick }: {
  name: string; isSelected: boolean; T: AdminTokens; onClick: () => void;
}) {
  return (
    <button onClick={onClick} title={name}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: "10px 6px", borderRadius: 10,
        background: isSelected ? T.red + "18" : "transparent",
        color: isSelected ? T.red : T.text,
        border: `1px solid ${isSelected ? T.red : "transparent"}`,
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = T.cardAlt;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {renderLucideIcon(name, 22, isSelected ? T.red : T.text)}
      <span style={{
        fontSize: 9, fontWeight: 500, textAlign: "center",
        color: isSelected ? T.red : T.mutedL,
        overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", width: "100%", maxWidth: 66,
      }}>{name}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE DETAIL
// ═════════════════════════════════════════════════════════════════════════════

function CategoryDetailModal({
  categoryId, onClose, onModified, onEdit, onCreateChild,
}: {
  categoryId: number;
  onClose: () => void; onModified: () => void;
  onEdit: (d: AdminCategoryDetail) => void;
  onCreateChild: (parent: AdminCategory) => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<AdminCategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getCategoryDetail(categoryId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) showToast("Erreur chargement", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categoryId, showToast]);

  const toggle = async (flag: CategoryFlag, value: boolean) => {
    if (!detail) return;
    try {
      const fn = flag === "is_active" ? adminApi.toggleCategoryActive
        : flag === "is_deprecated" ? adminApi.toggleCategoryDeprecated
        : adminApi.toggleCategoryApproval;
      const updated = await fn(detail.id, value);
      setDetail(updated);
      showToast("Mis à jour", "success");
      onModified();
    } catch { showToast("Erreur", "error"); }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Supprimer '${detail.name}' ?`,
      message: "Action définitive.", type: "warning",
    });
    if (!ok) return;
    try {
      await adminApi.deleteCategory(detail.id);
      showToast("Supprimée", "success");
      onClose(); onModified();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Impossible.";
      showToast(msg, "error");
    }
  };

  return (
    <ModalShell onClose={onClose} T={T} maxWidth={860}>
      {loading || !detail ? (
        <div style={{ padding: 80, textAlign: "center", color: T.muted }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 12.5 }}>Chargement des détails...</div>
        </div>
      ) : (
        <>
          {/* Header avec gradient selon niveau */}
          <div style={{
            padding: "28px 32px",
            background: `linear-gradient(135deg, ${LEVEL_COLORS[Math.min(detail.level, 4)]}12 0%, ${T.cardAlt} 100%)`,
            borderBottom: `1px solid ${T.border}`,
            borderRadius: "20px 20px 0 0",
            position: "relative",
          }}>
            <button onClick={onClose} style={{
              position: "absolute", top: 20, right: 20,
              padding: 8, borderRadius: 10, background: T.card,
              border: `1px solid ${T.border}`, cursor: "pointer", display: "flex",
            }}><X size={16} color={T.muted} /></button>

            {detail.ancestors.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 11, color: T.muted, marginBottom: 10, flexWrap: "wrap",
              }}>
                {detail.ancestors.map((a, i) => (
                  <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    {i < detail.ancestors.length - 1 && (
                      <ChevronRight size={11} style={{ opacity: 0.5 }} />
                    )}
                  </span>
                ))}
                <ChevronRight size={11} style={{ opacity: 0.5 }} />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {detail.icon_name && VALID_ICON_NAMES.has(detail.icon_name) && (
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: LEVEL_COLORS[Math.min(detail.level, 4)],
                  color: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 12px ${LEVEL_COLORS[Math.min(detail.level, 4)]}40`,
                }}>{renderLucideIcon(detail.icon_name, 26, "#fff")}</div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 26, fontWeight: 800, color: T.text, margin: 0,
                  lineHeight: 1.2,
                }}>{detail.name}</h2>
                <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <code style={{
                    fontSize: 11, background: T.card, padding: "3px 8px", borderRadius: 6,
                    color: T.text, fontFamily: "monospace", border: `1px solid ${T.border}`,
                  }}>{detail.slug}</code>
                  <LevelBadge level={detail.level} />
                  {detail.is_deprecated && <FlagBadge label="DEPRECATED" color="#DC2626" />}
                  {detail.requires_admin_approval && <FlagBadge label="MOD-RENFORCÉE" color="#F59E0B" />}
                  {!detail.is_active && <FlagBadge label="INACTIVE" color="#6B7280" />}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
            {detail.description && (
              <div style={{
                padding: 16, background: T.cardAlt, borderRadius: 12,
                borderLeft: `3px solid ${LEVEL_COLORS[Math.min(detail.level, 4)]}`,
              }}>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0 }}>
                  {detail.description}
                </p>
              </div>
            )}

            <div>
              <SectionTitle icon={Grid3x3} T={T}>Statistiques</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <StatCard T={T} label="Niveau" value={detail.stats.level} icon={FolderTree} color={LEVEL_COLORS[Math.min(detail.level, 4)]} />
                <StatCard T={T} label="Enfants" value={detail.stats.children_count} icon={Folder} color="#0891B2" />
                <StatCard T={T} label="Fiches"
                  value={detail.stats.total_masters}
                  sub={detail.stats.approved_masters !== detail.stats.total_masters
                    ? `${detail.stats.approved_masters} approuvées` : undefined}
                  icon={Boxes} color="#059669" />
                <StatCard T={T} label="Attributs" value={detail.stats.attributes_count} icon={Sparkles} color="#7C3AED" />
              </div>
            </div>

            {detail.children.length > 0 && (
              <div>
                <SectionTitle icon={Folder} T={T}>
                  Sous-catégories <SectionCount count={detail.children.length} T={T} />
                </SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {detail.children.map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 12, fontSize: 12.5,
                      background: T.cardAlt, color: T.text,
                      border: `1px solid ${T.border}`,
                      opacity: c.is_active ? 1 : 0.6,
                    }}>
                      {c.icon_name && renderLucideIcon(c.icon_name, 13, T.muted)}
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      {c.masters_count > 0 && (
                        <span style={{
                          fontSize: 10, color: T.muted, background: T.card,
                          padding: "1px 6px", borderRadius: 4,
                        }}>{c.masters_count}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.attributes.length > 0 && (
              <div>
                <SectionTitle icon={Sparkles} T={T}>
                  Attributs spécifiques <SectionCount count={detail.attributes.length} T={T} />
                </SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {detail.attributes.map((a) => {
                    const roleColor = a.role === "AXE" ? "#DC2626"
                      : a.role === "SPEC" ? "#059669" : "#F59E0B";
                    return (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 10, fontSize: 12,
                        background: T.cardAlt, border: `1px solid ${T.border}`,
                      }}>
                        <span style={{ fontWeight: 700, color: T.text }}>{a.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 3,
                          background: roleColor + "20", color: roleColor,
                          letterSpacing: "0.05em",
                        }}>{a.role}</span>
                        {a.values_count > 0 && (
                          <span style={{ fontSize: 10, color: T.mutedL }}>
                            · {a.values_count} val.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.master_products.length > 0 && (
              <div>
                <SectionTitle icon={Boxes} T={T}>
                  Fiches maîtres <SectionCount count={detail.master_products.length} T={T} suffix={detail.master_products.length === 50 ? "+" : ""} />
                </SectionTitle>
                <div style={{
                  display: "flex", flexDirection: "column", gap: 6,
                  maxHeight: 280, overflowY: "auto",
                  border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: 4,
                }}>
                  {detail.master_products.map((m) => (
                    <Link key={m.id} to={`/product/${m.slug}`} target="_blank" style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                      borderRadius: 8, textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.cardAlt; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{m.title}</div>
                        <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                          {m.offers_count} offre{m.offers_count > 1 ? "s" : ""} · {m.moderation_status}
                        </div>
                      </div>
                      <ExternalLink size={12} color={T.mutedL} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{
            padding: "18px 32px", borderTop: `1px solid ${T.border}`,
            background: T.cardAlt, borderRadius: "0 0 20px 20px",
            display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onEdit(detail)} style={btnFooter(T.text, T.card)}>
                <Edit3 size={13} /> Modifier
              </button>
              <button onClick={() => onCreateChild(detail)} style={btnFooter(T.red, T.card)}>
                <Plus size={13} /> Sous-catégorie
              </button>
              {detail.is_deprecated ? (
                <button onClick={() => toggle("is_deprecated", false)} style={btnFooter("#059669", T.card)}>
                  <Check size={13} /> Retirer deprecated
                </button>
              ) : (
                <button onClick={() => toggle("is_deprecated", true)} style={btnFooter("#DC2626", T.card)}>
                  <AlertTriangle size={13} /> Marquer deprecated
                </button>
              )}
              {detail.is_active ? (
                <button onClick={() => toggle("is_active", false)} style={btnFooter("#6B7280", T.card)}>
                  <X size={13} /> Désactiver
                </button>
              ) : (
                <button onClick={() => toggle("is_active", true)} style={btnFooter("#059669", T.card)}>
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

function btnFooter(color: string, bg: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
    background: bg, color, border: `1px solid ${color}44`, cursor: "pointer",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function SectionTitle({ icon: Icon, T, children }: {
  icon: React.ElementType; T: AdminTokens; children: React.ReactNode;
}) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.muted,
      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <Icon size={12} />
      <span>{children}</span>
    </div>
  );
}

function SectionCount({ count, T, suffix = "" }: { count: number; T: AdminTokens; suffix?: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20,
      background: T.card, color: T.text, letterSpacing: 0,
      marginLeft: 4,
    }}>{count}{suffix}</span>
  );
}

function StatCard({ T, label, value, sub, icon: Icon, color }: {
  T: AdminTokens; label: string; value: number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: T.card, border: `1px solid ${T.border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 10, right: 10,
        width: 26, height: 26, borderRadius: 6,
        background: color + "18", color, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}><Icon size={12} /></div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.mutedL,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 4 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9.5, color: T.mutedL, marginTop: 1 }}>{sub}</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALE CREATE / EDIT
// ═════════════════════════════════════════════════════════════════════════════

function CategoryFormModal({ category, initialParentId, tree, onClose, onSaved }: {
  category: AdminCategoryDetail | null;
  initialParentId: number | null;
  tree: AdminCategoryTreeNode[];
  onClose: () => void; onSaved: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const isEdit = category !== null;

  const [form, setForm] = useState<CategoryUpdatePayload>({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    parent: category?.parent ?? initialParentId,
    icon_name: category?.icon_name ?? "",
    description: category?.description ?? "",
    display_order: category?.display_order ?? 0,
    is_active: category?.is_active ?? true,
    is_deprecated: category?.is_deprecated ?? false,
    requires_admin_approval: category?.requires_admin_approval ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const flatTree = useMemo(() => {
    const out: { id: number; name: string; level: number }[] = [];
    const walk = (nodes: AdminCategoryTreeNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, name: n.name, level: depth });
        walk(n.children, depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree]);

  const currentIcon = form.icon_name || "";
  const iconRender = currentIcon ? renderLucideIcon(currentIcon, 22, "#fff") : null;

  const handleSubmit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      showToast("Nom trop court", "warning"); return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateCategory(category.id, form);
        showToast("Catégorie mise à jour", "success");
      } else {
        await adminApi.createCategory(form);
        showToast("Catégorie créée", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Erreur";
      showToast(msg, "error");
    } finally { setBusy(false); }
  };

  return (
    <>
      <ModalShell onClose={onClose} T={T} maxWidth={640}>
        <div style={{
          padding: "24px 28px", borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "20px 20px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: T.mutedL,
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
            }}>{isEdit ? "Édition" : "Création"}</div>
            <h2 style={{
              fontSize: 20, fontWeight: 800, color: T.text, margin: 0,
              fontFamily: "'Syne', sans-serif",
            }}>
              {isEdit ? category.name : "Nouvelle catégorie"}
            </h2>
          </div>
          <button onClick={onClose} style={{
            padding: 8, borderRadius: 10, background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer", display: "flex",
          }}><X size={16} color={T.muted} /></button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* BLOC 1 — Identité */}
          <div>
            <BlockTitle T={T} icon={BookOpen}>Identité</BlockTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Nom *" T={T}>
                <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex : Smartphones Android" style={inputStyle(T)} autoFocus />
              </FormField>

              {isEdit && (
                <FormField label="Slug" T={T}
                  hint="⚠️ Ne modifie que si nécessaire. Auto-généré à la création.">
                  <input value={form.slug ?? ""}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    style={{ ...inputStyle(T), fontFamily: "monospace", fontSize: 12 }} />
                </FormField>
              )}

              <FormField label="Catégorie parente" T={T}
                hint="Laisse vide pour créer une catégorie de niveau racine.">
                <select value={form.parent ?? ""}
                  onChange={(e) => setForm({ ...form, parent: e.target.value ? Number(e.target.value) : null })}
                  style={inputStyle(T)}>
                  <option value="">— Racine (niveau 0) —</option>
                  {flatTree
                    .filter((n) => !isEdit || n.id !== category?.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {"— ".repeat(n.level)}{n.name}
                      </option>
                    ))}
                </select>
              </FormField>

              <FormField label="Description" T={T}
                hint={`${(form.description ?? "").length} / 280 caractères — s'affiche sous le titre côté acheteur`}>
                <textarea value={form.description ?? ""}
                  onChange={(e) => {
                    if (e.target.value.length <= 280) {
                      setForm({ ...form, description: e.target.value });
                    }
                  }}
                  rows={2}
                  placeholder="Une phrase courte pour l'afficher sous le titre catégorie"
                  style={{ ...inputStyle(T), resize: "vertical" }} />
              </FormField>
            </div>
          </div>

          {/* BLOC 2 — Apparence */}
          <div>
            <BlockTitle T={T} icon={Sparkles}>Apparence</BlockTitle>
            <FormField label="Icône" T={T}
              hint={`Choisis parmi ${ALL_LUCIDE_ICONS.length} icônes disponibles ou laisse vide.`}>
              <button onClick={() => setShowIconPicker(true)} style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                background: T.input, border: `1.5px solid ${T.inputBorder}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                textAlign: "left",
              }}>
                {iconRender ? (
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: T.red, color: "#fff", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 3px 8px ${T.red}40`,
                  }}>{iconRender}</div>
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: T.cardAlt, color: T.mutedL, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px dashed ${T.border}`,
                  }}><ImageIcon size={20} /></div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                    {currentIcon || "Aucune icône"}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    Clique pour {currentIcon ? "changer" : "choisir"} une icône
                  </div>
                </div>
                <Sparkles size={16} color={T.muted} />
              </button>
            </FormField>
          </div>

          {/* BLOC 3 — Configuration */}
          <div>
            <BlockTitle T={T} icon={Shield}>Configuration</BlockTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormField label="Ordre d'affichage" T={T}
                hint="Plus la valeur est basse, plus la catégorie apparaît haut dans les listes.">
                <input type="number" value={form.display_order ?? 0}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  style={{ ...inputStyle(T), maxWidth: 140 }} />
              </FormField>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ToggleRow T={T} label="Active"
                  hint="Décochée : la catégorie disparaît des formulaires vendeur."
                  value={!!form.is_active}
                  onChange={(v) => setForm({ ...form, is_active: v })} />
                <ToggleRow T={T} label="Deprecated"
                  hint="Cochée : reste utilisable par les fiches existantes mais masquée aux nouvelles créations."
                  color="#DC2626"
                  value={!!form.is_deprecated}
                  onChange={(v) => setForm({ ...form, is_deprecated: v })} />
                <ToggleRow T={T} label="Modération renforcée"
                  hint="Cochée : chaque nouvelle fiche/offre dans cette catégorie exige validation admin."
                  color="#F59E0B"
                  value={!!form.requires_admin_approval}
                  onChange={(v) => setForm({ ...form, requires_admin_approval: v })} />
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "18px 28px", borderTop: `1px solid ${T.border}`,
          background: T.cardAlt, borderRadius: "0 0 20px 20px",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: T.card, color: T.text, border: `1px solid ${T.border}`,
            cursor: "pointer",
          }}>Annuler</button>
          <button onClick={handleSubmit} disabled={busy} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: T.red, color: "#fff", border: "none",
            cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
            boxShadow: `0 3px 10px ${T.red}44`,
          }}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {isEdit ? "Enregistrer" : "Créer la catégorie"}
          </button>
        </div>
      </ModalShell>

      {showIconPicker && (
        <IconPickerModal
          currentValue={currentIcon}
          onSelect={(name) => setForm({ ...form, icon_name: name })}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(6px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth, maxHeight: "92vh", overflow: "auto",
        background: T.card, borderRadius: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      }}>{children}</div>
    </div>
  );
}

function BlockTitle({ icon: Icon, T, children }: {
  icon: React.ElementType; T: AdminTokens; children: React.ReactNode;
}) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: T.text,
      textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 8,
      paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
    }}>
      <Icon size={13} style={{ color: T.red }} />
      <span>{children}</span>
    </div>
  );
}

function FormField({ label, T, children, hint }: {
  label: string; T: AdminTokens; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700, color: T.text,
        marginBottom: 6,
      }}>{label}</label>
      {children}
      {hint && (
        <div style={{ fontSize: 10.5, color: T.mutedL, marginTop: 5, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function inputStyle(T: AdminTokens): React.CSSProperties {
  return {
    width: "100%", padding: "10px 13px", borderRadius: 10, fontSize: 13,
    background: T.input, color: T.text, border: `1.5px solid ${T.inputBorder}`,
    outline: "none", fontFamily: "inherit",
  };
}

function ToggleRow({ label, hint, value, onChange, T, color }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
  T: AdminTokens; color?: string;
}) {
  const activeColor = color ?? "#059669";
  return (
    <label style={{
      display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
      padding: "12px 14px", borderRadius: 12,
      background: value ? activeColor + "10" : T.cardAlt,
      border: `1.5px solid ${value ? activeColor + "44" : T.border}`,
      transition: "all 0.15s",
    }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: value ? activeColor : T.text,
        }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 10.5, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>
            {hint}
          </div>
        )}
      </div>
    </label>
  );
}