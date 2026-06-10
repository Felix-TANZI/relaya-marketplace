// frontend/src/features/admin/operations/MasterProductsPage.tsx
// Gestion complète des fiches produits — admin BelivaY.

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, Check, X, Trash2, RefreshCw, Save, Store, Image as ImageIcon,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { adminApi, type AdminMaster, type AdminMasterDetail } from '@/services/api/admin';
import { productsApi, type Category } from '@/services/api/products';

type StatusTab = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:  { label: 'En attente', bg: 'rgba(217,119,6,0.12)', color: '#B45309' },
  APPROVED: { label: 'Validée',    bg: 'rgba(22,163,74,0.12)', color: '#15803D' },
  REJECTED: { label: 'Rejetée',    bg: 'rgba(220,38,38,0.12)', color: '#B91C1C' },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, bg: 'rgba(0,0,0,0.06)', color: '#555' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function fmtXAF(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }

// ── DRAWER DÉTAIL ─────────────────────────────────────────────────────────────
function MasterDetailDrawer({ master, loading, categories, onClose, onChanged }: {
  master: AdminMasterDetail | null;
  loading: boolean;
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (master) {
      setTitle(master.title);
      setBrand(master.brand || '');
      setDescription(master.description || '');
      setCategory(master.category ? String(master.category) : '');
    }
  }, [master]);

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13,
    background: T.cardAlt, border: `1px solid ${T.border}`, color: T.text, outline: 'none',
  };

  const save = async () => {
    if (!master) return;
    try {
      setSaving(true);
      await adminApi.updateMaster(master.id, {
        title: title.trim(), brand: brand.trim(), description: description.trim(),
        category: category ? Number(category) : undefined,
      });
      showToast('Fiche mise à jour', 'success');
      onChanged();
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally { setSaving(false); }
  };

  const doAction = async (fn: () => Promise<unknown>, msg: string) => {
    try { setActing(true); await fn(); showToast(msg, 'success'); onChanged(); onClose(); }
    catch { showToast('Action impossible', 'error'); }
    finally { setActing(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: 'min(520px, 100%)', height: '100%', background: T.card, overflowY: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: T.card, zIndex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Fiche produit</p>
          <button onClick={onClose} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {loading || !master ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <RefreshCw size={22} className="animate-spin" style={{ color: T.muted }} />
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <StatusBadge status={master.moderation_status} />
              <span style={{ fontSize: 12, color: T.muted }}>{master.offers_count} offre(s)</span>
            </div>

            {master.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
                {master.images.map(im => (
                  <img key={im.id} src={im.image} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: im.is_primary ? `2px solid ${T.red}` : `1px solid ${T.border}`, flexShrink: 0 }} />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Titre</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Marque</label>
                <input value={brand} onChange={e => setBrand(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Catégorie</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
                  <option value="">—</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2"
                style={{ padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', background: T.red, border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>

            <p style={{ fontWeight: 700, fontSize: 13, color: T.text, margin: '20px 0 8px' }}>Offres ({master.offers.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {master.offers.map(o => (
                <div key={o.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{fmtXAF(o.price_xaf)}</span>
                    <StatusBadge status={o.moderation_status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.muted, flexWrap: 'wrap' }}>
                    <Store size={12} /> {o.vendor_business !== 'N/A' ? o.vendor_business : o.vendor_name}
                    {o.condition_name && <span>· {o.condition_name}</span>}
                    <span>· stock {o.stock_quantity}</span>
                  </div>
                  {o.seller_note && <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>« {o.seller_note} »</p>}
                </div>
              ))}
              {master.offers.length === 0 && <p style={{ fontSize: 12, color: T.muted }}>Aucune offre rattachée.</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, position: 'sticky', bottom: 0, background: T.card, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              {master.moderation_status !== 'APPROVED' && (
                <button disabled={acting} onClick={() => doAction(() => adminApi.approveMaster(master.id), 'Fiche approuvée')}
                  className="flex-1 flex items-center justify-center gap-1.5"
                  style={{ padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#15803D', background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)', cursor: 'pointer' }}>
                  <Check size={14} /> Approuver
                </button>
              )}
              {master.moderation_status !== 'REJECTED' && (
                <button disabled={acting} onClick={() => doAction(() => adminApi.rejectMaster(master.id), 'Fiche rejetée')}
                  className="flex-1 flex items-center justify-center gap-1.5"
                  style={{ padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#B45309', background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.3)', cursor: 'pointer' }}>
                  <X size={14} /> Rejeter
                </button>
              )}
              <button disabled={acting}
                onClick={() => { if (window.confirm('Supprimer définitivement cette fiche ?')) doAction(() => adminApi.deleteMaster(master.id), 'Fiche supprimée'); }}
                style={{ padding: '10px 12px', borderRadius: 10, color: '#B91C1C', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function MasterProductsPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminMasterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMasters(await adminApi.listMasters()); }
    catch { showToast('Erreur chargement des fiches', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productsApi.listCategories({ page_size: 200 }).then(r => setCategories(r.results ?? [])).catch(() => {});
  }, []);

  const openDetail = async (id: number) => {
    setDetailId(id); setDetailLoading(true); setDetail(null);
    try { setDetail(await adminApi.getMasterDetail(id)); }
    catch { showToast('Erreur chargement de la fiche', 'error'); }
    finally { setDetailLoading(false); }
  };
  const closeDetail = () => { setDetailId(null); setDetail(null); };

  const counts = {
    all: masters.length,
    PENDING: masters.filter(m => m.moderation_status === 'PENDING').length,
    APPROVED: masters.filter(m => m.moderation_status === 'APPROVED').length,
    REJECTED: masters.filter(m => m.moderation_status === 'REJECTED').length,
  };

  const filtered = masters.filter(m => {
    if (tab !== 'all' && m.moderation_status !== tab) return false;
    const q = search.trim().toLowerCase();
    if (q && !(m.title.toLowerCase().includes(q) || (m.brand || '').toLowerCase().includes(q))) return false;
    return true;
  });

  const quickAction = async (id: number, fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); showToast(msg, 'success'); load(); }
    catch { showToast('Action impossible', 'error'); }
  };

  const TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: `Toutes (${counts.all})` },
    { key: 'PENDING', label: `En attente (${counts.PENDING})` },
    { key: 'APPROVED', label: `Validées (${counts.APPROVED})` },
    { key: 'REJECTED', label: `Rejetées (${counts.REJECTED})` },
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Fiches produits</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Gérez les fiches : infos, images, offres et modération.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: tab === tb.key ? T.red : T.cardAlt, color: tab === tb.key ? '#fff' : T.muted,
              border: `1px solid ${tab === tb.key ? T.red : T.border}` }}>
            {tb.label}
          </button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ padding: '8px 12px 8px 32px', borderRadius: 10, fontSize: 13, background: T.cardAlt, border: `1px solid ${T.border}`, color: T.text, outline: 'none', minWidth: 220 }} />
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <RefreshCw size={22} className="animate-spin" style={{ color: T.muted }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Aucune fiche.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.cardAlt, color: T.muted, textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Produit</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Catégorie</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Offres</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Statut</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {m.primary_image
                          ? <img src={m.primary_image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                          : <div style={{ width: 40, height: 40, borderRadius: 8, background: T.cardAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} style={{ color: T.muted }} /></div>}
                        <div>
                          <p style={{ fontWeight: 600, color: T.text }}>{m.title}</p>
                          {m.brand && <p style={{ fontSize: 11.5, color: T.muted }}>{m.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: T.muted }}>{m.category_name ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: T.text }}>{m.offers_count}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={m.moderation_status} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openDetail(m.id)} title="Détail"
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, background: T.cardAlt, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                          <Eye size={14} />
                        </button>
                        {m.moderation_status !== 'APPROVED' && (
                          <button onClick={() => quickAction(m.id, () => adminApi.approveMaster(m.id), 'Fiche approuvée')} title="Approuver"
                            style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', cursor: 'pointer' }}>
                            <Check size={14} />
                          </button>
                        )}
                        {m.moderation_status !== 'REJECTED' && (
                          <button onClick={() => quickAction(m.id, () => adminApi.rejectMaster(m.id), 'Fiche rejetée')} title="Rejeter"
                            style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId !== null && (
        <MasterDetailDrawer master={detail} loading={detailLoading} categories={categories}
          onClose={closeDetail} onChanged={load} />
      )}
    </div>
  );
}