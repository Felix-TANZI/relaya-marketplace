// Libellés français des valeurs de la source (traduits par t() à l'affichage) : rôles, états du compte, paliers.
import type { EtatCompte } from '../donnees/domaines/compte'
import type { PalierEntreprise, Role } from '../donnees/communs'
import type { GenrePaquet } from '../donnees/domaines/paquets'

export const NOM_ROLE: Record<Role, string> = { proprietaire: 'Propriétaire', gerant: 'Gérant', repartiteur: 'Répartiteur', comptable: 'Comptable' }
export const NOM_ETAT: Record<EtatCompte, string> = { configuration: 'En configuration', pilote: 'Pilote', actif: 'Compte actif', restreint: 'Compte restreint', suspendu: 'Compte suspendu', preavis: 'En préavis', resilie: 'Compte résilié' }
export const NOM_PALIER: Record<PalierEntreprise, string> = { Nouveau: 'Nouveau', Confirme: 'Confirmé', Or: 'Or' }
export const NOM_GENRE: Record<GenrePaquet, string> = {
  tournee_relais: 'Tournée relais',
  domicile: 'Course à domicile',
  collecte: 'Collecte au relais',
  retour: 'Course de retour',
  transfert: 'Transfert entre relais',
  mixte: 'Paquet mixte',
}
