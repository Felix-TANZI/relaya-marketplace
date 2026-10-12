// frontend/src/features/vendors/v2/compte/notifications/NotificationsPage.tsx
// Écran "Notifications" — VD-11 §VNO, Fig.9/Fig.10.
// Filtres Tout / Urgent / Argent, liste antéchronologique, pied de règle SMS.
//
// /api/auth/notifications/ existe déjà (générique à tout User, GET/mark-read/
// delete/read-all) — l'écran pensait initialement qu'aucun pont n'existait ;
// branché ici. "Urgent"/"Argent" n'ont pas de drapeau dédié côté serveur :
// mappés sur notification_type (ORDER → Urgent, PAYMENT → Argent), le
// classement le plus honnête possible avec l'enum réellement disponible.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bell, Package, CreditCard, Megaphone, Headset, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { http } from '@/services/api/http';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';

type Filter = 'all' | 'urgent' | 'money';
type NotificationType = 'ORDER' | 'PROMOTION' | 'PAYMENT' | 'SUPPORT' | 'SYSTEM';

interface VendorNotification {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  ORDER: Package,
  PROMOTION: Megaphone,
  PAYMENT: CreditCard,
  SUPPORT: Headset,
  SYSTEM: Bell,
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [filter, setFilter] = useState<Filter>('all');
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    http<VendorNotification[]>('/api/auth/notifications/')
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await http(`/api/auth/notifications/${id}/read/`, { method: 'POST' });
    } catch {
      /* l'état optimiste reste affiché ; un prochain chargement corrigera si besoin */
    }
  };

  const urgentCount = useMemo(() => notifications.filter((n) => n.notification_type === 'ORDER' && !n.is_read).length, [notifications]);
  const moneyCount = useMemo(() => notifications.filter((n) => n.notification_type === 'PAYMENT' && !n.is_read).length, [notifications]);

  const FILTERS: { key: Filter; labelKey: string; count: number }[] = [
    { key: 'all', labelKey: 'sl11_compte.notif_filter_all', count: notifications.filter((n) => !n.is_read).length },
    { key: 'urgent', labelKey: 'sl11_compte.notif_filter_urgent', count: urgentCount },
    { key: 'money', labelKey: 'sl11_compte.notif_filter_money', count: moneyCount },
  ];

  const visible = notifications.filter((n) => {
    if (filter === 'urgent') return n.notification_type === 'ORDER';
    if (filter === 'money') return n.notification_type === 'PAYMENT';
    return true;
  });

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.notif_title')} />

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="flex-1 rounded-xl font-semibold"
            style={{ padding: '9px', fontSize: 12, border: `1.5px solid ${filter === f.key ? p.orange : p.border}`, color: filter === f.key ? p.orange : p.text }}
          >
            {t(f.labelKey)} {f.count > 0 ? `(${f.count})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl p-6 mb-4" style={{ background: p.card, border: `1px solid ${p.border}`, fontSize: 12.5, color: p.textMuted }}>
          <Loader2 size={14} className="animate-spin" />
          {t('sl11_compte.security_devices_loading')}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl p-6 text-center mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl11_compte.notif_empty')}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {visible.map((n) => {
            const Icon = TYPE_ICON[n.notification_type] ?? Bell;
            const body = (
              <div
                className="flex items-start gap-2.5 rounded-2xl p-3"
                style={{ background: n.is_read ? p.card : `${p.orange}0D`, border: `1px solid ${n.is_read ? p.border : p.orange}` }}
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ background: n.is_read ? p.cardAlt : p.orange, color: n.is_read ? p.textMuted : '#fff' }}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{n.title}</p>
                  <p className="mt-0.5" style={{ fontSize: 11.5, color: p.textMuted }}>{n.message}</p>
                  <p className="mt-1" style={{ fontSize: 10, color: p.textMuted }}>{new Date(n.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {!n.is_read ? <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.orange }} /> : null}
              </div>
            );
            return n.action_url ? (
              <Link key={n.id} to={n.action_url} onClick={() => !n.is_read && markRead(n.id)}>{body}</Link>
            ) : (
              <button key={n.id} type="button" className="w-full text-left" onClick={() => !n.is_read && markRead(n.id)}>{body}</button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl p-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
        <p className="mb-1" style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.notif_sms_rule')}</p>
        <Link to="/seller/v2/parametres" className="font-semibold" style={{ fontSize: 11.5, color: p.orange }}>
          {t('sl11_compte.notif_settings_link')}
        </Link>
      </div>
    </div>
  );
}
