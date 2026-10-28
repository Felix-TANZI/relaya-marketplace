// Domaine « commandes » branché sur le kit : liste et fiche (montants figés au paiement, jamais recalculés ici),
// démasquage motivé et journalisé du téléphone du client.
import type { ClientApi } from '@client/api/client'
import type { CommandeCourte, CommandeFiche, DomaineCommandes } from '../../donnees/domaines/commandes'
import { appels, codeRefus, decision, ouNull, seg, type Appels } from '../outils'

/** POST /console/vues/demasquer : la valeur une fois, journalisée ; motif vide → motif_court. */
export async function demasquer(a: Appels, genre: 'commande' | 'client' | 'vendeur', id: string, champ: string, motif: string): Promise<{ ok: true; valeur: string } | { ok: false; raison: 'motif_court' }> {
  try {
    const r = await a.post<{ valeur: string }>('/vues/demasquer', { genre, id, champ, motif })
    return { ok: true, valeur: r.valeur }
  } catch (x) {
    if (codeRefus(x) === 'motif_court') return { ok: false, raison: 'motif_court' }
    throw x // 404 : rien à démasquer ; 403 : AccesRefuse
  }
}

export function domaineCommandes(api: ClientApi): DomaineCommandes {
  const a = appels(api, 'commandes')
  return {
    liste: () => a.get<CommandeCourte[]>('/vues/commandes'),
    commande: (ref) => ouNull(a.get<CommandeFiche>(`/vues/commandes/${seg(ref)}`)),
    demasquer: (ref, champ, motif) => demasquer(a, 'commande', ref, champ, motif),
    async annuler(ref, motif) {
      const r = await decision(a, 'commande-annuler', { commande: ref }, motif, [`Commande ${ref}`], (c) => (c === 'motif_court' ? 'motif_court' : 'non_annulable'))
      return r.ok ? { ok: true, etat: r.etat, id: r.id } : r
    },
  }
}
