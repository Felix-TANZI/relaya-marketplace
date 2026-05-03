// frontend/src/features/admin/UserDetailPage.tsx
// Fiche détail utilisateur — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, RefreshCw, User,
  Shield, ShieldOff, Trash2, Save, Edit2,
  Store, ShoppingCart, Package, CheckCircle, XCircle,
  Clock, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { adminApi, type AdminUserDetail } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n?: number) => n ? `${new Intl.NumberFormat('fr-FR').format(n)} FCFA` : '—';
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value, T }: { label: string; value: React.ReactNode; T: ReturnType<typeof useAdminTheme> }) {
  return (
    <div className="flex items-start justify-between py-2.5 gap-4" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.text, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const T             = useAdminTheme();
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [user,     setUser]     = useState<AdminUserDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [acting,   setActing]   = useState(false);
  const [form,     setForm]     = useState({
    first_name: '', last_name: '', email: '',
    is_staff: false, is_active: true, is_superuser: false,
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getUserDetail(Number(id));
      setUser(data);
      setForm({
        first_name:   data.first_name,
        last_name:    data.last_name,
        email:        data.email,
        is_staff:     data.is_staff,
        is_active:    data.is_active,
        is_superuser: data.is_superuser,
      });
    } catch {
      toastRef.current('Utilisateur introuvable', 'error');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await adminApi.updateUser(user.id, form);
      showToast('Profil mis à jour', 'success');
      setEditing(false);
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setSaving(false); }
  };

  const handleBan = async () => {
    if (!user) return;
    const reason = window.prompt('Raison du bannissement :');
    if (!reason?.trim()) return;
    setActing(true);
    try {
      await adminApi.banUser(user.id, reason.trim());
      showToast('Utilisateur banni', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(false); }
  };

  const handleUnban = async () => {
    if (!user) return;
    const ok = await confirm({ title: `Débannir @${user.username} ?`, message: 'L\'accès sera restauré.', type: 'warning', confirmText: 'Débannir', cancelText: 'Annuler' });
    if (!ok) return;
    setActing(true);
    try {
      await adminApi.unbanUser(user.id);
      showToast('Utilisateur débanni', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(false); }
  };

  const handleDelete = async () => {
    if (!user) return;
    const ok = await confirm({ title: `Supprimer @${user.username} ?`, message: 'Cette action est irréversible.', type: 'danger', confirmText: 'Supprimer', cancelText: 'Annuler' });
    if (!ok) return;
    setActing(true);
    try {
      await adminApi.deleteUser(user.id);
      showToast('Utilisateur supprimé', 'success');
      navigate('/admin/users');
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(false); }
  };

  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 10, padding: '8px 12px',
    fontSize: 13, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const isBanned    = user.profile?.is_banned ?? false;
  const roleName    = user.is_superuser ? 'Super Admin' : user.is_staff ? 'Staff' : user.vendor_profile ? 'Vendeur' : 'Acheteur';
  const roleColor   = user.is_superuser ? '#EF4444' : user.is_staff ? '#8B5CF6' : user.vendor_profile ? '#F47920' : '#6B7280';
  const avatarBg    = user.is_superuser ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : user.is_staff ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : user.vendor_profile ? 'linear-gradient(135deg,#F47920,#C2590A)' : 'linear-gradient(135deg,#374151,#1F2937)';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/admin/users" className="flex items-center gap-1.5 text-[12.5px] font-medium"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <ArrowLeft size={14} /> Utilisateurs
          </Link>
          <ChevronRight size={12} style={{ color: T.muted }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>@{user.username}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                <Edit2 size={13} /> Modifier
              </button>
              {isBanned ? (
                <button onClick={handleUnban} disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <ShieldOff size={13} /> Débannir
                </button>
              ) : !user.is_superuser && (
                <button onClick={handleBan} disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Shield size={13} /> Bannir
                </button>
              )}
              {!user.is_superuser && (
                <button onClick={handleDelete} disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Sauvegarder
              </button>
              <button onClick={() => { setEditing(false); }}
                className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bannissement alerte */}
      {isBanned && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#EF4444' }}>Compte banni</p>
            {user.profile?.ban_reason && <p style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{user.profile?.ban_reason}</p>}
          </div>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-5">

          {/* Header utilisateur */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#111827 0%,#1a1f35 60%,#16213e 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white flex-shrink-0" style={{ background: avatarBg }}>
                {user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#F9FAFB' }}>
                    {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </h1>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8, background: roleColor + '20', color: roleColor, flexShrink: 0 }}>
                    {roleName}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(249,250,251,0.5)' }}>@{user.username}</p>
                <p style={{ fontSize: 12.5, color: 'rgba(249,250,251,0.35)', marginTop: 2 }}>{user.email}</p>
              </div>
            </div>
          </div>

          {/* Formulaire d'édition ou infos */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <User size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Informations personnelles</span>
            </div>
            <div className="p-5">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Prénom</label>
                      <input type="text" value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} style={inp}
                        onFocus={e => (e.target.style.borderColor = T.red)} onBlur={e => (e.target.style.borderColor = T.inputBorder)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Nom</label>
                      <input type="text" value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} style={inp}
                        onFocus={e => (e.target.style.borderColor = T.red)} onBlur={e => (e.target.style.borderColor = T.inputBorder)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} style={inp}
                      onFocus={e => (e.target.style.borderColor = T.red)} onBlur={e => (e.target.style.borderColor = T.inputBorder)} />
                  </div>
                  <div className="flex items-center gap-6 flex-wrap pt-2">
                    {([
                      { key: 'is_active'    as keyof typeof form, label: 'Compte actif' },
                      { key: 'is_staff'     as keyof typeof form, label: 'Staff admin' },
                      { key: 'is_superuser' as keyof typeof form, label: 'Super admin' },
                    ]).map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                          style={{ width: 36, height: 20, borderRadius: 10, background: (form[key] as boolean) ? T.red : T.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: (form[key] as boolean) ? 19 : 3, transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ fontSize: 13, color: T.text }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <InfoRow label="Prénom" value={user.first_name || '—'} T={T} />
                  <InfoRow label="Nom" value={user.last_name || '—'} T={T} />
                  <InfoRow label="Email" value={user.email} T={T} />
                  <InfoRow label="Username" value={`@${user.username}`} T={T} />
                  <InfoRow label="Inscrit le" value={fmtDate(user.date_joined)} T={T} />
                  <InfoRow label="Dernière connexion" value={fmtDate(user.last_login)} T={T} />
                  <InfoRow label="Compte actif" value={user.is_active ? <CheckCircle size={15} style={{color:'#10B981'}} /> : <XCircle size={15} style={{color:'#EF4444'}} />} T={T} />
                  <div className="flex items-start justify-between pt-2.5">
                    <span style={{ fontSize: 12.5, color: T.muted }}>Permissions</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {user.is_superuser && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>Super Admin</span>}
                      {user.is_staff && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>Staff</span>}
                      {!user.is_superuser && !user.is_staff && <span style={{ fontSize: 10.5, color: T.muted }}>Utilisateur standard</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activité récente */}
          {user.activity_logs && user.activity_logs.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <Clock size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Activité récente</span>
              </div>
              <div className="divide-y" style={{ borderColor: T.border }}>
                {user.activity_logs.slice(0, 8).map((log: typeof user.activity_logs[0], i: number) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, flexShrink: 0, marginTop: 6 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: T.text }}>{log.action}</p>
                      {log.description && <p style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{log.description}</p>}
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{fmtDate(log.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-5">

          {/* Statistiques */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text }}>Statistiques</p>
            {[
              { icon: ShoppingCart, label: 'Commandes',      value: user.stats?.total_orders ?? 0,      color: '#8B5CF6' },
              { icon: Package,      label: 'Montant dépensé', value: fmtXaf(user.stats?.total_spent), color: '#10B981' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                    <span style={{ fontSize: 12.5, color: T.muted }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{typeof s.value === 'number' ? s.value.toLocaleString('fr-FR') : s.value}</span>
                </div>
              );
            })}
          </div>

          {/* Profil vendeur */}
          {user.vendor_profile && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid #F4792030` }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(244,121,32,0.05)' }}>
                <div className="flex items-center gap-2">
                  <Store size={14} style={{ color: '#F47920' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Profil Vendeur</span>
                </div>
                <Link to={`/admin/vendors/${user.vendor_profile.id}`}
                  className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: '#F47920' }}>
                  Voir <ExternalLink size={10} />
                </Link>
              </div>
              <div className="p-5">
                <InfoRow label="Boutique" value={<span style={{ color: '#F47920', fontWeight: 600 }}>{user.vendor_profile.business_name}</span>} T={T} />
                <InfoRow label="Statut" value={user.vendor_profile.status} T={T} />
              </div>
            </div>
          )}

          {/* Accès rapide */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 8 }}>Accès rapide</p>
            <Link to={`/admin/orders?user=${user.id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full text-[12.5px] font-semibold transition-all"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
              <ShoppingCart size={14} /> Voir ses commandes
            </Link>
            {user.vendor_profile && (
              <Link to={`/admin/catalogue?vendor=${user.vendor_profile.id}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full text-[12.5px] font-semibold transition-all"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                <Package size={14} /> Voir ses produits
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}