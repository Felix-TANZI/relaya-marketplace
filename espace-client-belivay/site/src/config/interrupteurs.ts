// Interrupteurs de fonctionnalité (CCH-17, CCH-18, CFS-01, CFS-02, CAP-13).
// DP-50 (3 oct.) : tout le prototype est visible sur le site, portefeuille et modules d'après le lancement
// compris ; tous les interrupteurs sont ouverts (interrupteurs.json, lu aussi par les tests). Un module se
// referme en remettant son interrupteur à false, sans toucher aux écrans. En production, l'état vient du serveur (GET /config/flags au démarrage) :
// voir src/donnees. Un interrupteur fermé rend son module invisible : aucune route, aucune entrée.
import etat from './interrupteurs.json'

export type Interrupteur =
  | 'FF-ABONNEMENT'
  | 'FF-LISTE-ENVIES'
  | 'FF-FLASH'
  | 'FF-IA'
  | 'FF-EX01'
  | 'FF-EX02'
  | 'FF-EX03'
  | 'FF-EX04'
  | 'FF-EX05'
  | 'FF-EX06'
  | 'FF-WHATSAPP-CANAL'
  | 'FF-WALLET'

export type EtatInterrupteurs = Record<Interrupteur, boolean>


export const INTERRUPTEURS_DU_LANCEMENT: EtatInterrupteurs = etat as EtatInterrupteurs
