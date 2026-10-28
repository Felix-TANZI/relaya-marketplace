// Domaine « livreurs » branché sur le kit (backend-kit/apps/entreprise_flotte) : liste, fiche, gestes sur le livreur ;
// départs, absences et nouvelle vérification de la photo (DP-66) ; constat du kit et dernier versement fait (DP-67).
import type { ClientApi } from '@client/api/client'
import type { AbsenceLivreur, DemandeDepart, DomaineLivreurs, FicheLivreur, Livreur, PieceAControler, VuePiece } from '../../donnees/domaines/livreurs'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'
import type { Resultat } from '../../donnees/communs'

export function domaineLivreurs(api: ClientApi): SourceEntreprise['livreurs'] {
  const a = appels(api, 'livreurs')
  const l = (id: string) => `/couriers/${seg(id)}`
  const d: DomaineLivreurs = {
    liste: (filtre) => a.get<Livreur[]>('/couriers', { query: { zone: filtre?.zone, statut: filtre?.statut } }),
    fiche: (id) => ouNull(a.get<FicheLivreur>(l(id))),
    suspendre: (id, motif, jusqua) => a.post(`${l(id)}/suspend`, { motif, jusqua: jusqua ?? null }),
    lever: (id, motif) => a.post(`${l(id)}/reinstate`, { motif: motif ?? null }),
    retirer: (id, motif) => a.post(`${l(id)}/remove`, { motif }),
    approuver: (id) => a.post(`${l(id)}/approve`, {}),
    modifier: (id, m) => a.patch(l(id), m),
    noter: (id, note) => a.put(`${l(id)}/note`, { note }),
    tarif: (id, montant) => a.put(`${l(id)}/rate`, { montant }),
    prevenir: (id, sujet) => a.post(`${l(id)}/notify`, { sujet }),
    joindreElements: (id, evenementId, texte) => a.post(`${l(id)}/trust/events/${seg(evenementId)}/evidence`, { texte }, { idempotence: true }),
    controles: () => a.get<PieceAControler[]>('/couriers/documents/queue'),
    voirPiece: (id, type) => a.get<Resultat<VuePiece, 'statut'>>(`${l(id)}/documents/${seg(type)}/view`),
    controlerPiece: (id, type, d) => a.post(`${l(id)}/documents/${seg(type)}/review`, d, { idempotence: true }),
    relancerPiece: (id, type) => a.post(`${l(id)}/documents/${seg(type)}/remind`, {}),
    demanderPhoto: (id, motif) => a.post(`${l(id)}/documents/selfie/reverify`, { motif }),
    departs: () => a.get<DemandeDepart[]>('/couriers/departures'),
    constaterKit: (id, c) => a.post(`${l(id)}/departure/kit`, c),
    versementFait: (id) => a.post(`${l(id)}/departure/paid`, {}, { idempotence: true }),
    cloturerDepart: (id) => a.post(`${l(id)}/departure/close`, {}, { idempotence: true }),
    absences: () => a.get<AbsenceLivreur[]>('/couriers/absences'),
    absenceVue: (absenceId) => a.post(`/couriers/absences/${seg(absenceId)}/seen`, {}),
  }
  return d
}
