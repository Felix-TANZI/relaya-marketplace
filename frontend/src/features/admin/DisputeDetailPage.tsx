// frontend/src/features/admin/DisputeDetailPage.tsx
// Détail complet d'un litige avec arbitrage

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  Send,
  Paperclip,
  ShoppingCart,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { adminApi, type AdminDisputeDetail } from '@/services/api/admin';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [dispute, setDispute] = useState<AdminDisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // États pour résolution
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveData, setResolveData] = useState({
    resolution: 'REFUND',
    resolution_note: '',
    refund_amount_xaf: 0,
  });

  const loadDispute = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await adminApi.getDisputeDetail(parseInt(id));
      setDispute(data);
      setResolveData((prev) => ({
        ...prev,
        refund_amount_xaf: data.order_detail.total_xaf,
      }));
    } catch (error) {
      console.error('Erreur chargement litige:', error);
      showToast('Erreur de chargement du litige', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  useEffect(() => {
    // Scroll vers le bas des messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages]);

  const handleSendMessage = async () => {
    if (!dispute || !message.trim()) return;

    try {
      setSendingMessage(true);
      await adminApi.addDisputeMessage(dispute.id, message, isInternal);
      setMessage('');
      showToast('Message envoyé', 'success');
      loadDispute();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showToast('Erreur lors de l\'envoi du message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (newStatus: AdminDisputeDetail['status']) => {
    if (!dispute) return;

    const confirmed = await confirm({
      title: 'Changer le statut ?',
      message: `Voulez-vous changer le statut du litige ?`,
      type: 'info',
    });

    if (!confirmed) return;

    try {
      await adminApi.updateDispute(dispute.id, { status: newStatus });
      showToast('Statut mis à jour', 'success');
      loadDispute();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleResolve = async () => {
    if (!dispute) return;

    if (!resolveData.resolution_note.trim()) {
      showToast('Veuillez ajouter une note de résolution', 'error');
      return;
    }

    try {
      await adminApi.resolveDispute(
        dispute.id,
        resolveData.resolution,
        resolveData.resolution_note,
        resolveData.refund_amount_xaf
      );
      showToast('Litige résolu avec succès', 'success');
      setShowResolveForm(false);
      loadDispute();
    } catch (error) {
      console.error('Erreur résolution:', error);
      showToast('Erreur lors de la résolution', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      OPEN: { variant: 'warning' as const, text: 'Ouvert', icon: AlertCircle },
      IN_PROGRESS: { variant: 'default' as const, text: 'En cours', icon: Clock },
      RESOLVED: { variant: 'success' as const, text: 'Résolu', icon: CheckCircle },
      CLOSED: { variant: 'default' as const, text: 'Fermé', icon: XCircle },
    };
    return variants[status as keyof typeof variants] || variants.OPEN;
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      NOT_RECEIVED: 'Commande non reçue',
      DAMAGED: 'Article endommagé',
      WRONG_ITEM: 'Mauvais article',
      NOT_AS_DESCRIBED: 'Non conforme à la description',
      REFUND_REQUEST: 'Demande de remboursement',
      OTHER: 'Autre',
    };
    return labels[reason as keyof typeof labels] || reason;
  };

  const getResolutionLabel = (resolution: string) => {
    const labels = {
      REFUND: 'Remboursement complet',
      EXCHANGE: 'Échange',
      PARTIAL_REFUND: 'Remboursement partiel',
      REJECTED: 'Rejeté',
      OTHER: 'Autre',
    };
    return labels[resolution as keyof typeof labels] || resolution;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">Litige introuvable</h2>
          <p className="text-dark-text-secondary mb-6">Ce litige n'existe pas.</p>
          <button
            onClick={() => navigate('/admin/disputes')}
            className="px-6 py-2 bg-holo-cyan text-dark-bg font-medium rounded-xl hover:bg-holo-cyan/90 transition-all"
          >
            Retour aux litiges
          </button>
        </Card>
      </div>
    );
  }

  const statusBadge = getStatusBadge(dispute.status);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/disputes"
            className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-all mb-4"
          >
            <ArrowLeft size={20} />
            Retour aux litiges
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-4xl mb-2">
                <span className="text-gradient animate-gradient-bg">Litige #{dispute.id}</span>
              </h1>
              <p className="text-dark-text-secondary">
                Ouvert le {formatDateTime(dispute.created_at)}
              </p>
            </div>

            <div className="flex gap-2">
              {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                <button
                  onClick={() => setShowResolveForm(!showResolveForm)}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Résoudre
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne Principale - Chat */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations Litige */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <AlertCircle className="text-holo-cyan" size={24} />
                Informations du Litige
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-dark-text-tertiary">Motif</p>
                    <p className="font-medium">{getReasonLabel(dispute.reason)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-text-tertiary">Statut</p>
                    <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-dark-text-tertiary mb-2">Description</p>
                  <div className="p-3 bg-dark-bg-tertiary rounded-xl border border-white/10">
                    <p className="text-sm">{dispute.description}</p>
                  </div>
                </div>

                {dispute.resolution && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-sm font-medium text-green-400 mb-2">
                      Résolution : {getResolutionLabel(dispute.resolution)}
                    </p>
                    {dispute.resolution_note && (
                      <p className="text-sm mb-2">{dispute.resolution_note}</p>
                    )}
                    {dispute.refund_amount_xaf && (
                      <p className="text-sm">
                        Montant remboursé : <strong>{formatCurrency(dispute.refund_amount_xaf)}</strong>
                      </p>
                    )}
                    <p className="text-xs text-dark-text-tertiary mt-2">
                      Résolu par {dispute.resolved_by_name} le {formatDateTime(dispute.resolved_at!)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Formulaire de Résolution */}
            {showResolveForm && (
              <Card className="border-2 border-green-500/50">
                <h3 className="font-display font-bold text-xl mb-4 text-green-400">
                  Résoudre le Litige
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">
                      Type de résolution
                    </label>
                    <select
                      value={resolveData.resolution}
                      onChange={(e) =>
                        setResolveData((prev) => ({ ...prev, resolution: e.target.value }))
                      }
                      className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                    >
                      <option value="REFUND">Remboursement complet</option>
                      <option value="PARTIAL_REFUND">Remboursement partiel</option>
                      <option value="EXCHANGE">Échange</option>
                      <option value="REJECTED">Rejeter</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  {(resolveData.resolution === 'REFUND' ||
                    resolveData.resolution === 'PARTIAL_REFUND') && (
                    <div>
                      <label className="block text-sm text-dark-text-tertiary mb-2">
                        Montant du remboursement (FCFA)
                      </label>
                      <input
                        type="number"
                        value={resolveData.refund_amount_xaf}
                        onChange={(e) =>
                          setResolveData((prev) => ({
                            ...prev,
                            refund_amount_xaf: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text focus:outline-none focus:border-holo-cyan transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-dark-text-tertiary mb-2">
                      Note de résolution *
                    </label>
                    <textarea
                      value={resolveData.resolution_note}
                      onChange={(e) =>
                        setResolveData((prev) => ({ ...prev, resolution_note: e.target.value }))
                      }
                      rows={4}
                      placeholder="Expliquez la décision prise..."
                      className="w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-cyan transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleResolve}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                    >
                      Confirmer la Résolution
                    </button>
                    <button
                      onClick={() => setShowResolveForm(false)}
                      className="px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-white/20 transition-all"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Messages */}
            <Card>
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                <MessageSquare className="text-holo-purple" size={24} />
                Messages ({dispute.messages.length})
              </h3>

              {/* Liste Messages */}
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {dispute.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${
                      msg.is_internal
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-dark-bg-tertiary border border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-dark-text-tertiary" />
                        <span className="font-medium text-sm">{msg.sender_name}</span>
                        {msg.is_internal && (
                          <Badge variant="warning" className="text-xs">
                            Interne
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-dark-text-tertiary">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire Message */}
              {dispute.status !== 'CLOSED' && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Note interne (invisible pour les parties)</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isInternal ? 'Note interne admin...' : 'Votre message...'
                      }
                      rows={3}
                      className="flex-1 px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl text-dark-text placeholder-dark-text-tertiary focus:outline-none focus:border-holo-purple transition-all resize-none"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !message.trim()}
                      className="px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Preuves */}
            {dispute.evidences.length > 0 && (
              <Card>
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <Paperclip className="text-holo-pink" size={24} />
                  Preuves ({dispute.evidences.length})
                </h3>
                <div className="space-y-2">
                  {dispute.evidences.map((evidence) => (
                    <div
                      key={evidence.id}
                      className="p-3 rounded-xl bg-dark-bg-tertiary border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {evidence.description || 'Document'}
                        </p>
                        <p className="text-xs text-dark-text-tertiary">
                          Par {evidence.uploaded_by_name} • {formatDateTime(evidence.created_at)}
                        </p>
                      </div>
                      {evidence.file_url && (
                        <a
                          href={evidence.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg glass border border-white/10 hover:border-holo-cyan transition-all"
                        >
                          <Eye size={16} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Rapides */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4">Actions Rapides</h3>
              <div className="space-y-2">
                {dispute.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    className="w-full px-4 py-2 bg-holo-purple text-white rounded-xl hover:bg-holo-purple/90 transition-all"
                  >
                    Marquer "En cours"
                  </button>
                )}

                <Link
                  to={`/admin/orders/${dispute.order_detail.id}`}
                  className="block w-full px-4 py-2 bg-dark-bg-tertiary border border-white/10 rounded-xl hover:border-holo-cyan transition-all text-center"
                >
                  Voir la commande
                </Link>
              </div>
            </Card>

            {/* Informations Commande */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <ShoppingCart className="text-holo-cyan" size={20} />
                Commande
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-text-tertiary">ID Commande</p>
                  <Link
                    to={`/admin/orders/${dispute.order_detail.id}`}
                    className="font-medium text-holo-cyan hover:underline"
                  >
                    #{dispute.order_detail.id}
                  </Link>
                </div>
                <div>
                  <p className="text-dark-text-tertiary">Montant total</p>
                  <p className="font-bold text-holo-cyan">
                    {formatCurrency(dispute.order_detail.total_xaf)}
                  </p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary">Client</p>
                  <p className="font-medium">
                    {dispute.order_detail.customer_email || dispute.order_detail.customer_phone}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-dark-text-tertiary">Paiement</p>
                    <Badge variant="default" className="text-xs">
                      {dispute.order_detail.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-dark-text-tertiary">Livraison</p>
                    <Badge variant="default" className="text-xs">
                      {dispute.order_detail.fulfillment_status}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Dates */}
            <Card>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="text-holo-pink" size={20} />
                Dates
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-text-tertiary">Ouvert</p>
                  <p className="font-medium">{formatDateTime(dispute.created_at)}</p>
                </div>
                <div>
                  <p className="text-dark-text-tertiary">Dernière mise à jour</p>
                  <p className="font-medium">{formatDateTime(dispute.updated_at)}</p>
                </div>
                {dispute.resolved_at && (
                  <div>
                    <p className="text-dark-text-tertiary">Résolu</p>
                    <p className="font-medium">{formatDateTime(dispute.resolved_at)}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
