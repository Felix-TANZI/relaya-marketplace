// DONNÉES DE DÉMONSTRATION — domaine « stock » : lit le modèle central (src/demo/colis.ts) ; onglets, plan, fiche
// complète et inventaire. Tous les montants, rangs et dates viennent des calculs du socle (src/calculs/garde.ts,
// capacite.ts) appliqués au jeu d'essai : rien n'est recopié. Le « serveur » de démonstration filtre ce que l'employé
// ne doit pas voir (part du relais, PR-RC-09) ; la valeur et le client d'un colis ne sortent jamais (GEN-01).
import { PARAMETRES } from '../calculs/registre'
import { ETAGERES_PERMISES } from '../calculs/capacite'
import { PRESENTS } from '../calculs/cycle'
import { debutTranche, fermeturesDe, dernierJourDeRetrait, etat as etatGarde, jourDuRang, ouvert, rappels, tarifDuJour, DERNIER_RANG, RANGS_DES_RAPPELS, type GroupeEnGarde } from '../calculs/garde'
import { renvoiAuVendeur } from '../calculs/renvoi'
import { aHeure, jourDe, minutesDuJour, type Jour } from '../calculs/temps'
import type { ClasseColis, Origine } from '../donnees/communs'
import type { ColisRelais, OngletStock } from '../donnees/domaines/colis'
import type { CasePlan, CategorieStock, DomaineStock, EtapeParcours, EtiquetteStock, FicheColis, FiltresStock, GrilleVue, Inventaire, JourGarde, LigneStock, MotifNonRemettable, Stock, VueStock } from '../donnees/domaines/stock'
import { CATEGORIES } from '../donnees/domaines/stock'
import { FILTRES, etatColis, gardeDuGroupe, groupeVu, membresDuGroupe, occupationDuRelais, plan, tousLesColis, unColis } from './colis'
import { confirmerEnAttente } from './departs'
import { aujourdhui, maintenant } from './horloge'
import { COLLECTES, CONSTAT } from './jeu-essai'
import { etatRelais } from './relais'
import { acteurActuel, membreActuel, verifierPin } from './session'
import { pontInventaireManquants, pontOccupation } from './pont-relais'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
const ONGLETS = Object.keys(FILTRES) as OngletStock[]

/** Le membre connecté voit-il l'argent du relais (sa part) ? Le propriétaire, ou un membre à qui le droit est donné. */
const voitArgent = () => {
  const m = membreActuel()
  return !!m && (m.role === 'proprietaire' || m.droits.includes('argent'))
}

// ── Classement (STK-01, STK-02 ; A-VALIDER pr06 ARL-80, ARL-81) ────────────────────────────────────────────────
/** Ordre d'urgence des étiquettes : la plus urgente colore la case du plan et passe en tête de liste. */
export const ORDRE: readonly EtiquetteStock[] = ['a_renvoyer', 'a_faire_partir', 'transfert', 'dernier_jour', 'payant', 'groupage', 'constat', 'incomplet', 'pas_prevenu', 'gratuit', 'retour']

/** Onglet et étiquette d'un colis au relais ; null : pas (ou plus) au relais. */
export function classer(c: ColisRelais, groupe = groupeVu(c.groupe)): { categorie: CategorieStock; etiquette: EtiquetteStock } | null {
  if (!PRESENTS.includes(c.etat)) return null
  switch (c.etat) {
    case 'a_renvoyer':
      return { categorie: 'urgents', etiquette: 'a_renvoyer' }
    case 'a_faire_partir':
    case 'refuse_comptoir':
      return { categorie: 'urgents', etiquette: 'a_faire_partir' }
    case 'transfert_demande':
      return { categorie: 'urgents', etiquette: 'transfert' }
    case 'dernier_jour':
      return { categorie: 'urgents', etiquette: 'dernier_jour' }
    case 'en_groupage':
      return { categorie: 'groupage', etiquette: 'groupage' }
    case 'en_constat':
      return { categorie: 'hors_garde', etiquette: 'constat' }
    case 'retour_depose':
      return { categorie: 'hors_garde', etiquette: 'retour' }
  }
  // En stock (ou reçu, lot pas encore validé) : selon la garde du groupe.
  const g = c.garde
  if (!g || g.j1 === null) return { categorie: 'gratuits', etiquette: groupe && groupe.arrives < groupe.total ? 'incomplet' : 'pas_prevenu' }
  if (g.du > 0) return { categorie: 'payants', etiquette: 'payant' }
  return { categorie: 'gratuits', etiquette: 'gratuit' }
}

