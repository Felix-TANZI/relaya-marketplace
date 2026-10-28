// DONNÉES DE DÉMONSTRATION — situation de départ du jeu d'essai (LIV-03, LIV-04). Par défaut : Serge, actif, ce
// téléphone lui est lié, mardi 13 octobre à 14 h 05. Une adresse ouverte avec « ?demo=<situation> » repart du jeu
// d'essai dans une autre situation, pour la voir parcourue en vrai (les règles restent celles du serveur) :
//   premiere               téléphone sans session : première connexion (numéro d'Hervé) ou nouveau téléphone (Serge)
//   activation             Hervé, en activation (charte acceptée, permis rejeté, assurance à envoyer, 5 modules sur 7)
//   restreint, suspendu, retire, rattachement_ferme, rattachement_suspendu : états du compte de Serge (LIV-P32)
//   aucun_paquet           Serge, journée sans paquet (tous les paquets du jour terminés)
//   preavis                Serge en préavis de départ (DP-67) : kit rendu incomplet, retenue contestable
//   depart_clos            départ clôturé par Yafé Express (rattachement fermé), dernier versement vendredi
//   photo, photo_retard    nouvelle photo demandée par Yafé Express : délai en cours, ou passé (plus de nouvelle mission)
// La situation choisie est gardée pour l'onglet ; « ?demo=normal » revient au jeu d'essai par défaut. Les gestes en
// attente d'envoi (file hors connexion) ne sont jamais effacés.
export const SCENARIOS = ['premiere', 'activation', 'restreint', 'suspendu', 'retire', 'rattachement_ferme', 'rattachement_suspendu', 'aucun_paquet', 'preavis', 'depart_clos', 'photo', 'photo_retard'] as const
export type Scenario = (typeof SCENARIOS)[number]

const CLE = 'blv_l_demo_scenario'
let lu: Scenario | null | undefined

export function scenario(): Scenario | null {
  if (lu !== undefined) return lu
  try {
    // Mode présentation (src/demo/presentation.tsx) : la journée sans autre paquet, la commande témoin d'abord.
    if (localStorage.getItem('blv_presentation') && new URLSearchParams(location.search).get('presentation') !== '0') return (lu = 'aucun_paquet')
    const demande = new URLSearchParams(location.search).get('demo')
    if (demande !== null) {
      const s = (SCENARIOS as readonly string[]).includes(demande) ? (demande as Scenario) : null
      if ((sessionStorage.getItem(CLE) ?? '') !== (s ?? '')) {
        for (const k of Object.keys(localStorage)) if (k.startsWith('blv_l_demo_') && k !== 'blv_l_demo_horsligne') localStorage.removeItem(k)
        if (s) sessionStorage.setItem(CLE, s)
        else sessionStorage.removeItem(CLE)
      }
      return (lu = s)
    }
    const g = sessionStorage.getItem(CLE)
    return (lu = g && (SCENARIOS as readonly string[]).includes(g) ? (g as Scenario) : null)
  } catch {
    return (lu = null)
  }
}
