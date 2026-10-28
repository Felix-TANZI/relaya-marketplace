// DONNÉES DE DÉMONSTRATION — domaine « departs » : colis à faire partir (renvois du premier jour ouvert après le 7e
// jour, retours validés, transferts, refus, décisions de constat) et collectes du livreur au relais (R1 faite à
// 11 h 27, A4 prévue vers 15 h 25, au même passage que le dépôt du lot PQ-Z1-261013-003). Chaque colis prévu est
// scanné quand il est tendu au livreur, ou marqué absent avec un motif (DEP-02) ; la sortie se valide avec une photo
// et le PIN du membre (changement de main, D15) ; elle n'est effective qu'à la confirmation du livreur (DEP-03) :
// alors seulement les colis quittent le stock et les places se libèrent.
// Pont avec l'application du livreur (src/demo/pont.ts) : sorties prêtes, colis présenté, manquant et sortie validée
// partent vers lui ; ses confirmations colis par colis reviennent (pont-livreur.departsVusParLeLivreur). Quand son
// application n'est pas ouverte dans ce navigateur (battement de présence), la démonstration simule sa confirmation
// quelques secondes après la validation.
import { PARAMETRES } from '../calculs/registre'
import { aHeure } from '../calculs/temps'
import type { Acteur, Instant, Origine } from '../donnees/communs'
import type { ColisRelais, MotifSortie } from '../donnees/domaines/colis'
import type { Collecte, Departs, DomaineDeparts, LigneDepart, MotifAbsence, Passage, ReglesDeparts, SortieFaite } from '../donnees/domaines/departs'
import { horairesGarde } from './calendrier'
import { FILTRES, appliquer, etatColis, preuve, tousLesColis, unColis } from './colis'
import { maintenant } from './horloge'
import { COLLECTES, ENTREPRISE, LIVREUR, LOTS } from './jeu-essai'
import { acteurActuel, verifierPin } from './session'
import { magasin, repondre } from './stockage'
import type { MotifSortiePont } from './pont'
import { departsVusParLeLivreur } from './pont-livreur'
import { livreurOuvert, pontColisManquant as publierManquant, pontColisPresente, pontDepartsPrets, pontNonRetire, pontSortieValidee as publierSortie } from './pont-relais'
import { lotsPont } from './lots-pont'

const P = PARAMETRES.relais
/** DÉMONSTRATION : délai réel entre la validation au relais et la confirmation simulée du livreur. */
const CONFIRMATION_DEMO_MS = 4000
const LIVREUR_ACTEUR: Acteur = { type: 'livreur', nom: LIVREUR, membreId: null }

interface CollecteDemo {
  presentes: string[]
  absents: Collecte['absents']
  valideeA: Instant | null
  valideeReel: number | null
  cleValidation: string | null
  photo: string | null
  termineeA: Instant | null
  confirmes: string[]
  placesLiberees: number
}

/** Colis prévus à une collecte (motif de sortie déjà fixé par le serveur). */
const prevus = (collecteId: string, l: ColisRelais[] = tousLesColis()) => l.filter((c) => c.sortie?.collecte === collecteId).map((c) => c.id)

export const etatDeparts = magasin('departs', () => {
  const l = tousLesColis()
  return {
    // Les collectes du jeu d'essai seules (la forme gardée ne dépend pas des courses de retour venues du pont).
    collectes: Object.fromEntries(
      COLLECTES.filter((c) => !c.id.includes('#')).map((c): [string, CollecteDemo] => {
        const faits = c.termineeA ? prevus(c.id, l) : []
        return [c.id, { presentes: faits, absents: [], valideeA: c.termineeA, valideeReel: null, cleValidation: null, photo: null, termineeA: c.termineeA, confirmes: faits, placesLiberees: 0 }]
      }),
    ),
    cles: [] as string[],
  }
})
// Une collecte d'une course de retour (pont) reçoit son état vide à sa première lecture.
const lireDeparts = etatDeparts.lire
etatDeparts.lire = () => {
  const s = lireDeparts()
  if (COLLECTES.every((c) => s.collectes[c.id])) return s
  return etatDeparts.ecrire((e) => {
    for (const c of COLLECTES) e.collectes[c.id] ??= { presentes: [], absents: [], valideeA: null, valideeReel: null, cleValidation: null, photo: null, termineeA: null, confirmes: [], placesLiberees: 0 }
  })
}
const deja = (o: Origine) => etatDeparts.lire().cles.includes(o.cle)