const sansEspace = (s: string) => s.toUpperCase().replace(/[\s-]+/g, '')

function ligne(c: ColisRelais, tous: ColisRelais[] = tousLesColis()): LigneStock | null {
  const groupe = groupeVu(c.groupe)
  const k = classer(c, groupe)
  if (!k) return null
  const collecte = c.sortie?.collecte ? (COLLECTES.find((x) => x.id === c.sortie!.collecte) ?? null) : null
  const auRelais = groupe ? tous.filter((x) => x.groupe === c.groupe && PRESENTS.includes(x.etat)).length : 1
  return {
    colis: c,
    ...k,
    groupe: { id: c.groupe, total: groupe?.total ?? 1, auRelais },
    depart: k.categorie === 'urgents' && k.etiquette !== 'dernier_jour' ? { collecte: collecte?.id ?? null, heure: collecte?.heurePrevue ?? null } : null,
    remplacement: false, // STK-13 : le modèle central ne porte pas encore la marque « remplacement » (compte rendu)
  }
}

const rangLigne = (l: LigneStock) => ORDRE.indexOf(l.etiquette)
const trier = (a: LigneStock, b: LigneStock) => rangLigne(a) - rangLigne(b) || (b.colis.garde?.rang ?? 0) - (a.colis.garde?.rang ?? 0) || (a.colis.arrivee.le ?? 0) - (b.colis.arrivee.le ?? 0) || a.colis.id.localeCompare(b.colis.id)

