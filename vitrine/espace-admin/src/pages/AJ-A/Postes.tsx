// Postes de décision (page ajoutée, logique-metier/DECISIONS-ENCADREES.md § 6) : le même poste de travail que les
// litiges pour la vérification d'identité, les remboursements, les sanctions, les constats des relais, les retenues de
// kit contestées et les signalements ; une file par échéance, tous genres ou un seul (« ?genre=kyc »).
import { Poste } from '../../composants/poste/Poste'

export default function Postes() {
  return <Poste route="postes" genre={null} />
}
