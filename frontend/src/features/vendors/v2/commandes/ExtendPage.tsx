// frontend/src/features/vendors/v2/commandes/ExtendPage.tsx
// Écran « Besoin de plus de temps » — VD-05 §DEL-01 à DEL-04.
// Route recommandée : /seller/v2/commandes/:id/plus-de-temps
// Une seule prolongation par commande (DEL-01), jamais au-delà de l'échéance
// absolue (DEL-03 : 24 h après le paiement). Bridge : pas de POST
// /orders/{id}/extend côté backend — requestExtension() (helpers.ts) trace la
// demande dans la note interne vendeur (visible du vendeur seul) ; le client
// et le livreur ne sont donc pas réellement prévenus tant que cet endpoint
// n'existe pas (DEL-02 non couvert côté serveur).

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, RefreshCw, Timer } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, Collapsible, GhostRow, PageHeader, PrimaryButton, ProductThumb } from './ui';
import {
  absoluteDeadline, fmtDateTime, fmtDurationShort, hasRequestedExtension, itemsSummary, orderRef, requestExtension,
  useOrder,
} from './helpers';

type ChoiceKey = '1' | '2' | 'd';

export default function ExtendPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);
  const [alreadyRequested, setAlreadyRequested] = useState<boolean | null>(null);
  const [choice, setChoice] = useState<ChoiceKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    hasRequestedExtension(orderId).then(setAlreadyRequested);
  }, [orderId]);

  if (loading || alreadyRequested === null) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const currentDue = order.vendor_reply_deadline ? new Date(order.vendor_reply_deadline) : new Date();
  const absolute = absoluteDeadline(order);
  const summary = itemsSummary(order);
  const remainingMs = order.vendor_reply_deadline ? currentDue.getTime() - Date.now() : null;

  const tomorrow8 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
  })();

  const choices: { key: ChoiceKey; labelKey: string; preview: Date }[] = [
    { key: '1', labelKey: 'sl7_commandes.extend_choice_1h', preview: new Date(currentDue.getTime() + 3600_000) },
    { key: '2', labelKey: 'sl7_commandes.extend_choice_2h', preview: new Date(currentDue.getTime() + 2 * 3600_000) },
    { key: 'd', labelKey: 'sl7_commandes.extend_choice_tomorrow', preview: tomorrow8 },
  ];

  async function handleConfirm() {
    if (!order || !choice) return;
    setSaving(true);
    setActionError(null);
    try {
      const picked = choices.find((c) => c.key === choice)!;
      await requestExtension(order.id, t(picked.labelKey));
      setDone(true);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="pb-24 pt-2">
        <PageHeader title={t('sl7_commandes.extend_title')} p={p} />
        <Card p={p} accent={p.green}>
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl7_commandes.extend_done_title')}</p>
          <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
            {t('sl7_commandes.extend_done_detail')}
          </p>
        </Card>
        <div className="mt-4">
          <GhostRow p={p} onClick={() => navigate(-1)}>
            <span>{t('sl7_commandes.back_to_order')}</span>
          </GhostRow>
        </div>
      </div>
    );
  }

  if (alreadyRequested) {
    return (
      <div className="pb-24 pt-2">
        <PageHeader title={t('sl7_commandes.extend_title')} onBack={() => navigate(-1)} p={p} />
        <Card p={p}>
          <p style={{ fontSize: 13, color: p.text, lineHeight: 1.5 }}>{t('sl7_commandes.extend_already_used')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.extend_title')} subtitle={orderRef(order.id)} onBack={() => navigate(-1)} p={p} />

      <Card p={p}>
        <div className="flex items-center gap-3">
          <ProductThumb imageUrl={summary.imageUrl} p={p} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Timer size={14} color={p.orange} />
              <p style={{ fontSize: 12, color: p.textMuted, fontWeight: 700 }}>{t('sl7_commandes.extend_current_due')}</p>
            </div>
            <p className="font-bold" style={{ fontSize: 15, color: p.text }}>{fmtDateTime(order.vendor_reply_deadline)}</p>
            <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: 2 }}>
              {orderRef(order.id)} · {summary.title}
              {remainingMs !== null ? ` · ${remainingMs > 0 ? t('sl7_commandes.due_in', { time: fmtDurationShort(remainingMs) }) : t('sl7_commandes.due_overdue')}` : ''}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2 mt-4">
        {choices.map((c) => {
          const disabled = c.preview.getTime() > absolute.getTime();
          const active = choice === c.key;
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => setChoice(c.key)}
              className="w-full rounded-2xl text-left disabled:opacity-40"
              style={{
                padding: '13px 14px',
                minHeight: 44,
                background: active ? `${p.orange}1F` : p.card,
                border: `1px solid ${active ? p.orange : p.border}`,
              }}
            >
              <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t(c.labelKey)}</p>
              <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: 2 }}>
                {disabled
                  ? t('sl7_commandes.extend_choice_disabled')
                  : t('sl7_commandes.extend_choice_preview', { time: fmtDateTime(c.preview.toISOString()) })}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-3" style={{ fontSize: 11.5, color: p.textMuted, lineHeight: 1.4 }}>
        {t('sl7_commandes.extend_absolute_limit', { time: fmtDateTime(absolute.toISOString()) })}
      </p>

      <p className="font-black uppercase mt-4 mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl7_commandes.extend_consequences_title')}
      </p>
      <Card p={p}>
        <ul className="flex flex-col gap-2">
          {(['kept', 'late'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2" style={{ fontSize: 13, color: p.text, lineHeight: 1.4 }}>
              <span className="mt-1.5 flex-shrink-0 rounded-full" style={{ width: 5, height: 5, background: p.textMuted }} />
              {t(`sl7_commandes.extend_consequence_${k}`)}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-3">
        <Collapsible title={t('sl7_commandes.why')} p={p}>{t('sl7_commandes.extend_why')}</Collapsible>
      </div>

      {actionError ? <p className="mt-3" style={{ fontSize: 12, color: p.red }}>{actionError}</p> : null}

      <div className="mt-5">
        <PrimaryButton onClick={handleConfirm} disabled={saving || !choice} p={p}>
          {saving
            ? t('sl7_commandes.saving')
            : choice
              ? t('sl7_commandes.extend_confirm', { choice: t(choices.find((c) => c.key === choice)!.labelKey) })
              : t('sl7_commandes.extend_confirm_generic')}
        </PrimaryButton>
      </div>
    </div>
  );
}
