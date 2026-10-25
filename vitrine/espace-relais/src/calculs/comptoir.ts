// Comptoir du relais : portage des fonctions du moteur moteurs/belivay_moteurs/comptoir.py qui servent au relais (mêmes
// noms, mêmes exemples que moteurs/tests/test_comptoir_annulation_carte.py). CAL-13, CAL-18 ; CCP-04, CCP-06 ; DP-24,
// DP-26 ; v6 D14 (paiement Mobile Money au comptoir, jamais en espèces ; seule la garde se paie en espèces).
import type { ParametresRelais } from './registre'

/** Montant d'une commande payable au retrait = reste de la commande (Mobile Money) ; la garde, elle, se paie à part
 * en espèces (v6). Le moteur Python additionne les deux (CAL-13) ; le relais les montre sur deux lignes. */
export const montantDuAuRetrait = (resteDeLaCommande: number, garde: number) => resteDeLaCommande + garde

/** Un refus au comptoir sans motif : nombre de refus et paiement d'avance devenu obligatoire, définitivement (CCP-04). */
export function apresRefus(refusAvant: number, p: Pick<ParametresRelais, 'comptoir'>): { refus: number; avanceObligatoire: boolean } {
  const refus = refusAvant + 1
  return { refus, avanceObligatoire: refus >= p.comptoir.refusAvantAvance }
}

export interface RetenueApresRefus {
  retenue: number // garde retenue sur la livraison payée d'avance
  rendu: number // reste de l'avance rendu au client (0 : CCP-06, la livraison n'est pas remboursée)
  nonReclame: number // garde au-delà de l'avance, jamais réclamée au client
}
/** Refus au comptoir (DP-24) : la garde due est retenue sur la livraison payée d'avance, sans la dépasser. */
export function retenueApresRefus(avancePayee: number, gardeDue: number): RetenueApresRefus {
  if (avancePayee < 0 || gardeDue < 0) throw new Error('avance et garde sont des montants positifs ou nuls')
  const retenue = Math.min(gardeDue, avancePayee)
  return { retenue, rendu: 0, nonReclame: gardeDue - retenue }
}

/** Renvoi payant du code par SMS (client sans application) : CODE-RENVOI par 24 h au plus. */
export const renvoiPossible = (renvoisDernieres24h: number, p: Pick<ParametresRelais, 'code'>) => renvoisDernieres24h < p.code.renvoisPar24h

export interface EssaiCode {
  bloque: boolean
  essaisRestants: number
  blocageHeures: number // 0 s'il n'y a pas de blocage
  nouveauCodeSurDemande: boolean // DP-26 : après le blocage, le client demande lui-même un nouveau code
}
/** Un code faux de plus au comptoir : au 3e, blocage 24 h et alerte au client (CAL-18, DP-26). Vaut aussi pour le
 * code de dépôt du livreur (CAL-31 : chaque code se bloque 24 h après 3 essais faux). */
export function codeFaux(codesFauxAvant: number, p: Pick<ParametresRelais, 'code'>): EssaiCode {
  const faux = codesFauxAvant + 1
  if (faux >= p.code.essais) return { bloque: true, essaisRestants: 0, blocageHeures: p.code.blocageHeures, nouveauCodeSurDemande: true }
  return { bloque: false, essaisRestants: p.code.essais - faux, blocageHeures: 0, nouveauCodeSurDemande: false }
}

/** Pièce vérifiée au comptoir (le serveur le décide, le relais ne voit jamais la valeur) : toujours pour un porteur
 * désigné (son nom se lit sur sa pièce), et pour tout colis de valeur dès CODE-PORTEUR (« porteur nommé, pièce vérifiée »). */
export const pieceExigee = (valeurDuGroupe: number, porteurDesigne: boolean, p: Pick<ParametresRelais, 'porteurPieceDes'>) => porteurDesigne || valeurDuGroupe >= p.porteurPieceDes

/** Monnaie à rendre sur les espèces de garde (A-VALIDER ARL-04) : « Montant reçu » est facultatif ; jamais négatif. */
export function monnaieARendre(du: number, recu: number | null): { suffisant: boolean; monnaie: number } {
  if (recu === null) return { suffisant: true, monnaie: 0 }
  return { suffisant: recu >= du, monnaie: Math.max(recu - du, 0) }
}

/** Versement du vendredi (v6 D12, A-VALIDER ARL-05) : gains de la semaine (colis, jours de garde, 1er jour payé par
 * BelivaY) moins la part BelivaY des espèces de garde encaissées au comptoir, moins le report de la semaine
 * précédente. Un solde négatif est reporté ; au-delà de PR-DETTE-MAX, ou après PR-DETTE-SEMAINES semaines de suite,
 * le relais doit le reverser par Mobile Money. */
export function soldeDuVendredi(gains: number, partBelivayDesEspeces: number, reportPrecedent: number, semainesNegativesAvant: number, p: Pick<ParametresRelais, 'dette'>): { verse: number; report: number; semainesNegatives: number; aReverser: boolean } {
  const solde = gains - partBelivayDesEspeces - reportPrecedent
  if (solde >= 0) return { verse: solde, report: 0, semainesNegatives: 0, aReverser: false }
  const semaines = semainesNegativesAvant + 1
  return { verse: 0, report: -solde, semainesNegatives: semaines, aReverser: -solde > p.dette.max || semaines >= p.dette.semaines }
}
