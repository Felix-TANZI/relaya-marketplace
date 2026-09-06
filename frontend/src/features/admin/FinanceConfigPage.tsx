// frontend/src/features/admin/FinanceConfigPage.tsx
//
// =============================================================================
//  LA CONFIGURATION FINANCIERE, SANS PASSER PAR DJANGO
//
//  Huit reglages gouvernent l'argent : prestataire, frais, repartition,
//  sequestre, cycles, versements, remuneration relais, risque.
//
//  ─────────────────────────────────────────────────────────────────────────
//  AUCUNE MODIFICATION DIRECTE
//
//  Il n'existe volontairement PAS de formulaire d'edition. Toute
//  modification passe par une DEMANDE, approuvee par un tiers.
//
//  Ce n'est pas une limitation de l'interface : c'est la gouvernance du
//  module, appliquee jusqu'en base. Un ecran qui permettrait d'ecrire
//  directement la contournerait.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChartPie, CheckCircle2, Clock, GitPullRequest, Lock,
  Plug, Receipt, RefreshCw, Send, Shield, Store, X,
} from 'lucide-react';

import { useAdminTheme } from '@/hooks/useAdminTheme';
import { api } from '@/services/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SectionSummary {
  key: string;
  label: string;
  hint: string;
  summary: string;
  count: number;
  version: number;
  /** Valeurs anormales : bac a sable, minimum de test… */
  warnings: string[];
}

interface Overview {
  sections: SectionSummary[];
  pending_requests: number;
}

interface ChangeRequest {
  reference: string;
  target_model: string;
  target_key: string;
  action: string;
  payload: Record<string, unknown>;
  previous_snapshot: Record<string, unknown>;
  diff: Record<string, unknown>;
  justification: string;
  status: string;
  status_label: string;
  requested_by: string;
  requested_at: string;
  approved_by: string;
  rejection_reason: string;
  applied_version: number | null;
  /** Calcule par le serveur : le demandeur ne peut pas approuver. */
  can_approve: boolean;
  is_mine: boolean;
}

const ICONES: Record<string, React.ElementType> = {
  provider: Plug,
  fees: Receipt,
  distribution: ChartPie,
  escrow: Lock,
  cycles: Clock,
  payout: Send,
  relay: Store,
  risk: Shield,
};

/** Les champs techniques n'intéressent personne dans un écran de réglages. */
function fmtDate(valeur: string | null): string {
  if (!valeur) return '—';
  const d = new Date(valeur);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (typeof valeur === 'boolean') return valeur ? 'oui' : 'non';
  if (typeof valeur === 'number') return valeur.toLocaleString('fr-FR');
  if (Array.isArray(valeur)) return valeur.length ? valeur.join(', ') : '—';
  if (typeof valeur === 'object') return JSON.stringify(valeur);
  return String(valeur);
}

/** `min_payout_xaf` → « Min payout xaf ». Lisible sans dictionnaire. */
function fmtChamp(nom: string): string {
  const propre = nom
    .replace(/_xaf$/, ' (FCFA)')
    .replace(/_hours$/, ' (heures)')
    .replace(/_pct$|_percent$/, ' (%)')
    .replace(/_/g, ' ');
  return propre.charAt(0).toUpperCase() + propre.slice(1);
}

// =============================================================================

