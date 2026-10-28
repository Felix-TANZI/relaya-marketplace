// DONNÉES DE DÉMONSTRATION — interrupteurs des fonctions d'après lancement, santé, tâches planifiées. L'assistant IA de
// la console (FF-IA) est FERMÉ au lancement (BRIEF-SOCLE, DP-60 : fonctions d'après lancement cachées) : sa route
// renvoie à l'accueil et son entrée disparaît. Le registre garde FF-IA ouvert pour le SITE (DP-50) : la console a son
// propre état (A-VALIDER § 3, Proposé). Aucune bascule directe : ouvrir ou fermer passe par
// source.pilotage.demanderBascule (quatre yeux), qui tient FF-IA à jour ici à la contre-signature.
import type { DomaineSysteme, Interrupteur } from '../donnees/domaines/systeme'
import { exigerPage } from './acces'
import { T } from './jeu-essai'
import { magasin, repondre } from './stockage'
import { demoSystemeS6 } from './systeme-s6'

export const systemeDemo = magasin<{ interrupteurs: Interrupteur[] }>('systeme', () => ({
  interrupteurs: [{ code: 'FF-IA', libelle: 'Assistant IA de la console', ouvert: false, decision: 'Fonction d’après lancement (BRIEF-SOCLE ; A-VALIDER § 3, Proposé)' }],
}))

export const interrupteursOuverts = (): Record<string, boolean> => Object.fromEntries(systemeDemo.lire().interrupteurs.map((i) => [i.code, i.ouvert]))

export const demoSysteme: DomaineSysteme = {
  ...demoSystemeS6, // S6 : santé détaillée, maintenances, tâches, conservation, rapports, légal
  async interrupteurs() {
    exigerPage('interrupteurs', 'Interrupteurs de fonctions')
    return repondre(systemeDemo.lire().interrupteurs)
  },
  async sante() {
    exigerPage('sante', 'Santé du système')
    return repondre([
      { id: 'momo-mtn', nom: 'Paiement Mobile Money (MTN)', etat: 'ok' as const, latenceMs: 820, verifieLe: T(-1) },
      { id: 'momo-orange', nom: 'Paiement Mobile Money (Orange)', etat: 'lent' as const, latenceMs: 4100, verifieLe: T(-1) },
      { id: 'sms', nom: 'Envoi des SMS', etat: 'ok' as const, latenceMs: 600, verifieLe: T(-2) },
    ])
  },
  async taches() {
    exigerPage('taches', 'Tâches planifiées')
    return repondre([
      { id: 'versements', nom: 'Versements du vendredi', quand: 'chaque vendredi', derniere: T(-4 * 24 * 60), prochaine: T(3 * 24 * 60 - 245), etat: 'ok' as const },
      { id: 'trust', nom: 'Recalcul des Trust Scores', quand: 'chaque nuit', derniere: T(-12 * 60), prochaine: T(12 * 60 - 5), etat: 'ok' as const },
      { id: 'purge', nom: 'Effacement des positions de remise', quand: 'toutes les heures', derniere: T(-5), prochaine: T(55), etat: 'ok' as const },
    ])
  },
}
