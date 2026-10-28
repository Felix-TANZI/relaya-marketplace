// Paramètres de la console qui ne peuvent pas aller au registre officiel (logique-metier/parametres-en-vigueur.json,
// généré par logique-metier/outils/revue.py depuis logique-metier/parametres.json). Tout code de la console y entre
// d'abord (catégorie « Proposés pour la console d'administration », A-VALIDER § 4) : cette liste est vide. Le registre
// officiel l'emporte toujours (src/calculs/registre.ts) ; un test signale une ligne dont le code y est entré.
export interface ParametrePropose {
  code: string
  valeur: string
  unite: string
  raison: string
}

export const PARAMETRES_PROPOSES: ParametrePropose[] = []
