// Livreur : contrôle au ramassage et gains affichés, portage fidèle de moteurs/belivay_moteurs/livreur.py
// (LVR-CONTROLE, CTRL-RAMASSAGE ; DP-62 : O-05, I-04 ; DED-05, DED-30 ; LIV-04-R04).
import { LIVRAISON, type ParametresControle } from './vigueur'

/** Part des commandes du vendeur tirées pour l'audit C4 : 1 pour les 5 premières, 1/20 sous 70, 1/100 ensuite. */
export function frequenceDeControle(commandesRamassees: number, trustVendeur: number, pc: ParametresControle = LIVRAISON.controle): number {
  if (commandesRamassees < 0) throw new RangeError('nombre de commandes négatif')
  if (commandesRamassees < pc.premieres) return 1
  return trustVendeur < pc.seuilScore ? 1 / pc.sousSeuil : 1 / pc.ensuite
}

export interface Controle {
  c1: true // toujours : deux photos par colis, preuve opposable (DED-05)
  photos: number
  auditC4: boolean // « Contrôle approfondi demandé par BelivaY »
  chaqueColis: boolean // bandeau du vendeur en contrôle renforcé ou en période probatoire (DED-30)
  frequence: number
}

/** `tirage` : nombre tiré par le serveur dans [0 ; 1[ ; audit si tirage < fréquence ou défaut trouvé (O-05). */
export function controleAuRamassage(commandesRamassees: number, trustVendeur: number, tirage: number, o: { renforce?: boolean; enProbation?: boolean; defautTrouve?: boolean } = {}, pc: ParametresControle = LIVRAISON.controle): Controle {
  if (!(tirage >= 0 && tirage < 1)) throw new RangeError('tirage dans [0 ; 1[')
  const frequence = frequenceDeControle(commandesRamassees, trustVendeur, pc)
  return { c1: true, photos: 2, auditC4: !!o.defautTrouve || tirage < frequence, chaqueColis: !!(o.renforce || o.enProbation), frequence }
}

/** Gains : Σ tarif par type de mission si l'entreprise l'a fixé (montant), sinon compteur seul (montant null). */
export function gains(missionsValidees: string[], tarifs: Record<string, number> | null): { missions: number; montant: number | null } {
  if (tarifs === null) return { missions: missionsValidees.length, montant: null }
  if (Object.values(tarifs).some((v) => !Number.isInteger(v) || v < 0)) throw new RangeError('tarif par mission : francs entiers positifs ou nuls')
  return { missions: missionsValidees.length, montant: missionsValidees.reduce((t, m) => t + (tarifs[m] ?? 0), 0) }
}
