// DONNÉES DE DÉMONSTRATION — le « réseau » des comptes de l'appareil, et la boîte « Reçus » (DP-54, consigne du
// porteur du 5 oct. : « tout ce qui est envoyé doit avoir une façon d'être reçu et d'être exécuté »).
// Le serveur garde tous les comptes ; la démonstration n'a qu'un compte ouvert à la fois (blv_demo_etat). Ce module
// joue le serveur pour ce qui passe d'un compte à l'autre :
// - les comptes déjà ouverts sur l'appareil (s'inscrire, puis se reconnecter par e-mail à l'ancien compte : on
//   retrouve chacun tel qu'il était) ;
// - l'annuaire des numéros vérifiés (un numéro vérifié = un compte : on trouve un proche par son numéro) ;
// - les envois d'un compte à un autre : le destinataire les voit dans « Reçus », l'envoyeur voit la réponse.
// Les envois reçus du jeu d'essai (Carine) viennent de proches dont les comptes ne sont pas sur l'appareil.
// Règle commune : src/donnees/echanges.ts (« BelivaY ne perd jamais »).
import { CATALOGUE } from './catalogue'
import { maintenant } from './horloge'
import { ecrireEtat, lireEtat, modifier, solde, type EtatDemo } from './magasin'
import { calculer, type Classe } from '../donnees/frais'
import { SERVICE_CARTE, destinatairePeutPayer, refusColis, repartition, totalDiaspora, type PaieFrais } from '../donnees/echanges'
import { chiffres, operateur } from '../donnees/numeros'
import { GROUPE_ENVOI, PARTICIPATION_MIN, type ActionEnvoi, type CommandePassee, type DetailRecu, type DonneesRecus, type EnvoiRecu, type LienFamille, type LigneEnvoi, type MoyenCommande, type ResultatRecu, type Source } from '../donnees/source'

const CLE = 'blv_demo_reseau'
const J = 864e5

type EnvoiReseau = EnvoiRecu & { cleDe: string; clePour: string }
interface Reseau {
  comptes: Record<string, EtatDemo> // e-mail → état du compte quand il a quitté l'appareil
  annuaire: Record<string, string> // numéro vérifié (chiffres) → e-mail du compte
  envois: EnvoiReseau[]
}

// Le compte du jeu d'essai (Carine) est trouvable par son numéro (celui qu'elle donne dans les tests).
const ANNUAIRE_DEPART: Record<string, string> = { '677112241': 'carine@gmail.com' }

function lireReseau(): Reseau {
  try {
    const r = JSON.parse(localStorage.getItem(CLE) || 'null') as Partial<Reseau> | null
    if (r) return { comptes: r.comptes ?? {}, annuaire: { ...ANNUAIRE_DEPART, ...(r.annuaire ?? {}) }, envois: r.envois ?? [] }
  } catch {
    // stockage illisible : réseau vide
  }
  return { comptes: {}, annuaire: { ...ANNUAIRE_DEPART }, envois: [] }
}
function ecrireReseau(r: Reseau) {
  try {
    localStorage.setItem(CLE, JSON.stringify(r))
  } catch {
    // stockage plein : vaut pour cette visite
  }
}

export const cleCompte = (e: EtatDemo) => e.profil.email.trim().toLowerCase()

// ——— Comptes de l'appareil ———

/** Le compte ouvert quitte l'appareil (un autre s'inscrit ou se connecte) : il est gardé tel quel. */
export function garderCompte(e: EtatDemo) {
  if (e.supprime) return
  const r = lireReseau()
  r.comptes[cleCompte(e)] = { ...e, connecte: false }
  ecrireReseau(r)
}
/** Un compte gardé sur l'appareil, par son e-mail (null : inconnu, ou c'est le compte ouvert). */
export function compteGarde(email: string): EtatDemo | null {
  const k = email.trim().toLowerCase()
  if (k === cleCompte(lireEtat())) return null
  return lireReseau().comptes[k] ?? null
}
/** Rouvre un compte gardé : le compte ouvert est gardé à son tour. */
export function rouvrirCompte(email: string): EtatDemo | null {
  const k = email.trim().toLowerCase()
  const r = lireReseau()
  const e = r.comptes[k]
  if (!e) return null
  garderCompte(lireEtat())
  const r2 = lireReseau()
  delete r2.comptes[k]
  ecrireReseau(r2)
  return ecrireEtat(e)
}
/** Un numéro vérifié rejoint l'annuaire (CIN-35 : un numéro vérifié va avec un seul compte). */
export function inscrireNumero(numero: string, e: EtatDemo = lireEtat()) {
  const n = chiffres(numero).replace(/^237(?=6\d{8}$)/, '')
  if (n.length < 8) return
  const r = lireReseau()
  r.annuaire[n] = cleCompte(e)
  ecrireReseau(r)
}
/** Le compte d'un numéro ou d'une adresse e-mail, s'il existe sur l'appareil. */
export function compteDe(a: string): { cle: string; prenom: string; quartier: string | null } | null {
  const r = lireReseau()
  const ouvert = lireEtat()
  const cle = a.includes('@') ? a.trim().toLowerCase() : r.annuaire[chiffres(a).replace(/^237(?=6\d{8}$)/, '')]
  if (!cle) return null
  const e = cle === cleCompte(ouvert) ? ouvert : r.comptes[cle]
  if (!e) return null
  return { cle, prenom: e.profil.prenom, quartier: e.relais?.nom.replace(/^Relais /, '') ?? null }
}
const lireCompte = (cle: string): EtatDemo | null => (cle === cleCompte(lireEtat()) ? lireEtat() : (lireReseau().comptes[cle] ?? null))
/** Modifie un compte, ouvert ou gardé (ce que fait le serveur quand un proche agit sur ce qu'on lui a envoyé). */
export function modifierCompte(cle: string, f: (e: EtatDemo) => EtatDemo) {
  if (cle === cleCompte(lireEtat())) return void modifier(f)
  const r = lireReseau()
  if (!r.comptes[cle]) return
  r.comptes[cle] = f(r.comptes[cle])
  ecrireReseau(r)
}

