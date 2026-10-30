// DONNÉES DE DÉMONSTRATION — passerelle entre « Mon équipe » (domaine relais, PR-10) et l'invitation par SMS (domaine
// acces, PR-03) : relais.ajouterEmploye fait naître une invitation que le domaine « acces » tient. Module sans import
// pour ne pas créer de dépendance croisée entre les deux domaines (ordre de chargement).
import type { Droit } from '../donnees/domaines/session'

export type Inviter = (x: { membreId: string; prenom: string; nom: string; telephone: string; droits: Droit[] }, le: number) => string
let inviter: Inviter = () => ''
/** Le domaine « acces » se déclare au chargement. */
export const inviterPar = (f: Inviter) => void (inviter = f)
/** Crée l'invitation (jeton) d'un employé ajouté. */
export const creerInvitation: Inviter = (x, le) => inviter(x, le)
