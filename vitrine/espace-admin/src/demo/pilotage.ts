// DONNÉES DE DÉMONSTRATION — domaine « pilotage » (S5) : catalogue des paramètres (registre officiel), propositions
// simulées et versionnées, ventes flash et promotions, interrupteurs FF-*. Le « serveur » :
// - une proposition se prépare (rejeu et cas types : regles-s5.ts), se soumet ; critique → décision à quatre yeux
//   (source.quatreyeux : autre compte, Direction ou Finance) ; à la contre-signature, une NOUVELLE VERSION est créée
//   avec sa date d'effet, annoncée aux partenaires (pont) ; jamais rétroactive ;
// - une vente flash suit l'heure du serveur (début, fin jamais prolongée, arrêt automatique à stock nul) ;
// - un interrupteur ne bascule qu'à quatre yeux, et ne s'ouvre pas tant qu'un de ses paramètres est « À trancher ».
// Les chiffres du mois (revenus, volume) sont des données de démonstration ; seules les règles comptent.
import registreEtat from './pilotage-registre.json' with { type: 'json' }
import { REGISTRE } from '../calculs/registre'
import { HEURE, JOUR } from '../calculs/temps'
import { droitDe } from '../config/droits'
import { AccesRefuse, type Role } from '../donnees/communs'
import type { DomainePilotage, FlashVu, InterrupteurVu, PropositionParametre, VersionParametre, VuePromotions } from '../donnees/domaines/pilotage'
import { REGLES_S5, controlerFlash, ecrireValeur, estCritique, etatFlash, formeValeur, moduleBloque, remiseReelle, simuler, surLePas } from '../pages/ADM-11/regles-s5'
import { agentCourant, exiger, exigerPage, roleCourant } from './acces'
import { gestesDuMois } from './communication'
import { maintenant } from './horloge'
import { journaliser } from './journal'
import { T, nomAgent } from './jeu-essai'
import { publier } from './pont'
import { demoQuatreYeux, quatreYeuxDemo } from './quatreyeux'
import { CONTENU_ACCUEIL } from '@client/donnees/contenus'
import { MOMENTS_PAR_DEFAUT, dansLaPeriode, jourDuMois } from '@client/donnees/moments'
import { magasin, repondre } from './stockage'
import { systemeDemo } from './systeme'

const R = REGLES_S5
const motifValable = (m: string) => m.trim().length >= R.motifMin
const ROLES_SECOND: Role[] = ['superviseur', 'finance']

// ── Catalogue ──────────────────────────────────────────────────────────────────────────────────────────────────────
interface Ligne {
  code: string
  valeur: string
  unite: string | null
  statut: string
  famille: string
}
const ETAT = registreEtat as unknown as { statuts: string[]; familles: string[]; codes: Record<string, [number, number]> }
/** Aucun nom de prestataire à l'écran : le registre nomme les agrégateurs, la console dit leur rôle. */
const PRESTATAIRES: [RegExp, string][] = [
  [/CamPay\s*\/\s*Fapshi/g, 'Agrégateur principal / agrégateur de secours'],
  [/CinetPay \(principal\), Flutterwave \(secours\)/g, 'Prestataire carte principal, prestataire carte de secours'],
  [/\b(CamPay|CinetPay)\b/g, 'agrégateur principal'],
  [/\b(Fapshi|Flutterwave)\b/g, 'agrégateur de secours'],
]
export const neutre = (v: string): string => PRESTATAIRES.reduce((x, [re, r]) => x.replace(re, r), v)
function catalogue(): Ligne[] {
  return Object.values(REGISTRE).map((p): Ligne => {
    const e = ETAT.codes[p.code]
    return { code: p.code, valeur: neutre(p.valeur), unite: p.unite, statut: e ? ETAT.statuts[e[0]] : 'Proposé', famille: e ? ETAT.familles[e[1]] : ETAT.familles[15] }
  })
}
const ligne = (code: string) => catalogue().find((x) => x.code === code)

// ── État ───────────────────────────────────────────────────────────────────────────────────────────────────────────
interface Bascule {
  id: string // QY
  ouvrir: boolean
  par: string
  le: number
  motif: string
}
interface Interrupteur {
  code: string
  libelle: string
  apresLancement: boolean
  ouvert: boolean
  registre: string | null
  branche: string[]
  parametres: string[]
  demande: Bascule | null
  historique: { le: number; ouvert: boolean; par: string; second: string | null; motif: string }[]
}
interface Flash {
  id: string
  offre: string
  vendeur: string
  zone: string | null
  cible: string
  prix30: number
  joursPratique: number
  prixFlash: number
  debut: number
  fin: number
  stockReserve: number
  stockOffre: number
  ventes: number[]
  programmee: boolean
  simuleeLe: number | null
  arreteeLe: number | null
  annuleeLe: number | null
  motifArret: string | null
  journal: { le: number; quoi: string; par: string | null }[]
}
interface Promo {
  id: string
  offre: string
  vendeur: string
  prixBarre: number
  prix: number
  joursPratique: number
  retiree: { le: number; motif: string } | null
}
interface EtatPilotage {
  n: number
  amorce: boolean
  propositions: PropositionParametre[]
  versions: VersionParametre[]
  flashes: Flash[]
  promotions: Promo[]
  interrupteurs: Interrupteur[]
}

