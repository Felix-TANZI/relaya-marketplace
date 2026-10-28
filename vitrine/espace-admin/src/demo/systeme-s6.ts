// DONNÉES DE DÉMONSTRATION — domaine « systeme », partie S6 (ADM-P35 à ADM-P37 et les pages ajoutées « Tâches
// planifiées » et « Conservation des données ») ; les interrupteurs restent dans systeme.ts (S5). Les tâches et la
// politique de conservation sont celles du kit (backend-kit/apps/console/taches.py TACHES, conservation.py POLITIQUE) ;
// délais, durées et préavis lus au registre (registre-s6.ts) ; indicateurs CALCULÉS sur des faits par jour et par zone.
import { PARAMETRES } from '../calculs/registre'
import { AccesRefuse, type CodeZone, type Espace, type Role } from '../donnees/communs'
import type { DomaineSysteme, Indicateur, Maintenance, PolitiqueDonnee, TacheDetail, TexteLegal } from '../donnees/domaines/systeme'
import { agentCourant, exiger, exigerPage, roleCourant, zonesVisibles } from './acces'
import { gouvDemo } from './gouvernance'
import { publier } from './pont'
import { maintenant } from './horloge'
import { AGENTS, HEURE, JOUR, LITIGES, T, nomAgent } from './jeu-essai'
import { journaliser } from './journal'
import { CRENEAUX_INTERDITS, P6, joursDe, texte } from './registre-s6'
import { magasin, repondre } from './stockage'

const MIN = 60_000
const motifOk = (m: string) => m.trim().length >= PARAMETRES.console.motifMin
const refuser = (quoi: string, roles: Role[]) => {
  if (!roles.includes(roleCourant())) throw new AccesRefuse(quoi, roles)
}
const debutJour = (t: number) => t - ((t + HEURE) % JOUR)
/** Jour de la semaine et heure à Yaoundé (0 dimanche). */
const local = (t: number) => {
  const d = new Date(t + HEURE)
  return { jour: d.getUTCDay(), heure: d.getUTCHours() }
}

// ── Tâches planifiées (kit : TACHES) ────────────────────────────────────────────────────────────────────────────────
type Periodicite = TacheDetail['periodicite']
const TACHES: { nom: string; periodicite: Periodicite; quoi: string }[] = [
  { nom: 'livraison.minute', periodicite: 'minute', quoi: 'Colis prêts entrés, paquets publiés, délais d’acceptation, escalade des incidents, alertes, litiges définitifs' },
  { nom: 'livraison.jour', periodicite: 'jour', quoi: 'Preuves purgées, Trust Scores et paliers, pièces expirées' },
  { nom: 'livraison.vendredi', periodicite: 'vendredi', quoi: 'Versements des entreprises de livraison' },
  { nom: 'vendeur.vendredi', periodicite: 'vendredi', quoi: 'Versements des vendeurs (1 % à leur charge)' },
  { nom: 'console.heure', periodicite: 'heure', quoi: 'Contre-signatures et propositions expirées, paramètres à date d’effet, candidatures sans complément, files en retard, notifications en échec' },
  { nom: 'console.conservation', periodicite: 'jour', quoi: 'Effacement et pseudonymisation selon les durées du registre' },
  { nom: 'client.idempotence', periodicite: 'jour', quoi: 'Clés d’idempotence de plus de 24 h' },
]
interface Execution {
  debut: number
  fin: number | null
  ok: boolean
  essais: number
  resultat: string | null
  erreur: string | null
  par: string
}
const VENDREDI = T(-(4 * 24 * 60 + 245)) // vendredi 9 oct. 10 h
const NUIT = T(-725) // 2 h cette nuit
const ex = (debut: number, ok: boolean, resultat: string | null, erreur: string | null = null, essais = 1): Execution => ({ debut, fin: debut + 2 * MIN, ok, essais, resultat, erreur, par: 'planificateur' })

/** Début de la période courante d'une tâche (une exécution par période). */
function periode(p: Periodicite, t: number): number {
  if (p === 'minute') return t - (t % MIN)
  if (p === 'heure') return t - (t % HEURE)
  if (p === 'jour') return debutJour(t)
  if (p === 'mois') {
    const d = new Date(t + HEURE)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - HEURE
  }
  const j0 = debutJour(t)
  return j0 - ((local(t).jour - 5 + 7) % 7) * JOUR // vendredi 0 h
}
const PAS: Record<Periodicite, number> = { minute: MIN, heure: HEURE, jour: JOUR, vendredi: 7 * JOUR, mois: 31 * JOUR }

