// Types du registre des connecteurs du livreur (src/api/routes.ts) : pour chaque méthode de la SourceLivreur
// (« domaine.methode »), la route du serveur qui la sert et son état. Même grammaire que l'espace vendeur
// (espace-vendeur/src/api/routes/types.ts) : lue par backend-kit/outils/generer-openapi.mts (contrat) et
// outils/connecteurs.mjs (CONNECTEURS-LIVREUR.md).
//   route  : « MÉTHODE /api/courier/chemin {corps, champ?} · MÉTHODE /api/courier/autre (Idempotency-Key) »
//   echange: « → Type ; 409 code ; 422 code » (les codes d'erreur sont lus pour le contrat)
import type { NomDomaine, SourceLivreur } from '../../donnees/source'

/**
 * branche : appel réel ; telephone : servi sur le téléphone, sans route (file hors connexion) ; demo : geste propre à
 * la démonstration ; front : à finir côté écran ; serveur : route manquante.
 */
export type EtatConnecteur = 'branche' | 'partiel' | 'telephone' | 'serveur' | 'front' | 'demo'

export interface Connecteur {
  domaine: string
  etat: EtatConnecteur
  route: string
  echange?: string
  note?: string
}

export type ConnecteursDe<D extends NomDomaine> = { [M in Extract<keyof SourceLivreur[D], string> as `${D}.${M}`]: Connecteur }
export type MethodeLivreur = { [D in NomDomaine]: `${D}.${Extract<keyof SourceLivreur[D], string>}` }[NomDomaine]

export const c = (domaine: string, etat: EtatConnecteur, route: string, echange?: string, note?: string): Connecteur => ({ domaine, etat, route, echange, note })
