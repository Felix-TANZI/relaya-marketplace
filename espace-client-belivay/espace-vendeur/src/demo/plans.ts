// DONNÉES DE DÉMONSTRATION — domaine « plans » (croissance) : le serveur de la démonstration.
// - Plans lus au registre (VD-PLAN-BOOST, -PRO, -ANNUEL, -ESSAI, -GRACE) ; essai d'un mois offert, à l'année 10 mois
//   payés pour 12, paiement par demande Mobile Money confirmée sur le téléphone (PLN-04) : la démonstration confirme
//   la demande à la première vérification (« J'ai confirmé ») ; rien n'est activé avant.
// - Simulateur : ventes de l'ITEL AC52 (article de référence, Électronique, palier du jour, découverte comprise),
//   gardés par plan CALCULÉS (src/calculs/commission.ts : simulerPlans) ; seuils de remboursement cherchés de même.
// - Se faire voir : récompenses au mérite seulement (DP-14, Q-32, P-3) ; aucune visibilité payante.
// - Services, chiffres des 30 derniers jours (lus dans les commandes du jeu d'essai), demande de la zone.
// Prix à l'année, fin et rappel d'essai, remise plafonnée à l'année : src/calculs/plans.ts (portage de plans.py).
import type { DemandePaiement, Demande, DomainePlans, EtatPlan, OffrePlan, Recompense, Service, Simulation, Stats } from '../donnees/domaines/plans'
import type { Plan } from '../donnees/communs'
import { calculerCommission, decouverteActive, familleDe, finDecouverte, simulerPlans } from '../calculs/commission'
import { finEssai as finDEssai, PLANS, prixAnnuel as prixALAnnee, rappelEssai, type Facturation } from '../calculs/plans'
import { pourCentAffiche } from '../calculs/argent'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { ajouterMois, HEURE, JOUR, jourDe, jourSemaine, yaounde } from '../calculs/temps'
import { ventesLibereesDuMois } from './argent'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES } from './jeu-essai'
import { commandesComptees } from './commandes'
import { demoProduits, etatOffres } from './produits'
import { ajouterPromo, etatPromos, promoActive } from './ventes-flash'
import { apresHeuresOuvrees } from './trust'
import { magasin, repondre } from './stockage'
import { estProprietaire } from './session'
import { ReserveAuProprietaire } from '../donnees/communs'

/** Plans, paiements, récompenses, services et chiffres : réservés au propriétaire (403 owner_only, VD-D12.A03). */
function proprietaire(quoi: string) {
  if (!estProprietaire()) throw new ReserveAuProprietaire(quoi)
}

// ---------- Registre ----------

const lire = (code: string, motif: RegExp) => {
  const m = motif.exec(REGISTRE[code] ?? '')
  if (!m) throw new Error(`${code} : forme inattendue (« ${REGISTRE[code]} »)`)
  return m
}
const FLASH_REMISE_MIN = Number(lire('FLASH-REMISE-MIN', /^(\d+) %$/)[1])
const FLASH_DUREE = Number(lire('FLASH-DUREE-MAX', /^(\d+) h$/)[1])
const FLASH_OUVERT = /^ouvert/.test(REGISTRE['FF-FLASH'] ?? '')
const prixAnnuel = (plan: 'Boost' | 'Pro') => prixALAnnee(plan, PARAMETRES.commission)

