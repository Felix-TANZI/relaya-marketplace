// Écrans de CL-05 construits (outils/ecran.mjs).
import { Recherche } from './Recherche'
import { RechercheSaisie } from './RechercheSaisie'
import { RechercheResultats } from './RechercheResultats'
import { RechercheZero } from './RechercheZero'
import { RechercheFiltres } from './RechercheFiltres'
import { RelaisSelecteur } from './RelaisSelecteur'

export const ECRANS = {
  "recherche": Recherche,
  "recherche-saisie": RechercheSaisie,
  "recherche-resultats": RechercheResultats,
  "recherche-zero": RechercheZero,
  "recherche-filtres": RechercheFiltres,
  "relais-selecteur": RelaisSelecteur,
}
