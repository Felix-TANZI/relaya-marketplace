// Types du registre des connecteurs de la console (src/api/routes.ts) : pour chaque méthode de la SourceAdmin
// (« domaine.methode »), la route du kit qui la sert et son état. Même grammaire que l'entreprise
// (espace-entreprise/src/api/routes/types.ts) :
//   route : « MÉTHODE /api/console/chemin {corps} · MÉTHODE /api/console/autre (Idempotency-Key) »
//   echange : « → Type ; 409 code ; 422 code »
import type { NomDomaine, SourceAdmin } from '../../donnees/source'

/**
 * branche : appel réel, forme complète ; partiel : appel réel, certains champs vides (listés dans la note et dans
 * backend-kit/apps/console/donnees/contrat-admin.md) ; serveur : pas de route au kit (NonBranche) ; demo : geste propre
 * à la démonstration (NonDisponible).
 */
export type EtatConnecteur = 'branche' | 'partiel' | 'serveur' | 'demo'

export interface Connecteur {
  domaine: string
  etat: EtatConnecteur
  route: string
  echange?: string
  note?: string
}

export type ConnecteursDe<D extends NomDomaine> = { [M in Extract<keyof SourceAdmin[D], string> as `${D}.${M}`]: Connecteur }
export type MethodeAdmin = { [D in NomDomaine]: `${D}.${Extract<keyof SourceAdmin[D], string>}` }[NomDomaine]

export const c = (domaine: string, etat: EtatConnecteur, route: string, echange?: string, note?: string): Connecteur => ({ domaine, etat, route, echange, note })