// Valeurs de la console (aucun code au registre vendeur ; chiffres de démonstration, DP-56 Q-40).
// Valeurs de console lues au registre (DP-57 : VD-SIMULATEUR, VD-VISIBILITE, VD-VISITE-AGENT, VD-DEMANDE).
const PCO = PARAMETRES.console
const CONSOLE = {
  simulateurMax: PCO.simulateur.max, // curseur de 0 à 1 000 000 F (VD10-R36)
  surMesureDes: PCO.simulateur.surMesureDes, // Sur-mesure (VD10-R33)
  flashRelueAuDela: PCO.visibilite.remiseReluePct, // remise relue par la console (P-3, OFR-05)
  scoreMinVisibilite: PCO.visibilite.scoreMin, // VIS-02
  meriteJours: PCO.visibilite.meriteJours, // offre la moins chère livrée de sa zone N jours de suite (P-3)
  vitrineJours: PCO.visibilite.vitrineJours,
  visiteHeures: PCO.visiteAgentHeures, // visite de l'agent, sinon remboursement (P-4)
  recherchesFree: PCO.demande.visiblesFree, // Free montre les premières recherches sans résultat (VD10-R47)
  dependancePourCent: 60, // un produit qui fait plus de 60 % des ventes (lecture des chiffres, pas une règle de console)
}
const SERVICES: Omit<Service, 'demande'>[] = [
  { id: 'agent_photos', titre: 'Photos par un agent BelivaY', prix: PCO.agentPhotos.prix, unite: 'les 10 produits', gratuit: false, frein: 'Une seule photo sur l’ITEL', route: null },
  { id: 'fiche_prioritaire', titre: 'Fiche prioritaire', prix: PCO.fiche.prioPrix, unite: 'la fiche', gratuit: false, frein: null, route: 'fiche' },
  { id: 'saisie_assistee', titre: 'Saisie assistée', prix: PCO.saisie.prixSession, unite: 'la session', gratuit: true, frein: null, route: 'saisie_assistee' },
]
// Vues des offres sur 30 jours (service des statistiques) ; recherches sans résultat de la zone (GET /demand).
const VUES: Record<string, number> = { 'itel-noir': 210, 'itel-bleu': 0, iphone: 130 }
const RECHERCHES = [
  { mots: 'chargeur itel', fois: 14 },
  { mots: 'coque iphone 15', fois: 11 },
  { mots: 'écouteurs sans fil', fois: 8 },
  { mots: 'batterie externe 20 000', fois: 6 },
  { mots: 'montre connectée', fois: 5 },
]

/** Recherche sans résultat la plus fréquente de la zone (GET /demand?limit=1 ; 30 jours glissants, Q-96) : « Une
 * idée pour vendre plus » de l'accueil. */
export const JOURS_DEMANDE = PCO.demande.jours // VD-DEMANDE (Q-96)
export const rechercheLaPlusDemandee = () => [...RECHERCHES].sort((a, b) => b.fois - a.fois)[0] ?? null

// ---------- État ----------

interface Paiement extends DemandePaiement {
  quoi: { type: 'plan'; plan: Exclude<Plan, 'Free'>; facturation: 'mensuelle' | 'annuelle' } | { type: 'service'; service: Service['id'] }
}
const etat = magasin('plans-croissance', () => ({
  plan: BOUTIQUE.plan as Plan,
  facturation: null as EtatPlan['facturation'],
  depuis: null as string | null,
  essais: [] as Plan[],
  arret: false,
  paiements: {} as Record<string, Paiement>,
  recompenses: {} as Record<string, { utiliseeA: number; jusqua: number | null; flash: { remisePourCent: number; etat: 'programmee' | 'en_verification' } | null }>,
  services: {} as Partial<Record<Service['id'], { demandeId: string; visiteAvant: number | null }>>,
  n: 0,
}))

/** Plan en cours (pastille de l'en-tête : à lire par la session, INTEGRATION.md). */
export const planCourant = (): Plan => etat.lire().plan

// ---------- Plans ----------

const INCLUS: Record<Plan, string[]> = {
  Free: ['Vendre sur BelivaY, versement chaque vendredi sans frais', 'Vos chiffres des 30 derniers jours', 'Les 3 premières recherches sans résultat de votre zone'],
  Boost: ['Vous gardez un peu plus sur chaque vente, jusqu’au prix du plan', 'Vos chiffres sur 3 et 12 mois', 'Toutes les recherches sans résultat de votre zone', 'Alerte quand un produit est cherché sans résultat dans votre zone'],
  Pro: ['Vous gardez encore plus sur chaque vente, jusqu’au prix du plan', 'Tout ce que contient Boost', 'Chiffres par offre et par quartier, prix conseillé', 'Badge Pro dans votre espace'],
}

function offres(): OffrePlan[] {
  const e = etat.lire()
  const p = PARAMETRES.commission.plans
  return PLANS.map((plan) => ({
    plan,
    prixMensuel: plan === 'Free' ? 0 : p[plan].prixMensuel,
    prixAnnuel: plan === 'Free' ? null : prixAnnuel(plan),
    remisePourCent: plan === 'Free' ? 0 : Number(p[plan].remisePourCent.texte()),
    actuel: e.plan === plan,
    inclus: INCLUS[plan],
    essaiPossible: plan !== 'Free' && !e.essais.includes(plan),
  }))
}

