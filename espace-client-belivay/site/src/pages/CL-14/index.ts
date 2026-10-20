// Écrans de CL-14 construits (outils/ecran.mjs).
import { Abonnements } from './Abonnements'
import { AbonnementSouscrire } from './AbonnementSouscrire'
import { MonAbonnement } from './MonAbonnement'
import { AbonnementResilier } from './AbonnementResilier'
import { Cagnotte } from './Cagnotte'
import { Parrainage } from './Parrainage'
import { AbonnementOffrir } from './AbonnementOffrir'
import { Listes } from './Listes'
import { ListeCreer } from './ListeCreer'
import { ListeEnvies } from './ListeEnvies'
import { ListeEnvoyer } from './ListeEnvoyer'
import { ListePublique } from './ListePublique'
import { ListeOffrir } from './ListeOffrir'
import { ListeOffert } from './ListeOffert'
import { ListeStatut } from './ListeStatut'
import { VentesFlash } from './VentesFlash'
import { Assistant } from './Assistant'
import { AssistantConfirmer } from './AssistantConfirmer'

export const ECRANS = {
  "abonnements": Abonnements,
  "abonnement-souscrire": AbonnementSouscrire,
  "mon-abonnement": MonAbonnement,
  "abonnement-resilier": AbonnementResilier,
  "cagnotte": Cagnotte,
  "parrainage": Parrainage,
  "abonnement-offrir": AbonnementOffrir,
  "listes": Listes,
  "liste-creer": ListeCreer,
  "liste-envies": ListeEnvies,
  "liste-envoyer": ListeEnvoyer,
  "liste-publique": ListePublique,
  "liste-offrir": ListeOffrir,
  "liste-offert": ListeOffert,
  "liste-statut": ListeStatut,
  "ventes-flash": VentesFlash,
  "assistant": Assistant,
  "assistant-confirmer": AssistantConfirmer,
}
