// frontend/src/features/payments/shared/ApprovalDialog.tsx
// Valider un mouvement d'argent.
//
// ─────────────────────────────────────────────────────────────────────────
// L'ECRAN DOIT FAIRE HESITER UNE SECONDE, PAS TROIS
//
// Le montant en grand, le destinataire masque, et QUI a demande — c'est ce
// dernier point qui rend la separation des roles tangible au moment de
// cliquer.
//
// LE MOTIF EST OBLIGATOIRE POUR REFUSER, FACULTATIF POUR APPROUVER.
// Approuver, c'est confirmer le cours normal ; refuser, c'est s'en ecarter,
// et ca doit s'expliquer. Le backend impose deja cette asymetrie.
//
// La phrase sur l'irreversibilite est sobre : un encadre rouge serait
// ignore des la troisieme approbation, une ligne calme se lit encore a la
// centieme.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

import Money from './Money';
import { FT } from './tokens';

export interface ApprovalField {
  label: string;
  value: string;
}

interface ApprovalDialogProps {
  open: boolean;
  title: string;
  amountXaf: number;
  fields: ApprovalField[];
  confirmLabel: string;
  /** Refuser exige un motif ; approuver s'en passe. */
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
  warning?: string;
  danger?: boolean;
  running?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Enveloppe : ne monte le corps QUE lorsque le dialogue est ouvert.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE DECOUPAGE
 *
 * Il fallait vider le motif a chaque ouverture. Le faire dans un `useEffect`
 * declenche un rendu en cascade — et la regle `react-hooks/set-state-in-effect`
 * a raison de l'interdire.
 *
 * Monter un composant neuf a l'ouverture donne le meme resultat sans aucun
 * effet : l'etat naitra vide, par construction. C'est ce que React appelle
 * « reinitialiser par la cle » — ici, par le montage lui-meme.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function ApprovalDialog(props: ApprovalDialogProps) {
  if (!props.open) return null;
  return <ApprovalDialogBody {...props} />;
}

function ApprovalDialogBody({
  title, amountXaf, fields, confirmLabel,
  reasonRequired = false, reasonPlaceholder = '',
  warning, danger = false, running = false, error,
  onConfirm, onCancel,
}: ApprovalDialogProps) {
  const [motif, setMotif] = useState('');

  const bloque = running || (reasonRequired && motif.trim().length === 0);
  const accent = danger ? FT.redD : FT.greenD;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(28,18,9,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(evenement) => {
        if (evenement.target === evenement.currentTarget && !running) onCancel();
      }}
    >
      <div style={{
        background: 'var(--surface-2, #FFFFFF)', borderRadius: 16,
        width: '100%', maxWidth: 420, overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(28,18,9,0.22)',
      }}>
        <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
          <p style={{
            fontSize: 15, margin: '0 0 1.25rem',
            color: 'var(--text-primary, #1A1209)',
          }}>
            {title}
          </p>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', paddingBottom: 12,
            borderBottom: `0.5px solid ${FT.border}`,
          }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary, #7C6E5A)' }}>
              Montant
            </span>
            <Money value={amountXaf} size={20} />
          </div>

          {fields.map((champ) => (
            <div
              key={champ.label}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', padding: '10px 0',
                borderBottom: `0.5px solid ${FT.border}`,
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary, #7C6E5A)' }}>
                {champ.label}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-primary, #1A1209)' }}>
                {champ.value}
              </span>
            </div>
          ))}

          <p style={{
            fontSize: 12, margin: '16px 0 7px',
            color: 'var(--text-secondary, #7C6E5A)',
          }}>
            {reasonRequired ? 'Motif' : 'Commentaire'}
            {reasonRequired && <span style={{ color: FT.redD }}> ·</span>}
          </p>
          <textarea
            rows={2}
            value={motif}
            onChange={(evenement) => setMotif(evenement.target.value)}
            placeholder={reasonPlaceholder}
            disabled={running}
            style={{ width: '100%', fontSize: 13, resize: 'none' }}
          />

          {warning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              gap: 8, marginTop: 14,
            }}>
              <span aria-hidden="true" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: FT.amber, flexShrink: 0, marginTop: 6,
              }} />
              <p style={{
                fontSize: 12, margin: 0, lineHeight: 1.55,
                color: 'var(--text-secondary, #7C6E5A)',
              }}>
                {warning}
              </p>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              gap: 8, marginTop: 14,
            }}>
              <span aria-hidden="true" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: FT.red, flexShrink: 0, marginTop: 6,
              }} />
              <p style={{ fontSize: 12, margin: 0, lineHeight: 1.55, color: FT.redD }}>
                {error}
              </p>
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.5rem', borderTop: `0.5px solid ${FT.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={running}
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motif.trim())}
            disabled={bloque}
            style={{
              fontSize: 13, padding: '8px 16px',
              borderColor: bloque ? undefined : accent,
              color: bloque ? undefined : accent,
              opacity: bloque ? 0.55 : 1,
            }}
          >
            {running ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}