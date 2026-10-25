// Diaspora (DP-54) : écrans propres au site, absents du prototype : s'inscrire depuis l'étranger, relier un proche
// au Cameroun (avec son accord), commander pour lui ; tout savoir sur les comptes diaspora ; l'espace diaspora
// (page centrale) et les paniers envoyés à payer entre proches reliés.
import { CommanderPour } from './CommanderPour'
import { DiasporaInfos } from './DiasporaInfos'
import { EspaceDiaspora } from './EspaceDiaspora'
import { InscriptionDiaspora } from './InscriptionDiaspora'
import { PaniersProches } from './PaniersProches'
import { Proches } from './Proches'

export const ECRANS = {
  'inscription-diaspora': InscriptionDiaspora,
  proches: Proches,
  'commander-pour': CommanderPour,
  'diaspora-infos': DiasporaInfos,
  'espace-diaspora': EspaceDiaspora,
  'paniers-proches': PaniersProches,
}
