// Écrans de CL-13 construits (outils/ecran.mjs).
import { Compte } from './Compte'
import { Adresses } from './Adresses'
import { MoyensPaiement } from './MoyensPaiement'
import { Factures } from './Factures'
import { Supprimer } from './Supprimer'
import { AvisDonner } from './AvisDonner'
import { AvisBas } from './AvisBas'
import { Aide } from './Aide'
import { Faq } from './Faq'
import { Messagerie } from './Messagerie'
import { Fil } from './Fil'
import { Rappel } from './Rappel'
import { Legal } from './Legal'
import { LegalDoc } from './LegalDoc'
import { Reseau } from './Reseau'
import { Reglages } from './Reglages'
import { Wallet } from './Wallet'
import { DevenirVendeur } from './DevenirVendeur'

export const ECRANS = {
  "compte": Compte,
  "adresses": Adresses,
  "moyens-paiement": MoyensPaiement,
  "factures": Factures,
  "supprimer": Supprimer,
  "avis-donner": AvisDonner,
  "avis-bas": AvisBas,
  "aide": Aide,
  "faq": Faq,
  "messagerie": Messagerie,
  "fil": Fil,
  "rappel": Rappel,
  "legal": Legal,
  "legal-doc": LegalDoc,
  "reseau": Reseau,
  "reglages": Reglages,
  "wallet": Wallet,
  "devenir-vendeur": DevenirVendeur,
}
