// frontend/src/features/admin/catalog/AdminCategoriesPage.tsx
// Gestion de l'arborescence des Catégories — Admin BelivaY
//
// Fonctionnalités :
//   - Vue arborescente récursive avec expand/collapse
//   - Actions par nœud : voir détail, éditer, supprimer (si vide)
//   - Toggle flags : is_active, is_deprecated, requires_admin_approval
//   - Actions bulk : set flag sur sélection
//   - Modale détail avec ancestors, enfants, fiches, attributs
//   - Modale create/edit avec parent picker, icon input, flags
//   - Recherche live (repli en liste plate)
//   - Protection suppression (fiches/enfants/attributs)

import { useEffect, useState, useCallback, useMemo, createElement } from "react";
import { Link } from "react-router-dom";
import {
  Search, Check, X, RefreshCw, Eye, Plus, Edit3, Trash2,
  ChevronRight, ChevronDown, Folder, FolderOpen, ImageIcon,
  AlertTriangle, ExternalLink, FolderTree, Shield, ArrowUp, ArrowDown,
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
// UTILS
// ═════════════════════════════════════════════════════════════════════════════

const LEVEL_COLORS = [
  "#111827", "#F47920", "#059669", "#0891B2", "#7C3AED",
];

/**
 * Rendu dynamique d'une icône lucide-react à partir de son nom.
 * Retourne null si l'icône n'existe pas.
 */
function renderLucideIcon(name: string, size = 14, color?: string): React.ReactNode {
  if (!name) return null;
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  if (!IconComponent) return null;
  return createElement(IconComponent, { size, color });
}

/** Collecte tous les IDs de l'arbre récursivement. */
function collectAllIds(nodes: AdminCategoryTreeNode[]): number[] {
  const ids: number[] = [];
  const walk = (n: AdminCategoryTreeNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

/** Filtre l'arbre en gardant les nœuds qui matchent OU dont un descendant matche. */
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

  // ── Load tree ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCategoriesTree();
      setTree(data);
      setSelectedIds(new Set());
      // Auto-expand niveau 0 par défaut
      if (expandedIds.size === 0) {
        setExpandedIds(new Set(data.map((r) => r.id)));
      }
    } catch { showToast("Erreur chargement", "error"); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Filtered tree (recherche) ───────────────────────────────────────
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    return filterTree(tree, (n) =>
      n.name.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q),
    );
  }, [tree, search]);

  // Auto-expand tous les nœuds visibles quand on cherche
  useEffect(() => {
    if (search.trim()) {
      setExpandedIds(new Set(collectAllIds(filteredTree)));
    }
  }, [search, filteredTree]);

  // ── Compteurs globaux ───────────────────────────────────────────────
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

  // ── Expand/collapse ─────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedIds(new Set(collectAllIds(tree)));
  const collapseAll = () => setExpandedIds(new Set());

  // ── Select ──────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Actions individuelles ───────────────────────────────────────────
  const handleToggleFlag = async (cat: AdminCategory, flag: CategoryFlag, newValue: boolean) => {
    try {
      if (flag === "is_active") await adminApi.toggleCategoryActive(cat.id, newValue);
      else if (flag === "is_deprecated") await adminApi.toggleCategoryDeprecated(cat.id, newValue);
      else await adminApi.toggleCategoryApproval(cat.id, newValue);
      showToast(`${cat.name} : ${flag} = ${newValue}`, "success");
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

  // ── Bulk ────────────────────────────────────────────────────────────
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
            {stats.total} catégorie{stats.total > 1 ? "s" : ""} total
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
        {/* Checkbox */}
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(node.id)}
          style={{ flexShrink: 0 }} />

        {/* Expand caret */}
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

        {/* Icon */}
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

        {/* Name + slug */}
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

        {/* Actions */}
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

      {/* Enfants récursifs */}
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
            {/* Breadcrumb ancestors */}
            {detail.ancestors.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.muted, marginBottom: 8, flexWrap: "wrap" }}>
                {detail.ancestors.map((a, i) => (
                  <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {a.name}
                    {i < detail.ancestors.length - 1 && <span style={{ opacity: 0.5 }}>›</span>}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                {detail.icon_name && (
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: LEVEL_COLORS[Math.min(detail.level, 4)] + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: LEVEL_COLORS[Math.min(detail.level, 4)], flexShrink: 0,
                  }}>{renderLucideIcon(detail.icon_name, 20, LEVEL_COLORS[Math.min(detail.level, 4)])}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>
                    {detail.name}
                  </h2>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
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
              <button onClick={onClose} style={{
                padding: 8, borderRadius: 10, background: T.card,
                border: `1px solid ${T.border}`, cursor: "pointer", display: "flex",
              }}><X size={16} color={T.muted} /></button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
            {detail.description && (
              <Section title="Description" T={T}>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                  {detail.description}
                </p>
              </Section>
            )}

            <Section title="Statistiques" T={T}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
                background: T.cardAlt, padding: 14, borderRadius: 12,
              }}>
                <StatCell label="Niveau" value={detail.stats.level} T={T} />
                <StatCell label="Enfants" value={detail.stats.children_count} T={T} />
                <StatCell label="Fiches" value={detail.stats.total_masters}
                  sub={detail.stats.approved_masters !== detail.stats.total_masters
                    ? `${detail.stats.approved_masters} approuvées` : undefined} T={T} />
                <StatCell label="Attributs" value={detail.stats.attributes_count} T={T} />
              </div>
            </Section>

            {/* Enfants */}
            {detail.children.length > 0 && (
              <Section title={`Sous-catégories (${detail.children.length})`} T={T}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {detail.children.map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderRadius: 10, fontSize: 12,
                      background: T.cardAlt, color: T.text,
                      border: `1px solid ${T.border}`,
                    }}>
                      {c.icon_name && renderLucideIcon(c.icon_name, 12, T.muted)}
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: T.mutedL, fontSize: 10.5 }}>
                        ({c.masters_count} fiche{c.masters_count > 1 ? "s" : ""})
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Attributs spécifiques */}
            {detail.attributes.length > 0 && (
              <Section title={`Attributs spécifiques (${detail.attributes.length})`} T={T}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {detail.attributes.map((a) => (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 8, fontSize: 11.5,
                      background: T.cardAlt, border: `1px solid ${T.border}`,
                    }}>
                      <span style={{ fontWeight: 700, color: T.text }}>{a.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                        background: (a.role === "AXE" ? "#DC2626" : a.role === "SPEC" ? "#059669" : "#F59E0B") + "18",
                        color: a.role === "AXE" ? "#DC2626" : a.role === "SPEC" ? "#059669" : "#F59E0B",
                      }}>{a.role}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Fiches attachées */}
            {detail.master_products.length > 0 && (
              <Section title={`Fiches maîtres (${detail.master_products.length}${detail.master_products.length === 50 ? "+" : ""})`} T={T}>
                <div style={{
                  display: "flex", flexDirection: "column", gap: 6,
                  maxHeight: 260, overflowY: "auto",
                }}>
                  {detail.master_products.map((m) => (
                    <Link key={m.id} to={`/product/${m.slug}`} target="_blank" style={{
                      display: "flex", alignItems: "center", gap: 10, padding: 10,
                      background: T.cardAlt, borderRadius: 8, textDecoration: "none",
                      border: `1px solid ${T.border}`,
                    }}>
                      {m.primary_image ? (
                        <img src={m.primary_image} alt="" style={{
                          width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, background: T.card,
                          border: `1px solid ${T.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}><ImageIcon size={13} color={T.mutedL} /></div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{m.title}</div>
                        <div style={{ fontSize: 10.5, color: T.muted }}>
                          {m.offers_count} offre{m.offers_count > 1 ? "s" : ""} · {m.moderation_status}
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
                  ...btnFooter("#DC2626", T.card), background: "#DC2626", color: "#fff", border: "none",
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
// MODALE CREATE / EDIT
// ═════════════════════════════════════════════════════════════════════════════

function CategoryFormModal({ category, initialParentId, tree, onClose, onSaved }: {
  category: AdminCategoryDetail | null;   // null = création
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

  // Aplatir l'arbre pour le sélecteur de parent
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

  const iconPreview = form.icon_name ? renderLucideIcon(form.icon_name, 18) : null;

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
    <ModalShell onClose={onClose} T={T} maxWidth={620}>
      <div style={{
        padding: "22px 26px", borderBottom: `1px solid ${T.border}`,
        background: T.cardAlt, borderRadius: "20px 20px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
          {isEdit ? `Modifier ${category.name}` : "Nouvelle catégorie"}
        </h2>
        <button onClick={onClose} style={{
          padding: 6, borderRadius: 8, background: T.card, border: `1px solid ${T.border}`,
          cursor: "pointer", display: "flex",
        }}><X size={16} color={T.muted} /></button>
      </div>

      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <FormField label="Nom *" T={T}>
          <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex : Smartphones Android" style={inputStyle(T)} />
        </FormField>

        {isEdit && (
          <FormField label="Slug (auto-généré à la création)" T={T}>
            <input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={inputStyle(T)} />
          </FormField>
        )}

        <FormField label="Catégorie parente" T={T}>
          <select value={form.parent ?? ""}
            onChange={(e) => setForm({ ...form, parent: e.target.value ? Number(e.target.value) : null })}
            style={inputStyle(T)}>
            <option value="">— Racine (catégorie de niveau 0) —</option>
            {flatTree
              .filter((n) => !isEdit || n.id !== category?.id)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {"— ".repeat(n.level)}{n.name}
                </option>
              ))}
          </select>
        </FormField>

        <FormField label={`Icône (nom Lucide) ${iconPreview ? "✓" : ""}`} T={T}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={form.icon_name ?? ""}
              onChange={(e) => setForm({ ...form, icon_name: e.target.value })}
              placeholder="Ex : Smartphone, Monitor, Headphones"
              style={inputStyle(T)} />
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: T.cardAlt,
              border: `1px solid ${T.border}`, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: iconPreview ? T.red : T.mutedL,
            }}>
              {iconPreview || <ImageIcon size={16} />}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: T.mutedL, marginTop: 4 }}>
            Nom exact d'un composant lucide-react. Vide pour utiliser le dossier par défaut.
          </div>
        </FormField>

        <FormField label={`Description (${(form.description ?? "").length}/280)`} T={T}>
          <textarea value={form.description ?? ""}
            onChange={(e) => {
              if (e.target.value.length <= 280) {
                setForm({ ...form, description: e.target.value });
              }
            }}
            rows={3}
            placeholder="Une phrase courte pour l'afficher sous le titre catégorie"
            style={{ ...inputStyle(T), resize: "vertical" }} />
        </FormField>

        <FormField label="Ordre d'affichage" T={T}>
          <input type="number" value={form.display_order ?? 0}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            style={inputStyle(T)} />
        </FormField>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Toggle label="Active" value={!!form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })} T={T} />
          <Toggle label="Deprecated" value={!!form.is_deprecated}
            onChange={(v) => setForm({ ...form, is_deprecated: v })} T={T} />
          <Toggle label="Modération renforcée" value={!!form.requires_admin_approval}
            onChange={(v) => setForm({ ...form, requires_admin_approval: v })} T={T} />
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

function StatCell({ label, value, sub, T }: {
  label: string; value: number; sub?: string; T: AdminTokens;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.mutedL, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: T.mutedL, marginTop: 1 }}>{sub}</div>}
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
