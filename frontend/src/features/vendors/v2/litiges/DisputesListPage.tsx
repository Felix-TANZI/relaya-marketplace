// frontend/src/features/vendors/v2/litiges/DisputesListPage.tsx
// Écran « Litiges reçus » — VD-07 §LIT-01 à 05 (VD-D08.A01 à A06).
// GET /disputes?state=… n'existe pas encore tel quel : on charge
// vendorsApi.getDisputes() une fois (sans filtre) et on classe/trie côté
// client (voir helpers.ts). Le total gelé est recalculé côté client en
// sommant vendor_escrow_amount des litiges non clos (VD-D08.A01).
//
// Règle produit non négociable (ESPACE_VENDEUR_BUILD_PLAN.md) : pas
// d'arbitrage automatique à 48 h. Le bloc « Comment ça marche » dit
// explicitement « présomption en faveur du client — BelivaY décide »,
// jamais un remboursement déclenché automatiquement par le système. La
// maquette Litiges.jpg formule le même bandeau de façon plus courte
// (« Sans réponse, la décision est prise en faveur du client ») : on ne
// reprend PAS cette formulation telle quelle (elle sonne automatique), on
// garde la mention explicite « BelivaY décide » dans la version courte
// utilisée sur la carte « Argent gelé » (list_frozen_deadline_rest).
//
// Écart connu vs Litiges.jpg : chaque carte y affiche une vraie photo
// produit. VendorDisputeListItem n'expose ni image ni titre produit (juste
// order/order_ref/reason/description) — voir DisputeCard ci-dessous, qui
// utilise une vignette générique (ProductThumb) à la place.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Inbox, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorDisputeListItem } from '@/services/api/vendors';
import { palette } from '../theme';
import {
  Card, CenterState, Collapsible, DarkHero, FilterTabs, HERO_ACCENT, Pill, ProductThumb,
} from './ui';
import {
  disputeTabOf, fmtXAF, frozenTotal, mostUrgentDisputeId, orderRef, useCountdownFromHours, type DisputeTab,
} from './helpers';

const TABS: DisputeTab[] = ['to_answer', 'mediation', 'closed'];

export default function DisputesListPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState<VendorDisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DisputeTab>('to_answer');

  useEffect(() => {
    vendorsApi.getDisputes()
      .then(setDisputes)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<DisputeTab, number> = { to_answer: 0, mediation: 0, closed: 0 };
    disputes.forEach((d) => { c[disputeTabOf(d)] += 1; });
    return c;
  }, [disputes]);

  const visible = useMemo(() => {
    return disputes
      .filter((d) => disputeTabOf(d) === tab)
      .sort((a, b) => a.hours_remaining - b.hours_remaining);
  }, [disputes, tab]);

  const urgentId = useMemo(() => mostUrgentDisputeId(disputes), [disputes]);
  const frozen = useMemo(() => frozenTotal(disputes), [disputes]);
  const openCount = counts.to_answer + counts.mediation;

  const tabLabels: Record<DisputeTab, string> = {
    to_answer: t('sl8_litiges.list_filter_to_answer'),
    mediation: t('sl8_litiges.list_filter_mediation'),
    closed: t('sl8_litiges.list_filter_closed'),
  };

  const emptyLabels: Record<DisputeTab, string> = {
    to_answer: t('sl8_litiges.list_empty_to_answer'),
    mediation: t('sl8_litiges.list_empty_mediation'),
    closed: t('sl8_litiges.list_empty_closed'),
  };

  return (
    <div className="pb-24 pt-2">
      <h1 className="font-black mb-4" style={{ fontSize: 19, color: p.text }}>
        {t('sl8_litiges.list_title')}
      </h1>

      <DarkHero tone="neutral">
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-bold"
            style={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: HERO_ACCENT.neutral }}
          >
            {t('sl8_litiges.list_frozen_label')}
          </span>
          {openCount > 0 ? (
            <span
              className="rounded-full font-bold"
              style={{ fontSize: 11, padding: '4px 10px', color: '#fff', background: 'rgba(255,255,255,0.14)' }}
            >
              {t('sl8_litiges.list_frozen_count', { count: openCount })}
            </span>
          ) : null}
        </div>
        <p className="font-black mb-2" style={{ fontSize: 28, color: '#fff' }}>{fmtXAF(frozen)}</p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
          {t('sl8_litiges.list_frozen_hint')}
        </p>
        {counts.to_answer > 0 ? (
          <div className="flex items-start gap-2" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
            <Clock size={15} color={HERO_ACCENT.neutral} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              <strong style={{ color: '#fff' }}>{t('sl8_litiges.list_frozen_deadline_strong')}</strong>{' '}
              {t('sl8_litiges.list_frozen_deadline_rest')}
            </p>
          </div>
        ) : null}
      </DarkHero>

      <FilterTabs tabs={TABS.map((k) => ({ key: k, label: tabLabels[k] }))} active={tab} onChange={setTab} counts={counts} p={p} />

      {loading ? (
        <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />
      ) : error ? (
        <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error} p={p} />
      ) : visible.length === 0 ? (
        <CenterState icon={<Inbox size={22} color={p.textMuted} />} title={emptyLabels[tab]} p={p} />
      ) : (
        <div className="flex flex-col gap-3 mb-5">
          {visible.map((d) => (
            <DisputeCard
              key={d.id}
              dispute={d}
              p={p}
              urgent={d.id === urgentId}
              onOpen={() => navigate(
                disputeTabOf(d) === 'closed' || disputeTabOf(d) === 'mediation'
                  ? `/seller/v2/litiges/${d.id}/decision`
                  : `/seller/v2/litiges/${d.id}`,
              )}
            />
          ))}
        </div>
      )}

      <Collapsible title={t('sl8_litiges.list_how_title')} p={p}>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.list_how_body_1')}</p>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.list_how_body_2')}</p>
        <p className="font-semibold" style={{ color: p.text }}>{t('sl8_litiges.list_how_body_silence')}</p>
      </Collapsible>
      <div style={{ height: 10 }} />
      <Collapsible title={t('sl8_litiges.list_avoid_title')} p={p}>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.list_avoid_body_1')}</p>
        <p>{t('sl8_litiges.list_avoid_body_2')}</p>
      </Collapsible>

      <p className="mt-5 text-center" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl8_litiges.common_anonymity_note')}
      </p>
    </div>
  );
}

