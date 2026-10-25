// Domaine « contrat » branché sur le kit (backend-kit/apps/entreprise_session) : versions, pièces, fiche, activation,
// demande de révision de la grille. Signer, envoyer une pièce, modifier la fiche : propriétaire (403 → AccesRefuse).
import type { ClientApi } from '@client/api/client'
import type { DomaineContrat, EtapeActivation, FicheEntreprise, Piece, VersionContrat } from '../../donnees/domaines/contrat'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineContrat(api: ClientApi): SourceEntreprise['contrat'] {
  const a = appels(api, 'contrat')
  const d: DomaineContrat = {
    contrat: () => a.get<{ versions: VersionContrat[]; pieces: Piece[] }>('/contract'),
    accepter: (versionId) => a.post(`/contract/${seg(versionId)}/accept`, {}, { idempotence: true }),
    fiche: () => a.get<FicheEntreprise>('/profile'),
    modifierFiche: (champs) => a.patch('/profile', champs),
    envoyerPiece: (type, f) => a.post(`/compliance/pieces/${seg(type)}`, { nom: f.nom, taille: f.taille, type: f.type, lisible: f.lisible }, { idempotence: true }),
    activation: () => a.get<EtapeActivation[]>('/compliance/activation'),
  }
  return d
}
