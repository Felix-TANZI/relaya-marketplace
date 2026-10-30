// Domaine « moi » branché sur le kit (backend-kit/apps/livreur_session) : profil, pièces, préférences du compte,
// demande de départ (DP-66 ; DP-67 : contestation de la retenue du kit), données personnelles (code SMS d'abord).
import type { ClientApi } from '@client/api/client'
import type { DomaineMoi, EmploiVu, PreferencesCompte, Profil } from '../../donnees/domaines/moi'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineMoi(api: ClientApi): SourceLivreur['moi'] {
  const a = appels(api)
  const d: DomaineMoi = {
    profil: () => a.get<Profil>('/me'),
    emploi: () => a.get<EmploiVu>('/me/employment'),
    envoyerPiece: (id, x, origine) => a.geste(`/documents/${seg(id)}`, origine, { recto: x.recto, verso: x.verso, expireLe: x.expireLe }),
    preferences: () => a.get<PreferencesCompte>('/me/preferences'),
    reglerPreference: (p, origine, enLigne) => a.patch('/me/preferences', { ...p, enLigne, origine }, { idempotence: origine.cle }),
    demanderDepart: (x, origine) => a.geste('/company/leave', origine, { motif: x.motif, texte: x.texte }),
    annulerDepart: (origine) => a.geste('/company/leave/cancel', origine),
    contesterKit: (motif, origine) => a.geste('/company/leave/kit-contest', origine, { motif }),
    demanderCodeDonnees: () => a.post('/privacy/code'),
    demanderDonnees: (type, code, origine) => a.geste('/privacy/requests', origine, { type, code }),
  }
  return d
}
