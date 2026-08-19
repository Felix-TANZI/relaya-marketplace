// frontend/src/features/payments/buyer/PaymentCheckoutPage.tsx
// Payer une commande par Mobile Money.
//
// ─────────────────────────────────────────────────────────────────────────────
// UN ECRAN DEDIE, PAS UN DECLENCHEMENT A LA VALIDATION
//
// Si l'invite USSD echoue — solde insuffisant, mauvais numero, abandon — la
// commande EXISTE DEJA. L'acheteur reessaie sans reconstituer son panier.
//
// Declencher le paiement au moment de valider la commande aurait tout perdu
// au premier echec, et les echecs sont frequents en Mobile Money.
//
// ─────────────────────────────────────────────────────────────────────────────
// LE PRESTATAIRE FAIT FOI, JAMAIS L'ETAT LOCAL
//
// CamPay n'emet AUCUN webhook pour une transaction restee en attente. Sans
// sondage, un paiement confirme sur le telephone resterait invisible.
//
// Le bouton « J'ai compose mon code » force une verification immediate : il
// n'affirme rien, il demande.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { paymentsApi } from '../api/payments.api';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import type { MomoOperator, PaymentIntent } from '../model/payment.types';

interface PaymentCheckoutPageProps {
  ordersPath?: string;
}

type Phase = 'form' | 'waiting' | 'done' | 'failed';

/** Intervalle de sondage. Trop court sature l'API, trop long inquiète. */
const SONDAGE_MS = 4000;

/** Au-delà, CamPay a expiré la demande de toute façon. */
const DELAI_MAX_S = 180;

const OPERATEURS: Array<{ code: MomoOperator; label: string }> = [
  { code: 'MTN', label: 'MTN Mobile Money' },
  { code: 'ORANGE', label: 'Orange Money' },
];

/** Les états qui signifient « c'est terminé, dans un sens ou dans l'autre ». */
const ABOUTI = ['SUCCEEDED'];
const ECHOUE = ['FAILED', 'EXPIRED', 'CANCELLED'];

function normaliserNumero(saisie: string): string {
  const chiffres = saisie.replace(/\D/g, '');
  // Un numéro camerounais saisi sans indicatif reste valide : on le complète
  // plutôt que de le refuser.
  if (chiffres.length === 9 && chiffres.startsWith('6')) return `237${chiffres}`;
  return chiffres;
}

function numeroValide(numero: string): boolean {
  return /^237[62]\d{8}$/.test(numero);
}

