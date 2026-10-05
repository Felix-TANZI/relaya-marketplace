// Domaine « Paiement » (CL-08 ; CAL-11, CAL-13, CAP-03, CAP-24 ; PAY-TVAL).
// Routes du kit : backend-kit/apps/cart (POST /api/checkout : prix recontrôlés, 409 price_changed ; carte : frais de
// service et plafond, 422 over_cap ; comptoir ; montants figés), réponses CommandePassee du site.
//
// Idempotence (CAP-03) : une clé par intention. Le même paiement relancé après une coupure (réseau, délai, 5xx :
// on ne sait pas si le serveur l'a reçu) repart avec la MÊME clé : le serveur rejoue sa réponse, jamais de second
// débit. Une réponse nette (succès ou refus) libère la clé : un nouvel essai est une nouvelle intention.
import type { CommandePassee, MoyenCommande } from '../../donnees/source'
import { cleIdempotence, type ClientApi } from '../client'
import { ErreurApi, ErreurIntrouvable } from '../erreurs'
import { seg } from './refus'

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

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function domainePaiement(api: ClientApi) {
  const recu = (ref: string) => api.get<CommandePassee>(`/orders/${seg(ref)}/receipt`)

  return {
    // POST /api/checkout {mode, moyen, comptoir, numero, livraison, frais, prime} (Idempotency-Key) → CommandePassee ;
    // 409 price_changed (l'écran « Un prix a changé »), 422 over_cap.
    passerCommande: async (c: { mode: 'relais' | 'domicile'; moyen: MoyenCommande; comptoir: boolean; numero: string | null; livraison: number; frais: number; prime?: number }) => {
      const corps = { mode: c.mode, moyen: c.moyen, comptoir: c.comptoir, numero: c.numero, livraison: c.livraison, frais: c.frais, prime: c.prime ?? 0 }
      return avecIntention('commande', corps, (cle) => api.post<CommandePassee>('/checkout', corps, { idempotence: cle }))
    },
    // GET /api/orders/{id}/receipt → CommandePassee ; 404 → null
    commandePassee: async (ref: string) => {
      try {
        return { lu: Date.now(), ...(await recu(ref)) }
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },
    // GET /api/me/pending-payments → demandes Mobile Money pas encore validées
    paiementsEnAttente: async () => api.get<CommandePassee[]>('/me/pending-payments'),
    // « J'ai validé » : le serveur seul confirme (webhook de l'agrégateur). Sondage du reçu, 3 s puis 10 s, jusqu'à
    // ce que la demande ne soit plus « attente » ou qu'elle expire ; rend le reçu tel quel (payée ou échec).
    confirmerPaiement: async (ref: string) => {
      let c = await recu(ref)
      for (let n = 0; c.etat === 'attente' && Date.now() < (c.expire ?? 0) + 5_000; n++) {
        await attendre(n < 5 ? 3_000 : 10_000)
        c = await recu(ref)
      }
      return c
    },
    // L'écran déclare l'échec (délai écoulé, solde insuffisant) : la demande est abandonnée côté serveur, rien n'est
    // débité, les articles reviennent au panier. POST /api/payments/{id}/abandon {cause} → 204
    echouerPaiement: async (ref: string, cause: 'expire' | 'solde' | 'carte') => {
      await api.post(`/payments/${seg(ref)}/abandon`, { cause })
    },
    // POST /api/payments/{id}/resend {numero?} (Idempotency-Key) → CommandePassee (nouvelle demande, délai reparti)
    relancerPaiement: async (ref: string) =>
      avecIntention('relance', ref, (cle) => api.post<CommandePassee>(`/payments/${seg(ref)}/resend`, {}, { idempotence: cle })),
    // POST /api/payments/{id}/cancel → 204 (rien n'est débité, le panier reste)
    annulerPaiement: async (ref: string) => {
      await api.post(`/payments/${seg(ref)}/cancel`)
    },
    // POST /api/orders/{id}/counter-payment (Idempotency-Key) → 204 : demande Mobile Money du montant dû au retrait
    payerAuComptoir: async (ref: string) => {
      await avecIntention('comptoir', ref, (cle) => api.post(`/orders/${seg(ref)}/counter-payment`, {}, { idempotence: cle }))
    },
  }
}
