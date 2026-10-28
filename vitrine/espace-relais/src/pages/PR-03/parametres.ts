// Paramètres des écrans d'accès (PR-03) : lus au registre par src/calculs/registre.ts (PARAMETRES.acces, forme exacte,
// sinon ParametreIllisible) ; règles pures dans src/calculs/acces.ts. Ce fichier les rend aux écrans du groupe.
import { PARAMETRES, type ParametresAcces } from '../../calculs/registre'

export type { ParametresAcces }
export { numeroValide, pinTropSimple, prefixeValide } from '../../calculs/acces'
export const ACCES: ParametresAcces = PARAMETRES.acces
export const CONNEXION = PARAMETRES.connexion
export const RELAIS_P = PARAMETRES.relais