/** Motif de sortie d'un colis à faire partir (DEP-01). */
export function motifDe(c: ColisRelais): MotifSortie {
  if (c.sortie?.motif) return c.sortie.motif
  if (c.etat === 'retour_depose') return 'retour'
  if (c.etat === 'transfert_demande') return 'transfert'
  if (c.etat === 'a_renvoyer') return 'renvoi'
  return 'refus'
}

/** PR-DEP-ALERTE-H : départ en retard signalé. */
const alerteH = () => P.departAlerteH

function regles(): ReglesDeparts {
  return { pinLongueur: PARAMETRES.connexion.pinLongueur, alerteH: alerteH(), transfert: P.transfert, gardeRenvoi: P.garde.grille.reduce((a, b) => a + b, 0), renvoi: P.garde.renvoi }
}

/** Confirmation du livreur (DEP-03) : la garde lui passe, les colis quittent le stock, les places se libèrent. */
function confirmer(collecteId: string, le: Instant) {
  const k = etatDeparts.lire().collectes[collecteId]
  if (!k || k.termineeA || !k.valideeA) return
  const o: Origine = { cle: (k.cleValidation ?? collecteId) + ':livreur', heure: le, position: null }
  let places = 0
  const confirmes: string[] = []
  for (const id of k.presentes) {
    const avant = unColis(id)
    if (!avant) continue
    const motif = motifDe(avant)
    const t = appliquer(id, 'sortie', { photos: 1, pinOk: true }, o, LIVREUR_ACTEUR, (x) => {
      x.sortie = { motif, destination: x.sortie?.destination ?? x.retour?.destination ?? null, collecte: collecteId, le }
      x.emplacement = null
      if (k.photo) preuve(x, 'sortie', [k.photo], acteurActuel(), k.valideeA!)
    }, collecteId)
    if (t.ok) {
      confirmes.push(id)
      if (avant.etat !== 'retour_depose') places += avant.places
    }
  }
  etatDeparts.ecrire((e) => {
    const x = e.collectes[collecteId]
    x.termineeA = le
    x.confirmes = confirmes
    x.placesLiberees = places
  })
}

/** Sorties validées que le livreur a confirmées (chaque colis présenté : pris ou signalé manquant) par le pont ; repli de
 * démonstration quand son application n'est pas ouverte : confirmées CONFIRMATION_DEMO_MS après la validation. Appelé à
 * chaque lecture, et par minuteur. */
export function confirmerEnAttente() {
  const reel = Date.now()
  const ouvert = livreurOuvert()
  for (const [id, k] of Object.entries(etatDeparts.lire().collectes)) {
    if (!k.valideeA || k.termineeA) continue
    const vus = departsVusParLeLivreur(id)
    if (k.presentes.length && k.presentes.every((c) => vus.confirmes.includes(c) || vus.manquants.includes(c))) confirmer(id, Math.max(maintenant(), k.valideeA))
    else if (!ouvert && k.valideeReel !== null && reel - k.valideeReel >= CONFIRMATION_DEMO_MS) confirmer(id, k.valideeA + (reel - k.valideeReel))
  }
}

const MOTIF_PONT: Record<MotifSortie, MotifSortiePont> = { renvoi: 'renvoi', retour: 'retour', transfert: 'transfert', refus: 'refus_comptoir', fermeture: 'fermeture' }
/** Le serveur annonce au livreur et à l'entreprise les colis prêts à partir à chaque collecte encore ouverte (une fois
 * par contenu : la clé porte la liste des colis). */
