// DONNÉES DE DÉMONSTRATION — à retirer d'un bloc quand l'API existera (supprimer ce dossier et
// remplacer l'import dans src/donnees/source.ts).
// Valeurs reprises du prototype du 1er octobre et du jeu d'essai de CL-02 (« la journée de référence »).
// Illustrations : outils/demo.mjs (dessins du prototype).
import { COORDONNEES } from '../config/coordonnees'
import { INTERRUPTEURS_DU_LANCEMENT, type EtatInterrupteurs } from '../config/interrupteurs'
import type { LienFamille, ProcheActif, Adresse, ChangementProfil, Masque, Message, DonneesPortefeuille, RefusPortefeuille, Client, DonneesCompte, DonneesMenu, EnteteDonnees, EnvoiCode, ObjetCode, Rappel, ResultatCode, Boutique, MethodeConnexion, AvisProduit, Abonnement, ChangementPanier, ConversationWa, Troc, ArticleFamille, ArticleListe, Cotisation, PanierFamille, MiseDeCote, OffreFlash, CommandeClient, ListeEnvies, ColisCommande, DonneesPrime, NotificationClient, PanierPartage, Relais, CommandeLitige, CommandePassee, Litige, DonneesPanier, Favori, LignePanier, Produit, Session, Source, ProcheBelivay, ColisEchange, ListePublique, OccasionListe, LigneEnvoi } from '../donnees/source'
import { AGE_DIASPORA, PAYS_DIASPORA, PLAFONDS_DIASPORA, controleDiaspora, libelleCarte, nomCarte, paysDuBin } from '../donnees/source'
import { chiffres, masquer as masquerNumero, operateur } from '../donnees/numeros'
import { maintenant } from './horloge'
import { FCFA as F } from '../i18n/format'
import { calculer, type Classe } from '../donnees/frais'
import { COTISER_DES, RAPPEL_ECART, destinatairePeutPayer, objectifCotisation, refusColis, repartition } from '../donnees/echanges'
import { GRACE, PASS, finGrace, palier } from '../donnees/prime'
import { forfaitCote, planCote, planCoteRentree } from '../donnees/cote'
import { calculFamille } from '../donnees/famille'
import { estimer, MODELES_REPRISE } from '../donnees/troc'
import { FAQ } from './faq'
import { LEGAL } from './legal'
import { CATALOGUE } from './catalogue'
import { CONTENU_ACCUEIL } from '../donnees/contenus'
import { centre, kmEntre, texteKm, type Point } from '../donnees/geo'
import { COMMANDES } from './commandes'
import { ECOLES, LISTES_RENTREE } from './rentree'
import { ETAT_NOUVEAU, ecrireEtat, lireEtat, modifier, solde, type EtatDemo } from './magasin'
import { cleCompte, compteDe, compteGarde, garderCompte, inscrireNumero, methodesRecus, notificationsRecus, recusATraiter, rouvrirCompte } from './reseau'
import navigation from '../genere/navigation.json'
import illustrations from './illustrations.json'

// Mode « prototype » de la démonstration : tous les modules ouverts et les repères de revue visibles,
// pour comparer le site au prototype au pixel près. Réglé sur l'appareil (blv_demo_prototype = 1).
// Il disparaît avec ce dossier : la production n'a jamais ce mode.
function modePrototype(): boolean {
  try {
    return localStorage.getItem('blv_demo_prototype') === '1'
  } catch {
    return false
  }
}

const tousOuverts = (): EtatInterrupteurs =>
  Object.fromEntries(Object.keys(INTERRUPTEURS_DU_LANCEMENT).map((k) => [k, true])) as EtatInterrupteurs

// Profil de la démonstration : dans l'état du compte (demo/magasin.ts), modifié sur cet appareil (DP-52).
type Profil = { prenom: string; nom: string; email: string; photo: string | null }
const lireProfil = (): Profil => lireEtat().profil
const ecrireProfil = (p: Profil) => modifier((e) => ({ ...e, profil: { ...e.profil, ...p } }))
const masquerEmail = (e: string) => {
  const [nom, domaine] = e.split('@')
  // Toujours cinq points, comme le prototype (« c•••••@gmail.com ») : la longueur du nom ne se devine pas.
  return nom.slice(0, 1) + '•••••@' + domaine
}
function client(): Client {
  const p = lireEtat().profil
  return {
    prenom: p.prenom,
    nom: p.nom,
    nomComplet: [p.prenom, p.nom].filter(Boolean).join(' '),
    numeroMasque: p.numeroMasque,
    operateur: p.operateur,
    email: p.email,
    emailMasque: masquerEmail(p.email),
    connexion: p.connexion,
    portrait: { 36: { svg: illustrations.portraits['carine-36'] }, 48: { svg: illustrations.portraits['carine-48'] } },
    photo: p.photo,
  }
}

// Codes de la démonstration (CIN-33 : valeurs proposées par le prototype) : 6 chiffres, 10 minutes, renvoi
// après 60 secondes, 5 essais puis 15 minutes d'attente. Le code par SMS est celui du prototype (503 917).
const CODE_SMS = '503917'
const CODE_EMAIL = '284615'
const ESSAIS = 5
const ATTENTE_MS = 15 * 60 * 1000
const essais: Record<string, { faux: number; bloqueJusqua: number }> = {}
let emailEnCours: string | null = null
let smsEmailValide = false
let ancienValide = false
let numeroEnCours: string | null = null
// Inscription diaspora : l'adresse et le numéro qui ont reçu un code ; un code ne vaut que pour eux. Code SMS :
// CODE_SMS ; code e-mail : CODE_EMAIL (284 615), les mêmes que pour le profil.
const envoiDiaspora: { sms: string | null; email: string | null } = { sms: null, email: null }
// Jetons d'identité Google ou Apple donnés à l'inscription diaspora (le serveur vérifie la signature du fournisseur ;
// ici : le jeton doit avoir été délivré dans cette session).
const jetonsFournisseur = new Map<string, { fournisseur: 'google' | 'apple'; prenom: string; nom: string; email: string }>()
// Liens « nouveau mot de passe » déjà servis (usage unique), le temps de la session.
const jetonsMdpServis = new Set<string>()
function verifier(objet: ObjetCode | 'connexion', code: string, attendu: string): { ok: true } | Exclude<ResultatCode, { ok: true }> {
  const e = (essais[objet] ??= { faux: 0, bloqueJusqua: 0 })
  if (e.bloqueJusqua > Date.now()) return { ok: false, bloqueJusqua: e.bloqueJusqua }
  if (code === attendu) {
    e.faux = 0
    return { ok: true }
  }
  e.faux += 1
  if (e.faux >= ESSAIS) {
    e.faux = 0
    e.bloqueJusqua = Date.now() + ATTENTE_MS
    return { ok: false, bloqueJusqua: e.bloqueJusqua }
  }
  return { ok: false, essaisRestants: ESSAIS - e.faux }
}

function session(): Session {
  const proto = modePrototype()
  const e = lireEtat()
  return {
    connecte: e.connecte,
    client: e.connecte ? client() : null,
    relais: e.relais ? { nom: e.relais.nom, gerant: e.relais.gerant, horaireDuJour: 'Ouvert jusqu’à 19 h' } : null,
    badges: (() => {
      const m = compteursMenu(e)
      return { panier: e.panier.lignes.reduce((n, l) => n + l.qte, 0), nonLus: m.notificationsNouvelles, compte: m.commandes.aRetirer }
    })(),
    interrupteurs: proto ? tousOuverts() : INTERRUPTEURS_DU_LANCEMENT,
    reperesPrototype: proto,
    bandeau: { quartiersExploites: 12, seuilRetraitOffert: 30000 },
    typeCompte: e.diaspora ? 'diaspora' : 'standard',
    devise: e.diaspora ? (e.devise ?? 'XAF') : 'XAF',
    ...(e.diaspora ? { proche: procheActif(e) } : {}),
  }
}
// Proche actif d'un compte diaspora (DP-54) : le lien choisi s'il est encore actif, sinon le premier relié.
function lienActif(e: EtatDemo): LienFamille | null {
  if (!e.diaspora) return null
  const actifs = (e.liens ?? []).filter((l) => l.sens === 'diaspora' && l.etat === 'actif')
  return actifs.find((l) => l.id === e.procheActif) ?? actifs[0] ?? null
}
function procheActif(e: EtatDemo): ProcheActif | null {
  const l = lienActif(e)
  if (!l) return null
  const autres = (e.liens ?? []).filter((x) => x.sens === 'diaspora' && x.etat === 'actif').length - 1
  return { id: l.id, prenom: l.prenom, quartier: l.relais ? l.relais.replace(/^Relais /, '') : null, ville: l.ville ?? null, domicile: !!l.domicile, autres }
}

const UNIVERS: [string, string, number][] = [
  ['tel', 'Téléphones & tablettes', 132],
  ['elec', 'Électronique', 98],
  ['femme', 'Mode femme', 283],
  ['homme', 'Mode homme', 165],
  ['chauss', 'Chaussures', 145],
  ['beaute', 'Beauté & santé', 168],
  ['maison', 'Maison & cuisine', 138],
  ['marche', 'Supermarché', 129],
  ['bebe', 'Bébé & enfant', 90],
  ['sport', 'Sport & loisirs', 39],
]

// Le reste du menu (portefeuille, compteurs) se lit dans l'état du compte : sourceDemo.menu().
const MENU: Omit<DonneesMenu, 'portefeuille' | 'commandes' | 'sauvegardesSuivis' | 'litiges' | 'messagesNonLus' | 'notificationsNouvelles'> = {
  promotions: { nombre: 6, remiseMax: 15 },
  seuilPremium: 10000,
  univers: UNIVERS.map(([id, nom, produits]) => ({
    id,
    nom,
    produits,
    vignette: {
      svg: (illustrations.univers as Record<string, string>)[id],
      svgSombre: (illustrations.universSombre as Record<string, string>)[id],
    },
  })),
  support: { ouverture: 7, fermeture: 21 },
}

// Zones servies au lancement : 12 quartiers de Yaoundé, un relais par zone (jeu d'essai de CL-02 : Mvog-Ada,
// Essos, Mvan, Bastos, Mokolo, Melen, Biyem-Assi, Emana cités ; les quatre derniers complètent la démonstration).
const ZONES = ['Mvog-Ada', 'Essos', 'Mvan', 'Bastos', 'Mokolo', 'Melen', 'Biyem-Assi', 'Emana', 'Nlongkak', 'Ngoa-Ekellé', 'Omnisport', 'Etoudi']
const servie = (q: string) => ZONES.some((z) => z.toLowerCase() === q.trim().toLowerCase())
// « Akwa, Douala » → « Douala » ; « Odza » → « Odza ».
const ville = (q: string) => (q.includes(',') ? q.split(',').pop()!.trim() : q.trim())

// Règles du portefeuille (registre de CL-16, moteurs/portefeuille.py).
const PF = {
  plafond: 2_500_000,
  rechargeMin: 500,
  retraitMin: 1000,
  retraitJour: 500_000,
  versementHeures: 1,
  attenteRechargeH: 72,
  attenteNumeroH: 48,
  gratuitsParMois: 1,
  fraisPourCent: 1,
  fraisMin: 100,
}
const H = 3600 * 1000
// Notifications du jeu d'essai (le prototype, journée du jeudi 24 sept.) ; aucune ne montre le code de retrait.
const NOTIFICATIONS: NotificationClient[] = [
  { id: 'n1', type: 'Suivi', titre: 'Colis 1 de BLV-52107 confirmé', texte: 'Prêt dans 2 h. Retrait possible aujourd’hui dès 15 h, avec un seul code pour tes 3 colis.', le: Date.UTC(2026, 8, 24, 8, 20), lu: false, lien: '/suivi?ref=BLV-52107', sms: false },
  { id: 'n2', type: 'Paiement', titre: 'Paiement protégé · BLV-52107', texte: '180 280 F. Ton argent reste bloqué jusqu’à ton retrait.', le: Date.UTC(2026, 8, 24, 8, 2), lu: false, lien: '/commande?ref=BLV-52107', sms: false },
  { id: 'n3', type: 'Retrait', titre: 'Colis arrivé · BLV-51940', texte: 'Ta commande validée t’attend au Relais Mvog-Ada. Le reste se paie au retrait en Mobile Money.', le: Date.UTC(2026, 8, 24, 7, 50), lu: false, lien: '/commande?ref=BLV-51940', sms: false },
  { id: 'n4', type: 'Retrait', titre: 'Rappel · BLV-52018', texte: 'Garde : 300 F aujourd’hui, 500 F demain. Retrait avant sam. 26 au soir, sinon renvoi (+ 500 F).', le: Date.UTC(2026, 8, 23, 17, 0), lu: true, lien: '/garde?ref=BLV-52018', sms: true },
  { id: 'n5', type: 'Incident', titre: 'Litige LIT-3042 reçu', texte: 'Le vendeur a jusqu’au ven. 25 à 17 h 15. Ton paiement reste bloqué, rien n’est versé au vendeur.', le: Date.UTC(2026, 8, 23, 16, 15), lu: true, lien: '/litige-suivi?id=LIT-3042', sms: false },
  { id: 'n6', type: 'Messages', titre: 'Réponse du vendeur · Pagne wax', texte: 'Bonjour, oui : 100 % coton, 6 yards.', le: Date.UTC(2026, 8, 19, 6, 30), lu: true, lien: '/fil?id=question', sms: false },
  { id: 'n7', type: 'Retrait', titre: 'Colis arrivés · BLV-52018', texte: 'Tes 2 colis t’attendent au Relais Mvog-Ada. Garde gratuite aujourd’hui.', le: Date.UTC(2026, 8, 21, 16, 40), lu: true, lien: '/code?ref=BLV-52018', sms: true },
]
// Commandes : le jeu d'essai, modifié par les gestes, et celles passées sur l'appareil (en préparation).
function toutesCommandes(): CommandeClient[] {
  const e = lireEtat()
  const maj = e.commandesMaj ?? {}
  const passees: CommandeClient[] = e.passees
    .filter((c) => c.etat === 'payee')
    .map((c) => ({
      ref: c.ref,
      etat: 'preparation',
      payeeLe: c.le,
      mode: c.mode,
      lieu: c.lieu,
      colis: c.lignes.map((l, i) => ({ n: i + 1, p: Object.keys(CATALOGUE).find((k) => CATALOGUE[k].titre === l.titre) ?? '', produit: l.titre, dessin: l.dessin, prix: l.prix, qte: l.qte, boutique: l.boutique, etagere: null, arrive: false, statut: 'attente' as const })),
      total: c.montant + c.dueAuRetrait,
      livraison: c.livraison,
      code: String(100000 + (Number(c.ref.slice(4)) * 7919) % 900000),
      codeBio: c.sousTotal >= 50000,
      arriveeLe: null,
      pretLe: c.le + 6 * H,
      garde: null,
      comptoir: c.comptoir ? { livraisonPayee: c.montant, du: c.dueAuRetrait } : null,
      litige: null,
      retireeLe: null,
      retourJusqua: null,
      annulee: null,
      delegue: null,
      payeur: c.payeur,
      etapes: [{ titre: c.comptoir ? 'Validée (livraison payée)' : c.payeur ? `Payée par ${c.payeur.prenom}` : 'Payée', le: c.le }, { titre: 'Préparée par les vendeurs', le: null }, { titre: c.mode === 'relais' ? 'Arrivée au relais' : 'En livraison', le: null }, { titre: c.mode === 'relais' ? 'Retirée' : 'Livrée', le: null }],
    }))
  return [...passees, ...(e.jeuEssai === false ? [] : COMMANDES)].map((c) => ({ ...c, ...(maj[c.ref] ?? {}) }))
}
// Abonnement actif : période payée en cours (résilié : jusqu'à la fin ; Pass : 7 jours).
const J = 24 * 3600 * 1000
function abonnementActif(e: EtatDemo): Abonnement | null {
  const a = e.abonnement
  if (!a) return null
  const t = maintenant()
  if (a.echec && finGrace(a.echec.le) < t) return null // grâce finie sans paiement : palier Gratuit (CAB-43)
  return a.fin !== null && a.fin < t ? null : a
}
// Cagnotte (2 % du sous-total produits, jamais la livraison) : en attente tant que la commande n'est pas
// retirée ; versée au Portefeuille au retrait (le vendeur est alors payé).
function cagnotteDe(e: EtatDemo) {
  const a = e.abonnement
  const taux = a && a.palier !== 'pass' ? (palier(a.palier)?.cagnotte ?? 0) : 0
  if (!a || !taux) return { attente: [] as DonneesPrime['cagnotte']['attente'], versees: [] as { ref: string; montant: number }[] }
  const cs = toutesCommandes().filter((c) => c.payeeLe >= a.debut && c.etat !== 'annulee')
  const ligne = (c: CommandeClient) => {
    const base = c.colis.filter((x) => !x.annule).reduce((n, x) => n + x.prix * x.qte, 0)
    const premier = c.colis[0]
    return { ref: c.ref, produit: premier?.produit ?? '', dessin: premier?.dessin || CATALOGUE[premier?.p ?? '']?.dessins[0] || '', base, montant: Math.round(base * taux) }
  }
  return { attente: cs.filter((c) => c.etat !== 'retiree').map(ligne), versees: cs.filter((c) => c.etat === 'retiree').map(ligne) }
}
const cagnotteAttente = (e: EtatDemo) => cagnotteDe(e).attente.reduce((n, x) => n + x.montant, 0)

// Listes d'envies : prix et dessin du catalogue à chaque lecture (jamais un prix figé) ; livraison au relais de
// l'article seul ; la liste par défaut est faite des favoris.
function articleListe(p: string, offert: ArticleListe['offert'] = null): ArticleListe | null {
  const pr = CATALOGUE[p]
  if (!pr) return null
  const sc = [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }]
  const f = calculer('relais', sc)
  const d = calculer('domicile', sc)
  return { p, titre: pr.titre, dessin: pr.dessins[0] ?? '', prix: pr.prix, livraison: f.total - f.sousTotal, livraisonDomicile: d.total - d.sousTotal, prixPartage: null, offert }
}
// Le prix montré aux proches : relevé au partage (ou à l'ajout dans une liste déjà partagée) ; le prix du jour à côté.
const auPartage = (a: ArticleListe, partage: ListeEnvies['partage']): ArticleListe => ({ ...a, prixPartage: partage ? (partage.prix?.[a.p] ?? a.prix) : null })
function listesDe(e: EtatDemo): ListeEnvies[] {
  const fav: ListeEnvies = {
    id: 'favoris',
    nom: 'Mes favoris',
    favoris: true,
    mode: 'fil',
    remiseLe: null,
    surprise: e.reglagesFavoris?.surprise ?? false,
    destination: e.reglagesFavoris?.destination ?? 'moi',
    relais: (e.reglagesFavoris?.destination ?? 'moi') === 'moi' ? (e.relais?.nom ?? null) : (e.reglagesFavoris?.tiers?.relais ?? null),
    tiers: e.reglagesFavoris?.destination === 'tiers' ? (e.reglagesFavoris.tiers ?? null) : null,
    domicile: e.reglagesFavoris?.domicile ?? false,
    partage: e.partageFavoris ?? null,
    demarree: false,
    articles: e.favoris
      .map((f) => articleListe(f.p))
      .filter((x): x is ArticleListe => !!x)
      .map((a) => auPartage(a, e.partageFavoris ?? null)),
  }
  const nommees = (e.listes ?? []).map((l) => ({ ...l, relais: l.destination === 'moi' ? (l.relais ?? e.relais?.nom ?? null) : l.relais, articles: l.articles.map((a) => {
      const cot = cotisationArticle(e, l.partage?.code, a.p)
      return { ...auPartage(articleListe(a.p, a.offert) ?? a, l.partage), offert: a.offert ?? offertParCotisation(cot), cotisation: infoCotisation(cot) }
    }) }))
  return [fav, ...nommees]
}
function majListe(id: string, f: (l: ListeEnvies) => ListeEnvies) {
  modifier((e) => (id === 'favoris' ? e : { ...e, listes: (e.listes ?? []).map((l) => (l.id === id ? f(l) : l)) }))
}

// Ventes flash du jeu d'essai (heures de Yaoundé, jeudi 24 sept.) : stock propre à l'offre.
const FLASH: { p: string; prix: number; debut: number; fin: number; stock: number }[] = [
  { p: 'cartable', prix: 10900, debut: Date.UTC(2026, 8, 23, 19), fin: Date.UTC(2026, 8, 24, 19), stock: 7 },
  { p: 'portebebe', prix: 17500, debut: Date.UTC(2026, 8, 24, 8), fin: Date.UTC(2026, 8, 25, 8), stock: 3 },
  { p: 'chargeur33', prix: 5500, debut: Date.UTC(2026, 8, 24, 9), fin: Date.UTC(2026, 8, 25, 11), stock: 18 },
  { p: 'ballon', prix: 7200, debut: Date.UTC(2026, 8, 22, 9), fin: Date.UTC(2026, 8, 24, 9), stock: 0 },
  { p: 'riz', prix: 15900, debut: Date.UTC(2026, 8, 25, 7), fin: Date.UTC(2026, 8, 26, 19), stock: 25 },
]
function offresFlash(e: EtatDemo): OffreFlash[] {
  return FLASH.filter((f) => CATALOGUE[f.p]).map((f) => {
    const pr = CATALOGUE[f.p]
    const fr = calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: f.prix, quantite: 1, classe: pr.classe as Classe }] }])
    return { p: f.p, titre: pr.titre, dessin: pr.dessins[0] ?? '', univers: pr.univers, prix: f.prix, avant: pr.prix, debut: f.debut, fin: f.fin, stock: Math.max(0, f.stock - (e.flashVendus?.[f.p] ?? 0)), livraison: fr.total - fr.sousTotal }
  })
}

// Cotisations : la date limite passée sans objectif, chacun est remboursé (lu à chaque visite) ; l'objectif
// atteint, la commande part au prix figé (hausse de 5 % au plus prise par BelivaY).
function prixLivreDe(p: string) {
  const pr = CATALOGUE[p]
  return calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }]).total
}
function cotisationsDe(e: EtatDemo): Cotisation[] {
  const t = maintenant()
  return (e.cotisations ?? []).map((c) => ({ ...c, dessin: c.dessin || CATALOGUE[c.p]?.dessins[0] || '', ...(c.etat === 'ouverte' && c.jusqua < t ? { etat: 'echue' as const, fin: c.jusqua + 3600e3 } : {}) }))
}
const reuni = (c: Cotisation) => c.participations.reduce((n, x) => n + x.montant, 0)
function commanderCotisation(c: Cotisation): Cotisation {
  const e = lireEtat()
  const t = maintenant()
  const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52110 + i * 3))
  const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
  const pr = CATALOGUE[c.p]
  // Qui paie la livraison (donnees/echanges.ts) : les participants (dans l'objectif) ou le bénéficiaire, à la remise.
  const qui = c.qui ?? 'payeur'
  const frais = c.frais ?? c.prixLivre - pr.prix
  const r = repartition({ articles: pr.prix, frais, qui })
  const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: c.relais, moyen: 'wallet', numero: null, comptoir: false, articles: 1, colis: 1, sousTotal: pr.prix, livraison: qui === 'payeur' ? frais : 0, frais: 0, montant: r.payeurMaintenant, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: [{ titre: c.titre, dessin: c.dessin || pr.dessins[0] || '', qte: 1, prix: pr.prix, boutique: pr.vendeur.boutique }], pour: { prenom: c.beneficiaire, relais: c.relais, qui, fraisRemise: r.destinataireALaRemise, garantie: r.garantie } }
  modifier((x) => ({ ...x, passees: [commande, ...x.passees] }))
  // Née de ma propre liste : le colis m'arrive ; sinon c'est un envoi au bénéficiaire.
  const mienne = !!c.liste && listesDe(e).some((l) => l.partage?.code === c.liste!.code)
  ajouterColis({ ref, origine: 'cotisation', sens: mienne ? 'recu' : 'envoye', de: c.organisateur, pour: c.beneficiaire, titre: c.titre, dessin: c.dessin || pr.dessins[0] || '', articles: pr.prix, frais, qui, relais: c.relais, etat: qui === 'destinataire' ? 'a_accepter' : 'accepte', le: t })
  return { ...c, etat: 'atteinte', ref, fin: t }
}
function majCotisation(c: Cotisation) {
  modifier((x) => ({ ...x, cotisations: (x.cotisations ?? []).map((y) => (y.id === c.id ? c : y)) }))
}

