// frontend/src/features/admin/operations/ReturnsListPage.tsx
// Retours — admin BelivaY.
// Regle verrouillee : le remboursement ne se declenche qu'apres reception
// physique + inspection du colis retourne (jamais a la simple demande).

import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, PackageCheck, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import type { OrderReturn } from '@/services/api/customer';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const STATUS_CFG: Record<OrderReturn['status'], { label: string; color: string; bg: string }> = {
  REQUESTED: { label: 'Demande envoyée', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  APPROVED: { label: 'Approuvé par le vendeur', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  REJECTED: { label: 'Rejeté par le vendeur', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  AWAITING_DROPOFF: { label: 'En attente de dépôt', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  RECEIVED: { label: 'Reçu — à inspecter', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  REFUNDED: { label: 'Remboursé', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  CLOSED_NO_REFUND: { label: 'Clôturé sans remboursement', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

export default function ReturnsListPage() {
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [refundDrafts, setRefundDrafts] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listReturns().then(setReturns).catch(() => showToast('Chargement impossible.', 'error')).finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleMarkReceived = async (id: number) => {
    setActingId(id);
    try {
      const updated = await adminApi.markReturnReceived(id);
      setReturns((current) => current.map((r) => (r.id === id ? updated : r)));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action impossible.', 'error');
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
      showToast(inspectionPassed ? 'Remboursement lancé.' : 'Retour clôturé sans remboursement.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action impossible.', 'error');
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
            <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}>Retours</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: '2px 0 0' }}>
              Le remboursement n'est déclenché qu'après réception physique + inspection du colis.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ background: T.card, borderRadius: 16, padding: 32, textAlign: 'center', color: T.muted, fontWeight: 600 }}>Chargement…</div>
        ) : returns.length === 0 ? (
          <div style={{ background: T.card, borderRadius: 16, padding: 32, textAlign: 'center', color: T.muted, fontWeight: 600 }}>Aucun retour pour le moment.</div>
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
                        Commande #{ret.order} · {ret.requested_by_name} · Vendeur {ret.vendor_username || '—'} · {ret.transport_mode === 'RELAY_DROPOFF' ? `Dépôt relais${ret.relay_point_name ? ` (${ret.relay_point_name})` : ''}` : 'Ramassage livreur'}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 999, color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
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
                        <PackageCheck size={15} /> Constater la réception (fallback ramassage)
                      </button>
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                        Le dépôt en point relais confirme normalement la réception automatiquement — utiliser ce bouton seulement pour le ramassage livreur (colis encombrants).
                      </p>
                    </div>
                  )}

                  {ret.status === 'RECEIVED' && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        placeholder="Montant remboursé (FCFA, optionnel = intégral)"
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
                        <CheckCircle2 size={15} /> Inspection OK — rembourser
                      </button>
                      <button
                        type="button"
                        disabled={actingId === ret.id}
                        onClick={() => void handleFinalize(ret.id, false)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: T.red, border: `1px solid ${T.redB}`, borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        <XCircle size={15} /> Inspection non conforme
                      </button>
                    </div>
                  )}

                  {ret.refund_amount_xaf != null && ret.status === 'REFUNDED' && (
                    <p style={{ marginTop: 10, fontWeight: 800, color: '#10B981', fontSize: 13 }}>
                      Remboursement de {ret.refund_amount_xaf.toLocaleString('fr-FR')} FCFA lancé.
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