// ——— Envois reçus du jeu d'essai (Carine) : un par type, de proches dont le compte n'est pas sur l'appareil ———

function ligne(p: string, qte = 1, offertPar: string | null = null): LigneEnvoi {
  const pr = CATALOGUE[p]
  const f = calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }])
  return { p, titre: pr.titre, dessin: pr.dessins[0] ?? '', qte, prix: pr.prix, livraison: f.total - f.sousTotal, offertPar }
}
/** Livraison au relais d'un ensemble de lignes (moteur de frais). */
export function fraisLignes(lignes: LigneEnvoi[]): number {
  const parBoutique: Record<string, { boutique: string; zone: string; articles: { prix: number; quantite: number; classe: Classe }[] }> = {}
  for (const l of lignes) {
    const pr = l.p ? CATALOGUE[l.p] : null
    const b = pr?.vendeur.boutique ?? 'Boutique C'
    parBoutique[b] ??= { boutique: b, zone: pr?.vendeur.zone ?? 'Mvog-Ada', articles: [] }
    parBoutique[b].articles.push({ prix: l.prix, quantite: l.qte, classe: (pr?.classe ?? 'M') as Classe })
  }
  const sc = Object.values(parBoutique)
  if (!sc.length) return 0
  const f = calculer('relais', sc)
  return f.total - f.sousTotal
}
const base = (x: Partial<EnvoiRecu> & Pick<EnvoiRecu, 'id' | 'type' | 'de' | 'titre' | 'le' | 'lien'>): EnvoiRecu => ({
  depuis: null,
  pour: 'Carine',
  occasion: null,
  hotes: [],
  date: null,
  lieu: null,
  mot: null,
  jusqua: null,
  lignes: [],
  frais: 0,
  qui: null,
  objectif: null,
  reuni: 0,
  cagnotte: null,
  code: null,
  ref: null,
  detail: null,
  dansLApplication: true,
  etat: 'a_traiter',
  actions: [],
  merci: null,
  ...x,
})
export function recusDuJeuDEssai(): EnvoiRecu[] {
  const panier = [ligne('riz'), ligne('huile5l', 2)]
  const rentree = [ligne('cartable'), { p: null, titre: 'Cahiers 100 pages × 10', dessin: '', qte: 1, prix: 3000, livraison: 0, offertPar: null }]
  return [
    base({ id: 'R-mariage', type: 'liste', de: 'Mireille', titre: 'Mariage de Mireille & Paul', occasion: 'mariage', hotes: ['Mireille', 'Paul'], date: Date.UTC(2026, 9, 17, 14, 0), lieu: 'Relais Essos', mot: 'Ta présence est notre plus beau cadeau. Si tu veux nous gâter, voici notre liste.', le: Date.UTC(2026, 8, 22, 19, 0), jusqua: Date.UTC(2026, 9, 31, 22, 59), lignes: [ligne('marmite'), ligne('mixeur'), ligne('fer', 1, 'Nadège'), ligne('ventilo')], cagnotte: { titre: 'Voyage de noces', objectif: 300000, reuni: 85000 }, code: 'mR7aGe', lien: '/l/mR7aGe' }),
    base({ id: 'R-naissance', type: 'liste', de: 'Nadège', titre: 'Naissance de Léa', occasion: 'naissance', hotes: ['Nadège'], lieu: 'Relais Bastos', mot: 'Léa arrive bientôt !', le: Date.UTC(2026, 8, 22, 9, 0), jusqua: Date.UTC(2026, 9, 25, 22, 59), lignes: [ligne('portebebe'), ligne('coco'), ligne('ballon')], code: 'n8Lk2w', lien: '/l/n8Lk2w' }),
    base({ id: 'R-cagnotte', type: 'cagnotte', de: 'Paul', titre: 'Voyage de noces de Mireille & Paul', occasion: 'mariage', hotes: ['Mireille', 'Paul'], date: Date.UTC(2026, 9, 17, 14, 0), mot: 'Zanzibar, on y croit ! Merci pour ton coup de main.', le: Date.UTC(2026, 8, 23, 8, 0), jusqua: Date.UTC(2026, 9, 17, 14, 0), objectif: 300000, reuni: 85000, code: 'mR7aGe', lien: '/l/mR7aGe' }),
    base({ id: 'R-cotisation', type: 'cotisation', de: 'Joël', titre: 'Réfrigérateur pour maman Odile', occasion: 'fete', lieu: 'Relais Mvan', mot: 'Pour la fête des mères, on s’y met tous.', le: Date.UTC(2026, 8, 21, 20, 0), jusqua: Date.UTC(2026, 9, 10, 22, 59), objectif: 210000, reuni: 126000, lignes: [{ p: null, titre: 'Réfrigérateur 180 L', dessin: '', qte: 1, prix: 205900, livraison: 0, offertPar: null }], code: 'JO3L7', lien: '/cotisation-participer?c=JO3L7' }),
    base({ id: 'R-panier', type: 'panier', de: 'Junior', titre: 'Le panier de Junior', mot: 'Tata, c’est pour la maison ce mois-ci. Merci !', le: Date.UTC(2026, 8, 24, 7, 30), jusqua: Date.UTC(2026, 9, 1, 7, 30), lieu: 'Relais Mvog-Ada', lignes: panier, frais: fraisLignes(panier), lien: '/recu?id=R-panier' }),
    base({ id: 'R-lien', type: 'lien-paiement', de: 'Sandrine', titre: 'Les chaussures de Sandrine', mot: 'Tu m’avais promis mes baskets 😊', le: Date.UTC(2026, 8, 23, 12, 0), jusqua: Date.UTC(2026, 8, 30, 12, 0), lieu: 'Relais Biyem-Assi', lignes: [ligne('baskets')], frais: fraisLignes([ligne('baskets')]), code: 'PZ8K4', lien: '/payeur?id=PZ8K4' }),
    base({ id: 'R-rentree', type: 'rentree', de: 'Aline', titre: 'Liste de rentrée de Kevin (CM2)', occasion: 'rentree', mot: 'Si tu peux aider pour la rentrée de Kevin…', le: Date.UTC(2026, 8, 20, 18, 0), jusqua: Date.UTC(2026, 9, 5, 22, 59), lieu: 'Relais Nlongkak', lignes: rentree, frais: fraisLignes(rentree), lien: '/recu?id=R-rentree' }),
    base({ id: 'R-colis', type: 'colis', de: 'Paul', titre: 'Écouteurs sans fil', mot: 'Pour tes trajets. Bonne semaine !', le: Date.UTC(2026, 8, 23, 18, 0), lieu: 'Relais Mvog-Ada', lignes: [ligne('ecouteurs')], frais: 900, qui: 'destinataire', ref: 'BLV-52160', lien: '/recu?id=R-colis' }),
    base({ id: 'R-famille', type: 'lien-famille', de: 'Hervé', depuis: 'France', titre: 'Hervé veut être relié à ton compte', mot: 'Je pourrai payer tes courses depuis Lyon.', le: Date.UTC(2026, 8, 24, 6, 0), jusqua: Date.UTC(2026, 9, 1, 6, 0), code: 'INV-H8LY', lien: '/proches?invitation=INV-H8LY' }),
    base({ id: 'R-abonnement', type: 'abonnement', de: 'Hervé', depuis: 'France', titre: 'Prime offert pendant 3 mois', detail: 'Prime · 3 mois · livraison au relais offerte dès 10 000 F, cagnotte 2 %', mot: 'Pour tes courses, petite sœur.', le: Date.UTC(2026, 8, 24, 6, 5), jusqua: Date.UTC(2026, 9, 24, 6, 5), ref: 'CAD-H3PR', lien: '/recu?id=R-abonnement' }),
    base({ id: 'R-panier-famille', type: 'panier-famille', de: 'Hervé', depuis: 'France', titre: 'Panier du mois de Hervé', detail: 'Chaque mois, le 21 · riz, huile, sucre, lait', le: Date.UTC(2026, 8, 21, 7, 0), lieu: 'Relais Mvog-Ada', lignes: [{ p: null, titre: 'Riz parfumé 5 kg', dessin: 'ead843e64b50', qte: 2, prix: 4200, livraison: 0, offertPar: null }, { p: null, titre: 'Huile d’arachide 5 L', dessin: '56af8b436322', qte: 1, prix: 9800, livraison: 0, offertPar: null }, { p: null, titre: 'Sucre en poudre 1 kg', dessin: '8df366466f2c', qte: 4, prix: 1000, livraison: 0, offertPar: null }], frais: 0, qui: 'payeur', ref: 'BLV-52041', lien: '/recu?id=R-panier-famille' }),
    base({ id: 'R-retrait', type: 'code-retrait', de: 'Nadège', titre: 'Retirer le colis de Nadège', mot: 'Je suis coincée au travail, tu peux passer le prendre ? Merci !', le: Date.UTC(2026, 8, 24, 8, 30), jusqua: Date.UTC(2026, 8, 26, 21, 0), lieu: 'Relais Mvog-Ada', lignes: [ligne('cremevisage')], code: '418 207', ref: 'BLV-52098', lien: '/recu?id=R-retrait' }),
    base({ id: 'R-parrainage', type: 'parrainage', de: 'Aïcha', titre: 'Aïcha t’invite à Prime', detail: 'Ton premier mois de Prime à 1 500 F ; Aïcha gagne un mois offert à ton premier retrait.', le: Date.UTC(2026, 8, 19, 15, 0), lien: '/p/7KD3QA' }),
    base({ id: 'R-partage', type: 'partage', de: 'Joël', titre: 'Une question sur le Mixeur-blender 2 L', detail: 'Joël a demandé au vendeur : « Le bol est-il en verre ? » Réponse : « Oui, verre trempé 2 L. »', le: Date.UTC(2026, 8, 18, 11, 0), lignes: [ligne('mixeur')], lien: '/fiche?p=mixeur' }),
  ]
}
/** Envois du jeu d'essai, vus de l'envoyeur (Carine) : sa liste d'anniversaire envoyée à Paul, qui a offert. */
export function envoyesDuJeuDEssai(): EnvoiRecu[] {
  return [
    base({ id: 'E-anniv', type: 'liste', de: 'Carine', pour: 'Paul', titre: 'Mon anniversaire', occasion: 'anniversaire', le: Date.UTC(2026, 8, 18, 9, 0), date: Date.UTC(2026, 9, 3, 17, 0), lieu: 'Relais Mvog-Ada', lignes: [ligne('batterie', 1, 'Paul'), ligne('sandales')], etat: 'fait', actions: [{ le: Date.UTC(2026, 8, 20, 14, 0), par: 'Paul', quoi: 'offert', montant: 15800, ref: 'BLV-52088', p: 'batterie', mot: 'Bon anniversaire !' }], lien: '/l/anniv' }),
  ]
}