// Panier famille : les essentiels (5 kg au plus chacun) et les paniers prêts.
const ARTICLES_FAMILLE: ArticleFamille[] = [
  { id: 'riz5', titre: 'Riz parfumé 5 kg', prix: 4200, poids: 5, dessin: 'ead843e64b50' },
  { id: 'riz25', titre: 'Riz parfumé 25 kg', prix: 18500, poids: 25, dessin: '' },
  { id: 'huile5', titre: 'Huile d’arachide 5 L', prix: 9800, poids: 4.6, dessin: '56af8b436322' },
  { id: 'sucre', titre: 'Sucre en poudre 1 kg', prix: 1000, poids: 1, dessin: '8df366466f2c' },
  { id: 'lait', titre: 'Lait en poudre 400 g', prix: 4600, poids: 0.45, dessin: '97c870f40819' },
  { id: 'spaghetti', titre: 'Spaghetti 500 g', prix: 400, poids: 0.5, dessin: 'abaa0336cc7c' },
  { id: 'savon', titre: 'Savon de ménage 400 g', prix: 350, poids: 0.4, dessin: '2182cef3b810' },
  { id: 'tomate', titre: 'Tomate concentrée 400 g', prix: 500, poids: 0.42, dessin: 'fc235ec495c7' },
  { id: 'sardines', titre: 'Sardines à l’huile 125 g', prix: 600, poids: 0.13, dessin: 'd1bed55bf0fa' },
  { id: 'cafe', titre: 'Café arabica de l’Ouest 500 g', prix: 6500, poids: 0.5, dessin: '' },
  { id: 'cahiers', titre: 'Cahiers 100 pages × 10', prix: 3000, poids: 2, dessin: '' },
  { id: 'stylos', titre: 'Stylos bille × 10', prix: 1000, poids: 0.15, dessin: '' },
]
const MODELES_FAMILLE = [
  { id: 'essentiels', nom: 'Essentiels du mois', articles: [{ id: 'riz5', qte: 2 }, { id: 'huile5', qte: 1 }, { id: 'sucre', qte: 2 }, { id: 'lait', qte: 1 }, { id: 'spaghetti', qte: 6 }, { id: 'savon', qte: 4 }, { id: 'tomate', qte: 4 }, { id: 'sardines', qte: 6 }] },
  { id: 'rentree', nom: 'Rentrée', articles: [{ id: 'cahiers', qte: 2 }, { id: 'stylos', qte: 2 }, { id: 'riz5', qte: 1 }, { id: 'lait', qte: 1 }, { id: 'sucre', qte: 2 }, { id: 'spaghetti', qte: 4 }, { id: 'savon', qte: 4 }, { id: 'sardines', qte: 4 }, { id: 'tomate', qte: 2 }] },
  { id: 'fetes', nom: 'Fêtes', articles: [{ id: 'riz5', qte: 2 }, { id: 'huile5', qte: 1 }, { id: 'sucre', qte: 3 }, { id: 'lait', qte: 2 }, { id: 'spaghetti', qte: 6 }, { id: 'sardines', qte: 8 }, { id: 'tomate', qte: 4 }, { id: 'cafe', qte: 1 }, { id: 'savon', qte: 4 }, { id: 'stylos', qte: 1 }] },
]
function familleDe(e: EtatDemo) {
  return e.famille ?? { destinataires: [], paniers: [] }
}
function majPanierFamille(id: string, f: (p: PanierFamille) => PanierFamille) {
  modifier((e) => ({ ...e, famille: { ...familleDe(e), paniers: familleDe(e).paniers.map((p) => (p.id === id ? f(p) : p)) } }))
}

// Prix du jour d'une ligne du panier : l'autre vendeur choisi, sinon la variante ; une vente flash en cours garde
// son prix.
function prixDuJour(l: LignePanier): number | null {
  const pr = CATALOGUE[l.p]
  if (!pr) return null
  if (l.flash && l.flash > maintenant()) return l.prix
  const autre = pr.autres.find((a) => a.boutique === l.boutique)
  if (autre) return autre.prix
  return (l.options ?? []).reduce((x, o) => o.prix?.[o.choisi] ?? x, pr.prix)
}
function changementsPanier(e: EtatDemo): ChangementPanier[] {
  return e.panier.lignes.flatMap((l): ChangementPanier[] => {
    const pr = CATALOGUE[l.p]
    const base = { id: l.id, titre: l.titre, variante: l.variante, dessin: l.dessin, avant: l.prix, qte: l.qte }
    if (!pr) return [{ ...base, type: 'retire' as const, apres: 0 }]
    if (pr.stock <= 0) return [{ ...base, type: 'pris' as const, apres: 0 }]
    const p = prixDuJour(l)!
    return p > l.prix ? [{ ...base, type: 'hausse' as const, apres: p }] : p < l.prix ? [{ ...base, type: 'baisse' as const, apres: p }] : []
  })
}

// Comptes du Cameroun joignables par leur code famille dans la démonstration (le code vient de l'application du
// proche : il prouve son accord). Le numéro d'Odile reçoit aussi les invitations.
// Démonstration (DP-54) : ce que chaque proche a réglé dans son compte (relais, livraison chez lui acceptée ou non,
// ville) et, pour Odile, le panier qu'elle envoie à payer dès que le lien existe.
type LigneDemande = { titre: string; dessin: string; qte: number; prix: number; boutique: string; classe: Classe }
const CODES_FAMILLE: Record<string, { prenom: string; relais: string; numero: string; domicile: boolean; ville: string; panier?: LigneDemande[]; mot?: string }> = {
  'FAM-4821': { prenom: 'Odile', relais: 'Relais Mvog-Ada', numero: '699000012', domicile: true, ville: 'Yaoundé', mot: 'Merci mon fils, c’est pour la rentrée des petits.', panier: [{ titre: 'Cartable scolaire 16″', dessin: 'bfb8686109b5', qte: 2, prix: 12500, boutique: 'Boutique C', classe: 'S' }, { titre: 'Riz parfumé 25 kg', dessin: '3499c5c0a9f4', qte: 1, prix: 18500, boutique: 'Boutique B', classe: 'L' }] },
  'FAM-7350': { prenom: 'Junior', relais: 'Relais Essos', numero: '677550033', domicile: false, ville: 'Yaoundé' },
}
// Invitations envoyées par un proche à l'étranger (vu du Cameroun) : le code de son lien d'invitation.
const INVITATIONS_DEMO: Record<string, { prenom: string; pays: string }> = {
  'INV-H7K2': { prenom: 'Hervé', pays: 'France' },
  'INV-M4PB': { prenom: 'Mireille', pays: 'Canada' },
}
// Âge révolu à une date (anniversaire non encore passé : un an de moins).
const ageLe = (nee: Date, t: number) => {
  const d = new Date(t)
  return d.getUTCFullYear() - nee.getUTCFullYear() - (d.getUTCMonth() < nee.getUTCMonth() || (d.getUTCMonth() === nee.getUTCMonth() && d.getUTCDate() < nee.getUTCDate()) ? 1 : 0)
}
const debutMois = (t: number) => Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), 1)

// Frais de livraison d'une liste de colis (le moteur du panier) : une sous-commande par boutique.
function fraisColis(mode: 'relais' | 'domicile', colis: ColisCommande[]) {
  const par = new Map<string, { boutique: string; zone: string; articles: { prix: number; quantite: number; classe: Classe }[] }>()
  for (const x of colis) {
    const sc = par.get(x.boutique) ?? { boutique: x.boutique, zone: BOUTIQUES[x.boutique]?.zone ?? x.boutique, articles: [] }
    sc.articles.push({ prix: x.prix, quantite: x.qte, classe: (CATALOGUE[x.p]?.classe as Classe) ?? 'S' })
    par.set(x.boutique, sc)
  }
  const f = calculer(mode, [...par.values()])
  const ram = f.ramassages.reduce((t, r) => t + r.montant, 0)
  const rem = f.remises.reduce((t, r) => t + r.montant, 0)
  return { total: f.total - f.sousTotal, ramassages: ram, remises: rem, offert: f.offert }
}
const NOMS_MOYEN: Record<string, string> = { mtn: 'MTN MoMo', orange: 'Orange Money', wallet: 'Portefeuille', carte: 'Carte', apple: 'Apple Pay', google: 'Google Pay', autre: 'Mobile Money' }
function payePar(ref: string): string {
  const p = lireEtat().passees.find((x) => x.ref === ref)
  if (p?.payeur) return `Carte de ${p.payeur.prenom} · ${p.payeur.carte}`
  if (p) return [NOMS_MOYEN[p.moyen], p.numero].filter(Boolean).join(' · ')
  return 'MTN MoMo · 6 77 ·· ·· 41'
}
// Remboursement d'un litige ou d'une annulation (REMB-DESTINATION, DP-17, DP-50) : payé par carte, sur la même
// carte (rien au portefeuille) ; sinon crédité au Portefeuille BelivaY dès la décision quand FF-WALLET est ouvert.
function crediterRemboursement(montant: number, libelle: string, moyen: string) {
  if (montant <= 0 || /^carte|visa|mastercard/i.test(moyen) || !session().interrupteurs['FF-WALLET']) return
  const le = maintenant()
  modifier((e) => ({
    ...e,
    portefeuille: {
      ...e.portefeuille,
      rembourse: e.portefeuille.rembourse + montant,
      historique: [{ id: 'rb-' + le + '-' + e.portefeuille.historique.length, type: 'remboursement' as const, libelle, le, montant }, ...e.portefeuille.historique],
    },
  }))
}
function majCommande(ref: string, f: (c: CommandeClient) => Partial<CommandeClient>) {
  const c = toutesCommandes().find((x) => x.ref === ref)
  if (!c) return
  modifier((e) => ({ ...e, commandesMaj: { ...(e.commandesMaj ?? {}), [ref]: { ...(e.commandesMaj?.[ref] ?? {}), ...f(c) } } }))
}
// Relais du jeu d'essai (12 quartiers servis au lancement ; distances depuis Mvog-Ada).
const RELAIS: Relais[] = [
  { nom: 'Relais Mvog-Ada', quartier: 'Mvog-Ada', gerant: 'Mme Ngo Bassong', km: 0.35, horaires: '8 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Essos', quartier: 'Essos', gerant: 'M. Atangana', km: 1.6, horaires: '8 h – 20 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Nlongkak', quartier: 'Nlongkak', gerant: 'Mme Fouda', km: 2.4, horaires: '7 h 30 – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Omnisport', quartier: 'Omnisport', gerant: 'M. Biya', km: 2.9, horaires: '8 h – 19 h', ferme: 'lundi', plein: true },
  { nom: 'Relais Mvan', quartier: 'Mvan', gerant: 'Mme Mbarga', km: 3.1, horaires: '8 h – 18 h 30', ferme: 'dimanche', plein: false },
  { nom: 'Relais Ngoa-Ekellé', quartier: 'Ngoa-Ekellé', gerant: 'M. Ondoa', km: 3.4, horaires: '8 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Melen', quartier: 'Melen', gerant: 'Mme Essomba', km: 3.8, horaires: '8 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Mokolo', quartier: 'Mokolo', gerant: 'M. Abena', km: 4.0, horaires: '7 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Bastos', quartier: 'Bastos', gerant: 'Mme Owona', km: 4.6, horaires: '9 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Biyem-Assi', quartier: 'Biyem-Assi', gerant: 'M. Nkodo', km: 5.3, horaires: '8 h – 19 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Emana', quartier: 'Emana', gerant: 'Mme Manga', km: 6.2, horaires: '8 h – 18 h', ferme: 'dimanche', plein: false },
  { nom: 'Relais Etoudi', quartier: 'Etoudi', gerant: 'M. Eto’o', km: 7.0, horaires: '8 h – 19 h', ferme: 'dimanche', plein: false },
]
// Avis du jeu d'essai : par produit (camon30, d'après le prototype), sinon par univers.
const AVIS_TEXTES: Record<string, [number, string][]> = {
  camon30: [
    [5, 'Retiré le jour même au relais, boîte scellée. L’écran est très lumineux et la batterie tient toute la journée.'],
    [4, 'Bon téléphone pour le prix. Les photos de nuit sont moyennes, le reste est très bien.'],
    [5, 'La couleur verte est encore plus belle en vrai. Chargeur rapide dans la boîte.'],
    [2, 'Le téléphone chauffe un peu en jeu. Le vendeur a répondu vite dans la messagerie.'],
    [5, 'Paiement MoMo validé en une minute, colis prêt le soir même.'],
  ],
  tel: [[5, 'Conforme à la description, boîte scellée.'], [4, 'Bonne autonomie, livraison rapide au relais.'], [3, 'Correct pour le prix.']],
  elec: [[5, 'Fonctionne parfaitement, bien emballé.'], [4, 'Bon produit, un peu bruyant au début.'], [2, 'Notice seulement en anglais.']],
  femme: [[5, 'Le tissu est beau et solide, taille conforme.'], [4, 'Jolie couleur, un peu long pour moi.'], [5, 'Retirée au relais sans attendre.']],
  homme: [[5, 'Très bonne qualité, je recommande.'], [4, 'Taille un peu juste, prendre au-dessus.']],
  chauss: [[5, 'Confortables dès le premier jour.'], [4, 'Pointure conforme, semelle solide.'], [3, 'Couleur un peu différente de la photo.']],
  defaut: [[5, 'Conforme, rien à redire.'], [4, 'Bon rapport qualité-prix.'], [3, 'Correct.']],
}
// Distance d'un produit (DP-54) : du relais du client (habituel, sinon le premier proposé) au point d'expédition
// de chaque offre, géodésique (CAL-04), à chaque lecture : elle suit le changement de relais. Le relais est au
// centre de son quartier ; le point d'expédition d'une boutique est, dans ce jeu d'essai, un point fixe de sa zone
// (entre 250 et 750 m du centre, tiré de son nom) ; le serveur a la vraie position, qui ne sort jamais (CMC-49).
function pointExpedition(boutique: string, zone: string): Point | null {
  const c = centre(zone)
  if (!c) return null
  const h = [...(boutique + '|' + zone)].reduce((n, x) => (n * 31 + x.charCodeAt(0)) >>> 0, 7)
  const angle = ((h % 360) * Math.PI) / 180
  const metres = 250 + ((h >>> 9) % 500)
  return { lat: c.lat + (metres * Math.cos(angle)) / 111320, lon: c.lon + (metres * Math.sin(angle)) / (111320 * Math.cos((c.lat * Math.PI) / 180)) }
}
// Compte diaspora : le relais de son proche actif (les distances sont celles de la personne qui reçoit).
const relaisDeReference = (e: EtatDemo): string | null => (e.diaspora ? (lienActif(e)?.relais ?? null) : (e.relais?.nom ?? null))
function relaisDuClient(e: EtatDemo): Relais {
  return RELAIS.find((r) => r.nom === relaisDeReference(e)) ?? RELAIS[0]
}
function avecDistance(pr: Produit, e: EtatDemo = lireEtat()): Produit {
  const r = relaisDuClient(e)
  const depart = centre(r.quartier)
  // Une boutique connue expédie depuis sa zone (celle des frais du panier) ; sinon, la zone de l'offre.
  const offre = <T extends { boutique: string; zone: string; km: number }>(o: T): T => {
    const zone = BOUTIQUES[o.boutique]?.zone ?? o.zone
    return { ...o, zone, km: kmEntre(depart, pointExpedition(o.boutique, zone)) ?? o.km }
  }
  const vendeur = offre(pr.vendeur)
  return { ...pr, distance: texteKm(vendeur.km), relaisDistance: r.nom, vendeur, autres: pr.autres.map(offre) }
}
// Boutiques du jeu d'essai (une boutique = un colis) : zone de ramassage, délai, palier, articles à ajouter.
const BOUTIQUES: DonneesPanier['boutiques'] = {
  'Boutique A': { zone: 'Mvog-Ada', delai: '4\u00A0h', palier: 'Vendeur certifié Or · Trust Score 91', suggestions: [
    { p: 'tablette8', titre: 'Tablette 8″ · 64 Go', dessin: '6d95c1664bef', prix: 64000 },
    { p: 'galaxya15', titre: 'Samsung Galaxy A15 · 128 Go', dessin: '20344e766a88', prix: 89900 },
  ] },
  'Boutique B': { zone: 'Mvog-Ada', delai: '4\u00A0h', palier: 'Vendeur certifié Argent · Trust Score 78', suggestions: [] },
  'Boutique C': { zone: 'Mvan', delai: '6\u00A0h', palier: 'Vendeur certifié Bronze · Trust Score 64', suggestions: [] },
  'Boutique D': { zone: 'Mvog-Ada', delai: '4\u00A0h', palier: 'Vendeur certifié Argent · Trust Score 80', suggestions: [] },
  'Boutique E': { zone: 'Essos', delai: '5\u00A0h', palier: 'Vendeur certifié Argent · Trust Score 88', suggestions: [] },
  'Boutique F': { zone: 'Mokolo', delai: '6\u00A0h', palier: 'Vendeur certifié Or · Trust Score 94', suggestions: [] },
  'Boutique G': { zone: 'Mvan', delai: '6\u00A0h', palier: 'Vendeur certifié Bronze · Trust Score 79', suggestions: [] },
}
// Commandes où un litige peut s'ouvrir (jeu d'essai) : colis, montant bloqué, fenêtre de retour (DP-10).
const COMMANDES_LITIGE: Record<string, CommandeLitige> = {
  'BLV-51702': {
    ref: 'BLV-51702',
    colis: [{ n: 1, produit: 'Écouteurs sans fil · blanc', dessin: '2b5bcef070f6', detail: '+ Chargeur rapide 33\u00A0W USB-C · retiré le sam. 19 sept. à 11\u00A0h\u00A032', montant: 23000 }],
    fenetre: 'ouverte',
    finCachee: '',
    payePar: 'MTN MoMo 6 77 ·· ·· 41',
  },
  'BLV-52018': {
    ref: 'BLV-52018',
    colis: [
      { n: 1, produit: 'Pagne wax 6 yards · motif soleil orange', dessin: 'bf4e892644c3', detail: 'retiré aujourd’hui à 10\u00A0h\u00A032', montant: 18500 },
      { n: 2, produit: 'Sandales cuir femme · pointure 39', dessin: 'd904fc29309b', detail: 'retiré aujourd’hui à 10\u00A0h\u00A032', montant: 14500 },
    ],
    fenetre: 'ouverte',
    finCachee: '',
    payePar: 'MTN MoMo 6 77 ·· ·· 41',
  },
  'BLV-51388': {
    ref: 'BLV-51388',
    colis: [{ n: 1, produit: 'Beurre de karité pur 500\u00A0g\u00A0×\u00A02', dessin: '603cb36e1d48', detail: 'retiré le ven. 28 août', montant: 7800 }],
    fenetre: 'cachee',
    finCachee: 'dim. 6 déc.',
    payePar: 'Orange Money 6 55 ·· ·· 08',
  },
}
// Une connexion de plus au journal, sur cet appareil.
const noterConnexion = (e: EtatDemo, methode: MethodeConnexion): EtatDemo => {
  const le = maintenant()
  const cet = e.securite.appareils.find((a) => a.actuel) ?? { id: 'cet', nom: 'Tecno Spark 20 · application', lieu: 'Yaoundé', derniere: le, actuel: true }
  return {
    ...e,
    securite: {
      ...e.securite,
      appareils: [{ ...cet, derniere: le }, ...e.securite.appareils.filter((a) => !a.actuel)],
      historique: [{ le, methode, appareil: cet.nom, lieu: cet.lieu }, ...e.securite.historique].slice(0, 20),
    },
  }
}
const jourYaounde = (ms: number) => new Date(ms + H).toISOString().slice(0, 10)
const moisYaounde = (ms: number) => jourYaounde(ms).slice(0, 7)
// Après un changement de numéro, les retraits attendent WALLET-NUMERO-ATTENTE (CWL-08).
const attenteNumero = (e: EtatDemo, maintenant: number) => !!e.changementNumero?.le && maintenant < e.changementNumero.le + PF.attenteNumeroH * H
function retirable(e: EtatDemo, maintenant: number): number {
  if (attenteNumero(e, maintenant)) return 0
  return e.portefeuille.rembourse + e.portefeuille.recharges.reduce((n, r) => n + (r.aServi || maintenant >= r.le + PF.attenteRechargeH * H ? r.restant : 0), 0)
}
function fraisDe(e: EtatDemo, montant: number, maintenant: number): number {
  const partRechargee = Math.max(montant - e.portefeuille.rembourse, 0)
  const deja = e.portefeuille.retraits.filter((r) => r.partRechargee > 0 && moisYaounde(r.le) === moisYaounde(maintenant)).length
  return partRechargee > 0 && deja >= PF.gratuitsParMois ? Math.max(Math.round((partRechargee * PF.fraisPourCent) / 100), PF.fraisMin) : 0
}
const libelleMoMo = (op: string) => (op === 'Orange' ? 'Orange Money' : 'MTN MoMo')

// Messagerie : numéros, e-mails et liens retirés d'un message avant l'envoi (CMS-05 ; anti-contournement).
const MASQUES: [Masque, RegExp][] = [
  ['email', /[\w.+-]+@[\w-]+\.[\w.-]+/g],
  ['lien', /\b(?:https?:\/\/|www\.)\S+|\bwa\.me\/\S+|(?:^|\s)@[\w.]{3,}/g],
  ['numero', /\+?\d[\d\s.\u00A0-]{6,}\d/g],
]
function masquer(texte: string): { texte: string; masques: Masque[] } {
  const masques: Masque[] = []
  let v = texte
  for (const [m, re] of MASQUES)
    v = v.replace(re, (x) => {
      masques.push(m)
      return (x.startsWith(' ') ? ' ' : '') + `{{${m}}}`
    })
  return { texte: v, masques: [...new Set(masques)] }
}
const NOMS_MASQUES: Record<Masque, string> = { numero: 'Un numéro a été retiré', email: 'Une adresse e-mail a été retirée', lien: 'Un lien a été retiré' }
const nonLusDe = (e: EtatDemo) => e.conversations.filter((c) => c.visible).reduce((n, c) => n + c.nonLus, 0)

// Rentrée (CL-15 ; EX-01) : la liste choisie, recalculée depuis zéro, puis sa commande groupée (un colis par boutique).
const RENTREE_LE = Date.UTC(2026, 10, 2, 6, 30)
function totalListe(id: string, exclus: string[], equivalents: string[]) {
  const l = LISTES_RENTREE.find((x) => x.id === id)!
  const pris = l.articles.filter((a) => !exclus.includes(a.id)).map((a) => ({ ...a, prixUnitaire: equivalents.includes(a.id) && a.equivalent ? a.equivalent.prixUnitaire : a.prixUnitaire }))
  const boutiques = [...new Set(pris.map((a) => a.boutique))]
  const sc = boutiques.map((b) => ({ boutique: b, zone: pris.find((a) => a.boutique === b)!.zone, articles: pris.filter((a) => a.boutique === b).map((a) => ({ prix: a.prixUnitaire * a.qte, quantite: 1, classe: 'S' as Classe })) }))
  return { l, pris, boutiques, f: calculer('relais', sc) }
}
function commanderListe(id: string, exclus: string[], equivalents: string[], moyen: string): string {
  const e = lireEtat()
  const { l, pris, boutiques, f } = totalListe(id, exclus, equivalents)
  const t = maintenant()
  const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52400 + i))
  const ref = nums.find((x) => !e.passees.some((y) => y.ref === x))!
  const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: e.relais?.nom ?? 'Relais Mvog-Ada', moyen: 'mtn', numero: moyen, comptoir: false, articles: pris.reduce((n, a) => n + a.qte, 0), colis: boutiques.length, sousTotal: f.sousTotal, livraison: f.total - f.sousTotal, frais: 0, montant: f.total, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: boutiques.map((b) => ({ titre: `Liste ${l.classe} · ${pris.filter((a) => a.boutique === b).length} articles`, dessin: '', qte: 1, prix: pris.filter((a) => a.boutique === b).reduce((n, a) => n + a.prixUnitaire * a.qte, 0), boutique: b })) }
  modifier((x) => ({ ...x, passees: [commande, ...x.passees], rentree: { ...(x.rentree ?? { papier: [], publiees: [], commande: null }), commande: ref } }))
  return ref
}

