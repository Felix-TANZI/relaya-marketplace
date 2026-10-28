// DONNÉES DE DÉMONSTRATION — domaine « fermeture » : le « serveur » des fermetures du relais. Les fermetures en cours et
// à venir vivent dans le calendrier (src/demo/calendrier.ts, lu par la garde et la session : un jour fermé n'est jamais
// facturé, le relais n'apparaît pas ouvert) ; les fermetures passées du jeu d'essai et les justificatifs sont gardés
// ici. Règles : FER-01 à FER-07, DP-42, ARL-20 (voir src/donnees/domaines/fermeture.ts) ; délais lus au registre.
import { HEURE, JOUR, aHeure, ajouterJours, ecartJours, jourSemaine, minutesDe, yaounde, type Jour } from '../calculs/temps'
import type { Instant } from '../donnees/communs'
import type { Membre } from '../donnees/domaines/session'
import type { ApercuFermeture, DemandeFermeture, DomaineFermeture, DureeFermeture, Fermeture, RefusFermeture } from '../donnees/domaines/fermeture'
import { REGLES } from '../calculs/regles-incidents'
import { etatCalendrier } from './calendrier'
import { tousLesColis } from './colis'
import { aujourdhui, maintenant } from './horloge'
import { sansHistorique } from './scenario'
import { membreActuel } from './session'
import { pontFermeture } from './pont-relais'
import { magasin, repondre } from './stockage'

const R = REGLES
/** Droit « Fermeture imprévue du jour » (le gérant a tous les droits) ; le serveur refait le contrôle de l'écran. */
const droitDuJour = (m: Membre | null) => !!m && (m.role === 'proprietaire' || m.droits.includes('fermeture_jour'))
type Gardee = Fermeture & { declareeA: Instant }

/** Fermetures passées du jeu d'essai (affichage seulement : elles ne touchent plus aucune garde). */
const passees = (): Gardee[] =>
  sansHistorique()
    ? []
    : [
        { id: 'F-024', type: 'programmee', motif: 'maladie', du: '2026-09-21', au: '2026-09-22', rouvreA: null, duree: 'un_a_trois_jours', justificatif: 'ph-just-024', justificatifAvant: null, declareePar: 'RM', declareeA: yaounde(2026, 9, 21, 7, 10), statut: 'terminee', colisConcernes: 9 },
        { id: 'F-019', type: 'programmee', motif: 'conge', du: '2026-08-15', au: '2026-08-15', rouvreA: null, duree: 'moins_24h', justificatif: null, justificatifAvant: null, declareePar: 'RM', declareeA: yaounde(2026, 8, 12, 18, 30), statut: 'terminee', colisConcernes: 0 },
      ]

export const etatFermeture = magasin('fermeture', () => ({ justificatifs: {} as Record<string, string>, cles: [] as string[] }))

const nbJours = (du: Jour, au: Jour) => ecartJours(du, au) + 1
export const dureeDe = (du: Jour, au: Jour): DureeFermeture => (du === au ? 'moins_24h' : nbJours(du, au) <= R.masqueJ ? 'un_a_trois_jours' : 'plus_de_trois_jours')

const plage = (j: Jour) => etatCalendrier.lire().semaine[jourSemaine(j)]
const actives = (sauf?: string) => etatCalendrier.lire().fermetures.filter((f) => f.statut !== 'annulee' && f.id !== sauf)

/** Prochaine ouverture après le jour donné : premier jour ouvert de la semaine déclarée, hors autre fermeture. */
function prochaineOuverture(apres: Jour, sauf?: string): Instant | null {
  for (let k = 1; k < 60; k++) {
    const d = ajouterJours(apres, k)
    const p = plage(d)
    if (!p.ferme && p.ouverture && !actives(sauf).some((f) => f.type === 'programmee' && f.du <= d && d <= f.au)) return aHeure(d, minutesDe(p.ouverture))
  }
  return null
}

/** Justificatif attendu (FER-01) : maladie sous PR-FER-JUSTIF-MALADIE-H, urgence familiale sous PR-FER-JUSTIF-URGENCE-J. */
const justificatifAvant = (motif: Fermeture['motif'], declareeA: Instant): Instant | null =>
  motif === 'maladie' ? declareeA + R.justifMaladieH * HEURE : motif === 'urgence_familiale' ? declareeA + R.justifUrgenceJ * JOUR : null

function statut(f: Gardee, t: Instant): Fermeture['statut'] {
  if (f.statut === 'annulee') return 'annulee'
  const j = aujourdhui()
  if (f.type === 'imprevue_jour') return f.rouvreA !== null && f.rouvreA <= t ? 'terminee' : f.du <= j ? 'en_cours' : 'prevue'
  return f.au < j ? 'terminee' : f.du <= j ? 'en_cours' : 'prevue'
}

const remettables = () => tousLesColis().filter((c) => c.etat === 'en_stock' || c.etat === 'dernier_jour' || c.etat === 'en_groupage').length
const attendusLe = (du: Jour, au: Jour) => (du <= aujourdhui() && aujourdhui() <= au ? tousLesColis().filter((c) => c.etat === 'attendu').length : 0)