// ——— La boîte ———

const recusDe = (e: EtatDemo) => e.recus ?? (e.jeuEssai === false ? [] : recusDuJeuDEssai())
const envoyesDe = (e: EtatDemo) => e.envoyes ?? (e.jeuEssai === false ? [] : envoyesDuJeuDEssai())

// Ce que le serveur sait d'un envoi : l'état réel de la liste, de la cagnotte ou de la cotisation de l'envoyeur.
function aJour(x: EnvoiRecu & { cleDe?: string }, e: EtatDemo, t: number): EnvoiRecu {
  let y: EnvoiRecu = x
  if ((x.type === 'liste' || x.type === 'cagnotte') && x.code) {
    const offerts = e.offertsProches?.[x.code] ?? {}
    const proprio = x.cleDe ? lireCompte(x.cleDe) : null
    const liste = proprio?.listes?.find((l) => l.partage?.code === x.code) ?? null
    const depart = recusBase(x.id)
    const somme = (ps: { montant: number }[]) => ps.reduce((n, p) => n + p.montant, 0)
    const reuniCagnotte = liste ? somme(liste.cagnotte?.participations ?? []) : ((x.type === 'liste' ? depart?.cagnotte?.reuni : depart?.reuni) ?? 0) + somme(e.cagnottesProches?.[x.code] ?? [])
    y = {
      ...y,
      lignes: x.lignes.map((l) => ({ ...l, offertPar: (liste ? liste.articles.find((a) => a.p === l.p)?.offert?.par : null) ?? (l.p ? offerts[l.p]?.par : null) ?? l.offertPar })),
      ...(x.type === 'liste' && x.cagnotte ? { cagnotte: { ...x.cagnotte, objectif: liste?.cagnotte?.objectif ?? x.cagnotte.objectif, reuni: reuniCagnotte } } : {}),
      ...(x.type === 'cagnotte' ? { reuni: reuniCagnotte } : {}),
    }
  }
  if (x.type === 'cotisation' && x.cleDe && x.code) {
    const c = lireCompte(x.cleDe)?.cotisations?.find((k) => k.code === x.code)
    if (c) y = { ...y, objectif: c.objectif, reuni: c.participations.reduce((n, p) => n + p.montant, 0) }
  }
  if (y.etat === 'a_traiter' && y.jusqua !== null && y.jusqua < t) y = { ...y, etat: 'expire' }
  const { cleDe: _a, clePour: _b, ...propre } = y as EnvoiReseau
  return propre
}
// La valeur de départ d'un envoi du jeu d'essai (ce qui était réuni avant l'appareil).
const recusBase = (id: string) => recusDuJeuDEssai().find((x) => x.id === id) ?? null

