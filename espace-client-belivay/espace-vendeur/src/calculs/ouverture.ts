// Calendrier d'ouverture de la boutique (VD05-R02, VD11-R13, REFVD-R134, DP-56 Q-38 et Q-53, P-6) : la préparation se
// compte en heures d'ouverture (horaires, « Fermer aujourd'hui », pause, fermetures programmées) ; échéance absolue en
// 24 heures d'ouverture ; « Plus de temps » (+ 1 h, + 2 h, demain à l'ouverture) et passage du livreur qui suit.
// Fonctions pures, partagées par la source (échéances) et les écrans (comptes à rebours vivants). Tests :
// ouverture.test.ts. À porter dans moteurs/ (Python) pour le serveur.
type Instant = number
type Jour = string // « 2026-09-21 »

export interface CalendrierBoutique {
  horaires: { jour: number; ouvert: boolean; de: string; a: string }[] // lundi = 0
  fermeeLe: Jour | null // « Fermer aujourd'hui » (jusqu'à la prochaine ouverture réelle, Q-39)
  fermetures: { du: Jour; au: Jour }[] // fermetures programmées (jours entiers)
  passages: { jours: number[]; de: string; a: string }[] // passage du livreur (lundi = 0)
}

const H = 3600 * 1000
const J = 24 * H
const DECALAGE = H // Yaoundé : UTC+1 toute l'année
const jourDe = (t: Instant): Jour => new Date(t + DECALAGE).toISOString().slice(0, 10)
const minuit = (j: Jour) => Date.parse(j + 'T00:00:00Z') - DECALAGE
const semaine = (j: Jour) => (new Date(j + 'T00:00:00Z').getUTCDay() + 6) % 7
const lendemain = (j: Jour): Jour => new Date(Date.parse(j + 'T00:00:00Z') + J).toISOString().slice(0, 10)
const aHeure = (j: Jour, hm: string) => minuit(j) + (Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))) * 60 * 1000

/** Plage d'ouverture d'un jour civil, ou null (jour fermé, « Fermer aujourd'hui », fermeture programmée). */
export function plageDuJour(j: Jour, c: CalendrierBoutique): [Instant, Instant] | null {
  const h = c.horaires.find((x) => x.jour === semaine(j))
  if (!h?.ouvert || c.fermeeLe === j || c.fermetures.some((f) => f.du <= j && j <= f.au)) return null
  return [aHeure(j, h.de), aHeure(j, h.a)]
}

/** Durée d'ouverture entre deux instants (temps restant, progression : PRE-04, REFVD-R134). */
export function heuresOuvertes(de: Instant, a: Instant, c: CalendrierBoutique): number {
  if (a <= de) return 0
  let total = 0
  for (let j = jourDe(de), n = 0; minuit(j) < a && n < 400; j = lendemain(j), n++) {
    const p = plageDuJour(j, c)
    if (p) total += Math.max(0, Math.min(a, p[1]) - Math.max(de, p[0]))
  }
  return total
}

/** Instant atteint après `duree` d'ouverture depuis `de` (échéance = début + 4 h ouvrées ; + 1 h ; absolue + 24 h). */
export function ajouterOuvertes(de: Instant, duree: number, c: CalendrierBoutique): Instant {
  let reste = duree
  for (let j = jourDe(de), n = 0; n < 400; j = lendemain(j), n++) {
    const p = plageDuJour(j, c)
    if (!p) continue
    const debut = Math.max(de, p[0])
    if (debut >= p[1]) continue
    if (reste <= p[1] - debut) return debut + reste
    reste -= p[1] - debut
  }
  return de + duree
}

/** Ouverture qui suit (ou l'instant même s'il tombe pendant l'ouverture) : début du délai d'une commande (E10). */
export const ouvertureSuivante = (t: Instant, c: CalendrierBoutique): Instant => ajouterOuvertes(t, 0, c)

/** La boutique est-elle ouverte à cet instant ? */
export function ouverteA(t: Instant, c: CalendrierBoutique): boolean {
  const p = plageDuJour(jourDe(t), c)
  return !!p && t >= p[0] && t < p[1]
}

/** Ouverture du jour d'ouverture qui suit le jour de `t` (« Demain à l'ouverture »). */
export function ouvertureDuJourSuivant(t: Instant, c: CalendrierBoutique): Instant {
  let j = lendemain(jourDe(t))
  for (let n = 0; n < 60; n++, j = lendemain(j)) {
    const p = plageDuJour(j, c)
    if (p) return p[0]
  }
  return minuit(j)
}

/** Premier passage du livreur dont la fin n'est pas encore passée à `t`, un jour où la boutique est ouverte. */
export function passageSuivant(t: Instant, c: CalendrierBoutique): { debut: Instant; fin: Instant } {
  let j = jourDe(t)
  for (let n = 0; n < 60; n++, j = lendemain(j)) {
    if (!plageDuJour(j, c)) continue
    for (const p of c.passages.filter((x) => x.jours.includes(semaine(j)))) {
      const s = { debut: aHeure(j, p.de), fin: aHeure(j, p.a) }
      if (s.fin > t) return s
    }
  }
  return { debut: t, fin: t }
}

export type ChoixDelai = '+1h' | '+2h' | 'demain'

/** Une nouvelle heure possible (VD05-R13) et son effet sur le passage du livreur (P-6). */
export interface OptionDelai {
  choix: ChoixDelai
  echeance: Instant
  possible: boolean // au-delà de l'échéance absolue : grisée et refusée (DEL-03)
  ramassage: { debut: Instant; fin: Instant }
  effet: 'inchange' | 'attend' | 'suivant' // le livreur passe toujours · attendra la fin · créneau suivant
}

/** Trois choix : + 1 h, + 2 h (heures d'ouverture), demain à l'ouverture ; effet sur le ramassage (P-6). */
export function optionsDeDelai(echeance: Instant, absolue: Instant, c: CalendrierBoutique): { ramassage: { debut: Instant; fin: Instant }; options: OptionDelai[] } {
  const prevu = passageSuivant(echeance, c)
  const option = (choix: ChoixDelai, e: Instant): OptionDelai => {
    const effet = e <= prevu.debut ? 'inchange' : e < prevu.fin ? 'attend' : 'suivant'
    return { choix, echeance: e, possible: e <= absolue, ramassage: effet === 'suivant' ? passageSuivant(e, c) : prevu, effet }
  }
  return {
    ramassage: prevu,
    options: [option('+1h', ajouterOuvertes(echeance, H, c)), option('+2h', ajouterOuvertes(echeance, 2 * H, c)), option('demain', ouvertureDuJourSuivant(echeance, c))],
  }
}
