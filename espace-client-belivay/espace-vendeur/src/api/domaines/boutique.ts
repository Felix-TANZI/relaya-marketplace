// Domaine « boutique » branché sur le kit (backend-kit/apps/vendeur_boutique) : identité interne et aperçu client,
// « Fermer aujourd'hui » (Préparation : fermer, et rouvrir le jour même), horaires, pause, fermetures programmées,
// emplacement (au-delà de 200 m : nouvelle vérification), repère, vitrine interne, avis anonymes et réponse privée par
// le support. Refus métier : 200 { ok: false, raison } rendu tel quel ; 403 owner_only → ReserveAuProprietaire.
import type { ClientApi } from '@client/api/client'
import type { Boutique, DemandeModification, DomaineBoutique, Lieu, Lieux, ResumeAvis } from '../../donnees/domaines/boutique'
import type { Resultat } from '../../donnees/communs'
import type { SourceVendeur } from '../../donnees/source'
import { appels, seg } from '../outils'

type AvecBoutique<R extends string> = Resultat<{ boutique: Boutique }, R>

export function domaineBoutique(api: ClientApi): SourceVendeur['boutique'] {
  const a = appels(api, 'boutique')
  const d: DomaineBoutique = {
    boutique: () => a.get<Boutique>('/shop'),
    fermerAujourdhui: (fermee) => a.post<Boutique>('/shop/closed-today', { fermee }),
    changerHoraires: (horaires) => a.put<AvecBoutique<'ordre'>>('/shop/hours', { horaires }),
    mettreEnPause: (jours) => a.post<AvecBoutique<'duree'>>('/shop/pause', { jours }),
    reprendre: () => a.post<Boutique>('/shop/resume', {}),
    programmerFermeture: (du, au, motif) =>
      a.post<AvecBoutique<'preavis_48h' | 'dates' | 'chevauche'>>('/shop/closures', { du, au, motif }, { idempotence: true }),
    ecourterFermeture: (id, au) => a.patch<AvecBoutique<'dates'>>(`/shop/closures/${seg(id)}`, { au }),
    annulerFermeture: (id) => a.supprimer<Boutique>(`/shop/closures/${seg(id)}`),
    replacer: (position) =>
      a.put<Resultat<{ boutique: Boutique; nouvelleVerification: boolean; metres: number; a: number }>>('/shop/location', { lat: position.lat, lon: position.lon }),
    changerRepere: (repere) => a.put<AvecBoutique<'vide' | 'long'>>('/shop/landmark', { repere }),
    modifierVitrine: (champs) => a.patch<AvecBoutique<'long'>>('/shop/showcase', champs),
    lieux: () => a.get<Lieux>('/shop/locations'),
    ajouterLieu: (lieu) => a.post<Resultat<{ lieu: Lieu }, 'plein' | 'nom' | 'repere' | 'position' | 'hors_zone' | 'ordre'>>('/shop/locations', lieu, { idempotence: true }),
    modifierLieu: (id, champs) => a.patch<Resultat<{ lieu: Lieu }, 'nom' | 'repere' | 'ordre' | 'introuvable'>>(`/shop/locations/${seg(id)}`, champs),
    replacerLieu: (id, p) => a.put<Resultat<{ lieu: Lieu; nouvelleVerification: boolean; metres: number }, 'introuvable'>>(`/shop/locations/${seg(id)}/point`, { lat: p.lat, lon: p.lon }),
    demanderCodePrincipal: () => a.post<{ masque: string }>('/shop/locations/principal-code', {}),
    rendrePrincipal: (id, code) => a.post<Resultat<{ lieux: Lieux }, 'code' | 'a_verifier' | 'introuvable'>>(`/shop/locations/${seg(id)}/principal`, { code }),
    retirerLieu: (id) => a.supprimer<Resultat<{ lieux: Lieux }, 'principal' | 'introuvable'>>(`/shop/locations/${seg(id)}`),
    demandes: () => a.get<DemandeModification[]>('/shop/change-requests'),
    demanderCodeModification: () => a.post<{ masque: string }>('/shop/change-requests/code', {}),
    demanderModification: (d, code) =>
      a.post<Resultat<{ demande: DemandeModification }, 'code' | 'valeur' | 'motif' | 'pieces' | 'deja' | 'rccm' | 'niu'>>('/shop/change-requests', { ...d, code }, { idempotence: true }),
    annulerDemande: (id) => a.supprimer<Resultat<{ demande: DemandeModification }, 'introuvable' | 'etat'>>(`/shop/change-requests/${seg(id)}`),
    avis: () => a.get<ResumeAvis>('/reviews'),
    repondreAvis: (id, texte) =>
      a.post<Resultat<{ fil: string }, 'trop_court' | 'delai_depasse' | 'deja_repondu' | 'coordonnees'>>(`/reviews/${seg(id)}/private-reply`, { texte }, { idempotence: true }),
  }
  return d
}
