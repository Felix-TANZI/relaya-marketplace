// DONNÉES DE DÉMONSTRATION — domaine « remises » (LIV-07) : dépôt au Relais Bastos Carrefour (A3, colis ramassés en A1
// et A2), départs du même relais (A4), retour chez Tech Bastos (A5), remise à domicile à Solange (A7, payée en
// ligne comme toute commande) et, après un échec, dépôt au relais de la zone ajouté par le système (A8). Le relais (nom, gérante vue
// « Rose M. », horaires, places, codes de dépôt) est celui de l'espace point relais (src/demo/pont.ts, RELAIS_DEMO).
// Les gestes de la gérante viennent de l'application du relais ouverte sur le même appareil (pont : code de dépôt
// vérifié, résultat par colis, lot validé, colis présenté, occupation) ; ce que fait le livreur y part (constat
// accepté, lot confirmé, relais fermé, colis confirmé, manquant, scellé photographié). Sans l'application du relais,
// les fonctions « simuler… » jouent l'autre téléphone (gérante, cliente), réservées à la démonstration.
import type { ClasseColis } from '../donnees/communs'
import type { ColisDepart, ColisDepot, Collecte, DepotRelais, DomaineRemises, MotifEchec, RemiseDomicile, RetourVendeur, SuiteEchec } from '../donnees/domaines/remises'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { RELAIS_DEMO, arretDuLot, codeDemo, codeRetraitDemo, commandeDuColis, evenementsDe, fermetureRelais, gerantVu, lotDeLArret, publier, type MotifSortiePont, type ResultatDepotPont } from './pont'
import { arretDuLotPont, lotPont, objetsPont } from './objets-pont'
import { colisRemis } from './ramassage'
import { magasin, repondre } from './stockage'
import { LIEUX, MINUTE_MS, lieuArret, ajouterDepotRelais, arretDe, changerGarde, distanceM, etape, etatTournee, journaliser, modifier, ouvrirIncident, reglesDemo, terminerArret } from './tournee'

/** Codes (données) : livraison de la cliente, réception du vendeur. Le code de dépôt (porté par le QR de dépôt, écrit
 * aussi en 6 chiffres, DP-62) est celui du lot au relais ; un dépôt ajouté par le système (A8) reçoit le sien. */
const CODE_DEPOT_AJOUTE = '527149'
// Code de dépôt d'un lot : celui du jeu d'essai, ou celui du lot d'un paquet venu du pont (recalculé comme le serveur).
const codeDepot = (arretId: string) => {
  const lot = lotDeLArret(arretId) ?? lotPont(arretId)
  return lot ? codeDemo(lot, 'depot') : CODE_DEPOT_AJOUTE
}
const CODE_LIVRAISON = '772041'
const CODE_RECEPTION = '518204'
const RELAIS_ZONE = RELAIS_DEMO.nom
/** Fermeture du relais aujourd'hui (horaires du relais) ; un jour fermé, l'heure de la journée de démonstration. */
const fermeture = () => fermetureRelais(maintenant()) ?? h(19, 0)

type Resultats = Record<string, Pick<ColisDepot, 'resultat' | 'emplacement' | 'photos' | 'motif' | 'constatAccepte'>>
interface EtatDepot {
  scanneA: number | null
  resultatsA: number | null
  resultats: Resultats
  confirmeA: number | null
  etatRelais: DepotRelais['etatRelais']
  fermeConstate: DepotRelais['fermeConstate']
  registre: DepotRelais['registre']
  colisFixes: { id: string; etiquette: string; classe: ClasseColis }[] | null // A8 : colis rapportés
  parRelais: boolean // le code et les résultats viennent de l'application du relais (pont) : sa validation est attendue
  valideA: number | null // lot validé par le relais (photo du lot, PIN) : le livreur peut confirmer
}
const depot = (): EtatDepot => ({ scanneA: null, resultatsA: null, resultats: {}, confirmeA: null, etatRelais: 'ouvert', fermeConstate: null, registre: null, colisFixes: null, parRelais: false, valideA: null })