function filtrer(l: LigneStock, f: FiltresStock): boolean {
  const c = l.colis
  if (f.classe && c.classe !== f.classe) return false
  if (f.codeBloque && !c.code.bloqueJusqua) return false
  if (f.auComptoir && !(c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme')) return false
  if (f.emplacement && c.emplacement !== f.emplacement) return false
  const q = sansEspace(f.q ?? '')
  if (q && ![c.id, c.retour?.reference ?? '', c.emplacement ?? '', c.groupe].some((x) => sansEspace(x).includes(q))) return false
  return true
}

export function grilleVue(): GrilleVue {
  const g = P.garde.grille
  const paliers: GrilleVue['paliers'] = []
  g.forEach((tarif, k) => {
    const der = paliers[paliers.length - 1]
    if (der && der.tarif === tarif) der.a = k + 1
    else paliers.push({ de: k + 1, a: k + 1, tarif })
  })
  return {
    paliers,
    totalSeptJours: g.reduce((a, b) => a + b, 0),
    renvoi: P.garde.renvoi,
    gainJour: voitArgent() ? P.garde.gainRelaisJour : null,
    j1PayeParBelivay: P.garde.j1PayeParBelivay,
    ajoutGros: P.garde.ajoutGros,
    heureRappel: P.garde.heureRappel,
    rangsDesRappels: RANGS_DES_RAPPELS,
    preavisJours: P.grillePreavisJours,
  }
}

function vueStock(f: FiltresStock = {}): VueStock {
  const tous = tousLesColis()
  const lignes = tous.map((c) => ligne(c, tous)).filter((l): l is LigneStock => l !== null)
  const filtrees = lignes.filter((l) => filtrer(l, f))
  const compteurs = Object.fromEntries(CATEGORIES.map((k) => [k, filtrees.filter((l) => l.categorie === k).length])) as Record<CategorieStock, number>
  const enStock = lignes.filter((l) => l.etiquette !== 'retour')
  const parClasse = Object.fromEntries((['S', 'M', 'L'] as ClasseColis[]).map((k) => [k, { colis: enStock.filter((l) => l.colis.classe === k).length, places: enStock.filter((l) => l.colis.classe === k).reduce((n, l) => n + l.colis.places, 0) }])) as VueStock['occupation']['parClasse']
  const cases: CasePlan[] = plan(tous).map((k) => {
    const ici = lignes.filter((l) => l.colis.emplacement === k.code).sort(trier)
    return { ...k, colis: ici.map((l) => l.colis.id), etiquette: ici[0]?.etiquette ?? null }
  })
  return {
    lignes: filtrees.filter((l) => !f.categorie || l.categorie === f.categorie).sort(trier),
    compteurs,
    totalColis: enStock.length,
    occupation: { ...occupationDuRelais(etatRelais.lire().placesDeclarees, tous), seuilPct: P.capaciteSeuilPct, parClasse, retours: lignes.length - enStock.length },
    plan: cases,
    grille: grilleVue(),
    speciaux: {
      codeBloque: lignes.filter((l) => l.colis.code.bloqueJusqua).length,
      auComptoir: lignes.filter((l) => l.colis.paiement.mode === 'au_comptoir' && l.colis.paiement.etat !== 'confirme').length,
      groupage: lignes.filter((l) => l.categorie === 'groupage').length,
    },
    regles: { places: P.places, groupageLiberationJ: P.groupageLiberationJ },
  }
}

// ── Fiche complète ─────────────────────────────────────────────────────────────────────────────────────────────
const NON_REMETTABLE: Partial<Record<ColisRelais['etat'], MotifNonRemettable>> = {
  remis: 'remis',
  parti: 'parti',
  attendu: 'pas_arrive',
  absent: 'pas_arrive',
  refuse_reception: 'pas_arrive',
  en_groupage: 'groupage',
  en_constat: 'constat',
  a_renvoyer: 'a_renvoyer',
  a_faire_partir: 'a_faire_partir',
  refuse_comptoir: 'a_faire_partir',
  transfert_demande: 'transfert',
  retour_depose: 'retour',
}

/** Messages envoyés au client jusqu'à maintenant (avis d'arrivée, puis rappels S0 à S5 : calculs/garde.ts). */
function rappelsEnvoyes(g: GroupeEnGarde, montantPanier: number, retireLe: Jour | null) {
  const t = maintenant()
  let serie: ReturnType<typeof rappels>
  try {
    serie = rappels(g, P.garde, montantPanier, retireLe)
  } catch {
    // Garde suspendue sans fin connue (constat en cours) : seuls les rappels déjà partis comptent.
    serie = rappels({ ...g, joursSuspendus: g.joursSuspendus.filter((j) => j <= jourDe(t)) }, P.garde, montantPanier, retireLe)
  }
  return serie
    .filter((r) => r.envoye)
    .map((r) => ({ ...r, le: aHeure(r.jour, r.heure ?? g.horaires.ouverture) }))
    .filter((r) => r.le <= t)
}

function ficheComplete(id: string): FicheColis | null {
  const c = unColis(id)
  if (!c) return null
  const e = etatColis.lire()
  const brut = e.colis[id]
  const groupe = groupeVu(c.groupe)
  const tous = tousLesColis()
  const auRelais = tous.filter((x) => x.groupe === c.groupe && PRESENTS.includes(x.etat)).map((x) => x.id)
  const k = classer(c, groupe)
  const g = c.retour ? null : gardeDuGroupe(e, c.groupe)
  const enc = c.garde?.encaissee ?? null
  const ref = enc ? jourDe(enc.le) : aujourdhui()
  const argent = voitArgent()
  const membres = membresDuGroupe(e, c.groupe).filter((x) => !x.retour)
  const montantPanier = membres.reduce((n, x) => n + x.valeur, 0)
  const envoyes = g && g.j0 ? rappelsEnvoyes(g, montantPanier, enc ? jourDe(enc.le) : c.remise ? jourDe(c.remise.le) : null) : []
  const avis = c.retour ? null : (brut.avisA ?? null)

  // Garde jour par jour (FIC-06).
  let garde: FicheColis['garde'] = null
  let remGarde = 0
  let joursFactures = 0
  let premierJour = 0
  if (g && g.j0) {
    const jours: JourGarde[] = []
    // v2.0 : la tranche en cours se lit à l'heure (encaissement, sinon maintenant), pas au jour du calendrier.
    const enCours = g.arrivee ? etatGarde(g, ref, P.garde, enc ? enc.le : undefined).rang : null
    for (let r = 1; r <= DERNIER_RANG; r++) {
      const jour = jourDuRang(g, r)
      // v2.0 (R37) : la tranche r commence à l'heure d'arrivée ; seules les fermetures déclarées arrêtent le compteur.
      const tranche = g.arrivee ? debutTranche(g.arrivee, r, fermeturesDe(g)) : undefined
      const tarif = g.arrivee ? P.garde.grille[r - 1] : tarifDuJour(g, jour, P.garde)
      const s = etatGarde(g, jour, P.garde, tranche)
      const ferme = g.arrivee ? g.horaires.fermetures.includes(jour) : !ouvert(g.horaires, jour)
      const statut: JourGarde['statut'] = ferme ? 'ferme' : g.joursSuspendus.includes(jour) ? 'suspendu' : tarif > 0 ? 'facture' : 'offert'
      const part = tarif > 0 ? (g.gros ? P.garde.gainRelaisJourGros : P.garde.gainRelaisJour) : r === 1 ? s.payeParBelivay : 0
      jours.push({ rang: r, jour, tarif, cumul: s.du, statut, quand: enCours !== null ? (r < enCours ? 'passe' : r === enCours ? 'aujourdhui' : 'avenir') : jour < ref ? 'passe' : jour === ref ? 'aujourdhui' : 'avenir', partRelais: argent ? part : null })
    }
    const dj = dernierJourDeRetrait(g)
    let rv: { jour: Jour; retenue: number } | null = null
    try {
      // Suspension en cours (constat sans fin connue) : le calendrier est repoussé d'autant (PR-RC-06, ARL-43), la date
      // n'est donc pas encore connue ; ni dernier jour ni renvoi tant que la décision n'est pas prise (ARL-88).
      const x = g.joursSuspendus.includes(ref) ? null : renvoiAuVendeur(g, P) // calculs/renvoi.ts (ARL-08, ARL-20, ARL-130)
      rv = x ? { jour: x.jour, retenue: x.deduitDuRemboursement } : null
    } catch {
      rv = null // garde suspendue sans fin connue (constat en cours) : le renvoi attend la décision (CAL-21)
    }
    garde = {
      jours,
      gratuitJusquau: P.garde.grille[0] === 0 ? g.j0 : null,
      nonFactures: jours.filter((j) => j.statut === 'ferme' || (j.statut === 'suspendu' && (rv !== null || j.jour <= ref))).map((j) => ({ jour: j.jour, motif: j.statut as 'ferme' | 'suspendu' })),
      // Constat sans fin connue : ni dernier jour ni renvoi tant que la décision n'est pas prise (CAL-21).
      dernierJour: rv ? dj : null,
      cumulDernierJour: rv && dj ? etatGarde(g, dj, P.garde).du : 0,
      renvoi: rv,
      suspendue: g.joursSuspendus.includes(ref),
      figee: !!enc,
    }
    const s = etatGarde(g, ref, P.garde)
    remGarde = s.gainRelais
    joursFactures = s.joursFactures
    premierJour = s.payeParBelivay
  }

  // Parcours (FIC-01, FIC-05) : faits logistiques seulement.
  const parcours: EtapeParcours[] = []
  if (c.arrivee.lot) {
    parcours.push({ type: 'scelle', le: null, photos: 2, encombrant: c.classe === 'L' })
    parcours.push({ type: 'pris_en_charge', le: null, entreprise: c.arrivee.entreprise })
  }
  if (c.retour) {
    const d = c.journal.find((j) => j.action === 'retour_depose')
    if (d) parcours.push({ type: 'retour_depose', le: d.le, reference: c.retour.reference })
  }
  if (c.arrivee.le) {
    parcours.push({ type: 'recu', le: c.arrivee.le, scelle: c.arrivee.resultat === 'reserve' ? 'reserve' : 'intact', emplacement: c.emplacement })
    parcours.push({ type: 'prevenu', le: avis })
  }
  for (const r of envoyes) parcours.push({ type: 'rappel', code: r.code, le: r.le, dernierJour: r.dernierJourDeRetrait, du: r.du, duDemain: r.duDemain })
  if (garde && c.garde && c.garde.du > 0) {
    const premier = garde.jours.find((j) => j.statut === 'facture' && j.jour <= ref)
    if (premier) parcours.push({ type: 'payante', depuis: premier.jour, du: c.garde.du })
  }
  const constat = c.journal.find((j) => j.action === 'un_probleme' || j.action === 'refus_motive')
  if (constat) parcours.push({ type: 'constat', le: constat.le, reference: c.constat })
  else if (c.constat === CONSTAT.id) parcours.push({ type: 'constat', le: CONSTAT.ouvertA, reference: CONSTAT.id })
  const especes = c.journal.find((j) => j.action === 'especes_encaissees')
  if (especes) parcours.push({ type: 'encaisse', le: especes.le, montant: enc?.montant ?? null })
  if (c.remise) parcours.push({ type: 'remis', le: c.remise.le, tiers: c.remise.porteur === 'tiers' })
  if (c.sortie?.le) parcours.push({ type: 'parti', le: c.sortie.le, motif: c.sortie.motif })
  // Ordre du temps ; les étapes d'avant le relais (heure inconnue du relais) restent en tête.
  const quand = (x: EtapeParcours) => ('le' in x ? x.le : 'depuis' in x ? aHeure(x.depuis, 0) : null)
  const datees = parcours.filter((x) => quand(x) !== null).sort((a, b) => quand(a)! - quand(b)!)
  const ordre = [...parcours.filter((x) => quand(x) === null && x.type !== 'prevenu'), ...datees, ...parcours.filter((x) => x.type === 'prevenu' && quand(x) === null)]

  const motif: MotifNonRemettable | null = NON_REMETTABLE[c.etat] ?? (groupe && groupe.arrives < groupe.total ? 'incomplet' : c.code.bloqueJusqua ? 'code_bloque' : null)
  const remiseComptee = !!c.remise || !!c.retour
  const remise = P.gainColis[c.classe]
  const cases = plan(tous)
    .filter((x) => ETAGERES_PERMISES[c.classe].includes(x.etagere) && x.code !== c.emplacement && x.capacite - x.occupee >= c.places)
    .map((x) => ({ code: x.code, libres: x.capacite - x.occupee }))
  const l = ligne(c)
  return {
    colis: c,
    etiquette: k?.etiquette ?? null,
    categorie: k?.categorie ?? null,
    groupe: { id: c.groupe, total: groupe?.total ?? 1, auRelais },
    parcours: ordre,
    clientPrevenu: (avis !== null && avis <= maintenant() ? 1 : 0) + envoyes.length,
    avisDelivreA: avis,
    garde,
    remuneration: argent ? { remise, parJour: c.gros ? P.garde.gainRelaisJourGros : P.garde.gainRelaisJour, joursFactures, premierJourBelivay: premierJour, garde: remGarde, total: remise + remGarde, remiseComptee } : null,
    remettable: motif ? { ok: false, motif } : { ok: true },
    casesLibres: PRESENTS.includes(c.etat) ? cases : [],
    depart: l?.depart ?? null,
    preuves: c.preuves,
    journal: c.journal,
    remplacement: false,
  }
}

// ── Inventaire ─────────────────────────────────────────────────────────────────────────────────────────────────
export const etatStock = magasin('stock', () => ({
  inventaire: null as Inventaire | null,
  passes: [] as Inventaire[],
  cles: [] as string[],
}))
const deja = (o: Origine) => etatStock.lire().cles.includes(o.cle)

export const demoStock: DomaineStock = {
  stock(onglet = 'tous', recherche) {
    const l = tousLesColis()
    const q = recherche?.trim().toUpperCase() ?? ''
    const s: Stock = {
      onglet,
      colis: l.filter(FILTRES[onglet]).filter((c) => !q || c.id.includes(q) || (c.emplacement ?? '').includes(q)).sort((a, b) => (b.garde?.rang ?? 0) - (a.garde?.rang ?? 0)),
      compteurs: Object.fromEntries(ONGLETS.map((o) => [o, l.filter(FILTRES[o]).length])) as Record<OngletStock, number>,
      occupation: occupationDuRelais(etatRelais.lire().placesDeclarees, l),
    }
    // pont : relay.stock.updated (livreur : places ; entreprise : saturation, paquets réorientés ; client : relais retiré
    // du choix à PR-SATURATION) — une fois par occupation (la clé porte les valeurs).
    pontOccupation(s.occupation.occupees, s.occupation.declarees, s.occupation.seuilAtteint, { cle: 'occupation', heure: maintenant(), position: null })
    return repondre(s)
  },
  vue(f) {
    confirmerEnAttente()
    return repondre(vueStock(f))
  },
  fiche: (id) => repondre(unColis(id)),
  ficheComplete(id) {
    confirmerEnAttente()
    return repondre(ficheComplete(id))
  },
  plan: () => repondre(plan()),
  async deplacer(colisId, emplacement, o) {
    const c = unColis(colisId)
    const k = plan().find((x) => x.code === emplacement)
    if (!c || !k || !PRESENTS.includes(c.etat)) return { ok: false, raison: 'introuvable' }
    if (!ETAGERES_PERMISES[c.classe].includes(k.etagere)) return { ok: false, raison: 'etagere_interdite' }
    if (c.emplacement === emplacement || c.journal.some((j) => j.cle === o.cle)) return { ok: true }
    if (k.capacite - k.occupee < P.places[c.classe]) return { ok: false, raison: 'case_pleine' }
    etatColis.ecrire((e) => {
      const y = e.colis[colisId]
      y.journal.push({ le: o.heure, action: 'deplace', par: acteurActuel(), signe: false, detail: `${y.emplacement ?? '—'} → ${emplacement}`, cle: o.cle })
      y.emplacement = emplacement
    })
    return { ok: true }
  },
  inventaire: () => repondre(etatStock.lire().inventaire),
  async commencerInventaire(o) {
    const s = etatStock.lire()
    if (s.inventaire && !s.inventaire.termineA) return deja(o) ? { ok: true, id: s.inventaire.id } : { ok: false, raison: 'inventaire_en_cours' }
    const id = `INV-${jourDe(o.heure).replace(/-/g, '').slice(2)}-${String(minutesDuJour(o.heure)).padStart(4, '0')}`
    const attendus = tousLesColis()
      .filter((c) => PRESENTS.includes(c.etat))
      .map((c) => ({ id: c.id, emplacement: c.emplacement, classe: c.classe }))
    etatStock.ecrire((x) => {
      if (x.inventaire) x.passes.unshift(x.inventaire)
      x.inventaire = { id, commenceA: o.heure, par: acteurActuel().nom ?? '', attendus, pointes: [], termineA: null, bilan: null }
      x.cles.push(o.cle)
    })
    return { ok: true, id }
  },
  async pointer(colisId, trouveEn, o) {
    const inv = etatStock.lire().inventaire
    if (!inv || inv.termineA) return { ok: false, raison: 'aucun_inventaire' }
    if (deja(o)) return { ok: true, ecart: trouveEn ? 'deplace' : 'aucun' }
    const a = inv.attendus.find((x) => x.id === colisId)
    if (!a) return { ok: false, raison: unColis(colisId) ? 'pas_au_relais' : 'introuvable' }
    if (inv.pointes.some((p) => p.id === colisId)) return { ok: false, raison: 'deja_pointe' }
    const c = unColis(colisId)
    if (!c || !PRESENTS.includes(c.etat)) return { ok: false, raison: 'pas_au_relais' }
    const ailleurs = trouveEn && trouveEn !== c.emplacement ? trouveEn : null
    if (ailleurs) {
      const k = plan().find((x) => x.code === ailleurs)
      if (!k) return { ok: false, raison: 'introuvable' }
      if (!ETAGERES_PERMISES[c.classe].includes(k.etagere)) return { ok: false, raison: 'etagere_interdite' }
      // Le colis EST dans cette case : l'inventaire corrige l'emplacement (journalisé), sans contrôle de place.
      etatColis.ecrire((e) => {
        const y = e.colis[colisId]
        y.journal.push({ le: o.heure, action: 'deplace', par: acteurActuel(), signe: false, detail: `${y.emplacement ?? '—'} → ${ailleurs} (inventaire ${inv.id})`, cle: o.cle })
        y.emplacement = ailleurs
      })
    }
    etatStock.ecrire((x) => {
      x.inventaire!.pointes.push({ id: colisId, trouveEn: ailleurs, le: o.heure })
      x.cles.push(o.cle)
    })
    return { ok: true, ecart: ailleurs ? 'deplace' : 'aucun' }
  },
  async terminerInventaire(pin, o) {
    const inv = etatStock.lire().inventaire
    if (!inv) return { ok: false, raison: 'aucun_inventaire' }
    if (inv.termineA && inv.bilan) return { ok: true, bilan: inv.bilan }
    if (verifierPin(pin) !== 'ok') return { ok: false, raison: 'pin_requis' }
    const encore = new Set(tousLesColis().filter((c) => PRESENTS.includes(c.etat)).map((c) => c.id))
    const pointes = new Set(inv.pointes.map((p) => p.id))
    // Un colis remis ou parti pendant l'inventaire n'est pas manquant.
    const manquants = inv.attendus.filter((a) => encore.has(a.id) && !pointes.has(a.id)).map((a) => a.id)
    const bilan = { pointes: pointes.size, manquants, deplaces: inv.pointes.filter((p) => p.trouveEn).length }
    etatColis.ecrire((e) => {
      for (const id of manquants) e.colis[id].journal.push({ le: o.heure, action: 'inventaire_manquant', par: acteurActuel(), signe: true, detail: inv.id, cle: o.cle })
    })
    etatStock.ecrire((x) => {
      x.inventaire = { ...x.inventaire!, termineA: o.heure, bilan }
      x.cles.push(o.cle)
    })
    signalerManquants(inv.id, manquants, o)
    return { ok: true, bilan }
  },
}

/** Colis non retrouvés à l'inventaire : la console de BelivaY les reçoit (file « colis manquants au relais »). */
function signalerManquants(inventaire: string, colis: string[], o: Origine) {
  // pont : relay.inventory.missing (console d'administration : file « colis manquants au relais »)
  if (colis.length) pontInventaireManquants(inventaire, colis, o)
}
