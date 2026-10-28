// Domaine « aide » branché sur le kit (backend-kit/apps/vendeur_boutique) : questions fréquentes (montants calculés par
// le serveur ; sans l'argent pour l'accès Préparation), produits interdits, coordonnées officielles, conseil.
import type { ClientApi } from '@client/api/client'
import type { ContactsAide, DomaineAide, QuestionAide } from '../../donnees/domaines/aide'
import type { SourceVendeur } from '../../donnees/source'
import { appels } from '../outils'

export function domaineAide(api: ClientApi): SourceVendeur['aide'] {
  const a = appels(api, 'aide')
  const d: DomaineAide = {
    questions: (recherche) => a.get<QuestionAide[]>('/help/questions', { query: { q: recherche?.trim() || undefined } }),
    produitsInterdits: () => a.get<string[]>('/help/forbidden-products'),
    contacts: () => a.get<ContactsAide>('/help/contacts'),
    conseil: () => a.get<{ titre: string; texte: string; publieLe: string }>('/help/tip'),
  }
  return d
}