function DisputeCard({
  dispute, p, urgent, onOpen,
}: {
  dispute: VendorDisputeListItem;
  p: ReturnType<typeof palette>;
  urgent: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const tab = disputeTabOf(dispute);
  const countdown = useCountdownFromHours(tab === 'to_answer' ? dispute.hours_remaining : null);

  return (
    <Card p={p} accent={tab === 'to_answer' ? p.red : undefined}>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <Pill
            label={dispute.status_display}
            tone={tab === 'to_answer' ? 'red' : tab === 'mediation' ? 'amber' : 'muted'}
            p={p}
          />
          <span style={{ fontSize: 11, color: p.textMuted }}>{dispute.order_ref || orderRef(dispute.order)}</span>
        </div>
        <div className="flex items-start gap-3 mb-2">
          <ProductThumb p={p} size={44} />
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontSize: 10.5, color: p.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2,
              }}
            >
              {t('sl8_litiges.list_card_customer_says')}
            </p>
            <p className="font-bold" style={{ fontSize: 13.5, color: p.text, lineHeight: 1.3 }}>
              « {dispute.reason_display} »
            </p>
          </div>
        </div>
        {tab === 'to_answer' ? (
          <p className="font-semibold mb-2" style={{ fontSize: 12, color: countdown.expired ? p.red : p.amber }}>
            {countdown.expired
              ? t('sl8_litiges.list_card_deadline_expired')
              : countdown.hours > 0
                ? t('sl8_litiges.list_card_deadline', { h: countdown.hours, m: countdown.minutes })
                : t('sl8_litiges.list_card_deadline_minutes', { m: countdown.minutes })}
          </p>
        ) : null}
      </button>
      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
        <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl8_litiges.list_card_frozen')}</span>
        <span className="font-black" style={{ fontSize: 15, color: p.red }}>{fmtXAF(dispute.vendor_escrow_amount)}</span>
      </div>
      {tab === 'to_answer' ? (
        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-xl font-bold mt-3"
          style={{
            padding: '11px 14px',
            fontSize: 13,
            minHeight: 44,
            background: urgent ? p.orange : 'transparent',
            color: urgent ? '#fff' : p.orange,
            border: urgent ? 'none' : `1.5px solid ${p.orange}`,
          }}
        >
          {t('sl8_litiges.list_cta_answer')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-xl font-semibold mt-3"
          style={{ padding: '10px 14px', fontSize: 12.5, minHeight: 40, color: p.textMuted, border: `1px solid ${p.border}` }}
        >
          {t('sl8_litiges.list_cta_view')}
        </button>
      )}
    </Card>
  );
}