// Échanges entre clients (DP-54 ; règle donnees/echanges.ts). Les listes de deux proches (démonstration : leurs
// comptes ne sont pas sur cet appareil) ; les cadeaux faits dessus sont gardés dans offertsProches.
const LISTES_PROCHES: { code: string; proche: string; prenom: string; nom: string; relais: string; mode: 'fil' | 'groupe'; remiseLe: number | null; jusqua: number; partageLe: number; articles: string[]; offerts: Record<string, { par: string; le: number; ref: string }>; domicile?: string; occasion?: OccasionListe; hotes?: string[]; cagnotte?: { titre: string; objectif: number; reuni: number; participants: number } }[] = [
  { code: 'm3Rq8z', proche: 'pr-mireille', prenom: 'Mireille', nom: 'Mon anniversaire', relais: 'Relais Essos', mode: 'groupe', remiseLe: Date.UTC(2026, 9, 12, 17, 0), jusqua: Date.UTC(2026, 9, 20, 22, 59), partageLe: Date.UTC(2026, 8, 19, 9, 0), articles: ['montre', 'pagne', 'cafe', 'karite'], offerts: { pagne: { par: 'Nadège', le: Date.UTC(2026, 8, 21, 10, 0), ref: 'BLV-52070' } } },
  { code: 'mR7aGe', proche: 'pr-mireille', prenom: 'Mireille', nom: 'Mariage de Mireille & Paul', relais: 'Relais Essos', mode: 'groupe', remiseLe: Date.UTC(2026, 9, 17, 14, 0), jusqua: Date.UTC(2026, 9, 31, 22, 59), partageLe: Date.UTC(2026, 8, 22, 19, 0), articles: ['marmite', 'mixeur', 'fer', 'ventilo'], offerts: { fer: { par: 'Nadège', le: Date.UTC(2026, 8, 23, 9, 0), ref: 'BLV-52075' } }, occasion: 'mariage', hotes: ['Mireille', 'Paul'], cagnotte: { titre: 'Voyage de noces', objectif: 300000, reuni: 85000, participants: 6 } },
  { code: 'n8Lk2w', proche: 'pr-nadege', prenom: 'Nadège', nom: 'Naissance de Léa', relais: 'Relais Bastos', mode: 'fil', remiseLe: null, jusqua: Date.UTC(2026, 9, 25, 22, 59), partageLe: Date.UTC(2026, 8, 22, 9, 0), articles: ['portebebe', 'coco', 'ballon'], offerts: {}, domicile: 'Yaoundé' },
]
// Annuaire de la démonstration : les numéros des comptes BelivaY que l'on peut trouver.
const ANNUAIRE: Record<string, { id: string; prenom: string; quartier: string }> = {
  '699451212': { id: 'pr-paul', prenom: 'Paul', quartier: 'Mvog-Ada' },
  '677235858': { id: 'pr-mireille', prenom: 'Mireille', quartier: 'Essos' },
  '655810707': { id: 'pr-nadege', prenom: 'Nadège', quartier: 'Bastos' },
  '690224433': { id: 'pr-aline', prenom: 'Aline', quartier: 'Nlongkak' },
  '678904455': { id: 'pr-joel', prenom: 'Joël', quartier: 'Mvan' },
}
// La cotisation d'un article de liste (la plus récente) : ce qui est réuni, l'objectif.
function cotisationArticle(e: EtatDemo, code: string | null | undefined, p: string): Cotisation | null {
  if (!code) return null
  return cotisationsDe(e).find((c) => c.liste?.code === code && c.liste.p === p) ?? null
}
// Offert par une cotisation atteinte : les prénoms visibles des participants.
function offertParCotisation(c: Cotisation | null): ArticleListe['offert'] {
  if (!c || c.etat !== 'atteinte' || !c.ref) return null
  const noms = c.participations.filter((x) => !x.discret).map((x) => x.prenom)
  const par = noms.length ? (noms.length > 2 ? `${noms.slice(0, 2).join(', ')} +${c.participations.length - 2}` : noms.join(' et ')) : 'plusieurs proches'
  return { par, le: c.fin ?? c.creeLe, ref: c.ref, qui: c.qui ?? 'payeur' }
}
const infoCotisation = (c: Cotisation | null) => (c && c.etat !== 'echue' && c.etat !== 'remboursee' ? { code: c.code, reuni: reuni(c), objectif: c.objectif } : null)
function listeProche(e: EtatDemo, code: string): ListePublique | null {
  const l = LISTES_PROCHES.find((x) => x.code === code)
  if (!l || l.jusqua < maintenant()) return null
  const faits = { ...l.offerts, ...(e.offertsProches?.[code] ?? {}) }
  const articles = l.articles
    .map((p) => {
      const a = articleListe(p)
      if (!a) return null
      const cot = cotisationArticle(e, code, p)
      return { ...a, prixPartage: a.prix, offert: !!faits[p] || !!offertParCotisation(cot), cotisation: infoCotisation(cot) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
  const parts = e.cagnottesProches?.[code] ?? []
  const cagnotte = l.cagnotte ? { titre: l.cagnotte.titre, objectif: l.cagnotte.objectif, reuni: l.cagnotte.reuni + parts.reduce((n, p) => n + p.montant, 0), participants: l.cagnotte.participants + parts.length } : null
  return { code, prenom: l.prenom, nom: l.nom, quartier: l.relais.replace(/^Relais /, ''), relais: l.relais, mode: l.mode, remiseLe: l.remiseLe, jusqua: l.jusqua, destination: 'moi', partageLe: l.partageLe, articles, domicile: l.domicile && l.mode === 'fil' ? { ville: l.domicile } : null, occasion: l.occasion ?? null, hotes: l.hotes ?? [], cagnotte }
}
// Livraison chez le propriétaire d'une liste (au fil de l'eau seulement) : il l'a acceptée et a une adresse servie
// (sa liste), ou le proche désigné l'accepte (lien famille d'un compte diaspora). Seule la ville est donnée.
function domicileListe(e: EtatDemo, l: ListeEnvies): { ville: string } | null {
  if (!l.domicile || l.mode !== 'fil' || l.destination === 'offrant') return null
  if (l.destination === 'moi') return e.adresses.some((a) => a.zoneServie) ? { ville: 'Yaoundé' } : null
  const lien = (e.liens ?? []).find((x) => x.etat === 'actif' && x.prenom === l.tiers?.prenom)
  return lien?.domicile ? { ville: lien.ville ?? 'Yaoundé' } : null
}
// Une liste ou une cotisation envoyée à un proche qui a un compte sur l'appareil : elle arrive dans ses Reçus
// (src/demo/reseau.ts), avec ce qu'il faut pour offrir ou participer sans ouvrir de lien.
async function envoyerObjet(type: 'liste' | 'cotisation', id: string, cle: string, prenom: string) {
  const e = lireEtat()
  if (type === 'liste') {
    const l0 = listesDe(e).find((x) => x.id === id)
    if (!l0) return
    const l = l0.partage ? l0 : await sourceDemo.partagerListe(id)
    const lignes: LigneEnvoi[] = l.articles.map((a) => ({ p: a.p, titre: a.titre, dessin: a.dessin, qte: 1, prix: a.prix, livraison: a.livraison, offertPar: a.offert?.par ?? null }))
    const reuni = (l.cagnotte?.participations ?? []).reduce((n, p) => n + p.montant, 0)
    await sourceDemo.envoyerRecu({ type: 'liste', a: cle, prenom, titre: l.nom, occasion: l.occasion ?? null, hotes: l.hotes ?? [], date: l.remiseLe, lieu: l.relais, lignes, code: l.partage!.code, jusqua: l.partage!.jusqua, cagnotte: l.cagnotte ? { titre: l.cagnotte.titre, objectif: l.cagnotte.objectif, reuni } : null })
  } else {
    const c = cotisationsDe(e).find((x) => x.id === id)
    if (!c) return
    await sourceDemo.envoyerRecu({ type: 'cotisation', a: cle, prenom, titre: c.nom, lieu: c.relais, objectif: c.objectif, code: c.code, jusqua: c.jusqua, lignes: [{ p: c.p, titre: c.titre, dessin: c.dessin, qte: 1, prix: c.prixLivre, livraison: 0, offertPar: null }] })
  }
}
function nouvelleRef(e: EtatDemo, depart: number) {
  const nums = Array.from({ length: 400 }, (_, i) => 'BLV-' + (depart + i))
  return nums.find((r) => !e.passees.some((x) => x.ref === r) && !(e.colisEchange ?? []).some((x) => x.ref === r))!
}
function ajouterColis(c: Omit<ColisEchange, 'id' | 'expedie' | 'joursGarde' | 'retenue' | 'rembourse'>) {
  modifier((x) => ({ ...x, colisEchange: [{ ...c, id: 'CE-' + (20 + (x.colisEchange ?? []).length), expedie: false, joursGarde: 0, retenue: null, rembourse: null }, ...(x.colisEchange ?? [])] }))
}

// Notifications du compte (jeu d'essai, commandes passées sur l'appareil, échanges entre proches), lues ou non.
function notificationsDe(e: EtatDemo): NotificationClient[] {
  const lues = new Set(e.notifsLues ?? [])
  // Les commandes passées sur l'appareil ajoutent leur confirmation de paiement.
  const passees: NotificationClient[] = e.passees
    .filter((c) => c.etat === 'payee')
    .map((c) => ({ id: 'p-' + c.ref, type: 'Paiement', titre: `Paiement protégé · ${c.ref}`, texte: `${F(c.montant)} F. Ton argent reste bloqué jusqu’à ton retrait.`, le: c.le, lu: false, lien: '/commande?ref=' + c.ref, sms: false }))
  // Échanges entre proches reliés (DP-54), des deux côtés : panier reçu ou envoyé à payer, sa réponse ; commande
  // payée pour un proche (suivi sans code ni adresse).
  const proches: NotificationClient[] = [
    ...(e.demandes ?? []).flatMap((d): NotificationClient[] =>
      d.sens === 'recue'
        ? [{ id: 'dp-' + d.id, type: 'Paiement', titre: `${d.prenom} t’a envoyé son panier à payer`, texte: `${d.lignes.reduce((n, x) => n + x.qte, 0)} article(s) · ${F(d.sousTotal)} F d’articles${d.mot ? ' · « ' + d.mot + ' »' : ''}`, le: d.creeLe, lu: d.etat !== 'attente', lien: '/paniers-proches?id=' + d.id, sms: false }]
        : d.etat === 'payee'
          ? [{ id: 'dpp-' + d.id, type: 'Paiement', titre: `${d.prenom} a payé ton panier`, texte: `Commande ${d.ref} · ton code de retrait arrive quand le colis est prêt.`, le: d.payeeLe ?? d.creeLe, lu: false, lien: '/commande?ref=' + d.ref, sms: true }]
          : d.etat === 'refusee'
            ? [{ id: 'dpr-' + d.id, type: 'Paiement', titre: `${d.prenom} n’a pas payé ton panier`, texte: d.motRefus ? `« ${d.motRefus} »` : 'Ton panier reste dans ton application.', le: d.creeLe, lu: false, lien: '/diaspora', sms: false }]
            : [],
    ),
    ...(e.diaspora ? (e.liens ?? []) : []).flatMap((l) => l.commandes.map((c): NotificationClient => ({ id: 'cp-' + c.ref, type: 'Suivi', titre: `Commande pour ${l.prenom} · ${c.ref}`, texte: c.retireLe ? `${l.prenom} l’a reçue : preuve de remise disponible.` : `Payée · ${F(c.montant)} F. ${l.prenom} reçoit son code ; tu suis les étapes.`, le: c.le, lu: false, lien: '/commander-pour?suivi=' + c.ref, sms: false }))),
    // Vu du compte diaspora, l'arrivée se dit pour le proche : « Le colis de Odile est arrivé à son relais (Mvog-Ada) ».
    ...(e.diaspora ? (e.liens ?? []) : []).flatMap((l) => l.commandes.filter((c) => c.pretLe && c.pretLe <= maintenant() && !c.retireLe && !c.rembourse).map((c): NotificationClient => ({ id: 'cpa-' + c.ref, type: 'Suivi', titre: c.livraison === 'domicile' ? `Le colis de ${l.prenom} part en livraison chez ${l.prenom}` : `Le colis de ${l.prenom} est arrivé à son relais${l.relais ? ' (' + l.relais.replace(/^Relais /, '') + ')' : ''}`, texte: `${l.prenom} a reçu son code par SMS ; tu verras la preuve de ${c.livraison === 'domicile' ? 'remise' : 'retrait'}.`, le: c.pretLe!, lu: false, lien: '/commander-pour?suivi=' + c.ref, sms: false }))),
  ]
  const toutes = [...passees, ...proches, ...notificationsRecus(e), ...(e.jeuEssai === false ? [] : NOTIFICATIONS)].map((n) => ({ ...n, lu: n.lu || lues.has(n.id) }))
  return toutes.sort((a, b) => b.le - a.le)
}

// Compteurs du menu du compte et de l'en-tête : lus dans l'état du compte, comme la page Mon compte (jamais des
// nombres figés). Un visiteur n'en a aucun.
const LITIGE_EN_COURS = new Set(['attente', 'conteste', 'silence', 'examen', 'arrangement'])
function compteursMenu(e: EtatDemo): Pick<DonneesMenu, 'commandes' | 'sauvegardesSuivis' | 'litiges' | 'messagesNonLus' | 'notificationsNouvelles' | 'recusATraiter'> {
  if (!e.connecte) return { commandes: { aRetirer: 0, enPreparation: 0, badge: 0 }, sauvegardesSuivis: 0, litiges: { enCours: 0, badge: 0 }, messagesNonLus: 0, notificationsNouvelles: 0, recusATraiter: 0 }
  const cs = toutesCommandes()
  return {
    commandes: { aRetirer: cs.filter((c) => c.etat === 'retirable' || c.etat === 'comptoir').length, enPreparation: cs.filter((c) => c.etat === 'preparation').length, badge: e.compteurs.commandes },
    sauvegardesSuivis: e.compteurs.sauvegardes,
    litiges: { enCours: e.litiges.filter((l) => LITIGE_EN_COURS.has(l.etat)).length, badge: e.compteurs.litiges },
    messagesNonLus: nonLusDe(e),
    notificationsNouvelles: notificationsDe(e).filter((n) => !n.lu).length,
    recusATraiter: recusATraiter(e),
  }
}

export const sourceDemo: Source = {
  nom: 'démonstration',
  session: async () => session(),
  menu: async () => {
    const e = lireEtat()
    return { ...MENU, ...compteursMenu(e), portefeuille: { solde: solde(e), cagnotteEnAttente: cagnotteAttente(e) } }
  },
  // En-têtes du prototype, données du jeu d'essai comprises (relevés par outils/prototype.mjs).
  entete: async (route) => (navigation as Record<string, { prototype: EnteteDonnees }>)[route]?.prototype ?? null,
  compte: async (scenario): Promise<DonneesCompte> => {
    const e: EtatDemo = scenario === 'nouveau' ? ETAT_NOUVEAU : lireEtat()
    const principale = e.adresses.find((a) => a.principale) ?? e.adresses[0]
    return {
      boutique: e.boutique && { nom: e.boutique.nom, piece: e.boutique.piece },
      numeroVerifie: e.profil.numeroVerifie,
      compteurs: { ...e.compteurs, factures: e.factures.factures.length, messagesNonLus: nonLusDe(e) },
      portefeuille: { solde: solde(e), cagnotteEnAttente: cagnotteAttente(e) },
      palier: e.palier,
      relais: e.relais,
      // « Maison · Mvog-Ada, carrefour Emana » : le quartier et le premier repère.
      adressePrincipale: principale ? { nom: principale.nom, reperes: principale.quartier + ', ' + principale.reperes.split(',')[0] } : null,
      moyens: e.moyens.map((m) => ({ operateur: m.operateur, parDefaut: m.parDefaut })),
      avisADonner: e.avisADonner,
    }
  },
  // Déconnexion : le compte reste sur le serveur ; l'appareil revient en visiteur (CAC-29), panier gardé.
  deconnecter: async () => {
    modifier((e) => ({ ...e, connecte: false }))
  },
  connecter: async (methode) => {
    // Après une suppression, se connecter crée un nouveau compte (nom et e-mail donnés par Google ou Apple).
    modifier((e) =>
      noterConnexion(
        e.supprime
          ? { ...ETAT_NOUVEAU, connecte: true, motDePasse: '', securite: { ...ETAT_NOUVEAU.securite, google: methode === 'google' ? ETAT_NOUVEAU.profil.email : null, apple: methode === 'apple' ? ETAT_NOUVEAU.profil.email : null }, profil: { ...ETAT_NOUVEAU.profil, connexion: methode } }
          : { ...e, connecte: true, profil: { ...e.profil, connexion: methode } },
        methode,
      ),
    )
    return session()
  },
  compteConnu: async () => {
    if (lireEtat().supprime) return null
    const p = lireEtat().profil
    return { prenom: p.prenom, nomComplet: [p.prenom, p.nom].filter(Boolean).join(' '), emailMasque: masquerEmail(p.email) }
  },
  compteRetenu: async () => {
    const e = lireEtat()
    return e.retenu && !e.supprime ? { emailMasque: masquerEmail(e.profil.email) } : null
  },
  reprendreCompte: async () => {
    modifier((e) => noterConnexion({ ...e, connecte: true, profil: { ...e.profil, connexion: 'email' } }, 'email'))
    return session()
  },
  connecterEmail: async (email, motDePasse, seSouvenir) => {
    const e = lireEtat()
    const objet = 'connexion'
    // Un autre compte déjà ouvert sur cet appareil (Reçus, DP-54) : on le retrouve tel qu'il était.
    const autre = email ? compteGarde(email) : null
    const bon = autre ? autre.motDePasse || null : !e.supprime && (email ?? e.profil.email).trim().toLowerCase() === e.profil.email.toLowerCase() ? e.motDePasse : null
    const r = verifier(objet, motDePasse, bon ?? '\u0000')
    if (!r.ok) return 'bloqueJusqua' in r ? { ok: false, raison: 'bloque', jusqua: r.bloqueJusqua } : { ok: false, raison: 'incorrect', essaisRestants: r.essaisRestants }
    if (autre) rouvrirCompte(email!)
    modifier((x) => noterConnexion({ ...x, connecte: true, retenu: seSouvenir, profil: { ...x.profil, connexion: 'email' } }, 'email'))
    return { ok: true, session: session() }
  },
  inscrire: async (i, seSouvenir) => {
    const e = lireEtat()
    const email = (i.email ?? e.profil.email).trim().toLowerCase()
    if (!i.prenom.trim() || i.prenom.trim().length > 40) return { ok: false, raison: 'prenom' }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, raison: 'email' }
    if (!e.supprime && email === e.profil.email.toLowerCase()) return { ok: false, raison: 'existe' }
    if (i.motDePasse.length < 8 || !/\d/.test(i.motDePasse)) return { ok: false, raison: 'mdp' }
    // Nouveau compte : rien encore (numéro à vérifier avant la première commande, CIN-31). Le compte qui était
    // ouvert reste sur l'appareil (Reçus : on s'y reconnecte par e-mail).
    garderCompte(e)
    ecrireEtat(
      noterConnexion(
        {
          ...ETAT_NOUVEAU,
          connecte: true,
          retenu: seSouvenir,
          motDePasse: i.motDePasse,
          securite: { ...ETAT_NOUVEAU.securite, google: null, apple: null, biometrie: false },
          profil: { ...ETAT_NOUVEAU.profil, prenom: i.prenom.trim(), nom: '', email, connexion: 'email' },
        },
        'email',
      ),
    )
    return { ok: true, session: session() }
  },
  // Même réponse, que l'adresse ait un compte ou non (on ne révèle pas qui est inscrit).
  demanderLienMdp: async (email) => ({ destination: masquerEmail((email ?? lireEtat().profil.email).trim()), valideMinutes: 30 }),
  // Démonstration du lien reçu par e-mail : un jeton qui commence par « exp » est périmé (plus de 30 min) ; un jeton
  // mal formé ou déjà servi est invalide (usage unique). Succès : les autres appareils sont déconnectés.
  nouveauMotDePasse: async (jeton, mdp) => {
    const j = jeton.trim()
    if (!/^[A-Za-z0-9_-]{8,}$/.test(j) || jetonsMdpServis.has(j)) return { ok: false, raison: 'invalide' }
    if (/^exp/i.test(j)) return { ok: false, raison: 'expire' }
    if (mdp.length < 8 || !/\d/.test(mdp)) return { ok: false, raison: 'regle' }
    jetonsMdpServis.add(j)
    modifier((x) => ({ ...x, motDePasse: mdp, securite: { ...x.securite, appareils: x.securite.appareils.filter((a) => a.actuel) } }))
    return { ok: true, email: masquerEmail(lireEtat().profil.email) }
  },
  avis: async (ref) => {
    const e = lireEtat()
    const commande = e.aNoter.find((c) => c.ref === ref)
    return commande ? { commande, fenetreJours: 7, maintenant: maintenant(), prenom: e.profil.prenom } : null
  },
  // Le serveur refuse hors de la fenêtre, ou avant le retrait (seuls ceux qui ont payé et retiré notent).
  envoyerAvis: async (ref, avis) => {
    const e = lireEtat()
    const c = e.aNoter.find((x) => x.ref === ref)
    if (!c || !c.retireeLe) return { ok: false, raison: 'non_retiree' }
    if (maintenant() > c.retireeLe + 7 * 24 * H) return { ok: false, raison: 'ferme' }
    modifier((x) => ({
      ...x,
      aNoter: x.aNoter.map((y) => (y.ref === ref ? { ...y, avis: { ...avis, envoyeLe: maintenant() } } : y)),
      avisADonner: x.avisADonner.filter((a) => a.ref !== ref),
    }))
    return { ok: true }
  },
  conversations: async () => {
    const e = lireEtat()
    return { conversations: e.conversations.filter((c) => c.visible), maintenant: maintenant(), commandesEnCours: ['BLV-52018', 'BLV-52107', 'BLV-51940'] }
  },
  // Ouvrir une conversation la marque lue (badge de la messagerie, compte).
  conversation: async (id) => {
    const e = modifier((x) => ({ ...x, conversations: x.conversations.map((c) => (c.id === id ? { ...c, nonLus: 0 } : c)) }))
    // Un dossier s'ouvre par son adresse même s'il n'est pas encore listé (lien d'une notification).
    const c = e.conversations.find((x) => x.id === id)
    return c ? { conversation: c, maintenant: maintenant() } : null
  },
  envoyerMessage: async (id, m) => {
    const le = maintenant()
    const { texte, masques } = masquer(m.texte?.trim() ?? '')
    modifier((e) => ({
      ...e,
      // La conversation où l'on écrit remonte en tête de la messagerie.
      conversations: [...e.conversations.filter((c) => c.id === id), ...e.conversations.filter((c) => c.id !== id)].map((c) => {
        if (c.id !== id) return c
        const ajout: Message[] = []
        if (m.photo)
          ajout.push(
            { de: 'photo', le, photo: m.photo },
            ...(c.type === 'dossier' ? [{ de: 'systeme' as const, le, texte: `check||Photo prise dans l’application et versée au dossier ${c.id}.` }] : []),
          )
        if (texte) ajout.push({ de: 'moi', le, texte })
        for (const x of masques)
          ajout.push({ de: 'systeme', le, texte: `eye-off||${NOMS_MASQUES[x]} de ce message avant l’envoi.${c.type === 'vendeur' ? ' Le vendeur répond ici.' : ''}` })
        // Le support répond sous 2 h, de 7 h à 21 h (DP-12) : la conversation rouverte le dit (aucune fausse réponse).
        if (c.type === 'support' && texte)
          ajout.push({ de: 'systeme', le, texte: 'headset||Message envoyé. Une personne te répond ici sous 2\u00A0h, de 7\u00A0h à 21\u00A0h, 7\u00A0jours sur 7.' })
        const apercu = texte ? `Toi\u00A0: «\u00A0${texte.replace(/\{\{\w+\}\}/g, 'masqué')}\u00A0»` : 'Toi\u00A0: photo envoyée'
        return { ...c, resolue: c.type === 'support' ? false : c.resolue, apercu, messages: [...c.messages, ...ajout] }
      }),
    }))
    return { masques }
  },
  litiges: async () => ({ litiges: lireEtat().litiges, maintenant: maintenant() }),
  litige: async (id) => {
    const l = lireEtat().litiges.find((x) => x.id === id)
    return l ? { litige: l, maintenant: maintenant() } : null
  },
  commandeLitige: async (ref) => COMMANDES_LITIGE[ref] ?? null,
  ouvrirLitige: async (n) => {
    // Un constat au comptoir peut viser une commande pas encore retirée : on part alors de la commande.
    const cc = toutesCommandes().find((x) => x.ref === n.ref)
    const c = COMMANDES_LITIGE[n.ref] ?? { colis: (cc?.colis ?? []).map((x) => ({ n: x.n, produit: x.produit, dessin: x.dessin, detail: '', montant: x.prix * x.qte })) }
    const colis = c.colis.find((x) => x.n === n.colis) ?? c.colis[0]
    const e = lireEtat()
    const nums = ['LIT-3044', ...Array.from({ length: 50 }, (_, i) => 'LIT-' + (3045 + i))]
    const id = nums.find((x) => !e.litiges.some((l) => l.id === x))!
    const le = maintenant()
    const litige: Litige = {
      id,
      ref: n.ref,
      colis: colis.n,
      produit: colis.produit,
      dessin: colis.dessin,
      pb: n.pb,
      probleme: { jamais: 'Jamais reçu', abime: 'Abîmé', 'pas-commande': 'Pas ce que j’ai commandé', manque: 'Il manque quelque chose', autre: 'Autre chose' }[n.pb],
      description: n.description.trim(),
      souhait: n.souhait,
      montant: colis.montant,
      ouvertLe: le,
      echeance: le + 48 * H,
      etat: n.souhait === 'signal' ? 'signal' : 'attente',
      preuves: n.photos.map((photo, i) => ({ titre: 'Ta photo ' + (i + 1), sous: 'versée au dossier', photo })),
      relais: e.relais?.nom ?? cc?.lieu ?? 'ton relais',
      origine: n.origine ?? 'appli',
    }
    if (n.origine === 'comptoir') majCommande(n.ref, () => ({ etat: 'litige', litige: id }))
    modifier((x) => {
      const conv = x.conversations.find((cv) => cv.id === id)
      return {
        ...x,
        litiges: [litige, ...x.litiges],
        compteurs: { ...x.compteurs, litiges: x.compteurs.litiges + (litige.etat === 'attente' ? 1 : 0) },
        conversations: conv
          ? x.conversations.map((cv) => (cv.id === id ? { ...cv, visible: true } : cv))
          : [
              {
                id,
                type: 'dossier',
                titre: `Dossier ${id} · ${colis.produit}`,
                apercu: 'Dossier ouvert : le vendeur a 48 h pour répondre.',
                liste: { icone: 'scale' },
                visible: true,
                entete: { titre: colis.produit, sous: `${n.ref} · colis ${colis.n}`, dessin: colis.dessin, bloque: colis.montant, lien: { texte: 'Le dossier', vers: '/litige-suivi?id=' + id } },
                resolue: false,
                nonLus: 0,
                placeholder: 'Ajoute un détail au dossier…',
                pied: 'Gardé au dossier. Numéros et adresses sont masqués.',
                messages: [{ de: 'systeme', le, texte: 'scale||Dossier ouvert. Le vendeur a 48 h pour répondre.' }],
              },
              ...x.conversations,
            ],
      }
    })
    return litige
  },
  ajouterPreuve: async (id, photo) => {
    modifier((e) => ({ ...e, litiges: e.litiges.map((l) => (l.id === id ? { ...l, preuves: [...l.preuves, { titre: 'Ta photo ' + (l.preuves.filter((p) => p.photo).length + 1), sous: 'ajoutée au dossier', photo }] } : l)) }))
  },
  repondreArrangement: async (id, accepte) => {
    const l0 = lireEtat().litiges.find((l) => l.id === id)
    if (accepte && l0?.arrangement) crediterRemboursement(l0.arrangement.montant, `Remboursement ${id} · arrangement`, COMMANDES_LITIGE[l0.ref]?.payePar ?? payePar(l0.ref))
    modifier((e) => ({
      ...e,
      litiges: e.litiges.map((l) =>
        l.id === id ? { ...l, etat: accepte ? 'rembourse' : 'examen', decision: accepte ? { le: maintenant(), motif: `Arrangement accepté : ${F(l.arrangement?.montant ?? 0)} F remboursés, tu gardes l’article.` } : undefined } : l,
      ),
    }))
  },
  contesterDecision: async (id, motif) => {
    modifier((e) => ({ ...e, litiges: e.litiges.map((l) => (l.id === id && l.decision ? { ...l, etat: 'examen', decision: { ...l.decision, conteste: true }, description: l.description + (motif ? '\nContestation : ' + motif : '') } : l)) }))
  },
  apercuAnnulation: async (ref, n) => {
    const c = toutesCommandes().find((x) => x.ref === ref)
    const colis = c?.colis.find((x) => x.n === n)
    if (!c || !colis || colis.annule) return null
    const actifs = c.colis.filter((x) => !x.annule)
    const reste = actifs.filter((x) => x.n !== n)
    const avant = fraisColis(c.mode, actifs)
    const apres = fraisColis(c.mode, reste)
    const article = colis.prix * colis.qte
    return { colis, article, fraisAvant: { ...avant, total: c.livraison }, fraisApres: apres, rembourse: article + Math.max(0, c.livraison - apres.total), payePar: payePar(ref), reste }
  },
  annulerColis: async (ref, n, motif) => {
    const a = await sourceDemo.apercuAnnulation(ref, n)
    if (!a || a.colis.statut === 'recupere') return 0
    const le = maintenant()
    crediterRemboursement(a.rembourse, `Annulation ${ref} · ${a.colis.boutique}`, a.payePar)
    majCommande(ref, (c) => {
      const colis = c.colis.map((x) => (x.n === n ? { ...x, annule: { le, rembourse: a.rembourse, par: 'toi' as const, motif } } : x))
      const tout = colis.every((x) => x.annule)
      const rendu = colis.reduce((t, x) => t + (x.annule?.rembourse ?? 0), 0)
      return {
        colis,
        livraison: a.fraisApres.total,
        total: c.total - a.rembourse,
        ...(tout ? { etat: 'annulee' as const, annulee: { le, rembourse: rendu }, code: null, etapes: [...c.etapes.filter((e) => e.le), { titre: 'Annulée par toi, remboursée', le }] } : {}),
      }
    })
    return a.rembourse
  },
  changerLieu: async (ref, lieu, frais) => {
    const le = maintenant()
    majCommande(ref, (c) => ({
      lieu,
      code: c.code ? String(100000 + ((Number(c.code) * 7) % 900000)) : null,
      ...(c.colis.some((x) => x.arrive) && c.mode === 'relais'
        ? { transfert: { de: c.lieu, le, frais }, etat: 'route' as const, arriveeLe: null, garde: null, comptoir: c.comptoir, colis: c.colis.map((x) => ({ ...x, arrive: false, etagere: null })) }
        : {}),
    }))
  },
  partagerPanier: async (ids) => {
    const e = lireEtat()
    const lignes = e.panier.lignes.filter((l) => !ids || ids.includes(l.id))
    if (!lignes.length) return null
    const sousTotal = lignes.reduce((t, l) => t + l.prix * l.qte, 0)
    const sc = [...new Set(lignes.map((l) => l.boutique))].map((b) => ({ boutique: b, zone: BOUTIQUES[b]?.zone ?? b, articles: lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) }))
    const livraison = calculer('relais', sc).total - sousTotal
    const frais = Math.round((sousTotal + livraison) * 0.02)
    const nums = Array.from({ length: 500 }, (_, i) => 'PP-' + (7310 + i))
    const id = nums.find((x) => !(e.partages ?? []).some((p) => p.id === x))!
    const pp: PanierPartage = {
      id,
      prenom: e.profil.prenom,
      relais: e.relais?.nom ?? 'Relais Mvog-Ada',
      lignes: lignes.map((l) => ({ titre: l.titre, dessin: l.dessin, qte: l.qte, prix: l.prix, boutique: l.boutique })),
      sousTotal,
      livraison,
      frais,
      total: sousTotal + livraison + frais,
      creeLe: maintenant(),
      ref: null,
      payeur: null,
    }
    modifier((x) => ({ ...x, partages: [pp, ...(x.partages ?? [])] }))
    return pp
  },
  interets: async () => lireEtat().interets ?? [],
  envoyerCodeDiaspora: async (canal, vers) => {
    const v = canal === 'email' ? vers.trim().toLowerCase() : chiffres(vers)
    envoiDiaspora[canal] = v
    return { destination: canal === 'email' ? masquerEmail(v) : vers.trim(), valideMinutes: 10, renvoiSecondes: 60, codeDemo: canal === 'email' ? CODE_EMAIL : CODE_SMS }
  },
  verifierCodeDiaspora: async (vers, code) => ({ ok: code === CODE_SMS && envoiDiaspora.sms === chiffres(vers) }),
  identiteFournisseur: async (f, compte) => {
    const e = lireEtat()
    // Démonstration : le compte Google du téléphone est celui de l'appareil ; « un autre compte » et Apple donnent
    // une identité nouvelle (Apple : adresse relais privée).
    const id =
      f === 'google' && compte === 'appareil' && !e.supprime
        ? { prenom: e.profil.prenom, nom: e.profil.nom, email: e.profil.email }
        : { prenom: 'Hervé', nom: 'Mbarga', email: f === 'apple' ? 'hm7k2q9x@privaterelay.appleid.com' : 'herve.mbarga@gmail.com' }
    const jeton = `demo-${f}-${jetonsFournisseur.size + 1}`
    jetonsFournisseur.set(jeton, { fournisseur: f, ...id })
    const existe = !e.supprime && id.email.toLowerCase() === e.profil.email.toLowerCase()
    return { jeton, ...id, compte: existe ? (e.diaspora ? 'diaspora' : 'standard') : null }
  },
  inscrireDiaspora: async (i) => {
    // Contrôles refaits ici (le serveur ne croit pas l'écran) : majeur, pays accepté avec son indicatif, numéro
    // de ce pays (jamais un numéro camerounais), puis le code SMS ; selon le moyen : jeton Google ou Apple
    // (e-mail repris du fournisseur), ou mot de passe et code e-mail, ou numéro seul (e-mail facultatif).
    const nee = /^\d{4}-\d{2}-\d{2}$/.test(i.naissance) ? new Date(i.naissance + 'T00:00:00Z') : null
    const age = nee ? ageLe(nee, maintenant()) : -1
    if (age < AGE_DIASPORA || age > 120) return { ok: false, raison: 'age' }
    if (!PAYS_DIASPORA.some(([p, ind]) => p === i.pays && ind === i.indicatif)) return { ok: false, raison: 'pays' }
    const brut = chiffres(i.numero)
    if (brut.length < 6 || brut.length > 12 || /^(00)?237/.test(brut)) return { ok: false, raison: 'numero' }
    const social = i.fournisseur === 'google' || i.fournisseur === 'apple'
    const id = social ? jetonsFournisseur.get(i.jeton ?? '') : undefined
    if (social && (!id || id.fournisseur !== i.fournisseur)) return { ok: false, raison: 'jeton' }
    const e0 = lireEtat()
    const email = (id ? id.email : i.email).trim().toLowerCase()
    if (!i.prenom.trim() || i.prenom.trim().length > 40) return { ok: false, raison: 'prenom' }
    if ((email || i.fournisseur !== 'numero') && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, raison: 'email' }
    const existe = !!email && !e0.supprime && email === e0.profil.email.toLowerCase()
    // Compte existant : seul son titulaire (Google ou Apple le prouve) peut le passer en diaspora, une fois.
    if (existe && (!social || !i.convertir || e0.diaspora)) return { ok: false, raison: 'existe' }
    if (i.fournisseur === 'email' && ((i.motDePasse ?? '').length < 8 || !/\d/.test(i.motDePasse ?? ''))) return { ok: false, raison: 'mdp' }
    // Numéro vérifié (et l'e-mail, pour le moyen « e-mail ») : chaque code doit être le bon, pour le numéro et
    // l'adresse qui l'ont reçu.
    if (i.code !== CODE_SMS || envoiDiaspora.sms !== chiffres(i.indicatif + i.numero)) return { ok: false, raison: 'code' }
    if (i.fournisseur === 'email' && (i.codeEmail !== CODE_EMAIL || envoiDiaspora.email !== email)) return { ok: false, raison: 'codeEmail' }
    if (!existe) {
      const r = await sourceDemo.inscrire({ prenom: i.prenom, email: email || 'sans-email@belivay.invalid', motDePasse: i.motDePasse || 'Fournisseur0' }, true)
      if (!r.ok) return r
      // Google, Apple : pas de mot de passe, le fournisseur ouvre le compte ; numéro : le code SMS l'ouvre.
      if (i.fournisseur !== 'email')
        modifier((e) => ({
          ...e,
          motDePasse: '',
          securite: { ...e.securite, google: i.fournisseur === 'google' ? email : null, apple: i.fournisseur === 'apple' ? email : null },
          profil: { ...e.profil, email, connexion: social ? (i.fournisseur as 'google' | 'apple') : 'email' },
        }))
    } else modifier((e) => noterConnexion({ ...e, connecte: true, profil: { ...e.profil, connexion: i.fournisseur as 'google' | 'apple' } }, i.fournisseur as 'google' | 'apple'))
    if (id) jetonsFournisseur.delete(i.jeton!)
    envoiDiaspora.sms = envoiDiaspora.email = null
    const n = chiffres(i.numero)
    inscrireNumero(i.indicatif + n)
    const masque = `${i.indicatif} ${n.slice(0, 2)} ·· ·· ${n.slice(-2)}`
    modifier((e) => ({
      ...e,
      profil: { ...e.profil, prenom: i.prenom.trim(), nom: i.nom.trim(), numeroVerifie: true, numeroMasque: masque },
      diaspora: { pays: i.pays, ville: i.ville.trim(), indicatif: i.indicatif, numeroMasque: masque },
      liens: [],
      demandes: [],
      devise: 'XAF',
      invitation: null,
    }))
    return { ok: true, session: session() }
  },
  liensFamille: async () => {
    const e = lireEtat()
    const t = maintenant()
    const liens = e.liens ?? []
    const depensesMois = liens.flatMap((l) => l.commandes).filter((c) => c.le >= debutMois(t)).reduce((n, c) => n + c.montant, 0)
    const code = e.codeFamille && e.codeFamille.jusqua > t ? e.codeFamille : null
    return { compte: e.diaspora ?? null, liens, code, depensesMois: e.diaspora ? depensesMois : 0, maintenant: t }
  },
  creerCodeFamille: async () => {
    const t = maintenant()
    const lettres = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const code = 'FAM-' + Array.from({ length: 4 }, (_, i) => lettres[(Math.floor(t / 1000) * (i + 7) + i * 13) % lettres.length]).join('')
    const c = { code, jusqua: t + 24 * H }
    modifier((e) => ({ ...e, codeFamille: c }))
    return c
  },
  lierParCode: async (code) => {
    const e = lireEtat()
    const p = CODES_FAMILLE[code.trim().toUpperCase()]
    const liens = e.liens ?? []
    if (!p) return { ok: false, raison: 'code' }
    if (liens.filter((l) => l.etat === 'actif' || l.etat === 'invite').length >= 5) return { ok: false, raison: 'max' }
    if (liens.some((l) => l.prenom === p.prenom && l.etat === 'actif')) return { ok: false, raison: 'deja' }
    const t = maintenant()
    const lien: LienFamille = { id: 'LF-' + (40 + liens.length), sens: 'diaspora', prenom: p.prenom, pays: null, relais: p.relais, etat: 'actif', le: t, commandes: [], domicile: p.domicile, prefere: p.domicile ? 'domicile' : 'relais', ville: p.ville }
    // Démonstration : le proche relié envoie aussitôt son panier à payer (boîte « À payer pour mes proches »).
    const panier = p.panier
    const demande = panier
      ? (() => {
          const sousTotal = panier.reduce((n, x) => n + x.prix * x.qte, 0)
          const sc = [...new Set(panier.map((x) => x.boutique))].map((b) => ({ boutique: b, zone: BOUTIQUES[b]?.zone ?? b, articles: panier.filter((x) => x.boutique === b).map((x) => ({ prix: x.prix, quantite: x.qte, classe: x.classe })) }))
          return { id: 'DP-' + (50 + (e.demandes ?? []).length), sens: 'recue' as const, lien: lien.id, prenom: p.prenom, pays: null, lignes: panier, sousTotal, livraison: p.domicile ? ('domicile' as const) : ('relais' as const), fraisRelais: calculer('relais', sc).total - sousTotal, fraisDomicile: calculer('domicile', sc).total - sousTotal, mot: p.mot ?? '', creeLe: t, jusqua: t + 7 * 24 * H, etat: 'attente' as const, ref: null, motRefus: null, supplementPar: null, payeeLe: null }
        })()
      : null
    modifier((x) => ({ ...x, liens: [lien, ...(x.liens ?? [])], demandes: demande ? [demande, ...(x.demandes ?? [])] : (x.demandes ?? []) }))
    return { ok: true, lien }
  },
  inviterProche: async (prenom, numero) => {
    const n = chiffres(numero)
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero' }
    const liens = lireEtat().liens ?? []
    if (liens.filter((l) => l.etat === 'actif' || l.etat === 'invite').length >= 5) return { ok: false, raison: 'max' }
    if (liens.some((l) => l.prenom.toLowerCase() === prenom.trim().toLowerCase() && (l.etat === 'actif' || l.etat === 'invite'))) return { ok: false, raison: 'deja' }
    const lien: LienFamille = { id: 'LF-' + (40 + liens.length), sens: 'diaspora', prenom: prenom.trim(), pays: null, relais: null, etat: 'invite', le: maintenant(), commandes: [] }
    modifier((x) => ({ ...x, liens: [lien, ...(x.liens ?? [])] }))
    // Un proche qui a un compte : l'invitation l'attend dans ses Reçus (il l'accepte et choisit son relais).
    if (compteDe(n) && compteDe(n)!.cle !== cleCompte(lireEtat())) await sourceDemo.envoyerRecu({ type: 'lien-famille', a: n, prenom, titre: `${lireEtat().profil.prenom} veut être relié à ton compte`, jusqua: maintenant() + 7 * J })
    return { ok: true, lien }
  },
  repondreLien: async (id, accepte, relais) => {
    modifier((e) => ({ ...e, liens: (e.liens ?? []).map((l) => (l.id === id ? { ...l, etat: accepte ? 'actif' : 'refuse', relais: accepte ? (relais ?? e.relais?.nom ?? 'Relais Mvog-Ada') : null } : l)) }))
  },
  retirerLien: async (id) => {
    modifier((e) => ({ ...e, liens: (e.liens ?? []).map((l) => (l.id === id ? { ...l, etat: 'retire' } : l)) }))
  },
  commanderPour: async (id, { carte: jeton, devise, mot, titulaire, paysCarte, codeSms, livraison = 'relais', moyen = 'carte', demande, supplementPar = 'payeur' }) => {
    const e = lireEtat()
    const l = (e.liens ?? []).find((x) => x.id === id)
    if (!e.diaspora || !l || l.etat !== 'actif' || l.sens !== 'diaspora' || (livraison === 'relais' && !l.relais)) return { ok: false, raison: 'lien' }
    // « Chez X » : seulement si X l'a accepté dans son compte ; l'adresse reste chez lui, jamais montrée ici.
    if (livraison === 'domicile' && !l.domicile) return { ok: false, raison: 'domicile' }
    if (nomCarte(titulaire) !== nomCarte([e.profil.prenom, e.profil.nom].filter(Boolean).join(' '))) return { ok: false, raison: 'titulaire' }
    const dem = demande ? (e.demandes ?? []).find((x) => x.id === demande && x.sens === 'recue') : null
    if (demande && (!dem || dem.lien !== id || dem.etat !== 'attente' || dem.jusqua < maintenant())) return { ok: false, raison: 'demande' }
    const lignes = dem ? dem.lignes : e.panier.lignes
    if (!lignes.length) return { ok: false, raison: 'vide' }
    const sousTotal = lignes.reduce((n, x) => n + x.prix * x.qte, 0)
    const sc = [...new Set(lignes.map((x) => x.boutique))].map((b) => ({ boutique: b, zone: BOUTIQUES[b]?.zone ?? b, articles: lignes.filter((x) => x.boutique === b).map((x) => ({ prix: x.prix, quantite: x.qte, classe: x.classe })) }))
    // Règle commune des échanges (src/donnees/echanges.ts) : le diaspora paie tout ; le supplément domicile ne va au
    // proche que s'il a lui-même demandé la livraison chez lui et que la garantie le couvre.
    const { supplementAuProche, totalDiaspora } = await import('../donnees/echanges')
    const fraisRelais = calculer('relais', sc).total - sousTotal
    const fraisDomicile = calculer('domicile', sc).total - sousTotal
    const parProche = !!dem && dem.livraison === 'domicile' && livraison === 'domicile'
    if (supplementPar === 'destinataire' && !supplementAuProche({ articles: sousTotal, supplement: Math.max(0, fraisDomicile - fraisRelais), demandeParProche: parProche }).ok) return { ok: false, raison: 'garantie' }
    const tot = totalDiaspora({ articles: sousTotal, fraisRelais, fraisDomicile, livraison, supplementPar })
    const montant = tot.total
    const t = maintenant()
    const mois = (e.liens ?? []).flatMap((x) => x.commandes).filter((c) => c.le >= debutMois(t)).reduce((n, c) => n + c.montant, 0)
    if (montant > PLAFONDS_DIASPORA.paiement || mois + montant > PLAFONDS_DIASPORA.mois) return { ok: false, raison: 'plafond' }
    // Cohérence anti-fraude (COHERENCE_DIASPORA) : pays de la carte (BIN, sinon pays déclaré) face au pays du compte
    // et de son numéro ; montant et rythme face aux commandes déjà payées depuis ce compte. Apple Pay et Google Pay :
    // le pays de la carte enregistrée, donné par le prestataire.
    const controle = controleDiaspora({ paysCarte: jeton.pays ?? paysDuBin(jeton.bin) ?? paysCarte, paysCompte: e.diaspora.pays, montant, historique: (e.liens ?? []).flatMap((x) => x.commandes), maintenant: t })
    if (controle.decision === 'refuse') return { ok: false, raison: 'coherence', controle }
    if (controle.decision === 'renforce' && (codeSms !== CODE_SMS || envoiDiaspora.sms !== chiffres(e.diaspora.numeroMasque))) return { ok: false, raison: 'verification', controle }
    envoiDiaspora.sms = null
    // La commande appartient au proche (son compte reçoit le code par SMS et la retire, ou la reçoit chez lui) ;
    // celui qui paie n'en garde que le suivi : ni code, ni relais précis, ni adresse.
    const pris = new Set([...e.passees.map((x) => x.ref), ...(e.liens ?? []).flatMap((x) => x.commandes.map((c) => c.ref))])
    const ref = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52600 + i)).find((r) => !pris.has(r))!
    const enDevise = Math.round((montant / (devise === 'EUR' ? 655.957 : 603.5)) * 100) / 100
    const suivi = { ref, le: t, montant, devise, enDevise, carte: libelleCarte(jeton), articles: lignes.reduce((n, x) => n + x.qte, 0), mot: mot.trim().slice(0, 80), pretLe: t + 6 * H, retireLe: null, rembourse: null, livraison, moyen, demande: dem?.id ?? null, aLaRemise: tot.aLaRemise }
    modifier((x) => ({
      ...x,
      panier: dem ? x.panier : { ...x.panier, lignes: [] },
      liens: (x.liens ?? []).map((y) => (y.id === id ? { ...y, commandes: [suivi, ...y.commandes] } : y)),
      demandes: (x.demandes ?? []).map((d) => (d.id === dem?.id ? { ...d, etat: 'payee', ref, payeeLe: t, supplementPar: livraison === 'domicile' ? supplementPar : null, livraison } : d)),
    }))
    return { ok: true, ref }
  },
  choisirProche: async (id) => {
    const e = lireEtat()
    if (!e.diaspora || !(e.liens ?? []).some((l) => l.id === id && l.sens === 'diaspora' && l.etat === 'actif')) return { ok: false }
    modifier((x) => ({ ...x, procheActif: id }))
    return { ok: true }
  },
  reglerDevise: async (d) => {
    if (!lireEtat().diaspora) return { ok: false }
    modifier((e) => ({ ...e, devise: d }))
    return { ok: true }
  },
  lienInvitation: async () => {
    const e = lireEtat()
    const t = maintenant()
    if (!e.diaspora) {
      const c = e.codeFamille && e.codeFamille.jusqua > t ? e.codeFamille : await sourceDemo.creerCodeFamille()
      return { type: 'famille', code: c.code, jusqua: c.jusqua }
    }
    if (e.invitation && e.invitation.jusqua > t) return { type: 'invitation', ...e.invitation }
    const lettres = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const c = { code: 'INV-' + Array.from({ length: 4 }, (_, i) => lettres[(Math.floor(t / 1000) * (i + 5) + i * 11) % lettres.length]).join(''), jusqua: t + 7 * 24 * H }
    modifier((x) => ({ ...x, invitation: c }))
    return { type: 'invitation', ...c }
  },
  accepterInvitation: async (code, relais) => {
    const e = lireEtat()
    if (e.diaspora) return { ok: false, raison: 'type' }
    const p = INVITATIONS_DEMO[code.trim().toUpperCase()]
    if (!p) return { ok: false, raison: 'code' }
    const liens = e.liens ?? []
    if (liens.filter((l) => l.etat === 'actif' || l.etat === 'invite').length >= PLAFONDS_DIASPORA.liens) return { ok: false, raison: 'max' }
    if (liens.some((l) => l.prenom === p.prenom && l.pays === p.pays && l.etat === 'actif')) return { ok: false, raison: 'deja' }
    const lien: LienFamille = { id: 'LF-' + (40 + liens.length), sens: 'cameroun', prenom: p.prenom, pays: p.pays, relais, etat: 'actif', le: maintenant(), commandes: [], domicile: false, prefere: 'relais', ville: null }
    modifier((x) => ({ ...x, liens: [lien, ...(x.liens ?? [])] }))
    return { ok: true, lien }
  },
  reglerLivraisonLien: async (id, { relais, domicile, prefere }) => {
    modifier((e) => ({ ...e, liens: (e.liens ?? []).map((l) => (l.id === id && l.sens === 'cameroun' ? { ...l, relais, domicile: domicile && e.adresses.length > 0, prefere: domicile && e.adresses.length > 0 ? prefere : 'relais' } : l)) }))
  },
  demandesProches: async () => {
    const t = maintenant()
    const demandes = (lireEtat().demandes ?? []).map((d) => (d.etat === 'attente' && d.jusqua < t ? { ...d, etat: 'expiree' as const } : d))
    return { demandes: demandes.sort((a, b) => b.creeLe - a.creeLe), maintenant: t }
  },
  envoyerPanierAuProche: async (id, { mot, livraison, lignes: choisies }) => {
    const e = lireEtat()
    const l = (e.liens ?? []).find((x) => x.id === id)
    if (e.diaspora || !l || l.sens !== 'cameroun' || l.etat !== 'actif') return { ok: false, raison: 'lien' }
    if (livraison === 'domicile' && !e.adresses.length) return { ok: false, raison: 'domicile' }
    const lignes = choisies ? e.panier.lignes.filter((x) => choisies.includes(x.id)) : e.panier.lignes
    if (!lignes.length) return { ok: false, raison: 'vide' }
    const t = maintenant()
    if ((e.demandes ?? []).some((d) => d.lien === id && d.etat === 'attente' && d.jusqua > t)) return { ok: false, raison: 'deja' }
    const sousTotal = lignes.reduce((n, x) => n + x.prix * x.qte, 0)
    const sc = [...new Set(lignes.map((x) => x.boutique))].map((b) => ({ boutique: b, zone: BOUTIQUES[b]?.zone ?? b, articles: lignes.filter((x) => x.boutique === b).map((x) => ({ prix: x.prix, quantite: x.qte, classe: x.classe })) }))
    const fraisRelais = calculer('relais', sc).total - sousTotal
    const fraisDomicile = calculer('domicile', sc).total - sousTotal
    if (Math.round((sousTotal + (livraison === 'domicile' ? fraisDomicile : fraisRelais)) * 1.02) > PLAFONDS_DIASPORA.paiement) return { ok: false, raison: 'plafond' }
    const demande = { id: 'DP-' + (60 + (e.demandes ?? []).length), sens: 'envoyee' as const, lien: id, prenom: l.prenom, pays: l.pays, lignes: lignes.map((x) => ({ titre: x.titre, dessin: x.dessin, qte: x.qte, prix: x.prix, boutique: x.boutique, classe: x.classe })), sousTotal, livraison, fraisRelais, fraisDomicile, mot: mot.trim().slice(0, 120), creeLe: t, jusqua: t + 7 * 24 * H, etat: 'attente' as const, ref: null, motRefus: null, supplementPar: null, payeeLe: null }
    modifier((x) => ({ ...x, demandes: [demande, ...(x.demandes ?? [])] }))
    return { ok: true, demande }
  },
  refuserDemande: async (id, mot) => {
    modifier((e) => ({ ...e, demandes: (e.demandes ?? []).map((d) => (d.id === id && d.sens === 'recue' && d.etat === 'attente' ? { ...d, etat: 'refusee', motRefus: mot.trim().slice(0, 120) || null } : d)) }))
  },
  annulerDemande: async (id) => {
    modifier((e) => ({ ...e, demandes: (e.demandes ?? []).map((d) => (d.id === id && d.sens === 'envoyee' && d.etat === 'attente' ? { ...d, etat: 'annulee' } : d)) }))
  },
  verifierPanier: async () => {
    const ch = changementsPanier(lireEtat())
    const baisses = ch.filter((c) => c.type === 'baisse')
    if (baisses.length) modifier((x) => ({ ...x, panier: { ...x.panier, lignes: x.panier.lignes.map((l) => { const b = baisses.find((c) => c.id === l.id); return b ? { ...l, prix: b.apres, flash: undefined } : l }) } }))
    return ch
  },
  accepterChangements: async () => {
    const ch = changementsPanier(lireEtat())
    for (const c of ch.filter((x) => x.type === 'pris')) {
      const l = lireEtat().panier.lignes.find((y) => y.id === c.id)
      if (l && !lireEtat().favoris.some((f) => f.p === l.p)) await sourceDemo.basculerFavori(l.p)
    }
    modifier((x) => ({
      ...x,
      panier: {
        ...x.panier,
        lignes: x.panier.lignes
          .filter((l) => !ch.some((c) => c.id === l.id && (c.type === 'retire' || c.type === 'pris')))
          .map((l) => { const h = ch.find((c) => c.id === l.id && c.type === 'hausse'); return h ? { ...l, prix: h.apres, flash: undefined } : l }),
      },
    }))
  },
  whatsapp: async () => {
    const e = lireEtat()
    const t = maintenant()
    let wa: ConversationWa = e.wa ?? { etape: 'accord', ref: null, messages: [{ de: 'client', le: t - 60e3, texte: '🎤 Message vocal · 0:14' }, { de: 'belivay', le: t - 50e3, texte: `Bonjour ${e.profil.prenom}. Pour écouter ton message vocal, j’ai besoin de ton accord : il sert seulement à préparer ta commande, puis il est supprimé sous 24 h. Réponds OK pour continuer.` }] }
    // Paiement reçu dans l'application : la suite s'écrit toute seule.
    if (wa.etape === 'lien' && wa.ref && e.passees.find((c) => c.ref === wa.ref)?.etat === 'payee')
      wa = { ...wa, etape: 'suite', messages: [...wa.messages, { de: 'belivay', le: t, texte: `Paiement reçu : ${F(e.passees.find((c) => c.ref === wa.ref)!.montant)} F. Merci ${e.profil.prenom}. Commande ${wa.ref} · payée. Ton code de retrait arrive dans l’application et par SMS, jamais ici.` }] }
    return wa
  },
  repondreWhatsapp: async (texte) => {
    const e = lireEtat()
    const t = maintenant()
    let wa = await sourceDemo.whatsapp()
    const n = texte.trim().toLowerCase()
    const msgs = [...wa.messages, { de: 'client' as const, le: t, texte: texte.trim() }]
    // La proposition : la dernière commande retirée, au prix du jour, retrait au relais habituel.
    const derniere = toutesCommandes().find((c) => c.etat === 'retiree' && c.colis.some((x) => CATALOGUE[x.p]))
    const lignes = (derniere?.colis ?? []).filter((x) => CATALOGUE[x.p]).map((x) => ({ p: x.p, qte: x.qte, pr: CATALOGUE[x.p] }))
    const sc = [...new Set(lignes.map((l) => l.pr.vendeur.boutique))].map((b) => ({ boutique: b, zone: lignes.find((l) => l.pr.vendeur.boutique === b)!.pr.vendeur.zone, articles: lignes.filter((l) => l.pr.vendeur.boutique === b).map((l) => ({ prix: l.pr.prix, quantite: l.qte, classe: l.pr.classe as Classe })) }))
    const f = calculer('relais', sc)
    const relais = e.relais?.nom ?? 'Relais Mvog-Ada'
    if (n === 'nouvelle commande') {
      modifier((x) => ({ ...x, wa: undefined }))
      return sourceDemo.whatsapp()
    }
    if (wa.etape === 'accord' && n === 'ok')
      wa = { ...wa, etape: 'proposition', messages: [...msgs, { de: 'belivay', le: t, texte: `Merci. J’ai compris : comme ta commande ${derniere?.ref ?? ''}.`, carte: { titre: 'Ma proposition', lignes: [...lignes.map((l) => `${l.pr.titre} × ${l.qte} : ${F(l.pr.prix * l.qte)} F`), `Retrait au ${relais} : ${f.total - f.sousTotal ? F(f.total - f.sousTotal) + ' F' : 'offert'}`], total: `Total : ${F(f.total)} F` } }, { de: 'belivay', le: t, texte: 'Prix calculés par BelivaY. Réponds « C’est bon » pour continuer.' }] }
    else if (wa.etape === 'proposition' && /c.?est bon|oui|ok/.test(n))
      wa = { ...wa, etape: 'confirmer', messages: [...msgs, { de: 'belivay', le: t, texte: `Récapitulatif : ${lignes.map((l) => l.pr.titre).join(', ')}, retrait au ${relais}, ${F(f.total)} F. Réponds OUI pour commander. Rien n’est commandé ni payé avant ton OUI.` }] }
    else if (wa.etape === 'confirmer' && n === 'oui') {
      const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52112 + i * 7))
      const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
      const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: relais, moyen: 'mtn', numero: null, comptoir: false, articles: lignes.reduce((a, l) => a + l.qte, 0), colis: sc.length, sousTotal: f.sousTotal, livraison: f.total - f.sousTotal, frais: 0, montant: f.total, dueAuRetrait: 0, etat: 'attente', expire: t + 15 * 60e3, lignes: lignes.map((l) => ({ titre: l.pr.titre, dessin: l.pr.dessins[0] ?? '', qte: l.qte, prix: l.pr.prix, boutique: l.pr.vendeur.boutique })), canal: 'whatsapp' }
      modifier((x) => ({ ...x, passees: [commande, ...x.passees] }))
      wa = { ...wa, etape: 'lien', ref, messages: [...msgs, { de: 'belivay', le: t, texte: `C’est noté. Paie ${F(f.total)} F dans BelivaY, en Mobile Money : le lien ouvre l’application. Je ne paie jamais à ta place. Ton argent reste bloqué jusqu’à ton retrait.`, carte: { titre: `Payer ta commande · ${F(f.total)} F`, lignes: ['BelivaY · paiement Mobile Money'], total: '', lien: ref } }] }
    } else if (/conseiller|humain|personne/.test(n) || !['ok', 'oui'].includes(n))
      wa = { ...wa, etape: wa.etape === 'suite' ? 'suite' : 'humain', messages: [...msgs, { de: 'belivay', le: t, texte: 'Je ne suis pas sûr de comprendre. Je te passe à une personne de l’équipe BelivaY : elle te répond ici, dans les heures d’ouverture du support.' }, { de: 'systeme', le: t, texte: 'Conversation transmise à un conseiller BelivaY' }] }
    else wa = { ...wa, messages: msgs }
    modifier((x) => ({ ...x, wa }))
    return wa
  },
  trocs: async () => {
    const e = lireEtat()
    return { liste: e.trocs ?? [], relais: e.relais?.nom ?? null, maintenant: maintenant() }
  },
  creerTroc: async ({ p, modele, declare }) => {
    const e = lireEtat()
    const t = maintenant()
    const tr: Troc = {
      id: 'TR-' + (22 + (e.trocs ?? []).length),
      p,
      titre: CATALOGUE[p].titre,
      prixLivre: prixLivreDe(p),
      modele,
      modeleNom: MODELES_REPRISE.find((x) => x.id === modele)?.nom ?? modele,
      declare,
      estimation: estimer(modele, declare)!,
      codeDepot: String(100000 + ((t / 1000) % 900000) | 0).slice(0, 6),
      relais: e.relais?.nom ?? 'Relais Mvog-Ada',
      dates: { cree: t, depose: null, collecte: null, recu: null, inspecte: null },
      valeur: null,
      contreOffre: null,
      motif: null,
      contestation: null,
      etat: 'depot',
      ref: null,
    }
    modifier((x) => ({ ...x, trocs: [tr, ...(x.trocs ?? [])] }))
    return tr
  },
  repondreTroc: async (id, accepte) => {
    const tr = (lireEtat().trocs ?? []).find((x) => x.id === id)!
    // Accepter ou récupérer clôt une contestation en cours ; un refus ne s'accepte pas, le téléphone est rendu.
    const maj: Troc = accepte && tr.etat === 'contre' && tr.contreOffre ? { ...tr, etat: 'confirme', valeur: tr.contreOffre.valeur, contestation: null } : { ...tr, etat: 'rendu', contestation: null }
    modifier((x) => ({ ...x, trocs: (x.trocs ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  contesterTroc: async (id, texte) => {
    const tr = (lireEtat().trocs ?? []).find((x) => x.id === id)!
    const t = maintenant()
    const maj: Troc = { ...tr, contestation: { le: t, texte: texte.trim(), reponseAvant: t + 48 * H } }
    modifier((x) => ({ ...x, trocs: (x.trocs ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  payerTroc: async (id, moyen) => {
    const e = lireEtat()
    const tr = (e.trocs ?? []).find((x) => x.id === id)!
    const t = maintenant()
    const pr = CATALOGUE[tr.p]
    const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52500 + i))
    const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
    const montant = tr.prixLivre - (tr.valeur ?? 0)
    const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: tr.relais, moyen: 'mtn', numero: moyen, comptoir: false, articles: 1, colis: 1, sousTotal: pr.prix, livraison: tr.prixLivre - pr.prix, frais: 0, montant, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: [{ titre: tr.titre, dessin: pr.dessins[0] ?? '', qte: 1, prix: pr.prix, boutique: pr.vendeur.boutique }] }
    const maj: Troc = { ...tr, etat: 'paye', ref }
    modifier((x) => ({ ...x, passees: [commande, ...x.passees], trocs: (x.trocs ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  annulerTroc: async (id) => {
    modifier((x) => ({ ...x, trocs: (x.trocs ?? []).map((y) => (y.id === id && y.etat === 'depot' ? { ...y, etat: 'annule' } : y)) }))
  },
  rentree: async () => {
    const e = lireEtat()
    const r = e.rentree ?? { papier: [], publiees: [], commande: null }
    const t = maintenant()
    const listes = LISTES_RENTREE.map((l) => (r.publiees.includes(l.id) ? { ...l, statut: 'publiee' as const, publieeLe: t, historique: [{ le: t, texte: `Liste publiée · ${l.articles.length} articles` }] } : l))
    const enCours = r.commande ? (toutesCommandes().find((c) => c.ref === r.commande && c.etat !== 'retiree' && c.etat !== 'annulee') ?? null) : null
    // Date de démonstration : la rentrée de la saison, lundi 2 novembre 2026 à 7 h 30 (Yaoundé).
    return { saison: '2026-2027', ouverte: true, ecoles: ECOLES, listes, enCours, papier: r.papier, rentreeLe: RENTREE_LE, relais: e.relais?.nom ?? null, maintenant: t }
  },
  commanderRentree: async (id, { exclus, equivalents, moyen }) => commanderListe(id, exclus, equivalents, moyen),
  creerMiseDeCoteListe: async (id, { exclus, equivalents, rythme, moyen }) => {
    const l = LISTES_RENTREE.find((x) => x.id === id)!
    const { f, pris } = totalListe(id, exclus, equivalents)
    const t = maintenant()
    const v = planCoteRentree(f.total, rythme, t, RENTREE_LE)
    if (!v) throw new Error('mise de côté impossible')
    const e = lireEtat()
    const c: MiseDeCote = {
      id: 'MC-' + (119 + (e.cotes ?? []).length),
      p: '',
      titre: `Liste ${l.classe} · ${ECOLES.find((x) => x.id === l.ecole)?.nom ?? ''}`,
      dessin: '',
      prix: f.sousTotal,
      livraison: f.total - f.sousTotal,
      prixLivre: f.total,
      rythme,
      versements: v.map((x, i) => ({ n: i + 1, ...x, payeLe: i === 0 ? t : null })),
      creeLe: t,
      moyen,
      etat: 'en_cours',
      ref: null,
      annulee: null,
      liste: { id, classe: l.classe, ecole: ECOLES.find((x) => x.id === l.ecole)?.nom ?? '', exclus, equivalents, articles: pris.length, rentreeLe: RENTREE_LE },
    }
    modifier((x) => ({ ...x, cotes: [c, ...(x.cotes ?? [])] }))
    return c
  },
  envoyerListePapier: async (classe, photo) => {
    const t = maintenant()
    modifier((x) => ({ ...x, rentree: { ...(x.rentree ?? { papier: [], publiees: [], commande: null }), papier: [{ classe, le: t, photo, pretLe: t + 24 * H }, ...(x.rentree?.papier ?? [])] } }))
  },
  publierListe: async (id) => {
    modifier((x) => ({ ...x, rentree: { ...(x.rentree ?? { papier: [], publiees: [], commande: null }), publiees: [...new Set([...(x.rentree?.publiees ?? []), id])] } }))
  },
  famille: async () => {
    const e = lireEtat()
    const f = familleDe(e)
    // Le retrait d'un panier se lit dans sa commande.
    const cs = toutesCommandes()
    const paniers = f.paniers.map((p) => ({ ...p, historique: p.historique.map((h) => ({ ...h, retireLe: h.retireLe ?? cs.find((c) => c.ref === h.ref)?.retireeLe ?? null })) }))
    return { articles: ARTICLES_FAMILLE, modeles: MODELES_FAMILLE, destinataires: f.destinataires, paniers, maintenant: maintenant() }
  },
  enregistrerPanierFamille: async (p) => {
    const f = familleDe(lireEtat())
    const ancien = p.id ? f.paniers.find((x) => x.id === p.id) : undefined
    p = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))
    const nouveau: PanierFamille = { id: ancien?.id ?? 'PF-' + (f.paniers.length + 1 + Math.round(maintenant() / 1000) % 1000), nom: 'Panier famille', destinataire: null, articles: [], mensuel: false, jour: 21, suspendu: false, carte: null, email: '', historique: [], ...ancien, ...p } as PanierFamille
    modifier((e) => ({ ...e, famille: { ...familleDe(e), paniers: ancien ? familleDe(e).paniers.map((x) => (x.id === ancien.id ? nouveau : x)) : [...familleDe(e).paniers, nouveau] } }))
    return nouveau
  },
  lierDestinataire: async (d) => {
    modifier((e) => ({ ...e, famille: { ...familleDe(e), destinataires: [...familleDe(e).destinataires.filter((x) => x.prenom !== d.prenom), { ...d, numero: masquerNumero(chiffres(d.numero)), lieLe: maintenant() }] } }))
  },
  payerPanierFamille: async (id, { carte: jeton, email, mensuel, jour }) => {
    const carte = libelleCarte(jeton) // le serveur garde le jeton ; le client voit « Visa •••• 4242 »
    const e = lireEtat()
    const p = familleDe(e).paniers.find((x) => x.id === id)!
    const { lignes, sousTotal, livraison } = calculFamille(ARTICLES_FAMILLE, p.articles)
    const frais = Math.round((sousTotal + livraison) * 0.02)
    const t = maintenant()
    const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52200 + i))
    const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
    const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: p.destinataire?.relais ?? 'Relais Mvog-Ada', moyen: 'carte', numero: carte, comptoir: false, articles: lignes.reduce((n, x) => n + x.qte, 0), colis: 1, sousTotal, livraison, frais, montant: sousTotal + livraison + frais, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: [{ titre: p.nom, dessin: '', qte: 1, prix: sousTotal, boutique: 'Boutique G' }], payeur: { prenom: e.profil.prenom, email, carte, devise: 'EUR', le: t } }
    const maj: PanierFamille = { ...p, carte, email, mensuel, jour, suspendu: false, historique: [{ le: t, montant: commande.montant, ref, retireLe: null }, ...p.historique] }
    modifier((x) => ({ ...x, passees: [commande, ...x.passees], famille: { ...familleDe(x), paniers: familleDe(x).paniers.map((y) => (y.id === id ? maj : y)) } }))
    return maj
  },
  suspendrePanierFamille: async (id, suspendu) => majPanierFamille(id, (p) => ({ ...p, suspendu })),
  cotisations: async () => ({ liste: cotisationsDe(lireEtat()), maintenant: maintenant() }),
  creerCotisation: async ({ nom, occasion, p, beneficiaire, relais, jusqua, qui: quiDemande }) => {
    const e = lireEtat()
    const pr = CATALOGUE[p]
    const prixLivre = prixLivreDe(p)
    const fraisLivraison = prixLivre - pr.prix
    // Le bénéficiaire ne paie la livraison que si la garantie le permet (donnees/echanges.ts) ; sinon les participants.
    const qui = quiDemande === 'destinataire' && destinatairePeutPayer({ articles: pr.prix, frais: fraisLivraison }).ok ? 'destinataire' : 'payeur'
    const n = (e.cotisations ?? []).length + 78
    const c: Cotisation = { id: 'COT-' + n, code: n.toString(36).toUpperCase() + 'Q' + (n * 7).toString(36).toUpperCase(), nom: nom.trim(), occasion, p, titre: pr.titre, dessin: pr.dessins[0] ?? '', prixLivre, objectif: objectifCotisation({ prix: pr.prix, frais: fraisLivraison, qui }), beneficiaire: beneficiaire.trim(), relais, organisateur: `${e.profil.prenom} ${e.profil.nom.slice(0, 1)}.`.trim(), creeLe: maintenant(), jusqua, participations: [], etat: 'ouverte', hausse: null, ref: null, fin: null, qui, frais: fraisLivraison, liste: null }
    modifier((x) => ({ ...x, cotisations: [c, ...(x.cotisations ?? [])] }))
    return c
  },
  cotisationPublique: async (code) => {
    const c = cotisationsDe(lireEtat()).find((x) => x.code === code)
    return c ? { ...c, participations: c.participations.map((x) => (x.discret ? { ...x, prenom: '', mot: '' } : x)) } : null
  },
  participer: async (code, p) => {
    const c = cotisationsDe(lireEtat()).find((x) => x.code === code)
    if (!c || c.etat !== 'ouverte') return { ok: false, raison: 'fermee' }
    const manque = c.objectif - reuni(c)
    if (p.montant < Math.min(1000, manque) || p.montant > manque) return { ok: false, raison: 'montant' }
    const e = lireEtat()
    const moi = p.prenom.trim().toLowerCase() === e.profil.prenom.toLowerCase()
    let maj: Cotisation = { ...c, participations: [...c.participations, { id: 'pa' + (c.participations.length + 1) + Date.now().toString(36), prenom: p.prenom.trim(), montant: p.montant, frais: p.carte ? Math.round(p.montant * 0.02) : 0, le: maintenant(), discret: p.discret, moyen: p.moyen, mot: p.mot.trim(), organisateur: moi }] }
    if (reuni(maj) >= maj.objectif) {
      const actuel = prixLivreDe(c.p)
      maj = actuel > c.prixLivre * 1.05 ? { ...maj, etat: 'hausse', hausse: { prix: actuel, ecart: actuel - c.prixLivre } } : commanderCotisation(maj)
    }
    majCotisation(maj)
    return { ok: true, cotisation: cotisationsDe(lireEtat()).find((x) => x.id === c.id)! }
  },
  deciderHausse: async (id, choix) => {
    const c = cotisationsDe(lireEtat()).find((x) => x.id === id)!
    const maj = choix === 'completer' ? commanderCotisation({ ...c, hausse: null }) : { ...c, etat: 'remboursee' as const, fin: maintenant() }
    majCotisation(maj)
    return maj
  },
  misesDeCote: async () => {
    const e = lireEtat()
    const t = maintenant()
    // Délai de grâce dépassé : la mise de côté s'annule, versements rendus moins le forfait.
    const liste = (e.cotes ?? []).map((c) => {
      if (c.etat !== 'en_cours') return { ...c, dessin: c.dessin || CATALOGUE[c.p]?.dessins[0] || '' }
      const retard = c.versements.find((v) => !v.payeLe && v.le + 7 * J < t)
      const paye = c.versements.filter((v) => v.payeLe).reduce((n, v) => n + v.du, 0)
      const f = forfaitCote(c.prixLivre)
      return { ...c, dessin: c.dessin || CATALOGUE[c.p]?.dessins[0] || '', ...(retard ? { etat: 'annulee' as const, annulee: { le: retard.le + 7 * J, rembourse: Math.max(0, paye - f), forfait: Math.min(f, paye) } } : {}) }
    })
    return { liste, maintenant: t }
  },
  creerMiseDeCote: async (p, rythme, moyen) => {
    const pr = CATALOGUE[p]
    const t = maintenant()
    const fr = calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }])
    const prixLivre = fr.total
    const e = lireEtat()
    const c: MiseDeCote = {
      id: 'MC-' + (119 + (e.cotes ?? []).length),
      p,
      titre: pr.titre,
      dessin: pr.dessins[0] ?? '',
      prix: pr.prix,
      livraison: prixLivre - pr.prix,
      prixLivre,
      rythme,
      versements: planCote(prixLivre, rythme, t).map((v, i) => ({ n: i + 1, ...v, payeLe: i === 0 ? t : null })),
      creeLe: t,
      moyen,
      etat: 'en_cours',
      ref: null,
      annulee: null,
    }
    modifier((x) => ({ ...x, cotes: [c, ...(x.cotes ?? [])] }))
    return c
  },
  payerVersement: async (id, moyen) => {
    const t = maintenant()
    const e = lireEtat()
    const c = (e.cotes ?? []).find((x) => x.id === id)!
    const versements = c.versements.map((v) => (v.n === c.versements.find((w) => !w.payeLe)?.n ? { ...v, payeLe: t } : v))
    const fini = versements.every((v) => v.payeLe)
    let ref: string | null = null
    if (fini && c.liste) ref = commanderListe(c.liste.id, c.liste.exclus, c.liste.equivalents, moyen)
    else if (fini) {
      const nums = Array.from({ length: 300 }, (_, i) => 'BLV-' + (52360 + i))
      ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
      const commande: CommandePassee = { ref, le: t, mode: 'relais', lieu: e.relais?.nom ?? 'Relais Mvog-Ada', moyen: 'mtn', numero: moyen, comptoir: false, articles: 1, colis: 1, sousTotal: c.prix, livraison: c.livraison, frais: 0, montant: c.prixLivre, dueAuRetrait: 0, etat: 'payee', expire: t, lignes: [{ titre: c.titre, dessin: c.dessin || CATALOGUE[c.p]?.dessins[0] || '', qte: 1, prix: c.prix, boutique: CATALOGUE[c.p]?.vendeur.boutique ?? 'Boutique A' }] }
      modifier((x) => ({ ...x, passees: [commande, ...x.passees] }))
    }
    const maj = { ...c, versements, moyen, etat: fini ? ('payee' as const) : c.etat, ref }
    modifier((x) => ({ ...x, cotes: (x.cotes ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  annulerMiseDeCote: async (id) => {
    const c = (lireEtat().cotes ?? []).find((x) => x.id === id)!
    const paye = c.versements.filter((v) => v.payeLe).reduce((n, v) => n + v.du, 0)
    const f = Math.min(forfaitCote(c.prixLivre), paye)
    const maj = { ...c, etat: 'annulee' as const, annulee: { le: maintenant(), rembourse: paye - f, forfait: f } }
    modifier((x) => ({ ...x, cotes: (x.cotes ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  ventesFlash: async () => {
    const e = lireEtat()
    return { offres: offresFlash(e), alerte: !!e.alerteFlash, relais: e.relais?.nom ?? null, maintenant: maintenant() }
  },
  ajouterFlash: async (p) => {
    const e = lireEtat()
    const o = offresFlash(e).find((x) => x.p === p)
    const t = maintenant()
    if (!o || o.debut > t || o.fin <= t || o.stock <= 0) return { ok: false }
    await sourceDemo.ajouterProduit(p, {}, 1)
    modifier((x) => ({ ...x, flashVendus: { ...(x.flashVendus ?? {}), [p]: (x.flashVendus?.[p] ?? 0) + 1 }, panier: { ...x.panier, lignes: x.panier.lignes.map((l) => (l.p === p ? { ...l, prix: o.prix, flash: o.fin } : l)) } }))
    return { ok: true }
  },
  alerteFlash: async (actif) => {
    modifier((e) => ({ ...e, alerteFlash: actif }))
  },
  // ——— Échanges entre clients (DP-54 ; donnees/echanges.ts) ———
  echanges: async () => {
    const e = lireEtat()
    const liens = (e.liens ?? []).filter((l) => l.etat === 'actif').map((l) => l.prenom)
    const proches = (e.proches ?? []).map((p) => {
      const l = LISTES_PROCHES.find((x) => x.proche === p.id)
      const pub = l ? listeProche(e, l.code) : null
      return { ...p, lie: p.lie || liens.includes(p.prenom), liste: pub ? { code: pub.code, nom: pub.nom, remiseLe: pub.remiseLe, offerts: pub.articles.filter((a) => a.offert).length, articles: pub.articles.length } : null }
    })
    return { proches, suivies: e.suivies ?? [], envois: e.envoisEchange ?? [], mercis: e.mercis ?? [], colis: e.colisEchange ?? [], maintenant: maintenant() }
  },
  chercherProche: async (numero) => {
    const n = chiffres(numero).replace(/^237/, '')
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero' }
    const e = lireEtat()
    const masque = `${n.slice(0, 1)} ${n.slice(1, 3)} ·· ·· ${n.slice(-2)}`
    if (masque === e.profil.numeroMasque) return { ok: false, raison: 'moi' }
    const c = compteDe(n)
    if (c && c.cle === cleCompte(e)) return { ok: false, raison: 'moi' }
    if (c) {
      const id = 'cpt:' + c.cle
      const deja = (e.proches ?? []).find((p) => p.id === id)
      const proche: ProcheBelivay = deja ?? { id, prenom: c.prenom, numeroMasque: masque, quartier: c.quartier, lie: false, anniversaire: null, liste: null }
      if (!deja) modifier((x) => ({ ...x, proches: [...(x.proches ?? []), proche] }))
      return { ok: true, proche }
    }
    const a = ANNUAIRE[n]
    if (!a) return { ok: false, raison: 'inconnu' }
    const deja = (e.proches ?? []).find((p) => p.id === a.id)
    const proche: ProcheBelivay = deja ?? { id: a.id, prenom: a.prenom, numeroMasque: masque, quartier: a.quartier, lie: false, anniversaire: null, liste: null }
    if (!deja) modifier((x) => ({ ...x, proches: [...(x.proches ?? []), proche] }))
    return { ok: true, proche }
  },
  envoyerAuxProches: async ({ type, id }, ids) => {
    const e = lireEtat()
    const deja = (e.envoisEchange ?? []).filter((x) => x.objet === type && x.id === id).map((x) => x.proche)
    const nouveaux = (e.proches ?? []).filter((p) => ids.includes(p.id) && !deja.includes(p.id))
    const le = maintenant()
    modifier((x) => ({ ...x, envoisEchange: [...(x.envoisEchange ?? []), ...nouveaux.map((p) => ({ objet: type, id, proche: p.id, prenom: p.prenom, le, rappeleLe: null }))] }))
    for (const p of nouveaux.filter((x) => x.id.startsWith('cpt:'))) await envoyerObjet(type, id, p.id.slice(4), p.prenom)
    return { envoyes: nouveaux.length }
  },
  rappelerInvites: async (id) => {
    const e = lireEtat()
    const l = listesDe(e).find((x) => x.id === id)
    const donneurs = (l?.articles ?? []).filter((a) => a.offert).map((a) => a.offert!.par)
    const invites = (e.envoisEchange ?? []).filter((x) => x.objet === 'liste' && x.id === id && !donneurs.includes(x.prenom))
    if (!invites.length) return { ok: false, raison: 'personne' }
    const dernier = Math.max(0, ...invites.map((x) => x.rappeleLe ?? 0))
    const t = maintenant()
    if (dernier && t - dernier < RAPPEL_ECART) return { ok: false, raison: 'trop_tot', prochain: dernier + RAPPEL_ECART }
    modifier((x) => ({ ...x, envoisEchange: (x.envoisEchange ?? []).map((v) => (invites.some((i) => i.proche === v.proche && i.id === v.id && v.objet === 'liste') ? { ...v, rappeleLe: t } : v)) }))
    return { ok: true, n: invites.length }
  },
  suivreListe: async (code, suivre, rappel) => {
    const e = lireEtat()
    const l = listeProche(e, code) ?? (await sourceDemo.listePublique(code))
    modifier((x) => {
      const autres = (x.suivies ?? []).filter((s) => s.code !== code)
      if (!suivre || !l) return { ...x, suivies: autres }
      const avant = (x.suivies ?? []).find((s) => s.code === code)
      return { ...x, suivies: [...autres, { code, prenom: l.prenom, nom: l.nom, remiseLe: l.remiseLe, rappel, depuis: avant?.depuis ?? maintenant() }] }
    })
  },
  remercier: async (ref, texte) => {
    const e = lireEtat()
    const article = listesDe(e).flatMap((l) => l.articles).find((a) => a.offert?.ref === ref)
    const cot = cotisationsDe(e).find((c) => c.ref === ref)
    const colis = (e.colisEchange ?? []).find((c) => c.ref === ref)
    const pour = article?.offert?.par ?? (cot ? 'tous' : (colis?.de ?? ''))
    modifier((x) => ({ ...x, mercis: [...(x.mercis ?? []).filter((m) => m.ref !== ref), { ref, de: e.profil.prenom, pour, texte: texte.trim(), le: maintenant() }] }))
  },
  repondreColis: async (id, accepte) => {
    const c = (lireEtat().colisEchange ?? []).find((x) => x.id === id)!
    const r = accepte ? { etat: 'accepte' as const } : { etat: 'refuse' as const, ...refusColis(c) }
    const maj: ColisEchange = { ...c, ...r }
    modifier((x) => ({ ...x, colisEchange: (x.colisEchange ?? []).map((y) => (y.id === id ? maj : y)) }))
    return maj
  },
  cotiserArticleListe: async (code, p) => {
    const e = lireEtat()
    const l = listeProche(e, code) ?? (await sourceDemo.listePublique(code))
    if (!l) return { ok: false, raison: 'ferme' }
    const a = l.articles.find((x) => x.p === p)
    if (!a || a.offert) return { ok: false, raison: 'offert' }
    if (a.prix < COTISER_DES) return { ok: false, raison: 'petit' }
    const deja = cotisationArticle(e, code, p)
    if (deja && deja.etat === 'ouverte') return { ok: true, code: deja.code }
    const t = maintenant()
    const fin = Math.max(t + 3 * J, Math.min(l.remiseLe ?? t + 30 * J, t + 30 * J))
    const c = await sourceDemo.creerCotisation({ nom: `${a.titre} pour ${l.prenom}`, occasion: /anniv/i.test(l.nom) ? 'Anniversaire' : /naiss/i.test(l.nom) ? 'Naissance' : /mariage/i.test(l.nom) ? 'Mariage' : 'Autre', p, beneficiaire: l.prenom, relais: l.relais ?? 'Relais Mvog-Ada', jusqua: fin })
    majCotisation({ ...c, liste: { code, p } })
    return { ok: true, code: c.code }
  },
  envoyerPanierA: async ({ prenom, proche, relais, qui, moyen, mot }) => {
    const e = lireEtat()
    const lignes = e.panier.lignes
    if (!lignes.length) return { ok: false, raison: 'vide' }
    if (!RELAIS.some((r) => r.nom === relais && !r.plein)) return { ok: false, raison: 'relais' }
    const sousTotal = lignes.reduce((t, l) => t + l.prix * l.qte, 0)
    const sc = [...new Set(lignes.map((l) => l.boutique))].map((b) => ({ boutique: b, zone: BOUTIQUES[b]?.zone ?? b, articles: lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) }))
    const frais = calculer('relais', sc).total - sousTotal
    if (qui === 'destinataire' && !destinatairePeutPayer({ articles: sousTotal, frais }).ok) return { ok: false, raison: 'garantie' }
    const r = repartition({ articles: sousTotal, frais, qui })
    const le = maintenant()
    const ref = nouvelleRef(e, 52130)
    const commande: CommandePassee = { ref, le, mode: 'relais', lieu: relais, moyen: 'mtn', numero: moyen, comptoir: false, articles: lignes.reduce((n, l) => n + l.qte, 0), colis: sc.length, sousTotal, livraison: qui === 'payeur' ? frais : 0, frais: 0, montant: r.payeurMaintenant, dueAuRetrait: 0, etat: 'payee', expire: le, lignes: lignes.map((l) => ({ titre: l.titre, dessin: l.dessin, qte: l.qte, prix: l.prix, boutique: l.boutique })), pour: { prenom: prenom.trim(), relais, qui, fraisRemise: r.destinataireALaRemise, garantie: r.garantie } }
    modifier((x) => ({ ...x, passees: [commande, ...x.passees], panier: { ...x.panier, lignes: [] }, compteurs: { ...x.compteurs, commandes: x.compteurs.commandes + 1 } }))
    ajouterColis({ ref, origine: 'panier', sens: 'envoye', de: e.profil.prenom, pour: prenom.trim(), titre: lignes.length > 1 ? `${lignes[0].titre} +${lignes.length - 1}` : lignes[0].titre, dessin: lignes[0].dessin, articles: sousTotal, frais, qui, relais, mot: mot.trim(), etat: qui === 'destinataire' ? 'a_accepter' : 'accepte', le })
    // Le proche a un compte : le colis l'attend dans ses Reçus (accepter ; ce qu'il paiera au retrait, avant).
    if (proche?.startsWith('cpt:')) await sourceDemo.envoyerRecu({ type: 'colis', a: proche.slice(4), prenom, titre: lignes.length > 1 ? `${lignes[0].titre} +${lignes.length - 1}` : lignes[0].titre, lignes: lignes.map((l) => ({ p: l.p, titre: l.titre, dessin: l.dessin, qte: l.qte, prix: l.prix, livraison: 0, offertPar: null })), frais, qui, ref, lieu: relais, mot })
    return { ok: true, ref }
  },
  listes: async () => {
    const e = lireEtat()
    return { listes: listesDe(e), relais: e.relais?.nom ?? null, maintenant: maintenant() }
  },
  creerListe: async ({ nom, mode, remiseLe, surprise, occasion = null, hotes = [], cagnotte = null }) => {
    const e = lireEtat()
    const l: ListeEnvies = { id: 'l' + ((e.listes ?? []).length + 1) + '-' + Math.round(maintenant() / 1000).toString(36), nom: nom.trim(), favoris: false, mode, remiseLe, surprise, destination: 'moi', relais: e.relais?.nom ?? null, tiers: null, partage: null, demarree: false, articles: [], occasion, hotes: hotes.map((h) => h.trim()).filter(Boolean).slice(0, 4), cagnotte: cagnotte && cagnotte.objectif >= 10000 ? { titre: cagnotte.titre.trim() || 'Cagnotte', objectif: Math.round(cagnotte.objectif), participations: [] } : null }
    modifier((x) => ({ ...x, listes: [...(x.listes ?? []), l] }))
    return l
  },
  ajouterArticleListe: async (id, p) => {
    if (id === 'favoris') {
      if (!lireEtat().favoris.some((f) => f.p === p)) await sourceDemo.basculerFavori(p)
      // Liste déjà partagée : l'article arrive chez les proches au prix d'aujourd'hui.
      const prix = CATALOGUE[p]?.prix
      if (prix !== undefined) modifier((e) => (e.partageFavoris && e.partageFavoris.prix?.[p] === undefined ? { ...e, partageFavoris: { ...e.partageFavoris, prix: { ...e.partageFavoris.prix, [p]: prix } } } : e))
      return
    }
    const a = articleListe(p)
    if (a) majListe(id, (l) => (l.articles.some((x) => x.p === p) ? l : { ...l, articles: [...l.articles, a], partage: l.partage && { ...l.partage, prix: { ...l.partage.prix, [p]: a.prix } } }))
  },
  retirerArticleListe: async (id, p) => {
    if (id === 'favoris') {
      if (lireEtat().favoris.some((f) => f.p === p)) await sourceDemo.basculerFavori(p)
      return { ok: true }
    }
    const l = (lireEtat().listes ?? []).find((x) => x.id === id)
    if (l?.articles.find((x) => x.p === p)?.offert) return { ok: false }
    majListe(id, (x) => ({ ...x, articles: x.articles.filter((a) => a.p !== p) }))
    return { ok: true }
  },
  reglerListe: async (id, r) => {
    // La liste par défaut (les favoris) garde ses réglages à part ; aucun cadeau n'y est jamais « offert ».
    if (id === 'favoris') {
      modifier((e) => ({ ...e, reglagesFavoris: { ...(e.reglagesFavoris ?? {}), ...r } }))
      return
    }
    majListe(id, (l) => (l.articles.some((a) => a.offert) ? { ...l, surprise: r.surprise ?? l.surprise } : { ...l, ...r, relais: r.destination === 'moi' ? (lireEtat().relais?.nom ?? null) : r.tiers ? r.tiers.relais : l.relais }))
  },
  partagerListe: async (id) => {
    const t = maintenant()
    const code = (id === 'favoris' ? 'f' : '') + Math.abs([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).slice(0, 6)
    // Les prix du jour sont relevés au partage : les proches les voient, avec l'écart si le prix bouge ensuite.
    const avant = listesDe(lireEtat()).find((l) => l.id === id)
    const partage = { code, le: t, jusqua: t + 30 * J, prix: Object.fromEntries((avant?.articles ?? []).map((a) => [a.p, a.prix])) }
    if (id === 'favoris') modifier((e) => ({ ...e, partageFavoris: e.partageFavoris ?? partage }))
    else majListe(id, (l) => ({ ...l, partage: l.partage ?? partage }))
    return listesDe(lireEtat()).find((l) => l.id === id)!
  },
  arreterPartage: async (id) => {
    if (id === 'favoris') modifier((e) => ({ ...e, partageFavoris: null }))
    else majListe(id, (l) => ({ ...l, partage: null }))
  },
  demarrerListe: async (id) => majListe(id, (l) => ({ ...l, demarree: true })),
  listePublique: async (code) => {
    const e = lireEtat()
    const l = listesDe(e).find((x) => x.partage?.code === code)
    if (!l) return listeProche(e, code)
    if (!l.partage || l.partage.jusqua < maintenant()) return null
    const quartier = (l.relais ?? '').replace(/^Relais /, '') || 'Yaoundé'
    const parts = l.cagnotte?.participations ?? []
    return { code, prenom: e.profil.prenom, nom: l.nom, quartier, relais: l.relais, mode: l.mode, remiseLe: l.remiseLe, jusqua: l.partage.jusqua, destination: l.destination, partageLe: l.partage.le, articles: l.articles.map((a) => ({ ...a, offert: !!a.offert })), domicile: domicileListe(e, l), occasion: l.occasion ?? null, hotes: l.hotes ?? [], cagnotte: l.cagnotte ? { titre: l.cagnotte.titre, objectif: l.cagnotte.objectif, reuni: parts.reduce((n, p) => n + p.montant, 0), participants: parts.length } : null }
  },
  offrirArticleListe: async (code, p, o) => {
    const e = lireEtat()
    const l = listesDe(e).find((x) => x.partage?.code === code)
    const pub = l ? null : listeProche(e, code)
    if (l && (!l.partage || l.partage.jusqua < maintenant())) return { ok: false, raison: 'ferme' }
    if (!l && !pub) return { ok: false, raison: 'ferme' }
    const a = l ? l.articles.find((x) => x.p === p) : pub!.articles.find((x) => x.p === p)
    // Article déjà offert, ou en cotisation ouverte : on y participe, on ne l'offre plus seul.
    if (!a || a.offert || (a.cotisation && a.cotisation.reuni < a.cotisation.objectif)) return { ok: false, raison: 'offert' }
    // Hausse depuis le prix validé : rien n'est débité, le nouveau prix est montré avant de payer (CLE-39).
    if (a.prix > o.prixVu) return { ok: false, raison: 'prix', prix: a.prix }
    // Livraison chez le destinataire : seulement s'il l'accepte (l'adresse reste chez BelivaY, jamais montrée).
    const livraison = o.livraison ?? 'relais'
    if (livraison === 'domicile' && !(l ? domicileListe(e, l) : pub!.domicile)) return { ok: false, raison: 'domicile' }
    const fraisLiv = livraison === 'domicile' ? (a.livraisonDomicile ?? a.livraison) : a.livraison
    // Qui paie la livraison (donnees/echanges.ts) : « le destinataire » seulement si la garantie couvre le pire cas.
    const qui = o.qui ?? 'payeur'
    if (qui === 'destinataire' && !destinatairePeutPayer({ articles: a.prix, frais: fraisLiv }).ok) return { ok: false, raison: 'garantie' }
    const r = repartition({ articles: a.prix, frais: fraisLiv, qui })
    const le = maintenant()
    const carte = !!o.carte || o.moyen.startsWith('Carte') || o.moyen.startsWith('Visa') || o.moyen.startsWith('Mastercard')
    const fraisCarte = carte ? Math.round(r.payeurMaintenant * 0.02) : 0 // frais de service carte (2 %)
    // Carte depuis l'étranger : mêmes plafonds et même contrôle de cohérence qu'un compte diaspora, l'historique
    // étant celui des cadeaux payés avec la même adresse e-mail ; le pays « du compte » est celui où vit l'offrant.
    const email = o.email.trim().toLowerCase()
    if (o.carte) {
      const montant = r.payeurMaintenant + fraisCarte
      const historique = (e.cadeauxCarte ?? []).filter((x) => x.email === email)
      const mois = historique.filter((x) => x.le >= debutMois(le)).reduce((n, x) => n + x.montant, 0)
      if (montant > PLAFONDS_DIASPORA.paiement || mois + montant > PLAFONDS_DIASPORA.mois) return { ok: false, raison: 'plafond' }
      const controle = controleDiaspora({ paysCarte: o.carte.jeton.pays ?? paysDuBin(o.carte.jeton.bin) ?? o.carte.paysCarte, paysCompte: o.carte.pays, montant, historique, maintenant: le })
      if (controle.decision === 'refuse') return { ok: false, raison: 'coherence', controle }
      if (controle.decision === 'renforce' && (o.carte.codeEmail !== CODE_EMAIL || envoiDiaspora.email !== email)) return { ok: false, raison: 'verification', controle }
      envoiDiaspora.email = null
    }
    const ref = nouvelleRef(e, 52140)
    const surprise = !!l?.surprise
    const prenom = l ? e.profil.prenom : pub!.prenom
    const relais = (l ? l.relais : pub!.relais) ?? 'Relais Mvog-Ada'
    const commande: CommandePassee = {
      ref,
      le,
      mode: livraison,
      lieu: livraison === 'domicile' ? `Chez ${prenom}` : relais,
      moyen: carte ? 'carte' : 'mtn',
      numero: o.moyen,
      comptoir: false,
      articles: 1,
      colis: 1,
      sousTotal: a.prix,
      livraison: qui === 'payeur' ? fraisLiv : 0,
      frais: fraisCarte,
      montant: r.payeurMaintenant + fraisCarte,
      dueAuRetrait: 0,
      etat: 'payee',
      expire: le,
      lignes: [{ titre: surprise ? 'Cadeau surprise' : a.titre, dessin: surprise ? '' : a.dessin, qte: 1, prix: a.prix, boutique: CATALOGUE[p]?.vendeur.boutique ?? 'Boutique A' }],
      payeur: { prenom: o.prenom, email: o.email, carte: o.moyen, devise: o.devise ?? 'EUR', le },
      pour: { prenom, relais, qui, fraisRemise: r.destinataireALaRemise, garantie: r.garantie },
    }
    const offert = { par: o.prenom, le, ref, qui }
    if (o.carte) modifier((x) => ({ ...x, cadeauxCarte: [...(x.cadeauxCarte ?? []), { email, le, montant: r.payeurMaintenant + fraisCarte }] }))
    if (l?.favoris) modifier((x) => ({ ...x, passees: [commande, ...x.passees], favoris: x.favoris.filter((f) => f.p !== p) }))
    else if (l) {
      modifier((x) => ({ ...x, passees: [commande, ...x.passees] }))
      majListe(l.id, (y) => ({ ...y, articles: y.articles.map((z) => (z.p === p ? { ...z, offert } : z)) }))
    } else modifier((x) => ({ ...x, passees: [commande, ...x.passees], offertsProches: { ...(x.offertsProches ?? {}), [code]: { ...(x.offertsProches?.[code] ?? {}), [p]: offert } } }))
    // Le colis vu des deux côtés : reçu (ma liste : je le vois et j'accepte si la livraison est pour moi), envoyé (la liste d'un proche).
    ajouterColis({ ref, origine: 'liste', sens: l ? 'recu' : 'envoye', de: o.prenom, pour: prenom, titre: surprise ? 'Cadeau surprise' : a.titre, dessin: surprise ? '' : a.dessin, articles: a.prix, frais: fraisLiv, qui, relais, etat: qui === 'destinataire' ? 'a_accepter' : 'accepte', le })
    return { ok: true, ref }
  },
  // Cagnotte d'une liste (mariage : voyage de noces), sans compte : dès 1 000 F, au plus ce qui manque.
  participerCagnotteListe: async (code, p) => {
    const e = lireEtat()
    const pub = await sourceDemo.listePublique(code)
    if (!pub?.cagnotte) return { ok: false, raison: 'ferme' }
    const manque = Math.max(0, pub.cagnotte.objectif - pub.cagnotte.reuni)
    if (!manque) return { ok: false, raison: 'ferme' }
    if (!p.prenom.trim() || p.montant < Math.min(1000, manque) || p.montant > manque) return { ok: false, raison: 'montant' }
    const part = { prenom: p.prenom.trim(), montant: Math.round(p.montant), le: maintenant(), mot: p.mot.trim(), discret: p.discret }
    const mienne = listesDe(e).find((l) => l.partage?.code === code)
    if (mienne) majListe(mienne.id, (l) => (l.cagnotte ? { ...l, cagnotte: { ...l.cagnotte, participations: [...l.cagnotte.participations, part] } } : l))
    else modifier((x) => ({ ...x, cagnottesProches: { ...(x.cagnottesProches ?? {}), [code]: [...(x.cagnottesProches?.[code] ?? []), part] } }))
    return { ok: true, reuni: pub.cagnotte.reuni + part.montant }
  },
  // Reçus (DP-54) : src/demo/reseau.ts.
  ...methodesRecus({
    offrirSurListe: (code, p, o) => sourceDemo.offrirArticleListe(code, p, o),
    participerCagnotte: (code, p) => sourceDemo.participerCagnotteListe(code, p),
    procheConnu: (n) => ANNUAIRE[n]?.prenom ?? null,
  }),
  envoyerCodeCadeau: async (_code, email) => sourceDemo.envoyerCodeDiaspora('email', email),
  suiviCadeau: async (code, ref) => {
    const e = lireEtat()
    const cmd = e.passees.find((x) => x.ref === ref && x.payeur && x.pour)
    if (!cmd || !cmd.pour) return null
    const pub = await sourceDemo.listePublique(code)
    const c = (await sourceDemo.commandeClient(ref))?.commande ?? null
    const t = maintenant()
    const arrive = !!c && (['retirable', 'comptoir', 'retiree'] as string[]).includes(c.etat)
    const merci = (e.mercis ?? []).find((m) => m.ref === ref)
    return {
      ref,
      pour: cmd.pour.prenom,
      livraison: cmd.mode,
      lieu: cmd.mode === 'domicile' ? (pub?.domicile?.ville ?? 'Yaoundé') : cmd.pour.relais.replace(/^Relais /, ''),
      payeLe: cmd.le,
      montant: cmd.montant,
      moyen: cmd.numero ?? '',
      devise: cmd.moyen === 'carte' ? (cmd.payeur?.devise ?? 'EUR') : 'XAF',
      prepareLe: arrive ? (c!.arriveeLe ?? cmd.le + 3 * H) : t > cmd.le + 3 * H ? cmd.le + 3 * H : null,
      arriveLe: arrive ? (c!.arriveeLe ?? c!.pretLe ?? null) : null,
      remisLe: c?.retireeLe ?? null,
      rembourse: c?.annulee?.rembourse ?? null,
      merci: merci ? { de: merci.de, texte: merci.texte, le: merci.le } : null,
      maintenant: t,
    }
  },
  partagerStatutListe: async (id, canal) => {
    const l = await sourceDemo.partagerListe(id)
    const le = maintenant()
    majListe(id, (x) => ({ ...x, statuts: [...(x.statuts ?? []), { canal, le }].slice(-20) }))
    return { code: l.partage!.code, jusqua: l.partage!.jusqua }
  },
  prime: async (scenario) => {
    // Démonstration d'un prélèvement refusé (prototype : « mon-abonnement?st=grace ») : le renouvellement d'un
    // abonnement payé a échoué il y a 2 jours (grâce en cours) ou il y a 8 jours (grâce finie, palier Gratuit).
    if (scenario)
      modifier((x) => {
        const a = x.abonnement
        if (!a || a.echec || a.resilie || a.offertPar || a.palier === 'pass') return x
        const p = palier(a.palier)!
        const le = maintenant() - (scenario === 'grace' ? 2 : GRACE + 1) * J
        const montant = a.formule === 'an' ? p.an : p.mois
        const periode = (a.formule === 'an' ? 365 : 30) * J
        return { ...x, abonnement: { ...a, debut: Math.min(a.debut, le - periode), prochain: null, montant, echec: { le, moyen: a.moyen, montant, tentatives: scenario === 'grace' ? 2 : 3 } } }
      })
    const e = lireEtat()
    const a = e.abonnement ?? null
    const t = maintenant()
    const debutMois = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), 1)
    const duMois = e.passees.filter((c) => c.etat === 'payee' && c.le >= debutMois)
    const servies = duMois.filter((c) => (c.prime ?? 0) > 0)
    const depuis = a ? e.passees.filter((c) => c.etat === 'payee' && c.le >= a.debut && (c.prime ?? 0) > 0) : []
    const cg = cagnotteDe(e)
    const versees = cg.versees.filter((x) => (e.cagnottesVersees ?? []).includes(x.ref)).reduce((n, x) => n + x.montant, 0)
    const filleuls = e.filleuls ?? []
    return {
      abonnement: a,
      actif: !!abonnementActif(e),
      essaiUtilise: !!e.essaiUtilise,
      usage: { relais: servies.filter((c) => c.mode === 'relais').length, domicile: servies.filter((c) => c.mode === 'domicile').length, total: duMois.length },
      economies: {
        relais: depuis.filter((c) => c.mode === 'relais').reduce((n, c) => n + (c.prime ?? 0), 0),
        domicile: depuis.filter((c) => c.mode === 'domicile').reduce((n, c) => n + (c.prime ?? 0), 0),
        nbRelais: depuis.filter((c) => c.mode === 'relais').length,
        nbDomicile: depuis.filter((c) => c.mode === 'domicile').length,
      },
      cagnotte: { disponible: 0, versee: versees, attente: cg.attente },
      parrainage: { lien: 'belivay.com/p/7KD3QA', filleuls, recompensesMois: filleuls.filter((f) => f.etat === 'retiree' && f.le >= debutMois).length, moisGagnes: filleuls.filter((f) => f.etat === 'retiree').length },
      business: e.business ?? 'aucune',
      maintenant: t,
    }
  },
  souscrire: async ({ palier: id, formule, moyen }) => {
    const e = lireEtat()
    const t = maintenant()
    const p = id === 'pass' ? null : palier(id)!
    const essai = id === 'prime' && formule === 'mois' && !e.essaiUtilise
    const ab: Abonnement =
      id === 'pass'
        ? { palier: 'pass', formule: 'pass', debut: t, prochain: null, montant: PASS.prix, moyen, resilie: null, fin: t + PASS.jours * J, offertPar: null, echec: null, messageCadeau: null }
        : { palier: id, formule, debut: t, prochain: t + (formule === 'an' ? 365 : 30) * J, montant: formule === 'an' ? p!.an : p!.mois, moyen, resilie: null, fin: null, offertPar: null, echec: null, messageCadeau: null }
    modifier((x) => ({ ...x, abonnement: ab, essaiUtilise: x.essaiUtilise || essai }))
    return ab
  },
  resilierAbonnement: async () => {
    modifier((e) => (e.abonnement ? { ...e, abonnement: { ...e.abonnement, resilie: maintenant(), fin: e.abonnement.echec ? finGrace(e.abonnement.echec.le) : (e.abonnement.prochain ?? e.abonnement.fin), prochain: null, echec: null } } : e))
  },
  reprendreAbonnement: async () => {
    modifier((e) => (e.abonnement && e.abonnement.resilie ? { ...e, abonnement: { ...e.abonnement, resilie: null, prochain: e.abonnement.fin, fin: null } } : e))
  },
  // Après un prélèvement refusé : pendant la grâce, la période payée part du jour du renouvellement refusé ;
  // grâce finie (palier Gratuit), elle part du jour du paiement. Le numéro payé sert aux prochains prélèvements.
  payerAbonnement: async (moyen) => {
    const t = maintenant()
    const a = lireEtat().abonnement!
    const p = a.palier === 'pass' ? null : palier(a.palier)
    const montant = p ? (a.formule === 'an' ? p.an : p.mois) : a.montant
    const depart = a.echec && finGrace(a.echec.le) >= t ? a.echec.le : t
    const ab: Abonnement = { ...a, moyen, montant, prochain: depart + (a.formule === 'an' ? 365 : 30) * J, resilie: null, fin: null, echec: null }
    modifier((x) => ({ ...x, abonnement: ab }))
    return ab
  },
  changerMoyenAbonnement: async (moyen) => {
    modifier((e) => (e.abonnement ? { ...e, abonnement: { ...e.abonnement, moyen } } : e))
  },
  offrirAbonnement: async ({ numero, prenom, palier: id, mois, message, carte }) => {
    const n = chiffres(numero)
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'inconnu' }
    const e = lireEtat()
    const t = maintenant()
    const autre = compteDe(n)
    const pourCeCompte = autre ? autre.cle === cleCompte(e) : n.startsWith('677') && n.endsWith('41')
    // Un autre compte de l'appareil : l'abonnement offert l'attend dans ses Reçus (il l'accepte, il commence alors).
    if (autre && !pourCeCompte) {
      const nomP = id === 'duo' ? 'Prime Duo' : id === 'plus' ? 'Plus' : 'Prime'
      await sourceDemo.envoyerRecu({ type: 'abonnement', a: n, prenom, titre: `${nomP} offert pendant ${mois === 12 ? '1 an' : mois + ' mois'}`, detail: `${nomP} · ${mois === 12 ? '12 mois' : mois + ' mois'} · offert, sans prélèvement ensuite`, mot: message, jusqua: t + 30 * J })
    }
    const ref = 'CAD-' + Math.round(t / 1000).toString(36).toUpperCase().slice(-6)
    let du: number | null = null
    let au: number | null = null
    // Le cadeau commence à la fin de l'abonnement en cours (ou tout de suite) ; aucun prélèvement ensuite.
    if (pourCeCompte) {
      const actuel = abonnementActif(e)
      const debut = actuel?.fin ?? actuel?.prochain ?? t
      const fin = debut + (mois === 12 ? 365 : mois * 30) * J
      du = debut
      au = fin
      modifier((x) => ({ ...x, abonnement: { palier: id, formule: mois === 12 ? 'an' : 'mois', debut: Math.min(t, debut), prochain: null, montant: 0, moyen: libelleCarte(carte), resilie: null, fin, offertPar: prenom, echec: null, messageCadeau: message.trim() || null } }))
    }
    return { ok: true, pourCeCompte, ref, le: t, du, au }
  },
  verserCagnotte: async () => 0,
  demanderBusiness: async () => {
    modifier((e) => ({ ...e, business: 'envoyee' }))
  },
  choisirInterets: async (univers) => {
    modifier((e) => ({ ...e, interets: univers }))
  },
  paniersPartages: async () => lireEtat().partages ?? [],
  panierPartage: async (id) => (lireEtat().partages ?? []).find((p) => p.id === id) ?? null,
  payerPanierPartage: async (id, p) => {
    const e = lireEtat()
    const pp = (e.partages ?? []).find((x) => x.id === id)!
    if (pp.ref) return pp
    const nums = Array.from({ length: 200 }, (_, i) => 'BLV-' + (52124 + i))
    const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
    const le = maintenant()
    const payeur = { ...p, carte: libelleCarte(p.carte), le }
    const commande: CommandePassee = {
      ref,
      le,
      mode: 'relais',
      lieu: pp.relais,
      moyen: 'carte',
      numero: payeur.carte,
      comptoir: false,
      articles: pp.lignes.reduce((n, l) => n + l.qte, 0),
      colis: new Set(pp.lignes.map((l) => l.boutique)).size,
      sousTotal: pp.sousTotal,
      livraison: pp.livraison,
      frais: pp.frais,
      montant: pp.total,
      dueAuRetrait: 0,
      etat: 'payee',
      expire: le,
      lignes: pp.lignes,
      payeur,
    }
    const fin = { ...pp, ref, payeur }
    // Les articles payés quittent le panier du client.
    const payes = new Set(pp.lignes.map((l) => l.titre + '|' + l.boutique))
    modifier((x) => ({ ...x, passees: [commande, ...x.passees], partages: (x.partages ?? []).map((y) => (y.id === id ? fin : y)), panier: { ...x.panier, lignes: x.panier.lignes.filter((l) => !payes.has(l.titre + '|' + l.boutique)) } }))
    return fin
  },
  deposerRetour: async (id) => {
    const le = maintenant()
    modifier((e) => ({ ...e, litiges: e.litiges.map((l) => (l.id === id && l.retour ? { ...l, retour: { ...l.retour, etape: 'depose', dates: { ...l.retour.dates, depose: le }, avant: le + 48 * H } } : l)) }))
  },
  choisirRemplacement: async (id, autreVendeur) => {
    const le = maintenant()
    const ref = lireEtat().litiges.find((l) => l.id === id)?.ref
    if (!autreVendeur && ref) majCommande(ref, () => ({ etat: 'retiree', litige: null }))
    const l0 = lireEtat().litiges.find((l) => l.id === id)
    if (!autreVendeur && l0?.remplacement) crediterRemboursement(l0.montant, `Remboursement ${id} · ${l0.produit}`, COMMANDES_LITIGE[l0.ref]?.payePar ?? payePar(l0.ref))
    modifier((e) => ({
      ...e,
      litiges: e.litiges.map((l) =>
        l.id === id && l.remplacement
          ? autreVendeur
            ? { ...l, etat: 'remplace', remplacement: { ...l.remplacement, etape: 'expedie', dates: { ...l.remplacement.dates, expedie: le }, avant: le + 48 * H } }
            : { ...l, etat: 'rembourse', remplacement: undefined, decision: { le, motif: `Le vendeur n’a plus l’article : ${F(l.montant)} F remboursés à ta demande.` } }
          : l,
      ),
    }))
  },
  retirerLitige: async (id) => {
    modifier((e) => ({ ...e, litiges: e.litiges.map((l) => (l.id === id ? { ...l, etat: 'retire' } : l)), compteurs: { ...e.compteurs, litiges: Math.max(0, e.compteurs.litiges - 1) } }))
  },
  favoris: async () => {
    const e = lireEtat()
    return { favoris: e.favoris, verifieLe: maintenant() }
  },
  retirerFavori: async (id) => {
    modifier((e) => ({ ...e, favoris: e.favoris.filter((f) => f.id !== id), compteurs: { ...e.compteurs, sauvegardes: Math.max(0, e.compteurs.sauvegardes - 1) } }))
  },
  remettreFavori: async (f) => {
    modifier((e) => ({ ...e, favoris: [f, ...e.favoris.filter((x) => x.id !== f.id)], compteurs: { ...e.compteurs, sauvegardes: e.compteurs.sauvegardes + 1 } }))
  },
  reglerAlerteFavori: async (id, k, actif) => {
    modifier((e) => ({ ...e, favoris: e.favoris.map((f) => (f.id === id ? { ...f, alertes: { ...f.alertes, [k]: actif } } : f)) }))
  },
  favoriAuPanier: async (id) => {
    modifier((e) => {
      const f = e.favoris.find((x) => x.id === id)
      if (!f) return e
      const ligne: LignePanier = { id: 'l' + Date.now().toString(36), p: f.p, titre: f.titre, variante: f.variante, dessin: f.dessin, prix: f.prix, qte: 1, stock: 5, classe: 'S', boutique: 'Boutique A' }
      return { ...e, favoris: e.favoris.filter((x) => x.id !== id), panier: { ...e.panier, lignes: [...e.panier.lignes, ligne] }, compteurs: { ...e.compteurs, sauvegardes: Math.max(0, e.compteurs.sauvegardes - 1) } }
    })
  },
  relaisListe: async () => ({ relais: RELAIS, habituel: relaisDeReference(lireEtat()) }),
  choisirRelais: async (nom) => {
    const r = RELAIS.find((x) => x.nom === nom)
    if (!r) return
    modifier((e) => ({ ...e, relais: { nom: r.nom, gerant: r.gerant, horaires: r.horaires, acces: `${String(r.km).replace('.', ',')} km` } }))
  },
  contenuAccueil: async () => CONTENU_ACCUEIL,
  produit: async (p) => (CATALOGUE[p] ? avecDistance(CATALOGUE[p]) : null),
  produits: async () => {
    const e = lireEtat()
    return Object.values(CATALOGUE).map((pr) => avecDistance(pr, e))
  },
  ajouterProduit: async (p, choix, qte, boutique) => {
    const pr = CATALOGUE[p]
    if (!pr) return
    const autre = boutique && pr.autres.find((a) => a.boutique === boutique)
    const b = autre ? autre.boutique : pr.vendeur.boutique
    const options = pr.options.map((o) => ({ ...o, choisi: choix[o.nom] ?? o.choisi }))
    const prix = autre ? autre.prix : options.reduce((x, o) => o.prix?.[o.choisi] ?? x, pr.prix)
    const variante = options.length ? options.map((o) => (o.nom === 'Taille' ? 'Taille ' + o.choisi : o.nom === 'Pointure' ? 'Pointure ' + o.choisi : o.choisi)).join(' · ') : (pr.variante ?? null)
    if (!BOUTIQUES[b]) BOUTIQUES[b] = { zone: autre ? autre.zone : pr.vendeur.zone, delai: '5\u00A0h', palier: `Vendeur certifié · Trust Score ${autre ? autre.score : pr.vendeur.score}`, suggestions: [] }
    modifier((e) => {
      const deja = e.panier.lignes.find((l) => l.p === p && l.boutique === b && l.variante === variante)
      const lignes = deja
        ? e.panier.lignes.map((l) => (l === deja ? { ...l, qte: Math.min(l.qte + qte, l.stock) } : l))
        : [...e.panier.lignes, { id: 'l' + Date.now().toString(36), p, titre: pr.titre, variante, dessin: pr.dessins[0], prix, qte: Math.min(qte, pr.stock), stock: pr.stock, classe: pr.classe, boutique: b, options, offres: avecDistance(pr).autres.filter((a) => a.boutique !== b) }]
      return { ...e, panier: { ...e.panier, lignes } }
    })
  },
  basculerFavori: async (p) => {
    const e = lireEtat()
    const f = e.favoris.find((x) => x.p === p)
    if (f) {
      modifier((x) => ({ ...x, favoris: x.favoris.filter((y) => y.p !== p), compteurs: { ...x.compteurs, sauvegardes: Math.max(0, x.compteurs.sauvegardes - 1) } }))
      return false
    }
    const pr = CATALOGUE[p]
    if (!pr) return false
    const nf: Favori = { id: 'f' + Date.now().toString(36), p, titre: pr.titre, variante: pr.variante ?? null, dessin: pr.dessins[0], prix: pr.prix, prixAvant: null, retrait: 900, stock: pr.stock ? 'ok' : 'rupture', alertes: { prix: true, stock: true }, ajouteLe: maintenant() }
    modifier((x) => ({ ...x, favoris: [nf, ...x.favoris], compteurs: { ...x.compteurs, sauvegardes: x.compteurs.sauvegardes + 1 } }))
    return true
  },
  avisProduit: async (p) => {
    const pr = CATALOGUE[p]
    if (!pr) return null
    const votes = lireEtat().votesAvis ?? {}
    const note = Number((pr.note ?? '4').replace(',', '.'))
    // Répartition 5 → 1 étoiles, cohérente avec la note moyenne.
    const cinq = Math.round(Math.max(0, Math.min(90, (note - 3.2) * 50)))
    const quatre = Math.round((100 - cinq) * 0.65)
    const reste = 100 - cinq - quatre
    const repartition = [cinq, quatre, Math.round(reste * 0.55), Math.round(reste * 0.3), reste - Math.round(reste * 0.55) - Math.round(reste * 0.3)]
    const textes = AVIS_TEXTES[p] ?? AVIS_TEXTES[pr.univers] ?? AVIS_TEXTES.defaut
    const avis: AvisProduit[] = textes.map((x, i) => {
      const id = p + '-' + i
      const v = votes[id] ?? { utile: false, signale: false }
      return { id, note: x[0], le: Date.UTC(2026, 8, 21 - i * 4, 9), variante: pr.options.length ? pr.options.map((o) => o.valeurs[(i + o.valeurs.indexOf(o.choisi)) % o.valeurs.length]).join(' · ') : null, texte: x[1], photo: i < 3 ? (pr.dessins[(i + 1) % pr.dessins.length] ?? null) : null, utiles: 3 + ((i * 7) % 11) + (v.utile ? 1 : 0), monVote: v.utile, signale: v.signale, reponse: x[0] <= 2 ? 'Merci pour ton retour. Écris-nous dans la messagerie : on trouve une solution.' : null }
    })
    return { repartition, avis }
  },
  voterAvis: async (_p, id, action) => {
    modifier((e) => {
      const votes = { ...(e.votesAvis ?? {}) }
      const v = votes[id] ?? { utile: false, signale: false }
      votes[id] = action === 'utile' ? { ...v, utile: !v.utile } : { ...v, signale: true }
      return { ...e, votesAvis: votes }
    })
  },
  commandes: async () => ({ commandes: toutesCommandes(), maintenant: maintenant() }),
  commandeClient: async (ref) => {
    const c = toutesCommandes().find((x) => x.ref === ref)
    return c ? { commande: c, maintenant: maintenant() } : null
  },
  racheter: async (ref) => {
    const c = toutesCommandes().find((x) => x.ref === ref)
    if (!c) return 0
    for (const x of c.colis) if (CATALOGUE[x.p]) await sourceDemo.ajouterProduit(x.p, {}, x.qte)
    return c.colis.filter((x) => CATALOGUE[x.p]).length
  },
  payerAuComptoir: async (ref) => majCommande(ref, (c) => ({ comptoir: c.comptoir ? { ...c.comptoir, du: 0 } : null, garde: c.garde ? { ...c.garde, du: 0 } : null, etat: 'retirable' })),
  confirmerRetrait: async (ref) => {
    majCommande(ref, (c) => ({
      etat: 'retiree',
      retireeLe: maintenant(),
      retourJusqua: maintenant() + 7 * 24 * H,
      code: null,
      garde: null,
      etapes: c.etapes.map((e, i) => (i === c.etapes.length - 1 ? { ...e, le: maintenant() } : e)),
    }))
    // La cagnotte de l'abonnement est versée au Portefeuille dès le retrait.
    const m = cagnotteDe(lireEtat()).versees.find((x) => x.ref === ref)
    if (m && m.montant && !(lireEtat().cagnottesVersees ?? []).includes(ref))
      modifier((e) => ({
        ...e,
        cagnottesVersees: [...(e.cagnottesVersees ?? []), ref],
        portefeuille: { ...e.portefeuille, rembourse: e.portefeuille.rembourse + m.montant, historique: [{ id: 'cg-' + ref, type: 'cagnotte', libelle: `Cagnotte 2 % · ${ref}`, le: maintenant(), montant: m.montant }, ...e.portefeuille.historique] },
      }))
  },
  deleguerRetrait: async (ref, prenom, numero) => {
    majCommande(ref, () => ({ delegue: numero ? { prenom, numero } : null }))
    // Un proche qui a un compte : le retrait confié arrive dans ses Reçus (le code, le relais, le colis).
    const c = numero ? toutesCommandes().find((x) => x.ref === ref) : null
    if (c && numero && compteDe(numero) && compteDe(numero)!.cle !== cleCompte(lireEtat()))
      await sourceDemo.envoyerRecu({ type: 'code-retrait', a: numero, prenom, titre: `Retirer le colis de ${lireEtat().profil.prenom}`, lieu: c.lieu, code: c.code ? c.code.replace(/^(\d{3})(\d{3})$/, '$1 $2') : null, ref, lignes: c.colis.map((k) => ({ p: k.p || null, titre: k.produit, dessin: k.dessin, qte: k.qte, prix: k.prix, livraison: 0, offertPar: null })), jusqua: maintenant() + 3 * J })
  },
  notificationsClient: async () => ({ notifications: notificationsDe(lireEtat()), maintenant: maintenant() }),
  lireNotification: async (id) => {
    const toutes = (await sourceDemo.notificationsClient()).notifications.map((n) => n.id)
    modifier((e) => ({ ...e, notifsLues: id === 'toutes' ? toutes : [...new Set([...(e.notifsLues ?? []), id])] }))
  },
  panier: async () => {
    const e = lireEtat()
    const a = e.adresses.find((x) => x.principale) ?? e.adresses[0]
    return {
      mode: e.panier.mode,
      lignes: e.panier.lignes,
      // « Ajouter de cette boutique, sans ramassage en plus » : 3 produits en stock de la même boutique, pas déjà
      // au panier, les plus vendus d'abord.
      boutiques: Object.fromEntries(
        Object.entries(BOUTIQUES).map(([b, info]) => [
          b,
          {
            ...info,
            suggestions: Object.values(CATALOGUE)
              .filter((pr) => pr.vendeur.boutique === b && pr.stock > 0 && !e.panier.lignes.some((l) => l.p === pr.p))
              .sort((x, y) => y.ventes - x.ventes)
              .slice(0, 3)
              .map((pr) => ({ p: pr.p, titre: pr.titre, dessin: pr.dessins[0] ?? '', prix: pr.prix })),
          },
        ]),
      ),
      relais: e.relais?.nom ?? 'Relais Mvog-Ada',
      adresse: a ? `${a.nom} · ${a.quartier}` : null,
      plafondComptoir: e.palier.comptoir,
      numeroVerifie: e.profil.numeroVerifie,
      favoris: e.favoris,
    }
  },
  changerQuantite: async (id, qte) => {
    modifier((e) => ({ ...e, panier: { ...e.panier, lignes: e.panier.lignes.map((l) => (l.id === id ? { ...l, qte: Math.max(1, Math.min(qte, l.stock)) } : l)) } }))
  },
  retirerLigne: async (id) => {
    modifier((e) => ({ ...e, panier: { ...e.panier, lignes: e.panier.lignes.filter((l) => l.id !== id) } }))
  },
  remettreLigne: async (l, index) => {
    modifier((e) => {
      const lignes = e.panier.lignes.filter((x) => x.id !== l.id)
      lignes.splice(Math.min(index, lignes.length), 0, l)
      return { ...e, panier: { ...e.panier, lignes } }
    })
  },
  mettreEnFavori: async (id) => {
    modifier((e) => {
      const l = e.panier.lignes.find((x) => x.id === id)
      if (!l) return e
      const f: Favori = { id: 'f' + Date.now().toString(36), p: l.p, titre: l.titre, variante: l.variante, dessin: l.dessin, prix: l.prix, prixAvant: null, retrait: 900, stock: 'ok', alertes: { prix: true, stock: true }, ajouteLe: maintenant() }
      return { ...e, panier: { ...e.panier, lignes: e.panier.lignes.filter((x) => x.id !== id) }, favoris: [f, ...e.favoris], compteurs: { ...e.compteurs, sauvegardes: e.compteurs.sauvegardes + 1 } }
    })
  },
  ajouterAuPanier: async (boutique, p) => {
    // Un produit de la même boutique : tout le produit (paramètres, stock, autres vendeurs), sans ramassage en plus.
    if (CATALOGUE[p]?.vendeur.boutique === boutique) await sourceDemo.ajouterProduit(p, {}, 1, boutique)
  },
  changerOption: async (id, nom, valeur) => {
    modifier((e) => ({
      ...e,
      panier: {
        ...e.panier,
        lignes: e.panier.lignes.map((l) => {
          if (l.id !== id || !l.options) return l
          const options = l.options.map((o) => (o.nom === nom && !o.indispo?.includes(valeur) ? { ...o, choisi: valeur } : o))
          const prix = options.reduce((p, o) => o.prix?.[o.choisi] ?? p, l.prix)
          return { ...l, options, prix, variante: options.map((o) => (o.nom === 'Taille' ? 'Taille ' + o.choisi : o.choisi)).join(' · ') }
        }),
      },
    }))
  },
  // L'ancien vendeur rejoint les autres offres : on peut revenir en arrière.
  choisirVendeur: async (id, boutique) => {
    modifier((e) => ({
      ...e,
      panier: {
        ...e.panier,
        lignes: e.panier.lignes.map((l) => {
          const o = l.offres?.find((x) => x.boutique === boutique)
          if (l.id !== id || !o) return l
          const avant = { boutique: l.boutique, zone: BOUTIQUES[l.boutique]?.zone ?? '', prix: l.prix, km: 0.4, score: 91, ventes: 312 }
          return { ...l, boutique, prix: o.prix, offres: [...l.offres!.filter((x) => x.boutique !== boutique), avant] }
        }),
      },
    }))
  },
  passerCommande: async (c) => {
    const e = lireEtat()
    const lignes = e.panier.lignes
    const sousTotal = lignes.reduce((t, l) => t + l.prix * l.qte, 0)
    const a = e.adresses.find((x) => x.principale) ?? e.adresses[0]
    const nums = Array.from({ length: 200 }, (_, i) => 'BLV-' + (52108 + i))
    const ref = nums.find((r) => !e.passees.some((x) => x.ref === r))!
    const le = maintenant()
    const total = sousTotal + c.livraison + c.frais
    const directe = c.moyen === 'wallet' || c.moyen === 'carte'
    const commande: CommandePassee = {
      ref,
      le,
      mode: c.mode,
      lieu: c.mode === 'relais' ? (e.relais?.nom ?? 'Relais Mvog-Ada') : a ? `${a.nom} · ${a.quartier}` : 'ton adresse',
      moyen: c.moyen,
      numero: c.numero,
      comptoir: c.comptoir,
      articles: lignes.reduce((n, l) => n + l.qte, 0),
      colis: new Set(lignes.map((l) => l.boutique)).size,
      sousTotal,
      livraison: c.livraison,
      frais: c.frais,
      montant: c.comptoir ? c.livraison : total,
      dueAuRetrait: c.comptoir ? sousTotal : 0,
      prime: c.prime ?? 0,
      etat: 'attente',
      expire: le + 15 * 60 * 1000,
      lignes: lignes.map((l) => ({ titre: l.titre, dessin: l.dessin, qte: l.qte, prix: l.prix, boutique: l.boutique })),
    }
    modifier((x) => ({ ...x, passees: [commande, ...x.passees] }))
    return directe ? sourceDemo.confirmerPaiement(ref) : commande
  },
  paiementsEnAttente: async () => lireEtat().passees.filter((c) => c.etat === 'attente' && c.expire > maintenant()),
  commandePassee: async (ref) => {
    const c = lireEtat().passees.find((x) => x.ref === ref)
    return c ? { ...c, lu: maintenant() } : null
  },
  // Paiement validé : le panier se vide, le Portefeuille est débité s'il a payé.
  confirmerPaiement: async (ref) => {
    let fin: CommandePassee | null = null
    modifier((e) => {
      const c = e.passees.find((x) => x.ref === ref)
      if (!c || c.etat === 'payee') return e
      fin = { ...c, etat: 'payee' }
      let pf = e.portefeuille
      if (c.moyen === 'wallet') {
        let reste = c.montant
        const recharges = pf.recharges.map((r) => {
          const pris = Math.min(r.restant, reste)
          reste -= pris
          return { ...r, restant: r.restant - pris, aServi: r.aServi || pris > 0 }
        })
        const rembourse = Math.max(0, pf.rembourse - reste)
        pf = { ...pf, recharges, rembourse, historique: [{ id: 'h' + Date.now().toString(36), type: 'paiement', libelle: 'Commande ' + ref, le: maintenant(), montant: -c.montant }, ...pf.historique] }
      }
      return { ...e, passees: e.passees.map((x) => (x.ref === ref ? fin! : x)), panier: c.canal === 'whatsapp' ? e.panier : { ...e.panier, lignes: [] }, portefeuille: pf, compteurs: { ...e.compteurs, commandes: e.compteurs.commandes + 1 } }
    })
    return fin ?? lireEtat().passees.find((c) => c.ref === ref)!
  },
  echouerPaiement: async (ref, cause) => {
    modifier((e) => ({ ...e, passees: e.passees.map((c) => (c.ref === ref ? { ...c, etat: 'echec', cause } : c)) }))
  },
  // Nouvelle demande : même commande, même montant ; le délai de validation repart (l'ancienne demande est annulée).
  relancerPaiement: async (ref) => {
    modifier((e) => ({ ...e, passees: e.passees.map((c) => (c.ref === ref && c.etat === 'attente' ? { ...c, expire: maintenant() + 15 * 60 * 1000 } : c)) }))
    return { ...lireEtat().passees.find((c) => c.ref === ref)!, lu: maintenant() }
  },
  // Abandon avant validation : la demande disparaît, rien n'est débité, le panier n'a pas été touché.
  annulerPaiement: async (ref) => {
    modifier((e) => ({ ...e, passees: e.passees.filter((c) => !(c.ref === ref && c.etat === 'attente')) }))
  },
  choisirModePanier: async (mode) => {
    modifier((e) => ({ ...e, panier: { ...e.panier, mode } }))
  },
  marquerToutLu: async () => {
    modifier((x) => ({ ...x, conversations: x.conversations.map((c) => ({ ...c, nonLus: 0 })) }))
  },
  poserQuestion: async (p, texte) => {
    const id = p.cle === 'pagne' ? 'question' : 'q-' + p.cle
    modifier((e) =>
      e.conversations.some((c) => c.id === id)
        ? e
        : {
            ...e,
            conversations: [
              {
                id,
                type: 'vendeur',
                titre: p.titre + ' · le vendeur',
                apercu: '',
                liste: { dessin: p.dessin },
                visible: true,
                entete: { titre: p.titre, sous: 'Le vendeur ne voit ni ton nom ni ton numéro.', dessin: p.dessin, lien: { texte: 'Voir', vers: '/fiche?p=' + p.cle } },
                resolue: false,
                nonLus: 0,
                placeholder: 'Ta question au vendeur…',
                pied: 'Gardé par écrit. BelivaY ne lit cette conversation que si un dossier est ouvert.',
                messages: [],
              },
              ...e.conversations,
            ],
          },
    )
    const r = await sourceDemo.envoyerMessage(id, { texte })
    return { id, masques: r.masques }
  },
  ecrireSupport: async (m) => {
    const prefixe = `[${m.sujet}${m.commande ? ' · ' + m.commande : ''}] `
    const r = await sourceDemo.envoyerMessage('support', { texte: prefixe + m.texte, photo: m.photo ?? undefined })
    return { id: 'support', masques: r.masques }
  },
  faq: async () => FAQ,
  aide: async () => {
    const e = lireEtat()
    const instant = maintenant()
    const h = new Date(instant + H).getUTCHours() // heure de Yaoundé
    const dossier = e.conversations.find((c) => c.type === 'dossier' && c.visible)
    const visibles = e.conversations.filter((c) => c.visible)
    return {
      dossier: dossier ? { id: dossier.id, libelle: `Ton dossier ${dossier.id} · fer à repasser`, sous: 'Réponse du vendeur avant ven. 25 sept. à 17\u00A0h\u00A015' } : null,
      conversations: { nombre: visibles.length, nonLus: nonLusDe(e) },
      support: { ouverture: 7, fermeture: 21, ouvert: h >= 7 && h < 21, instant },
      whatsapp: COORDONNEES.whatsapp, // numéro officiel (config/coordonnees.ts)
      numero: e.profil.numeroMasque,
      numeroVerifie: e.profil.numeroVerifie,
      commandesEnCours: ['BLV-52018', 'BLV-52107'],
      services: [
        { nom: 'MTN MoMo', ok: true, detail: 'Paiements normaux' },
        { nom: 'Orange Money', ok: true, detail: 'Paiements normaux' },
        { nom: 'Relais', ok: true, detail: '12 quartiers ouverts aujourd’hui' },
        { nom: 'Livraison à domicile', ok: true, detail: 'Dans les délais' },
      ],
    }
  },
  legal: async () => {
    const e = lireEtat()
    const c = e.conditions ?? { version: '1.0', le: Date.UTC(2026, 7, 2, 9, 40) }
    return {
      version: c.version,
      publiee: c.version === '2.0' ? Date.UTC(2026, 9, 1, 0) : Date.UTC(2026, 7, 1, 8),
      acceptee: e.connecte ? c.le : null,
      pdf: null,
      documents: LEGAL,
      // La version 2.0 s'applique dès le 1er octobre : à accepter une fois, par le compte.
      changement:
        e.connecte && c.version !== '2.0'
          ? {
              version: '2.0',
              des: Date.UTC(2026, 9, 1, 0),
              points: [
                'Retours : tout article se rapporte à ton relais, même à petit prix ; le remboursement part quand le vendeur l’a reçu et vérifié.',
                'Confidentialité : ton centre de notifications garde tout 12 mois, puis l’efface.',
                'Tes commandes déjà passées gardent les conditions du jour où tu les as passées.',
              ],
            }
          : null,
    }
  },
  accepterConditions: async (version) => {
    modifier((e) => ({ ...e, conditions: { version, le: maintenant() } }))
  },
  verifierPremierNumero: async (numero, code) => {
    const n = chiffres(numero)
    if (n === '699000000') return { ok: false, raison: 'utilise' }
    const r = verifier('numero-nouveau', code, CODE_SMS)
    if (!r.ok) return r
    const op = operateur(n) === 'Orange' ? 'Orange' : 'MTN'
    modifier((e) => ({ ...e, profil: { ...e.profil, numeroMasque: masquerNumero(n), operateur: op, numeroVerifie: true }, securite: { ...e.securite, verifieLe: maintenant() } }))
    inscrireNumero(n) // trouvable par ses proches (Reçus)
    return { ok: true, client: client() }
  },
  confidentialite: async () => {
    const c = lireEtat().confidentialite
    return { personnalisation: c.personnalisation, partenaires: false, nomRetrait: c.nomRetrait, historique: { recherches: c.recherches, vus: c.vus } }
  },
  reglerConfidentialite: async (c) => {
    modifier((e) => ({ ...e, confidentialite: { ...e.confidentialite, ...c } }))
  },
  effacerHistorique: async (quoi) => {
    modifier((e) => ({ ...e, confidentialite: { ...e.confidentialite, recherches: quoi === 'vus' ? e.confidentialite.recherches : 0, vus: quoi === 'recherches' ? e.confidentialite.vus : 0 } }))
  },
  securite: async () => {
    const e = lireEtat()
    return {
      numero: { masque: e.profil.numeroMasque, operateur: e.profil.operateur, verifie: e.profil.numeroVerifie, verifieLe: e.securite.verifieLe },
      email: masquerEmail(e.profil.email),
      methodes: { google: e.securite.google && masquerEmail(e.securite.google), apple: e.securite.apple && masquerEmail(e.securite.apple), motDePasse: !!e.motDePasse },
      methodeActuelle: e.profil.connexion,
      appareils: e.securite.appareils,
      historique: e.securite.historique,
      biometrie: e.securite.biometrie,
      seuilBiometrie: 50000,
      alerteConnexion: e.securite.alerteConnexion ?? true,
    }
  },
  // Démonstration : le compte Google ou Apple du téléphone a l'adresse du compte BelivaY.
  lierMethode: async (m) => {
    modifier((e) => ({ ...e, securite: { ...e.securite, [m]: e.profil.email } }))
    return { ok: true }
  },
  delierMethode: async (m) => {
    const e = lireEtat()
    const restantes = [e.securite.google && 'google', e.securite.apple && 'apple', e.motDePasse && 'email'].filter((x) => x && x !== m)
    if (!restantes.length) return { ok: false, raison: 'derniere' }
    modifier((x) => (m === 'email' ? { ...x, motDePasse: '' } : { ...x, securite: { ...x.securite, [m]: null } }))
    return { ok: true }
  },
  changerMotDePasse: async (ancien, nouveau) => {
    const e = lireEtat()
    if (e.motDePasse && ancien !== e.motDePasse) return { ok: false, raison: 'ancien' }
    if (nouveau.length < 8 || !/\d/.test(nouveau)) return { ok: false, raison: 'regle' }
    // Nouveau mot de passe : les autres appareils sont déconnectés (on ne sait pas qui avait l'ancien).
    modifier((x) => ({ ...x, motDePasse: nouveau, securite: { ...x.securite, appareils: x.securite.appareils.filter((a) => a.actuel) } }))
    return { ok: true }
  },
  deconnecterAppareil: async (id) => {
    modifier((e) => ({ ...e, securite: { ...e.securite, appareils: e.securite.appareils.filter((a) => a.actuel || a.id !== id) } }))
  },
  deconnecterAutres: async () => {
    modifier((e) => ({ ...e, securite: { ...e.securite, appareils: e.securite.appareils.filter((a) => a.actuel) } }))
  },
  reglerBiometrie: async (actif) => {
    modifier((e) => ({ ...e, securite: { ...e.securite, biometrie: actif } }))
  },
  reglerAlerteConnexion: async (actif) => {
    modifier((e) => ({ ...e, securite: { ...e.securite, alerteConnexion: actif } }))
  },
  cartes: async () => lireEtat().cartes,
  // Démonstration : la carte est « enregistrée par le prestataire » ; seuls la marque et les 4 derniers chiffres restent.
  // Reçoit le jeton du prestataire (CAP-24) : la même carte donne le même jeton ; jamais le numéro ni le CVC.
  ajouterCarte: async ({ carte: j, titulaire }) => {
    const e = lireEtat()
    if (e.cartes.some((x) => (x.jeton ? x.jeton === j.jeton : x.derniers === j.derniers && x.expire === j.expire))) return { ok: false, raison: 'deja' }
    const carte = { id: 'c' + Date.now().toString(36), marque: j.marque, derniers: j.derniers, expire: j.expire, titulaire: titulaire.trim(), parDefaut: !e.cartes.length, jeton: j.jeton }
    modifier((x) => ({ ...x, cartes: [...x.cartes, carte] }))
    return { ok: true, carte }
  },
  retirerCarte: async (id) => {
    modifier((e) => {
      const reste = e.cartes.filter((c) => c.id !== id)
      if (reste.length && !reste.some((c) => c.parDefaut)) reste[0] = { ...reste[0], parDefaut: true }
      return { ...e, cartes: reste }
    })
  },
  carteParDefaut: async (id) => {
    modifier((e) => ({ ...e, cartes: e.cartes.map((c) => ({ ...c, parDefaut: c.id === id })) }))
  },
  boutique: async () => lireEtat().boutique,
  // Nom de 3 à 40 caractères, unique (démonstration : « Boutique A » et « BelivaY » sont pris) ; numéro vérifié exigé.
  ouvrirBoutique: async (b) => {
    const e = lireEtat()
    const nom = b.nom.trim().replace(/\s+/g, ' ')
    if (!e.profil.numeroVerifie) return { ok: false, raison: 'numero' }
    if (nom.length < 3) return { ok: false, raison: 'nom-court' }
    if (nom.length > 40) return { ok: false, raison: 'nom-long' }
    if (['boutique a', 'belivay'].includes(nom.toLowerCase())) return { ok: false, raison: 'nom-pris' }
    const lettres = (e.profil.prenom.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase() + 'XXX').replace(/[AEIOUY]/g, '').slice(0, 3)
    const boutique: Boutique = { nom, categorie: b.categorie, type: b.type, code: `${lettres}-4821`, piece: 'aucune' }
    modifier((x) => ({ ...x, boutique }))
    return { ok: true, boutique }
  },
  suppression: async () => {
    const e = lireEtat()
    return {
      enCours: e.enCours,
      solde: solde(e),
      numero: e.profil.numeroMasque,
      perdu: {
        cagnotte: cagnotteAttente(e),
        boutique: e.boutique?.nom ?? null,
        abonnement: !!e.abonnement && !e.abonnement.resilie && (e.abonnement.fin ?? Infinity) > maintenant(),
        proches: (e.liens ?? []).filter((l) => l.etat === 'actif').length,
        favoris: e.favoris.length,
      },
      gardeAns: 10, // pièces comptables (OHADA) : factures et journal des paiements
    }
  },
  // Le compte est effacé ; restent les factures et le journal des paiements (loi), hors de l'application.
  supprimerCompte: async (code) => {
    const r = verifier('suppression', code, CODE_SMS)
    if (!r.ok) return r
    const avant = client()
    const e = lireEtat()
    // Le serveur revérifie les conditions (l'écran ne propose la suppression que si elles sont remplies).
    if (e.enCours.length || solde(e) > 0) throw new Error('suppression-refusee')
    ecrireEtat({ ...ETAT_NOUVEAU, connecte: false, supprime: true })
    return { ok: true, client: avant }
  },
  notifications: async () => {
    const e = lireEtat()
    return { numero: e.profil.numeroVerifie ? e.profil.numeroMasque : null, verifie: e.profil.numeroVerifie, canal: e.canal, choix: e.notifs, calme: e.calme }
  },
  reglerCanal: async (canal) => {
    modifier((e) => ({ ...e, canal }))
  },
  reglerCalme: async (calme) => {
    modifier((e) => ({ ...e, calme }))
  },
  // Démonstration : pas de serveur d'envoi ; la notification de bienvenue est locale (src/connecteurs/push.ts).
  enregistrerAbonnementPush: async () => ({ ok: true }),
  reglerNotification: async (cle, actif) => modifier((e) => ({ ...e, notifs: { ...e.notifs, [cle]: actif } })).notifs,
  rappel: async () => lireEtat().rappel,
  demanderRappel: async (r) => {
    const h = new Date(maintenant() + H).getUTCHours()
    // Fin du créneau (« Dès que possible » : la fermeture du support, 21 h).
    const fin = { 'Avant 12\u00A0h': 12, '12\u00A0h – 17\u00A0h': 17 }[r.creneau] ?? 21
    const rappel: Rappel = { ...r, jour: h < fin ? 'aujourdhui' : 'demain' }
    modifier((e) => ({ ...e, rappel }))
    return rappel
  },
  annulerRappel: async () => {
    modifier((e) => ({ ...e, rappel: null }))
  },
  // Un état gardé avant l'ajout de l'instant du retrait le reprend du jeu d'essai (filtres par période).
  factures: async () => {
    const f = lireEtat().factures
    const LE: Record<string, number> = { 'BLV-51702': Date.UTC(2026, 8, 19, 10, 32), 'BLV-51388': Date.UTC(2026, 7, 28, 9, 0), 'BLV-51206': Date.UTC(2026, 7, 8, 9, 0) }
    return { ...f, factures: f.factures.map((x) => ({ ...x, le: x.le ?? LE[x.ref] ?? maintenant() })), maintenant: maintenant() }
  },
  portefeuille: async (): Promise<DonneesPortefeuille> => {
    const e = lireEtat()
    const instant = maintenant()
    const enAttente = e.portefeuille.recharges.filter((r) => !r.aServi && instant < r.le + PF.attenteRechargeH * H && r.restant > 0)
    return {
      solde: solde(e),
      cagnotteEnAttente: cagnotteAttente(e),
      retirable: retirable(e, instant),
      disponibleLe: enAttente.length ? Math.min(...enAttente.map((r) => r.le + PF.attenteRechargeH * H)) : null,
      historique: e.portefeuille.historique,
      moyens: e.moyens,
      regles: { plafond: PF.plafond, rechargeMin: PF.rechargeMin, retraitMin: PF.retraitMin, retraitJour: PF.retraitJour, versementHeures: PF.versementHeures },
      rembourse: Math.min(e.portefeuille.rembourse, solde(e)),
      retraitsGratuits: Math.max(PF.gratuitsParMois - e.portefeuille.retraits.filter((r) => r.partRechargee > 0 && moisYaounde(r.le) === moisYaounde(instant)).length, 0),
      retireAujourdhui: e.portefeuille.retraits.filter((r) => jourYaounde(r.le) === jourYaounde(instant)).reduce((n, r) => n + r.montant, 0),
      frais: { gratuitsParMois: PF.gratuitsParMois, pourCent: PF.fraisPourCent, minimum: PF.fraisMin, attenteRechargeH: PF.attenteRechargeH, attenteNumeroH: PF.attenteNumeroH },
    }
  },
  // Recharge confirmée par l'opérateur (webhook signé, CWL-03) : la démonstration la crédite aussitôt.
  recharger: async (montant, moyenId) => {
    const e = lireEtat()
    if (montant < PF.rechargeMin) return { ok: false, refus: 'minimum', possible: PF.rechargeMin }
    if (solde(e) + montant > PF.plafond) return { ok: false, refus: 'plafond', possible: PF.plafond - solde(e) }
    const m = e.moyens.find((x) => x.id === moyenId)
    const le = maintenant()
    const apres = modifier((x) => ({
      ...x,
      portefeuille: {
        ...x.portefeuille,
        recharges: [...x.portefeuille.recharges, { le, montant, restant: montant, aServi: false }],
        historique: [{ id: 'h' + le.toString(36), type: 'recharge', libelle: 'Recharge ' + libelleMoMo(m?.operateur ?? 'MTN'), le, montant }, ...x.portefeuille.historique],
      },
    }))
    return { ok: true, solde: solde(apres), montant, frais: 0 }
  },
  fraisRetrait: async (montant) => fraisDe(lireEtat(), montant, maintenant()),
  // Retrait : d'abord l'argent remboursé (sans frais), puis les recharges retirables, les plus anciennes d'abord.
  retirer: async (montant, moyenId) => {
    const e = lireEtat()
    const instant = maintenant()
    const non = (refus: RefusPortefeuille, possible: number) => ({ ok: false as const, refus, possible })
    if (montant < PF.retraitMin) return non('minimum', PF.retraitMin)
    if (montant > solde(e)) return non('solde', solde(e))
    if (attenteNumero(e, instant)) return non('attente_numero', 0)
    const dispo = retirable(e, instant)
    if (montant > dispo) return non('attente_recharge', dispo)
    const duJour = e.portefeuille.retraits.filter((r) => jourYaounde(r.le) === jourYaounde(instant)).reduce((n, r) => n + r.montant, 0)
    if (duJour + montant > PF.retraitJour) return non('plafond_jour', Math.max(PF.retraitJour - duJour, 0))
    const frais = fraisDe(e, montant, instant)
    const partRembourse = Math.min(e.portefeuille.rembourse, montant)
    let reste = montant - partRembourse
    const recharges = [...e.portefeuille.recharges]
      .sort((a, b) => a.le - b.le)
      .map((r) => {
        const prise = r.aServi || instant >= r.le + PF.attenteRechargeH * H ? Math.min(r.restant, reste) : 0
        reste -= prise
        return { ...r, restant: r.restant - prise }
      })
      .filter((r) => r.restant > 0)
    const m = e.moyens.find((x) => x.id === moyenId)
    const apres = modifier((x) => ({
      ...x,
      portefeuille: {
        ...x.portefeuille,
        rembourse: x.portefeuille.rembourse - partRembourse,
        recharges,
        retraits: [...x.portefeuille.retraits, { le: instant, montant, partRechargee: montant - partRembourse }],
        historique: [
          { id: 'h' + instant.toString(36), type: 'retrait', libelle: 'Retrait vers ' + libelleMoMo(m?.operateur ?? 'MTN') + (frais ? ` · frais ${frais} F` : ''), le: instant, montant: -montant },
          ...x.portefeuille.historique,
        ],
      },
    }))
    return { ok: true, solde: solde(apres), montant, frais }
  },
  moyensPaiement: async () => lireEtat().moyens,
  ajouterMoyen: async (numero) => (lireEtat().moyens.some((m) => m.numeroMasque === masquerNumero(numero)) ? { ok: false, raison: 'deja' } : { ok: true, envoi: await sourceDemo.envoyerCode('moyen', numero) }),
  confirmerMoyen: async (numero, code) => {
    if (chiffres(numero) !== chiffres(numeroEnCours ?? '')) return { ok: false, essaisRestants: 0 }
    const r = verifier('moyen', code, CODE_SMS)
    if (!r.ok) return r
    const op = operateur(numero) === 'Orange' ? 'Orange' : 'MTN'
    modifier((e) => ({
      ...e,
      moyens: [...e.moyens, { id: 'm' + Date.now().toString(36), operateur: op, numeroMasque: masquerNumero(numero), duCompte: false, parDefaut: !e.moyens.length }],
    }))
    numeroEnCours = null
    return { ok: true, client: client() }
  },
  moyenParDefaut: async (id) => {
    modifier((e) => ({ ...e, moyens: e.moyens.map((m) => ({ ...m, parDefaut: m.id === id })) }))
  },
  // Le numéro du compte ne se retire pas ; retiré, le moyen par défaut passe au numéro du compte.
  retirerMoyen: async (id) => {
    modifier((e) => {
      if (e.moyens.find((m) => m.id === id)?.duCompte) return e
      const reste = e.moyens.filter((m) => m.id !== id)
      if (reste.length && !reste.some((m) => m.parDefaut)) {
        const i = Math.max(reste.findIndex((m) => m.duCompte), 0)
        reste[i] = { ...reste[i], parDefaut: true }
      }
      return { ...e, moyens: reste }
    })
  },
  adresses: async () => {
    const e = lireEtat()
    return {
      adresses: e.adresses,
      zonesServies: ZONES,
      relais: e.relais?.nom ?? 'ton relais',
      domicile: { prix: 1500, offertDes: 50000 },
    }
  },
  enregistrerAdresse: async (a) => {
    if (!servie(a.quartier)) return { ok: false, erreur: 'zone_non_servie', ville: ville(a.quartier) }
    const quartier = ZONES.find((z) => z.toLowerCase() === a.quartier.trim().toLowerCase())!
    let enregistree: Adresse | null = null
    modifier((e) => {
      const id = a.id ?? 'a' + Date.now().toString(36)
      const avant = e.adresses.find((x) => x.id === id)
      enregistree = { id, nom: a.nom.trim(), quartier, zoneServie: true, reperes: a.reperes.trim(), position: a.position, coords: a.coords, instructions: a.instructions?.trim() || undefined, destinataire: a.destinataire?.trim() || undefined, creneau: a.creneau ?? null, photo: a.photo ?? null, principale: avant?.principale ?? !e.adresses.length }
      return { ...e, adresses: avant ? e.adresses.map((x) => (x.id === id ? enregistree! : x)) : [...e.adresses, enregistree!] }
    })
    return { ok: true, adresse: enregistree! }
  },
  // Supprimée, l'adresse principale passe à la suivante (s'il en reste une).
  supprimerAdresse: async (id) => {
    modifier((e) => {
      const reste = e.adresses.filter((a) => a.id !== id)
      if (reste.length && !reste.some((a) => a.principale)) reste[0] = { ...reste[0], principale: true }
      return { ...e, adresses: reste }
    })
  },
  adresseParDefaut: async (id) => {
    modifier((e) => ({ ...e, adresses: e.adresses.map((a) => ({ ...a, principale: a.id === id })) }))
  },
  envoyerCode: async (objet, destination, canal): Promise<EnvoiCode> => {
    const e = lireEtat()
    if (objet === 'email-adresse') emailEnCours = destination ?? null
    if (objet === 'email-sms') smsEmailValide = false
    if (objet === 'numero-ancien') ancienValide = false
    if (objet === 'numero-nouveau' || objet === 'moyen') numeroEnCours = destination ?? null
    const parSms = objet !== 'email-adresse'
    const vers =
      objet === 'numero-nouveau' || objet === 'moyen'
        ? masquerNumero(destination ?? '') + ' · ' + (operateur(destination ?? '') ?? '')
        : parSms
          ? e.profil.numeroMasque + ' · ' + e.profil.operateur
          : masquerEmail(destination ?? '')
    return {
      destination: vers + (canal === 'whatsapp' ? ' · WhatsApp' : ''),
      valideMinutes: 10,
      renvoiSecondes: 60,
      codeDemo: parSms ? CODE_SMS : CODE_EMAIL,
    }
  },
  confirmerProfil: async (c: ChangementProfil, code) => {
    const r = verifier('profil', code, CODE_SMS)
    if (!r.ok) return r
    ecrireProfil({ ...lireProfil(), prenom: c.prenom.trim(), nom: c.nom.trim(), photo: c.photo })
    return { ok: true, client: client() }
  },
  verifierCodeNumeroAncien: async (code) => {
    const r = verifier('numero-ancien', code, CODE_SMS)
    if (!r.ok) return r
    ancienValide = true
    return { ok: true, client: client() }
  },
  // Démonstration : « deja.pris@exemple.cm » a déjà un compte BelivaY (CIN-16).
  verifierNouvelEmail: async (email) => {
    const m = email.trim().toLowerCase()
    if (m === lireEtat().profil.email.toLowerCase()) return { ok: false, raison: 'meme' }
    if (m === 'deja.pris@exemple.cm') return { ok: false, raison: 'pris' }
    return { ok: true }
  },
  // Démonstration : le 6 99 00 00 00 est déjà vérifié sur un autre compte (CIN-35).
  verifierNouveauNumero: async (numero) => {
    const n = chiffres(numero)
    if (masquerNumero(n) === lireEtat().profil.numeroMasque) return { ok: false, raison: 'meme' }
    if (n === '699000000') return { ok: false, raison: 'utilise' }
    return { ok: true }
  },
  confirmerNumero: async (numero, code) => {
    // Sans le code de l'ancien numéro, ou pour un autre numéro que celui qui a reçu le code, rien ne change.
    if (!ancienValide || chiffres(numero) !== chiffres(numeroEnCours ?? '')) return { ok: false, essaisRestants: 0 }
    const r = verifier('numero-nouveau', code, CODE_SMS)
    if (!r.ok) return r
    const op = operateur(numero) === 'Orange' ? 'Orange' : 'MTN'
    inscrireNumero(numero)
    modifier((e) => {
      const nouveau = masquerNumero(numero)
      const deja = e.moyens.find((m) => m.numeroMasque === nouveau)
      // L'ancien numéro reste un moyen de paiement (CIN-43) ; le nouveau devient celui du compte.
      const moyens = e.moyens.map((m) => ({ ...m, duCompte: m.numeroMasque === nouveau }))
      return {
        ...e,
        profil: { ...e.profil, numeroMasque: nouveau, operateur: op, numeroVerifie: true },
        securite: { ...e.securite, verifieLe: maintenant() },
        moyens: deja ? moyens : [...moyens, { id: 'n' + numero.slice(-4), operateur: op, numeroMasque: nouveau, duCompte: true, parDefaut: false }],
        changementNumero: { le: maintenant(), nouveau, operateur: op, ancien: e.profil.numeroMasque, ancienOperateur: e.profil.operateur, renouvelees: e.codesEnCours },
      }
    })
    ancienValide = false
    numeroEnCours = null
    return { ok: true, client: client() }
  },
  changementNumero: async () => {
    const e = lireEtat()
    return e.changementNumero ? { ...e.changementNumero, relais: e.relais?.nom ?? 'ton relais' } : null
  },
  verifierCodeEmail: async (code) => {
    const r = verifier('email-sms', code, CODE_SMS)
    if (!r.ok) return r
    smsEmailValide = true
    return { ok: true, client: client() }
  },
  confirmerEmail: async (email, code) => {
    // Sans le premier code (SMS), ou pour une autre adresse que celle qui a reçu le code, rien ne change.
    if (!smsEmailValide || email !== emailEnCours) return { ok: false, essaisRestants: 0 }
    const r = verifier('email-adresse', code, CODE_EMAIL)
    if (!r.ok) return r
    ecrireProfil({ ...lireProfil(), email })
    smsEmailValide = false
    emailEnCours = null
    return { ok: true, client: client() }
  },
}