/** Ce que l'offre de découverte fait garder en plus sur une vente de l'article de référence (« + 540 F »). */
function gainDecouverte() {
  const pc = PARAMETRES.commission
  const ligne = [{ famille: familleDe(ARTICLES['itel-noir'].categorie, pc), prixUnitaire: ARTICLES['itel-noir'].prix }]
  return { titre: ARTICLES['itel-noir'].titre, prix: ARTICLES['itel-noir'].prix, gain: calculerCommission(ligne, BOUTIQUE.palier, true, pc).garde - calculerCommission(ligne, BOUTIQUE.palier, false, pc).garde }
}

function etatPlan(): EtatPlan {
  const e = etat.lire()
  const pc = PARAMETRES.commission
  const jour = jourDe(maintenant())
  const finEssai = e.facturation === 'essai' && e.depuis ? finDEssai(e.depuis, pc) : null
  const prix = e.plan === 'Free' ? 0 : e.facturation === 'annuelle' ? prixAnnuel(e.plan) : pc.plans[e.plan].prixMensuel
  const finPeriode = e.plan === 'Free' || !e.depuis ? null : (finEssai ?? ajouterMois(e.depuis, e.facturation === 'annuelle' ? 12 : 1))
  const prochain = !finPeriode || e.arret ? null : { jour: finPeriode, montant: e.facturation === 'essai' ? pc.plans[e.plan as 'Boost' | 'Pro'].prixMensuel : prix }
  return {
    plan: e.plan,
    facturation: e.plan === 'Free' ? null : e.facturation,
    depuis: e.depuis,
    finEssai,
    rappelLe: finEssai && e.depuis ? rappelEssai(e.depuis, pc) : null,
    finPeriode,
    prochainPaiement: prochain,
    paiementEchoue: null,
    arretDemande: e.arret,
    numero: { operateur: BOUTIQUE.numeroVersement.operateur, masque: BOUTIQUE.numeroVersement.masque },
    decouverte: { commandes: commandesComptees(), max: pc.decouverteCommandes, fin: finDecouverte(BOUTIQUE.premiereCommandePayee, pc), active: decouverteActive(BOUTIQUE.premiereCommandePayee, jour, commandesComptees(), pc), gain: gainDecouverte() },
    surMesureDes: CONSOLE.surMesureDes,
  }
}

// ---------- Simulateur ----------

const ITEL = ARTICLES['itel-noir']
function gardesPour(unites: number, facturation: Facturation = 'mensuelle') {
  const pc = PARAMETRES.commission
  const dec = decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(maintenant()), commandesComptees(), pc)
  const vente = unites > 0 ? calculerCommission([{ famille: familleDe(ITEL.categorie, pc), prixUnitaire: ITEL.prix }], BOUTIQUE.palier, dec, pc) : null
  return simulerPlans(vente ? Array.from({ length: unites }, () => vente) : [], pc, facturation)
}
/** Ventes libérées du mois (même base que Mes gains, Q-83) : commandes versées ou à verser. */
/** Ventes du mois : celles libérées ce mois-ci, même base que Mes gains (Q-83). */
const ventesDuMois = (): number => ventesLibereesDuMois()
function simulation(ventes?: number, facturation: 'mensuelle' | 'annuelle' = 'mensuelle'): Simulation {
  const pas = ITEL.prix
  const max = CONSOLE.simulateurMax
  const v = Math.min(max, Math.max(0, Math.round((ventes ?? ventesDuMois()) / pas) * pas))
  const s = gardesPour(v / pas, facturation)
  const seuil = (plan: 'Boost' | 'Pro') => {
    for (let n = 1; n * pas <= max; n++) {
      const g = gardesPour(n, facturation).gardes
      if (g[plan] >= g.Free) return n * pas
    }
    return null
  }
  const seuils = { Boost: seuil('Boost'), Pro: seuil('Pro') }
  const points = [...new Set([ventesDuMois(), seuils.Boost, seuils.Pro].filter((x): x is number => x !== null))].sort((a, b) => a - b)
  return {
    facturation,
    ventes: v,
    unites: v / pas,
    base: { categorie: 'Téléphones', palier: BOUTIQUE.palier, titre: ITEL.titre, prix: ITEL.prix },
    gardes: s.gardes,
    meilleur: s.meilleur,
    rembourse: { Boost: s.gardes.Boost >= s.gardes.Free && v > 0, Pro: s.gardes.Pro >= s.gardes.Free && v > 0 },
    seuils,
    reperes: points.map((x) => {
      const r = gardesPour(x / pas, facturation)
      return { ventes: x, gardes: r.gardes, meilleur: r.meilleur }
    }),
    ventesDuMois: ventesDuMois(),
    pas,
    max,
  }
}

