// Droits d'accès du point relais (PR-02 « Droits d'accès », DRO-01 à DRO-05 ; ARL-06) DÉCLARÉS par route et par geste.
// Le PROPRIÉTAIRE (gérant) a tous les droits ; l'EMPLOYÉ de comptoir, ceux que le gérant lui donne (moindre
// privilège) : il reçoit, remet (encaisse la garde en espèces), fait partir, constate ; il peut déclarer une fermeture
// imprévue du jour si le gérant le lui permet ; il ne voit pas l'argent du relais et ne gère pas le relais (capacité,
// horaires, fermetures programmées, équipe, documents, paramètres, numéro de versement). Le serveur refait chaque
// contrôle : cacher un bouton n'est jamais la seule barrière.
// Une route sans entrée est ouverte à tout membre connecté. Une route refusée mène à « Accès réservé au gérant ».
import type { Droit, Membre } from '../donnees/domaines/session'
import { useSession } from '../session'

/** Droits demandés pour OUVRIR une route : l'un d'eux suffit. */
export const DROITS_ROUTE: Record<string, Droit[]> = {
  reception: ['recevoir'],
  camera: ['recevoir', 'remettre', 'faire_partir'],
  retrait: ['remettre'],
  'pin-remise': ['remettre'],
  departs: ['faire_partir'],
  litiges: ['remettre'],
  'dossier-litige': ['remettre'],
  historique: ['historique'],
  fermeture: ['capacite', 'fermeture_jour'],
  versements: ['argent'],
  'changer-momo': ['argent'],
  rapports: ['argent'],
  releve: ['argent'],
  trust: ['argent'],
  'trust-journal': ['argent'],
  avis: ['argent'],
  paliers: ['argent'],
  capacite: ['capacite'],
  equipe: ['equipe'],
  documents: ['parametres'],
  activation: ['parametres'],
}

/** Gestes déclarés : droit demandé pour chacun (les écrans les vérifient par usePeut, le serveur les refait). */
export const DROITS_GESTE = {
  recevoirLot: 'recevoir',
  /** Changer un colis d'emplacement (fiche colis, inventaire) : celui qui range les lots (PR-06). */
  deplacerColis: 'recevoir',
  refuserColis: 'recevoir',
  remettreColis: 'remettre',
  encaisserGarde: 'remettre',
  deposerRetour: 'remettre',
  ouvrirConstat: 'remettre',
  faireSortir: 'faire_partir',
  fermetureDuJour: 'fermeture_jour',
  fermetureProgrammee: 'capacite',
  modifierCapacite: 'capacite',
  modifierHoraires: 'capacite',
  voirMontantsRemuneration: 'argent',
  changerNumeroVersement: 'argent',
  gererEquipe: 'equipe',
  modifierParametres: 'parametres',
  envoyerDocument: 'parametres',
  cloturerCompte: 'parametres',
  /** Export CSV de l'historique : gérant seul, il porte des montants (ARL-97). */
  exporterHistorique: 'argent',
  /** Contester une décision qui touche au versement : gérant seul (ARL-96). */
  contesterDecision: 'argent',
} as const satisfies Record<string, Droit>
export type Geste = keyof typeof DROITS_GESTE

/** Le membre a-t-il ce droit ? (le propriétaire les a tous). */
export const aLeDroit = (m: Membre | null, d: Droit) => !!m && (m.role === 'proprietaire' || m.droits.includes(d))

/** Le membre peut-il ouvrir cette route ? */
export const peutOuvrir = (m: Membre | null, route: string) => {
  const d = DROITS_ROUTE[route]
  return !d || d.some((x) => aLeDroit(m, x))
}

/** Le membre connecté peut-il faire ce geste ? */
export function usePeut(geste: Geste): boolean {
  return aLeDroit(useSession().membre, DROITS_GESTE[geste])
}

/** Le membre connecté peut-il ouvrir cette route ? */
export function usePeutOuvrir(route: string): boolean {
  return peutOuvrir(useSession().membre, route)
}
