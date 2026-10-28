// Types du registre des connecteurs vendeur (src/api/routes.ts) : pour chaque méthode de la SourceVendeur
// (« domaine.methode »), la route du serveur qui la sert et son état. Même grammaire que le client
// (site/src/api/routes.ts) : lue par backend-kit/outils/generer-openapi.mts (contrat), outils/connecteurs.mjs
// (CONNECTEURS-VENDEUR.md) et tests/connecteurs.spec.ts.
//   route  : « MÉTHODE /api/vendors/chemin {corps, champ?} · MÉTHODE /api/vendors/autre (Idempotency-Key) »
//   echange: « → Type ; 409 code ; 422 code » (les codes d'erreur sont lus pour le contrat)
import type { NomDomaine, SourceVendeur } from '../../donnees/source'

/** branche : appel réel ; partiel : branché, un champ attend un fournisseur externe (justifié dans la note) ; appareil :
 *  calculé sur l'appareil avec la même règle que le serveur (sans appel) ; demo : geste propre à la démonstration (une
 *  autre interface le fait) ; front : à finir côté site ; serveur : route manquante. */
export type EtatConnecteur = 'branche' | 'partiel' | 'appareil' | 'serveur' | 'front' | 'demo'

export interface Connecteur {
  domaine: string
  etat: EtatConnecteur
  route: string
  echange?: string
  note?: string
}

/** Clés « domaine.methode » d'un domaine. */
export type ConnecteursDe<D extends NomDomaine> = { [M in Extract<keyof SourceVendeur[D], string> as `${D}.${M}`]: Connecteur }

export type MethodeVendeur = { [D in NomDomaine]: `${D}.${Extract<keyof SourceVendeur[D], string>}` }[NomDomaine]

export const c = (domaine: string, etat: EtatConnecteur, route: string, echange?: string, note?: string): Connecteur => ({ domaine, etat, route, echange, note })