const ORDRE = { a_traiter: 0, accepte: 1, fait: 2, refuse: 3, expire: 4 } as const
function boite(e: EtatDemo = lireEtat()) {
  const t = maintenant()
  const k = cleCompte(e)
  const r = lireReseau()
  const recus = [...recusDe(e), ...r.envois.filter((x) => x.clePour === k)].map((x) => aJour(x, e, t)).sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat] || b.le - a.le)
  const envoyes = [...envoyesDe(e), ...r.envois.filter((x) => x.cleDe === k)].map((x) => aJour(x, e, t)).sort((a, b) => b.le - a.le)
  return { recus, envoyes, t }
}
export const recusATraiter = (e: EtatDemo) => (e.connecte ? boite(e).recus.filter((x) => x.etat === 'a_traiter').length : 0)

// Met à jour un envoi là où il est gardé (le réseau, ou le compte ouvert).
function majEnvoi(id: string, f: (x: EnvoiRecu) => EnvoiRecu) {
  const r = lireReseau()
  const i = r.envois.findIndex((x) => x.id === id)
  if (i >= 0) {
    r.envois[i] = { ...r.envois[i], ...f(r.envois[i]) }
    return ecrireReseau(r)
  }
  modifier((e) => {
    if (recusDe(e).some((x) => x.id === id)) return { ...e, recus: recusDe(e).map((x) => (x.id === id ? f(x) : x)) }
    return { ...e, envoyes: envoyesDe(e).map((x) => (x.id === id ? f(x) : x)) }
  })
}

// ——— Payer avec les moyens du compte ———

