// Sanctions et contrôle au ramassage du vendeur : portage fidèle de moteurs/belivay_moteurs/sanctions.py (SAN-01 à
// SAN-06, SUS-01 à SUS-03, VD04-R15, VD10-R23, REFVD-R219, CTRL-RAMASSAGE, C8 ; DP-56 : Q-31 ; DP-57 : L-1).
//
// - Le Trust Score vient du service Scores (Q-37) : lu à sa valeur exacte (62,7, pas 63), jamais calculé ici.
// - Niveaux (SAN-06) : 1 avertissement (automatique) ; 2 visibilité réduite, 14 jours ; 3 suspension ; 4 exclusion.
//   Les niveaux 2 à 4 sont proposés par le système et validés par une personne avec un motif écrit, contestables une
//   fois (SAN-01, Q-31).
// - Suspension proposée sous un score de 40, ou après 3 non-préparations en 30 jours glissants (Q-31) ; elle dure
//   jusqu'à la décision humaine, 30 jours au plus (L-1), puis période probatoire : 20 commandes contrôlées à 100 %.
// - Contrôle au ramassage (CTRL-RAMASSAGE) : 100 % des 5 premières commandes, puis 1 sur 20 sous un Trust Score de 70,
//   puis 1 sur 100 ; 100 % en période probatoire, et si le score passe sous 60 ou perd 8 points en une semaine (L-1).
import { Dec } from './argent'
import type { ParametresSanctions } from './registre'
import { JOUR } from './temps'

export const NIVEAUX = { AVERTISSEMENT: 1, VISIBILITE_REDUITE: 2, SUSPENSION: 3, EXCLUSION: 4 } as const
export type Niveau = (typeof NIVEAUX)[keyof typeof NIVEAUX]

/** SAN-01 : seul l'avertissement est automatique ; les niveaux 2 à 4 attendent une personne et un motif écrit. */
export const validationHumaine = (niveau: Niveau) => niveau >= NIVEAUX.VISIBILITE_REDUITE

/** Niveau 2 (L-1) : « Vos offres passent après celles des autres vendeurs » pendant 14 jours. */
export const finVisibiliteReduite = (debut: number, p: ParametresSanctions) => debut + p.visibiliteJours * JOUR

/** Niveau 3 (L-1) : jusqu'à la décision humaine, 30 jours au plus ; la période probatoire suit. */
export const finSuspensionAuPlusTard = (debut: number, p: ParametresSanctions) => debut + p.suspensionMaxJours * JOUR

/** Q-31 : score sous 40, ou 3 non-préparations dans les 30 jours glissants qui finissent maintenant. Proposée seulement :
 * une personne la valide (SAN-01). */
export function suspensionProposee(trustScore: Dec, nonPreparations: number[], maintenant: number, p: ParametresSanctions): boolean {
  if (trustScore.cmp(p.suspensionSousScore) < 0) return true
  const debut = maintenant - p.nonPreparationsJours * JOUR
  return nonPreparations.filter((n) => debut < n && n <= maintenant).length >= p.nonPreparations
}

/** Période probatoire après une suspension (L-1) : finie après 20 commandes contrôlées à 100 %. */
export const probationFinie = (commandesControlees: number, p: ParametresSanctions) => commandesControlees >= p.probatoireCommandes

/** L-1 : contrôle à 100 % si le score passe sous 60, ou s'il a perdu 8 points ou plus en 7 jours. */
export function controleRenforce(trustScore: Dec, scoreIlYAUneSemaine: Dec | null, p: ParametresSanctions): boolean {
  if (trustScore.cmp(p.renforceSousScore) < 0) return true
  return scoreIlYAUneSemaine !== null && scoreIlYAUneSemaine.moins(trustScore).cmp(p.renforceBaissePoints) >= 0
}

/** Part des commandes contrôlées au ramassage (CTRL-RAMASSAGE, SAN-03, L-1), en fraction exacte : 1 (100 %) pour les 5
 * premières, en période probatoire ou en contrôle renforcé ; 1/20 sous un Trust Score de 70 ; 1/100 sinon. Tonton PG
 * (62,7 ; 7 commandes) : 1 sur 20 ; à 70 : 1 sur 100. */
export function frequenceDeControle(commandesRamassees: number, trustScore: Dec, p: ParametresSanctions, options: { enProbation?: boolean; renforce?: boolean } = {}): Dec {
  if (commandesRamassees < 0) throw new RangeError('nombre de commandes négatif')
  if (options.enProbation || options.renforce || commandesRamassees < p.controlePremieres) return Dec.de(1)
  if (trustScore.cmp(p.controleSeuilScore) < 0) return Dec.de(1).sur(p.controleSousSeuil)
  return Dec.de(1).sur(p.controleEnsuite)
}
