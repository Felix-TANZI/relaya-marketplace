// Écrans de CL-12 construits (outils/ecran.mjs).
import { Modifier } from './Modifier'
import { Annuler } from './Annuler'
import { AnnulerConfirmer } from './AnnulerConfirmer'
import { ChangerRelais } from './ChangerRelais'
import { ChangerAdresse } from './ChangerAdresse'
import { Payeur } from './Payeur'
import { PayeurPreuve } from './PayeurPreuve'
import { Diaspora } from './Diaspora'

export const ECRANS = {
  "modifier": Modifier,
  "annuler": Annuler,
  "annuler-confirmer": AnnulerConfirmer,
  "changer-relais": ChangerRelais,
  "changer-adresse": ChangerAdresse,
  "payeur": Payeur,
  "payeur-preuve": PayeurPreuve,
  "diaspora": Diaspora,
}
