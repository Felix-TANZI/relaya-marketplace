// Écrans de CL-11 construits (outils/ecran.mjs).
import { Litige } from './Litige'
import { LitigeConfirme } from './LitigeConfirme'
import { LitigeAuto } from './LitigeAuto'
import { LitigeComptoir } from './LitigeComptoir'
import { LitigeSuivi } from './LitigeSuivi'
import { LitigeArrangement } from './LitigeArrangement'
import { Litiges } from './Litiges'
import { Retour } from './Retour'
import { Remplacement } from './Remplacement'

export const ECRANS = {
  "litige": Litige,
  "litige-confirme": LitigeConfirme,
  "litige-auto": LitigeAuto,
  "litige-comptoir": LitigeComptoir,
  "litige-suivi": LitigeSuivi,
  "litige-arrangement": LitigeArrangement,
  "litiges": Litiges,
  "retour": Retour,
  "remplacement": Remplacement,
}