const etat = magasin('remises', () => ({
  depots: { A3: depot() } as Record<string, EtatDepot>,
  collecte: {
    colis: [
      { id: 'BLV-00004-2', etiquette: 'BV 24 7741', classe: 'S', motif: 'retour_valide', destination: 'Tech Bastos', presenteA: null, confirmeA: null, manquant: null, scelleAbime: null },
      { id: 'BLV-00003-1', etiquette: 'BV 24 7740', classe: 'M', motif: 'garde_depassee', destination: 'Tech Bastos', presenteA: null, confirmeA: null, manquant: null, scelleAbime: null },
    ] as ColisDepart[],
    termineeA: null as number | null,
  },
  /** Places du relais publiées par son application (relay.stock.updated) ; null : celles du départ de la démonstration. */
  places: null as { libres: number; total: number } | null,
  /** Événements du relais déjà appliqués (clé). */
  cles: [] as string[],
  retour: { code: { essaisRestants: 0, bloqueJusqua: null as number | null }, remisA: null as number | null, impossible: null as RetourVendeur['impossible'] },
  domicile: domicileInitial(),
  /** Collectes et retours au vendeur des courses de retour venues du pont (étape 7), par arrêt. */
  collectesPont: {} as Record<string, { colis: ColisDepart[]; termineeA: number | null }>,
  retoursPont: {} as Record<string, { code: { essaisRestants: number; bloqueJusqua: number | null }; remisA: number | null; impossible: RetourVendeur['impossible'] }>,
  /** Remises à domicile des paquets venus d'une commande du client (pont commun), par arrêt. */
  domicilesPont: {} as Record<string, EtatDomicile>,
}))
type EtatDomicile = ReturnType<typeof domicileInitial>
function domicileInitial() {
  return {
    code: { essaisRestants: 0, bloqueJusqua: null as number | null },
    remiseA: null as number | null,
    porteur: null as string | null,
    constat: null as RemiseDomicile['constat'],
    echec: null as RemiseDomicile['echec'],
  }
}
type Etat = ReturnType<typeof etat.lire>
/** L'état de la remise à domicile d'un arrêt : Solange (A7) ou un arrêt d'un paquet venu du pont. */
const dom = (e: Etat, arretId: string): EtatDomicile => (arretId === 'A7' ? e.domicile : (e.domicilesPont[arretId] ??= domicileInitial()))
const domLu = (arretId: string) => dom(structuredClone(etat.lire()), arretId)
const ok = { ok: true as const }
const SANS_RESULTAT: Resultats[string] = { resultat: null, emplacement: null, photos: 0, motif: null, constatAccepte: false }

// Colis ramassés ce matin chez Tech Bastos (A1), liés aux étiquettes du rouleau.
const COLIS_A1 = [
  { id: 'BLV-00008-1', etiquette: 'BV 24 8204', classe: 'S' as ClasseColis },
  { id: 'BLV-00009-1', etiquette: 'BV 24 8205', classe: 'M' as ClasseColis },
]
/** Dépôt au relais d'un paquet venu d'une commande du client (pont commun) : prêt quand le livreur part. */
export function ajouterDepotPont(arretId: string) {
  if (!etat.lire().depots[arretId]) etat.ecrire((e) => void (e.depots[arretId] = depot()))
}
function colisDuDepot(arretId: string) {
  const d = etat.lire().depots[arretId]
  if (d?.colisFixes) return d.colisFixes
  // Lot d'un paquet venu du pont : les colis remis au livreur aux ramassages de ce paquet.
  const lot = lotPont(arretId)
  if (lot)
    return etatTournee
      .lire()
      .arrets.filter((a) => a.paquetId === lot && a.type === 'ramassage')
      .flatMap((a) => colisRemis(a.id).map((c) => ({ id: c.colisId, etiquette: c.etiquette ?? '', classe: c.classe })))
  return [...COLIS_A1, ...colisRemis('A2').map((c) => ({ id: c.colisId, etiquette: c.etiquette ?? '', classe: c.classe }))]
}
const colisDomicile = (arretId = 'A7') => {
  const l = objetsPont.lire().lieux[arretId]
  const ramassages = l ? etatTournee.lire().arrets.filter((a) => a.paquetId === l.paquetId && a.type === 'ramassage').map((a) => a.id) : ['A6']
  return ramassages.flatMap((id) => colisRemis(id).map((c) => ({ id: c.colisId, etiquette: c.etiquette ?? '', classe: c.classe })))
}
/** Code de réception que la cliente lit dans son suivi (celui de sa commande, recalculé comme le serveur). */
const codeLivraison = (arretId: string) => {
  if (arretId === 'A7') return CODE_LIVRAISON
  const c = colisDomicile(arretId)[0]
  const commande = c ? commandeDuColis(c.id) : null
  return commande ? codeRetraitDemo(commande) : CODE_LIVRAISON
}
/** La collecte d'un arrêt : A4 (jeu d'essai) ou celle d'une course de retour venue du pont. */
const col = (e: Etat, arretId: string) => (arretId === 'A4' ? e.collecte : (e.collectesPont[arretId] ??= { colis: [], termineeA: null }))
const colLu = (arretId: string) => col(structuredClone(etat.lire()), arretId)
const ret = (e: Etat, arretId: string) => (arretId === 'A5' ? e.retour : (e.retoursPont[arretId] ??= { code: { essaisRestants: 0, bloqueJusqua: null }, remisA: null, impossible: null }))
const retLu = (arretId: string) => ret(structuredClone(etat.lire()), arretId)
/** Arrêt du même paquet d'un type donné (course de retour : collecte au relais, puis retour à la boutique). */
const voisin = (arretId: string, type: 'collecte' | 'retour') => {
  const a = arretDe(arretId)
  return a ? (etatTournee.lire().arrets.find((x) => x.paquetId === a.paquetId && x.type === type)?.id ?? null) : null
}
const collecteDuRetour = (arretId: string) => (arretId === 'A5' ? 'A4' : (voisin(arretId, 'collecte') ?? arretId))
const colisRetour = (arretId = 'A5') => colLu(collecteDuRetour(arretId)).colis.filter((c) => c.confirmeA)
/** Code de réception que le vendeur lit dans son application (retour d'une commande du client : recalculé). */
const codeRetour = (arretId: string) => {
  if (arretId === 'A5') return CODE_RECEPTION
  const c = colisRetour(arretId)[0]
  return c ? codeDemo(c.id, 'retour') : CODE_RECEPTION
}
const estCollecte = (id: string) => id === 'A4' || objetsPont.lire().lieux[id]?.type === 'collecte'

