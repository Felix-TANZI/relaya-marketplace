// DONNÉES DE DÉMONSTRATION — domaine « reception » : les lots annoncés au relais (PQ-Z1-261013-001 reçu à 11 h 10,
// -003 attendu vers 15 h 15 avec la collecte A4, -011 vers 18 h 35) et leur réception au comptoir. Le code de dépôt
// n'est gardé que par son empreinte (« serveur ») ; le livreur le présente en QR (jeton BLV1 qui porte le code, comme
// son application : espace-livreur/src/demo/remises.ts) ou le dicte en 6 chiffres (DP-62). Les colis sont ceux du
// modèle central (src/demo/colis.ts). Le suivi du livreur (en route, en approche, déposé) vient de son application par
// le pont (src/demo/pont-livreur.ts).
// La confirmation du livreur (POST /api/courier/stops/{id}/relay-drop/confirm, après « accept-report » pour chaque
// réserve ou refus, PR-RC-08) arrive de son application par le pont (src/demo/pont-livreur.ts appelle
// confirmerParLeLivreur) quand elle est ouverte dans le même navigateur (battement de présence, pont.appliOuverte) ;
// sinon la démonstration la SIMULE quelques secondes après la validation. La garde passe alors au relais (REC-07), les
// clients sont prévenus (ARL-01) ; sans elle sous PR-LOT-CONFIRM-MIN, le support est alerté (minuteur du serveur réel).
import { PARAMETRES } from '../calculs/registre'
import { attribuerEmplacement, occupation, placesDuLot } from '../calculs/capacite'
import { PARAMETRES_MOTEURS } from '../calculs/parametres-moteurs'
import { colisDuLot as colisControle, controleReception, essaiDeCode, placesManquantes, type ResultatReception as ResultatControle } from '../calculs/reception'
import type { Instant, Origine, Photo } from '../donnees/communs'
import type { LotEnApproche } from '../donnees/domaines/aujourdhui'
import type { ColisRelais } from '../donnees/domaines/colis'
import type { DetailColisLot, DomaineReception, IssueScan, Lot, ReglesReception, ResultatColis } from '../donnees/domaines/reception'
import { appliquer, creerColis, empreinte, etatColis, groupeVu, occupationDuRelais, plan, preuve, resultatVersEvenement, tousLesColis } from './colis'
import { maintenant } from './horloge'
import { CODES_DEPOT, COLLECTES, ENTREPRISE, LIVREUR, LOTS, type LotJeu } from './jeu-essai'
import { etatRelais } from './relais'
import { relaisPasOuvert, scenario } from './scenario'
import { acteurActuel, verifierPin } from './session'
import { magasin, repondre } from './stockage'
import { livreurOuvert, pontCodeBloque, pontCodeVerifie, pontColisHorsLot, pontLotValide, pontResultatColis } from './pont-relais'
import { codeDemo } from './pont'

const P = PARAMETRES.relais
const PM = PARAMETRES_MOTEURS
const C = PARAMETRES.connexion
/** PR-LOT-CONFIRM-MIN : minutes laissées au livreur pour confirmer le lot avant l'alerte du support. */
const CONFIRMATION_MIN = PARAMETRES.relais.lotConfirmMin
/** Démonstration seulement : délai réel avant la confirmation simulée du livreur. */
const CONFIRMATION_DEMO_MS = 4000

// Données de démonstration propres à la réception : un colis de remplacement dans le lot de 15 h 15 (REC-13), et des
// étiquettes connues du « serveur » destinées à d'autres relais (PR-RC-04), pour l'essai d'un mauvais colis.
const REMPLACEMENTS = new Set(['BLV-00014-1'])
const AUTRES_RELAIS: Record<string, string> = { 'BLV-00017-1': 'Relais Melen Carrefour', 'BLV-00018-1': 'Relais Biyem-Assi Lycée' }
const REFERENCE = /^BLV-\d{5}-\d{1,2}$/
/** Client au téléphone éteint : l'avis d'arrivée n'est pas encore délivré (PR-RC-18 : la garde ne court pas). */
const AVIS_DIFFERE = new Set(['BLV-00009-1'])

