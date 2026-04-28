// frontend/src/features/admin/system/NotificationsPage.tsx
// Broadcast notifications admin — BelivaY

import { useState } from 'react';
import {
  Bell, Send, RefreshCw, Users, Store, CheckCircle,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

type Audience = 'all' | 'customers' | 'vendors' | 'active_vendors';

const AUDIENCE_CFG: { key: Audience; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { key: 'all',            label: 'Tous les utilisateurs', desc: 'Clients + Vendeurs',      icon: Users,  color: '#F9FAFB'  },
  { key: 'customers',      label: 'Clients uniquement',    desc: 'Acheteurs inscrits',       icon: Users,  color: '#3B82F6' },
  { key: 'vendors',        label: 'Tous les vendeurs',     desc: 'Actifs + En attente',      icon: Store,  color: '#F47920' },
  { key: 'active_vendors', label: 'Vendeurs approuvés',    desc: 'Boutiques actives',        icon: Store,  color: '#10B981' },
];

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

export default function NotificationsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [audience,  setAudience]  = useState<Audience>('all');
  const [title,     setTitle]     = useState('');
  const [message,   setMessage]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);

  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13.5, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Titre et message sont obligatoires', 'error');
      return;
    }
    setSending(true);
    try {
      await http('/api/vendors/admin/notifications/broadcast/', {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ audience, title: title.trim(), message: message.trim() }),
      });
      showToast('Notification envoyée', 'success');
      setSent(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch { showToast('Erreur lors de l\'envoi', 'error'); }
    finally  { setSending(false); }
  };

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Broadcast Notifications
        </h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          Envoyer des notifications en masse à une audience ciblée
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-5">

          {/* Sélection audience */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Users size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Audience cible</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AUDIENCE_CFG.map(a => {
                const Icon    = a.icon;
                const color   = a.color;
                const isActive= audience === a.key;
                return (
                  <button key={a.key}
                    onClick={() => setAudience(a.key)}
                    className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? color + '15' : T.cardAlt,
                      border: `2px solid ${isActive ? color : T.border}`,
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '20' }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : T.text }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{a.desc}</p>
                    </div>
                    {isActive && <CheckCircle size={16} style={{ color, marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bell size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Contenu du message</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Titre <span style={{ color: T.red }}>*</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Nouvelle fonctionnalité disponible"
                  maxLength={100}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
                <p style={{ fontSize: 11, color: T.muted, marginTop: 3, textAlign: 'right' }}>{title.length}/100</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Message <span style={{ color: T.red }}>*</span>
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Votre message pour les destinataires…"
                  rows={5} maxLength={500}
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = T.red)}
                  onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
                <p style={{ fontSize: 11, color: T.muted, marginTop: 3, textAlign: 'right' }}>{message.length}/500</p>
              </div>

              <button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all"
                style={{
                  background: sent
                    ? 'linear-gradient(135deg,#10B981,#059669)'
                    : (title.trim() && message.trim())
                      ? 'linear-gradient(135deg,#DC2626,#991B1B)'
                      : T.border,
                  boxShadow: (title.trim() && message.trim() && !sent) ? '0 4px 16px rgba(220,38,38,0.35)' : 'none',
                }}>
                {sending ? <RefreshCw size={16} className="animate-spin" /> : sent ? <CheckCircle size={16} /> : <Send size={16} />}
                {sending ? 'Envoi en cours…' : sent ? 'Notification envoyée !' : 'Envoyer la notification'}
              </button>
            </div>
          </div>
        </div>

        {/* Aperçu */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bell size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Aperçu</span>
            </div>
            <div className="p-5">
              {/* Notification simulée */}
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
                    <Bell size={15} style={{ color: '#fff' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#F9FAFB', marginBottom: 2 }}>
                      {title || 'Titre de la notification'}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.55)', lineHeight: 1.5 }}>
                      {message || 'Votre message apparaîtra ici…'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'rgba(249,250,251,0.3)' }}>BelivaY · à l'instant</span>
                  <span style={{ fontSize: 10, color: 'rgba(249,250,251,0.3)' }}>
                    {AUDIENCE_CFG.find(a => a.key === audience)?.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Infos */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Informations</p>
            {[
              'Les notifications sont envoyées en temps réel via le centre de notifications.',
              'Chaque utilisateur peut désactiver les notifications depuis ses paramètres.',
              'L\'historique des broadcasts est conservé 90 jours.',
            ].map((info, i) => (
              <div key={i} className="flex items-start gap-2">
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.muted, flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{info}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}