/** Colis d'une commande du client (lot venu du pont) passés « à renvoyer » : le serveur prévient le client et le vendeur. */
export function annoncerRenvoisPont(l: ColisRelais[] = tousLesColis()) {
  const lots = lotsPont.lire().lots.map((x) => x.id)
  for (const c of l)
    if (c.etat === 'a_renvoyer' && c.arrivee.lot && lots.includes(c.arrivee.lot))
      pontNonRetire(c.id, c.garde?.rang ?? 8, { cle: 'non-retire-' + c.id, heure: maintenant(), position: null })
}
function annoncerDepartsPrets(l: ColisRelais[]) {
  for (const c of COLLECTES) {
    const k = etatDeparts.lire().collectes[c.id]
    if (k.termineeA) continue
    const colis = prevus(c.id, l)
      .map((id) => l.find((x) => x.id === id)!)
      .filter((x) => FILTRES.a_faire_partir(x))
      .map((x) => ({ id: x.id, classe: x.classe, motif: MOTIF_PONT[motifDe(x)] }))
    if (colis.length) pontDepartsPrets(c.id, colis, { cle: 'departs-prets-' + c.id, heure: maintenant(), position: null })
  }
}

function vueCollecte(c: (typeof COLLECTES)[number], l: ColisRelais[]): Collecte {
  const k = etatDeparts.lire().collectes[c.id]
  return { id: c.id, lot: c.lot, entreprise: ENTREPRISE, livreur: LIVREUR, heurePrevue: c.heurePrevue, colis: prevus(c.id, l), presentes: k.presentes, termineeA: k.termineeA, absents: k.absents, valideeA: k.valideeA, confirmes: k.confirmes, placesLiberees: k.placesLiberees }
}

function lignes(l: ColisRelais[]): LigneDepart[] {
  const t = maintenant()
  const h = alerteH()
  const ouverture = horairesGarde().ouverture
  return l.filter(FILTRES.a_faire_partir).map((c) => {
    const motif = motifDe(c)
    const depuis = c.etat === 'a_renvoyer' && c.garde?.renvoiLe ? aHeure(c.garde.renvoiLe, ouverture) : null
    return {
      colis: c,
      motif,
      destination: c.sortie?.destination ?? c.retour?.destination ?? null,
      collecte: c.sortie?.collecte ?? null,
      depuis,
      enRetard: depuis !== null && t - depuis > h * 3600_000,
      fraisTransfert: motif === 'transfert' ? P.transfert[c.classe] : null,
    }
  })
}

function passages(l: ColisRelais[]): Passage[] {
  const t = maintenant()
  const out: Passage[] = []
  for (const lot of LOTS) {
    const depose = l.filter((c) => c.etat === 'attendu' && c.arrivee.lot === lot.id).length
    const col = lot.collecte ? COLLECTES.find((c) => c.id === lot.collecte) : null
    const k = col ? etatDeparts.lire().collectes[col.id] : null
    const reprend = col && !k?.termineeA ? prevus(col.id, l).filter((id) => !k?.absents.some((a) => a.colis === id)).length : 0
    if (!depose && !reprend) continue
    out.push({ heure: lot.heurePrevue, entreprise: ENTREPRISE, depose, reprend, lot: lot.id, collecte: col && !k?.termineeA ? col.id : null })
  }
  // Collectes sans dépôt au même passage.
  for (const c of COLLECTES) {
    if (LOTS.some((x) => x.collecte === c.id) || etatDeparts.lire().collectes[c.id].termineeA) continue
    out.push({ heure: c.heurePrevue, entreprise: ENTREPRISE, depose: 0, reprend: prevus(c.id, l).length, lot: null, collecte: c.id })
  }
  return out.filter((p) => p.heure >= t - 3600_000 || p.collecte).sort((a, b) => a.heure - b.heure)
}

