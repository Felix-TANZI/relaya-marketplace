// frontend/src/features/admin/operations/ProductDetailDrawer.tsx
// Panneau latéral de détail produit (admin) — présentation soignée.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Package, Tag, Layers, Boxes, Calendar, Store,
  CheckCircle2, XCircle, Clock, Image as ImageIcon, ExternalLink,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import type { AdminProduct, AdminProductDetail } from '@/services/api/admin';

interface Props {
  item: AdminProduct;
  detail: AdminProductDetail | null;
  loading: boolean;
  onClose: () => void;
  onApprove: (p: AdminProduct) => void;
  onReject: (p: AdminProduct) => void;
}

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const STATUS = {
  PENDING:  { label: 'En attente', bg: '#FEF3C7', fg: '#B45309', Icon: Clock },
  APPROVED: { label: 'Validé',     bg: '#DCFCE7', fg: '#15803D', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejeté',     bg: '#FEE2E2', fg: '#B91C1C', Icon: XCircle },
} as const;

function InfoCard({ T, icon, label, value }: {
  T: ReturnType<typeof useAdminTheme>;
  icon: ReactNode; label: string; value: ReactNode;
}) {
  return (
    <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 12px' }}>
      <div className="flex items-center gap-1.5" style={{ color: T.muted, marginBottom: 4 }}>
        {icon}<span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

export default function ProductDetailDrawer({ item, detail, loading, onClose, onApprove, onReject }: Props) {
  const T = useAdminTheme();
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);

  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const st = STATUS[item.moderation_status] ?? STATUS.PENDING;
  const StatusIcon = st.Icon;

  const images   = detail?.images ?? [];
  const hero     = images.find(i => i.is_primary)?.image ?? images[0]?.image ?? null;
  const compareAt = detail?.compare_at_price ?? null;
  const onPromo  = compareAt != null && compareAt > item.price_xaf;
  const initial  = (item.vendor_name?.[0] ?? '?').toUpperCase();

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'flex-end',
               background: 'rgba(10,8,6,0.5)', opacity: shown ? 1 : 0, transition: 'opacity .25s ease' }}>
      <aside onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, height: '100%', overflowY: 'auto', background: T.card,
                 borderLeft: `1px solid ${T.border}`, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
                 transform: shown ? 'translateX(0)' : 'translateX(28px)',
                 transition: 'transform .28s cubic-bezier(.2,.8,.2,1)' }}>

        {/* HEADER */}
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: T.card, borderBottom: `1px solid ${T.border}`,
                      padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999,
                         background: st.bg, color: st.fg, fontSize: 11.5, fontWeight: 700 }}>
            <StatusIcon size={13} /> {st.label}
          </span>
          <button onClick={onClose} aria-label="Fermer"
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: T.cardAlt, border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {/* HERO */}
          <div style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 12,
                        background: T.cardAlt, border: `1px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hero
              ? <img src={hero} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className="flex flex-col items-center gap-2" style={{ color: T.muted }}>
                  <ImageIcon size={30} /><span style={{ fontSize: 11 }}>{loading ? 'Chargement…' : 'Aucune image'}</span>
                </div>}
          </div>

          {/* GALERIE */}
          {images.length > 1 && (
            <div className="flex gap-2" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              {images.slice(0, 6).map(im => (
                <div key={im.id} style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                  <img src={im.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* TITRE + PRIX */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, fontFamily: 'Poppins,sans-serif', lineHeight: 1.25 }}>{item.title}</h2>
          <div className="flex items-baseline gap-2" style={{ marginTop: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 21, fontWeight: 800, color: T.red }}>{fmtXaf(item.price_xaf)}</span>
            {onPromo && <span style={{ fontSize: 13, color: T.muted, textDecoration: 'line-through' }}>{fmtXaf(compareAt!)}</span>}
          </div>

          {/* GRILLE INFOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <InfoCard T={T} icon={<Boxes size={13} />}    label="Stock"     value={<span style={{ color: item.stock_quantity > 3 ? '#15803D' : item.stock_quantity > 0 ? '#B45309' : '#B91C1C' }}>{item.stock_quantity}</span>} />
            <InfoCard T={T} icon={<Tag size={13} />}      label="Catégorie" value={item.category_name} />
            <InfoCard T={T} icon={<Layers size={13} />}   label="Fiche"     value={item.master_title || '—'} />
            <InfoCard T={T} icon={<Package size={13} />}  label="Actif"     value={item.is_active ? 'Oui' : 'Non'} />
            <InfoCard T={T} icon={<Calendar size={13} />} label="Ajouté"    value={fmtDate(item.created_at)} />
            <InfoCard T={T} icon={<Tag size={13} />}      label="Référence" value={item.slug} />
          </div>

          {/* VENDEUR */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, marginBottom: 16 }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 12, background: T.red + '18', color: T.red,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button onClick={() => navigate(`/admin/customers/${item.vendor}`)}
                  className="flex items-center gap-1 hover:underline"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.text, fontWeight: 700, fontSize: 13.5 }}>
                  {item.vendor_name || '—'} <ExternalLink size={12} style={{ color: T.muted }} />
                </button>
                {item.vendor_business && item.vendor_business !== 'N/A' && (
                  <button onClick={() => item.vendor_profile_id && navigate(`/admin/vendors/${item.vendor_profile_id}`)}
                    className="flex items-center gap-1 hover:underline"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: item.vendor_profile_id ? 'pointer' : 'default', color: T.muted, fontSize: 12 }}>
                    <Store size={12} /> {item.vendor_business}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOTIF REJET */}
          {item.moderation_status === 'REJECTED' && item.moderation_reason && (
            <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
              <strong>Motif du rejet : </strong>{item.moderation_reason}
            </div>
          )}

          {/* DESCRIPTION */}
          {(loading || detail?.description) && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>Description</p>
              {loading && !detail
                ? <p style={{ fontSize: 12.5, color: T.muted }}>Chargement…</p>
                : <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail?.description || '—'}</p>}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div style={{ position: 'sticky', bottom: 0, background: T.card, borderTop: `1px solid ${T.border}`,
                      padding: '12px 18px', display: 'flex', gap: 10 }}>
          <button onClick={() => onApprove(item)} className="flex-1 flex items-center justify-center gap-2"
            style={{ padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#15803D', color: '#fff', fontWeight: 700, fontSize: 13.5 }}>
            <CheckCircle2 size={16} /> Approuver
          </button>
          <button onClick={() => onReject(item)} className="flex-1 flex items-center justify-center gap-2"
            style={{ padding: '11px 0', borderRadius: 12, cursor: 'pointer', background: 'transparent', color: '#B91C1C', fontWeight: 700, fontSize: 13.5, border: '1px solid #FCA5A5' }}>
            <XCircle size={16} /> Rejeter
          </button>
        </div>
      </aside>
    </div>
  );
}