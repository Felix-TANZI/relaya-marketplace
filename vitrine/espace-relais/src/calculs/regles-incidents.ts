// Règles chiffrées des incidents, des fermetures et de l'historique (PR-07), LUES DANS LE REGISTRE (CCH-15 : aucune
// valeur dans un écran ni dans la démonstration). Les codes communs au relais (photos du constat et du retour,
// conservation des preuves, transfert après fermeture, réponse de BelivaY, fenêtres de retour, contestation, masquage
// du relais fermé) viennent de PARAMETRES.relais ; ceux des litiges (DP-35, v6 D18) et des fermetures (FER-01 à
// FER-04) sont lus ici avec la même rigueur : une forme inattendue arrête la lecture (ParametreIllisible). Lu par les
// écrans de PR-07 (pages/PR-07/regles.ts) et par la démonstration du serveur (incidents, fermeture, historique).
import { NOMBRE, PARAMETRES, REGISTRE, entier, lire, type ParametresRelais, type Registre } from './registre'

const nombre = (r: Registre, code: string, motif: string) => entier(lire(r, code, motif)[1])

export interface ReglesIncidents {
  // ── Litiges (DP-35, v6 D18 ; LIT-01 à LIT-12, EXT-14, EXT-15) ──
  /** LIT-VENDEUR-H : le vendeur répond sous ce délai ; son silence renvoie à l'arbitrage de BelivaY. */
  vendeurH: number
  /** LIT-DECISION-H : BelivaY tranche au plus ce délai après l'échéance du vendeur. */
  decisionH: number
  /** LIT-RECOURS-H : un seul recours, sous ce délai après la décision (examiné par une autre personne). */
  recoursH: number
  /** LIT-ARRANG-REPONSE-J : arrangement sans réponse pendant ces jours : le dossier revient en examen. */
  arrangementJ: number
  /** LIT-CONSTAT-H : réponse de BelivaY à un constat du relais (heures ouvrées). */
  reponseConstatH: number
  /** RET-FENETRE : le client signale un problème pendant ces jours après le retrait. */
  fenetreJ: number
  /** RET-DEFAUT-H : défaut caché signalable ce délai après le retrait, même après « Tout est en ordre ». */
  defautH: number
  /** RET-VICE : vice caché couvert ces jours après le retrait (DP-27). */
  viceJ: number
  /** RET-TRAJET : trajet retour, à la charge de la partie en tort, jamais du relais. */
  trajet: number
  /** RET-INSPECT-H : le vendeur inspecte le retour sous ce délai (sans inspection : remboursement automatique). */
  inspectionH: number
  /** PR-CONTESTATION-H : le relais conteste une décision qui le met en cause, une fois, sous ce délai (heures ouvrées). */
  contestationH: number
  /** PR-CONSTAT-PHOTOS-MIN, PR-RETOUR-PHOTOS-MIN. */
  photosConstat: number
  photosRetour: number
  /** PR-PREUVES-CONSERV-J : preuves, journaux et fils de dossier lisibles ce nombre de jours (HIS-02, ARL-40). */
  conservationJ: number
  // ── Fermetures (FER-01 à FER-07, DP-42, ARL-20) ──
  /** PR-FER-CONGE-PREAVIS-H : un congé se déclare ce délai avant, sans justificatif. */
  congePreavisH: number
  /** PR-FER-JUSTIF-MALADIE-H : maladie, le jour même, justificatif sous ce délai. */
  justifMaladieH: number
  /** PR-FER-JUSTIF-URGENCE-J : urgence familiale, le jour même, justificatif sous ces jours. */
  justifUrgenceJ: number
  /** PR-FER-APPEL-J : au-delà de ces jours fermés, BelivaY appelle le gérant. */
  appelJ: number
  /** RELAIS-FERME-TRANSFERT-H : au-delà de 24 h, le client choisit un autre relais, sinon transfert après ce délai. */
  transfertH: number
  /** PR-FER-MASQUE-J (ARL-93) : au-delà de ces jours, le relais est masqué du choix des clients (FER-04). */
  masqueJ: number
  /** La recherche de l'historique couvre toute la conservation des preuves (PR-PREUVES-CONSERV-J, ARL-97). */
  rechercheJ: number
}

export function lireRegles(r: Registre = REGISTRE, P: ParametresRelais = PARAMETRES.relais): ReglesIncidents {
  return {
    vendeurH: nombre(r, 'LIT-VENDEUR-H', '(\\d+) h'),
    decisionH: nombre(r, 'LIT-DECISION-H', "(\\d+) h après l['’]échéance du vendeur"),
    recoursH: nombre(r, 'LIT-RECOURS-H', 'un recours, sous (\\d+) h après la décision'),
    arrangementJ: nombre(r, 'LIT-ARRANG-REPONSE-J', '(\\d+) jours ; sans réponse, le dossier revient en examen'),
    reponseConstatH: P.constatReponseH,
    fenetreJ: P.retourFenetreJours,
    defautH: nombre(r, 'RET-DEFAUT-H', '(\\d+) h après le retrait'),
    viceJ: P.viceCacheJours,
    trajet: nombre(r, 'RET-TRAJET', NOMBRE + ' F, à la charge de la partie en tort'),
    inspectionH: nombre(r, 'RET-INSPECT-H', '(\\d+) h'),
    contestationH: P.contestationHeures,
    photosConstat: P.constatPhotosMin,
    photosRetour: P.retourPhotos,
    conservationJ: P.preuvesConservationJours,
    congePreavisH: nombre(r, 'PR-FER-CONGE-PREAVIS-H', '(\\d+) h avant, sans justificatif'),
    justifMaladieH: nombre(r, 'PR-FER-JUSTIF-MALADIE-H', 'le jour même, justificatif sous (\\d+) h'),
    justifUrgenceJ: nombre(r, 'PR-FER-JUSTIF-URGENCE-J', 'le jour même, justificatif sous (\\d+) jours'),
    appelJ: nombre(r, 'PR-FER-APPEL-J', 'au-delà de (\\d+) jours'),
    transfertH: P.fermeTransfertH,
    masqueJ: P.fermetureMasqueJours,
    rechercheJ: P.preuvesConservationJours,
  }
}

export const REGLES: ReglesIncidents = lireRegles()