// ── Santé ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const SERVICES = [
  { id: 'app', nom: 'Application', couche: 'Socle', fournisseur: 'Serveur principal · hébergement certifié', latenceMs: 180, seuilMs: 800, dispo: 99.97, mesure: '0,1 % de réponses en erreur' },
  { id: 'bdd', nom: 'Base de données', couche: 'Socle', fournisseur: 'Base relationnelle et cartographique', latenceMs: 12, seuilMs: 200, dispo: 100, mesure: 'Réplique à 0,4 s' },
  { id: 'files', nom: 'Files et temps réel', couche: 'Socle', fournisseur: 'Files de tâches et temps réel', latenceMs: 25, seuilMs: 300, dispo: 99.99, mesure: '3 travailleurs actifs' },
  { id: 'momo-mtn', nom: 'Paiement Mobile Money (MTN)', couche: 'Paiement', fournisseur: 'Agrégateur de paiement', latenceMs: 820, seuilMs: 3000, dispo: 99.6, mesure: '0,8 % de paiements échoués' },
  { id: 'momo-orange', nom: 'Paiement Mobile Money (Orange)', couche: 'Paiement', fournisseur: 'Agrégateur · secours', latenceMs: 4100, seuilMs: 3000, dispo: 98.9, mesure: '3,4 % de paiements échoués' },
  { id: 'sms', nom: 'Envoi des SMS', couche: 'Messages', fournisseur: 'Agrégateur couvrant le +237', latenceMs: 600, seuilMs: 5000, dispo: 99.8, mesure: '98,7 % délivrés' },
  { id: 'push', nom: 'Notifications push', couche: 'Messages', fournisseur: 'Service de notifications', latenceMs: 300, seuilMs: 2000, dispo: 99.9, mesure: '96 % délivrées' },
  { id: 'email', nom: 'E-mail', couche: 'Messages', fournisseur: 'Service d’e-mail', latenceMs: 900, seuilMs: 5000, dispo: 99.9, mesure: '0 rebond aujourd’hui' },
  { id: 'cartes', nom: 'Cartes et itinéraires', couche: 'Logistique', fournisseur: 'Cartes auto-hébergées', latenceMs: 140, seuilMs: 1500, dispo: 99.95, mesure: 'Tuiles auto-hébergées' },
  { id: 'preuves', nom: 'Stockage des preuves', couche: 'Logistique', fournisseur: 'Stockage d’objets', latenceMs: 210, seuilMs: 2000, dispo: 100, mesure: '41 % de l’espace utilisé' },
  { id: 'recherche', nom: 'Recherche', couche: 'Catalogue', fournisseur: 'Moteur de recherche', latenceMs: 35, seuilMs: 500, dispo: 99.98, mesure: '4 812 offres indexées' },
  { id: 'identite', nom: 'Vérification d’identité', couche: 'Confiance', fournisseur: 'Service de vérification d’identité', latenceMs: 2400, seuilMs: 8000, dispo: 99.5, mesure: '5 dossiers aujourd’hui' },
]
const etatService = (latence: number, seuil: number) => (latence > seuil ? ('lent' as const) : ('ok' as const))