// ---------- Paiements ----------

function nouveauPaiement(montant: number, objet: string, quoi: Paiement['quoi']): Paiement {
  const e = etat.ecrire((x) => {
    x.n += 1
  })
  const p: Paiement = { id: `PAY-${String(e.n).padStart(4, '0')}`, montant, objet, envoyeeA: maintenant(), statut: 'en_attente', quoi }
  etat.ecrire((x) => {
    x.paiements[p.id] = p
  })
  return p
}
const publique = ({ id, montant, objet, envoyeeA, statut }: Paiement): DemandePaiement => ({ id, montant, objet, envoyeeA, statut })

// ---------- Visibilité ----------

async function visibilite() {
  const e = etat.lire()
  const offre = await demoProduits.detail('itel-noir')
  const stock = offre?.stock ?? 0
  const debutMois = jourDe(maintenant()).slice(0, 8) + '01'
  const recompense = (id: string, type: Recompense['type'], titre: string, jours: number | null): Recompense => {
    const r = e.recompenses[id]
    const utilisee = !!r && jourDe(r.utiliseeA) >= debutMois
    return { id, type, titre, offreId: 'itel-noir', offreTitre: ITEL.titre, jours, disponible: !utilisee, enCoursJusqua: utilisee && r.jusqua && r.jusqua > maintenant() ? r.jusqua : null, venteFlash: utilisee ? r.flash : null }
  }
  return {
    // Gagnée en septembre : l'ITEL AC52 a été l'offre la moins chère livrée de la zone du 8 au 14 septembre ; un
    // vendeur est moins cher depuis (alerte « concurrent moins cher » des produits) : la série repart de zéro.
    merite: { gagne: true, raison: 'du 8 au 14 sept.', offreTitre: ITEL.titre, joursDeSuite: offre?.attention.includes('concurrent_moins_cher') ? 0 : CONSOLE.meriteJours, joursRequis: CONSOLE.meriteJours },
    recompenses: [recompense('REC-VITRINE', 'vitrine', 'Vitrine de quartier', CONSOLE.vitrineJours), FLASH_OUVERT ? recompense('REC-FLASH', 'flash', 'Vente flash', null) : null].filter((r): r is Recompense => r !== null),
    bloque: BOUTIQUE.trustScore < CONSOLE.scoreMinVisibilite ? ('score_trop_bas' as const) : stock <= 0 ? ('rupture' as const) : null,
    scoreMin: CONSOLE.scoreMinVisibilite,
    stockOffre: stock,
    flash: { ouvert: FLASH_OUVERT, remiseMin: FLASH_REMISE_MIN, relueAuDela: CONSOLE.flashRelueAuDela, dureeMaxHeures: FLASH_DUREE },
  }
}

// ---------- Chiffres ----------

function stats(): Stats {
  const debut = maintenant() - 30 * JOUR
  const dans = COMMANDES.filter((c) => c.payeeA >= debut && c.payeeA <= maintenant())
  const encaissees = dans.filter((c) => !c.payableAuRetrait)
  const ventes = encaissees.reduce((s, c) => s + ARTICLES[c.article].prix * c.quantite, 0)
  const livrees = dans.filter((c) => c.retraitA && c.retraitA <= maintenant())
  const retours = dans.filter((c) => c.retour)
  const vues = Object.values(VUES).reduce((s, v) => s + v, 0)
  const parJour = Array.from({ length: 7 }, (_, j) => ({ jour: j, ventes: encaissees.filter((c) => jourSemaine(jourDe(c.payeeA)) === j).reduce((s, c) => s + ARTICLES[c.article].prix * c.quantite, 0) }))
  const titres = [...new Set(encaissees.map((c) => ARTICLES[c.article].titre))]
  const parProduit = titres
    .map((titre) => {
      const v = encaissees.filter((c) => ARTICLES[c.article].titre === titre).reduce((s, c) => s + ARTICLES[c.article].prix * c.quantite, 0)
      return { offreId: encaissees.find((c) => ARTICLES[c.article].titre === titre)!.article, titre, ventes: v, partPourCent: ventes ? pourCentAffiche(v, ventes) : 0 }
    })
    .sort((a, b) => b.ventes - a.ventes)
  const premier = parProduit[0]
  const jours = premier ? [...new Set(encaissees.filter((c) => ARTICLES[c.article].titre === premier.titre).map((c) => jourSemaine(jourDe(c.payeeA))))].sort() : []
  return {
    jours: 30,
    ventes,
    commandes: dans.length,
    encaissees: encaissees.length,
    panierMoyen: encaissees.length ? Math.round(ventes / encaissees.length) : 0,
    retoursPourCent: livrees.length ? pourCentAffiche(retours.length, livrees.length) : 0,
    vues,
    conversionPourCent: vues ? Math.round((encaissees.length / vues) * 1000) / 10 : 0,
    parJour,
    parProduit,
    meilleursJours: jours,
    dependance: premier && premier.partPourCent > CONSOLE.dependancePourCent && parProduit.length > 1 ? { titre: premier.titre, partPourCent: premier.partPourCent } : null,
    historiqueVerrouille: etat.lire().plan === 'Free',
  }
}

