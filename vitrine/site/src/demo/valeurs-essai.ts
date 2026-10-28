// DONNÉES DE DÉMONSTRATION — valeurs d'essai partagées par le site et les cinq espaces (alias @client/demo) : mots de
// passe et codes des comptes de démonstration, taux du dollar, compte de démonstration du client. Rien ici n'est
// une règle : ce sont des valeurs du jeu d'essai, que l'API remplace (logique-metier/RETIRER-LA-DEMO.md). Les écrans
// ne les montrent qu'en démonstration (VITE_SOURCE=demo) ; ce fichier part avec le dossier src/demo.
import { env } from '../config/env'

/** Mot de passe des comptes de démonstration du kit « compte » (le même dans les quatre applications). */
export const MDP_DEMO = 'Belivay2026'
/** Code reçu par SMS ou par e-mail en démonstration (kit « compte »). */
export const CODE_DEMO = '246810'
/** Aide de la connexion du kit « compte » : le mot de passe d'essai, puis l'e-mail et le numéro du compte. */
export const AIDE_CONNEXION_KIT = 'Démonstration : mot de passe Belivay2026 ; e-mail '
/** Aide de la connexion par e-mail du client (CL-03), après un mot de passe refusé. */
export const AIDE_CONNEXION_CLIENT = 'Démonstration : le mot de passe du compte d’essai est Belivay2026.'

/** Mot de passe affiché en clair par l'œil des écrans du prototype (balisage généré, src/composants/interactions.ts). */
export const MDP_PROTOTYPE = 'Yaounde#2026'

/**
 * Dollar US : taux du jour du prestataire de paiement en production (figé au paiement) ; en démonstration, ce taux
 * fixe (DP-54). L'euro n'est pas ici : sa parité est fixe (BEAC), c'est une règle (src/i18n/format.ts, PARITE_EURO).
 */
export const TAUX_DOLLAR_DEMO = 603.5

/** Compte du personnage « Carine M. » sur l'appareil (connexion en un clic du client, CL-03). */
export const EMAIL_PERSONNAGE_CLIENT = 'carine@gmail.com'

/**
 * Commande ouverte par une adresse sans « ?ref= » (adresses du prototype : « /commande », « /litige »…) : celle du jeu
 * d'essai qui illustre l'écran. Avec l'API, aucune : l'écran montre « commande introuvable ».
 */
const REFS_PROTOTYPE = {
  commande: 'BLV-52018', // retirable : code, comptoir, garde, partage
  enCours: 'BLV-52107', // en préparation : suivi, modifier, annuler, changer de relais
  comptoir: 'BLV-51940', // à payer au retrait
  litige: 'BLV-51702', // retirée : ouvrir un litige
  litigeComptoir: 'BLV-51877', // en litige au comptoir
} as const
export const refPrototype = (quoi: keyof typeof REFS_PROTOTYPE): string => (env.source === 'api' ? '' : REFS_PROTOTYPE[quoi])