const enCours = (arretId: string) => etatTournee.lire().enCours === arretId
const surPlace = (arretId: string) => enCours(arretId) && arretDe(arretId)?.phase === 'sur_place'

const suiteRelais = (): SuiteEchec => ({ destination: 'relais_zone', relais: RELAIS_ZONE, ouvertJusqua: fermeture() })

// ---------- Pont : ce que fait le relais (même appareil, src/demo/pont.ts) ----------

const RESULTAT: Record<ResultatDepotPont, ColisDepot['resultat']> = { controle: 'controle', reserve: 'reserve', refuse: 'refuse', absent: 'absent', pas_pour_ce_relais: 'refuse', en_trop: null }
const MOTIF_SORTIE: Record<MotifSortiePont, ColisDepart['motif']> = { renvoi: 'garde_depassee', retour: 'retour_valide', transfert: 'changement_relais', refus_comptoir: 'refus_comptoir', fermeture: 'fermeture' }
let enCoursPont = false
/** Applique les gestes du relais pas encore vus, une fois chacun (clé), comme le ferait le serveur. */
function appliquerRelais() {
  if (enCoursPont) return
  enCoursPont = true
  try {
    const vus = new Set(etat.lire().cles)
    const nouveaux = evenementsDe('relais').filter((e) => !vus.has(e.cle))
    if (!nouveaux.length) return
    etat.ecrire((s) => {
      for (const e of nouveaux) {
        const d = 'lot' in e && e.lot ? s.depots[arretDuLot(e.lot) ?? arretDuLotPont(e.lot) ?? ''] : undefined
        if (e.type === 'relay.drop_code.verified' && d && !d.confirmeA) Object.assign(d, { scanneA: e.le, parRelais: true })
        else if (e.type === 'relay.drop.item_result' && d && !d.confirmeA && RESULTAT[e.resultat]) {
          const avant = d.resultats[e.colis]
          d.resultats[e.colis] = { resultat: RESULTAT[e.resultat], emplacement: avant?.emplacement ?? null, photos: e.photos, motif: e.resultat === 'pas_pour_ce_relais' ? 'Pas pour ce relais' : e.motif, constatAccepte: avant?.constatAccepte ?? false }
          Object.assign(d, { resultatsA: e.le, parRelais: true, scanneA: d.scanneA ?? e.le })
        } else if (e.type === 'relay.drop.validated' && d && !d.confirmeA) {
          d.valideA = e.le
          for (const [c, emplacement] of Object.entries(e.emplacements)) if (d.resultats[c]) d.resultats[c].emplacement = emplacement
        } else if (e.type === 'relay.departures.ready' && estCollecte(e.collecte) && !col(s, e.collecte).termineeA) {
          const k = col(s, e.collecte)
          for (const c of e.colis.filter((x) => !k.colis.some((y) => y.id === x.id)))
            k.colis.push({ id: c.id, etiquette: c.id, classe: c.classe, motif: MOTIF_SORTIE[c.motif], destination: e.collecte === 'A4' ? '—' : (arretDe(voisin(e.collecte, 'retour') ?? '')?.nom ?? '—'), presenteA: null, confirmeA: null, manquant: null, scelleAbime: null })
        } else if (e.type === 'relay.departure.scanned' && estCollecte(e.collecte)) {
          const c = col(s, e.collecte).colis.find((x) => x.id === e.colis)
          if (c && !c.presenteA) c.presenteA = e.le
        } else if (e.type === 'relay.departure.missing' && estCollecte(e.collecte)) {
          // La gérante marque absent un colis prévu : il ne part pas, il reste en tête de liste au relais.
          const c = col(s, e.collecte).colis.find((x) => x.id === e.colis)
          if (c && !c.confirmeA && !c.manquant) c.manquant = e.le
        } else if (e.type === 'relay.stock.updated') s.places = { libres: Math.max(e.declarees - e.occupees, 0), total: e.declarees }
      }
      s.cles.push(...nouveaux.map((e) => e.cle))
    })
    const bloque = nouveaux.find((e) => e.type === 'relay.drop_code.blocked')
    if (bloque) modifier('Code de dépôt bloqué au {relais} après 3 essais faux : ne laissez pas le lot, la console vous rappelle.', { relais: RELAIS_ZONE })
  } finally {
    enCoursPont = false
  }
}
const lireEtat = etat.lire
etat.lire = () => (appliquerRelais(), lireEtat())
/** Lot du relais déposé à cet arrêt (null : dépôt ajouté par le système, inconnu du relais avant son arrivée). */
const lotDe = (arretId: string) => lotDeLArret(arretId) ?? lotPont(arretId) ?? arretDe(arretId)?.paquetId ?? arretId

