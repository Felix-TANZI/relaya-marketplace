// Domaine « Paiement » (CL-08 ; CAL-11, CAL-13, CAP-03, CAP-24 ; PAY-TVAL).
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026, contre backend/ réel) : il n'y a pas de /api/checkout ni de /api/payments/{id}/*
// (abandon, resend, cancel) — ces routes viennent du kit (backend-kit), jamais installé pour ce domaine. Le vrai
// moteur financier (apps.payments : PaymentIntent, EscrowHold, SettlementBatch — construit cette session, PAS une
// approximation) expose, lui :
//   POST /api/orders/                                        (apps.orders) crée la commande ET l'intention de
//                                                             paiement en une fois (apps.payments.bridge.checkout_v2.
//                                                             prepare_payment, appelé automatiquement) ; la réponse
//                                                             contient payment_intent: {reference, amount_xaf, status}.
//   POST /api/payments/v2/me/payments/{reference}/pay/       déclenche la collecte Mobile Money (idempotent : une
//                                                             demande déjà en cours est réutilisée, pas dupliquée).
//   POST /api/payments/v2/me/payments/{reference}/check/     interroge le prestataire (PAS un GET : le kit supposait
//                                                             un sondage du reçu, relaya expose un sondage actif).
//   GET  /api/payments/v2/me/payments/                       liste des intentions de l'acheteur (avec leurs
//                                                             commandes liées, BuyerIntentSerializer.orders).
//   GET  /api/payments/v2/me/payments/{reference}/           détail d'une intention.
// Remboursement au moyen d'origine (demandé dans le titre de la branche) : DÉJÀ géré par le moteur de règlement
// (apps.payments.intents.models.PaymentIntent.RefundTarget.ORIGINAL_SOURCE, exposé en lecture par
// GET /api/payments/v2/me/refunds/, domaine « Portefeuille »). Rien à construire ici — ne pas dupliquer cette
// logique côté site.
// Frais Mobile Money : PlatformSettings.mobile_money_fee_percent existe déjà côté serveur (1,50 % par défaut,
// réglable en admin) et doit être le SEUL calcul qui compte — voir le rapport de session pour le conflit avec le
// taux de 2 % câblé en dur dans src/donnees/frais.ts (FRAIS_PAIEMENT), affiché sur une douzaine d'écrans. Ni l'un
// ni l'autre n'est corrigé ici : décision produit à trancher avant de brancher un vrai montant de frais.
//
// Les routes de commande n'ont pas de référence de paiement dédiée à part la `reference` du PaymentIntent, que
// seule la réponse de création (POST /api/orders/) donne explicitement : une fois la page quittée, on la retrouve
// en listant les intentions de l'acheteur et en filtrant par commande (BuyerIntentSerializer.orders).
import type { CommandePassee, MoyenCommande } from '../../donnees/source'
import { cleIdempotence, type ClientApi } from '../client'
import { ErreurApi, NonDisponible } from '../erreurs'
import { idCommande } from '../adaptateurs'

const intentions = new Map<string, string>()
const incertaine = (e: unknown) => e instanceof ErreurApi && (e.genre === 'reseau' || e.genre === 'delai' || e.genre === 'serveur')

/** Exécute `appel` avec la clé de cette intention (même nom + même corps = même clé tant que l'issue est incertaine). */
export async function avecIntention<T>(nom: string, corps: unknown, appel: (cle: string) => Promise<T>): Promise<T> {
  const k = `${nom}:${JSON.stringify(corps ?? null)}`
  let cle = intentions.get(k)
  if (!cle) {
    cle = `${nom}-${cleIdempotence()}`
    intentions.set(k, cle)
  }
  try {
    const r = await appel(cle)
    intentions.delete(k)
    return r
  } catch (e) {
    if (!incertaine(e)) intentions.delete(k)
    throw e
  }
}

interface RTentative {
  status: string
  external_reference: string
  created_at: string
}
interface RIntention {
  reference: string
  status: 'DRAFT' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
  amount_xaf: number
  amount_captured_xaf: number
  payer_operator: string
  payer_msisdn_masked: string | null
  expires_at: string | null
  orders: { id: number }[]
  attempts: RTentative[]
}

const etatIntention = (s: RIntention['status']): CommandePassee['etat'] =>
  s === 'SUCCEEDED' || s === 'PARTIALLY_REFUNDED' || s === 'REFUNDED' ? 'payee' : s === 'FAILED' || s === 'EXPIRED' || s === 'CANCELLED' ? 'echec' : 'attente'

const moyenIntention = (p: string): MoyenCommande => (p === 'ORANGE' ? 'orange' : p === 'MTN' ? 'mtn' : 'autre')

