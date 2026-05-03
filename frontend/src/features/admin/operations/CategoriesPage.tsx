// frontend/src/features/admin/operations/CategoriesPage.tsx
// CRUD des catégories du catalogue — admin BelivaY
// Arborescence parent/enfants, création, renommage, toggle actif/inactif, suppression

import { useEffect, useState, useCallback } from 'react';
import {
  Tag, Plus, RefreshCw, Trash2, Edit2, Check,
  X, ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Category {
  id:        number;
  name:      string;
  slug:      string;
  is_active: boolean;
  parent:    number | null;
  products_count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT — LIGNE CATÉGORIE ÉDITABLE
// ─────────────────────────────────────────────────────────────────────────────

function CategoryRow({
  cat, children, depth, onToggle, onRename, onDelete, onAddChild,
  acting, T,
}: {
  cat:         Category;
  children:    Category[];
  depth:       number;
  onToggle:    (id: number, active: boolean) => void;
  onRename:    (id: number, name: string) => void;
  onDelete:    (cat: Category) => void;
  onAddChild:  (parentId: number) => void;
  acting:      number | null;
  T:           ReturnType<typeof useAdminTheme>;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(cat.name);

  const handleSave = () => {
    if (name.trim() && name.trim() !== cat.name) {
      onRename(cat.id, name.trim());
    }
    setEditing(false);
  };

  const indent = depth * 20;

  return (
    <>
      <div
        className="flex items-center gap-2 py-2.5 px-4 group rounded-xl transition-all"
        style={{
          marginLeft: indent,
          background: 'transparent',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Expand/collapse si enfants */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          style={{ color: T.muted, visibility: children.length > 0 ? 'visible' : 'hidden' }}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Icône */}
        <Tag size={13} style={{ color: cat.is_active ? T.red : T.muted, flexShrink: 0 }} />

        {/* Nom ou champ édition */}
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setName(cat.name); setEditing(false); } }}
              className="flex-1 px-2.5 py-1 rounded-lg text-[13px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.red}` }}
            />
            <button onClick={handleSave} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <Check size={12} />
            </button>
            <button onClick={() => { setName(cat.name); setEditing(false); }} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: T.cardAlt, color: T.muted }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              style={{ fontSize: 13.5, fontWeight: depth === 0 ? 700 : 500, color: cat.is_active ? T.text : T.muted, lineHeight: 1.2 }}
              className="truncate"
            >
              {cat.name}
            </span>
            {!cat.is_active && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(156,163,175,0.15)', color: '#9CA3AF', flexShrink: 0 }}>
                Inactif
              </span>
            )}
            {(cat.products_count !== undefined && cat.products_count > 0) && (
              <span style={{ fontSize: 10.5, color: T.muted, flexShrink: 0 }}>
                {cat.products_count} produit{cat.products_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Actions (visibles au hover) */}
        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* Ajouter sous-catégorie */}
            {depth === 0 && (
              <button onClick={() => onAddChild(cat.id)}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}
                title="Ajouter une sous-catégorie">
                <Plus size={11} />
              </button>
            )}
            {/* Éditer */}
            <button onClick={() => setEditing(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: T.cardAlt, color: T.muted }}>
              <Edit2 size={11} />
            </button>
            {/* Toggle */}
            <button onClick={() => onToggle(cat.id, !cat.is_active)} disabled={acting === cat.id}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: cat.is_active ? 'rgba(16,185,129,0.1)' : T.cardAlt, color: cat.is_active ? '#10B981' : T.muted }}>
              {cat.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
            </button>
            {/* Supprimer */}
            <button onClick={() => onDelete(cat)} disabled={acting === cat.id}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Enfants */}
      {expanded && children.map(child => (
        <CategoryRow
          key={child.id}
          cat={child}
          children={[]}
          depth={depth + 1}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
          onAddChild={onAddChild}
          acting={acting}
          T={T}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULAIRE D'AJOUT
// ─────────────────────────────────────────────────────────────────────────────

function AddForm({
  parentId, parentName, onAdd, onCancel, T,
}: {
  parentId:   number | null;
  parentName: string;
  onAdd:      (name: string, parentId: number | null) => void;
  onCancel:   () => void;
  T:          ReturnType<typeof useAdminTheme>;
}) {
  const [name, setName] = useState('');

  return (
    <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: T.cardAlt, border: `1px solid ${T.red}40` }}>
      <Tag size={14} style={{ color: T.red, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        {parentName && <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Sous-catégorie de : <strong>{parentName}</strong></p>}
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd(name.trim(), parentId); if (e.key === 'Escape') onCancel(); }}
          placeholder={parentId ? 'Nom de la sous-catégorie…' : 'Nom de la catégorie…'}
          className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
          style={{ background: T.input, color: T.text, border: `1px solid ${T.red}` }}
        />
      </div>
      <button onClick={() => { if (name.trim()) onAdd(name.trim(), parentId); }}
        disabled={!name.trim()}
        className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white flex-shrink-0"
        style={{ background: name.trim() ? 'linear-gradient(135deg,#DC2626,#991B1B)' : T.border }}>
        <Check size={13} /> Créer
      </button>
      <button onClick={onCancel}
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState<number | null>(null);
  const [addForm,    setAddForm]    = useState<{ parentId: number | null; parentName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // L'API peut retourner un tableau ou un objet paginé {count, results: [...]}
      const raw = await http<Category[] | { results: Category[]; count: number }>('/api/catalog/categories/', { headers: authHeader() });
      const data = Array.isArray(raw) ? raw : (raw as { results: Category[] }).results ?? [];
      setCategories(data);
    } catch {
      showToast('Erreur chargement des catégories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Arborescence
  const roots    = categories.filter(c => !c.parent);
  const children = (id: number) => categories.filter(c => c.parent === id);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAdd = async (name: string, parentId: number | null) => {
    try {
      await http('/api/catalog/categories/', {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ name, slug: slugify(name), parent: parentId, is_active: true }),
      });
      showToast('Catégorie créée', 'success');
      setAddForm(null);
      await load();
    } catch { showToast('Erreur création', 'error'); }
  };

  const handleToggle = async (id: number, active: boolean) => {
    setActing(id);
    try {
      await http(`/api/catalog/categories/${id}/`, {
        method: 'PATCH', headers: authHeader(),
        body: JSON.stringify({ is_active: active }),
      });
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const handleRename = async (id: number, name: string) => {
    setActing(id);
    try {
      await http(`/api/catalog/categories/${id}/`, {
        method: 'PATCH', headers: authHeader(),
        body: JSON.stringify({ name, slug: slugify(name) }),
      });
      showToast('Renommée', 'success');
      await load();
    } catch { showToast('Erreur renommage', 'error'); }
    finally  { setActing(null); }
  };

  const handleDelete = async (cat: Category) => {
    const childrenCount = children(cat.id).length;
    const ok = await confirm({
      title:       `Supprimer "${cat.name}" ?`,
      message:     childrenCount > 0
        ? `Cette catégorie contient ${childrenCount} sous-catégorie(s). Elles seront également supprimées.`
        : 'Cette action est irréversible.',
      type:        'danger', confirmText: 'Supprimer', cancelText: 'Annuler',
    });
    if (!ok) return;
    setActing(cat.id);
    try {
      await http(`/api/catalog/categories/${cat.id}/`, { method: 'DELETE', headers: authHeader() });
      showToast('Catégorie supprimée', 'success');
      await load();
    } catch { showToast('Impossible de supprimer — des produits utilisent cette catégorie', 'error'); }
    finally  { setActing(null); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Catégories & Sous-catégories
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {roots.length} catégorie{roots.length > 1 ? 's' : ''} principale{roots.length > 1 ? 's' : ''} ·{' '}
            {categories.filter(c => c.parent).length} sous-catégorie{categories.filter(c => c.parent).length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => load()}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setAddForm({ parentId: null, parentName: '' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
            <Plus size={14} /> Nouvelle catégorie
          </button>
        </div>
      </div>

      {/* ── Formulaire d'ajout ───────────────────────────────────────────── */}
      {addForm && (
        <AddForm
          parentId={addForm.parentId}
          parentName={addForm.parentName}
          onAdd={handleAdd}
          onCancel={() => setAddForm(null)}
          T={T}
        />
      )}

      {/* ── Arborescence ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <Tag size={14} style={{ color: T.red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Arborescence du catalogue</span>
          <span style={{ fontSize: 11.5, color: T.muted, marginLeft: 4 }}>— passez la souris sur une ligne pour voir les actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Tag size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucune catégorie</p>
            <button onClick={() => setAddForm({ parentId: null, parentName: '' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
              <Plus size={13} /> Créer la première catégorie
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-0.5">
            {roots.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                children={children(cat.id)}
                depth={0}
                onToggle={handleToggle}
                onRename={handleRename}
                onDelete={handleDelete}
                onAddChild={(pid) => {
                  const parent = categories.find(c => c.id === pid);
                  setAddForm({ parentId: pid, parentName: parent?.name ?? '' });
                }}
                acting={acting}
                T={T}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Tag size={15} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
          Désactiver une catégorie la masque du catalogue public mais ne supprime pas ses produits.
          La suppression est bloquée si des produits utilisent encore la catégorie.
        </p>
      </div>
    </div>
  );
}