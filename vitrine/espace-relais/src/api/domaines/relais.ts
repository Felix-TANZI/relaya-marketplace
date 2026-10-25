// Domaine « mon relais » branché sur le kit (relais_compte, relais_core/compte.py) : fiche, demandes de places et
// d'horaires (contractuel : BelivaY décide), équipe (code SMS du gérant, droits, PIN), formation (quiz corrigé au
// serveur), paramètres, appareils, documents, convention, fiche publique, PIN, données personnelles, fin, photo.
// « simulerAccord » est un geste de la console BelivaY : propre à la démonstration.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { ContenuModule, Contrat, DomaineRelais, FicheRelais } from '../../donnees/domaines/relais'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg, urlMedia } from '../outils'

export function domaineRelais(api: ClientApi): SourceRelais['relais'] {
  const a = appels(api)
  type R<K extends keyof DomaineRelais> = Awaited<ReturnType<DomaineRelais[K]>>
  const d: DomaineRelais = {
    async relais() {
      const f = await a.get<FicheRelais>('/me/profile')
      return { ...f, equipe: f.equipe.map((m) => ({ ...m, photo: urlMedia(m.photo) })) }
    },
    demanderCapacite: (placesDeclarees, o) => a.geste<R<'demanderCapacite'>>('/capacity/requests', o, { placesDeclarees }),
    annulerDemandeCapacite: (o) => a.supprimer<R<'annulerDemandeCapacite'>>('/capacity/requests/current', o),
    demanderHoraires: (semaine, o) => a.geste<R<'demanderHoraires'>>('/hours/requests', o, { semaine }),
    annulerDemandeHoraires: (o) => a.supprimer<R<'annulerDemandeHoraires'>>('/hours/requests/current', o),
    demanderCodeEquipe: (o) => a.geste<R<'demanderCodeEquipe'>>('/members/otp', o),
    ajouterEmploye: (e, codeSms, o) => a.geste<R<'ajouterEmploye'>>('/members', o, { ...e, codeSms }),
    retirerEmploye: (id, codeSms, o) => a.supprimer<R<'retirerEmploye'>>(`/members/${seg(id)}`, o, { codeSms }),
    reglerDroits: (id, droits, o) => a.put<R<'reglerDroits'>>(`/members/${seg(id)}/rights`, { droits, origine: o }),
    reinitialiserPin: (id, o) => a.geste<R<'reinitialiserPin'>>(`/members/${seg(id)}/pin-reset`, o),
    module: (id) => ouNull(a.get<ContenuModule>(`/training/${seg(id)}`)),
    repondreQuiz: (membre, module, reponses, o) => a.geste<R<'repondreQuiz'>>(`/training/${seg(module)}/quiz`, o, { membre, reponses }),
    reglerParametres: (p, o) => a.put<R<'reglerParametres'>>('/settings', { ...p, origine: o }),
    deconnecterAppareil: (id) => a.supprimer<R<'deconnecterAppareil'>>(`/account/devices/${seg(id)}`),
    envoyerDocument: (type, photo, o) => a.geste<R<'envoyerDocument'>>(`/documents/${seg(type)}`, o, { photo }),
    contrat: () => a.get<Contrat>('/agreement'),
    demanderModificationFiche: (f, o) => a.geste<R<'demanderModificationFiche'>>('/profile/requests', o, { ...f }),
    changerPin: (ancien, nouveau, o) => a.geste<R<'changerPin'>>('/auth/pin/change', o, { ancien, nouveau }),
    demanderDonnees: (o) => a.geste<R<'demanderDonnees'>>('/account/data-requests', o),
    demanderFin: (motif, o) => a.geste<R<'demanderFin'>>('/account/closure', o, { motif }),
    async annulerFin(o) {
      // Même route que acces.annulerFin : le serveur dit « aucune » ; cet écran attend « aucune_demande ».
      const r = await a.supprimer<{ ok: true } | { ok: false; raison: string }>('/account/closure', o)
      if (r.ok) return r
      return { ok: false, raison: r.raison === 'aucune' ? 'aucune_demande' : (r.raison as R<'annulerFin'> extends { raison: infer X } ? X : never) }
    },
    changerPhoto: (photo, o) => a.geste<R<'changerPhoto'>>('/me/avatar', o, { photo }),
    simulerAccord: () => Promise.reject(new NonDisponible('relais.simulerAccord', 'démonstration seulement (console BelivaY)')),
  }
  return d
}
