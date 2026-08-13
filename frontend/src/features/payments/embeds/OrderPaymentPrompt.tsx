// frontend/src/features/payments/embeds/OrderPaymentPrompt.tsx
// Reprendre un paiement laissé en suspens.
//
// ─────────────────────────────────────────────────────────────────────────────
// « PAYER PLUS TARD » DOIT AVOIR UNE SUITE
//
// Sans ce bandeau, un acheteur qui quittait l'ecran de paiement se
// retrouvait avec une commande creee, impayee, et AUCUN moyen de la payer.
// Il devait refaire son panier — ce qui produisait une seconde commande
// pour le meme achat.
//
// C'est exactement le double paiement qu'il faut eviter : non pas payer
// deux fois la meme commande, mais creer deux commandes pour un seul achat.
//
// ─────────────────────────────────────────────────────────────────────────────
// ON NE PAIE JAMAIS DEUX FOIS
//
// Trois protections, dont deux ne sont pas dans ce composant :
//
//   1. ce bandeau DISPARAIT des que la commande est payee
//   2. l'API refuse d'encaisser une intention deja SUCCEEDED
//   3. la cle d'idempotence `cart-{order_id}` garantit qu'un meme panier
//      ne produit qu'UNE intention, meme si l'appel est rejoue
//
// La troisieme est la vraie garantie : elle tient meme si l'acheteur
// rafraichit la page vingt fois.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paymentsApi } from '../api/payments.api';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import type { PaymentIntent } from '../model/payment.types';

interface OrderPaymentPromptProps {
  orderId: number;
  /** Statut de paiement de la commande, tel que l'API le renvoie. */
  paymentStatus?: string;
}

/** Les états où un paiement reste possible — et souhaitable. */
const A_PAYER = ['DRAFT', 'REQUIRES_ACTION', 'FAILED', 'EXPIRED'];

/** Un paiement en cours : l'acheteur a peut-être déjà composé son code. */
const EN_COURS = ['PROCESSING'];

export default function OrderPaymentPrompt({
  orderId, paymentStatus,
}: OrderPaymentPromptProps) {
  const navigate = useNavigate();
  const [intention, setIntention] = useState<PaymentIntent | null>(null);
  const [chargement, setChargement] = useState(true);

  // Une commande déjà payée n'a rien à reprendre. La condition est derivee du
  // rendu, pas posee dans un state depuis l'effet : appeler setState dans le
  // corps d'un effet declenche un rendu en cascade inutile.
  const dejaRegle = paymentStatus === 'PAID' || paymentStatus === 'REFUNDED';

  useEffect(() => {
    let monte = true;

    // On n'interroge même pas l'API pour une commande deja reglee.
    if (dejaRegle) return;

    paymentsApi.list()
      .then((paiements) => {
        if (!monte) return;
        // La plus récente intention qui couvre cette commande.
        const trouvee = paiements.find(
          (paiement) => paiement.orders.includes(orderId),
        );
        setIntention(trouvee ?? null);
      })
      .catch(() => {
        // Silence : ne pas alarmer sur une page de commande parce qu'un
        // bandeau facultatif n'a pas pu se charger.
      })
      .finally(() => { if (monte) setChargement(false); });

    return () => { monte = false; };
  }, [orderId, dejaRegle]);

  if (dejaRegle || chargement || !intention) return null;

  const aPayer = A_PAYER.includes(intention.status);
  const enCours = EN_COURS.includes(intention.status);

  // Payée, remboursée, annulée : rien à proposer.
  if (!aPayer && !enCours) return null;

  const lien = `/checkout/payment/${intention.reference}?order=${orderId}`;

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.25rem',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      flexWrap: 'wrap',
    }}>
      <span aria-hidden="true" style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        marginTop: 7, background: enCours ? FT.amber : FT.coral,
      }} />

      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{
          fontSize: 14.5, margin: '0 0 5px',
          color: 'var(--text-primary, #1A1209)',
        }}>
          {enCours
            ? 'Un paiement est en cours'
            : 'Cette commande n’est pas encore payée'}
        </p>
        <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6, color: FT.muted }}>
          {enCours
            ? 'Si vous avez déjà composé votre code, reprenez pour vérifier '
              + 'auprès de votre opérateur.'
            : 'Reprenez le paiement pour la valider. Votre commande est '
              + 'conservée jusque-là.'}
        </p>
        {intention.status === 'FAILED' && intention.failure_reason && (
          // Le message de l'opérateur, tel quel.
          <p style={{ fontSize: 12.5, margin: '6px 0 0', color: FT.redD }}>
            {intention.failure_reason}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Money value={intention.amount_xaf} size={19} />
        <button
          type="button"
          onClick={() => navigate(lien)}
          style={{
            fontSize: 13, padding: '9px 16px', whiteSpace: 'nowrap',
            borderColor: FT.coral, color: '#993C1D',
          }}
        >
          {enCours ? 'Reprendre' : 'Payer maintenant'}
        </button>
      </div>
    </div>
  );
}