export default function PaymentCheckoutPage({
  ordersPath = '/orders',
}: PaymentCheckoutPageProps) {
  const { reference = '' } = useParams<{ reference: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [intention, setIntention] = useState<PaymentIntent | null>(null);
  const [chargement, setChargement] = useState(true);
  const [phase, setPhase] = useState<Phase>('form');
  const [operateur, setOperateur] = useState<MomoOperator>('MTN');
  const [numero, setNumero] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [restant, setRestant] = useState(DELAI_MAX_S);

  const monte = useRef(true);
  const orderId = params.get('order');

  // ── Chargement initial ─────────────────────────────────────────────────
  useEffect(() => {
    monte.current = true;
    paymentsApi.detail(reference)
      .then((donnees) => {
        if (!monte.current) return;
        setIntention(donnees);
        if (donnees.payer_msisdn_masked) {
          setOperateur((donnees.payer_operator as MomoOperator) || 'MTN');
        }
        // Une intention déjà encaissée ne doit pas redemander un paiement.
        if (ABOUTI.includes(donnees.status)) setPhase('done');
        else if (ECHOUE.includes(donnees.status)) setPhase('failed');
        else if (donnees.status === 'PROCESSING'
          || donnees.status === 'REQUIRES_ACTION') setPhase('waiting');
      })
      .catch((exc: unknown) => {
        if (!monte.current) return;
        setErreur(exc instanceof Error
          ? exc.message : 'Ce paiement est introuvable.');
      })
      .finally(() => { if (monte.current) setChargement(false); });

    return () => { monte.current = false; };
  }, [reference]);

  // ── Vérification auprès du prestataire ─────────────────────────────────
  const verifier = useCallback(async () => {
    try {
      const issue = await paymentsApi.check(reference);
      if (!monte.current) return;

      if (ABOUTI.includes(issue.status)) {
        setPhase('done');
        if (issue.payment) setIntention(issue.payment);
      } else if (ECHOUE.includes(issue.status)) {
        setPhase('failed');
        // Le message du prestataire, TEL QUEL : « solde insuffisant » vaut
        // mieux que « une erreur est survenue ».
        setErreur(issue.message || 'Le paiement n’a pas abouti.');
      }
    } catch {
      // Un échec de sondage n'est pas un échec de paiement : le réseau peut
      // avoir hoqueté. On laisse le prochain passage trancher.
    }
  }, [reference]);

  // ── Sondage pendant l'attente ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return;

    const sondage = window.setInterval(() => { void verifier(); }, SONDAGE_MS);
    const horloge = window.setInterval(() => {
      setRestant((secondes) => {
        if (secondes <= 1) {
          // Le délai est écoulé. On ne conclut RIEN : on demande une
          // dernière fois au prestataire, qui seul sait.
          void verifier();
          return 0;
        }
        return secondes - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(sondage);
      window.clearInterval(horloge);
    };
  }, [phase, verifier]);

  // ── Émission de la demande ─────────────────────────────────────────────
  const payer = async () => {
    const msisdn = normaliserNumero(numero);
    if (!numeroValide(msisdn)) {
      setErreur('Numéro invalide. Format attendu : 237 6XX XX XX XX.');
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      const issue = await paymentsApi.initiate(reference, {
        payer_msisdn: msisdn, payer_operator: operateur,
      });
      if (!monte.current) return;

      if (ECHOUE.includes(issue.status)) {
        setPhase('failed');
        setErreur(issue.message || 'Le paiement n’a pas abouti.');
      } else if (ABOUTI.includes(issue.status)) {
        setPhase('done');
      } else {
        setRestant(DELAI_MAX_S);
        setPhase('waiting');
      }
    } catch (exc: unknown) {
      if (!monte.current) return;
      setErreur(exc instanceof Error
        ? exc.message : 'La demande n’a pas pu être émise.');
    } finally {
      if (monte.current) setEnvoi(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (chargement) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (!intention) {
    return (
      <EmptyState
        icon="file-off"
        title="Paiement introuvable"
        description={erreur ?? undefined}
      />
    );
  }

  const carte: React.CSSProperties = {
    background: 'var(--surface-2, #FFFFFF)',
    border: `0.5px solid ${FT.border}`,
    borderRadius: 16,
    padding: '1.5rem',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {phase === 'form' && (
        <div style={carte}>
          <p style={{
            fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: FT.faint,
          }}>
            Montant à payer
          </p>
          <div style={{ marginBottom: 4 }}>
            <Money value={intention.amount_xaf} size={38} />
          </div>
          <p style={{ fontSize: 13, margin: '0 0 1.5rem', color: FT.muted }}>
            FCFA
            {orderId && ` · commande #${orderId}`}
          </p>

          {/* La promesse s'affiche AVANT le paiement : c'est le moment où
              l'acheteur hésite. */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', background: 'var(--surface-1, #F5F0E8)',
            borderRadius: 10, marginBottom: '1.5rem',
          }}>
            <i
              className="ti ti-shield-check"
              aria-hidden="true"
              style={{ fontSize: 17, color: FT.greenD, flexShrink: 0, marginTop: 1 }}
            />
            <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.55, color: FT.muted }}>
              BelivaY conserve votre argent jusqu’à confirmation de réception.
              Le vendeur n’est payé qu’après.
            </p>
          </div>

          <p style={{ fontSize: 12, margin: '0 0 10px', color: FT.muted }}>
            Votre opérateur
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
            {OPERATEURS.map((choix) => (
              <button
                key={choix.code}
                type="button"
                onClick={() => setOperateur(choix.code)}
                style={{
                  flex: 1, padding: 14, fontSize: 13.5,
                  borderColor: operateur === choix.code ? FT.coral : undefined,
                  color: operateur === choix.code ? '#993C1D' : undefined,
                }}
              >
                {choix.label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 12, margin: '0 0 7px', color: FT.muted }}>
            Numéro à débiter
          </p>
          <input
            type="tel"
            value={numero}
            onChange={(evenement) => setNumero(evenement.target.value)}
            placeholder="237 6XX XX XX XX"
            disabled={envoi}
            style={{ width: '100%', fontSize: 14, marginBottom: '1.25rem' }}
          />

          {erreur && (
            <p style={{ fontSize: 12.5, margin: '0 0 1rem', color: FT.redD }}>
              {erreur}
            </p>
          )}

          <button
            type="button"
            onClick={() => { void payer(); }}
            disabled={envoi}
            style={{
              width: '100%', padding: 14, fontSize: 14,
              borderColor: FT.coral, color: '#993C1D',
              opacity: envoi ? 0.6 : 1,
            }}
          >
            {envoi
              ? 'Envoi de la demande…'
              : `Payer ${intention.amount_xaf.toLocaleString('fr-FR')} FCFA`}
          </button>
        </div>
      )}

      {phase === 'waiting' && (
        <div style={{ ...carte, textAlign: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `2.5px solid ${FT.coralL}`, borderTopColor: 'transparent',
              margin: '0 auto 1.25rem', animation: 'spin 1s linear infinite',
            }}
          />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

          <p style={{
            fontSize: 17, margin: '0 0 8px',
            color: 'var(--text-primary, #1A1209)',
          }}>
            Composez votre code secret
          </p>
          <p style={{
            fontSize: 13, margin: '0 auto 1.5rem', maxWidth: 340,
            lineHeight: 1.6, color: FT.muted,
          }}>
            Une invite vient d’être envoyée sur votre téléphone. Validez-la
            pour finaliser le paiement.
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-1, #F5F0E8)', padding: '8px 14px',
            borderRadius: 999, marginBottom: '1.5rem',
          }}>
            <span aria-hidden="true" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: restant > 0 ? FT.amber : FT.faint,
            }} />
            <span style={{ fontSize: 12, color: FT.muted }}>
              {restant > 0
                ? `Vérification automatique · ${Math.floor(restant / 60)} min ${
                  String(restant % 60).padStart(2, '0')} restantes`
                : 'Dernière vérification en cours…'}
            </span>
          </div>

          <div style={{
            borderTop: `0.5px solid ${FT.border}`, paddingTop: '1.25rem',
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={() => navigate(orderId ? `${ordersPath}/${orderId}` : ordersPath)}
              style={{ fontSize: 12.5, padding: '8px 16px' }}
            >
              Payer plus tard
            </button>
            <button
              type="button"
              onClick={() => { void verifier(); }}
              style={{
                fontSize: 12.5, padding: '8px 16px',
                borderColor: FT.coral, color: '#993C1D',
              }}
            >
              J’ai composé mon code
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ ...carte, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <i
              className="ti ti-check"
              aria-hidden="true"
              style={{ fontSize: 26, color: FT.greenD }}
            />
          </div>

          <p style={{
            fontSize: 17, margin: '0 0 8px',
            color: 'var(--text-primary, #1A1209)',
          }}>
            Paiement reçu
          </p>
          <p style={{
            fontSize: 13, margin: '0 0 1.25rem', lineHeight: 1.6, color: FT.muted,
          }}>
            {intention.amount_xaf.toLocaleString('fr-FR')} FCFA sont conservés
            par BelivaY.
          </p>

          <div style={{
            background: 'var(--surface-1, #F5F0E8)', borderRadius: 10,
            padding: 14, textAlign: 'left', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <i
                className="ti ti-lock"
                aria-hidden="true"
                style={{ fontSize: 16, color: FT.faint, flexShrink: 0, marginTop: 1 }}
              />
              <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.55, color: FT.muted }}>
                Le vendeur sera payé après votre confirmation de réception. En
                cas de problème, vous pouvez ouvrir un litige.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(orderId ? `${ordersPath}/${orderId}` : ordersPath)}
            style={{
              width: '100%', padding: 13, fontSize: 13.5,
              borderColor: FT.coral, color: '#993C1D',
            }}
          >
            Suivre ma commande
          </button>
        </div>
      )}

      {phase === 'failed' && (
        <div style={carte}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            marginBottom: '1.25rem',
          }}>
            <span aria-hidden="true" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: FT.red, flexShrink: 0, marginTop: 7,
            }} />
            <div>
              <p style={{
                fontSize: 15, margin: '0 0 5px',
                color: 'var(--text-primary, #1A1209)',
              }}>
                Le paiement n’a pas abouti
              </p>
              {/* Le message de l'opérateur, sans reformulation. */}
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, color: FT.muted }}>
                {erreur || intention.failure_reason
                  || 'Aucun détail n’a été fourni par l’opérateur.'}
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--surface-1, #F5F0E8)', borderRadius: 10,
            padding: '12px 14px', marginBottom: '1.25rem',
          }}>
            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.55, color: FT.muted }}>
              {/* C'est ce qui justifie l'écran dédié. */}
              Votre commande{orderId && (
                <span style={{ color: 'var(--text-primary, #1A1209)' }}>
                  {' '}#{orderId}
                </span>
              )} est conservée. Vous pouvez réessayer avec un autre numéro sans
              refaire votre panier.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate(orderId ? `${ordersPath}/${orderId}` : ordersPath)}
              style={{ flex: 1, padding: 12, fontSize: 13 }}
            >
              Voir ma commande
            </button>
            {intention.can_retry !== false && (
              <button
                type="button"
                onClick={() => { setPhase('form'); setErreur(null); }}
                style={{
                  flex: 1, padding: 12, fontSize: 13,
                  borderColor: FT.coral, color: '#993C1D',
                }}
              >
                Réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}