// DONNÉES DE DÉMONSTRATION — réglages de livraison de la boutique (page Livraison et colis, AJ-A) : défauts appliqués à
// chaque nouvelle offre (src/demo/offres.ts, commencer et demanderFiche), créneaux de ramassage et relais préférés.
// Module à part, sans dépendance vers les autres démonstrations : src/demo/offres.ts le lit sans boucle d'imports.
import type { ClasseColis } from '../../../donnees/communs'
import { PARAMETRES } from '../../../calculs/registre'
import { magasin } from '../../../demo/stockage'

export interface EtatLivraison {
  defauts: { colis: ClasseColis; delaiH: number; paiementAuRetrait: boolean }
  creneaux: string[] // créneaux de ramassage préférés (identifiants)
  relais: string[] // relais préférés pour les retours et les dépôts
}

export const etatLivraison = magasin<EtatLivraison>('aja_livraison', () => ({
  // Défauts du paquet : délai habituel (VD-PREPARATION-DELAIS), paiement au comptoir accepté (OFR-02), petit colis.
  defauts: { colis: 'S', delaiH: PARAMETRES.console.preparation.defautH, paiementAuRetrait: true },
  creneaux: ['lv-14', 'sa-11'],
  relais: ['r-mvog-ada'],
}))

/** Défauts d'une nouvelle offre (Livraison et colis) : délai de préparation, paiement au retrait, colis sans fiche. */
export function defautsLivraison(): EtatLivraison['defauts'] {
  try {
    return etatLivraison.lire().defauts
  } catch {
    return { colis: 'S', delaiH: PARAMETRES.console.preparation.defautH, paiementAuRetrait: true }
  }
}
