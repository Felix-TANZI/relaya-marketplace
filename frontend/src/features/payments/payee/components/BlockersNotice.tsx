// frontend/src/features/payments/payee/components/BlockersNotice.tsx
// Ce qui empeche le versement, et comment le lever.
//
// ─────────────────────────────────────────────────────────────────────────
// QUAND UN OBSTACLE EXISTE, LA DATE DISPARAIT
//
// Afficher « versement le vendredi 15 août » a un partenaire dont le
// dossier est incomplet est une promesse FAUSSE — et c'est exactement le
// genre de detail qui detruit la confiance quand le vendredi arrive sans
// virement.
//
// Le montant, lui, reste affiche : il lui est bien acquis. C'est le
// VERSEMENT qui attend, pas la creance.
// ─────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';
import { FT } from '../../shared/tokens';

interface BlockersNoticeProps {
  blockers: string[];
  onResolve?: () => void;
  resolveLabel?: string;
}

/** Traduit un blocage technique en phrase comprehensible et en action. */
const AIDE: Array<{ motif: RegExp; texteKey: string; actionKey?: string }> = [
  {
    motif: /kyc/i,
    texteKey: 'sl2_payee_escrow.blocker_kyc_text',
    actionKey: 'sl2_payee_escrow.blocker_kyc_action',
  },
  {
    motif: /refroidissement|cooling/i,
    texteKey: 'sl2_payee_escrow.blocker_cooling_text',
  },
  {
    motif: /suspendu|hold/i,
    texteKey: 'sl2_payee_escrow.blocker_suspended_text',
  },
  {
    motif: /numero|msisdn/i,
    texteKey: 'sl2_payee_escrow.blocker_msisdn_text',
    actionKey: 'sl2_payee_escrow.blocker_msisdn_action',
  },
];

function humaniser(
  blocage: string,
  t: (key: string) => string,
): { texte: string; action?: string } {
  const trouve = AIDE.find((entree) => entree.motif.test(blocage));
  // On garde le message d'origine en repli : mieux vaut une phrase
  // technique qu'un partenaire sans explication.
  if (!trouve) return { texte: blocage };
  return { texte: t(trouve.texteKey), action: trouve.actionKey ? t(trouve.actionKey) : undefined };
}

export default function BlockersNotice({
  blockers, onResolve, resolveLabel,
}: BlockersNoticeProps) {
  const { t } = useTranslation();
  if (blockers.length === 0) return null;

  const premier = humaniser(blockers[0], t);
  const libelle = resolveLabel ?? premier.action;

  return (
    <div style={{ textAlign: 'right', maxWidth: 260 }}>
      <p style={{
        fontSize: 11, margin: '0 0 6px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted, #B4B2A9)',
      }}>
        {t('sl2_payee_escrow.payout_suspended')}
      </p>

      {blockers.map((blocage, index) => {
        const detail = humaniser(blocage, t);
        return (
          <div
            key={blocage}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              justifyContent: 'flex-end', marginTop: index === 0 ? 0 : 8,
            }}
          >
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: FT.red, flexShrink: 0, marginTop: 6,
            }} />
            <p style={{
              fontSize: 13, margin: 0, textAlign: 'left', lineHeight: 1.5,
              color: 'var(--text-primary, #1A1209)',
            }}>
              {detail.texte}
            </p>
          </div>
        );
      })}

      {onResolve && libelle && (
        <button
          type="button"
          onClick={onResolve}
          style={{ fontSize: 12, padding: '6px 13px', marginTop: 12 }}
        >
          {libelle}
        </button>
      )}
    </div>
  );
}