interface LotDemo {
  suivi: LotEnApproche['suivi']
  arriveeEstimee: Instant | null
  empreinte: string
  ouvertA: Instant | null
  valideA: Instant | null
  confirmeParLivreurA: Instant | null
  enTrop: string[]
  scannes: string[]
  acceptes: string[]
  prevenus: Lot['prevenus']
}
const lotsDuJeu = (): LotJeu[] => (relaisPasOuvert() ? [] : scenario() === 'neuf' ? LOTS.filter((l) => l.id !== 'PQ-Z1-261013-011') : LOTS)

export const etatReception = magasin('reception', () => ({
  lots: Object.fromEntries(
    lotsDuJeu().map((l): [string, LotDemo] => [
      l.id,
      { suivi: l.suivi, arriveeEstimee: l.depotA ? null : l.heurePrevue, empreinte: empreinte('depot:' + (CODES_DEPOT[l.id] ?? codeDemo(l.id, 'depot'))), ouvertA: l.depotA ? l.depotA - 4 * 60_000 : null, valideA: l.depotA ? l.depotA + 3 * 60_000 : null, confirmeParLivreurA: l.depotA, enTrop: [], scannes: [], acceptes: [], prevenus: null },
    ]),
  ),
  // Codes de dépôt faux au comptoir (CODE-ESSAIS) : au 3e, saisie bloquée CODE-BLOCAGE-H heures, BelivaY alerté.
  faux: 0,
  bloqueJusqua: null as Instant | null,
  /** Réponses déjà données par clé d'idempotence (un code rejoué hors connexion ne compte jamais deux fois). */
  reponses: {} as Record<string, { ok: boolean; lot?: string; raison?: string }>,
}))

// ── Pont vers l'application du livreur ──────────────────────────────────────────────────────────────────────────
/** Ce que le relais publie vers le livreur (relay.drop_code.verified, résultat par colis, relay.drop.validated). */
export type VersLivreur =
  | { type: 'code_verifie'; lot: string; arret: string | null; le: Instant }
  | { type: 'resultat_colis'; lot: string; colis: string; resultat: ResultatColis['resultat'] | 'en_trop' | 'pas_pour_ce_relais'; photos: number; motif?: string | null; le: Instant }
  | { type: 'code_bloque'; jusqua: Instant; le: Instant }
  | { type: 'lot_valide'; lot: string; arret: string | null; photo: Photo; le: Instant }
/** Seul point de sortie de la réception vers le livreur (src/demo/pont-relais.ts → pont commun). */
export function versLeLivreur(e: VersLivreur): void {
  const o: Origine = { cle: `${e.type}-${'lot' in e ? e.lot : ''}-${'colis' in e ? e.colis : ''}-${e.le}`, heure: e.le, position: null }
  if (e.type === 'code_verifie') pontCodeVerifie(e.lot, o)
  else if (e.type === 'code_bloque') pontCodeBloque(e.jusqua, o)
  else if (e.type === 'lot_valide') {
    const l = etatColis.lire().colis
    pontLotValide(e.lot, Object.fromEntries(Object.values(l).filter((c) => c.arrivee.lot === e.lot && c.emplacement).map((c) => [c.id, c.emplacement])), o)
  } else if (e.resultat === 'en_trop' || e.resultat === 'pas_pour_ce_relais') pontColisHorsLot(e.lot, e.colis, e.resultat, e.photos, o)
  else pontResultatColis(e.lot, e.colis, e.resultat, e.motif ?? null, e.photos, o)
}

/** Motif d'une réserve ou d'un refus tel que le livreur le lit (ARL-17). */
const MOTIFS_VUS: Record<NonNullable<ResultatColis['motif']>, string> = { non_conforme: 'Non conforme', abime: 'Abîmé', contrefacon: 'Contrefaçon suspectée', manquant: 'Colis manquant', emballage_ouvert: 'Emballage ouvert' }