// ── Légal ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const ACTIFS: Record<Exclude<Espace, 'admin'>, number> = { client: 1240, vendeur: 46, relais: 7, entreprise: 3, livreur: 34 }
const j = (n: number) => T(-n * 24 * 60)
const v10 = (texteCourt: string) => [{ version: '1.0', effet: j(90), resume: 'Version de lancement', contenu: texteCourt }]
const textesInitiaux = (): TexteLegal[] => [
  { id: 'cg-client', titre: 'Conditions générales · client', destinataires: ['client'], version: '1.0', effet: j(90), acceptes: 1240, actifs: 0, annonce: null, versions: v10('Le client paie à la commande ; l’argent est gardé par BelivaY jusqu’au retrait du colis, puis versé au vendeur.') },
  { id: 'cg-vendeur', titre: 'Conditions générales · vendeur', destinataires: ['vendeur'], version: '1.0', effet: j(90), acceptes: 46, actifs: 0, annonce: null, versions: v10('Le vendeur est payé chaque vendredi des commandes retirées ; la commission dépend de la catégorie et du palier.') },
  { id: 'cg-relais', titre: 'Conditions générales · point relais', destinataires: ['relais'], version: '1.0', effet: j(90), acceptes: 7, actifs: 0, annonce: null, versions: v10('Le relais reçoit, garde et remet les colis contre le code du client ; il est payé par colis et par jour de garde.') },
  {
    id: 'cg-entreprise',
    titre: 'Conditions générales · entreprise de livraison',
    destinataires: ['entreprise'],
    version: '1.0',
    effet: j(90),
    acceptes: 3,
    actifs: 0,
    annonce: { version: '1.1', effet: j(17) + 30 * JOUR, annonceeLe: j(17), resume: 'Retenue de kit plafonnée et contestable sous 7 jours ; clôture d’un départ sans constat dans le délai.', contenu: 'L’entreprise constate le kit à la restitution. Une retenue est plafonnée à la valeur du kit et le livreur peut la contester sous 7 jours. Sans constat dans le délai, le départ est clos sans retenue.', acceptes: 1 },
    versions: v10('L’entreprise accepte des paquets publiés par zone ; elle affecte ses livreurs et répond des colis qu’ils transportent.'),
  },
  { id: 'cg-livreur', titre: 'Conditions générales · livreur', destinataires: ['livreur'], version: '1.0', effet: j(90), acceptes: 34, actifs: 0, annonce: null, versions: v10('Le livreur travaille pour une entreprise de livraison ; il remet les colis avec une preuve et le code du client.') },
  { id: 'confidentialite', titre: 'Politique de confidentialité', destinataires: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'], version: '1.0', effet: j(90), acceptes: 1330, actifs: 0, annonce: null, versions: v10('Données traitées selon la loi n° 2024/017 : finalité, durée de conservation, droit d’accès, de rectification et d’export sous 30 jours.') },
  { id: 'retour', titre: 'Politique de retour', destinataires: ['client', 'vendeur'], version: '1.0', effet: j(90), acceptes: 1286, actifs: 0, annonce: null, versions: v10('Le client dépose toujours le colis au relais ; l’inspection décide du remboursement.') },
  { id: 'litiges', titre: 'Règlement des litiges', destinataires: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'], version: '1.0', effet: j(90), acceptes: 1330, actifs: 0, annonce: null, versions: v10('Un litige est instruit sur preuves, tranché par décision motivée ; un recours chacun, jugé par une autre personne.') },
  { id: 'mentions', titre: 'Mentions légales', destinataires: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'], version: '1.0', effet: j(90), acceptes: 1330, actifs: 0, annonce: null, versions: v10('Éditeur : BELIVAY SARL (registre : BLV-MENTIONS-LEGALES).') },
]
const VOCABULAIRE = [
  { interdit: 'banque', plutot: 'BelivaY (place de marché, jamais une banque)' },
  { interdit: 'compte bancaire', plutot: 'Wallet' },
  { interdit: 'dépôt', plutot: 'recharge du Wallet' },
  { interdit: 'épargne', plutot: '— (aucun produit d’épargne)' },
  { interdit: 'intérêts', plutot: '— (aucun intérêt servi)' },
  { interdit: 'crédit', plutot: '— (aucun crédit)' },
  { interdit: 'porte-monnaie électronique', plutot: 'Wallet' },
  { interdit: 'établissement de paiement', plutot: 'paiement par l’agrégateur certifié' },
]
const normer = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const motsInterdits = (s: string) => VOCABULAIRE.filter((v) => new RegExp(`(^|[^a-z])${normer(v.interdit)}([^a-z]|$)`).test(normer(s))).map((v) => v.interdit)

interface EtatSysteme {
  executions: Record<string, Execution[]>
  maintenances: Maintenance[]
  textes: TexteLegal[]
  interdits: { categorie: string; base: string; produits: string[]; restreint: boolean }[]
}
export const systemeS6 = magasin<EtatSysteme>('systeme-s6', () => ({
  executions: {
    'livraison.minute': [ex(T(-1), true, '2 paquets publiés · 1 alerte')],
    'livraison.jour': [ex(NUIT, true, '312 preuves purgées · 61 Trust Scores')],
    'livraison.vendredi': [ex(VENDREDI, true, '3 entreprises versées')],
    'vendeur.vendredi': [ex(VENDREDI, true, '38 vendeurs versés')],
    'console.heure': [ex(T(-5), true, '1 contre-signature expirée')],
    'console.conservation': [ex(NUIT, false, null, 'Délai dépassé sur l’effacement des positions de mission (verrou de table)', 2), ex(NUIT - JOUR, true, 'effacés 1 184 · pseudonymisés 2 · gardés en litige 3')],
    'client.idempotence': [ex(NUIT, true, '5 403 clés purgées')],
  },
  maintenances: [{ id: 'MT-0003', service: 'Recherche', debut: T(1915), fin: T(2005), motif: 'Réindexation du catalogue après l’ajout des catégories de la rentrée', annonceeLe: T(-1500), par: 'Franck Penga', etat: 'annoncee' }],
  textes: textesInitiaux(),
  interdits: [
    { categorie: 'Armes, munitions et explosifs', base: 'Loi 2010/021 · liste CAT-INTERDITS', produits: ['Armes à feu et répliques', 'Munitions', 'Feux d’artifice'], restreint: false },
    { categorie: 'Médicaments et produits de santé', base: 'Vente réservée aux pharmacies agréées', produits: ['Médicaments sur ordonnance', 'Antibiotiques'], restreint: true },
    { categorie: 'Cosmétiques dangereux', base: 'Hydroquinone, mercure, corticoïdes', produits: ['Crèmes éclaircissantes à l’hydroquinone', 'Savons au mercure'], restreint: false },
    { categorie: 'Contrefaçons', base: 'Droit des marques (OAPI)', produits: ['Copies de marques', 'Faux logiciels'], restreint: false },
    { categorie: 'Faune et flore protégées', base: 'Conventions de protection de la faune', produits: ['Ivoire', 'Viande de brousse d’espèces protégées'], restreint: false },
    { categorie: 'Stupéfiants, tabac et alcool fort', base: 'Alcool et tabac : vente restreinte aux majeurs', produits: ['Stupéfiants', 'Chicha et ses arômes'], restreint: true },
  ],
}))

function executionsDe(nom: string): Execution[] {
  return systemeS6.lire().executions[nom] ?? []
}
function tache(t: (typeof TACHES)[number]): TacheDetail {
  const l = executionsDe(t.nom)
  const der = l[0] ?? null
  const ok = l.find((x) => x.ok) ?? null
  const n = maintenant()
  const attendue = t.periodicite === 'minute' ? 5 * MIN : t.periodicite === 'heure' ? 2 * HEURE : 26 * HEURE
  return {
    nom: t.nom,
    periodicite: t.periodicite,
    quoi: t.quoi,
    installee: true,
    derniere: der,
    dernierSucces: ok?.debut ?? null,
    prochaine: periode(t.periodicite, n) + PAS[t.periodicite] + (t.periodicite === 'vendredi' ? 10 * HEURE : t.periodicite === 'jour' ? 2 * HEURE : 0),
    enRetard: !['vendredi', 'mois'].includes(t.periodicite) && (!ok || n - ok.debut > attendue),
    echecs7j: l.filter((x) => !x.ok && x.debut >= n - 7 * JOUR).length,
  }
}

// ── Rapports : faits par jour et par zone, puis calculs ────────────────────────────────────────────────────────────
interface FaitJour {
  jour: number
  zone: CodeZone
  commandes: number
  valeur: number
  commissions: number
  livraisonNette: number
  momo: number
  sms: number
  emballage: number
  relais: number
  transport: number
  delaiH: number
  sous5h: number // livrées sous 5 h
  domicile: number
  remplissage: number // pour cent
  nonPris: number
  pertes: number
  ramassageRelaisH: number
  relaisRetraitH: number
  litiges: number
  arbitrageH: number
  rembAuto: number
  avis: number
  noteSomme: number
  nonRetires: number
}
const ZONES_RAPPORT = PARAMETRES.zonesExploitees.map((z) => z.code)
function faits(): FaitJour[] {
  const out: FaitJour[] = []
  const j0 = debutJour(maintenant())
  for (let d = 0; d < 30; d++)
    ZONES_RAPPORT.forEach((zone, zi) => {
      const g = (a: number, b: number) => a + (((d * 7 + zi * 13) * 31) % (b - a + 1))
      const commandes = d === 0 ? [11, 9, 10, 8][zi] : g(6, 12)
      const valeur = commandes * g(26000, 34000)
      const relaisN = Math.round(commandes * 0.7)
      out.push({
        jour: j0 - d * JOUR,
        zone,
        commandes,
        valeur,
        commissions: Math.round(valeur * 0.054),
        livraisonNette: commandes * 860,
        momo: Math.round(valeur * 0.02),
        sms: commandes * 3 * 25,
        emballage: commandes * 92,
        relais: relaisN * 200,
        transport: relaisN * 450 + (commandes - relaisN) * 1000,
        delaiH: g(28, 46) / 10,
        sous5h: commandes - relaisN - (d % 9 === 0 ? 1 : 0),
        domicile: commandes - relaisN,
        remplissage: g(62, 88),
        nonPris: d % 6 === zi ? 1 : 0,
        pertes: d % 17 === zi ? 1 : 0,
        ramassageRelaisH: g(18, 30) / 10,
        relaisRetraitH: g(140, 260) / 10,
        litiges: d % 5 === zi ? 1 : 0,
        arbitrageH: g(20, 40),
        rembAuto: d % 8 === zi ? 1 : 0,
        avis: Math.round(commandes / 3),
        noteSomme: Math.round(commandes / 3) * g(41, 48) / 10,
        nonRetires: d % 7 === zi ? 1 : 0,
      })
    })
  return out
}
const somme = (l: FaitJour[], k: keyof FaitJour) => l.reduce((a, x) => a + (x[k] as number), 0)
const moyenne = (l: FaitJour[], k: keyof FaitJour) => (l.length ? somme(l, k) / l.length : 0)
const parJour = (l: FaitJour[], f: (x: FaitJour[]) => number, jours: number[]) => jours.map((d) => f(l.filter((x) => x.jour === d)))

const DEFS: Record<string, string> = {
  commandes: 'Commandes payées sur la période (paiement confirmé par l’agrégateur). Source : commandes. Période : filtre choisi.',
  valeur: 'Somme payée par les clients pour les produits : ce n’est PAS le chiffre d’affaires de BelivaY. Source : paiements.',
  panier: 'Valeur des commandes ÷ commandes. Source : paiements.',
  revenu: 'Commissions + livraison nette (livraison payée − part du transporteur et du relais). Source : registre des revenus.',
  marge: 'Revenu − frais Mobile Money − SMS − emballage − part du relais − part du transporteur, ÷ commandes.',
  delai: 'Médiane du temps entre « C’est prêt » et la remise. Source : preuves de livraison.',
  sous5h: 'Livraisons à domicile remises en moins de ENT-SLA-LIVRAISON ÷ livraisons à domicile.',
  remplissage: 'Colis transportés ÷ capacité des tournées relais. Source : paquets.',
  nonPris: 'Paquets publiés que personne n’a acceptés avant l’échéance. Source : paquets.',
  pertes: 'Colis perdus ou cassés constatés. Source : constats et litiges.',
  ramassage: 'Médiane du temps entre le ramassage et le dépôt au relais. Source : preuves.',
  retrait: 'Médiane du temps entre le dépôt au relais et le retrait du client. Source : remises.',
  litigesVendeur: 'Litiges ouverts ÷ vendeurs ayant vendu sur la période. Source : litiges.',
  nonRetires: 'Colis renvoyés au vendeur après le 7e jour de garde. Source : relais.',
  emballageColis: 'Coût des emballages ÷ colis expédiés. Source : stocks d’emballages.',
  litiges100: 'Litiges ouverts pour 100 commandes. Source : litiges.',
  arbitrage: 'Médiane du temps entre l’ouverture d’un litige et sa décision. Source : décisions.',
  rembAuto: 'Remboursements faits par l’automatisme (sous le seuil), sans instruction. Source : remboursements.',
  avis: 'Moyenne des notes laissées sur la période. Source : avis publiés.',
  smsCmd: 'SMS envoyés ÷ commandes (SMS-MAX-CMD au plus). Source : journal des envois.',
  momo: 'Frais Mobile Money payés par BelivaY sur la période. Source : relevés de l’agrégateur.',
  emballages: 'Coût des emballages fournis sur la période. Source : stocks.',
  ia: 'Coût des appels à l’IA (couche AIService instrumentée), mesuré pendant IA-COUT-MAX.',
}

// ── Domaine ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const demoSystemeS6: Omit<DomaineSysteme, 'interrupteurs' | 'sante' | 'taches'> = {
  async tableauSante() {
    exigerPage('sante', 'Santé du système')
    const n = maintenant()
    const services = SERVICES.map((s) => ({ id: s.id, nom: s.nom, etat: etatService(s.latenceMs, s.seuilMs), latenceMs: s.latenceMs, verifieLe: n - MIN, couche: s.couche, fournisseur: s.fournisseur, disponibilite30j: s.dispo, mesure: s.mesure, seuilMs: s.seuilMs }))
    const taches = TACHES.map(tache)
    return repondre({
      services,
      files: [
        { id: 'preuves' as const, n: 7, plusVieuxMin: 18, seuil: 50 },
        { id: 'envois' as const, n: 3, plusVieuxMin: 2, seuil: 100 },
        { id: 'versements' as const, n: 0, plusVieuxMin: null, seuil: 1 },
      ],
      ia: { actif: false, budget: texte('IA-COUT-MAX'), mesure: 'Mesure de la consommation en cours (jour 23 sur 60)', gpu: 'Aucun serveur GPU au lancement' },
      sauvegardes: { derniere: NUIT + 60 * MIN, prochaine: NUIT + JOUR + 60 * MIN, restaurationTesteeLe: j(6), tailleGo: 3.8 },
      demonstration: import.meta.env.VITE_SOURCE !== 'api',
      erreurs24h: 4,
      maintenances: systemeS6.lire().maintenances,
      preavisH: P6.maintenancePreavisH,
      creneauxInterdits: CRENEAUX_INTERDITS.map((c) => c.libelle),
      appels: [
        { le: n - 2 * MIN, service: 'Paiement', appel: 'Paiement · BLV-52262', resultat: 'lent' as const, dureeMs: 4380 },
        { le: n - 4 * MIN, service: 'Agrégateur SMS', appel: 'Code de retrait · BLV-52230', resultat: 'ok' as const, dureeMs: 610 },
        { le: n - 7 * MIN, service: 'Paiement', appel: 'Paiement · BLV-52259', resultat: 'echec' as const, dureeMs: 30000 },
        { le: n - 9 * MIN, service: 'Service de vérification d’identité', appel: 'Vérification · KYC-0096', resultat: 'ok' as const, dureeMs: 2390 },
        { le: n - 12 * MIN, service: 'OSRM', appel: 'Itinéraire · PQ-Z1-261013-003', resultat: 'ok' as const, dureeMs: 140 },
        { le: n - 15 * MIN, service: 'E-mail', appel: 'Rapport · Nadège Eyenga', resultat: 'ok' as const, dureeMs: 880 },
      ],
      latencePaiement: [900, 1100, 950, 1400, 2100, 2600, 3200, 3900, 4300, 4100, 3800, 4100],
      tachesEnRetard: taches.filter((t) => t.enRetard || (t.derniere && !t.derniere.ok)).length,
    })
  },
  async programmerMaintenance(m) {
    exigerPage('sante', 'Santé du système')
    exiger('maintenance.programmer')
    if (!motifOk(m.motif)) return { ok: false, raison: 'motif_court' }
    if (!SERVICES.some((s) => s.nom === m.service)) return { ok: false, raison: 'inconnu' }
    if (m.debut - maintenant() < P6.maintenancePreavisH * HEURE) return { ok: false, raison: 'preavis' }
    const fin = m.debut + Math.max(15, m.dureeMin) * MIN
    for (let t = m.debut; t < fin; t += 15 * MIN) {
      const l = local(t)
      if (CRENEAUX_INTERDITS.some((c) => c.jour === l.jour && l.heure >= c.de && l.heure < c.a)) return { ok: false, raison: 'creneau_interdit' }
    }
    let id = ''
    systemeS6.ecrire((s) => {
      id = `MT-${String(s.maintenances.length + 3).padStart(4, '0')}`
      s.maintenances.unshift({ id, service: m.service, debut: m.debut, fin, motif: m.motif.trim(), annonceeLe: maintenant(), par: nomAgent(agentCourant()), etat: 'annoncee' })
    })
    await journaliser({ action: 'maintenance.programmer', objet: `${id} · ${m.service}`, motif: m.motif.trim() })
    publier({ type: 'maintenance_annoncee', id, service: m.service, debut: m.debut, fin }, `admin-maintenance-${id}`, maintenant())
    return { ok: true, id }
  },
  async annulerMaintenance(id, motif) {
    exiger('maintenance.programmer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const x = systemeS6.lire().maintenances.find((y) => y.id === id && y.etat === 'annoncee')
    if (!x) return { ok: false, raison: 'inconnu' }
    systemeS6.ecrire((s) => void (s.maintenances.find((y) => y.id === id)!.etat = 'annulee'))
    await journaliser({ action: 'maintenance.annuler', objet: `${id} · ${x.service}`, motif })
    publier({ type: 'maintenance_annulee', id, service: x.service }, `admin-maintenance-${id}-annulee`, maintenant())
    return { ok: true }
  },

  async tableauTaches() {
    exigerPage('taches', 'Tâches planifiées')
    return repondre(TACHES.map(tache))
  },
  async lancerTache(nom, motif) {
    exigerPage('taches', 'Tâches planifiées')
    exiger('tache.lancer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const t = TACHES.find((x) => x.nom === nom)
    if (!t) return { ok: false, raison: 'inconnu' }
    const debut = periode(t.periodicite, maintenant())
    if (executionsDe(nom).some((x) => x.ok && x.debut >= debut)) return { ok: false, raison: 'deja_faite' }
    const essais = executionsDe(nom).filter((x) => !x.ok && x.debut >= debut).reduce((a, x) => a + x.essais, 0) + 1
    const resultat = nom === 'console.conservation' ? 'effacés 1 204 · pseudonymisés 3 · gardés en litige 3' : 'terminée'
    systemeS6.ecrire((s) => void s.executions[nom].unshift({ debut: maintenant(), fin: maintenant() + MIN, ok: true, essais, resultat, erreur: null, par: nomAgent(agentCourant()) }))
    await journaliser({ action: 'tache.lancer', objet: nom, motif })
    return { ok: true }
  },

  async conservation() {
    exigerPage('conservation', 'Conservation des données')
    const p = (donnee: string, code: string | null, action: PolitiqueDonnee['action'], gel: boolean, ou: string): PolitiqueDonnee => ({ donnee, code, valeur: code ? texte(code) : null, jours: code ? joursDe(code) : null, action, gelEnLitige: gel, ou })
    const derniereOk = executionsDe('console.conservation').find((x) => x.ok)
    const chiffres = (derniereOk?.resultat ?? '').match(/\d[\d\s]*/g)?.map((x) => Number(x.replace(/\s/g, ''))) ?? []
    const ouverts = LITIGES.filter((l) => ['ouvert', 'instruction', 'recours'].includes(l.etat))
    return repondre({
      politique: [
        p('Positions du livreur pendant une mission', 'conservation_positions_mission', 'effacer', true, 'console.conservation'),
        p('Origine des actions du livreur (position, réponse gardée)', 'CONSERV-ACTIONS-LIVREUR-J', 'pseudonymiser', true, 'console.conservation'),
        p('Notifications des espaces entreprise et livreur', 'NOT-CONSERV', 'effacer', false, 'console.conservation'),
        p('Envois de notifications (SMS, e-mail, push)', 'CONSERV-ENVOIS-J', 'effacer', false, 'console.conservation'),
        p('Exécutions des tâches planifiées', 'CONSERV-TACHES-J', 'effacer', false, 'console.conservation'),
        p('Candidatures refusées ou retirées', 'CONSERV-DOSSIER-J', 'pseudonymiser', false, 'console.conservation'),
        p('Livreur retiré (identité, numéro, photo, note interne)', 'LIV-DON-CONSERV-J', 'pseudonymiser', true, 'console.conservation'),
        p('Preuves photo des missions', 'conservation_preuves', 'expirer', true, 'livraison.jour'),
        p('Lieux de domicile du client', 'POSITION-CLIENT-EFFACEE-MIN', 'effacer', false, 'livraison.minute'),
        p('Paiements, escrow, versements, relevés', 'ADM-CONSERV-ARGENT-ANS', 'lecture_seule', false, '—'),
        p('Journal d’audit signé', 'ADM-CONSERV-ARGENT-ANS', 'jamais', false, '—'),
      ],
      derniere: derniereOk ? { le: derniereOk.debut, effaces: chiffres[0] ?? 0, pseudonymises: chiffres[1] ?? 0, gardesEnLitige: chiffres[2] ?? 0 } : null,
      geles: ouverts.map((l) => ({ objet: l.commande, litige: l.id, donnees: 'Positions de mission, preuves photo, origine des actions', zone: l.zone })),
      demandesOuvertes: gouvDemo.lire().demandes.filter((d) => d.etat === 'ouverte').length,
      accesDonneesJ: P6.accesDonneesJ,
    })
  },

  async rapports(f) {
    exigerPage('rapports', 'Rapports et indicateurs')
    const r = roleCourant()
    const parties: ('activite' | 'logistique' | 'qualite' | 'couts')[] =
      r === 'superviseur' || r === 'audit' ? ['activite', 'logistique', 'qualite', 'couts'] : r === 'finance' ? ['activite', 'couts'] : r === 'operations' ? ['logistique'] : r === 'terrain' ? [] : ['qualite']
    const vues = zonesVisibles()
    const zones = ZONES_RAPPORT.filter((z) => !vues || vues.includes(z))
    const zone = f.zone && zones.includes(f.zone) ? f.zone : null
    const n = maintenant()
    const j0 = debutJour(n)
    const nb = f.periode === 'jour' ? 1 : f.periode === '7j' ? 7 : 30
    const jours = [...Array(nb)].map((_, i) => j0 - (nb - 1 - i) * JOUR)
    const tous = faits().filter((x) => zones.includes(x.zone) && (!zone || x.zone === zone))
    const l = tous.filter((x) => x.jour >= jours[0])
    const cmd = somme(l, 'commandes')
    const peu = cmd < P6.echantillonMin
    const ind = (id: string, libelle: string, valeur: number | null, unite: string, tend: (x: FaitJour[]) => number, ratio = true): Indicateur => ({ id, libelle, valeur: ratio && peu ? null : valeur, unite, definition: DEFS[id], echantillonInsuffisant: ratio && peu, tendance: parJour(l, tend, jours) })
    const revenu = somme(l, 'commissions') + somme(l, 'livraisonNette')
    const lignesCout = [
      { libelle: 'Frais Mobile Money (à la charge de BelivaY)', montant: somme(l, 'momo') },
      { libelle: 'SMS', montant: somme(l, 'sms') },
      { libelle: 'Emballage', montant: somme(l, 'emballage') },
      { libelle: 'Part du relais', montant: somme(l, 'relais') },
      { libelle: 'Part du transporteur', montant: somme(l, 'transport') },
    ]
    const marge = revenu - lignesCout.reduce((a, x) => a + x.montant, 0)
    const dom = somme(l, 'domicile')
    const vendeurs = Math.max(1, Math.round(cmd / 4))
    const semaineJours = [...Array(7)].map((_, i) => j0 - (6 - i) * JOUR)
    const lundi = (() => {
      const jour = local(n).jour
      const d = j0 + (((8 - jour) % 7 || 7) * JOUR) + 7 * HEURE
      return d
    })()
    const destinataires = AGENTS.filter((a) => a.roles.some((x) => x !== 'terrain')).map((a) => ({ nom: nomAgent(a), role: a.roles[0], perimetre: a.zones ? a.zones.join(', ') : 'Toutes les zones' }))
    return repondre({
      arreteLe: n - (n % (5 * MIN)),
      periode: f.periode,
      zone,
      zones,
      parties,
      activite: [
        ind('commandes', 'Commandes', cmd, '', (x) => somme(x, 'commandes'), false),
        ind('valeur', 'Valeur des commandes', somme(l, 'valeur'), 'F', (x) => somme(x, 'valeur'), false),
        ind('panier', 'Panier moyen', cmd ? Math.round(somme(l, 'valeur') / cmd) : null, 'F', (x) => (somme(x, 'commandes') ? somme(x, 'valeur') / somme(x, 'commandes') : 0)),
        ind('revenu', 'Revenu BelivaY', revenu, 'F', (x) => somme(x, 'commissions') + somme(x, 'livraisonNette'), false),
      ],
      marge: { revenu, lignes: lignesCout, marge, commandes: cmd, parCommande: cmd && !peu ? Math.round(marge / cmd) : null },
      logistique: [
        ind('delai', 'Délai de livraison (médian)', Math.round(moyenne(l, 'delaiH') * 10) / 10, 'h', (x) => moyenne(x, 'delaiH')),
        ind('sous5h', 'Livrées en moins de 5 h', dom ? Math.round((somme(l, 'sous5h') / dom) * 100) : null, '%', (x) => (somme(x, 'domicile') ? (somme(x, 'sous5h') / somme(x, 'domicile')) * 100 : 0)),
        ind('remplissage', 'Remplissage des tournées relais', Math.round(moyenne(l, 'remplissage')), '%', (x) => moyenne(x, 'remplissage')),
        ind('nonPris', 'Paquets non pris', somme(l, 'nonPris'), '', (x) => somme(x, 'nonPris'), false),
        ind('pertes', 'Pertes et casses', somme(l, 'pertes'), '', (x) => somme(x, 'pertes'), false),
        ind('ramassage', 'Délai ramassage → relais (médian)', Math.round(moyenne(l, 'ramassageRelaisH') * 10) / 10, 'h', (x) => moyenne(x, 'ramassageRelaisH')),
        ind('retrait', 'Délai relais → retrait (médian)', Math.round(moyenne(l, 'relaisRetraitH') * 10) / 10, 'h', (x) => moyenne(x, 'relaisRetraitH')),
        ind('litigesVendeur', 'Litiges par vendeur', Math.round((somme(l, 'litiges') / vendeurs) * 100) / 100, '', (x) => somme(x, 'litiges')),
        ind('nonRetires', 'Colis non retirés', somme(l, 'nonRetires'), '', (x) => somme(x, 'nonRetires'), false),
        ind('emballageColis', 'Coût d’emballage par colis', cmd ? Math.round(somme(l, 'emballage') / cmd) : null, 'F', (x) => (somme(x, 'commandes') ? somme(x, 'emballage') / somme(x, 'commandes') : 0)),
      ],
      qualite: [
        ind('litiges100', 'Litiges pour 100 commandes', cmd ? Math.round((somme(l, 'litiges') / cmd) * 1000) / 10 : null, '', (x) => somme(x, 'litiges')),
        ind('arbitrage', 'Délai médian d’arbitrage', Math.round(moyenne(l.filter((x) => x.litiges), 'arbitrageH')) || null, 'h', (x) => moyenne(x, 'arbitrageH')),
        ind('rembAuto', 'Remboursements automatiques', somme(l, 'rembAuto'), '', (x) => somme(x, 'rembAuto'), false),
        ind('avis', 'Avis', somme(l, 'avis') ? Math.round((somme(l, 'noteSomme') / somme(l, 'avis')) * 10) / 10 : null, '★', (x) => (somme(x, 'avis') ? somme(x, 'noteSomme') / somme(x, 'avis') : 0)),
      ],
      couts: [
        ind('smsCmd', 'SMS par commande', cmd ? Math.round((somme(l, 'sms') / 25 / cmd) * 10) / 10 : null, '', (x) => somme(x, 'sms')),
        ind('momo', 'Frais Mobile Money', somme(l, 'momo'), 'F', (x) => somme(x, 'momo'), false),
        ind('emballages', 'Emballages', somme(l, 'emballage'), 'F', (x) => somme(x, 'emballage'), false),
        ind('ia', 'Assistant IA', 0, 'F', () => 0, false),
      ],
      semaine: semaineJours.map((d) => {
        const x = tous.filter((y) => y.jour === d)
        return { jour: new Date(d + HEURE).toISOString().slice(0, 10), commandes: somme(x, 'commandes'), valeur: somme(x, 'valeur'), revenu: somme(x, 'commissions') + somme(x, 'livraisonNette') }
      }),
      lundi: {
        prochain: lundi,
        heure: 'lundi 7 h 00',
        destinataires,
        envoyes: [1, 2, 3].map((k) => ({ semaine: new Date(lundi - k * 7 * JOUR - 6 * JOUR + HEURE).toISOString().slice(0, 10), le: lundi - k * 7 * JOUR, destinataires: destinataires.length })),
      },
    })
  },

  async legal() {
    exigerPage('legal', 'Contenus légaux')
    const n = maintenant()
    const textes = systemeS6.lire().textes.map((t) => {
      const actifs = t.destinataires.reduce((a, e) => a + (ACTIFS[e as Exclude<Espace, 'admin'>] ?? 0), 0)
      // Une version annoncée devient la version en vigueur à sa date d'effet (nouvelle acceptation à la connexion suivante).
      if (t.annonce && t.annonce.effet <= n) return { ...t, version: t.annonce.version, effet: t.annonce.effet, acceptes: t.annonce.acceptes, actifs, annonce: null, versions: [{ version: t.annonce.version, effet: t.annonce.effet, resume: t.annonce.resume, contenu: t.annonce.contenu }, ...t.versions] }
      return { ...t, actifs, acceptes: Math.min(t.acceptes, actifs) }
    })
    const espaces: Exclude<Espace, 'admin'>[] = ['client', 'vendeur', 'relais', 'entreprise', 'livreur']
    return repondre({
      textes,
      interdits: systemeS6.lire().interdits,
      acceptations: espaces.map((e) => ({ espace: e, actifs: ACTIFS[e], aJour: Math.min(...textes.filter((t) => t.destinataires.includes(e)).map((t) => Math.round((t.acceptes / Math.max(1, t.actifs)) * ACTIFS[e]))) })),
      vocabulaire: VOCABULAIRE,
      cadre: [
        { loi: 'Loi n° 2010/021', objet: 'Commerce électronique' },
        { loi: 'Loi n° 2010/012', objet: 'Cybersécurité et cybercriminalité' },
        { loi: 'Loi n° 2024/017', objet: 'Protection des données personnelles' },
        { loi: 'Droit OHADA', objet: 'Sociétés commerciales et contrats' },
        { loi: 'OAPI', objet: 'Marque BelivaY' },
      ],
      mentions: texte('BLV-MENTIONS-LEGALES'),
      retour: [
        { cle: 'Fenêtre de retour', valeur: texte('RET-FENETRE') },
        { cle: 'Défaut caché signalé', valeur: texte('RET-DEFAUT-H') },
        { cle: 'Garantie du vice caché', valeur: texte('RET-VICE') },
        { cle: 'Inspection d’un retour', valeur: texte('RET-INSPECT-H') },
        { cle: 'Remboursement sans retour physique', valeur: texte('RET-SANS-RETOUR') },
      ],
      preavisJ: P6.preavisJ,
    })
  },
  async proposerVersion(v) {
    exigerPage('legal', 'Contenus légaux')
    exiger('legal.publier')
    if (!motifOk(v.motif)) return { ok: false, raison: 'motif_court' }
    const t = systemeS6.lire().textes.find((x) => x.id === v.texte)
    if (!t) return { ok: false, raison: 'inconnu' }
    if (t.annonce && t.annonce.effet > maintenant()) return { ok: false, raison: 'deja_annoncee' }
    if (v.effet < debutJour(maintenant()) + P6.preavisJ * JOUR) return { ok: false, raison: 'preavis' }
    const mots = motsInterdits(`${v.resume} ${v.contenu}`)
    if (mots.length) return { ok: false, raison: 'vocabulaire', detail: mots.join(', ') }
    const [a, b] = t.version.split('.').map(Number)
    const version = `${a}.${b + 1}`
    systemeS6.ecrire((s) => void (s.textes.find((x) => x.id === v.texte)!.annonce = { version, effet: v.effet, annonceeLe: maintenant(), resume: v.resume.trim(), contenu: v.contenu.trim(), acceptes: 0 }))
    await journaliser({ action: 'legal.version', objet: `${t.titre} v${version}`, motif: v.motif })
    publier({ type: 'texte_annonce', texte: t.titre, version, effet: v.effet }, `admin-legal-${t.id}-${version}`, maintenant())
    return { ok: true, version }
  },
  async ajouterInterdit(categorie, produit, motif) {
    exigerPage('legal', 'Contenus légaux')
    refuser('Tenir la liste des produits interdits', ['superviseur'])
    if (!produit.trim()) return { ok: false, raison: 'vide' }
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const c = systemeS6.lire().interdits.find((x) => x.categorie === categorie)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (c.produits.some((p) => normer(p) === normer(produit.trim()))) return { ok: false, raison: 'existe' }
    systemeS6.ecrire((s) => void s.interdits.find((x) => x.categorie === categorie)!.produits.push(produit.trim()))
    await journaliser({ action: 'interdit.ajouter', objet: `${categorie} · ${produit.trim()}`, motif })
    return { ok: true }
  },
}

// ── États vivants lus par la File d'action (Direction) ────────────────────────────────────────────────────────────
/** Tâches planifiées dont la dernière exécution a échoué. */
export const tachesEnEchec = () => TACHES.map(tache).filter((t) => t.derniere && !t.derniere.ok)
