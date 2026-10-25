// Garde au relais (BV-DEV-01 § 9 ; R36 à R39) : même calcul que moteurs/belivay_moteurs/v20/garde.py.
// - R36 : par colis, quel que soit son format, cumul 0, 100, 200, 300, 500, 1 000, 2 000 F du jour 1 au jour 7,
//   jamais plus que la valeur des articles du colis ; une commande de plusieurs colis paie la garde de chaque colis.
// - R37 : tranches de 24 h depuis le scan d'arrivée du dernier colis ; le compteur s'arrête pendant une fermeture
//   déclarée du relais et la date de renvoi recule d'autant (toujours 7 jours de garde).
// - R38 : 100 F par jour et par colis au relais, dès le jour 1 (payé par BelivaY).
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { reglage } from './reglages'

const L = (DONNEES as unknown as { livraison: { garde_cumul: number[]; garde_relais: number[] } }).livraison
export const GARDE_CUMUL: readonly number[] = L.garde_cumul
const HEURE = 3600e3

export const joursDeGarde = () => reglage('garde_jours')
const tranche = () => reglage('garde_heures') * HEURE

/** Garde due au retrait le jour « jour » (1 à 7) pour un colis de cette valeur (R36). */
export function gardeColis(jour: number, valeur: number): number {
  if (jour < 1 || jour > joursDeGarde()) throw new Error(`jour de garde hors de 1 à ${joursDeGarde()} : ${jour}`)
  return Math.min(GARDE_CUMUL[jour - 1], valeur)
}
/** Garde d'une commande : celle de chaque colis (« par colis »). */
export const gardeCommande = (jour: number, valeurs: readonly number[]) => valeurs.reduce((n, v) => n + gardeColis(jour, v), 0)
/** Ce que coûte un jour de plus pour un colis, sans plafond : 0, 100, 100, 100, 200, 500, 1 000 F. */
export const tarifDuJour = (jour: number) => GARDE_CUMUL[jour - 1] - (jour > 1 ? GARDE_CUMUL[jour - 2] : 0)
/** Au plus, pour un colis : 2 000 F sur 7 jours. */
export const plafondColis = () => GARDE_CUMUL[GARDE_CUMUL.length - 1]

/** Part du relais (100 F par jour et par colis) et ce que BelivaY en paie (le jour 1), R38. */
export function partRelais(jour: number, colis: number): { part: number; belivay: number } {
  return { part: L.garde_relais[jour - 1] * colis, belivay: reglage('garde_j1_belivay') === 1 ? reglage('garde_relais_jour') * colis : 0 }
}

/** Fermeture déclarée du relais : [debut, fin[ en millisecondes. */
export interface Fermeture {
  debut: number
  fin: number
}
/** Temps fermé entre debut et fin (_fermee du serveur) ; deux fermetures qui se chevauchent ne comptent qu'une fois. */
function fermee(debut: number, fin: number, fermetures: readonly Fermeture[]): number {
  let total = 0
  let jusqua = debut
  for (const f of [...fermetures].sort((x, y) => x.debut - y.debut)) {
    const a = Math.max(jusqua, f.debut)
    const b = Math.min(fin, f.fin)
    if (b > a) total += b - a
    jusqua = Math.max(jusqua, Math.min(fin, f.fin))
  }
  return total
}

/** Jour de garde (1 à 7) à cet instant (R37) : tranches de 24 h, sans les fermetures déclarées. */
export function jourDeGarde(arrivee: number, maintenant: number, fermetures: readonly Fermeture[] = []): number {
  const ouvert = maintenant - arrivee - fermee(arrivee, maintenant, fermetures)
  return Math.max(1, Math.min(Math.floor(ouvert / tranche()) + 1, joursDeGarde()))
}

/** Instant où le compteur atteint « heures » ouvertes depuis l'arrivée (les fermetures déclarées ne comptent pas). */
export function apresOuvert(arrivee: number, duree: number, fermetures: readonly Fermeture[] = []): number {
  let fin = arrivee + duree
  for (;;) {
    const recule = arrivee + duree + fermee(arrivee, fin, fermetures)
    if (recule === fin) return fin
    fin = recule
  }
}
/** Début du jour de garde « jour » (1 à 7). */
export const debutDuJour = (arrivee: number, jour: number, fermetures: readonly Fermeture[] = []) => apresOuvert(arrivee, (jour - 1) * tranche(), fermetures)
/** Fin des 7 jours de garde, reculée de chaque fermeture déclarée qui la précède (R37) : le renvoi au vendeur. */
export const dateRenvoi = (arrivee: number, fermetures: readonly Fermeture[] = []) => apresOuvert(arrivee, joursDeGarde() * tranche(), fermetures)

/** R39 : produits − livraison offerte − garde de chaque colis (7 jours, plafonnée) − absence non payée, jamais négatif. */
export function remboursementNonRetire(produits: number, livraisonOfferte: number, valeursColis: readonly number[], absenceNonPayee = 0): number {
  return Math.max(0, produits - livraisonOfferte - gardeCommande(joursDeGarde(), valeursColis) - absenceNonPayee)
}
