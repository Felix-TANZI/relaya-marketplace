// Rang de la page ouverte (consigne du porteur, phase finale) : les rangées de tuiles (fonctions « verbe + nombre »,
// indicateurs) ne vivent que sur les pages PRINCIPALES : l'accueil de chaque rôle (File d'action de la console, Tableau de l'entreprise), la Vue d'ensemble (console),
// le Menu et les pages-onglets de la barre du bas du rôle. Une page SECONDAIRE (fiche, liste détaillée, paramètres,
// journal pour qui ne l'a pas en onglet…) est « normale », comme chez le client et le vendeur : titre, une rangée de
// filtres avec leur nombre et une ligne de résumé, puis le contenu. La coque (<Ecran>) pose le rang ; Fonctions et Kpi
// le lisent pour se rendre en filtres et en résumé.
import { createContext, useContext } from 'react'

export const RangSecondaire = createContext(false)

/** Vrai sur une page secondaire : pas de tuiles, des filtres et une ligne de résumé. */
export const useSecondaire = () => useContext(RangSecondaire)