export const demoRemises: DomaineRemises = {
  // ---------- Dépôt au relais ----------
  async depotRelais(arretId) {
    const d = etat.lire().depots[arretId]
    if (!d) return repondre(null)
    const r = await reglesDemo()
    const colis = colisDuDepot(arretId)
    const lot = colis.reduce((n, c) => n + (r.placesParClasse[c.classe] ?? 0), 0)
    const places = etat.lire().places ?? { libres: RELAIS_DEMO.placesLibresAuDebut, total: RELAIS_DEMO.placesDeclarees }
    const code = codeDepot(arretId)
    const v: DepotRelais = {
      arretId,
      relais: RELAIS_ZONE,
      gerant: gerantVu(),
      fermeture: fermeture(),
      places: { ...places, lot },
      // Le QR de dépôt (jeton signé qui porte le code de dépôt, DP-62) n'existe que pendant l'arrêt en cours, avant la confirmation.
      qr: surPlace(arretId) && !d.confirmeA ? { jeton: 'BLV1.' + btoa(JSON.stringify({ m: arretDe(arretId)?.paquetId, a: arretId, c: code })).replace(/=+$/, '') + '.sig', code } : null,
      scanneA: d.scanneA,
      resultatsA: d.resultatsA,
      colis: colis.map((c) => ({ ...c, ...(d.resultats[c.id] ?? SANS_RESULTAT) })),
      confirmeA: d.confirmeA,
      attendValidation: d.parRelais && !d.valideA,
      etatRelais: d.etatRelais,
      fermeConstate: d.fermeConstate,
      registre: d.registre,
    }
    return repondre(v)
  },
  accepterConstat(arretId, colisId, o) {
    if (journaliser('constat_miroir', colisId, o)) publier({ type: 'relay.drop.report_accepted', lot: lotDe(arretId), arretId, colis: colisId }, 'relay.drop.report_accepted-' + o.cle, o.heure)
    etat.ecrire((e) => {
      const x = e.depots[arretId]?.resultats[colisId]
      if (x) x.constatAccepte = true
    })
    return repondre(ok)
  },
  confirmerDepot(arretId, o) {
    const d = etat.lire().depots[arretId]
    if (!d?.scanneA) return repondre({ ok: false as const, raison: 'non_scanne' as const })
    const colis = colisDuDepot(arretId)
    if (colis.some((c) => !d.resultats[c.id]?.resultat)) return repondre({ ok: false as const, raison: 'colis_sans_resultat' as const })
    // PR-RC-08 : réserves et refus acceptés en miroir avant la confirmation.
    if (colis.some((c) => (d.resultats[c.id].resultat === 'refuse' || d.resultats[c.id].resultat === 'reserve') && !d.resultats[c.id].constatAccepte)) return repondre({ ok: false as const, raison: 'constat_a_accepter' as const })
    // Le relais valide le lot (photo du lot, PIN) avant la confirmation du livreur (ARL-11, PR-RC-08).
    if (d.parRelais && !d.valideA) return repondre({ ok: false as const, raison: 'lot_non_valide' as const })
    if (!journaliser('depot_confirme', arretId, o)) return repondre(ok)
    // La garde passe au relais à la confirmation du livreur, horodatée par le serveur ; un colis refusé repart avec lui.
    const refuses = colis.filter((c) => d.resultats[c.id].resultat === 'refuse').map((c) => c.id)
    publier({ type: 'relay.drop.completed', lot: lotDe(arretId), arretId, remis: colis.filter((c) => !refuses.includes(c.id) && d.resultats[c.id].resultat !== 'absent').map((c) => c.id), refuses, mode: 'scan' }, 'relay.drop.completed-' + arretId, o.heure)
    const remis = colis.filter((c) => d.resultats[c.id].resultat !== 'refuse').length
    etat.ecrire((e) => void (e.depots[arretId].confirmeA = maintenant()))
    changerGarde(-remis)
    etape(arretId, 3)
    terminerArret(arretId, 'fait', remis)
    return repondre(ok)
  },
  relaisFerme(arretId, photo, o) {
    if (!journaliser('relais_ferme', arretId, o)) return repondre(ok)
    publier({ type: 'relay.closure.undeclared', lot: lotDeLArret(arretId) ?? lotPont(arretId), arretId, photo: !!photo }, 'relay.closure.undeclared-' + arretId, o.heure)
    etat.ecrire((e) => void Object.assign(e.depots[arretId], { etatRelais: 'ferme', fermeConstate: { photo, quand: maintenant() } }))
    etatTournee.ecrire((t) => void (t.arrets.find((a) => a.id === arretId)!.etat = 'echec'))
    ouvrirIncident('Point relais fermé à votre arrivée', 'Vous gardez les colis. La console désigne un autre relais ou reprogramme le dépôt ; ne déposez nulle part ailleurs. Incident au Trust Score du relais, pas du vôtre.', {}, arretId, { famille: 'relais', type: 'relais_ferme' })
    return repondre(ok)
  },
  registrePapier(arretId, photo, o) {
    if (!journaliser('registre_papier', arretId, o)) return repondre(ok)
    const colis = colisDuDepot(arretId)
    // Registre papier signé : le relais régularise à la reconnexion (scan du QR de dépôt et de chaque colis).
    publier({ type: 'relay.drop.completed', lot: lotDe(arretId), arretId, remis: colis.map((c) => c.id), refuses: [], mode: 'registre' }, 'relay.drop.completed-' + arretId, o.heure)
    etat.ecrire((e) => {
      const d = e.depots[arretId]
      Object.assign(d, { etatRelais: 'hors_ligne', registre: { photo, quand: maintenant() }, confirmeA: maintenant() })
      for (const c of colis) d.resultats[c.id] = { resultat: 'controle', emplacement: null, photos: 0, motif: null, constatAccepte: false }
    })
    changerGarde(-colis.length)
    terminerArret(arretId, 'fait', colis.length)
    return repondre(ok)
  },

  // ---------- Domicile ----------
  async domicile(arretId) {
    const pont = objetsPont.lire().lieux[arretId]
    if (arretId !== 'A7' && pont?.type !== 'domicile') return repondre(null)
    const r = await reglesDemo()
    const d = domLu(arretId)
    const a = arretDe(arretId)
    const colis = colisDomicile(arretId)
    const v: RemiseDomicile = {
      arretId,
      // Le prénom seul (jamais l'adresse) ; le pont ne le porte pas : « Cliente », le quartier et le repère du paquet.
      prenom: pont ? 'Cliente' : 'Solange',
      quartier: pont ? (a?.quartier ?? '') : 'Bastos',
      repere: pont ? pont.repere : LIEUX.A7.repere,
      creneau: pont && a ? [a.avant, a.avant + 30 * MINUTE_MS] : [h(17, 0), h(17, 30)],
      colis,
      arriveeA: a?.arriveeA ?? null,
      remiseA: d.remiseA,
      porteur: d.porteur,
      constat: d.constat,
      code: { essaisRestants: d.code.essaisRestants || (d.code.bloqueJusqua || d.remiseA ? 0 : r.codeEssais), bloqueJusqua: d.code.bloqueJusqua },
      echec: d.echec,
      codeDemo: codeLivraison(arretId),
    }
    return repondre(v)
  },
  async livrerDomicile(arretId, code, photo, porteur, o) {
    const r = await reglesDemo()
    const d = domLu(arretId)
    if (d.code.bloqueJusqua && d.code.bloqueJusqua > maintenant()) return repondre({ ok: false as const, raison: 'bloque' as const, essaisRestants: 0 })
    if (code !== codeLivraison(arretId)) {
      journaliser('code_livraison_faux', arretId, o)
      const reste = (d.code.essaisRestants || r.codeEssais) - 1
      etat.ecrire((e) => {
        dom(e, arretId).code.essaisRestants = reste
        if (reste <= 0) dom(e, arretId).code.bloqueJusqua = maintenant() + r.codeBlocageH * 60 * MINUTE_MS
      })
      return repondre(reste <= 0 ? { ok: false as const, raison: 'bloque' as const, essaisRestants: 0 } : { ok: false as const, raison: 'code_faux' as const, essaisRestants: reste })
    }
    const ecartM = o.position ? Math.round(distanceM(o.position, arretId === 'A7' ? LIEUX.A7 : lieuArret(arretId))) : null
    if (!journaliser('remise_domicile:' + photo, arretId, o)) return repondre({ ok: true as const, ecartM })
    // Validation à plus de l'écart permis : signalée à la console (journal), jamais bloquée.
    if (ecartM !== null && ecartM > r.ecartRemiseM) journaliser('alerte_ecart_remise', arretId, { ...o, cle: o.cle + '-ecart' })
    const remis = colisDomicile(arretId)
    const n = remis.length
    etat.ecrire((e) => void Object.assign(dom(e, arretId), { remiseA: maintenant(), porteur: porteur?.trim() || null }))
    // Colis d'une commande du client : la cliente, le vendeur et l'entreprise voient « Livré » (photo prise).
    const pq = objetsPont.lire().lieux[arretId]?.paquetId
    // Remise à une autre personne qui a le code (R89) : l'entreprise le voit ; jamais son nom dans l'événement.
    if (porteur?.trim()) publier({ type: 'remise_tiers', paquetId: arretDe(arretId)?.paquetId ?? '', arretId }, 'remise_tiers-' + arretId, maintenant())
    if (pq) publier({ type: 'parcel.delivered', paquet: pq, colis: remis.map((c) => c.id), photo: !!photo }, 'parcel.delivered-' + arretId, maintenant())
    changerGarde(-n)
    etape(arretId, 3)
    terminerArret(arretId, 'fait', n)
    return repondre({ ok: true as const, ecartM })
  },
  async constat(arretId, photos, note, o) {
    const r = await reglesDemo()
    if (note.trim().length < r.noteMin || photos.length < 2) return repondre({ ok: false as const, raison: 'note_trop_courte' as const })
    journaliser('constat_domicile', arretId, o)
    etat.ecrire((e) => void (dom(e, arretId).constat = { photos, note: note.trim() }))
    return repondre(ok)
  },
  preuvesEchec(arretId) {
    const a = arretDe(arretId)
    const appels = etatTournee
      .lire()
      .appels.filter((x) => x.correspondant === 'client' && x.arretId === arretId && (x.mode === 'application' || x.mode === 'rappel'))
      .map((x) => x.debut)
    return repondre({
      attenteMin: a?.arriveeA ? Math.floor((maintenant() - a.arriveeA) / MINUTE_MS) : 0,
      appels,
    })
  },
  async echecDomicile(arretId, motif, preuves, o) {
    const r = await reglesDemo()
    const p = await demoRemises.preuvesEchec(arretId)
    const appelsEspaces = p.appels.filter((t, i) => i === 0 || t - p.appels[i - 1] >= r.absentIntervalleMin * MINUTE_MS).length
    const exige: Record<MotifEchec, boolean> = {
      absent: p.attenteMin >= r.absentAttenteMin && appelsEspaces >= r.absentAppels && !!preuves.photo,
      injoignable: p.attenteMin >= r.absentAttenteMin && appelsEspaces >= r.absentAppels && !!preuves.photo,
      introuvable: p.appels.length >= 1 && !!preuves.photo,
      refus_colis: !!preuves.photo,
      danger: true,
    }
    if (motif === 'danger' && preuves.note.trim().length < r.noteMin) return repondre({ ok: false as const, raison: 'note_trop_courte' as const })
    if (!exige[motif]) return repondre({ ok: false as const, raison: 'preuves_incompletes' as const })
    const suite = suiteRelais()
    if (!journaliser('echec_domicile:' + motif, arretId, o)) return repondre({ ok: true as const, suite })
    etat.ecrire((e) => void (dom(e, arretId).echec = { motif, quand: maintenant(), suite }))
    // Aucun colis ne reste sur le livreur : le système ajoute le dépôt au relais de la zone, la cliente y reçoit son code.
    const colis = colisDomicile(arretId)
    etat.ecrire((e) => void (e.depots.A8 = { ...depot(), colisFixes: colis }))
    ajouterDepotRelais(arretDe(arretId)?.paquetId ?? 'PQ-Z1-261013-008', colis.length, Object.fromEntries(colis.map((c) => [c.classe, 1])))
    terminerArret(arretId, 'echec')
    modifier('Remise impossible : le système ajoute le dépôt au {relais}. La cliente y recevra son code de retrait.', { relais: RELAIS_ZONE })
    return repondre({ ok: true as const, suite })
  },

  // ---------- Départs du relais ----------
  collecte(arretId) {
    if (!estCollecte(arretId)) return repondre(null)
    const c = colLu(arretId)
    const v: Collecte = { arretId, relais: RELAIS_ZONE, gerant: gerantVu(), fermeture: fermeture(), colis: c.colis, termineeA: c.termineeA }
    return repondre(v)
  },
  confirmerDepart(arretId, colisId, o) {
    const c = colLu(arretId).colis.find((x) => x.id === colisId)
    if (!c?.presenteA) return repondre({ ok: false as const, raison: 'non_presente' as const })
    if (c.confirmeA || !journaliser('depart_confirme', colisId, o)) return repondre(ok)
    // La sortie du relais est effective à la confirmation du livreur : la garde lui passe, horodatée.
    etat.ecrire((e) => void (col(e, arretId).colis.find((x) => x.id === colisId)!.confirmeA = maintenant()))
    publier({ type: 'relay.departure.confirmed', collecte: arretId, colis: [colisId], par: 'livreur' }, 'relay.departure.confirmed-' + colisId, o.heure)
    changerGarde(1)
    etape(arretId, 2)
    return repondre(ok)
  },
  photoScelle(arretId, colisId, photo, o) {
    if (journaliser('scelle_abime', colisId, o)) publier({ type: 'relay.departure.seal_photo', collecte: arretId, colis: colisId }, 'relay.departure.seal_photo-' + o.cle, o.heure)
    etat.ecrire((e) => void (col(e, arretId).colis.find((x) => x.id === colisId)!.scelleAbime = photo))
    return repondre(ok)
  },
  departManquant(arretId, colisId, o) {
    if (journaliser('depart_manquant', colisId, o)) publier({ type: 'relay.departure.missing', collecte: arretId, colis: colisId }, 'relay.departure.missing-' + colisId, o.heure)
    etat.ecrire((e) => void (col(e, arretId).colis.find((x) => x.id === colisId)!.manquant = maintenant()))
    return repondre(ok)
  },
  terminerCollecte(arretId, o) {
    const c = colLu(arretId)
    if (c.colis.some((x) => !x.confirmeA && !x.manquant)) return repondre({ ok: false as const, raison: 'colis_a_traiter' as const })
    if (!journaliser('collecte_terminee', arretId, o)) return repondre(ok)
    etat.ecrire((e) => void (col(e, arretId).termineeA = maintenant()))
    const versRetour = arretId === 'A4' ? 'A5' : (voisin(arretId, 'retour') ?? 'A5')
    const pris = colisRetour(versRetour).length
    etatTournee.ecrire((t) => {
      const r = t.arrets.find((a) => a.id === versRetour)
      if (r) r.colis = pris
    })
    terminerArret(arretId, 'fait')
    if (pris === 0 && arretDe(versRetour)?.etat === 'en_cours') {
      terminerArret(versRetour, 'dissocie')
      modifier('Aucun colis de retour pris : la course de retour chez {vendeur} est retirée par le système.', { vendeur: 'Tech Bastos' })
    }
    return repondre(ok)
  },

  // ---------- Retour au vendeur ----------
  async retour(arretId) {
    const pont = objetsPont.lire().lieux[arretId]
    if (arretId !== 'A5' && pont?.type !== 'retour') return repondre(null)
    const r = await reglesDemo()
    const x = retLu(arretId)
    const a = arretDe(arretId)
    const motifs: Record<string, string> = { retour_valide: 'Retour validé : article non conforme', garde_depassee: 'Garde dépassée au relais : renvoi' }
    const v: RetourVendeur = {
      arretId,
      vendeur: pont ? (a?.nom ?? 'Boutique') : 'Tech Bastos',
      quartier: pont ? (a?.quartier ?? '') : 'Bastos',
      repere: pont ? pont.repere : LIEUX.A5.repere,
      preavisA: colLu(collecteDuRetour(arretId)).termineeA,
      colis: colisRetour(arretId).map((c) => ({ id: c.id, etiquette: c.etiquette, classe: c.classe, motif: motifs[c.motif] ?? c.motif, nature: c.motif === 'retour_valide' ? 'retour' : 'renvoi' })),
      arriveeA: a?.arriveeA ?? null,
      code: { essaisRestants: x.code.essaisRestants || (x.code.bloqueJusqua || x.remisA ? 0 : r.codeEssais), bloqueJusqua: x.code.bloqueJusqua },
      remisA: x.remisA,
      impossible: x.impossible,
      codeDemo: codeRetour(arretId),
    }
    return repondre(v)
  },
  async remettreRetour(arretId, code, photo, o) {
    const r = await reglesDemo()
    const x = retLu(arretId)
    if (x.code.bloqueJusqua && x.code.bloqueJusqua > maintenant()) return repondre({ ok: false as const, raison: 'bloque' as const, essaisRestants: 0 })
    if (code !== codeRetour(arretId)) {
      journaliser('code_reception_faux', arretId, o)
      const reste = (x.code.essaisRestants || r.codeEssais) - 1
      etat.ecrire((e) => {
        ret(e, arretId).code.essaisRestants = reste
        if (reste <= 0) ret(e, arretId).code.bloqueJusqua = maintenant() + r.codeBlocageH * 60 * MINUTE_MS
      })
      if (reste <= 0) ouvrirIncident('Code de réception bloqué', 'Les colis de retour restent avec vous. {entreprise} valide ; le vendeur redemande un code et la course est reprogrammée.', { entreprise: 'Yafé Express' }, arretId, { famille: 'vendeur', type: 'code_bloque' })
      return repondre(reste <= 0 ? { ok: false as const, raison: 'bloque' as const, essaisRestants: 0 } : { ok: false as const, raison: 'code_faux' as const, essaisRestants: reste })
    }
    if (!journaliser('retour_remis:' + photo, arretId, o)) return repondre(ok)
    const remis = colisRetour(arretId)
    const n = remis.length
    etat.ecrire((e) => void (ret(e, arretId).remisA = maintenant()))
    // Course de retour d'une commande du client : le vendeur, le client et l'entreprise voient le retour à la boutique.
    const pq = objetsPont.lire().lieux[arretId]?.paquetId
    if (pq) publier({ type: 'parcel.returned', paquet: pq, colis: remis.map((c) => c.id), photo: !!photo }, 'parcel.returned-' + arretId, maintenant())
    changerGarde(-n)
    etape(arretId, 3)
    terminerArret(arretId, 'fait', n)
    return repondre(ok)
  },
  retourImpossible(arretId, raison, photo, o) {
    if (!journaliser('retour_impossible:' + raison + ':' + photo, arretId, o)) return repondre({ ok: true as const, relais: RELAIS_ZONE })
    const colis = colisRetour(arretId).map((c) => ({ id: c.id, etiquette: c.etiquette, classe: c.classe }))
    etat.ecrire((e) => {
      ret(e, arretId).impossible = { raison, quand: maintenant(), relais: RELAIS_ZONE }
      e.depots.A8 = { ...depot(), colisFixes: colis }
    })
    ajouterDepotRelais(arretDe(arretId)?.paquetId ?? 'PQ-Z1-261013-006', colis.length, Object.fromEntries(colis.map((c) => [c.classe, 1])))
    terminerArret(arretId, 'echec')
    modifier(raison === 'vendeur_refuse' ? '{vendeur} refuse le retour : dépôt au {relais}, la console arbitre et le refus pèse sur le vendeur.' : '{vendeur} absent : dépôt au {relais}, nouvelle course au prochain jour de service.', { vendeur: 'Tech Bastos', relais: RELAIS_ZONE })
    return repondre({ ok: true as const, relais: RELAIS_ZONE })
  },

  // ---------- Démonstration : l'autre téléphone ----------
  async simulerScanRelais(arretId, avecAnomalies) {
    if (!surPlace(arretId)) return
    const colis = colisDuDepot(arretId)
    etat.ecrire((e) => {
      const d = e.depots[arretId]
      d.scanneA = maintenant()
      d.resultatsA = maintenant()
      colis.forEach((c, i) => {
        const dernier = i === colis.length - 1
        d.resultats[c.id] =
          avecAnomalies && i === 1
            ? { resultat: 'reserve', emplacement: 'B-0' + (i + 1), photos: 1, motif: 'Angle enfoncé', constatAccepte: false }
            : avecAnomalies && dernier && colis.length > 2
              ? { resultat: 'refuse', emplacement: null, photos: 2, motif: 'Scellé cassé', constatAccepte: false }
              : { resultat: 'controle', emplacement: 'B-0' + (i + 1), photos: 0, motif: null, constatAccepte: false }
      })
    })
    etape(arretId, 2)
  },
  async simulerPresentation(arretId) {
    const suivant = colLu(arretId).colis.find((c) => !c.presenteA && !c.manquant)
    if (!suivant || !surPlace(arretId)) return
    etat.ecrire((e) => void (col(e, arretId).colis.find((c) => c.id === suivant.id)!.presenteA = maintenant()))
  },
}