const etale = (de: number, a: number, n: number) => Array.from({ length: n }, (_, i) => T(de + Math.round(((a - de) * i) / Math.max(1, n - 1))))
const F = (id: string, o: Omit<Flash, 'id' | 'programmee' | 'simuleeLe' | 'arreteeLe' | 'annuleeLe' | 'motifArret' | 'journal'> & { programmee?: boolean; simuleeLe?: number | null }): Flash => ({
  id,
  programmee: o.programmee ?? true,
  simuleeLe: o.simuleeLe ?? (o.programmee === false ? null : o.debut - 2 * JOUR),
  arreteeLe: null,
  annuleeLe: null,
  motifArret: null,
  journal: o.programmee === false ? [{ le: o.debut - 3 * JOUR, quoi: 'Proposée par le vendeur', par: o.vendeur }] : [{ le: o.debut - 3 * JOUR, quoi: 'Proposée par le vendeur', par: o.vendeur }, { le: o.debut - 2 * JOUR, quoi: 'Programmée', par: 'Franck Penga' }],
  ...o,
})
const I = (code: string, libelle: string, apresLancement: boolean, ouvert: boolean, branche: string[], parametres: string[], registre: string | null = null): Interrupteur => ({ code, libelle, apresLancement, ouvert, registre, branche, parametres, demande: null, historique: [] })

export const pilotageDemo = magasin<EtatPilotage>('pilotage', () => ({
  n: 3,
  amorce: false,
  propositions: [],
  versions: [
    { code: 'SUP-DELAI', version: 2, valeur: '2 h pendant les heures du support', avant: '4 h ouvrées', dateEffet: T(-17 * 24 * 60 - 245), creeLe: T(-17 * 24 * 60 - 300), par: 'Franck Penga', validePar: null, motif: 'Délai de première réponse aligné pour les cinq espaces : 2 heures de 7 h à 21 h (DP-56, question 47).', reference: 'DP-56', etat: 'en_vigueur' },
  ],
  flashes: [
    F('FL-0021', { offre: 'Écouteurs Bluetooth sans fil', vendeur: 'Techno Bastos', zone: 'Z1', cible: 'Tournée relais Z1 de 16 h 30 vers le Relais Bastos Carrefour', prix30: 15000, joursPratique: 30, prixFlash: 12900, debut: T(-65), fin: T(115), stockReserve: 6, stockOffre: 9, ventes: [T(-60), T(-45), T(-24), T(-3), T(20), T(70)] }),
    F('FL-0022', { offre: 'Pagne wax 6 yards', vendeur: 'Maman Wax Mokolo', zone: 'Z3', cible: 'Tournée relais Z3 de 15 h vers le Relais Mokolo Marché', prix30: 13000, joursPratique: 30, prixFlash: 11500, debut: T(1315), fin: T(1435), stockReserve: 10, stockOffre: 14, ventes: [] }),
    F('FL-0023', { offre: 'Coffret beurre de karité 250 g', vendeur: 'Beauté Melen', zone: 'Z6', cible: 'Tournée relais Z6 de 13 h 30 vers le Relais Melen Université', prix30: 4000, joursPratique: 30, prixFlash: 3400, debut: T(2695), fin: T(2815), stockReserve: 8, stockOffre: 12, ventes: [], programmee: false }),
    F('FL-0020', { offre: 'Foulard wax', vendeur: 'Maman Wax Mokolo', zone: 'Z3', cible: 'Tournée relais Z3 de 11 h 30 vers le Relais Elobi', prix30: 3500, joursPratique: 30, prixFlash: 3000, debut: T(-305), fin: T(-65), stockReserve: 12, stockOffre: 12, ventes: etale(-298, -198, 12) }),
    F('FL-0019', { offre: 'Chargeur rapide 20 W', vendeur: 'Techno Bastos', zone: 'Z1', cible: 'Tournée relais Z1 du lundi après-midi', prix30: 6500, joursPratique: 30, prixFlash: 5500, debut: T(-1445), fin: T(-1205), stockReserve: 8, stockOffre: 10, ventes: etale(-1430, -1250, 5) }),
  ],
  promotions: [
    { id: 'PM-0031', offre: 'Batterie externe 10 000 mAh', vendeur: 'Techno Bastos', prixBarre: 12000, prix: 10500, joursPratique: 30, retiree: null },
    { id: 'PM-0032', offre: 'Savon noir artisanal', vendeur: 'Beauté Melen', prixBarre: 2500, prix: 2000, joursPratique: 3, retiree: null },
    { id: 'PM-0033', offre: 'Sac en pagne', vendeur: 'Maman Wax Mokolo', prixBarre: 9000, prix: 8000, joursPratique: 18, retiree: null },
  ],
  interrupteurs: [
    I('FF-FLASH', 'Ventes flash (Flash Deals)', false, true, ['Console : Promotions (ADM-P26)', 'Site : accueil, fiche, panier, commande', 'Vendeur : proposer une vente flash'], ['FLASH-DUREE-MAX', 'FLASH-REMISE-MIN', 'VD-PUB-FLASH-MAJORATION'], 'FF-FLASH'),
    I('FF-IA', 'Assistant IA de la console et conseiller IA', true, false, ['Console : Assistant IA (ADM-P38)', 'Site : conseiller IA'], ['IA-COUT-MAX', 'IA-HUMAIN'], 'FF-IA'),
    I('FF-SPONSO', 'Produits sponsorisés (DP-59)', true, false, ['Console : Promotions, onglet Sponsorisé'], ['VD-PUB-CLIC', 'VD-PUB-BUDGET', 'VD-PUB-DENSITE']),
    I('FF-BOOST', 'Boost et campagnes vendeur', true, false, ['Console : Promotions, onglet Sponsorisé'], ['VD-PUB-BOOST']),
    I('FF-PARRAINAGE', 'Parrainage', true, false, ['Console : Promotions, onglet Fidélité'], []),
    I('FF-CODES-PROMO', 'Codes promo', true, false, ['Console : Promotions, onglet Fidélité'], []),
    I('FF-FIDELITE', 'Remise de fidélité directe', true, false, ['Console : Promotions, onglet Fidélité'], ['ADM-FIDELITE-PLAFOND']),
    I('FF-WALLET', 'Wallet (solde client)', true, false, ['Site : Wallet'], ['WALLET-PLAFOND', 'WALLET-RETRAIT-FRAIS'], 'FF-WALLET'),
    I('FF-WHATSAPP-CANAL', 'Assistant WhatsApp (IA)', true, false, ['Site : commande WhatsApp'], ['WAP-COUT', 'WAP-VOCAL-CONSERV'], 'FF-WHATSAPP-CANAL'),
    I('FF-ABONNEMENT', 'Abonnement client', true, false, ['Site : abonnement'], ['ABO-PLUS', 'ABO-PRIME'], 'FF-ABONNEMENT'),
    I('FF-DIASPORA', 'Diaspora et carte bancaire', true, false, [], ['PAY-CARTE-PSP', 'PAY-CARTE-FRAIS']),
    I('FF-ANALYTICS', 'Analytics', true, false, [], []),
    I('FF-MARKETING', 'Marketing', true, false, [], []),
    I('FF-EX01', 'EX-01 · Liste de rentrée scolaire', true, false, ['Site : liste de rentrée'], ['RNT-SAISIE-H', 'RNT-OUVERTURE'], 'FF-EX01'),
    I('FF-EX02', 'EX-02 · Cotisation pour un cadeau', true, false, ['Site : cotisation'], ['COT-FRAIS', 'COT-DUREE-MAX', 'COT-PART-MIN'], 'FF-EX02'),
    I('FF-EX03', 'EX-03 · Mise de côté avec acompte', true, false, ['Site : mise de côté'], ['MDC-ACOMPTE', 'MDC-DUREE', 'MDC-GRACE', 'MDC-FORFAIT'], 'FF-EX03'),
    I('FF-EX04', 'EX-04 · Reprise et troc de téléphone', true, false, ['Site : reprise'], ['TRC-INSPECT-H', 'TRC-PARTENAIRE', 'TRC-IMEI-SOURCE'], 'FF-EX04'),
    I('FF-EX05', 'EX-05 · Panier famille (diaspora)', true, false, ['Site : panier famille'], ['FAM-POIDS-MAX', 'FAM-RENOUV-PREAVIS'], 'FF-EX05'),
    I('FF-EX06', 'EX-06 · Commande WhatsApp avec l’IA', true, false, ['Site : commande WhatsApp'], ['WAP-COUT', 'WAP-VOCAL-CONSERV', 'WAP-API'], 'FF-EX06'),
  ],
}))