function partis(): SortieFaite[] {
  const e = etatDeparts.lire().collectes
  return COLLECTES.filter((c) => e[c.id].termineeA)
    .map((c): SortieFaite => {
      const k = e[c.id]
      const colis = k.confirmes
        .map((id) => unColis(id))
        .filter((x): x is ColisRelais => !!x)
        .map((x) => ({ id: x.id, reference: x.retour?.reference ?? x.id, motif: motifDe(x), destination: x.sortie?.destination ?? x.retour?.destination ?? null, classe: x.classe }))
      return { collecte: c.id, le: k.termineeA!, colis, livreur: LIVREUR, entreprise: ENTREPRISE, placesLiberees: k.placesLiberees }
    })
    .sort((a, b) => b.le - a.le)
}

/** Garde-fous communs d'un geste sur une collecte : collecte connue, pas validée, colis prévu et encore à faire partir. */
function controler(collecteId: string, colisId: string): { ok: true } | { ok: false; raison: 'introuvable' | 'deja_validee' | 'pas_a_faire_partir' | 'pas_dans_la_collecte' } {
  const k = etatDeparts.lire().collectes[collecteId]
  const c = unColis(colisId)
  if (!k || !c) return { ok: false, raison: 'introuvable' }
  if (k.valideeA) return { ok: false, raison: 'deja_validee' }
  if (!FILTRES.a_faire_partir(c)) return { ok: false, raison: 'pas_a_faire_partir' }
  if (!prevus(collecteId).includes(colisId)) return { ok: false, raison: 'pas_dans_la_collecte' }
  return { ok: true }
}

export const demoDeparts: DomaineDeparts = {
  departs() {
    confirmerEnAttente()
    const l = tousLesColis()
    annoncerDepartsPrets(l)
    annoncerRenvoisPont(l)
    const d: Departs = {
      aFairePartir: l.filter(FILTRES.a_faire_partir),
      collectes: COLLECTES.map((c) => vueCollecte(c, l)),
      lignes: lignes(l),
      passages: passages(l),
      partis: partis(),
    }
    return repondre(d)
  },
  regles: () => repondre(regles()),
  async scanner(collecteId, colisId, o) {
    if (deja(o)) return { ok: true }
    const v = controler(collecteId, colisId)
    if (!v.ok) return v
    etatDeparts.ecrire((e) => {
      const k = e.collectes[collecteId]
      k.absents = k.absents.filter((a) => a.colis !== colisId)
      if (!k.presentes.includes(colisId)) k.presentes.push(colisId)
      e.cles.push(o.cle)
    })
    pontSortieScannee(collecteId, colisId, o)
    return { ok: true }
  },
  async annulerScan(collecteId, colisId, o) {
    if (deja(o)) return { ok: true }
    const v = controler(collecteId, colisId)
    if (!v.ok) return v
    etatDeparts.ecrire((e) => {
      const k = e.collectes[collecteId]
      k.presentes = k.presentes.filter((x) => x !== colisId)
      e.cles.push(o.cle)
    })
    return { ok: true }
  },
  async marquerAbsent(collecteId, colisId, motif: MotifAbsence, o) {
    if (deja(o)) return { ok: true }
    const v = controler(collecteId, colisId)
    if (!v.ok) return v
    etatDeparts.ecrire((e) => {
      const k = e.collectes[collecteId]
      k.presentes = k.presentes.filter((x) => x !== colisId)
      k.absents = [...k.absents.filter((a) => a.colis !== colisId), { colis: colisId, motif, le: o.heure }]
      e.cles.push(o.cle)
    })
    etatColis.ecrire((e) => void e.colis[colisId]?.journal.push({ le: o.heure, action: 'depart_absent', par: acteurActuel(), signe: false, detail: `${collecteId} · ${motif}`, cle: o.cle }))
    pontColisManquant(collecteId, colisId, motif, o)
    return { ok: true }
  },
  async annulerAbsent(collecteId, colisId, o) {
    if (deja(o)) return { ok: true }
    const v = controler(collecteId, colisId)
    if (!v.ok) return v
    etatDeparts.ecrire((e) => {
      const k = e.collectes[collecteId]
      k.absents = k.absents.filter((a) => a.colis !== colisId)
      e.cles.push(o.cle)
    })
    return { ok: true }
  },
  async valider(collecteId, photo, pin, o) {
    const k = etatDeparts.lire().collectes[collecteId]
    if (!k) return { ok: false, raison: 'introuvable' }
    if (k.termineeA && k.cleValidation === o.cle) return { ok: true, partis: k.confirmes.length }
    if (k.termineeA) return { ok: false, raison: 'deja_partie' }
    if (k.valideeA) return k.cleValidation === o.cle ? { ok: true, partis: k.presentes.length } : { ok: false, raison: 'deja_validee' }
    const restants = prevus(collecteId).filter((id) => {
      const c = unColis(id)
      return !!c && FILTRES.a_faire_partir(c)
    })
    if (!restants.every((id) => k.presentes.includes(id) || k.absents.some((a) => a.colis === id))) return { ok: false, raison: 'colis_non_traites' }
    if (!k.presentes.length) return { ok: false, raison: 'rien_a_valider' }
    if (!photo) return { ok: false, raison: 'photo_manquante' }
    if (verifierPin(pin) !== 'ok') return { ok: false, raison: 'pin_requis' }
    const presentes = [...k.presentes]
    etatDeparts.ecrire((e) => {
      Object.assign(e.collectes[collecteId], { valideeA: o.heure, valideeReel: Date.now(), cleValidation: o.cle, photo })
      e.cles.push(o.cle)
    })
    etatColis.ecrire((e) => {
      for (const id of presentes) e.colis[id]?.journal.push({ le: o.heure, action: 'sortie_validee', par: acteurActuel(), signe: true, detail: collecteId, cle: o.cle })
    })
    pontSortieValidee(collecteId, presentes, photo, o)
    // Minuteur (ne dépend pas de l'horloge : une horloge figée de test confirme quand même) ; relu au rechargement.
    if (typeof window !== 'undefined') setTimeout(() => (livreurOuvert() ? confirmerEnAttente() : confirmer(collecteId, o.heure + CONFIRMATION_DEMO_MS)), CONFIRMATION_DEMO_MS)
    return { ok: true, partis: presentes.length }
  },
}

