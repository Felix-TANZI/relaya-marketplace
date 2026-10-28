// DONNÉES DE DÉMONSTRATION — situation de départ du jeu d'essai. Par défaut : Rose Mbarga (gérante, propriétaire du
// relais) connectée, mardi 13 octobre 2026 à 14 h 05. Une adresse ouverte avec « ?demo=<situation> » repart du jeu
// d'essai dans une autre situation (les règles restent celles du serveur) :
//   premiere    téléphone sans session : connexion (numéro et PIN du membre)
//   employe     Paul Essomba, employé de comptoir, connecté (moindre privilège : ni argent ni gestion, ARL-06)
//   neuf        relais ouvert hier : journée calme, Trust « nouveau », premier versement à venir
//   ferme       fermeture imprévue du jour déclarée à 13 h 30 (rouvre demain 8 h)
//   suspendu    relais suspendu par BelivaY (motif écrit par une personne)
//   hors_ligne  le réseau est tombé à 13 h 48 : deux gestes en file d'attente
//   configuration  relais pas encore ouvert (5 étapes d'activation sur 6) : Rose connectée, aucun colis, aucun lot
//   session_expiree  Rose n'a pas ouvert l'application depuis plus de PR-SESSION-J jours : la session est close,
//               l'appareil reste lié (son PIN suffit à reprendre, CNX-04, ARL-141)
//   candidat    candidature envoyée (« Devenir point relais »), pas encore de session (ARL-50) : le numéro de la
//               candidature, saisi à la connexion, dit « votre demande est à l'étude »
// Un relais qui n'est pas encore ouvert (configuration, candidat) est VIDE dans tous les domaines : ni colis, ni lot,
// ni dossier, ni versement, ni Trust Score (relaisPasOuvert).
// La situation choisie est gardée pour l'onglet ; « ?demo=normal » revient au jeu d'essai par défaut. Les gestes en
// attente d'envoi (file hors connexion) ne sont jamais effacés.
export const SCENARIOS = ['premiere', 'employe', 'neuf', 'ferme', 'suspendu', 'hors_ligne', 'configuration', 'candidat', 'session_expiree'] as const
export type Scenario = (typeof SCENARIOS)[number]

const CLE = 'blv_r_demo_scenario'
let lu: Scenario | null | undefined

export function scenario(): Scenario | null {
  if (lu !== undefined) return lu
  try {
    const demande = new URLSearchParams(location.search).get('demo')
    if (demande !== null) {
      const s = (SCENARIOS as readonly string[]).includes(demande) ? (demande as Scenario) : null
      if ((sessionStorage.getItem(CLE) ?? '') !== (s ?? '')) {
        for (const k of Object.keys(localStorage)) if (k.startsWith('blv_r_demo_') && k !== 'blv_r_demo_horsligne') localStorage.removeItem(k)
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

/** Le relais n'est pas encore ouvert (situations « configuration » et « candidat ») : tout domaine le rend vide. */
export const relaisPasOuvert = () => scenario() === 'configuration' || scenario() === 'candidat'
/** Journée sans historique : relais ouvert hier (« neuf ») ou pas encore ouvert. */
export const sansHistorique = () => scenario() === 'neuf' || relaisPasOuvert()
