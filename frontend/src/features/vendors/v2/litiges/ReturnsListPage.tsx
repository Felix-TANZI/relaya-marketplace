// frontend/src/features/vendors/v2/litiges/ReturnsListPage.tsx
// Écran « Retours en cours » — VD-07 §RET-01 à 08 (VD-D08.A10).
// GET /returns?state=to_decide|on_the_way|closed n'existe pas tel quel : on
// charge vendorsApi.getReturns() une fois et on classe côté client
// (returnTabOf, helpers.ts). Le retour est distinct du litige (écran séparé).
//
// « À décider » regroupe deux actions réelles supportées par le bridge :
//   - REQUESTED  : accepter/refuser la demande (vendorsApi.reviewReturn),
//   - RECEIVED   : préparer l'inspection à réception (écran dédié).
// Le montant gelé par article n'est pas exposé avant décision (pas de champ
// dédié sur OrderReturn) : affiché seulement quand refund_amount_xaf existe,
// sinon un texte neutre « à confirmer après inspection » plutôt qu'un chiffre inventé.
//
// Alignement visuel sur Retours.jpg : sous-titre d'intro, vignette produit
// (générique — OrderReturn n'expose pas d'URL image, seulement
// order_item_title), pastille de statut brut (RETURN_STATUS_KEYS) en plus du
// motif, motif cité avec la description réelle du client, et un « Voir le
// détail » qui affiche les vrais champs disponibles (mode de transport, point
// relais, note de décision) plutôt qu'une maquette vide.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi } from '@/services/api/vendors';
import type { OrderReturn } from '@/services/api/customer';
import { palette } from '../theme';
import {
  Card, CenterState, Collapsible, FilterTabs, Pill, ProductThumb,
} from './ui';
import {
  fmtDateTime, fmtXAF, orderRef, returnReasonLabel, returnStatusTone, returnTabOf,
  RETURN_STATUS_KEYS, type ReturnTab,
} from './helpers';

const TABS: ReturnTab[] = ['to_decide', 'on_the_way', 'closed'];

