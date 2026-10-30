// DONNÉES DE DÉMONSTRATION — connexion en un clic de Rose M. (AccesDemo du cadre d’accès commun, VAGUE-AMELIORATIONS.md
// n° 2) : son PIN d'essai sur cette tablette, par la même vérification que l'écran (essais comptés, blocage, journal).
// Chargé par l'écran de connexion seulement en démonstration ; le serveur réel ne connaît pas ce geste.
import { origine } from '../donnees/fileHorsLigne'
import { source } from '../donnees/source'
import { maintenant } from './horloge'
import { PIN_DEMO } from './jeu-essai'

export const connecterPersonnage = () => source.session.connecter(PIN_DEMO, origine(maintenant()))
/** Refus montré quand l'appareil n'a pas la session du personnage (texte traduit tel quel, i18n/*-03.en.json). */
export const REFUS_PERSONNAGE = 'Cette tablette n’a pas la session de Rose M. : connectez-vous par le parcours ci-dessus.'
