// Domaine « argent » branché sur le kit (backend-kit/apps/vendeur_argent) : où est l'argent (cinq états du moteur
// argent_vendeur, gardé figé au paiement), se libère, gelé, gains d'un mois, documents. Propriétaire seulement :
// 403 owner_only → ReserveAuProprietaire. Chaque lecture exécute d'abord l'arrêté du jeudi (versements du vendredi).
// Réponses au format de src/donnees/domaines/argent.ts, rendues telles quelles.
import type { ClientApi } from '@client/api/client'
import type { ContenuDocument, Documents, DomaineArgent, Gains, Gele, ResumeArgent, SeLibere } from '../../donnees/domaines/argent'
import type { SourceVendeur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineArgent(api: ClientApi): SourceVendeur['argent'] {
  const a = appels(api, 'argent')
  const d: DomaineArgent = {
    resume: () => a.get<ResumeArgent>('/money/summary'),
    seLibere: () => a.get<SeLibere>('/money/releasing'),
    gele: () => a.get<Gele>('/money/frozen'),
    gains: (mois) => a.get<Gains>('/money/earnings', { query: { month: mois } }),
    documents: () => a.get<Documents>('/documents'),
    // GET /documents/{type}/{period} (chemin, pas requête) : le serveur attend un segment de
    // période même pour 'contrat' (sans période propre) — 'actuel' par convention.
    document: (doc) => a.get<ContenuDocument>(`/documents/${seg(doc.type)}/${seg('periode' in doc ? doc.periode : 'actuel')}`),
  }
  return d
}
