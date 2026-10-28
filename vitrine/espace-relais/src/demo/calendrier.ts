// DONNÉES DE DÉMONSTRATION — le calendrier du relais, lu par la garde, la session et les fermetures : horaires
// structurés 7 jours + pause (jeu d'essai), fermetures déclarées. Un jour fermé compte dans le rang de garde et n'est
// jamais facturé (GARDE-FERME) ; une fermeture imprévue du jour ferme le relais jusqu'à sa réouverture.
import { horaires, type HorairesRelais } from '../calculs/garde'
import { aHeure, ajouterJours, jourDe, jourSemaine, minutesDe, minutesDuJour, type Jour } from '../calculs/temps'
import type { Instant } from '../donnees/communs'
import type { Fermeture } from '../donnees/domaines/fermeture'
import type { PlageJour } from '../donnees/domaines/relais'
import { HORAIRES, h } from './jeu-essai'
import { scenario } from './scenario'
import { magasin } from './stockage'

export const etatCalendrier = magasin('calendrier', () => ({
  semaine: HORAIRES as PlageJour[],
  demandeHoraires: null as { semaine: PlageJour[]; le: Instant } | null,
  fermetures: (scenario() === 'ferme'
    ? [{ id: 'F-031', type: 'imprevue_jour', motif: 'maladie', du: '2026-10-13', au: '2026-10-13', rouvreA: h(8, 0) + 24 * 3600_000, duree: 'moins_24h', justificatif: null, declareePar: 'RM', statut: 'en_cours', colisConcernes: 0, declareeA: h(13, 30) }]
    : [{ id: 'F-029', type: 'programmee', motif: 'conge', du: '2026-10-24', au: '2026-10-24', rouvreA: null, duree: 'moins_24h', justificatif: null, declareePar: 'RM', statut: 'prevue', colisConcernes: 0, declareeA: h(9, 15) - 3 * 24 * 3600_000 }]) as (Fermeture & { declareeA: Instant })[],
}))

const fermeLeJour = (j: Jour) => etatCalendrier.lire().fermetures.some((f) => f.statut !== 'annulee' && f.type === 'programmee' && f.du <= j && j <= f.au)
const fermeeImprevue = (t: Instant) => etatCalendrier.lire().fermetures.find((f) => f.statut !== 'annulee' && f.type === 'imprevue_jour' && f.du <= jourDe(t) && jourDe(t) <= f.au && (f.rouvreA === null || t < f.rouvreA)) ?? null

/** Horaires du relais pour la garde (jours fermés de la semaine et fermetures déclarées, imprévues comprises). */
export function horairesGarde(): HorairesRelais {
  const c = etatCalendrier.lire()
  const fermes = c.semaine.filter((p) => p.ferme).map((p) => p.jour)
  const jours: Jour[] = []
  for (const f of c.fermetures) if (f.statut !== 'annulee') for (let j = f.du; j <= f.au; j = ajouterJours(j, 1)) jours.push(j)
  const ouvre = c.semaine.find((p) => !p.ferme)!
  return horaires(minutesDe(ouvre.ouverture!), minutesDe(ouvre.fermeture!), fermes, jours)
}

/** Le relais est-il ouvert à cet instant (horaires, pause, fermetures) ; heure de fermeture du jour ; prochaine ouverture. */
export function ouvertA(t: Instant): { ouvert: boolean; fermeA: string | null; rouvreLe: Instant | null } {
  const plage = (j: Jour) => etatCalendrier.lire().semaine[jourSemaine(j)]
  const j = jourDe(t)
  const p = plage(j)
  const m = minutesDuJour(t)
  const imprevue = fermeeImprevue(t)
  const ouvert = !imprevue && !p.ferme && !fermeLeJour(j) && m >= minutesDe(p.ouverture!) && m < minutesDe(p.fermeture!) && !(p.pause && m >= minutesDe(p.pause.de) && m < minutesDe(p.pause.a))
  if (ouvert) return { ouvert, fermeA: p.fermeture, rouvreLe: null }
  if (imprevue?.rouvreA) return { ouvert, fermeA: null, rouvreLe: imprevue.rouvreA }
  // Prochaine ouverture : fin de la pause aujourd'hui, sinon le premier jour ouvert suivant.
  if (!p.ferme && !fermeLeJour(j) && p.pause && m >= minutesDe(p.pause.de) && m < minutesDe(p.pause.a)) return { ouvert, fermeA: null, rouvreLe: t + (minutesDe(p.pause.a) - m) * 60_000 }
  for (let k = m < minutesDe(p.ouverture ?? '00:00') ? 0 : 1; k < 30; k++) {
    const d = ajouterJours(j, k)
    const q = plage(d)
    if (!q.ferme && !fermeLeJour(d)) return { ouvert, fermeA: null, rouvreLe: aHeure(d, minutesDe(q.ouverture!)) }
  }
  return { ouvert, fermeA: null, rouvreLe: null }
}