// ── Vue d'un lot ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Emplacements proposés à la suite (petit en A, moyen en B, encombrant au sol C ; CAL-22), sans rien réserver. */
function propositions(colis: ColisRelais[]): Record<string, string | null> {
  const cases = plan()
  const out: Record<string, string | null> = {}
  for (const c of colis) {
    if (c.emplacement) {
      out[c.id] = c.emplacement
      continue
    }
    const code = attribuerEmplacement(c.classe, cases, P)
    const k = cases.find((x) => x.code === code)
    if (k) k.occupee += c.places
    out[c.id] = code
  }
  return out
}

function lotVu(id: string): Lot | null {
  const l = etatReception.lire().lots[id]
  const j = LOTS.find((x) => x.id === id)
  if (!l || !j) return null
  const colis = tousLesColis().filter((c) => c.arrivee.lot === id || l.enTrop.includes(c.id))
  const annonces = colis.filter((c) => !l.enTrop.includes(c.id))
  const collecte = j.collecte ? COLLECTES.find((c) => c.id === j.collecte) : null
  const r = etatReception.lire()
  const prop = propositions(colis.filter((c) => c.etat === 'attendu' || c.etat === 'recu' || c.etat === 'recu_reserve' || c.etat === 'en_stock'))
  const details: Record<string, DetailColisLot> = Object.fromEntries(
    colis.map((c): [string, DetailColisLot] => [c.id, { remplacement: REMPLACEMENTS.has(c.id), scanne: l.scannes.includes(c.id) || l.enTrop.includes(c.id), emplacementPropose: prop[c.id] ?? null, constatAccepte: l.acceptes.includes(c.id) }]),
  )
  const confirme = l.confirmeParLivreurA !== null && l.valideA !== null
  return {
    lot: id,
    entreprise: ENTREPRISE,
    livreur: LIVREUR,
    arriveeEstimee: l.arriveeEstimee,
    suivi: confirme ? 'depose' : l.suivi,
    colis: annonces.length,
    placesNecessaires: placesDuLot(annonces.map((c) => c.classe), P),
    placesManquantes: placesManquantes(annonces.filter((c) => c.etat === 'attendu').map((c) => c.classe), { libres: Math.max(etatRelais.lire().placesDeclarees - occupationDuRelais(etatRelais.lire().placesDeclarees).occupees, 0) }, PM),
    aReprendre: collecte ? tousLesColis().filter((c) => c.sortie?.collecte === collecte.id && !c.sortie.le).length : 0,
    arret: j.arret,
    collecte: j.collecte,
    ouvertA: l.ouvertA,
    valideA: l.valideA,
    confirmeParLivreurA: l.valideA ? l.confirmeParLivreurA : null,
    code: { essaisRestants: Math.max(P.code.essais - r.faux, 0), bloqueJusqua: r.bloqueJusqua && r.bloqueJusqua > maintenant() ? r.bloqueJusqua : null },
    colisDuLot: colis,
    details,
    enTrop: l.enTrop,
    supportAlerte: !!l.valideA && !confirme && maintenant() - l.valideA >= CONFIRMATION_MIN * 60_000,
    prevenus: l.prevenus,
    occupation: occupationDuLot(j.collecte),
  }
}

function occupationDuLot(collecte: string | null): Lot['occupation'] {
  const d = etatRelais.lire().placesDeclarees
  const o = occupationDuRelais(d)
  const apres = collecte && !COLLECTES.find((c) => c.id === collecte)?.termineeA ? occupationApresCollecte(d, collecte).occupees : null
  return { occupees: o.occupees, declarees: o.declarees, apresCollecte: apres, seuilAtteint: o.seuilAtteint }
}
export const lots = (): Lot[] => Object.keys(etatReception.lire().lots).map((id) => lotVu(id)!).sort((a, b) => (a.arriveeEstimee ?? 0) - (b.arriveeEstimee ?? 0))

