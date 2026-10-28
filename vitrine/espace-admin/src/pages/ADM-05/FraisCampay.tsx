// Page ajoutée « Frais de paiement du mois » (route « frais-paiement », A-VALIDER S2-16) : qui paie quoi à l'agrégateur, lue
// dans le rapprochement du domaine argent ; liée depuis l'en-tête du Rapprochement.
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { Frais } from './Rapprochement'

export default function FraisCampay() {
  const l = useLecture(() => source.argent.rapprochement(), [])
  return <Frais l={l} />
}
