// Types du registre des connecteurs de l'entreprise (src/api/routes.ts) : pour chaque méthode de la SourceEntreprise
// (« domaine.methode »), la route du serveur qui la sert et son état. Même grammaire que l'espace vendeur
// (espace-vendeur/src/api/routes/types.ts) : lue par backend-kit/outils/generer-openapi.mts (contrat) et
// outils/connecteurs.mjs (CONNECTEURS-ENTREPRISE.md).
//   route  : « MÉTHODE /api/company/chemin {corps, champ?} · MÉTHODE /api/company/autre (Idempotency-Key) »
//   echange: « → Type ; 409 code ; 422 code » (les codes d'erreur sont lus pour le contrat)
import type { NomDomaine, SourceEntreprise } from '../../donnees/source'

/** branche : appel réel ; demo : geste propre à la démonstration ; front : à finir côté écran ; serveur : route manquante. */
export type EtatConnecteur = 'branche' | 'partiel' | 'serveur' | 'front' | 'demo'

export interface Connecteur {
  domaine: string
  etat: EtatConnecteur
  route: string
  echange?: string
  note?: string
}

export type ConnecteursDe<D extends NomDomaine> = { [M in Extract<keyof SourceEntreprise[D], string> as `${D}.${M}`]: Connecteur }
export type MethodeEntreprise = { [D in NomDomaine]: `${D}.${Extract<keyof SourceEntreprise[D], string>}` }[NomDomaine]

export const c = (domaine: string, etat: EtatConnecteur, route: string, echange?: string, note?: string): Connecteur => ({ domaine, etat, route, echange, note })
