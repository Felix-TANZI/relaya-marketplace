// Paquets et délais de la livraison, portage fidèle de moteurs/belivay_moteurs/paquets.py (DP-62 : O-01, RNF-03 ; v6) :
// - heure limite : « C'est prêt » le plus ancien + 5 h dans les heures de service (lundi au samedi, 8 h à 18 h) ; vers un
//   relais, au plus tard sa fermeture − 15 min ; au-delà de la fin de service, le jour de service suivant à 10 h ;
// - publication : dès 5 colis à son créneau, au 2e créneau quel que soit le nombre, toujours avant l'heure limite moins
//   la durée de la tournée ; à domicile, chaque commande seule, sans attendre ;
// - échéances : priorité 5 min, acceptation 15 min, ramassage 1 h 30 après l'acceptation.
// BelivaY n'affecte jamais un livreur : le paquet est publié à l'entreprise, qui affecte le sien (v6).
import { DECALAGE_YAOUNDE_MS, HEURE, JOUR, MINUTE } from './temps'
import { LIVRAISON, type ParametresEntreprise } from './vigueur'

const local = (t: number) => new Date(t + DECALAGE_YAOUNDE_MS)
const jourSemaine = (t: number) => (local(t).getUTCDay() + 6) % 7
const minuit = (t: number) => Math.floor((t + DECALAGE_YAOUNDE_MS) / JOUR) * JOUR - DECALAGE_YAOUNDE_MS
const a = (t: number, heure: number, minutes = 0) => minuit(t) + heure * HEURE + minutes * MINUTE

function jourDeServiceSuivant(t: number, pe: ParametresEntreprise): number {
  let s = t + JOUR
  while (!pe.joursService.includes(jourSemaine(s))) s += JOUR
  return s
}

/** « C'est prêt » ramené dans les heures de service. */
export function debutDuDelai(pret: number, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  const enService = pe.joursService.includes(jourSemaine(pret))
  if (enService && pret < a(pret, pe.debutServiceH)) return a(pret, pe.debutServiceH)
  if (!enService || pret >= a(pret, pe.finServiceH)) return a(jourDeServiceSuivant(pret, pe), pe.debutServiceH)
  return pret
}

/** Heure limite de remise d'un groupe de colis (ENT-HEURE-LIMITE, O-01). `fermetureRelais` : [heure, minutes]. */
export function heureLimite(prets: number[], o: { fermetureRelais?: [number, number] } = {}, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  if (!prets.length) throw new RangeError("aucun colis : pas d'heure limite")
  const debut = Math.min(...prets.map((p) => debutDuDelai(p, pe)))
  let limite = debut + pe.delaiHeures * HEURE
  if (o.fermetureRelais) limite = Math.min(limite, a(debut, ...o.fermetureRelais) - pe.margeFermetureMin * MINUTE)
  if (limite > a(debut, pe.finServiceH) || limite <= debut) return a(jourDeServiceSuivant(debut, pe), pe.heureReportH)
  return limite
}

/** Délai tenu ⇔ remise strictement avant l'heure limite (« moins de 5 h »). */
export const enRetard = (remisLe: number, limite: number) => remisLe >= limite

export type MotifPublication = 'seuil' | 'deuxième créneau' | 'heure limite' | 'domicile'
export interface Publication {
  publier: boolean
  motif: MotifPublication | null
  auPlusTard: number | null
}

/** Faut-il publier le paquet maintenant (ENT-PUBLICATION, RNF-03) ? */
export function publication(colis: number, creneau: number, maintenant: number, limite: number | null, dureeTourneeMs: number | null, o: { domicile?: boolean } = {}, pe: ParametresEntreprise = LIVRAISON.entreprise): Publication {
  if (o.domicile) return { publier: true, motif: 'domicile', auPlusTard: null }
  if (colis < 1 || creneau < 1) throw new RangeError('un paquet a au moins un colis et un créneau')
  if (limite === null || dureeTourneeMs === null) throw new RangeError('paquet relais : heure limite et durée de tournée nécessaires')
  const auPlusTard = limite - dureeTourneeMs
  if (colis >= pe.seuilPublication) return { publier: true, motif: 'seuil', auPlusTard }
  if (creneau >= pe.creneauPublication) return { publier: true, motif: 'deuxième créneau', auPlusTard }
  if (maintenant >= auPlusTard) return { publier: true, motif: 'heure limite', auPlusTard }
  return { publier: false, motif: null, auPlusTard }
}

/** Délais de l'entreprise (ENT-DELAIS). */
export function echeances(publieLe: number, accepteLe: number | null = null, pe: ParametresEntreprise = LIVRAISON.entreprise) {
  return {
    prioriteJusquA: publieLe + pe.prioriteMin * MINUTE,
    accepterAvant: publieLe + pe.acceptationMin * MINUTE,
    ramasserAvant: accepteLe === null ? null : accepteLe + pe.ramassageMin * MINUTE,
  }
}
