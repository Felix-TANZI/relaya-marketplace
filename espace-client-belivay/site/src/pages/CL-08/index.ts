// Écrans de CL-08 construits (outils/ecran.mjs).
import { PaiementAttente } from './PaiementAttente'
import { PrixChange } from './PrixChange'
import { PaiementEchec } from './PaiementEchec'
import { PaiementMoyen } from './PaiementMoyen'
import { Confirmee } from './Confirmee'
import { Validee } from './Validee'
import { XpPay } from './XpPay'

export const ECRANS = {
  "paiement-attente": PaiementAttente,
  "prix-change": PrixChange,
  "paiement-echec": PaiementEchec,
  "paiement-moyen": PaiementMoyen,
  "confirmee": Confirmee,
  "validee": Validee,
  "xp-pay": XpPay,
}