const ouvert = (lotId: string) => {
  const l = etatReception.lire().lots[lotId]
  return !!l?.ouvertA && !l.valideA
}

/** Code lu dans ce que présente le livreur : 6 chiffres, ou le jeton de son QR (« BLV1.<base64 {m, a, c}>.sig »). */
export function codeDuDepot(saisie: string): string | null {
  const v = saisie.trim()
  if (new RegExp(`^\\d{${P.code.longueur}}$`).test(v.replace(/\s/g, ''))) return v.replace(/\s/g, '')
  const m = /^BLV1\.([A-Za-z0-9+/_-]+)\.sig$/.exec(v)
  if (!m) return null
  try {
    const b = m[1].replace(/-/g, '+').replace(/_/g, '/')
    const j = JSON.parse(atob(b + '='.repeat((4 - (b.length % 4)) % 4))) as { c?: unknown }
    return typeof j.c === 'string' && new RegExp(`^\\d{${P.code.longueur}}$`).test(j.c) ? j.c : null
  } catch {
    return null
  }
}

// ── Confirmation du livreur (démonstration) ─────────────────────────────────────────────────────────────────────
/** Le livreur accepte chaque réserve ou refus (PR-RC-08) puis confirme : la garde passe au relais, les clients sont
 * prévenus (avis d'arrivée puis code de chaque colis, ARL-01 ; commande payable au comptoir : code au paiement). */
