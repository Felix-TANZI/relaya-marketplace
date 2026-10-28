// Écrans de CL-15 construits (outils/ecran.mjs).
import { Rentree } from './Rentree'
import { RentreeListePapier } from './RentreeListePapier'
import { RentreeClasse } from './RentreeClasse'
import { RentreeListe } from './RentreeListe'
import { RentreePanier } from './RentreePanier'
import { RentreeSuivi } from './RentreeSuivi'
import { Ecole } from './Ecole'
import { Cotisation } from './Cotisation'
import { CotisationPartager } from './CotisationPartager'
import { CotisationParticiper } from './CotisationParticiper'
import { CotisationSuivre } from './CotisationSuivre'
import { CotisationAtteinte } from './CotisationAtteinte'
import { CotisationEchue } from './CotisationEchue'
import { Cote } from './Cote'
import { CotePlan } from './CotePlan'
import { CoteSuivre } from './CoteSuivre'
import { CoteVersement } from './CoteVersement'
import { CoteFini } from './CoteFini'
import { CoteAnnuler } from './CoteAnnuler'
import { Troc } from './Troc'
import { TrocOffre } from './TrocOffre'
import { TrocDepot } from './TrocDepot'
import { TrocInspection } from './TrocInspection'
import { TrocContreOffre } from './TrocContreOffre'
import { TrocPayer } from './TrocPayer'
import { Famille } from './Famille'
import { FamilleDestinataire } from './FamilleDestinataire'
import { FamillePayer } from './FamillePayer'
import { FamilleMensuel } from './FamilleMensuel'
import { FamillePreuve } from './FamillePreuve'
import { Wa } from './Wa'
import { WaProposition } from './WaProposition'
import { WaConfirmer } from './WaConfirmer'
import { WaLien } from './WaLien'
import { WaSuite } from './WaSuite'

export const ECRANS = {
  "rentree": Rentree,
  "rentree-liste-papier": RentreeListePapier,
  "rentree-classe": RentreeClasse,
  "rentree-liste": RentreeListe,
  "rentree-panier": RentreePanier,
  "rentree-suivi": RentreeSuivi,
  "ecole": Ecole,
  "cotisation": Cotisation,
  "cotisation-partager": CotisationPartager,
  "cotisation-participer": CotisationParticiper,
  "cotisation-suivre": CotisationSuivre,
  "cotisation-atteinte": CotisationAtteinte,
  "cotisation-echue": CotisationEchue,
  "cote": Cote,
  "cote-plan": CotePlan,
  "cote-suivre": CoteSuivre,
  "cote-versement": CoteVersement,
  "cote-fini": CoteFini,
  "cote-annuler": CoteAnnuler,
  "troc": Troc,
  "troc-offre": TrocOffre,
  "troc-depot": TrocDepot,
  "troc-inspection": TrocInspection,
  "troc-contre-offre": TrocContreOffre,
  "troc-payer": TrocPayer,
  "famille": Famille,
  "famille-destinataire": FamilleDestinataire,
  "famille-payer": FamillePayer,
  "famille-mensuel": FamilleMensuel,
  "famille-preuve": FamillePreuve,
  "wa": Wa,
  "wa-proposition": WaProposition,
  "wa-confirmer": WaConfirmer,
  "wa-lien": WaLien,
  "wa-suite": WaSuite,
}
