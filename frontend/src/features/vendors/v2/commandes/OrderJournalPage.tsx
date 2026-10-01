// frontend/src/features/vendors/v2/commandes/OrderJournalPage.tsx
// Écran « Journal de la commande » — VD-05 §JRN-01/02.
// Route recommandée : /seller/v2/commandes/:id/journal
// Consultation seule, fil chronologique inversé, table en ajout seul côté
// discours produit (JRN-02). Bridge : pas de GET /orders/{id}/journal ni de
// champ actor_id signé — journalEventsOf() (helpers.ts) reconstitue le fil à
// partir de la création de la commande et de shipment.timeline (déjà réel et
// horodaté). Les valeurs "avant → après" en pastilles (spec) ne sont pas
// disponibles : seuls label/détail/lieu/heure sont affichés.

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, RefreshCw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, PageHeader } from './ui';
import { fmtDateTime, journalEventsOf, orderRef, useOrder } from './helpers';

export default function OrderJournalPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const events = journalEventsOf(order);

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl7_commandes.journal_title')}
        subtitle={`${orderRef(order.id)} · ${t('sl7_commandes.journal_subtitle')}`}
        onBack={() => navigate(-1)}
        p={p}
      />

      <div className="flex flex-col gap-3">
        {events.map((ev, i) => (
          <Card key={ev.id + String(i)} p={p}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{ev.label}</p>
              <span className="flex-shrink-0" style={{ fontSize: 11, color: p.textMuted }}>{fmtDateTime(ev.at)}</span>
            </div>
            {ev.detail ? <p style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>{ev.detail}</p> : null}
            {ev.location ? <p style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>{ev.location}</p> : null}
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl7_commandes.journal_immutable')}
      </p>
    </div>
  );
}