function refus(f: DemandeFermeture, t: Instant): RefusFermeture | null {
  const m = membreActuel()
  const j = aujourdhui()
  if (f.type === 'programmee' ? m?.role !== 'proprietaire' : !droitDuJour(m)) return 'droit_refuse'
  if (f.au < f.du || f.du < j || (f.type === 'imprevue_jour' && (f.du !== j || f.au !== j))) return 'dates_invalides'
  if (f.type === 'imprevue_jour' && f.motif === 'conge') return 'motif_interdit'
  if (f.motif === 'conge') {
    const p = plage(f.du)
    const debut = aHeure(f.du, minutesDe(p.ouverture ?? '00:00'))
    if (debut - t < R.congePreavisH * HEURE) return 'preavis_insuffisant'
  }
  if (actives().some((x) => statut(x, t) !== 'terminee' && x.du <= f.au && f.du <= x.au)) return 'chevauchement'
  return null
}

function apercu(f: DemandeFermeture, t: Instant): ApercuFermeture {
  const duree = dureeDe(f.du, f.au)
  const transfert = duree !== 'moins_24h'
  return {
    duree,
    rouvreLe: f.au >= f.du ? prochaineOuverture(f.au) : null,
    colisEnStock: remettables(),
    colisAttendus: attendusLe(f.du, f.au),
    transfert,
    masque: nbJours(f.du, f.au) > R.masqueJ,
    appelBelivay: nbJours(f.du, f.au) > R.appelJ,
    sansNouveauxColisDes: transfert ? ajouterJours(f.du, -1) : null,
    justificatifAvant: justificatifAvant(f.motif, t),
    refus: refus(f, t),
  }
}

export const demoFermeture: DomaineFermeture = {
  fermetures() {
    const t = maintenant()
    const just = etatFermeture.lire().justificatifs
    const l = [...etatCalendrier.lire().fermetures, ...passees()].map((f) => {
      const s = statut(f, t)
      return {
        ...f,
        statut: s,
        rouvreA: f.rouvreA ?? prochaineOuverture(f.au, f.id),
        justificatif: just[f.id] ?? f.justificatif ?? null,
        justificatifAvant: f.justificatifAvant ?? justificatifAvant(f.motif, f.declareeA),
        colisConcernes: s === 'terminee' || s === 'annulee' ? f.colisConcernes : remettables(),
      } as Fermeture
    })
    return repondre(l.sort((a, b) => (a.du < b.du ? 1 : -1)))
  },
  apercu: (f) => repondre(apercu(f, maintenant())),
  async declarer(f, o) {
    const id = 'F-' + o.cle.replace(/-/g, '').slice(0, 6).toUpperCase()
    const deja = etatCalendrier.lire().fermetures.find((x) => x.id === id)
    if (deja) return { ok: true, id, rouvreLe: deja.rouvreA }
    const a = apercu(f, o.heure)
    if (a.refus) return { ok: false, raison: a.refus }
    const m = membreActuel()!
    const rouvreA = f.type === 'imprevue_jour' ? a.rouvreLe : null
    etatCalendrier.ecrire((x) =>
      void x.fermetures.push({ id, type: f.type, motif: f.motif, du: f.du, au: f.au, rouvreA, duree: a.duree, justificatif: null, justificatifAvant: a.justificatifAvant, declareePar: m.initiales, declareeA: o.heure, statut: f.du <= aujourdhui() ? 'en_cours' : 'prevue', colisConcernes: a.colisEnStock }),
    )
    // pont : relay.closure.declared (client : « rouvre demain » ou autre relais ; entreprise : paquets republiés ; console)
    pontFermeture(f.du, f.au, f.motif, o)
    return { ok: true, id, rouvreLe: a.rouvreLe }
  },
  async annuler(id, o) {
    const f = etatCalendrier.lire().fermetures.find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'introuvable' }
    if (f.statut === 'annulee') return { ok: true }
    if (f.type === 'programmee' && membreActuel()?.role !== 'proprietaire') return { ok: false, raison: 'droit_refuse' }
    if (statut(f, o.heure) !== 'prevue') return { ok: false, raison: 'deja_commencee' }
    etatCalendrier.ecrire((x) => void (x.fermetures.find((y) => y.id === id)!.statut = 'annulee'))
    return { ok: true }
  },
  async rouvrir(id, o) {
    const f = etatCalendrier.lire().fermetures.find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'introuvable' }
    if (!droitDuJour(membreActuel())) return { ok: false, raison: 'droit_refuse' }
    if (f.type !== 'imprevue_jour' || statut(f, o.heure) !== 'en_cours') return statut(f, o.heure) === 'terminee' ? { ok: true } : { ok: false, raison: 'pas_en_cours' }
    etatCalendrier.ecrire((x) => void (x.fermetures.find((y) => y.id === id)!.rouvreA = o.heure))
    return { ok: true }
  },
  async joindreJustificatif(id, photo) {
    const f = [...etatCalendrier.lire().fermetures, ...passees()].find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'introuvable' }
    if (justificatifAvant(f.motif, f.declareeA) === null) return { ok: false, raison: 'non_demande' }
    etatFermeture.ecrire((x) => void (x.justificatifs[id] = photo))
    return { ok: true }
  },
}