export default function FinanceConfigPage() {
  const T = useAdminTheme();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, r] = await Promise.all([
        api.get<Overview>('/api/payments/v2/admin/config/'),
        api.get<ChangeRequest[]>('/api/payments/v2/admin/config/requests/'),
      ]);
      setOverview(o);
      setRequests(r);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approve = async (reference: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/api/payments/v2/admin/config/requests/${reference}/approve/`, {},
      );
      setNotice('Demande approuvée. Le réglage est appliqué.');
      await load();
    } catch (exc) {
      // Le message du serveur, TEL QUEL.
      setError(exc instanceof Error ? exc.message : "L'approbation a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async (reference: string) => {
    if (!rejectReason.trim()) {
      setError('Le motif du rejet est obligatoire.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/api/payments/v2/admin/config/requests/${reference}/reject/`,
        { reason: rejectReason.trim() },
      );
      setNotice('Demande rejetée.');
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : 'Le rejet a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800,
            color: T.text, marginBottom: 4,
          }}>
            Configuration financière
          </h1>
          <p style={{ fontSize: 12.5, color: T.muted }}>
            Huit réglages gouvernent l’argent. Aucun ne se modifie sans
            l’accord d’un tiers.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { void load(); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          {pending.length > 0 && (
            <span style={{
              padding: '8px 14px', borderRadius: 12, fontSize: 12.5,
              fontWeight: 700, background: T.redB, color: T.red,
              border: `1px solid ${T.border}`,
            }}>
              {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, background: T.redB,
          border: `1px solid ${T.red}33`, color: T.red, fontSize: 12.5,
        }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#34D399', fontSize: 12.5,
        }}>
          {notice}
        </div>
      )}

      {/* ── Les huit réglages ───────────────────────────────────────── */}
      <Section title="Réglages actifs" icon={Shield} T={T}>
        {loading && !overview ? (
          <p style={{ fontSize: 12.5, color: T.muted }}>Chargement…</p>
        ) : (
          <div style={{ margin: '-20px', overflow: 'hidden' }}>
            {(overview?.sections ?? []).map((s, i, tout) => {
              const Icone = ICONES[s.key] ?? Shield;
              return (
                <button
                  key={s.key}
                  type="button"
                  // ─────────────────────────────────────────────────
                  // UNE PAGE, PAS UN PANNEAU DEPLIE
                  //
                  // Une grille tarifaire a quatre categories, ou une
                  // politique de risque a 25 champs, ne se lit pas sous une
                  // liste.
                  // ─────────────────────────────────────────────────
                  onClick={() => navigate(
                    `/admin/finance/configuration/${s.key}`,
                  )}
                  className="w-full flex items-center gap-3.5 text-left"
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < tout.length - 1 ? `1px solid ${T.border}` : 'none',
                    background: 'transparent',
                  }}
                >
                  <Icone size={17} style={{ color: T.mutedL, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: T.text, margin: 0 }}>
                      {s.label}
                    </p>
                    {/* LA VALEUR AVANT LE NOM : Django oblige a ouvrir chaque
                        objet pour savoir ce qu'il contient. */}
                    <p style={{ fontSize: 11.5, color: T.mutedL, margin: '3px 0 0' }}>
                      {s.summary || s.hint}
                    </p>
                  </div>
                  {s.warnings.map((w) => (
                    <span key={w} style={{
                      fontSize: 10.5, fontWeight: 700, color: '#FBBF24',
                      background: 'rgba(251,191,36,0.12)',
                      padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                    }}>
                      {w}
                    </span>
                  ))}
                  <span style={{ fontSize: 11, color: T.mutedL, width: 24, textAlign: 'right' }}>
                    v{s.version}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Demandes de changement ──────────────────────────────────── */}
      <Section title="Demandes de changement" icon={GitPullRequest} T={T}>
        {requests.length === 0 ? (
          <p style={{ fontSize: 12.5, color: T.mutedL }}>
            Aucune demande. Les modifications de configuration apparaîtront ici
            en attente d’approbation.
          </p>
        ) : (
          requests.slice(0, 10).map((r) => (
            <div
              key={r.reference}
              style={{
                border: `1px solid ${T.border}`, borderRadius: 12,
                padding: '14px 16px', background: T.cardAlt,
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  marginTop: 6,
                  background: r.status === 'PENDING' ? '#FBBF24'
                    : r.status === 'APPROVED' ? '#34D399' : T.mutedL,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
                    {r.target_model} · {r.target_key || 'nouveau'}
                  </p>
                  <p style={{ fontSize: 12, color: T.muted, margin: '4px 0 0', lineHeight: 1.55 }}>
                    Par <b style={{ color: T.text }}>{r.requested_by}</b> le{' '}
                    {fmtDate(r.requested_at)} — « {r.justification} »
                  </p>
                  {r.rejection_reason && (
                    <p style={{ fontSize: 11.5, color: T.red, margin: '6px 0 0' }}>
                      Rejetée — {r.rejection_reason}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: T.mutedL, whiteSpace: 'nowrap' }}>
                  {r.status_label}
                </span>
              </div>

              {Object.keys(r.diff ?? {}).length > 0 && (
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: '10px 14px', margin: '12px 0 0',
                }}>
                  {Object.entries(r.diff).map(([champ, valeurs]) => {
                    const paire = valeurs as { from?: unknown; to?: unknown };
                    return (
                      <div key={champ} className="flex justify-between items-baseline"
                        style={{ padding: '4px 0' }}>
                        <span style={{ fontSize: 11.5, color: T.mutedL }}>
                          {fmtChamp(champ)}
                        </span>
                        <span style={{ fontSize: 12, color: T.text }}>
                          <span style={{ color: T.red, textDecoration: 'line-through' }}>
                            {fmtValeur(paire.from)}
                          </span>
                          {' → '}
                          <b>{fmtValeur(paire.to)}</b>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {r.status === 'PENDING' && (
                <div style={{ marginTop: 12 }}>
                  {/* ─────────────────────────────────────────────────────
                      SA PROPRE DEMANDE N'A PAS DE BOUTON

                      `can_approve` vient du serveur. Plutot que de laisser
                      l'ecran l'apprendre par un refus, on le dit d'avance :
                      l'absence d'action vaut mieux qu'un echec apres clic.
                      ───────────────────────────────────────────────────── */}
                  {!r.can_approve ? (
                    <p style={{ fontSize: 11.5, color: T.red, margin: 0 }}>
                      {r.is_mine
                        ? 'Vous ne pouvez pas approuver votre propre demande.'
                        : 'Approbation non disponible.'}
                    </p>
                  ) : rejecting === r.reference ? (
                    <div className="space-y-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motif du rejet…"
                        style={{
                          width: '100%', background: T.card, color: T.text,
                          border: `1px solid ${T.border}`, borderRadius: 10,
                          padding: '9px 13px', fontSize: 12.5,
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <Btn T={T} onClick={() => { setRejecting(null); setRejectReason(''); }}>
                          Annuler
                        </Btn>
                        <Btn T={T} danger disabled={busy}
                          onClick={() => { void reject(r.reference); }}>
                          Confirmer le rejet
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <Btn T={T} onClick={() => setRejecting(r.reference)}>
                        <X size={12} /> Rejeter
                      </Btn>
                      <Btn T={T} ok disabled={busy}
                        onClick={() => { void approve(r.reference); }}>
                        <CheckCircle2 size={12} /> Approuver
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </Section>

      {/* Une alerte visible en permanence, la ou preflight ne se lance qu'a
          la demande. */}
      {(overview?.sections ?? []).some((s) => s.warnings.length > 0) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 11,
          padding: '14px 16px', borderRadius: 12,
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <AlertTriangle size={16} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: '#FBBF24', margin: 0, lineHeight: 1.6 }}>
            Certains réglages portent des valeurs de test. Elles conviennent en
            développement, mais un encaissement de 1 FCFA coûterait plus en
            frais qu’il ne rapporte. À revoir avant la mise en production.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragments — repris de SettingsPage pour rester dans la même grammaire
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, T }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        <Icon size={14} style={{ color: T.red }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, ok, danger, T }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ok?: boolean;
  danger?: boolean;
  T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5"
      style={{
        padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        background: ok ? 'rgba(16,185,129,0.12)'
          : danger ? T.redB : T.cardAlt,
        border: `1px solid ${ok ? 'rgba(16,185,129,0.35)'
          : danger ? `${T.red}55` : T.border}`,
        color: ok ? '#34D399' : danger ? T.red : T.muted,
      }}
    >
      {children}
    </button>
  );
}