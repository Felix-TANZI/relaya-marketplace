// En-tête de page UNIQUE (REFONTE-PRESENTATION.md) : l'écran (coque, Ecran) pose un seul en-tête — surtitre, titre,
// sous-titre, actions — et ouvre ici ses emplacements ; la tête d'un écran repris (prototype, Tete) y dépose son
// surtitre, son sous-titre et, au téléphone, ses actions au lieu de dessiner un second en-tête.
import { createContext, useContext } from 'react'

export interface EmplacementsEnTete {
  surtitre: HTMLElement | null
  sous: HTMLElement | null
  actions: HTMLElement | null // à droite du titre (téléphone : sous le titre ; les actions de l'écran vont au pouce)
}

export const EnTeteContexte = createContext<EmplacementsEnTete | null>(null)
export const useEmplacementsEnTete = () => useContext(EnTeteContexte)