async function demande(): Promise<Demande> {
  const free = etat.lire().plan === 'Free'
  const itel = await demoProduits.detail('itel-noir')
  return {
    zone: BOUTIQUE.zone,
    recherches: RECHERCHES.map((r, i) => ({ ...r, verrouillee: free && i >= CONSOLE.recherchesFree })),
    visiblesSansBoost: CONSOLE.recherchesFree,
    freins: [
      ...(itel && !etat.lire().services.agent_photos ? [{ type: 'photo' as const, titre: 'Une seule photo sur l’ITEL', texte: 'Les offres avec des photos nettes et nombreuses reçoivent plus de commandes.', solution: 'Photos par un agent', route: 'services' }] : []),
      { type: 'attribution', titre: 'L’iPhone n’est pas attribué aux clients de Bastos', texte: estProprietaire() ? 'Pour eux, la livraison depuis votre boutique coûte 1 500 F.' : 'Pour eux, la livraison depuis votre boutique coûte plus que chez un autre vendeur.', solution: 'Vitrine de quartier ou prix ajusté', route: 'visibilite' },
      { type: 'avis', titre: '2 avis seulement', texte: 'Le rappel automatique de notation est déjà actif après chaque retrait.', solution: 'Voir mes avis', route: 'avis' },
    ],
  }
}

// ---------- Source ----------