type Paiement = { ok: true; paye: number; libelle: string; moyen: MoyenCommande; numero: string | null } | { ok: false; raison: 'solde' | 'moyen' | 'diaspora' }
function payer(e: EtatDemo, moyen: string, montant: number): Paiement {
  const diaspora = !!e.diaspora
  if (moyen === 'wallet') {
    if (diaspora) return { ok: false, raison: 'moyen' }
    if (solde(e) < montant) return { ok: false, raison: 'solde' }
    return { ok: true, paye: montant, libelle: 'Portefeuille BelivaY', moyen: 'wallet', numero: null }
  }
  if (moyen.startsWith('momo:')) {
    if (diaspora) return { ok: false, raison: 'moyen' }
    const v = moyen.slice(5)
    const m = e.moyens.find((x) => x.id === v)
    const n = chiffres(v)
    if (!m && !/^6\d{8}$/.test(n)) return { ok: false, raison: 'moyen' }
    const numero = m ? m.numeroMasque : `${n[0]} ${n.slice(1, 3)} ·· ·· ${n.slice(-2)}`
    return { ok: true, paye: montant, libelle: `${(m?.operateur ?? operateur(n)) === 'Orange' ? 'Orange Money' : 'MTN MoMo'} · ${numero}`, moyen: m?.operateur === 'Orange' || (!m && operateur(n) === 'Orange') ? 'orange' : 'mtn', numero }
  }
  const frais = Math.round(montant * SERVICE_CARTE)
  if (moyen === 'apple' || moyen === 'google') return { ok: true, paye: montant + frais, libelle: moyen === 'apple' ? 'Apple Pay' : 'Google Pay', moyen, numero: null }
  if (moyen.startsWith('carte:')) {
    const c = e.cartes.find((x) => x.id === moyen.slice(6))
    if (!c) return { ok: false, raison: 'moyen' }
    return { ok: true, paye: montant + frais, libelle: `${c.marque} •••• ${c.derniers}`, moyen: 'carte', numero: `•••• ${c.derniers}` }
  }
  return { ok: false, raison: 'moyen' }
}
// Débite le portefeuille (l'argent remboursé d'abord, puis le reste des recharges).
function debiterPortefeuille(e: EtatDemo, montant: number, libelle: string): EtatDemo {
  let reste = montant
  const rembourse = Math.max(0, e.portefeuille.rembourse - reste)
  reste -= e.portefeuille.rembourse - rembourse
  const recharges = e.portefeuille.recharges.map((r) => {
    const pris = Math.min(r.restant, reste)
    reste -= pris
    return pris ? { ...r, restant: r.restant - pris, aServi: true } : r
  })
  return { ...e, portefeuille: { ...e.portefeuille, rembourse, recharges, historique: [{ id: 'rc-' + Date.now().toString(36), type: 'paiement', libelle, le: maintenant(), montant: -montant }, ...e.portefeuille.historique] } }
}
function refCommande(e: EtatDemo): string {
  const nums = Array.from({ length: 400 }, (_, i) => 'BLV-' + (53000 + i))
  return nums.find((r) => !e.passees.some((x) => x.ref === r))!
}

// ——— Les méthodes de la source ———

export interface Branchements {
  // Envois du jeu d'essai : la liste ou la cagnotte d'un proche connue de la démonstration (LISTES_PROCHES).
  offrirSurListe: Source['offrirArticleListe']
  participerCagnotte: Source['participerCagnotteListe']
  // Les proches de l'annuaire de la démonstration (comptes absents de l'appareil, mais « sur BelivaY »).
  procheConnu(numero: string): string | null
}