// ── Pont avec l'application du livreur (branché par l'agent « connexions », src/demo/pont.ts) ─────────────────
/** Colis tendu au livreur : il paraît « présenté » dans sa collecte (bouton « Confirmer » de son côté). */
function pontSortieScannee(collecteId: string, colisId: string, o: Origine) {
  // pont : relay.departure.scanned (POST /api/relay/departures/{id}/scan → collecte du livreur, colis présenté)
  pontColisPresente(collecteId, colisId, o)
}
/** Sortie validée au relais (photo, PIN) : le livreur confirme chaque colis sur son téléphone (DEP-03). */
function pontSortieValidee(collecteId: string, colis: string[], photo: string, o: Origine) {
  // pont : relay.departure.validated (POST /api/relay/departures/{id}/validate → attente de
  // POST /api/courier/stops/{id}/departures/{colis}/confirm ; la confirmation revient par relay.departure.confirmed)
  void photo // la photo reste au relais (preuve de sortie) ; seule la validation part
  publierSortie(collecteId, colis, o)
}
/** Colis prévu qui ne part pas : marqué manquant chez le livreur ; « introuvable » alerte le support. */
function pontColisManquant(collecteId: string, colisId: string, motif: MotifAbsence, o: Origine) {
  // pont : relay.departure.missing (colis manquant dans la collecte du livreur ; relay.departure.overdue après
  // PR-DEP-ALERTE-H pour un renvoi, DEP-05)
  void motif // le motif reste au relais (console) ; le livreur voit le colis manquant
  publierManquant(collecteId, colisId, o)
}