export const demoPlans: DomainePlans = {
  plans: async () => (proprietaire('plans'), repondre(offres())),
  etat: async () => (proprietaire('plans'), repondre(etatPlan())),
  simuler: async (v, f) => (proprietaire('simulateur'), repondre(simulation(v, f))),
  async essayer(plan) {
    proprietaire('croissance')
    const e = etat.lire()
    if (e.plan === plan) return { ok: false, raison: 'deja_actif' }
    if (e.essais.includes(plan)) return { ok: false, raison: 'deja_essaye' }
    const jour = jourDe(maintenant())
    etat.ecrire((x) => {
      x.essais.push(plan)
      x.plan = plan
      x.facturation = 'essai'
      x.depuis = jour
      x.arret = false
    })
    return { ok: true, finEssai: finDEssai(jour, PARAMETRES.commission), rappelLe: rappelEssai(jour, PARAMETRES.commission) }
  },
  async souscrire(plan, facturation) {
    proprietaire('croissance')
    const e = etat.lire()
    if (e.plan === plan && e.facturation === facturation) return { ok: false, raison: 'deja_actif' }
    const montant = facturation === 'annuelle' ? prixAnnuel(plan) : PARAMETRES.commission.plans[plan].prixMensuel
    const p = nouveauPaiement(montant, facturation === 'annuelle' ? `${plan} · un an` : `${plan} · un mois`, { type: 'plan', plan, facturation })
    return { ok: true, demande: publique(p) }
  },
  async paiement(id) {
    proprietaire('croissance')
    const p = etat.lire().paiements[id]
    if (!p) return null
    if (p.statut === 'en_attente') {
      // Démonstration : le vendeur a confirmé dans le menu de son opérateur (payment.confirmed).
      etat.ecrire((x) => {
        x.paiements[id].statut = 'confirme'
        const q = p.quoi
        if (q.type === 'plan') {
          x.plan = q.plan
          x.facturation = q.facturation
          x.depuis = jourDe(maintenant())
          x.arret = false
          if (!x.essais.includes(q.plan)) x.essais.push(q.plan)
        } else x.services[q.service] = { demandeId: id, visiteAvant: q.service === 'agent_photos' ? apresHeuresOuvrees(maintenant(), CONSOLE.visiteHeures) : null }
      })
    }
    return repondre(publique(etat.lire().paiements[id]))
  },
  async annulerPaiement(id) {
    etat.ecrire((x) => {
      const p = x.paiements[id]
      if (p && p.statut === 'en_attente') p.statut = 'refuse'
    })
  },
  async arreter(arret) {
    proprietaire('croissance')
    etat.ecrire((x) => {
      if (x.plan !== 'Free') x.arret = arret
    })
    return etatPlan()
  },
  visibilite: async () => (proprietaire('visibilité'), visibilite()),
  async utiliserRecompense(id) {
    proprietaire('croissance')
    const v = await visibilite()
    const r = v.recompenses.find((x) => x.id === id)
    if (!r || !r.disponible) return { ok: false, raison: 'deja_utilisee' }
    if (v.bloque) return { ok: false, raison: v.bloque }
    const jusqua = maintenant() + (r.jours ?? 0) * JOUR
    etat.ecrire((x) => {
      x.recompenses[id] = { utiliseeA: maintenant(), jusqua, flash: null }
    })
    return { ok: true, jusqua }
  },
  async programmerVenteFlash(id, remise) {
    proprietaire('croissance')
    const v = await visibilite()
    const r = v.recompenses.find((x) => x.id === id && x.type === 'flash')
    if (!v.flash.ouvert || !r) return { ok: false, raison: 'ferme' }
    if (!r.disponible) return { ok: false, raison: 'deja_utilisee' }
    if (v.bloque) return { ok: false, raison: v.bloque }
    if (!Number.isInteger(remise) || remise < v.flash.remiseMin) return { ok: false, raison: 'remise_trop_basse' }
    if (remise > 90) return { ok: false, raison: 'remise_trop_haute' }
    const e = remise > v.flash.relueAuDela ? ('en_verification' as const) : ('programmee' as const)
    // Une seule notion côté vendeur (demo/ventes-flash.ts) : la vente offerte entre dans la liste des Promotions, au
    // créneau choisi par BelivaY (ici le lendemain à 8 h, pour la durée maximale), sur le prix pratiqué de l'offre.
    const o = etatOffres.lire().offres.find((x) => x.id === r.offreId)
    if (!o || o.prix === null || etatPromos.lire().promos.some((x) => x.offreId === r.offreId && promoActive(x))) return { ok: false, raison: 'ferme' }
    const [a, m, j] = jourDe(maintenant() + JOUR).split('-').map(Number)
    const debut = yaounde(a, m, j, 8)
    ajouterPromo({ offreId: r.offreId, origine: 'merite', type: 'pourcent', valeur: remise, prixReference: o.prix, prixPromo: Math.floor((o.prix * (100 - remise)) / 1000) * 10, debut, fin: debut + FLASH_DUREE * HEURE, relue: e === 'en_verification' })
    etat.ecrire((x) => {
      x.recompenses[id] = { utiliseeA: maintenant(), jusqua: null, flash: { remisePourCent: remise, etat: e } }
    })
    return { ok: true, etat: e }
  },
  async services() {
    proprietaire('croissance')
    const e = etat.lire()
    const liste = SERVICES.map((s) => {
      const d = e.services[s.id]
      const p = d ? e.paiements[d.demandeId] : null
      const enCours = Object.values(e.paiements).find((x) => x.quoi.type === 'service' && x.quoi.service === s.id && x.statut === 'en_attente')
      return {
        ...s,
        demande: d && p ? { id: p.id, statut: d.visiteAvant && d.visiteAvant < maintenant() ? ('rembourse' as const) : ('visite_prevue' as const), visiteAvant: d.visiteAvant } : enCours ? { id: enCours.id, statut: 'en_attente' as const, visiteAvant: null } : null,
      }
    })
    return repondre({ zone: BOUTIQUE.zone, numero: { operateur: BOUTIQUE.numeroVersement.operateur, masque: BOUTIQUE.numeroVersement.masque }, delaiVisiteHeures: CONSOLE.visiteHeures, liste: liste.sort((a, b) => Number(!!b.frein) - Number(!!a.frein)) })
  },
  async demanderService(service) {
    proprietaire('croissance')
    const s = SERVICES.find((x) => x.id === service)!
    if (s.gratuit) return { ok: false, raison: 'gratuit_ailleurs' }
    if (etat.lire().services[service]) return { ok: false, raison: 'deja_demande' }
    const p = nouveauPaiement(s.prix, s.titre, { type: 'service', service })
    return { ok: true, demande: publique(p) }
  },
  stats: async () => (proprietaire('chiffres'), repondre(stats())),
  demande: () => demande(),
}
void HEURE