export function domainePaiement(api: ClientApi) {
  // GET /api/payments/v2/me/payments/ : liste ou page DRF selon la pagination (CAP-05 non tranché, section 2).
  const mesIntentions = async (): Promise<RIntention[]> => {
    const r = await api.get<{ results: RIntention[] } | RIntention[]>('/payments/v2/me/payments/')
    return Array.isArray(r) ? r : r.results
  }

  // La commande ne porte pas la référence de paiement après coup (OrderDetailSerializer ne l'expose pas) : on la
  // retrouve en listant les intentions de l'acheteur et en cherchant celle liée à cette commande (BuyerIntentSerializer.orders).
  const intentionDeCommande = async (ref: string): Promise<RIntention | null> => {
    const id = idCommande(ref)
    const mine = await mesIntentions()
    return mine.find((i) => i.orders.some((o) => o.id === id)) ?? null
  }

  const versCommandePassee = (ref: string, i: RIntention): CommandePassee => ({
    ref,
    le: i.attempts[0] ? Date.parse(i.attempts[0].created_at) || Date.now() : Date.now(),
    mode: 'relais',
    lieu: '',
    moyen: moyenIntention(i.payer_operator),
    numero: i.payer_msisdn_masked,
    comptoir: false,
    articles: 0,
    colis: 0,
    sousTotal: i.amount_xaf,
    livraison: 0,
    frais: 0, // non résolu : voir la note de ce fichier (frais Mobile Money centralisés côté serveur, taux à trancher)
    montant: i.amount_captured_xaf || i.amount_xaf,
    dueAuRetrait: 0,
    etat: etatIntention(i.status),
    expire: i.expires_at ? Date.parse(i.expires_at) : 0,
    lignes: [],
  })

  return {
    // Signature incompatible avec le vrai serveur : POST /api/orders/ exige cart_items + adresse/ville/téléphone
    // (OrderCreateSerializer), que Source.passerCommande (mode, moyen, comptoir, numero, livraison, frais, prime)
    // ne transporte pas — il suppose un panier déjà posé côté serveur (apps.cart, absent : voir domaines/panier.ts).
    // Non résolu ici : changer la signature de Source.passerCommande est un choix d'architecture partagé par tout
    // le site, pas une extension mécanique d'un seul domaine.
    passerCommande: async (): Promise<CommandePassee> => {
      throw new NonDisponible('passerCommande', 'POST /api/orders/ {cart_items, city, district, address, customer_phone, ...} (forme différente : voir la note de ce fichier)')
    },

    // GET /api/orders/{id}/ + GET /api/payments/v2/me/payments/ (reconstitution : pas de reçu dédié côté serveur).
    commandePassee: async (ref: string): Promise<CommandePassee | null> => {
      const i = await intentionDeCommande(ref)
      return i ? versCommandePassee(ref, i) : null
    },

    // GET /api/payments/v2/me/payments/ → les intentions non terminées de l'acheteur (pas de route dédiée « en attente »).
    paiementsEnAttente: async (): Promise<CommandePassee[]> => {
      const mine = await mesIntentions()
      return mine
        .filter((i) => etatIntention(i.status) === 'attente')
        .map((i) => versCommandePassee(i.orders[0] ? `BLV-${i.orders[0].id}` : i.reference, i))
    },

    // POST /api/payments/v2/me/payments/{reference}/check/ (pas un GET : interroge activement le prestataire).
    confirmerPaiement: async (ref: string): Promise<CommandePassee> => {
      const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
      const premiere = await intentionDeCommande(ref)
      if (!premiere) throw new NonDisponible('confirmerPaiement', `aucune intention de paiement trouvée pour ${ref}`)
      let intention: RIntention = premiere
      for (let n = 0; etatIntention(intention.status) === 'attente' && n < 6; n++) {
        await attendre(n < 3 ? 3_000 : 10_000)
        const r = await api.post<{ payment: RIntention }>(`/payments/v2/me/payments/${encodeURIComponent(intention.reference)}/check/`)
        intention = r.payment
      }
      return versCommandePassee(ref, intention)
    },

    // Aucune route d'abandon côté serveur (pas de /api/payments/{id}/abandon) : une intention expire ou échoue
    // d'elle-même (webhook Campay), elle ne se déclare pas « échouée » depuis l'écran.
    echouerPaiement: async (): Promise<void> => {
      throw new NonDisponible('echouerPaiement', 'POST /api/payments/{id}/abandon (inexistant)')
    },

    // POST /api/payments/v2/me/payments/{reference}/pay/ {payer_msisdn} : la vue dit elle-même qu'une nouvelle
    // demande avec un numéro différent AVANT émission remplace la précédente — mapping réel, pas inventé.
    relancerPaiement: async (ref: string): Promise<CommandePassee> => {
      const i = await intentionDeCommande(ref)
      if (!i) throw new NonDisponible('relancerPaiement', `aucune intention de paiement trouvée pour ${ref}`)
      return avecIntention('relance', ref, async () => {
        const r = await api.post<{ payment: RIntention }>(`/payments/v2/me/payments/${encodeURIComponent(i.reference)}/pay/`, {})
        return versCommandePassee(ref, r.payment ?? i)
      })
    },

    // Aucune route d'annulation d'intention côté serveur.
    annulerPaiement: async (): Promise<void> => {
      throw new NonDisponible('annulerPaiement', 'POST /api/payments/{id}/cancel (inexistant)')
    },

    // Aucune route de paiement du solde au comptoir côté serveur (pas de /api/orders/{id}/counter-payment).
    payerAuComptoir: async (): Promise<void> => {
      throw new NonDisponible('payerAuComptoir', 'POST /api/orders/{id}/counter-payment (inexistant)')
    },
  }
}
