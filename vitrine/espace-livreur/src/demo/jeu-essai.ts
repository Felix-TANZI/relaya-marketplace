// DONNÉES DE DÉMONSTRATION — le jeu d'essai du livreur : Serge Atangana, livreur de Yafé Express à moto, zone
// Z1 Centre-ville, le mardi 13 octobre 2026 à 14 h 05, en route vers l'arrêt 2 de son paquet PQ-Z1-261013-003. Les colis
// BLV-00008… sont ceux des commandes du jeu d'essai du vendeur (même écosystème). Ce sont des DONNÉES : seules les
// règles comptent (aucun écran ne les recopie).
import { yaounde } from '../calculs/temps'
import type { ColisVu } from '../donnees/communs'
import type { Livreur } from '../donnees/domaines/session'

export const h = (heure: number, minute = 0) => yaounde(2026, 10, 13, heure, minute)

export const LIVREUR: Livreur = {
  id: 'liv-0007',
  prenom: 'Serge',
  nom: 'Atangana',
  initiales: 'SA',
  entreprise: 'Yafé Express',
  vehicule: 'Moto',
  zone: 'Z1 Centre-ville',
  photo: null,
}

/** PIN de démonstration (6 chiffres) : seule la démonstration le connaît ; le serveur ne garde qu'une empreinte. */
export const PIN_DEMO = '240913'
/** Code SMS de démonstration. */
export const CODE_SMS_DEMO = '481920'

export const COLIS: ColisVu[] = [
  { id: 'BLV-00008-1', classe: 'S', fragile: false, etiquette: 'BV 24 8204' },
  { id: 'BLV-00009-1', classe: 'M', fragile: true, etiquette: 'BV 24 8205' },
  { id: 'BLV-00011-1', classe: 'S', fragile: false, etiquette: null },
  { id: 'BLV-00012-1', classe: 'L', fragile: false, etiquette: null },
  { id: 'BLV-00014-1', classe: 'M', fragile: false, etiquette: null },
]