export default function ReturnsListPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';

  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReturnTab>('to_decide');
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    vendorsApi.getReturns()
      .then(setReturns)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<ReturnTab, number> = { to_decide: 0, on_the_way: 0, closed: 0 };
    returns.forEach((r) => { c[returnTabOf(r)] += 1; });
    return c;
  }, [returns]);

  const visible = useMemo(() => returns.filter((r) => returnTabOf(r) === tab), [returns, tab]);

  const tabLabels: Record<ReturnTab, string> = {
    to_decide: t('sl8_litiges.returns_filter_to_decide'),
    on_the_way: t('sl8_litiges.returns_filter_on_the_way'),
    closed: t('sl8_litiges.returns_filter_closed'),
  };
  const emptyLabels: Record<ReturnTab, string> = {
    to_decide: t('sl8_litiges.returns_empty_to_decide'),
    on_the_way: t('sl8_litiges.returns_empty_on_the_way'),
    closed: t('sl8_litiges.returns_empty_closed'),
  };

  async function handleDecision(returnId: number, decision: 'APPROVED' | 'REJECTED') {
    setBusy(true);
    try {
      await vendorsApi.reviewReturn(returnId, decision, note.trim() || undefined);
      setDecidingId(null);
      setNote('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24 pt-2">
      <h1 className="font-black mb-1.5" style={{ fontSize: 19, color: p.text }}>{t('sl8_litiges.returns_title')}</h1>
      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl8_litiges.returns_subtitle')}
      </p>

      <FilterTabs tabs={TABS.map((k) => ({ key: k, label: tabLabels[k] }))} active={tab} onChange={setTab} counts={counts} p={p} />

      {loading ? (
        <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl8_litiges.loading')} p={p} />
      ) : error ? (
        <CenterState icon={<AlertTriangle size={22} color={p.red} />} title={error} p={p} />
      ) : visible.length === 0 ? (
        <CenterState icon={<Inbox size={22} color={p.textMuted} />} title={emptyLabels[tab]} p={p} />
      ) : (
        <div className="flex flex-col gap-3 mb-5">
          {visible.map((r) => {
            const reasonLabel = returnReasonLabel(t, r.reason);
            const isDeciding = decidingId === r.id;
            const hasDetail = Boolean(r.relay_point_name || r.review_note || r.transport_mode);
            return (
              <Card key={r.id} p={p} accent={returnTabOf(r) === 'to_decide' ? p.orange : undefined}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-bold"
                    style={{ fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase', color: p.textMuted }}
                  >
                    {t('sl8_litiges.returns_card_kicker', { ref: orderRef(r.id) })}
                  </span>
                  <Pill label={t(`sl8_litiges.${RETURN_STATUS_KEYS[r.status]}`)} tone={returnStatusTone(r.status)} p={p} />
                </div>

                <div className="flex items-start gap-3 mb-2">
                  <ProductThumb p={p} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" style={{ fontSize: 13.5, color: p.text, lineHeight: 1.3 }}>{r.order_item_title}</p>
                    <p style={{ fontSize: 12, color: p.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                      {t('sl8_litiges.returns_card_reason_label')} : {reasonLabel}
                      {r.description ? ` · « ${r.description} »` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                  <Row label={t('sl8_litiges.returns_card_arrival')} value={r.received_at ? fmtDateTime(r.received_at, lang) : t('sl8_litiges.returns_card_arrival_pending')} p={p} />
                  {r.status === 'RECEIVED' && r.received_at ? (
                    <Row
                      label={t('sl8_litiges.returns_card_inspection_due')}
                      value={fmtDateTime(new Date(new Date(r.received_at).getTime() + 48 * 3600_000).toISOString(), lang)}
                      p={p}
                    />
                  ) : null}
                  <Row
                    label={t('sl8_litiges.returns_card_frozen')}
                    value={r.refund_amount_xaf != null ? fmtXAF(r.refund_amount_xaf) : t('sl8_litiges.returns_card_frozen_pending')}
                    p={p}
                    strong
                  />
                </div>

                {hasDetail ? (
                  <div className="mb-2">
                    <Collapsible title={t('sl8_litiges.returns_detail_title')} p={p}>
                      {r.transport_mode ? (
                        <p style={{ marginBottom: 4 }}>
                          {r.transport_mode === 'RELAY_DROPOFF'
                            ? t('sl8_litiges.returns_detail_transport_relay')
                            : t('sl8_litiges.returns_detail_transport_courier')}
                        </p>
                      ) : null}
                      {r.relay_point_name ? (
                        <p style={{ marginBottom: 4 }}>{t('sl8_litiges.returns_detail_relay_point')} : {r.relay_point_name}</p>
                      ) : null}
                      {r.review_note ? (
                        <p>{t('sl8_litiges.returns_detail_review_note')} : {r.review_note}</p>
                      ) : null}
                    </Collapsible>
                  </div>
                ) : null}

                {returnTabOf(r) === 'to_decide' && r.status === 'REQUESTED' ? (
                  isDeciding ? (
                    <div className="mt-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={t('sl8_litiges.returns_decide_note_placeholder')}
                        className="w-full rounded-xl resize-none mb-2"
                        style={{ padding: '9px 11px', fontSize: 12.5, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDecision(r.id, 'APPROVED')}
                          className="flex-1 rounded-xl font-bold text-white disabled:opacity-60"
                          style={{ background: p.green, padding: '10px', fontSize: 12.5, minHeight: 40 }}
                        >
                          {t('sl8_litiges.returns_decide_approve')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDecision(r.id, 'REJECTED')}
                          className="flex-1 rounded-xl font-bold disabled:opacity-60"
                          style={{ background: p.cardAlt, color: p.red, border: `1px solid ${p.red}`, padding: '10px', fontSize: 12.5, minHeight: 40 }}
                        >
                          {t('sl8_litiges.returns_decide_reject')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDecidingId(r.id)}
                      className="w-full rounded-xl font-bold text-white mt-2"
                      style={{ background: p.orange, padding: '11px 14px', fontSize: 13, minHeight: 44 }}
                    >
                      {t('sl8_litiges.returns_cta_decide')}
                    </button>
                  )
                ) : returnTabOf(r) === 'to_decide' && r.status === 'RECEIVED' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/seller/v2/retours/${r.id}`)}
                    className="w-full rounded-xl font-bold text-white mt-2"
                    style={{ background: p.orange, padding: '11px 14px', fontSize: 13, minHeight: 44 }}
                  >
                    {t('sl8_litiges.returns_cta_inspect')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/seller/v2/retours/${r.id}`)}
                    className="w-full rounded-xl font-semibold mt-2"
                    style={{ padding: '10px 14px', fontSize: 12.5, minHeight: 40, color: p.textMuted, border: `1px solid ${p.border}` }}
                  >
                    {t('sl8_litiges.returns_cta_view')}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Collapsible title={t('sl8_litiges.returns_how_title')} p={p}>
        <p style={{ marginBottom: 6 }}>{t('sl8_litiges.returns_how_body_1')}</p>
        <p>{t('sl8_litiges.returns_how_body_2')}</p>
      </Collapsible>

      <p className="mt-5 text-center" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl8_litiges.common_anonymity_note')}
      </p>
    </div>
  );
}

function Row({ label, value, p, strong }: { label: string; value: string; p: ReturnType<typeof palette>; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: p.textMuted }}>{label}</span>
      <span style={{ fontSize: strong ? 13.5 : 12.5, color: strong ? p.red : p.text, fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}