export function confirmerParLeLivreur(lotId: string, le: Instant) {
  const l = etatReception.lire().lots[lotId]
  if (!l?.valideA || (l.confirmeParLivreurA && l.prevenus)) return
  const recus = tousLesColis().filter((c) => (c.arrivee.lot === lotId || l.enTrop.includes(c.id)) && (c.etat === 'en_stock' || c.etat === 'en_groupage'))
  const aAccepter = tousLesColis().filter((c) => c.arrivee.lot === lotId && (c.arrivee.resultat === 'reserve' || c.arrivee.resultat === 'refus')).map((c) => c.id)
  etatColis.ecrire((e) => {
    for (const c of recus) {
      const x = e.colis[c.id]
      x.arrivee.le = le
      // Avis d'arrivée délivré au client par le serveur (démonstration : aussitôt) : le 1er jour de garde commence.
      if (x.etat !== 'en_groupage' && !AVIS_DIFFERE.has(c.id)) x.avisA = le
      x.journal.push({ le, action: 'depot_confirme_livreur', par: { type: 'livreur', nom: LIVREUR, membreId: null }, signe: false, detail: lotId, cle: null })
    }
  })
  // Ce qui part vers les clients, par groupe de remise (une commande au même relais).
  const prevenus = { avisEtCode: 0, auPaiement: 0, groupage: 0, incomplets: 0, nonDelivres: 0 }
  for (const g of new Set(recus.map((c) => c.groupe))) {
    const membres = recus.filter((c) => c.groupe === g)
    const gv = groupeVu(g)
    if (membres.some((c) => c.etat === 'en_groupage')) prevenus.groupage += 1
    else if (membres.some((c) => c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme')) prevenus.auPaiement += 1
    else if (gv && gv.arrives < gv.total) prevenus.incomplets += 1
    else if (membres.some((c) => AVIS_DIFFERE.has(c.id))) prevenus.nonDelivres += 1
    else prevenus.avisEtCode += 1
  }
  etatReception.ecrire((x) => void Object.assign(x.lots[lotId], { confirmeParLivreurA: le, suivi: 'depose', acceptes: aAccepter, prevenus }))
}
const minuteurs = new Map<string, ReturnType<typeof setTimeout>>()
/** Repli de démonstration : l'application du livreur n'est pas ouverte dans ce navigateur, sa confirmation est simulée.
 * Ouverte, la confirmation réelle arrive par le pont (et un livreur qui ferme son application retombe sur le repli). */
function attendreLeLivreur(lotId: string) {
  if (typeof window === 'undefined' || minuteurs.has(lotId)) return
  minuteurs.set(
    lotId,
    setTimeout(() => {
      minuteurs.delete(lotId)
      if (livreurOuvert()) return
      confirmerParLeLivreur(lotId, maintenant())
    }, CONFIRMATION_DEMO_MS),
  )
}

export const REGLES_RECEPTION: ReglesReception = {
  codeLongueur: P.code.longueur,
  codeEssais: P.code.essais,
  codeBlocageH: P.code.blocageHeures,
  photosReserve: PARAMETRES_MOTEURS.reservePhotosMin,
  photosRefus: PARAMETRES_MOTEURS.refusPhotosMin,
  photosEnTrop: PARAMETRES_MOTEURS.reservePhotosMin,
  photosLot: PARAMETRES_MOTEURS.lotPhotosMin,
  pinLongueur: C.pinLongueur,
  pinBlocageMin: C.pinBlocageMin,
  confirmationMin: CONFIRMATION_MIN,
  places: P.places,
  saturationPct: P.capaciteSeuilPct,
  photoMaxKo: P.photoMaxKo,
}

const memoriser = (o: Origine, r: { ok: boolean; lot?: string; raison?: string }) => etatReception.ecrire((x) => void (x.reponses[o.cle] = r))

export const demoReception: DomaineReception = {
  lots: () => {
    // Une validation faite avant un rechargement attend encore son livreur.
    for (const [id, l] of Object.entries(etatReception.lire().lots)) if (l.valideA && !l.prevenus && !l.confirmeParLivreurA) attendreLeLivreur(id)
    return repondre(lots())
  },
  lot: (id) => repondre(lotVu(id)),
  regles: () => repondre(REGLES_RECEPTION),
  async verifierCodeDepot(saisie, o) {
    const r = etatReception.lire()
    const deja = r.reponses[o.cle]
    if (deja) return deja.ok ? { ok: true, lot: deja.lot! } : { ok: false, raison: deja.raison as 'code_faux' }
    if (r.bloqueJusqua && r.bloqueJusqua > o.heure) return { ok: false, raison: 'bloque', bloqueJusqua: r.bloqueJusqua }
    const code = codeDuDepot(saisie)
    const e = code ? empreinte('depot:' + code) : null
    const id = e ? Object.entries(r.lots).find(([, l]) => l.empreinte === e)?.[0] : undefined
    // Essai compté par le moteur (essaiDeCode, REC-01, CAL-31) : au CODE-ESSAIS-ième faux, blocage CODE-BLOCAGE-H.
    const essai = essaiDeCode(!!id, r.faux, o.heure, PM, r.bloqueJusqua)
    if (!id) {
      etatReception.ecrire((x) => void Object.assign(x, essai.bloqueJusquAu ? { faux: 0, bloqueJusqua: essai.bloqueJusquAu } : { faux: essai.essaisFaux }))
      memoriser(o, { ok: false, raison: essai.bloqueJusquAu ? 'bloque' : 'code_faux' })
      // pont : code_bloque (livreur, entreprise et console prévenus)
      if (essai.bloqueJusquAu) versLeLivreur({ type: 'code_bloque', jusqua: essai.bloqueJusquAu, le: o.heure })
      return essai.bloqueJusquAu ? { ok: false, raison: 'bloque', bloqueJusqua: essai.bloqueJusquAu } : { ok: false, raison: 'code_faux', essaisRestants: essai.essaisRestants }
    }
    if (r.lots[id].valideA) return { ok: false, raison: 'deja_valide', deja: r.lots[id].confirmeParLivreurA ?? r.lots[id].valideA! }
    etatReception.ecrire((x) => {
      x.faux = 0
      x.lots[id].ouvertA ??= o.heure
      x.lots[id].suivi = 'arrive'
    })
    memoriser(o, { ok: true, lot: id })
    // pont : code_verifie
    versLeLivreur({ type: 'code_verifie', lot: id, arret: LOTS.find((l) => l.id === id)?.arret ?? null, le: o.heure })
    return { ok: true, lot: id }
  },
  async scannerEtiquette(lotId, etiquette): Promise<IssueScan> {
    const ref = etiquette.trim().toUpperCase()
    if (!ouvert(lotId)) return { issue: 'illisible' }
    if (!REFERENCE.test(ref)) return { issue: 'illisible' }
    if (AUTRES_RELAIS[ref]) {
      // pont : resultat_colis « pas pour ce relais » (PR-RC-04 : le colis reste au livreur, incident à l'entreprise)
      versLeLivreur({ type: 'resultat_colis', lot: lotId, colis: ref, resultat: 'pas_pour_ce_relais', photos: 0, le: maintenant() })
      return { issue: 'pas_pour_ce_relais', relais: AUTRES_RELAIS[ref] }
    }
    const l = etatReception.lire().lots[lotId]
    const c = etatColis.lire().colis[ref]
    if (c && c.arrivee.lot === lotId) {
      if (l.scannes.includes(ref)) return { issue: 'deja_scanne', colis: ref }
      etatReception.ecrire((x) => void x.lots[lotId].scannes.push(ref))
      return { issue: 'dans_le_lot', colis: ref }
    }
    if (l.enTrop.includes(ref)) return { issue: 'deja_scanne', colis: ref }
    // Colis d'un autre lot déjà au relais : ce n'est pas un colis de ce lot.
    if (c) return { issue: 'pas_pour_ce_relais', relais: ENTREPRISE }
    return { issue: 'en_trop', colis: ref }
  },
  async resultat(lotId, colisId, r, o) {
    if (!ouvert(lotId)) return { ok: false, raison: 'aucun_lot' }
    if (etatColis.lire().colis[colisId]?.arrivee.lot !== lotId) return { ok: false, raison: 'inconnu' }
    if (r.resultat === 'refus' && r.photos.length < REGLES_RECEPTION.photosRefus) return { ok: false, raison: 'photo_manquante' }
    const t = appliquer(colisId, resultatVersEvenement[r.resultat], { photos: r.photos.length }, o, acteurActuel(), (c) => {
      c.arrivee.resultat = r.resultat
      if (r.resultat === 'reserve') c.arrivee.reserve = { note: r.note ?? '', photos: r.photos }
      if (r.photos.length) preuve(c, r.resultat === 'refus' ? 'refus' : 'reserve', r.photos, acteurActuel(), o.heure)
    }, [r.scelle, r.motif, r.note].filter(Boolean).join(' · ') || null)
    if (!t.ok) return { ok: false, raison: t.raison === 'introuvable' ? 'inconnu' : t.raison === 'photo_manquante' ? 'photo_manquante' : 'transition_interdite' }
    etatReception.ecrire((x) => void (x.lots[lotId].scannes.includes(colisId) || r.resultat === 'absent' || x.lots[lotId].scannes.push(colisId)))
    // pont : resultat_colis
    versLeLivreur({ type: 'resultat_colis', lot: lotId, colis: colisId, resultat: r.resultat, photos: r.photos.length, motif: r.note || (r.motif ? MOTIFS_VUS[r.motif] : null) || (r.scelle === 'casse' ? 'Scellé cassé' : null), le: o.heure })
    return { ok: true }
  },
  async colisEnTrop(lotId, colisId, classe, photos, o) {
    if (!ouvert(lotId)) return { ok: false, raison: 'aucun_lot' }
    if (photos.length < REGLES_RECEPTION.photosEnTrop) return { ok: false, raison: 'photo_manquante' }
    if (!etatColis.lire().colis[colisId])
      etatColis.ecrire((e) => {
        const c = creerColis(e, colisId, classe, { etat: 'recu_reserve', arrivee: { lot: lotId, mission: LOTS.find((l) => l.id === lotId)?.arret ?? null, livreur: LIVREUR, entreprise: ENTREPRISE, le: null, photo: null, resultat: 'en_trop', reserve: { note: 'Colis non annoncé dans le lot', photos } } })
        preuve(c, 'reserve', photos, acteurActuel(), o.heure)
        c.journal.push({ le: o.heure, action: 'en_trop', par: acteurActuel(), signe: false, detail: lotId, cle: o.cle })
      })
    etatReception.ecrire((x) => void (x.lots[lotId].enTrop.includes(colisId) || x.lots[lotId].enTrop.push(colisId)))
    // pont : resultat_colis
    versLeLivreur({ type: 'resultat_colis', lot: lotId, colis: colisId, resultat: 'en_trop', photos: photos.length, le: o.heure })
    return { ok: true }
  },
  async validerLot(lotId, photo, pin, o) {
    const l = lotVu(lotId)
    if (!l || !l.ouvertA) return { ok: false, raison: 'aucun_lot' }
    if (l.valideA) return { ok: true, emplacements: Object.fromEntries(l.colisDuLot.map((c) => [c.id, c.emplacement])) }
    // Contrôle du moteur (controleReception) : chaque colis a un résultat, photos des réserves et refus, photo du lot.
    const VERS: Record<string, ResultatControle> = { ok: 'ok', reserve: 'réserve', refus: 'refusé', absent: 'absent', en_trop: 'en_trop' }
    const ctl = controleReception(
      true,
      l.colisDuLot.map((c) => colisControle(c.id, c.etat === 'attendu' || !c.arrivee.resultat ? null : VERS[c.arrivee.resultat], { photos: c.preuves.filter((x) => x.nature === 'reserve' || x.nature === 'refus').reduce((n, x) => n + x.photos.length, 0), annonce: !l.enTrop.includes(c.id) })),
      photo ? 1 : 0,
      PM,
    )
    const b = ctl.blocages[0]?.code
    if (b === 'resultat_manquant') return { ok: false, raison: 'colis_sans_resultat' }
    if (b) return { ok: false, raison: 'photo_manquante', detail: b }
    const v = verifierPin(pin)
    if (v !== 'ok') return { ok: false, raison: v === 'bloque' ? 'pin_requis' : 'pin_faux' }
    // Emplacements attribués à la suite (petit en A, moyen en B, encombrant au sol C ; CAL-22) ; DP-20 : un colis sans
    // place est reçu quand même (rangement provisoire au comptoir).
    const cases = plan()
    const emplacements: Record<string, string | null> = {}
    for (const c of l.colisDuLot.filter((x) => x.etat === 'recu' || x.etat === 'recu_reserve')) {
      const code = attribuerEmplacement(c.classe, cases, P)
      emplacements[c.id] = code
      const k = cases.find((x) => x.code === code)
      if (k) k.occupee += c.places
      appliquer(c.id, 'valider_lot', { photos: 1, pinOk: true }, o, acteurActuel(), (x) => {
        x.emplacement = code
        x.arrivee.photo = photo
        preuve(x, 'lot', [photo], acteurActuel(), o.heure)
      }, lotId)
    }
    etatReception.ecrire((x) => void Object.assign(x.lots[lotId], { valideA: o.heure, confirmeParLivreurA: null, suivi: 'arrive' }))
    // pont : lot_valide
    versLeLivreur({ type: 'lot_valide', lot: lotId, arret: l.arret, photo, le: o.heure })
    attendreLeLivreur(lotId)
    return { ok: true, emplacements }
  },
}

/** Occupation qu'aura le relais après la collecte annoncée (colis à reprendre partis). */
export function occupationApresCollecte(placesDeclarees: number, collecte: string | null) {
  const restants = tousLesColis().filter((c) => !(collecte && c.sortie?.collecte === collecte && !c.sortie.le))
  return occupation(restants.filter((c) => ['recu', 'recu_reserve', 'en_stock', 'dernier_jour', 'a_renvoyer', 'en_constat', 'en_groupage', 'transfert_demande', 'refuse_comptoir', 'a_faire_partir'].includes(c.etat)).map((c) => ({ classe: c.classe, retour: false })), placesDeclarees, P)
}
