// frontend/src/features/vendors/v2/compte/notifications/NotificationsPage.tsx
// Écran "Notifications" — VD-11 §VNO, Fig.9/Fig.10.
// Filtres Tout / Urgent / Argent, liste antéchronologique, pied de règle SMS.
//
// Pas de pont API listé (GET /notifications) : liste vide honnête (aucune
// notification fabriquée) tant que l'endpoint n'est pas branché.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';

type Filter = 'all' | 'urgent' | 'money';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [filter, setFilter] = useState<Filter>('all');
  const notifications: never[] = [];

  const FILTERS: { key: Filter; labelKey: string; count: number }[] = [
    { key: 'all', labelKey: 'sl11_compte.notif_filter_all', count: 0 },
    { key: 'urgent', labelKey: 'sl11_compte.notif_filter_urgent', count: 0 },
    { key: 'money', labelKey: 'sl11_compte.notif_filter_money', count: 0 },
  ];

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

      <div className="rounded-2xl p-6 text-center mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {notifications.length === 0 ? (
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl11_compte.notif_empty')}</p>
        ) : null}
      </div>

      <div className="rounded-2xl p-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
        <p className="mb-1" style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.notif_sms_rule')}</p>
        <Link to="/seller/v2/parametres" className="font-semibold" style={{ fontSize: 11.5, color: p.orange }}>
          {t('sl11_compte.notif_settings_link')}
        </Link>
      </div>
    </div>
  );
}