const nomCourant = () => nomAgent(agentCourant())
const id = (prefixe: string) => {
  let x = ''
  pilotageDemo.ecrire((s) => {
    s.n++
    x = `${prefixe}-${String(s.n).padStart(4, '0')}`
  })
  return x
}

/** Une demande à quatre yeux de la console (source.quatreyeux), créée par le « serveur » du pilotage. */
async function quatreYeux(action: string, objet: string, resume: string, motif: string, preuves: { id: string; libelle: string; route?: string; params?: Record<string, string> }[]) {
  const r = await demoQuatreYeux.decider({ action, objet, resume, motif, preuves, montant: null, quatreYeux: true, rolesSecond: ROLES_SECOND })
  return r.ok ? r.id : null
}

/** Première visite : la proposition en attente du jeu d'essai (Franck Penga, hier soir) rejoint la file des quatre yeux. */
function amorcer() {
  if (pilotageDemo.lire().amorce) return
  const motif = 'Les remboursements entre 100 000 et 150 000 F (téléphones d’entrée de gamme) attendent la Finance chaque jour ; relever le seuil du second validateur, sans effet sur les marges.'
  const le = T(-18 * 60)
  let qy = ''
  quatreYeuxDemo.ecrire((s) => {
    s.n++
    qy = `QY-${String(s.n).padStart(4, '0')}`
    s.decisions.push({ id: qy, action: 'parametre.changer', objet: 'PP-0003', resume: 'REMB-CONTROLE-SEUIL : 100 000 F → 150 000 F, en vigueur dans 31 jours', motif, preuves: [{ id: 'p1', libelle: 'Simulation jointe : aucun cas type touché', route: 'parametrage', params: { s: 'quatre-yeux' } }], montant: null, premier: { agentId: 'a-franck', agent: 'Franck Penga', role: 'superviseur', le }, second: null, rolesSecond: ROLES_SECOND, etat: 'a_contresigner', expireLe: le + 48 * HEURE })
  })
  const forme = formeValeur('100 000 F', null)
  const dateEffet = T(31 * 24 * 60 - 845)
  pilotageDemo.ecrire((s) => {
    s.amorce = true
    s.propositions.push({ id: 'PP-0003', code: 'REMB-CONTROLE-SEUIL', statut: 'Proposé', avant: '100 000 F', apres: '150 000 F', apresN: 150000, dateEffet, motif, reference: '', critique: true, par: { agentId: 'a-franck', nom: 'Franck Penga', role: 'superviseur', le }, simulation: simuler({ code: 'REMB-CONTROLE-SEUIL', forme, apres: 150000, dateEffet, motif, reference: '', statut: 'Proposé', maintenant: le }), etat: 'a_contresigner', quatreYeux: qy, expireLe: le + 48 * HEURE, second: null })
  })
}