export function methodesRecus(b: Branchements): Pick<Source, 'recus' | 'recu' | 'executerRecu' | 'remercierRecu' | 'envoyerRecu'> {
  return {
    recus: async (): Promise<DonneesRecus> => {
      const e = lireEtat()
      const { recus, envoyes, t } = boite(e)
      return { recus, envoyes, aTraiter: recus.filter((x) => x.etat === 'a_traiter').length, maintenant: t }
    },
    recu: async (id): Promise<DetailRecu | null> => {
      const e = lireEtat()
      const { recus, envoyes, t } = boite(e)
      const r = recus.find((x) => x.id === id)
      const s = r ? null : envoyes.find((x) => x.id === id)
      if (!r && !s) return null
      return { envoi: (r ?? s)!, sens: r ? 'recu' : 'envoye', moyens: { diaspora: !!e.diaspora, mobile: e.diaspora ? [] : e.moyens, cartes: e.cartes, portefeuille: e.diaspora ? 0 : solde(e), relais: e.relais?.nom ?? null, prenom: e.profil.prenom }, maintenant: t }
    },
    executerRecu: async (id, a): Promise<ResultatRecu> => {
      const e = lireEtat()
      const { recus, t } = boite(e)
      const x = recus.find((y) => y.id === id)
      if (!x) return { ok: false, raison: 'traite' }
      if (x.etat === 'expire') return { ok: false, raison: 'expire' }
      const reseau = lireReseau().envois.find((y) => y.id === id) ?? null
      const moi = e.profil.prenom
      const diaspora = !!e.diaspora
      const action = (quoi: ActionEnvoi['quoi'], montant: number, ref: string | null, p: string | null = null, mot: string | null = null): ActionEnvoi => ({ le: t, par: moi, quoi, montant, ref, p, mot: mot?.trim() || null })
      const fin = (maj: Partial<EnvoiRecu>, act: ActionEnvoi, paye = 0): ResultatRecu => {
        majEnvoi(id, (y) => ({ ...y, ...maj, actions: [...y.actions, act] }))
        return { ok: true, envoi: boite().recus.find((y) => y.id === id)!, ref: act.ref, paye }
      }
      // Une commande payée pour l'envoyeur, chez qui paie (son suivi, ses factures).
      const commande = (p: Extract<Paiement, { ok: true }>, o: { articles: number; livraison: number; lignes: LigneEnvoi[]; qui: PaieFrais; fraisRemise: number; garantie: number }): string => {
        const ref = refCommande(lireEtat())
        const c: CommandePassee = { ref, le: t, mode: 'relais', lieu: x.lieu ?? 'Relais Mvog-Ada', moyen: p.moyen, numero: p.numero, comptoir: false, articles: o.lignes.reduce((n, l) => n + l.qte, 0), colis: 1, sousTotal: o.articles, livraison: o.livraison, frais: p.paye - o.articles - o.livraison, montant: p.paye, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: o.lignes.map((l) => ({ titre: l.titre, dessin: l.dessin, qte: l.qte, prix: l.prix, boutique: (l.p && CATALOGUE[l.p]?.vendeur.boutique) || 'Boutique C' })), pour: { prenom: x.type === 'liste' && x.hotes.length > 1 ? x.hotes.join(' & ') : x.de, relais: x.lieu ?? 'Relais Mvog-Ada', qui: o.qui, fraisRemise: o.fraisRemise, garantie: o.garantie } }
        modifier((y) => {
          const z = p.moyen === 'wallet' ? debiterPortefeuille(y, p.paye, `Payé pour ${x.de} · ${ref}`) : y
          return { ...z, passees: [c, ...z.passees] }
        })
        return ref
      }
      switch (a.action) {
        case 'offrir': {
          if (x.type !== 'liste') return { ok: false, raison: 'traite' }
          const l = x.lignes.find((y) => y.p === a.p)
          if (!l || l.offertPar) return { ok: false, raison: 'offert' }
          const qui: PaieFrais = a.qui === 'destinataire' && destinatairePeutPayer({ articles: l.prix, frais: l.livraison, payeurDiaspora: diaspora }).ok ? 'destinataire' : 'payeur'
          if (a.qui === 'destinataire' && qui !== 'destinataire') return { ok: false, raison: 'garantie' }
          const r = repartition({ articles: l.prix, frais: l.livraison, qui })
          const p = payer(e, a.moyen, r.payeurMaintenant)
          if (!p.ok) return { ok: false, raison: p.raison }
          let ref: string
          if (!reseau && x.code && x.type === 'liste') {
            // La liste d'un proche connue de la démonstration : le cadeau passe par la même règle que la page publique.
            const o = await b.offrirSurListe(x.code, l.p!, { prenom: moi, email: e.profil.email, moyen: p.libelle, prixVu: l.prix, qui })
            if (!o.ok) return { ok: false, raison: o.raison === 'garantie' ? 'garantie' : 'offert' }
            ref = o.ref
            if (p.moyen === 'wallet') modifier((y) => debiterPortefeuille(y, p.paye, `Cadeau pour ${x.de} · ${ref}`))
          } else {
            ref = commande(p, { articles: l.prix, livraison: qui === 'payeur' ? l.livraison : 0, lignes: [l], qui, fraisRemise: r.destinataireALaRemise, garantie: r.garantie })
            // Chez le propriétaire de la liste : l'article offert, et le colis à accepter s'il paie la livraison.
            if (reseau)
              modifierCompte(reseau.cleDe, (y) => ({
                ...y,
                listes: (y.listes ?? []).map((li) => (li.partage?.code === x.code ? { ...li, articles: li.articles.map((ar) => (ar.p === l.p ? { ...ar, offert: { par: moi, le: t, ref, qui } } : ar)) } : li)),
                colisEchange: [{ id: 'CE-' + (60 + (y.colisEchange ?? []).length), ref, origine: 'liste', sens: 'recu', de: moi, pour: y.profil.prenom, titre: l.titre, dessin: l.dessin, articles: l.prix, frais: l.livraison, qui, relais: x.lieu ?? 'Relais Mvog-Ada', mot: a.mot?.trim() || undefined, etat: qui === 'destinataire' ? 'a_accepter' : 'accepte', expedie: false, joursGarde: 0, retenue: null, rembourse: null, le: t }, ...(y.colisEchange ?? [])],
              }))
          }
          if (reseau) for (const autre of lireReseau().envois.filter((y) => y.code === x.code && y.id !== id)) majEnvoi(autre.id, (y) => ({ ...y, lignes: y.lignes.map((z) => (z.p === l.p ? { ...z, offertPar: moi } : z)) }))
          return fin({ etat: 'fait', lignes: x.lignes.map((y) => (y.p === l.p ? { ...y, offertPar: moi } : y)) }, action('offert', p.paye, ref, l.p, a.mot), p.paye)
        }
        case 'participer': {
          const fonds = x.type === 'liste' ? x.cagnotte : x.type === 'cagnotte' || x.type === 'cotisation' ? { objectif: x.objectif ?? 0, reuni: x.reuni } : null
          if (!fonds) return { ok: false, raison: 'traite' }
          const manque = Math.max(0, fonds.objectif - fonds.reuni)
          if (!manque) return { ok: false, raison: 'traite' }
          if (a.montant < Math.min(PARTICIPATION_MIN, manque) || a.montant > manque) return { ok: false, raison: 'montant' }
          const p = payer(e, a.moyen, a.montant)
          if (!p.ok) return { ok: false, raison: p.raison }
          const part = { prenom: moi, montant: a.montant, le: t, mot: a.mot?.trim() ?? '', discret: !!a.discret }
          if (x.type === 'cotisation') {
            // La cotisation de l'organisateur reçoit la participation (seule la boîte la garde pour le jeu d'essai).
            if (reseau) modifierCompte(reseau.cleDe, (y) => ({ ...y, cotisations: (y.cotisations ?? []).map((c) => (c.code === x.code ? { ...c, participations: [...c.participations, { id: 'pr' + t.toString(36), prenom: moi, montant: a.montant, frais: p.paye - a.montant, le: t, discret: !!a.discret, moyen: p.libelle, mot: part.mot, organisateur: false }] } : c)) }))
          } else if (reseau) modifierCompte(reseau.cleDe, (y) => ({ ...y, listes: (y.listes ?? []).map((li) => (li.partage?.code === x.code && li.cagnotte ? { ...li, cagnotte: { ...li.cagnotte, participations: [...li.cagnotte.participations, part] } } : li)) }))
          else if (x.code) {
            const r = await b.participerCagnotte(x.code, { prenom: moi, montant: a.montant, moyen: p.libelle, mot: part.mot, discret: !!a.discret })
            if (!r.ok) return { ok: false, raison: r.raison === 'montant' ? 'montant' : 'traite' }
          }
          if (p.moyen === 'wallet') modifier((y) => debiterPortefeuille(y, p.paye, `Participation · ${x.titre}`))
          const reuni = fonds.reuni + a.montant
          return fin({ etat: 'fait', ...(x.type === 'liste' ? {} : { reuni }) }, action('participe', p.paye, null, null, a.mot), p.paye)
        }
        case 'payer': {
          if (!['panier', 'lien-paiement', 'demande-diaspora', 'rentree'].includes(x.type)) return { ok: false, raison: 'traite' }
          if (x.type === 'demande-diaspora' && !diaspora) return { ok: false, raison: 'diaspora' }
          const articles = x.lignes.reduce((n, l) => n + l.prix * l.qte, 0)
          let montant: number
          let qui: PaieFrais = 'payeur'
          let r = repartition({ articles, frais: x.frais, qui })
          if (diaspora) montant = totalDiaspora({ articles, fraisRelais: x.frais, fraisDomicile: x.frais, livraison: 'relais', supplementPar: 'payeur' }).total - Math.round((articles + x.frais) * SERVICE_CARTE)
          else {
            qui = (x.qui ?? a.qui) === 'destinataire' && destinatairePeutPayer({ articles, frais: x.frais }).ok ? 'destinataire' : 'payeur'
            if ((x.qui ?? a.qui) === 'destinataire' && qui !== 'destinataire') return { ok: false, raison: 'garantie' }
            r = repartition({ articles, frais: x.frais, qui })
            montant = r.payeurMaintenant
          }
          const p = payer(e, a.moyen, montant)
          if (!p.ok) return { ok: false, raison: p.raison }
          const ref = commande(p, { articles, livraison: qui === 'payeur' ? x.frais : 0, lignes: x.lignes, qui, fraisRemise: r.destinataireALaRemise, garantie: r.garantie })
          return fin({ etat: 'fait', ref }, action('paye', p.paye, ref, null, a.mot), p.paye)
        }
        case 'accepter': {
          if (!['colis', 'lien-famille', 'abonnement', 'panier-famille', 'code-retrait', 'parrainage', 'partage'].includes(x.type) || x.etat !== 'a_traiter') return { ok: false, raison: 'traite' }
          if (x.type === 'abonnement') {
            const mois = /12 mois|1 an/.test(x.detail ?? '') ? 12 : /3 mois/.test(x.detail ?? '') ? 3 : 1
            const palier = /Duo/i.test(x.detail ?? '') ? 'duo' : /Plus/i.test(x.detail ?? '') ? 'plus' : 'prime'
            modifier((y) => {
              const fin0 = y.abonnement?.fin ?? y.abonnement?.prochain ?? t
              const debut = Math.max(t, fin0)
              return { ...y, abonnement: { palier, formule: mois === 12 ? 'an' : 'mois', debut: t, prochain: null, montant: 0, moyen: `Offert par ${x.de}`, resilie: null, fin: debut + (mois === 12 ? 365 : mois * 30) * J, offertPar: x.de, echec: null, messageCadeau: x.mot } }
            })
          }
          if (x.type === 'lien-famille') {
            const relais = a.relais ?? e.relais?.nom ?? 'Relais Mvog-Ada'
            modifier((y) => {
              const lien: LienFamille = { id: 'LF-' + (70 + (y.liens ?? []).length), sens: 'cameroun', prenom: x.de, pays: x.depuis, relais, etat: 'actif', le: t, commandes: [] }
              return { ...y, liens: [lien, ...(y.liens ?? []).filter((l) => !(l.prenom === x.de && l.sens === 'cameroun'))] }
            })
            if (reseau) modifierCompte(reseau.cleDe, (y) => ({ ...y, liens: [{ id: 'LF-' + (80 + (y.liens ?? []).length), sens: 'diaspora', prenom: moi, pays: null, relais: relais.replace(/^Relais /, ''), etat: 'actif', le: t, commandes: [] }, ...(y.liens ?? []).filter((l) => !(l.prenom === moi && l.etat === 'invite'))] }))
          }
          if (x.type === 'parrainage' && reseau) modifierCompte(reseau.cleDe, (y) => ({ ...y, filleuls: [...(y.filleuls ?? []), { prenom: moi, le: t, etat: 'inscrit' }] }))
          const etat = x.type === 'partage' || x.type === 'parrainage' || x.type === 'lien-famille' || x.type === 'abonnement' ? 'fait' : 'accepte'
          return fin({ etat }, action(x.type === 'partage' ? 'vu' : 'accepte', 0, x.ref))
        }
        case 'refuser': {
          if (x.etat !== 'a_traiter' && !(x.type === 'code-retrait' && x.etat === 'accepte')) return { ok: false, raison: 'traite' }
          // Colis refusé (règle 6) : sans frais avant l'expédition, le payeur est remboursé en entier.
          const rendu = x.type === 'colis' ? refusColis({ articles: x.lignes.reduce((n, l) => n + l.prix * l.qte, 0), frais: x.frais, qui: x.qui ?? 'payeur', expedie: false, joursGarde: 0 }).rembourse : 0
          return fin({ etat: 'refuse' }, action('refuse', rendu, null, null, a.mot))
        }
        case 'retirer': {
          if (x.type !== 'code-retrait' || x.etat !== 'accepte') return { ok: false, raison: 'traite' }
          return fin({ etat: 'fait' }, action('retire', 0, x.ref))
        }
      }
    },
    remercierRecu: async (id, texte) => {
      const e = lireEtat()
      const { recus, envoyes, t } = boite(e)
      const x = recus.find((y) => y.id === id) ?? envoyes.find((y) => y.id === id)
      const mot = texte.trim()
      if (!x || !mot) return { ok: false }
      // Le bénéficiaire remercie qui a payé : l'envoyeur d'une liste ou d'une cotisation remercie ceux qui ont agi ;
      // le destinataire d'un colis, d'un abonnement ou d'un panier famille remercie l'envoyeur.
      const recu = recus.includes(x)
      const permis = recu ? ['colis', 'abonnement', 'panier-famille', 'lien-famille', 'parrainage', 'partage', 'code-retrait'].includes(x.type) && x.etat !== 'a_traiter' : x.actions.some((y) => y.montant > 0 || y.quoi === 'accepte')
      if (!permis) return { ok: false }
      majEnvoi(id, (y) => ({ ...y, merci: { de: e.profil.prenom, texte: mot.slice(0, 280), le: t } }))
      return { ok: true }
    },
    envoyerRecu: async (n) => {
      const e = lireEtat()
      const t = maintenant()
      const brut = n.a.trim()
      const email = brut.includes('@') ? brut.toLowerCase() : null
      const num = email ? null : chiffres(brut).replace(/^237(?=6\d{8}$)/, '')
      if (email ? !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) : !num || num.length < 8 || num.length > 15) return { ok: false, raison: 'numero' }
      if (['liste', 'panier', 'lien-paiement', 'rentree', 'demande-diaspora'].includes(n.type) && !(n.lignes ?? []).length) return { ok: false, raison: 'vide' }
      const compte = compteDe(email ?? num!)
      if (compte?.cle === cleCompte(e)) return { ok: false, raison: 'moi' }
      const id = (compte ? 'N-' : 'E-') + t.toString(36) + Math.random().toString(36).slice(2, 5)
      const connu = !compte && num ? b.procheConnu(num) : null
      const lignes = n.lignes ?? []
      const envoi: EnvoiRecu = base({
        id,
        type: n.type,
        de: e.profil.prenom,
        depuis: e.diaspora?.pays ?? null,
        pour: compte?.prenom ?? connu ?? n.prenom.trim(),
        titre: n.titre.trim(),
        occasion: n.occasion ?? null,
        hotes: n.hotes ?? [],
        date: n.date ?? null,
        lieu: n.lieu ?? e.relais?.nom ?? null,
        mot: n.mot?.trim() || null,
        le: t,
        jusqua: n.jusqua ?? (GROUPE_ENVOI[n.type] === 'payer' ? t + 7 * J : null),
        lignes,
        frais: n.frais ?? (lignes.length && n.type !== 'liste' ? fraisLignes(lignes) : 0),
        qui: n.qui ?? null,
        objectif: n.objectif ?? null,
        cagnotte: n.cagnotte ?? null,
        code: n.code ?? null,
        ref: n.ref ?? null,
        detail: n.detail ?? null,
        lien: n.lien ?? (n.type === 'liste' && n.code ? '/l/' + n.code : n.type === 'cotisation' && n.code ? '/cotisation-participer?c=' + n.code : '/recu?id=' + id),
        dansLApplication: !!compte || !!connu,
      })
      if (compte) {
        const r = lireReseau()
        r.envois.unshift({ ...envoi, cleDe: cleCompte(e), clePour: compte.cle })
        ecrireReseau(r)
      } else modifier((y) => ({ ...y, envoyes: [envoi, ...envoyesDe(y)] }))
      return { ok: true, envoi }
    },
  }
}

