// frontend/src/features/vendors/SellerReturnsPage.tsx
// Retours vendeur — approuver/rejeter une demande de retour acheteur.
// Le remboursement n'est jamais decide ici : approuver ouvre seulement
// l'etape logistique (depot/ramassage) ; l'admin finalise apres inspection.

import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Package, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { vendorsApi } from '@/services/api/vendors';
import type { OrderReturn } from '@/services/api/customer';
import { useToast } from '@/context/ToastContext';

const REASON_LABELS: Record<string, string> = {
  DAMAGED: 'Article endommagé',
  NOT_AS_DESCRIBED: 'Non conforme à la description',
  WRONG_ITEM: 'Mauvais article reçu',
  COUNTERFEIT: 'Suspicion de contrefaçon',
  OTHER: 'Autre',
};

const STATUS_LABELS: Record<OrderReturn['status'], { label: string; color: string; bg: string }> = {
  REQUESTED: { label: 'À examiner', color: '#D97706', bg: 'rgba(217,119,6,0.10)' },
  APPROVED: { label: 'Approuvé — en attente de dépôt', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  REJECTED: { label: 'Rejeté', color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  AWAITING_DROPOFF: { label: 'En attente de dépôt', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  RECEIVED: { label: 'Reçu — inspection en cours', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  REFUNDED: { label: 'Remboursé', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  CLOSED_NO_REFUND: { label: 'Clôturé sans remboursement', color: '#7C6E5A', bg: 'rgba(124,110,90,0.10)' },
};

export default function SellerReturnsPage() {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    vendorsApi.getReturns()
      .then(setReturns)
      .catch(() => showToast('Impossible de charger les retours.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (returnId: number, decision: 'APPROVED' | 'REJECTED') => {
    setActingId(returnId);
    try {
      const updated = await vendorsApi.reviewReturn(returnId, decision, noteDrafts[returnId] || '');
      setReturns((current) => current.map((r) => (r.id === returnId ? updated : r)));
      showToast(decision === 'APPROVED' ? 'Retour approuvé.' : 'Retour rejeté.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action impossible.', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F47920]/10 text-[#F47920]">
            <RotateCcw size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1209]">Retours</h1>
            <p className="text-sm font-semibold text-[#7C6E5A]">
              Rappel : approuver n'engage pas de remboursement — celui-ci n'intervient qu'après réception et inspection du colis retourné.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#7C6E5A]">Chargement…</div>
        ) : returns.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#7C6E5A]">
            Aucune demande de retour pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((ret) => {
              const statusInfo = STATUS_LABELS[ret.status];
              return (
                <div key={ret.id} className="rounded-2xl border border-[#E8E2D9] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F0E8] text-[#7C6E5A]">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-[#1A1209]">{ret.order_item_title}</p>
                        <p className="text-xs font-semibold text-[#7C6E5A]">
                          Commande #{ret.order} · {ret.requested_by_name} · {REASON_LABELS[ret.reason] || ret.reason}
                        </p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black"
                      style={{ color: statusInfo.color, background: statusInfo.bg }}
                    >
                      <Clock3 size={12} /> {statusInfo.label}
                    </span>
                  </div>

                  {ret.description && (
                    <p className="mt-3 rounded-xl bg-[#F5F0E8] p-3 text-sm text-[#1A1209]">{ret.description}</p>
                  )}

                  {ret.status === 'REQUESTED' && (
                    <div className="mt-4 space-y-3 border-t border-[#E8E2D9] pt-4">
                      <textarea
                        value={noteDrafts[ret.id] || ''}
                        onChange={(e) => setNoteDrafts((current) => ({ ...current, [ret.id]: e.target.value }))}
                        placeholder="Note optionnelle pour l'acheteur (visible dans son suivi de commande)"
                        className="w-full rounded-xl border border-[#E8E2D9] px-3 py-2 text-sm outline-none focus:border-[#F47920]"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={actingId === ret.id}
                          onClick={() => void handleReview(ret.id, 'APPROVED')}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        >
                          <CheckCircle size={16} /> Approuver le retour
                        </button>
                        <button
                          type="button"
                          disabled={actingId === ret.id}
                          onClick={() => void handleReview(ret.id, 'REJECTED')}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-2.5 text-sm font-bold text-[#DC2626] disabled:opacity-50"
                        >
                          <XCircle size={16} /> Rejeter
                        </button>
                      </div>
                    </div>
                  )}

                  {ret.review_note && ret.status !== 'REQUESTED' && (
                    <p className="mt-3 text-sm font-semibold text-[#7C6E5A]">Votre note : {ret.review_note}</p>
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