/** Le « serveur » suit les décisions à quatre yeux : contresignée → appliquée ; refusée ; échue → expirée. */
function reconcilier() {
  amorcer()
  const qy = quatreYeuxDemo.lire().decisions
  const n = maintenant()
  const s = pilotageDemo.lire()
  const changePp = s.propositions.some((p) => p.etat === 'a_contresigner' && p.quatreYeux && (qy.find((d) => d.id === p.quatreYeux)?.etat !== 'a_contresigner' || (p.expireLe ?? Infinity) < n))
  const changeI = s.interrupteurs.some((i) => i.demande && (qy.find((d) => d.id === i.demande!.id)?.etat !== 'a_contresigner' || (qy.find((d) => d.id === i.demande!.id)?.expireLe ?? Infinity) < n))
  if (!changePp && !changeI) return
  const annonces: (() => void)[] = []
  pilotageDemo.ecrire((e) => {
    for (const p of e.propositions) {
      if (p.etat !== 'a_contresigner' || !p.quatreYeux) continue
      const d = qy.find((x) => x.id === p.quatreYeux)
      if (d?.etat === 'contresignee' && d.second) {
        p.etat = 'appliquee'
        p.second = { nom: d.second.agent, role: d.second.role, le: d.second.le, motif: d.second.motif }
        const v = creerVersion(e, p, d.second.agent)
        annonces.push(() => publier({ type: 'parametre_annonce', code: p.code, version: v.version, valeur: v.valeur, dateEffet: v.dateEffet, pour: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'] }, `admin-parametre-${p.code}-v${v.version}`, n))
      } else if (d?.etat === 'refusee' && d.second) {
        p.etat = 'refusee'
        p.second = { nom: d.second.agent, role: d.second.role, le: d.second.le, motif: d.second.motif }
      } else if ((p.expireLe ?? Infinity) < n) p.etat = 'expiree'
    }
    for (const i of e.interrupteurs) {
      const b = i.demande
      if (!b) continue
      const d = qy.find((x) => x.id === b.id)
      if (d?.etat === 'contresignee' && d.second) {
        i.ouvert = b.ouvrir
        i.historique.unshift({ le: d.second.le, ouvert: b.ouvrir, par: b.par, second: d.second.agent, motif: b.motif })
        i.demande = null
        annonces.push(() => publier({ type: 'interrupteur', code: i.code, ouvert: b.ouvrir }, `admin-ff-${i.code}-${d.id}`, n))
        if (i.code === 'FF-IA') annonces.push(() => systemeDemo.ecrire((x) => void x.interrupteurs.filter((y) => y.code === 'FF-IA').forEach((y) => (y.ouvert = b.ouvrir))))
      } else if (d?.etat === 'refusee' || (d && d.expireLe < n) || !d) i.demande = null
    }
  })
  for (const a of annonces) a()
}

function creerVersion(e: EtatPilotage, p: PropositionParametre, validePar: string | null): VersionParametre {
  const precedentes = e.versions.filter((v) => v.code === p.code)
  const version = (precedentes.length ? Math.max(...precedentes.map((v) => v.version)) : 1) + 1
  const v: VersionParametre = { code: p.code, version, valeur: p.apres, avant: p.avant, dateEffet: p.dateEffet, creeLe: maintenant(), par: p.par.nom, validePar, motif: p.motif, reference: p.reference || null, etat: 'annoncee' }
  e.versions.push(v)
  return v
}

/** État d'une version à l'heure du serveur : annoncée avant sa date d'effet, en vigueur, puis remplacée. */
function versionsVues(code?: string): VersionParametre[] {
  const n = maintenant()
  const l = pilotageDemo.lire().versions.filter((v) => !code || v.code === code)
  return l.map((v) => {
    const suivante = l.filter((w) => w.code === v.code && w.version > v.version && w.dateEffet <= n)
    return { ...v, etat: v.dateEffet > n ? 'annoncee' : suivante.length ? 'remplacee' : 'en_vigueur' }
  })
}

function valeurEnVigueur(code: string): { valeur: string; version: number; depuis: number | null } {
  const l = ligne(code)
  const v = versionsVues(code).filter((x) => x.etat !== 'annoncee').sort((a, b) => b.version - a.version)[0]
  return v ? { valeur: v.valeur, version: v.version, depuis: v.dateEffet } : { valeur: l?.valeur ?? '', version: 1, depuis: null }
}

// ── Promotions ─────────────────────────────────────────────────────────────────────────────────────────────────────
function flashVu(f: Flash): FlashVu {
  const n = maintenant()
  const e = etatFlash(f, n)
  return {
    id: f.id,
    offre: f.offre,
    vendeur: f.vendeur,
    zone: f.zone,
    cible: f.cible,
    prix30: f.prix30,
    joursPratique: f.joursPratique,
    prixFlash: f.prixFlash,
    remise: Math.round(remiseReelle(f.prix30, f.prixFlash) * 10) / 10,
    debut: f.debut,
    fin: f.fin,
    finReelle: e.finReelle,
    stockReserve: f.stockReserve,
    stockOffre: f.stockOffre,
    vendus: e.vendus,
    ventes: f.ventes.filter((v) => v <= n && v >= f.debut && v < e.finReelle + 1),
    etat: e.etat,
    controles: controlerFlash({ ...f, remiseCumuleePct: 0 }, n),
    simuleeLe: f.simuleeLe,
    motifArret: f.motifArret,
    journal: [...f.journal, ...(e.etat === 'epuisee' ? [{ le: e.finReelle, quoi: 'Stock épuisé : arrêt automatique', par: null }] : [])].sort((a, b) => a.le - b.le),
  }
}

function ouvert(code: string) {
  return pilotageDemo.lire().interrupteurs.find((i) => i.code === code)?.ouvert ?? false
}
/** Qui ouvre la page Promotions en plein (« oui ») ; le Support n'y fait que le contrôle des ventes flash. */
function exigerPromotions(geste: 'programmer' | 'arreter') {
  exigerPage('promotions', 'Promotions')
  const r = roleCourant()
  const ok = droitDe('promotions', r).acces === 'oui' || (geste === 'arreter' && r === 'support')
  if (!ok) throw new AccesRefuse(geste === 'arreter' ? 'Arrêter une vente flash' : 'Programmer une vente flash', geste === 'arreter' ? ['superviseur', 'support'] : ['superviseur'])
}
const trouverFlash = (fid: string) => pilotageDemo.lire().flashes.find((f) => f.id === fid)
const changerFlash = (fid: string, f: (x: Flash) => void) => pilotageDemo.ecrire((s) => f(s.flashes.find((x) => x.id === fid)!))

// ── Interrupteurs ──────────────────────────────────────────────────────────────────────────────────────────────────
function interrupteursVus(): InterrupteurVu[] {
  const cat = new Map(catalogue().map((l) => [l.code, l]))
  const qy = quatreYeuxDemo.lire().decisions
  return pilotageDemo.lire().interrupteurs.map((i) => {
    const parametres = i.parametres.map((c) => ({ code: c, statut: cat.get(c)?.statut ?? 'Absent' }))
    const registreSite = i.registre ? (REGISTRE[i.registre]?.valeur ?? null) : null
    const alerte = i.apresLancement && i.ouvert ? 'Ouvert dans l’espace pays alors que la fonction est d’après lancement.' : i.apresLancement && registreSite && /^ouvert/i.test(registreSite) ? 'Le registre l’ouvre pour le site (DP-50) alors que la v6 la cache au lancement : à fermer ou à confirmer.' : null
    return {
      code: i.code,
      libelle: i.libelle,
      apresLancement: i.apresLancement,
      ouvert: i.ouvert,
      registreSite,
      branche: i.branche,
      parametres,
      bloque: moduleBloque(parametres.map((p) => p.statut)),
      alerte,
      demande: i.demande && qy.find((d) => d.id === i.demande!.id)?.etat === 'a_contresigner' ? i.demande : null,
      historique: i.historique,
    }
  })
}

export const demoPilotage: Omit<DomainePilotage, 'promotionsPlateforme' | 'creerPromotion' | 'lancerPromotion' | 'arreterPromotion' | 'photos' | 'remplacerPhoto' | 'retirerPhoto'> = {
  async parametres() {
    exigerPage('parametrage', 'Paramétrage et simulation')
    reconcilier()
    const n = maintenant()
    const ouvertes = new Map(pilotageDemo.lire().propositions.filter((p) => p.etat === 'simulee' || p.etat === 'bloquee' || p.etat === 'a_contresigner').map((p) => [p.code, p.id]))
    const versions = versionsVues()
    return repondre(
      catalogue().map((l) => {
        const v = valeurEnVigueur(l.code)
        const a = versions.filter((x) => x.code === l.code && x.dateEffet > n).sort((x, y) => x.version - y.version)[0]
        return { code: l.code, valeur: v.valeur, unite: l.unite, statut: l.statut, famille: l.famille, critique: estCritique(l.code), proposable: formeValeur(v.valeur, l.unite).genre !== 'texte', version: v.version, depuis: v.depuis, annoncee: a ? { version: a.version, valeur: a.valeur, dateEffet: a.dateEffet } : null, propositionOuverte: ouvertes.get(l.code) ?? null }
      }),
    )
  },
  async propositions() {
    exigerPage('parametrage', 'Paramétrage et simulation')
    reconcilier()
    return repondre([...pilotageDemo.lire().propositions].reverse())
  },
  async versions(code) {
    exigerPage('parametrage', 'Paramétrage et simulation')
    reconcilier()
    return repondre(versionsVues(code).sort((a, b) => b.creeLe - a.creeLe))
  },
  async preparer(d) {
    exiger('parametre.proposer')
    reconcilier()
    const l = ligne(d.code)
    if (!l) return { ok: false, raison: 'inconnu' }
    const critique = estCritique(d.code)
    if (critique && roleCourant() === 'operations') return { ok: false, raison: 'critique_reserve' }
    const v = valeurEnVigueur(d.code)
    const forme = formeValeur(v.valeur, l.unite)
    if (forme.genre === 'texte') return { ok: false, raison: 'texte' }
    if (!surLePas(forme, d.apres) || d.apres === forme.n) return { ok: false, raison: 'pas' }
    const s = pilotageDemo.lire()
    // Une seule proposition ouverte par paramètre (409) ; une simulation précédente du même agent est remplacée.
    const ouverte = s.propositions.find((p) => p.code === d.code && (p.etat === 'a_contresigner' || ((p.etat === 'simulee' || p.etat === 'bloquee') && p.par.agentId !== agentCourant().id)))
    if (ouverte) return { ok: false, raison: 'deja_ouverte' }
    const n = maintenant()
    const sim = simuler({ code: d.code, forme, apres: d.apres, dateEffet: d.dateEffet, motif: d.motif, reference: d.reference, statut: l.statut, maintenant: n }, R, Number(REGISTRE['PLAFOND-RELAIS-S']?.valeur ?? NaN) || null)
    const pid = id('PP')
    pilotageDemo.ecrire((e) => {
      for (const p of e.propositions) if (p.code === d.code && (p.etat === 'simulee' || p.etat === 'bloquee')) p.etat = 'retiree'
      e.propositions.push({ id: pid, code: d.code, statut: l.statut, avant: v.valeur, apres: ecrireValeur(forme, d.apres), apresN: d.apres, dateEffet: d.dateEffet, motif: d.motif.trim(), reference: d.reference.trim(), critique, par: { agentId: agentCourant().id, nom: nomCourant(), role: roleCourant(), le: n }, simulation: sim, etat: sim.bloquee ? 'bloquee' : 'simulee', quatreYeux: null, expireLe: null, second: null })
    })
    await journaliser({ action: 'parametre.simuler', objet: `${pid} · ${d.code}`, motif: d.motif.trim() || undefined })
    return { ok: true, id: pid }
  },
  async soumettre(pid) {
    exiger('parametre.proposer')
    reconcilier()
    const p = pilotageDemo.lire().propositions.find((x) => x.id === pid)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (p.par.agentId !== agentCourant().id) return { ok: false, raison: 'pas_demandeur' }
    if (p.etat === 'bloquee') return { ok: false, raison: 'bloquee' }
    if (p.etat !== 'simulee') return { ok: false, raison: 'deja_soumise' }
    const n = maintenant()
    if (!p.critique) {
      const annonces: (() => void)[] = []
      pilotageDemo.ecrire((e) => {
        const x = e.propositions.find((y) => y.id === pid)!
        x.etat = 'appliquee'
        const v = creerVersion(e, x, null)
        annonces.push(() => publier({ type: 'parametre_annonce', code: x.code, version: v.version, valeur: v.valeur, dateEffet: v.dateEffet, pour: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'] }, `admin-parametre-${x.code}-v${v.version}`, n))
      })
      annonces.forEach((a) => a())
      await journaliser({ action: 'parametre.changer', objet: `${p.code} · ${p.avant} → ${p.apres}`, motif: p.motif })
      return { ok: true, etat: 'appliquee' }
    }
    const qy = await quatreYeux('parametre.changer', pid, `${p.code} : ${p.avant} → ${p.apres}`, p.motif + (p.reference ? ` (réf. ${p.reference})` : ''), [{ id: 'sim', libelle: 'Simulation jointe (cas types, contrôles)', route: 'parametrage', params: { s: 'quatre-yeux' } }])
    if (!qy) return { ok: false, raison: 'bloquee' }
    const expire = quatreYeuxDemo.lire().decisions.find((d) => d.id === qy)?.expireLe ?? null
    pilotageDemo.ecrire((e) => void Object.assign(e.propositions.find((y) => y.id === pid)!, { etat: 'a_contresigner', quatreYeux: qy, expireLe: expire }))
    return { ok: true, etat: 'a_contresigner' }
  },
  async retirer(pid) {
    exiger('parametre.proposer')
    const p = pilotageDemo.lire().propositions.find((x) => x.id === pid)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (p.par.agentId !== agentCourant().id) return { ok: false, raison: 'pas_demandeur' }
    if (!['simulee', 'bloquee', 'a_contresigner'].includes(p.etat)) return { ok: false, raison: 'deja_soumise' }
    if (p.quatreYeux) quatreYeuxDemo.ecrire((s) => void s.decisions.filter((d) => d.id === p.quatreYeux && d.etat === 'a_contresigner').forEach((d) => (d.etat = 'refusee')))
    pilotageDemo.ecrire((e) => void (e.propositions.find((y) => y.id === pid)!.etat = 'retiree'))
    await journaliser({ action: 'parametre.retirer', objet: `${pid} · ${p.code}` })
    return { ok: true }
  },

  async promotions() {
    exigerPage('promotions', 'Promotions')
    reconcilier()
    const s = pilotageDemo.lire()
    const flashes = s.flashes.map(flashVu)
    const fonctions = s.interrupteurs.filter((i) => ['FF-SPONSO', 'FF-BOOST', 'FF-PARRAINAGE', 'FF-CODES-PROMO', 'FF-FIDELITE'].includes(i.code)).map((i) => ({ code: i.code, libelle: i.libelle, regle: i.parametres.join(', '), ouvert: i.ouvert }))
    const debutMois = T(-12 * 24 * 60 - 845) // jeudi 1er octobre, 0 h
    const programmeesDuMois = flashes.filter((f) => f.etat !== 'brouillon' && f.etat !== 'annulee' && f.debut >= debutMois)
    const v: VuePromotions = {
      flashes,
      promotions: s.promotions.map((p) => ({ ...p, remise: Math.round(remiseReelle(p.prixBarre, p.prix) * 10) / 10, honnete: p.joursPratique >= 7 })),
      fonctions,
      flashOuvert: ouvert('FF-FLASH'),
      mois: { libelle: 'octobre 2026', revenus: 418600, volume: 3912000, livraisonOfferte: 64800, gestes: gestesDuMois(), remisesBelivay: 0, fidelite: 0, premiereAnnee: true, plusForteRemise: Math.max(0, ...programmeesDuMois.map((f) => f.remise)) },
      accueil: { emplacements: 24, nouveaux: 4, sponsorises: ouvert('FF-SPONSO') ? 4 : 0, rotationH: 6 },
      fetes: [
        { libelle: 'Paie de fin de mois', quand: 'du lundi 26 au samedi 31 octobre' },
        { libelle: 'Noël et fin d’année', quand: 'décembre · dernière livraison annoncée à l’avance' },
        { libelle: 'Fête de la Jeunesse', quand: 'jeudi 11 février 2027' },
        { libelle: 'Fête nationale', quand: 'jeudi 20 mai 2027' },
      ],
    }
    return repondre(v)
  },
  async simulerFlash(fid) {
    exigerPromotions('programmer')
    const f = trouverFlash(fid)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (f.programmee) return { ok: false, raison: 'etat' }
    changerFlash(fid, (x) => {
      x.simuleeLe = maintenant()
      x.journal.push({ le: maintenant(), quoi: 'Simulée', par: nomCourant() })
    })
    await journaliser({ action: 'flash.simuler', objet: `${fid} · ${f.offre}` })
    return { ok: true }
  },
  async programmerFlash(fid) {
    exigerPromotions('programmer')
    const f = trouverFlash(fid)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (!ouvert('FF-FLASH')) return { ok: false, raison: 'ferme' }
    if (f.programmee || f.annuleeLe !== null) return { ok: false, raison: 'etat' }
    if (f.simuleeLe === null) return { ok: false, raison: 'non_simulee' }
    if (controlerFlash({ ...f, remiseCumuleePct: 0 }, maintenant()).some((c) => !c.ok)) return { ok: false, raison: 'controle' }
    changerFlash(fid, (x) => {
      x.programmee = true
      x.journal.push({ le: maintenant(), quoi: 'Programmée', par: nomCourant() })
    })
    publier({ type: 'flash', id: fid, etat: 'programmee', vendeur: f.vendeur, motif: null }, `admin-flash-${fid}-programmee`, maintenant())
    await journaliser({ action: 'flash.programmer', objet: `${fid} · ${f.offre}`, zone: f.zone ?? undefined })
    return { ok: true }
  },
  async annulerFlash(fid, motif) {
    exigerPromotions('programmer')
    const f = trouverFlash(fid)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const e = etatFlash(f, maintenant()).etat
    if (e !== 'programmee' && e !== 'brouillon') return { ok: false, raison: 'etat' } // plus rien ne change une fois commencée (409)
    changerFlash(fid, (x) => {
      x.annuleeLe = maintenant()
      x.motifArret = motif.trim()
      x.journal.push({ le: maintenant(), quoi: 'Annulée', par: nomCourant() })
    })
    publier({ type: 'flash', id: fid, etat: 'annulee', vendeur: f.vendeur, motif: motif.trim() }, `admin-flash-${fid}-annulee`, maintenant())
    await journaliser({ action: 'flash.annuler', objet: `${fid} · ${f.offre}`, motif: motif.trim(), zone: f.zone ?? undefined })
    return { ok: true }
  },
  async arreterFlash(fid, motif) {
    exigerPromotions('arreter')
    const f = trouverFlash(fid)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    if (etatFlash(f, maintenant()).etat !== 'en_cours') return { ok: false, raison: 'etat' }
    changerFlash(fid, (x) => {
      x.arreteeLe = maintenant()
      x.motifArret = motif.trim()
      x.journal.push({ le: maintenant(), quoi: 'Arrêtée : compte à rebours retiré, les clients qui ont payé gardent leur prix', par: nomCourant() })
    })
    publier({ type: 'flash', id: fid, etat: 'arretee', vendeur: f.vendeur, motif: motif.trim() }, `admin-flash-${fid}-arretee`, maintenant())
    await journaliser({ action: 'flash.arreter', objet: `${fid} · ${f.offre}`, motif: motif.trim(), zone: f.zone ?? undefined })
    return { ok: true }
  },
  async retirerRabais(pid, motif) {
    exigerPromotions('programmer')
    const p = pilotageDemo.lire().promotions.find((x) => x.id === pid)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    if (p.retiree) return { ok: false, raison: 'etat' }
    pilotageDemo.ecrire((s) => void (s.promotions.find((x) => x.id === pid)!.retiree = { le: maintenant(), motif: motif.trim() }))
    publier({ type: 'rabais_retire', id: pid, vendeur: p.vendeur, motif: motif.trim() }, `admin-rabais-${pid}`, maintenant())
    await journaliser({ action: 'promotion.retirer_rabais', objet: `${pid} · ${p.offre}`, motif: motif.trim() })
    return { ok: true }
  },

  async modules() {
    exigerPage('parametrage', 'Paramétrage et simulation')
    reconcilier()
    return repondre(interrupteursVus())
  },
  async interrupteurs() {
    exigerPage('interrupteurs', 'Interrupteurs de fonctions')
    reconcilier()
    return repondre(interrupteursVus())
  },
  async demanderBascule(code, ouvrir, motif) {
    exiger('interrupteur.basculer')
    reconcilier()
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const i = interrupteursVus().find((x) => x.code === code)
    if (!i) return { ok: false, raison: 'inconnu' }
    if (i.ouvert === ouvrir) return { ok: false, raison: 'sans_effet' }
    if (i.demande) return { ok: false, raison: 'deja_demande' }
    if (ouvrir && i.bloque) return { ok: false, raison: 'module_bloque' }
    const qy = await quatreYeux(ouvrir ? 'interrupteur.ouvrir' : 'interrupteur.fermer', code, `${ouvrir ? 'Ouvrir' : 'Fermer'} ${code} · ${i.libelle}`, motif.trim(), [{ id: 'ff', libelle: `Interrupteur ${code}`, route: 'interrupteurs' }])
    if (!qy) return { ok: false, raison: 'motif_court' }
    pilotageDemo.ecrire((s) => void (s.interrupteurs.find((x) => x.code === code)!.demande = { id: qy, ouvrir, par: nomCourant(), le: maintenant(), motif: motif.trim() }))
    return { ok: true, id: qy }
  },

  // ── Contenu du site client (accueil) ──
  async contenuSite() {
    exigerPage('contenu-site', 'Contenu du site')
    const s = contenuDemo.lire()
    const jour = jourDuMois(maintenant())
    return repondre({
      version: s.version,
      publieLe: s.publieLe,
      par: s.par,
      moments: MOMENTS_PAR_DEFAUT.map((m) => {
        const x = s.moments[m.id] ?? { actif: m.actif, du: m.du, au: m.au }
        return { id: m.id, titre: m.titre, accroche: m.accroche, du: x.du, au: x.au, actif: x.actif, enCours: x.actif && dansLaPeriode(x, jour) }
      }),
      categories: CATEGORIES_SITE().map((c) => ({ ...c, enAvant: s.categories.includes(c.id) })),
      peutMoments: roleCourant() === 'superviseur',
    })
  },
  async publierContenu(c, motif) {
    exigerPage('contenu-site', 'Contenu du site')
    if (droitDe('contenu-site', roleCourant()).acces === 'lecture') throw new AccesRefuse('Publier le contenu du site', ['superviseur', 'support'])
    if (motif.trim().length < REGLES_S5.motifMin) return { ok: false, raison: 'motif_court' }
    const s = contenuDemo.lire()
    const avant = MOMENTS_PAR_DEFAUT.map((m) => ({ id: m.id, ...(s.moments[m.id] ?? { actif: m.actif, du: m.du, au: m.au }) }))
    const change = c.moments.some((m) => { const a = avant.find((x) => x.id === m.id); return !a || a.actif !== m.actif || a.du !== m.du || a.au !== m.au })
    // Le Marketing (Service client, en part) ne règle que les catégories mises en avant ; les moments : la Direction.
    if (change && roleCourant() !== 'superviseur') return { ok: false, raison: 'moments_reserves' }
    if (c.moments.some((m) => !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(m.du) || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(m.au))) return { ok: false, raison: 'dates' }
    const cats = c.categories.filter((x) => CATEGORIES_SITE().some((y) => y.id === x))
    const e = contenuDemo.ecrire((x) => {
      x.version++
      x.publieLe = maintenant()
      x.par = nomCourant()
      x.moments = Object.fromEntries(c.moments.map((m) => [m.id, { actif: m.actif, du: m.du, au: m.au }]))
      x.categories = cats
    })
    await journaliser({ action: 'contenu.publier', objet: `Contenu du site · v${e.version}`, motif: motif.trim(), avant: null, apres: `${c.moments.filter((m) => m.actif).length} moment(s) actif(s) · en avant : ${cats.join(', ') || 'aucune'}` })
    publier({ type: 'contenu_publie', version: e.version, moments: c.moments.map((m) => ({ id: m.id, actif: m.actif, du: m.du, au: m.au })), categories: cats }, `admin-contenu-${e.version}`, maintenant())
    return { ok: true, version: e.version }
  },
}

/** Contenu du site client (démonstration) : version publiée, réglages des moments, catégories mises en avant. */
const contenuDemo = magasin<{ version: number; publieLe: number | null; par: string | null; moments: Record<string, { actif: boolean; du: string; au: string }>; categories: string[] }>('contenu-site', () => ({ version: 0, publieLe: null, par: null, moments: {}, categories: [] }))
/** Catégories de l'accueil du site (son carrousel : un univers par bandeau). */
const CATEGORIES_SITE = () => CONTENU_ACCUEIL.carrousel.map((b) => ({ id: /cat=(\w+)/.exec(b.lien)?.[1] ?? b.titre, titre: b.titre }))

// ── États vivants lus par les compteurs (Paramétrage) ───────────────────────────────────────────────────────────────
/** Propositions de paramètre qui attendent leur second validateur. */
export function propositionsAContresigner() {
  if (!pilotageDemo.lire().amorce) return [] // le jeu d'essai du Paramétrage se pose à sa première lecture
  reconcilier()
  return pilotageDemo.lire().propositions.filter((p) => p.etat === 'a_contresigner')
}