// Notifications du destinataire pour les envois venus d'un autre compte de l'appareil (le jeu d'essai n'en ajoute
// pas : ses notifications sont celles du prototype).
export function notificationsRecus(e: EtatDemo) {
  if (!e.connecte) return []
  const k = cleCompte(e)
  const r = lireReseau()
  return [
    ...r.envois.filter((x) => x.clePour === k).map((x) => ({ id: 'rc-' + x.id, type: 'Paiement' as const, titre: `${x.de} t’a envoyé : ${x.titre}`, texte: x.mot ? `« ${x.mot} »` : 'Ouvre-le dans tes Reçus.', le: x.le, lu: x.etat !== 'a_traiter', lien: '/recu?id=' + x.id, sms: false })),
    ...r.envois.filter((x) => x.cleDe === k && x.actions.length).map((x) => {
      const a = x.actions[x.actions.length - 1]
      const quoi = a.quoi === 'refuse' ? 'a répondu non à' : a.quoi === 'accepte' || a.quoi === 'vu' ? 'a accepté' : a.quoi === 'retire' ? 'a retiré' : a.quoi === 'participe' ? 'a participé à' : 'a payé'
      return { id: 'rcr-' + x.id + '-' + x.actions.length, type: 'Paiement' as const, titre: `${a.par} ${quoi} : ${x.titre}`, texte: a.montant ? `${a.montant.toLocaleString('fr-FR')} F` : 'Voir la réponse dans tes Reçus.', le: a.le, lu: false, lien: '/recu?id=' + x.id, sms: false }
    }),
  ]
}
