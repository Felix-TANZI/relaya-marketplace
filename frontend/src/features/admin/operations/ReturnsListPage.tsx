// frontend/src/features/admin/operations/ReturnsListPage.tsx
// Retours — admin BelivaY.
// Regle verrouillee : le remboursement ne se declenche qu'apres reception
// physique + inspection du colis retourne (jamais a la simple demande).

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, PackageCheck, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import type { OrderReturn } from '@/services/api/customer';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const STATUS_CFG: Record<OrderReturn['status'], { labelKey: string; color: string; bg: string }> = {
  REQUESTED: { labelKey: 'ad5b_returns.status_requested', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  APPROVED: { labelKey: 'ad5b_returns.status_approved', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  REJECTED: { labelKey: 'ad5b_returns.status_rejected', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  AWAITING_DROPOFF: { labelKey: 'ad5b_returns.status_awaiting_dropoff', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  RECEIVED: { labelKey: 'ad5b_returns.status_received', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  REFUNDED: { labelKey: 'ad5b_returns.status_refunded', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  CLOSED_NO_REFUND: { labelKey: 'ad5b_returns.status_closed_no_refund', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

export default function ReturnsListPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [refundDrafts, setRefundDrafts] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listReturns().then(setReturns).catch(() => showToast(t('ad5b_returns.toast_load_error'), 'error')).finally(() => setLoading(false));
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const handleMarkReceived = async (id: number) => {
    setActingId(id);
    try {
      const updated = await adminApi.markReturnReceived(id);
      setReturns((current) => current.map((r) => (r.id === id ? updated : r)));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('ad5b_returns.toast_action_error'), 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleFinalize = async (id: number, inspectionPassed: boolean) => {
    setActingId(id);
    try {
      const refundRaw = refundDrafts[id];
      const refund_amount_xaf = refundRaw ? parseInt(refundRaw, 10) : null;
      const updated = await adminApi.finalizeReturn(id, { inspection_passed: inspectionPassed, refund_amount_xaf });
      setReturns((current) => current.map((r) => (r.id === id ? updated : r)));
      showToast(inspectionPassed ? t('ad5b_returns.toast_refund_started') : t('ad5b_returns.toast_closed_no_refund'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('ad5b_returns.toast_action_error'), 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: T.page, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: T.redB, color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}>{t('ad5b_returns.title')}</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: '2px 0 0' }}>
              {t('ad5b_returns.subtitle')}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ background: T.card, borderRadius: 16, padding: 32, textAlign: 'center', color: T.muted, fontWeight: 600 }}>{t('ad5b_returns.loading')}</div>
        ) : returns.length === 0 ? (
          <div style={{ background: T.card, borderRadius: 16, padding: 32, textAlign: 'center', color: T.muted, fontWeight: 600 }}>{t('ad5b_returns.empty_state')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {returns.map((ret) => {
              const cfg = STATUS_CFG[ret.status];
              return (
                <div key={ret.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 800, color: T.text, margin: 0 }}>{ret.order_item_title}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, margin: '2px 0 0' }}>
                        {t('ad5b_returns.order_line', {
                          order: ret.order,
                          requestedBy: ret.requested_by_name,
                          vendor: ret.vendor_username || '—',
                          transport: ret.transport_mode === 'RELAY_DROPOFF'
                            ? t('ad5b_returns.transport_relay_dropoff', { relay: ret.relay_point_name ? ` (${ret.relay_point_name})` : '' })
                            : t('ad5b_returns.transport_courier_pickup'),
                        })}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 999, color: cfg.color, background: cfg.bg }}>
                      {t(cfg.labelKey)}
                    </span>
                  </div>

                  {(ret.status === 'APPROVED' || ret.status === 'AWAITING_DROPOFF') && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                      <button
                        type="button"
                        disabled={actingId === ret.id}
                        onClick={() => void handleMarkReceived(ret.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.red, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        <PackageCheck size={15} /> {t('ad5b_returns.mark_received_button')}
                      </button>
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                        {t('ad5b_returns.mark_received_hint')}
                      </p>
                    </div>
                  )}

                  {ret.status === 'RECEIVED' && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        placeholder={t('ad5b_returns.refund_amount_placeholder')}
                        value={refundDrafts[ret.id] || ''}
                        onChange={(e) => setRefundDrafts((current) => ({ ...current, [ret.id]: e.target.value }))}
                        style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', fontSize: 13, minWidth: 220 }}
                      />
                      <button
                        type="button"
                        disabled={actingId === ret.id}
                        onClick={() => void handleFinalize(ret.id, true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#10B981', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        <CheckCircle2 size={15} /> {t('ad5b_returns.inspection_ok_button')}
                      </button>
                      <button
                        type="button"
                        disabled={actingId === ret.id}
                        onClick={() => void handleFinalize(ret.id, false)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: T.red, border: `1px solid ${T.redB}`, borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        <XCircle size={15} /> {t('ad5b_returns.inspection_fail_button')}
                      </button>
                    </div>
                  )}

                  {ret.refund_amount_xaf != null && ret.status === 'REFUNDED' && (
                    <p style={{ marginTop: 10, fontWeight: 800, color: '#10B981', fontSize: 13 }}>
                      {t('ad5b_returns.refund_started', { amount: ret.refund_amount_xaf.toLocaleString('fr-FR') })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
