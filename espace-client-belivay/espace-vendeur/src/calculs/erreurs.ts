// Erreurs des calculs (mêmes noms que moteurs/belivay_moteurs/erreurs.py).
export class ErreurMoteur extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
/** La valeur d'un paramètre du registre n'a pas la forme attendue : on s'arrête plutôt que deviner. */
export class ParametreIllisible extends ErreurMoteur {}
/** Un paramètre nécessaire au calcul manque dans le registre. */
export class ParametreAbsent extends ErreurMoteur {}
/** Vente impossible à calculer : sans article, prix ou quantité invalides, famille inconnue… */
export class VenteInvalide extends ErreurMoteur {}
/** BelivaY ne perd jamais (DP-55) : une offre ou une vente où le vendeur garderait moins de 0 F est refusée. */
export class OffreRefusee extends ErreurMoteur {}
