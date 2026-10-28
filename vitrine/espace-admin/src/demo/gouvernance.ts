// DONNÉES DE DÉMONSTRATION — domaine « gouvernance » (S6 : ADM-P30 à ADM-P34) : journal d'audit (sa part, détails,
// reconstitution, exports à quatre yeux, demandes de données), fraude (alertes CALCULÉES par fraude-moteur.ts sur des
// faits, revue, décision motivée, gel à quatre yeux), comptes de la console (nominatifs, Direction à quatre yeux,
// toujours deux comptes Direction), espaces pays, saisies assistées des agents terrain. Le journal chaîné reste dans
// journal.ts (socle) : ce fichier le prolonge et y écrit chaque geste. Aucun délai, seuil ni montant de règle n'est
// écrit ici (registre-s6.ts).
import { PARAMETRES } from '../calculs/registre'
import { droitDe } from '../config/droits'
import { AccesRefuse, type CodeZone, type EtatDecision, type Espace, type Role } from '../donnees/communs'
import type { AlerteFraude, ArcGraphe, CompteConsole, CompteLie, DemandeDonnees, DetailLigne, DomaineGouvernance, EspacePaysDetail, EtatAlerte, EtatCompte, ExportJournal, FicheTerrain, LigneJournal, NoeudGraphe, NouveauCompte, ParametrePays, PorteeExport, VisiteTerrain } from '../donnees/domaines/gouvernance'
import type { Agent } from '../donnees/domaines/session'
import { agentCourant, auPerimetre, exiger, exigerPage, roleCourant, zonesVisibles } from './acces'
import type { EspaceActeur } from '../donnees/domaines/acteurs'
import { creerSanction } from './acteurs'
import { calculerAlertes, type Faits } from './fraude-moteur'
import { ACTEURS_DEMO, evenementsPour, publier } from './pont'
import { jetonInvitation } from './agents-actives'
import { equipeDemo, etatDuCompte, tousLesAgents as agentsEquipe, type EtatMembre } from './equipe-etat'
import { equipeDuRole, perimetreParDefaut } from '../config/acces-console'
import { maintenant } from './horloge'
import { AGENTS, CLIENTS, COMMANDES, HEURE, JOUR, LITIGES, PAYS, RELAIS, T, ZONES, agent, nomAgent } from './jeu-essai'
import { demoGouvernance as socle, journalDemo, journaliser } from './journal'
import { quatreYeuxDemo } from './quatreyeux'
import { P6, texte } from './registre-s6'
import { magasin, repondre } from './stockage'

const MIN = 60_000
const motifOk = (m: string) => m.trim().length >= PARAMETRES.console.motifMin
const debutJour = (t: number) => t - ((t + HEURE) % JOUR)
const refuser = (quoi: string, roles: Role[]) => {
  if (!roles.includes(roleCourant())) throw new AccesRefuse(quoi, roles)
}
/** Issue d'une décision à quatre yeux (QY) : contre-signée, refusée, expirée (rendue comme refusée) ou en attente. */
function issueQY(qy: string): { etat: EtatDecision; le: number | null } {
  const d = quatreYeuxDemo.lire().decisions.find((x) => x.id === qy)
  if (!d) return { etat: 'a_contresigner', le: null }
  if (d.etat === 'a_contresigner' && d.expireLe < maintenant()) return { etat: 'refusee', le: d.expireLe }
  return { etat: d.etat, le: d.second?.le ?? null }
}

// ── Faits de la fraude (empreintes ; jamais un numéro en clair) ────────────────────────────────────────────────────
interface CompteFait {
  id: string
  nom: string
  espace: Espace
  zone: CodeZone
  creeLe: number
  commandes: number
  relais: string | null
  appareils: string[]
  numeros: string[]
}
const j = (n: number) => T(-n * 24 * 60)
const COMPTES_FAITS: CompteFait[] = [
  { id: 'v-pieces', nom: 'Pièces Auto Biyem', espace: 'vendeur', zone: 'Z6', creeLe: j(41), commandes: 11, relais: 'r-biyem', appareils: ['D-5a2f'], numeros: ['N-7712'] },
  { id: 'c-6120', nom: 'Client ••• 6120', espace: 'client', zone: 'Z6', creeLe: j(30), commandes: 4, relais: 'r-biyem', appareils: ['D-5a2f'], numeros: ['N-7712'] },
  { id: 'c-5530', nom: 'Client ••• 5530', espace: 'client', zone: 'Z6', creeLe: j(29), commandes: 4, relais: 'r-biyem', appareils: ['D-5a2f'], numeros: ['N-7712'] },
  { id: 'c-8841', nom: 'Client ••• 8841', espace: 'client', zone: 'Z6', creeLe: j(27), commandes: 3, relais: 'r-biyem', appareils: ['D-8c40'], numeros: ['N-7712'] },
  { id: 'c-0388', nom: 'Client ••• 0388', espace: 'client', zone: 'Z1', creeLe: j(60), commandes: 6, relais: 'r-bastos', appareils: ['D-c71e'], numeros: ['N-0388'] },
  { id: 'c-1902', nom: 'Client ••• 1902', espace: 'client', zone: 'Z1', creeLe: j(8), commandes: 1, relais: 'r-bastos', appareils: ['D-c71e'], numeros: ['N-1902'] },
  { id: 'c-4471', nom: 'Client ••• 4471', espace: 'client', zone: 'Z1', creeLe: j(7), commandes: 1, relais: 'r-bastos', appareils: ['D-c71e'], numeros: ['N-4471'] },
  { id: 'c-4217', nom: 'Client ••• 4217', espace: 'client', zone: 'Z9', creeLe: j(120), commandes: 9, relais: 'r-mvogada', appareils: ['D-1b07'], numeros: ['N-4217'] },
  { id: 'c-7731', nom: 'Client ••• 7731', espace: 'client', zone: 'Z3', creeLe: j(45), commandes: 5, relais: 'r-mokolo', appareils: ['D-77e2'], numeros: ['N-7731'] },
  { id: 'c-2954', nom: 'Client ••• 2954', espace: 'client', zone: 'Z6', creeLe: j(90), commandes: 3, relais: 'r-melen', appareils: ['D-2a9c'], numeros: ['N-2954'] },
  { id: 'v-beaute', nom: 'Beauté Melen', espace: 'vendeur', zone: 'Z6', creeLe: j(200), commandes: 64, relais: 'r-melen', appareils: ['D-be01'], numeros: ['N-be01'] },
  { id: 'v-saveurs', nom: 'Saveurs du Pays', espace: 'vendeur', zone: 'Z6', creeLe: j(150), commandes: 21, relais: 'r-melen', appareils: ['D-5a01'], numeros: ['N-5a01'] },
]
const FAITS: Faits = {
  identifiants: COMPTES_FAITS.map((c) => ({ compte: c.id, appareils: c.appareils, numeros: c.espace === 'vendeur' ? c.numeros : [], moyens: c.espace === 'vendeur' ? [] : c.numeros })), // numéro de versement d'une boutique, moyen de paiement d'un client (moteur)
  remboursements: [
    { compte: 'c-4217', le: j(20) },
    { compte: 'c-4217', le: j(9) },
    { compte: 'c-4217', le: j(2) },
    { compte: 'c-2954', le: j(12) },
  ],
  refus: { 'c-7731': 2, 'c-6120': 1 },
  notes: [
    { auteur: 'v-beaute', cible: 'v-saveurs', etoiles: 5 },
    { auteur: 'v-saveurs', cible: 'v-beaute', etoiles: 5 },
    { auteur: 'c-2954', cible: 'v-beaute', etoiles: 5 },
  ],
  retraits: [
    { compte: 'c-2954', montant: 85000, le: T(-20 * 60) },
    { compte: 'c-2954', montant: 85000, le: T(-9 * 60) },
    { compte: 'c-2954', montant: 85000, le: T(-150) },
    { compte: 'c-2954', montant: 85000, le: T(-40) },
  ],
}
/** Numéros en clair (le serveur ne garde qu'une empreinte ; le démasquage relit le moyen de paiement chiffré). */
const NUMEROS_CLAIRS: Record<string, string> = { 'N-7712': '+237 6 77 41 77 12' }
/** Versements en attente d'un vendeur (calculés par le serveur, jamais saisis). */
const VERSEMENTS_EN_ATTENTE: Record<string, { montant: number; commandes: number }> = { 'v-pieces': { montant: 79380, commandes: 11 } }

interface EtatAlerteStock {
  id: string
  detecteeLe: number
  etat: EtatAlerte
  revue: { par: string; le: number } | null
  issue: { motif: string; par: string; le: number } | null
  gelQY: string | null
  /** Signalement grave reçu d'un espace (report.filed) : l'alerte n'est pas calculée, elle est reçue. */
  signalement?: { espace: Espace; objet: string; motif: string; grave?: boolean } | null
}

// ── Comptes de la console, pays, terrain, journal ───────────────────────────────────────────────────────────────────
interface EtatGouv {
  alertes: Record<string, EtatAlerteStock> // clé du signal → état (une alerte tranchée n'est jamais rouverte)
  nAlerte: number
  details: Record<string, Partial<DetailLigne>> // empreinte de la ligne → avant / après
  exports: (Omit<ExportJournal, 'etat' | 'demandeur'> & { demandeurId: string })[]
  demandes: DemandeDonnees[]
  pays: EspacePaysDetail[]
  fiches: FicheTerrain[]
  nFiche: number
}


const parametresCM = (): ParametrePays[] => [
  { code: 'devise', libelle: 'Monnaie', valeur: `${PAYS.devise} · franc CFA`, etat: 'revu' },
  { code: 'fuseau', libelle: 'Fuseau horaire', valeur: 'Afrique/Douala (UTC+1)', etat: 'revu' },
  { code: 'langues', libelle: 'Langues', valeur: 'Français, anglais', etat: 'revu' },
  { code: 'PAY-AGREG', libelle: 'Agrégateur et secours', valeur: texte('PAY-AGREG'), etat: 'revu' },
  { code: 'operateurs', libelle: 'Opérateurs Mobile Money', valeur: 'MTN MoMo, Orange Money', etat: 'revu' },
  { code: 'PAY-CARTE-PSP', libelle: 'Prestataire carte (diaspora)', valeur: texte('PAY-CARTE-PSP'), etat: 'revu' },
  { code: 'VD-TVA', libelle: 'TVA', valeur: texte('VD-TVA'), etat: 'revu' },
  { code: 'LIV-RELAIS-BASE', libelle: 'Livraison en relais', valeur: texte('LIV-RELAIS-BASE'), etat: 'revu' },
  { code: 'LIV-DOM-BASE', libelle: 'Livraison à domicile', valeur: texte('LIV-DOM-BASE'), etat: 'revu' },
  { code: 'LIV-SEUIL-RELAIS', libelle: 'Livraison offerte en relais', valeur: texte('LIV-SEUIL-RELAIS'), etat: 'revu' },
  { code: 'GARDE-GRILLE', libelle: 'Grille de garde au relais (F par jour)', valeur: texte('GARDE-GRILLE'), etat: 'revu' },
  { code: 'textes', libelle: 'Textes légaux', valeur: '9 sur 9', etat: 'revu' },
  { code: 'urgence', libelle: 'Numéros d’urgence', valeur: '3 renseignés', etat: 'revu' },
  { code: 'feries', libelle: 'Jours fériés', valeur: 'Calendrier 2026 chargé', etat: 'revu' },
  { code: 'ZONES-EXPLOITEES', libelle: 'Zones exploitées', valeur: texte('ZONES-EXPLOITEES'), etat: 'revu' },
]
/** Paramètres qui ne se saisissent pas : ce sont les conditions d'ouverture (certification, textes adaptés, zones dessinées). */
const CONDITIONS = ['PAY-AGREG', 'textes', 'ZONES-EXPLOITEES']
const IDENTITE = ['devise', 'fuseau', 'langues']
function copie(code: string, nom: string, ville: string, devise: string, fuseau: string, le: number): EspacePaysDetail {
  return {
    code,
    nom,
    devise,
    ville,
    etat: 'preparation',
    copieDe: 'CM',
    creeLe: le,
    parametres: parametresCM().map((p) =>
      CONDITIONS.includes(p.code) || p.code === 'urgence' || p.code === 'feries'
        ? { ...p, valeur: p.code === 'textes' ? '0 sur 9' : p.code === 'ZONES-EXPLOITEES' ? '0 zone' : 'Non renseigné', etat: 'manquant' }
        : IDENTITE.includes(p.code)
          ? { ...p, valeur: p.code === 'devise' ? `${devise} · franc CFA` : p.code === 'fuseau' ? fuseau : 'Français', etat: code === 'GA' ? 'revu' : 'a_revoir' }
          : { ...p, valeur: `${p.valeur} (copié du Cameroun, bloqué)`, etat: 'a_revoir' },
    ),
    conditions: { textes: { ok: false, detail: '0 texte sur 9 adapté au droit du pays et validé' }, agregateur: { ok: false, detail: 'Aucun agrégateur certifié pour ce pays à ce jour' }, zones: { ok: false, detail: '0 zone définie · polygones à dessiner ville par ville' } },
    zones: [],
  }
}

const offre = (titre: string, prix: number, etat: 'brouillon' | 'validee' | 'a_corriger' = 'brouillon') => ({ titre, prix, etat })
const FICHES: FicheTerrain[] = [
  { id: 'ST-0041', genre: 'boutique', nom: 'Quincaillerie du Carrefour', zone: 'Z3', quartier: 'Mokolo', titulaire: 'Thomas Mbida', numeroMasque: '···· 21 06', autresRoles: [], agent: 'Linda Abena', binome: 'Stéphane Tchoua', creeLe: j(6), etat: 'publiee', lienEnvoyeLe: j(6), relances: 0, valideeLe: j(6) + 40 * MIN, photos: 4, piece: 'validee', offres: [offre('Cadenas laiton 50 mm', 3500, 'validee'), offre('Brouette renforcée', 38000, 'validee')], controle: { conforme: true, motif: 'Photos du local nettes, pièce cohérente avec le titulaire, offres validées par le vendeur.', par: 'Armand Kouam', le: j(5) }, chronologie: [{ le: j(6), t: 'Fiche préparée par Linda Abena' }, { le: j(6) + 40 * MIN, t: 'Validée par le vendeur sur son téléphone' }, { le: j(5), t: 'Contrôlée par la Vérification' }, { le: j(4), t: 'Boutique publiée' }] },
  { id: 'ST-0042', genre: 'boutique', nom: 'Ets Fotso Électroménager', zone: 'Z3', quartier: 'Mokolo, près du marché', titulaire: 'Emmanuel Fotso', numeroMasque: '···· 3 58', autresRoles: ['Compte client depuis le 3 septembre'], agent: 'Stéphane Tchoua', binome: 'Linda Abena', creeLe: T(-247), etat: 'lien_envoye', lienEnvoyeLe: T(-235), relances: 0, valideeLe: null, photos: 2, piece: 'en_revue', offres: [offre('Téléviseur 32 pouces', 89000), offre('Autocuiseur 6 litres', 24500), offre('Écouteurs sans fil', 12000)], controle: null, chronologie: [{ le: T(-247), t: 'Fiche commencée par Stéphane Tchoua' }, { le: T(-244), t: 'Numéro vérifié par code SMS, saisi par le vendeur' }, { le: T(-241), t: '2 photos du local · pièce photographiée (envoyée en revue KYC)' }, { le: T(-235), t: 'Lien de validation envoyé au vendeur' }] },
  { id: 'ST-0043', genre: 'boutique', nom: 'Mama Ngo Cosmétiques', zone: 'Z3', quartier: 'Mokolo', titulaire: 'Esther Ngo Mbe', numeroMasque: '···· 90 14', autresRoles: [], agent: 'Stéphane Tchoua', binome: 'Linda Abena', creeLe: T(-180), etat: 'brouillon', lienEnvoyeLe: null, relances: 0, valideeLe: null, photos: 3, piece: 'aucune', offres: [offre('Beurre de karité 250 g', 2500), offre('Savon noir artisanal', 1500), offre('Huile de coco 500 ml', 3000), offre('Crème mains au miel', 2000)], controle: null, chronologie: [{ le: T(-180), t: 'Saisie de catalogue commencée : l’agent photographie et dicte, la vendeuse valide chaque fiche' }] },
  { id: 'ST-0040', genre: 'relais', nom: 'Relais Obili', zone: 'Z2', quartier: 'Obili', titulaire: 'Samuel Etoga', numeroMasque: '···· 66 31', autresRoles: [], agent: 'Linda Abena', binome: 'Stéphane Tchoua', creeLe: j(2), etat: 'validee', lienEnvoyeLe: j(2), relances: 1, valideeLe: T(-26 * 60), photos: 5, piece: 'en_revue', offres: [], controle: null, chronologie: [{ le: j(2), t: 'Fiche relais préparée par Linda Abena' }, { le: j(1), t: 'Relance du gérant' }, { le: T(-26 * 60), t: 'Validée par le gérant sur son téléphone · pièce en revue (KYC-0088)' }] },
]
const VISITES: VisiteTerrain[] = [
  { n: 1, heure: T(-325), lieu: 'Quincaillerie du Carrefour · Mokolo', zone: 'Z3', but: 'Suivi : 2 photos du local ajoutées', etat: 'faite', fiche: 'ST-0041' },
  { n: 2, heure: T(-247), lieu: 'Ets Fotso Électroménager · Mokolo', zone: 'Z3', but: 'Ouverture préparée, en attente du vendeur', etat: 'faite', fiche: 'ST-0042' },
  { n: 3, heure: T(-180), lieu: 'Mama Ngo Cosmétiques · Mokolo', zone: 'Z3', but: 'Saisie de catalogue · 4 fiches sur 12', etat: 'en_cours', fiche: 'ST-0043' },
  { n: 4, heure: T(25), lieu: 'Sandrine Couture · Ngoa-Ekellé', zone: 'Z2', but: 'Première visite : présentation, ouverture si accord', etat: 'a_venir', fiche: null },
  { n: 5, heure: T(115), lieu: 'Librairie du Campus · Obili', zone: 'Z2', but: 'Première visite', etat: 'a_venir', fiche: null },
]
/** Visites des 7 derniers jours (zone, issue) : le rendement par zone en est CALCULÉ. */
type Issue = 'visite' | 'preparee' | 'validee' | 'publiee'
const HISTO: { zone: CodeZone; issue: Issue }[] = (
  [
    ['Z3', 14, 6, 4, 3],
    ['Z6', 11, 5, 3, 3],
    ['Z2', 8, 3, 2, 1],
    ['Z1', 5, 2, 1, 1],
  ] as const
).flatMap(([zone, v, p, a, b]) => {
  const de = (issue: Issue, k: number) => [...Array(k)].map(() => ({ zone, issue }))
  return [...de('visite', v - p), ...de('preparee', p - a), ...de('validee', a - b), ...de('publiee', b)]
})

export const gouvDemo = magasin<EtatGouv>('gouvernance', () => ({
  alertes: {
    'anneau:appareil|D-5a2f': { id: 'FR-261013-01', detecteeLe: T(-73), etat: 'nouvelle', revue: null, issue: null, gelQY: null },
    'anneau:appareil|D-c71e': { id: 'FR-261012-02', detecteeLe: T(-21 * 60), etat: 'revue', revue: { par: 'Mireille Ngo Bassong', le: T(-19 * 60) }, issue: null, gelQY: null },
    'remboursements:c-4217': { id: 'FR-261011-01', detecteeLe: j(2), etat: 'classee', revue: { par: 'Franck Penga', le: j(2) + 2 * HEURE }, issue: { motif: 'Les trois remboursements automatiques sont fondés : ruptures confirmées chez les vendeurs, colis jamais remis.', par: 'Franck Penga', le: j(1) }, gelQY: null },
    'avis_croises:v-beaute|v-saveurs': { id: 'FR-261009-01', detecteeLe: j(4), etat: 'sanction_proposee', revue: { par: 'Mireille Ngo Bassong', le: j(4) + HEURE }, issue: { motif: 'Les deux boutiques appartiennent à des sœurs et se notent 5 étoiles après chaque échange : dossier transmis aux sanctions.', par: 'Mireille Ngo Bassong', le: j(3) }, gelQY: null },
  },
  nAlerte: 2,
  details: {},
  exports: [],
  demandes: [
    { id: 'DA-0007', acteur: 'Client ••• 0388', espace: 'client', type: 'acces', recueLe: j(21), echeance: j(21) + P6.accesDonneesJ * JOUR, etat: 'ouverte', reponduLe: null, lignes: null },
    { id: 'DA-0006', acteur: 'Cédric M. · livreur parti', espace: 'livreur', type: 'export', recueLe: j(34), echeance: j(34) + P6.accesDonneesJ * JOUR, etat: 'repondue', reponduLe: j(12), lignes: 14 },
  ],
  pays: [],
  fiches: FICHES,
  nFiche: 43,
}))

// ── Journal ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ADRESSES: Record<string, string> = { 'a-franck': '102.244.···.18', 'a-nadege': '41.202.···.77', 'a-clarisse': '154.72.···.40', 'a-mireille': '102.244.···.31', 'a-yannick': '154.72.···.12', 'a-armand': '41.202.···.09', 'a-beatrice': '102.244.···.55', 'a-stephane': '154.72.···.63', 'a-linda': '154.72.···.64' }
const SENSIBLES = ['donnee.demasquer', 'piece.consulter', 'fraude.demasquer']

/** Écrit au journal avec l'avant et l'après (gardés à côté de la ligne, sous son empreinte). */
async function noter(action: string, objet: string, motif: string | null, avant: string | null = null, apres: string | null = null, zone: string | null = null) {
  return journaliser({ action, objet, motif, zone, avant, apres })
}
function detail(l: LigneJournal): DetailLigne {
  const a = tousLesAgents().find((x) => x.id === l.agentId)
  const d = l.avant != null || l.apres != null ? { avant: l.avant, apres: l.apres } : (gouvDemo.lire().details[l.empreinte] ?? {})
  return { avant: d.avant ?? null, apres: d.apres ?? null, adresse: ADRESSES[l.agentId] ?? '41.202.···.10', appareil: a?.appareils.find((x) => x.courant)?.nom ?? a?.appareils[0]?.nom ?? '—', sensible: SENSIBLES.includes(l.action) }
}
/** Lignes de « sa part » (socle : Direction et Audit voient tout), les plus récentes d'abord. */
const maPart = () => socle.journal({ limite: 100_000 })
const tout = () => ['superviseur', 'audit'].includes(roleCourant())
async function chaine() {
  return socle.verifierChaine()
}
async function lignesBrutes(): Promise<LigneJournal[]> {
  await socle.journal({ limite: 1 }) // amorce la chaîne
  return journalDemo.lire().lignes
}

// ── Fraude ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const parametresFraude = () => ({ ...P6.fraude })
const relaisNom = (id: string | null) => RELAIS.find((r) => r.id === id)?.nom ?? '—'
const masquerId = (lien: string | null, v: string | null) => (!v ? null : lien === 'numero' || lien === 'moyen' ? `MoMo ···· ${v.slice(-4, -2)} ${v.slice(-2)}` : `Appareil Android · ${v.slice(2)}…`)

function construire(cle: string, st: EtatAlerteStock): Omit<AlerteFraude, 'historique'> | null {
  if (st.signalement)
    return { id: st.id, type: 'signalement', lien: null, niveau: st.signalement.grave === false ? 'attention' : 'critique', mesure: 1, seuil: 1, montant: null, zone: null, detecteeLe: st.detecteeLe, comptes: [], identifiantMasque: null, noeuds: [], arcs: [], etat: st.etat === 'gel_demande' || st.etat === 'gel' ? 'revue' : st.etat, revueGelJ: P6.fraude.gelRevueJ, revue: st.revue, issue: st.issue, gel: null, signalement: { espace: st.signalement.espace, objet: st.signalement.objet, motif: st.signalement.motif } }
  const a = calculerAlertes(FAITS, maintenant(), parametresFraude()).find((x) => x.cle === cle)
  if (!a) return null
  const comptes = a.comptes.map((id) => COMPTES_FAITS.find((c) => c.id === id)!).filter(Boolean)
  // Graphe : comptes, puis tout identifiant ou relais partagé par au moins deux d'entre eux (tous les liens avant décision).
  const noeuds: NoeudGraphe[] = comptes.map((c) => ({ id: c.id, genre: c.espace === 'vendeur' ? 'vendeur' : 'client', libelle: c.nom, sous: `${c.espace === 'vendeur' ? 'vendeur' : 'client'} · ${c.zone}`, chaud: false }))
  const arcs: ArcGraphe[] = []
  const partage = (genre: 'appareil' | 'numero' | 'relais', valeurs: (c: CompteFait) => string[]) => {
    const par = new Map<string, CompteFait[]>()
    for (const c of comptes) for (const v of valeurs(c)) par.set(v, [...(par.get(v) ?? []), c])
    for (const [v, l] of par)
      if (l.length >= 2 || comptes.length === 1 || (genre === 'numero' && v === a.identifiant)) {
        noeuds.push({ id: `${genre}:${v}`, genre: genre === 'relais' ? 'relais' : genre, libelle: genre === 'relais' ? relaisNom(v) : masquerId(genre, v)!, sous: genre === 'relais' ? 'relais habituel' : genre === 'numero' ? 'payeur et numéro de versement' : 'même appareil', chaud: v === a.identifiant })
        for (const c of l) arcs.push({ de: c.id, vers: `${genre}:${v}`, nature: genre, n: genre === 'numero' ? c.commandes : null })
      }
  }
  partage('numero', (c) => c.numeros)
  partage('appareil', (c) => c.appareils)
  partage('relais', (c) => (c.relais ? [c.relais] : []))
  if (a.type === 'avis_croises') arcs.push({ de: a.comptes[0], vers: a.comptes[1], nature: 'note', n: null })
  const vendeur = comptes.find((c) => c.espace === 'vendeur')
  let etat = st.etat
  let gel: AlerteFraude['gel'] = null
  if (st.gelQY) {
    const q = issueQY(st.gelQY)
    const v = VERSEMENTS_EN_ATTENTE[vendeur?.id ?? ''] ?? { montant: 0, commandes: 0 }
    const d = quatreYeuxDemo.lire().decisions.find((x) => x.id === st.gelQY)
    gel = { qy: st.gelQY, etat: q.etat, montant: v.montant, commandes: v.commandes, vendeur: vendeur?.nom ?? '—', demandeLe: d?.premier.le ?? maintenant(), appliqueLe: q.etat === 'contresignee' ? q.le : null, revueLe: q.etat === 'contresignee' && q.le ? q.le + P6.fraude.gelRevueJ * JOUR : null }
    if (etat === 'gel_demande') etat = q.etat === 'contresignee' ? 'gel' : q.etat === 'refusee' ? 'revue' : 'gel_demande'
    // Gel contresigné : le vendeur est prévenu (motif sous 48 h), une seule fois par décision.
    if (q.etat === 'contresignee' && vendeur) publier({ type: 'versement_gele', acteurId: vendeur.id, alerte: st.id, motif: d?.motif ?? '' }, `admin-gel-${st.gelQY}`, q.le ?? maintenant())
  }
  const zones = comptes.map((c) => c.zone)
  return {
    id: st.id,
    type: a.type,
    lien: a.lien,
    niveau: a.niveau,
    mesure: a.mesure,
    seuil: a.seuil,
    montant: a.montant,
    zone: zones.sort((x, y) => zones.filter((z) => z === y).length - zones.filter((z) => z === x).length)[0] ?? null,
    detecteeLe: st.detecteeLe,
    comptes: comptes.map((c): CompteLie => ({ id: c.id, nom: c.nom, espace: c.espace, zone: c.zone, creeLe: c.creeLe, commandes: c.commandes, liens: [...(c.numeros.some((n) => arcs.some((x) => x.vers === `numero:${n}`)) ? ['numero' as const] : []), ...(c.appareils.some((n) => arcs.some((x) => x.vers === `appareil:${n}`)) ? ['appareil' as const] : []), ...(c.relais && arcs.some((x) => x.vers === `relais:${c.relais}`) ? ['relais' as const] : [])] })),
    identifiantMasque: masquerId(a.lien, a.identifiant),
    noeuds,
    arcs,
    etat,
    revueGelJ: P6.fraude.gelRevueJ,
    revue: st.revue,
    issue: st.issue,
    gel,
  }
}
/** Alertes connues (état gardé) + nouvelles levées par le calcul : une clé, une alerte, jamais rouverte. */
function etats(): [string, EtatAlerteStock][] {
  const s = gouvDemo.lire()
  const nouvelles = calculerAlertes(FAITS, maintenant(), parametresFraude()).filter((a) => !s.alertes[a.cle])
  if (nouvelles.length)
    gouvDemo.ecrire((x) => {
      for (const a of nouvelles) {
        x.nAlerte++
        const jour = new Date(maintenant() + HEURE).toISOString().slice(2, 10).replace(/-/g, '')
        x.alertes[a.cle] = { id: `FR-${jour}-${String(x.nAlerte).padStart(2, '0')}`, detecteeLe: a.type === 'retraits' ? T(-30) : a.type === 'comptoir' ? T(-50) : maintenant(), etat: 'nouvelle', revue: null, issue: null, gelQY: null }
      }
    })
  // Signalements des cinq espaces (report.filed) qui ne visent ni une offre ni un produit (ceux-là vont à la modération,
  // catalogue.ts) : comportement, colis suspect, paiement hors BelivaY… Une alerte par signalement (clé), jamais rouverte.
  const evs = evenementsPour('admin')
  const produits = new Set<string>([ACTEURS_DEMO.produit.id, ...evs.flatMap((e) => (e.type === 'order.paid' ? e.colis.flatMap((c) => c.lignes.map((l) => l.produit)) : []))])
  const signaux = evs.filter((e) => e.type === 'report.filed' && !/^(OF|FM)-/.test(e.objet) && !produits.has(e.objet) && !gouvDemo.lire().alertes[`signal-${e.cle}`])
  if (signaux.length)
    gouvDemo.ecrire((x) => {
      for (const e of signaux) {
        if (e.type !== 'report.filed') continue
        x.nAlerte++
        const jour = new Date(e.le + HEURE).toISOString().slice(2, 10).replace(/-/g, '')
        x.alertes[`signal-${e.cle}`] = { id: `FR-${jour}-${String(x.nAlerte).padStart(2, '0')}`, detecteeLe: e.le, etat: 'nouvelle', revue: null, issue: null, gelQY: null, signalement: { espace: e.espace, objet: e.objet, motif: e.motif, grave: e.gravite === 'grave' } }
      }
    })
  return Object.entries(gouvDemo.lire().alertes)
}
async function historique(a: Omit<AlerteFraude, 'historique'>): Promise<AlerteFraude['historique']> {
  const h = a.comptes.map((c) => ({ le: c.creeLe, t: `Ouverture du compte ${c.nom}`, d: `${c.espace === 'vendeur' ? 'vendeur' : 'client'} · ${c.zone}` }))
  h.push({ le: a.detecteeLe, t: 'Signal levé par le calcul', d: `${a.mesure} pour un seuil de ${a.seuil} · aucune action automatique` })
  for (const l of await lignesBrutes()) if (l.objet === a.id) h.push({ le: l.le, t: `${l.action} · ${l.agent}`, d: l.motif ?? '' })
  return h.sort((x, y) => x.le - y.le)
}
function stock(id: string): [string, EtatAlerteStock] | undefined {
  return etats().find(([, v]) => v.id === id)
}
function poser(id: string, f: (s: EtatAlerteStock) => void) {
  gouvDemo.ecrire((x) => {
    const e = Object.values(x.alertes).find((v) => v.id === id)
    if (e) f(e)
  })
}

// ── Comptes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const tousLesAgents = (): Agent[] => agentsEquipe()
function compteDe(a: Agent): CompteConsole {
  const s = equipeDemo.lire().membres[a.id]
  let etat: EtatCompte = etatDuCompte(a.id)
  let inviteLe = s?.inviteLe ?? null
  if (s?.qy && etat === 'a_contresigner') {
    const q = issueQY(s.qy)
    etat = q.etat === 'contresignee' ? 'invitation' : q.etat === 'refusee' ? 'ferme' : 'a_contresigner'
    // Création Direction contresignée : l'invitation part à la contre-signature.
    if (etat === 'invitation') inviteLe = inviteLe ?? q.le ?? maintenant()
  }
  // Compte du jeu d'essai déjà en invitation : une invitation récente (dans les 72 h).
  if (etat === 'invitation' && inviteLe === null) inviteLe = maintenant() - 5 * HEURE
  const vu = Math.max(...a.appareils.map((x) => x.vuLe), 0) || null
  const derniere = s?.derniereConnexion ?? vu
  return { agent: a, etat, derniereConnexion: derniere, confirmeLe: s?.confirmeLe ?? null, qy: s?.qy ?? null, amorcage: s?.amorcage ?? false, inviteLe, jetonActivation: etat === 'invitation' && inviteLe !== null ? jetonInvitation(a.id, inviteLe) : null, suspension: etat === 'suspendu' ? (s?.suspension ?? null) : null }
}
const comptesConsole = () => tousLesAgents().map(compteDe)
const estDirection = (c: CompteConsole) => c.agent.roles.includes('superviseur') && (c.etat === 'actif' || c.etat === 'invitation')
const directionActifs = () => comptesConsole().filter(estDirection).length
function finDeTrimestre(t: number): number {
  const d = new Date(t + HEURE)
  const m = Math.floor(d.getUTCMonth() / 3) * 3 + 3
  return Date.UTC(d.getUTCFullYear(), m, 0, 17 - 1, 0)
}
const slug = (p: string, n: string) => `a-${(p + '-' + n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')}`

// ── Pays ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function espaces(): EspacePaysDetail[] {
  const s = gouvDemo.lire()
  const exploitees = PARAMETRES.zonesExploitees.map((z) => z.code)
  const cm: EspacePaysDetail = {
    code: PAYS.code,
    nom: PAYS.nom,
    devise: PAYS.devise,
    ville: PAYS.ville,
    etat: 'ouvert',
    copieDe: null,
    creeLe: j(90),
    parametres: parametresCM(),
    conditions: { textes: { ok: true, detail: '9 textes versionnés, acceptés par chaque acteur actif' }, agregateur: { ok: true, detail: texte('PAY-AGREG') }, zones: { ok: true, detail: `${ZONES.length} zones définies · ${exploitees.length} exploitées` } },
    zones: ZONES.map((z) => ({ code: z.code, nom: z.nom, exploitee: exploitees.includes(z.code), relais: RELAIS.filter((r) => r.zone === z.code && r.statut !== 'en_activation').length })),
  }
  const ga = s.pays.length ? [] : [copie('GA', 'Gabon', 'Libreville', 'XAF', 'Afrique/Libreville (UTC+1)', j(2))]
  return [cm, ...ga, ...s.pays]
}

// ── Domaine ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const demoGouvernance: DomaineGouvernance = {
  ...socle,

  async tableauJournal(f) {
    exigerPage('journal', 'Journal d’audit')
    const part = await maPart()
    const t0 = debutJour(maintenant())
    let l = part
    if (f.periode === 'jour') l = l.filter((x) => x.le >= t0)
    if (f.periode === '7j') l = l.filter((x) => x.le >= t0 - 6 * JOUR)
    if (f.agentId) l = l.filter((x) => x.agentId === f.agentId)
    if (f.role) l = l.filter((x) => x.role === f.role)
    if (f.action) l = l.filter((x) => x.action === f.action)
    if (f.q) {
      const q = f.q.toLowerCase()
      l = l.filter((x) => [x.agent, x.action, x.objet, x.motif ?? '', x.zone ?? ''].join(' ').toLowerCase().includes(q))
    }
    const agents = [...new Map(part.map((x) => [x.agentId, { id: x.agentId, nom: x.agent }])).values()]
    return repondre({
      lignes: l.map((x) => ({ ...x, detail: detail(x) })),
      total: part.length,
      aujourdhui: part.filter((x) => x.le >= t0).length,
      consultations: part.filter((x) => x.action === 'journal.consulter' && x.le >= t0).length,
      sensibles: part.filter((x) => SENSIBLES.includes(x.action) && x.le >= t0).length,
      chaine: await chaine(),
      tout: tout(),
      agents,
      actions: [...new Set(part.map((x) => x.action))].sort(),
      conservationAns: Number(texte('ADM-CONSERV-ARGENT-ANS').split(' ')[0]),
    })
  },
  async consulterJournal() {
    exigerPage('journal', 'Journal d’audit')
    const l = await lignesBrutes()
    const moi = agentCourant().id
    if (l.some((x) => x.agentId === moi && x.action === 'journal.consulter' && maintenant() - x.le < MIN)) return
    await noter('journal.consulter', 'Journal d’audit', null)
  },
  async reconstituer(objet, jusqua) {
    exigerPage('journal', 'Journal d’audit')
    const l = (await maPart()).filter((x) => x.objet.includes(objet) && x.le <= jusqua).reverse()
    const avecEtat = l.map((x) => detail(x).apres).filter((x): x is string => !!x)
    return repondre({ objet, jusqua, lignes: l, etat: avecEtat.at(-1) ?? null })
  },
  async lierExport(qy, portee) {
    exiger('exporter')
    const l = await maPart()
    const n = portee.genre === 'periode' ? l.filter((x) => x.le >= portee.du && x.le <= portee.au).length : l.filter((x) => lignesActeur(portee.demande, x)).length
    gouvDemo.ecrire((s) => void s.exports.unshift({ id: `EX-${String(s.exports.length + 1).padStart(4, '0')}`, qy, portee, lignes: n, demandeurId: agentCourant().id, demandeLe: maintenant(), telechargeLe: null }))
  },
  async exportsJournal() {
    exigerPage('journal', 'Journal d’audit')
    return repondre(gouvDemo.lire().exports.map((e) => ({ ...e, etat: issueQY(e.qy).etat, demandeur: nomAgent(agent(e.demandeurId)) })))
  },
  async telechargerExport(id) {
    exiger('exporter')
    const e = gouvDemo.lire().exports.find((x) => x.id === id)
    if (!e) return { ok: false, raison: 'inconnu' }
    if (issueQY(e.qy).etat !== 'contresignee') return { ok: false, raison: 'pas_valide' }
    const l = (await maPart()).filter((x) => (e.portee.genre === 'periode' ? x.le >= e.portee.du && x.le <= e.portee.au : lignesActeur(e.portee.demande, x))).reverse()
    const lignes = l.map((x) => {
      const d = detail(x)
      return [new Date(x.le).toISOString(), x.agent, x.role, x.action, x.objet, x.motif ?? '', d.avant ?? '', d.apres ?? '', d.adresse, d.appareil, x.empreinte]
    })
    await noter('journal.exporter', id, `Export signé, ${l.length} lignes, validé à quatre yeux (${e.qy})`)
    gouvDemo.ecrire((s) => void (s.exports.find((x) => x.id === id)!.telechargeLe = maintenant()))
    return { ok: true, entetes: ['horodatage', 'auteur', 'role', 'action', 'objet', 'motif', 'avant', 'apres', 'adresse', 'appareil', 'empreinte'], lignes, nom: `journal-${id}.csv` }
  },
  async demandesDonnees() {
    refuser('Demandes de données', ['superviseur', 'audit', 'support'])
    return repondre(gouvDemo.lire().demandes)
  },
  async enregistrerDemande(d) {
    refuser('Enregistrer une demande de données', ['superviseur', 'support'])
    if (!motifOk(d.motif) || !d.acteur.trim()) return { ok: false, raison: 'motif_court' }
    let id = ''
    gouvDemo.ecrire((s) => {
      id = `DA-${String(s.demandes.length + 6).padStart(4, '0')}`
      s.demandes.unshift({ id, acteur: d.acteur.trim(), espace: d.espace, type: d.type, recueLe: maintenant(), echeance: maintenant() + P6.accesDonneesJ * JOUR, etat: 'ouverte', reponduLe: null, lignes: null })
    })
    await noter('donnees.demande', id, d.motif, null, 'Ouverte')
    return { ok: true, id }
  },
  async repondreDemande(id, motif) {
    refuser('Répondre à une demande de données', ['superviseur'])
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const d = gouvDemo.lire().demandes.find((x) => x.id === id)
    if (!d) return { ok: false, raison: 'inconnu' }
    if (d.etat === 'repondue') return { ok: false, raison: 'deja_repondue' }
    const l = (await lignesBrutes()).filter((x) => lignesActeur(id, x))
    // Sans données de tiers : ni le nom de l'agent, ni l'adresse, ni l'appareil ; le rôle seulement.
    const lignes = l.map((x) => [new Date(x.le).toISOString(), x.role, x.action, x.objet, x.motif ?? ''])
    gouvDemo.ecrire((s) => {
      const x = s.demandes.find((y) => y.id === id)!
      x.etat = 'repondue'
      x.reponduLe = maintenant()
      x.lignes = lignes.length
    })
    await noter('donnees.exporter', id, motif, 'Ouverte', `Répondue · ${lignes.length} lignes`)
    publier({ type: 'donnees_exportees', demande: id }, `admin-donnees-${id}`, maintenant())
    return { ok: true, entetes: ['horodatage', 'role', 'action', 'objet', 'motif'], lignes, nom: `donnees-${id}.csv` }
  },

  async fraude() {
    exigerPage('fraude', 'Fraude et anneaux')
    const alertes: AlerteFraude[] = []
    for (const [cle, st] of etats()) {
      const a = construire(cle, st)
      if (a) alertes.push({ ...a, historique: [] })
    }
    alertes.sort((x, y) => y.detecteeLe - x.detecteeLe)
    const t30 = maintenant() - P6.fraude.fenetreJ * JOUR
    const recentes = alertes.filter((a) => a.detecteeLe >= t30)
    const familles = [
      ['anneau', 'numero'],
      ['anneau', 'moyen'],
      ['anneau', 'appareil'],
      ['remboursements', null],
      ['comptoir', null],
      ['avis_croises', null],
      ['retraits', null],
      ['signalement', null],
    ] as const
    return repondre({
      alertes,
      signaux: familles.map(([type, lien]) => ({ type, lien, n: recentes.filter((a) => a.type === type && a.lien === lien).length })),
      regles: { ...P6.fraude },
      issues30j: { classees: recentes.filter((a) => a.etat === 'classee').length, sanctions: recentes.filter((a) => a.etat === 'sanction_proposee').length, gelsLeves: recentes.filter((a) => a.etat === 'gel_leve').length, automatiques: 0 },
    })
  },
  async alerte(id) {
    exigerPage('fraude', 'Fraude et anneaux')
    const e = stock(id)
    const a = e && construire(e[0], e[1])
    return repondre(a ? { ...a, historique: await historique(a) } : null)
  },
  async ouvrirRevue(id) {
    if (droitDe('fraude', roleCourant()).acces !== 'oui') throw new AccesRefuse('Ouvrir une revue de fraude', ['superviseur', 'mediation', 'audit'])
    const e = stock(id)
    if (!e) return { ok: false, raison: 'inconnu' }
    if (e[1].revue) return { ok: true }
    poser(id, (s) => {
      s.revue = { par: nomAgent(agentCourant()), le: maintenant() }
      if (s.etat === 'nouvelle') s.etat = 'revue'
    })
    await noter('fraude.revue.ouvrir', id, 'Graphe complet consulté avant toute décision', 'Nouvelle', 'En revue')
    return { ok: true }
  },
  async classerAlerte(id, motif) {
    exiger('fraude.decider')
    return trancher(id, motif, 'classee', 'fraude.classer', 'Classée sans suite')
  },
  async proposerSanction(id, motif) {
    exiger('fraude.decider')
    const r = await trancher(id, motif, 'sanction_proposee', 'sanction.proposer', 'Dossier transmis aux sanctions')
    if (!r.ok) return r
    // Le dossier arrive dans Sanctions et recours (S3) : un par compte vendeur de l'alerte, sinon le premier compte ;
    // niveau 2 proposé, la Médiation ou la Direction décide (recours ouvert à l'acteur).
    const a = alertesVivantes().find((x) => x.id === id)
    const vises = a ? (a.comptes.some((c) => c.espace === 'vendeur') ? a.comptes.filter((c) => c.espace === 'vendeur') : a.comptes.slice(0, 1)) : []
    for (const c of vises) await creerSanction({ acteurId: c.id, acteur: c.nom, espace: c.espace as EspaceActeur, zone: c.zone, niveau: 2, motif, origine: `Alerte de fraude ${id}` })
    return r
  },
  async lierGel(id, qy) {
    exiger('fraude.decider')
    poser(id, (s) => {
      s.gelQY = qy
      s.etat = 'gel_demande'
    })
  },
  async leverGel(id, motif) {
    exiger('fraude.decider')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const e = stock(id)
    const a = e && construire(e[0], e[1])
    if (!a || a.etat !== 'gel') return { ok: false, raison: 'pas_de_gel' }
    poser(id, (s) => {
      s.etat = 'gel_leve'
      s.issue = { motif, par: nomAgent(agentCourant()), le: maintenant() }
    })
    await noter('fraude.gel.lever', id, motif, 'Versements retenus', 'Gel levé · versements au vendredi suivant')
    const vd = a.comptes.find((c) => c.espace === 'vendeur')
    if (vd) publier({ type: 'versement_degele', acteurId: vd.id, alerte: id, motif }, `admin-degel-${id}-${maintenant()}`, maintenant())
    return { ok: true }
  },
  async demasquerIdentifiant(id, motif) {
    exiger('demasquer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const e = stock(id)
    const a = e && calculerAlertes(FAITS, maintenant(), parametresFraude()).find((x) => x.cle === e[0])
    await noter('fraude.demasquer', id, motif)
    return { ok: true, valeur: (a?.identifiant && NUMEROS_CLAIRS[a.identifiant]) || '—' }
  },

  async comptes() {
    exigerPage('roles', 'Rôles et accès')
    return repondre({ comptes: comptesConsole(), directionActifs: directionActifs(), directionMin: P6.directionMin, inactifJ: P6.compteInactifJ, prochaineRevue: finDeTrimestre(maintenant()), sessionHeures: PARAMETRES.console.sessionHeures, sessionInactifMin: P6.sessionInactifMin, brisGlaceH: P6.brisGlaceH })
  },
  async creerCompte(c) {
    exiger('role.attribuer')
    const e = verifierNouveau(c)
    if (e) return { ok: false, raison: e }
    if (c.role === 'superviseur') return { ok: false, raison: 'direction_quatre_yeux' }
    const id = ajouterAgent(c, 'invitation', null, false)
    await noter('role.attribuer', `Compte ${c.prenom} ${c.nom}`, `Invitation envoyée à ${c.email}`, null, `${c.role} · ${c.zones?.join(', ') ?? 'tous les périmètres'}`)
    return { ok: true, id }
  },
  async lierCreationDirection(qy, c) {
    exiger('role.attribuer')
    ajouterAgent(c, 'a_contresigner', qy, directionActifs() < P6.directionMin)
  },
  async modifierCompte(id, m, motif) {
    exiger('role.attribuer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (!m.roles.length) return { ok: false, raison: 'sans_role' }
    const avant = c.agent.roles.includes('superviseur')
    if (id === agentCourant().id) return { ok: false, raison: 'soi_meme' }
    if (roleCourant() === 'rh' && (avant || m.roles.includes('superviseur'))) return { ok: false, raison: 'direction_quatre_yeux' }
    if (!avant && m.roles.includes('superviseur')) return { ok: false, raison: 'direction_quatre_yeux' }
    if (avant && !m.roles.includes('superviseur') && directionActifs() - 1 < P6.directionMin) return { ok: false, raison: 'direction_min' }
    equipeDemo.ecrire((s) => {
      const x = s.membres[id]
      if (!x) return
      x.equipe = equipeDuRole(m.roles[0])
      x.roleAdditionnel = m.roles[1] ?? null
      x.perimetre = { ...x.perimetre, zones: m.zones }
    })
    await noter('role.modifier', `Compte ${nomAgent(c.agent)}`, motif, `${c.agent.roles.join(', ')} · ${c.agent.zones?.join(', ') ?? 'tous'}`, `${m.roles.join(', ')} · ${m.zones?.join(', ') ?? 'tous'}`)
    return { ok: true }
  },
  async fermerAcces(id, motif) {
    exiger('role.attribuer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    if (id === agentCourant().id) return { ok: false, raison: 'soi_meme' }
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (estDirection(c) && roleCourant() === 'rh') return { ok: false, raison: 'direction_quatre_yeux' }
    if (estDirection(c) && directionActifs() - 1 < P6.directionMin) return { ok: false, raison: 'direction_min' }
    const reattribues = quatreYeuxDemo.lire().decisions.filter((d) => d.etat === 'a_contresigner' && d.premier.agentId === id).length
    setCompte(id, { etat: 'ferme', sessionsFermeesLe: maintenant() })
    await noter('acces.fermer', `Compte ${nomAgent(c.agent)}`, motif, c.etat, `Fermé · sessions révoquées · ${reattribues} dossier(s) réattribué(s)`)
    return { ok: true, reattribues }
  },
  async confirmerCompte(id) {
    exiger('role.attribuer')
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (c.etat === 'ferme') return { ok: false, raison: 'ferme' }
    setCompte(id, { confirmeLe: maintenant() })
    await noter('acces.confirmer', `Compte ${nomAgent(c.agent)}`, 'Revue trimestrielle : rôle et périmètre confirmés', null, `${c.agent.roles.join(', ')} · ${c.agent.zones?.join(', ') ?? 'tous'}`)
    return { ok: true }
  },
  async suspendreCompte(id, motif) {
    exiger('role.attribuer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    if (id === agentCourant().id) return { ok: false, raison: 'soi_meme' }
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (c.etat !== 'actif') return { ok: false, raison: 'etat' }
    if (estDirection(c) && roleCourant() === 'rh') return { ok: false, raison: 'direction_quatre_yeux' }
    if (estDirection(c) && directionActifs() - 1 < P6.directionMin) return { ok: false, raison: 'direction_min' }
    setCompte(id, { etat: 'suspendu', suspension: { motif, le: maintenant(), par: nomAgent(agentCourant()) }, sessionsFermeesLe: maintenant() })
    await noter('acces.suspendre', `Compte ${nomAgent(c.agent)}`, motif, 'Actif', 'Suspendu · sessions révoquées')
    return { ok: true }
  },
  async renvoyerInvitation(id) {
    exiger('role.attribuer')
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    if (c.etat !== 'invitation') return { ok: false, raison: 'etat' }
    setCompte(id, { inviteLe: maintenant() })
    await noter('role.inviter', `Compte ${nomAgent(c.agent)}`, `Invitation renvoyée à ${c.agent.email}`, null, 'Nouveau lien d’activation')
    return { ok: true }
  },
  async reactiverCompte(id, motif) {
    exiger('role.attribuer')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const c = comptesConsole().find((x) => x.agent.id === id)
    if (!c) return { ok: false, raison: 'inconnu' }
    setCompte(id, { etat: 'actif', reactiveLe: maintenant(), suspension: null })
    await noter('acces.reactiver', `Compte ${nomAgent(c.agent)}`, motif, c.etat, 'Actif')
    return { ok: true }
  },

  async pays() {
    exigerPage('pays', 'Espaces pays')
    return repondre(espaces())
  },
  async copierPays(code, nom, motif) {
    exigerPage('pays', 'Espaces pays')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    if (espaces().some((p) => p.code === code)) return { ok: false, raison: 'existe' }
    const v = CEMAC.find((x) => x.code === code)
    if (!v) return { ok: false, raison: 'inconnu' }
    gouvDemo.ecrire((s) => {
      if (!s.pays.length) s.pays.push(copie('GA', 'Gabon', 'Libreville', 'XAF', 'Afrique/Libreville (UTC+1)', j(2)))
      s.pays.push(copie(code, nom, v.ville, v.devise, v.fuseau, maintenant()))
    })
    await noter('pays.copier', `Espace ${nom}`, motif, null, 'En préparation · valeurs copiées du Cameroun, bloquées')
    return { ok: true }
  },
  async revoirParametre(code, param, valeur) {
    exigerPage('pays', 'Espaces pays')
    if (!valeur.trim()) return { ok: false, raison: 'vide' }
    if (CONDITIONS.includes(param)) return { ok: false, raison: 'condition' }
    const p = espaces().find((x) => x.code === code && x.etat === 'preparation')
    const avant = p?.parametres.find((x) => x.code === param)
    if (!p || !avant) return { ok: false, raison: 'inconnu' }
    gouvDemo.ecrire((s) => {
      if (!s.pays.length) s.pays.push(copie('GA', 'Gabon', 'Libreville', 'XAF', 'Afrique/Libreville (UTC+1)', j(2)))
      const x = s.pays.find((y) => y.code === code)!.parametres.find((y) => y.code === param)!
      x.valeur = valeur.trim()
      x.etat = 'revu'
    })
    await noter('pays.parametre', `Espace ${p.nom} · ${avant.libelle}`, null, avant.valeur, valeur.trim())
    return { ok: true }
  },
  async ouvrirPays(code, motif) {
    exigerPage('pays', 'Espaces pays')
    const p = espaces().find((x) => x.code === code)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (!p.conditions.textes.ok || !p.conditions.agregateur.ok || !p.conditions.zones.ok) return { ok: false, raison: 'conditions' }
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    gouvDemo.ecrire((s) => {
      const x = s.pays.find((y) => y.code === code)
      if (x) x.etat = 'ouvert'
    })
    await noter('pays.ouvrir', `Espace ${p.nom}`, motif, 'En préparation', 'Ouvert')
    publier({ type: 'espace_ouvert', pays: code }, `admin-pays-${code}`, maintenant())
    return { ok: true }
  },

  async terrain() {
    exigerPage('comptes', 'Comptes et agents terrain')
    const s = gouvDemo.lire()
    const moi = agentCourant()
    const fiches = roleCourant() === 'terrain' ? s.fiches.filter((f) => f.agent === nomAgent(moi) || f.binome === nomAgent(moi)) : s.fiches
    const zonesVues = zonesVisibles()
    const rendement = ZONES.filter((z) => HISTO.some((h) => h.zone === z.code))
      .filter((z) => !zonesVues || zonesVues.includes(z.code) || roleCourant() === 'terrain')
      .map((z) => {
        const h = HISTO.filter((x) => x.zone === z.code)
        const plus = s.fiches.filter((f) => f.zone === z.code && f.creeLe >= maintenant() - 7 * JOUR && !FICHES.some((g) => g.id === f.id)).length
        return { zone: z.code, nom: z.nom, visites: h.length + plus, preparees: h.filter((x) => x.issue !== 'visite').length + plus, validees: h.filter((x) => x.issue === 'validee' || x.issue === 'publiee').length, publiees: h.filter((x) => x.issue === 'publiee').length }
      })
    const binome = AGENTS.filter((a) => a.roles.includes('terrain'))
    return repondre({ agents: binome.map((a) => ({ id: a.id, nom: nomAgent(a), zones: a.zones ?? [] })), visites: VISITES, fiches: auPerimetre(fiches), rendement })
  },
  async nouvelleFiche(f) {
    exiger('compte.saisir')
    if (!f.nom.trim() || !f.titulaire.trim() || !f.quartier.trim() || f.numero.replace(/\D/g, '').length < 9) return { ok: false, raison: 'incomplet' }
    const z = zonesVisibles()
    if (z && !z.includes(f.zone)) return { ok: false, raison: 'hors_zone' }
    const chiffres = f.numero.replace(/\D/g, '')
    const client = CLIENTS.find((c) => c.telephone.endsWith(chiffres.slice(-9)))
    const moi = agentCourant()
    let id = ''
    gouvDemo.ecrire((s) => {
      s.nFiche++
      id = `ST-${String(s.nFiche).padStart(4, '0')}`
      s.fiches.unshift({ id, genre: f.genre, nom: f.nom.trim(), zone: f.zone, quartier: f.quartier.trim(), titulaire: f.titulaire.trim(), numeroMasque: `···· ${chiffres.slice(-4, -2)} ${chiffres.slice(-2)}`, autresRoles: client ? ['Compte client existant sur ce numéro'] : [], agent: nomAgent(moi), binome: moi.note?.replace('Binôme de ', '') ?? null, creeLe: maintenant(), etat: 'brouillon', lienEnvoyeLe: null, relances: 0, valideeLe: null, photos: 0, piece: 'aucune', offres: [], controle: null, chronologie: [{ le: maintenant(), t: `Fiche commencée par ${nomAgent(moi)}` }] })
    })
    await noter('terrain.fiche', id, null, null, `Brouillon · ${f.nom.trim()} · ${f.zone}`, f.zone)
    return { ok: true, id }
  },
  async envoyerLien(id) {
    exiger('compte.saisir')
    const f = gouvDemo.lire().fiches.find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (f.etat !== 'brouillon') return { ok: false, raison: 'etat' }
    majFiche(id, (x) => {
      x.etat = 'lien_envoye'
      x.lienEnvoyeLe = maintenant()
      x.chronologie.push({ le: maintenant(), t: 'Lien de validation envoyé sur le numéro vérifié' })
    })
    await noter('terrain.lien', id, null, 'Brouillon', 'Lien envoyé à l’acteur', f.zone)
    publier({ type: 'fiche_a_valider', fiche: id, espace: f.genre === 'boutique' ? 'vendeur' : 'relais', acteur: f.nom }, `admin-fiche-${id}`, maintenant())
    return { ok: true }
  },
  async relancer(id) {
    exiger('compte.saisir')
    const f = gouvDemo.lire().fiches.find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (f.etat !== 'lien_envoye') return { ok: false, raison: 'etat' }
    majFiche(id, (x) => {
      x.relances++
      x.chronologie.push({ le: maintenant(), t: `Relance n° ${x.relances} envoyée à l’acteur` })
    })
    await noter('terrain.relancer', id, null, null, null, f.zone)
    return { ok: true }
  },
  async controlerFiche(id, conforme, motif) {
    exiger('kyc.decider')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const f = gouvDemo.lire().fiches.find((x) => x.id === id)
    if (!f) return { ok: false, raison: 'inconnu' }
    if (f.etat !== 'validee' && f.etat !== 'publiee') return { ok: false, raison: 'etat' }
    majFiche(id, (x) => {
      x.controle = { conforme, motif, par: nomAgent(agentCourant()), le: maintenant() }
      if (!conforme) x.etat = 'a_corriger'
      x.chronologie.push({ le: maintenant(), t: conforme ? 'Contrôlée conforme par la Vérification' : 'Renvoyée à l’agent pour correction' })
    })
    await noter('terrain.controler', id, motif, f.etat, conforme ? 'Contrôlée conforme' : 'À corriger', f.zone)
    return { ok: true }
  },
}

/** Espaces pays de la CEMAC qu'on peut préparer (copie du Cameroun). */
export const CEMAC = [
  { code: 'GA', nom: 'Gabon', ville: 'Libreville', devise: 'XAF', fuseau: 'Afrique/Libreville (UTC+1)' },
  { code: 'CG', nom: 'Congo', ville: 'Brazzaville', devise: 'XAF', fuseau: 'Afrique/Brazzaville (UTC+1)' },
  { code: 'TD', nom: 'Tchad', ville: 'N’Djaména', devise: 'XAF', fuseau: 'Afrique/Ndjamena (UTC+1)' },
  { code: 'CF', nom: 'Centrafrique', ville: 'Bangui', devise: 'XAF', fuseau: 'Afrique/Bangui (UTC+1)' },
  { code: 'GQ', nom: 'Guinée équatoriale', ville: 'Malabo', devise: 'XAF', fuseau: 'Afrique/Malabo (UTC+1)' },
]

async function trancher(id: string, motif: string, etat: EtatAlerte, action: string, apres: string) {
  if (!motifOk(motif)) return { ok: false as const, raison: 'motif_court' as const }
  const e = stock(id)
  const a = e && construire(e[0], e[1])
  if (!a) return { ok: false as const, raison: 'deja_tranchee' as const }
  if (!a.revue) return { ok: false as const, raison: 'pas_de_revue' as const }
  if (['classee', 'sanction_proposee', 'gel_leve'].includes(a.etat) || (etat === 'classee' && a.etat === 'gel')) return { ok: false as const, raison: 'deja_tranchee' as const }
  poser(id, (s) => {
    s.etat = etat
    s.issue = { motif, par: nomAgent(agentCourant()), le: maintenant() }
  })
  await noter(action, id, motif, a.etat, apres, a.zone)
  return { ok: true as const }
}

/** Lignes d'une demande d'accès : celles qui nomment l'acteur ou ses commandes (sans données de tiers). */
function lignesActeur(demande: string, l: LigneJournal): boolean {
  const d = gouvDemo.lire().demandes.find((x) => x.id === demande)
  if (!d) return false
  const num = /••• (\d{4})/.exec(d.acteur)?.[1]
  const client = num ? CLIENTS.find((c) => c.masque.endsWith(num)) : null
  const refs = client ? COMMANDES.filter((c) => c.client === client.id).map((c) => c.ref) : []
  const litiges = client ? LITIGES.filter((x) => x.client === client.id).map((x) => x.id) : []
  return [d.acteur, ...refs, ...litiges].some((r) => l.objet.includes(r)) || l.objet === demande
}

function verifierNouveau(c: NouveauCompte): 'incomplet' | 'email_pris' | null {
  if (!c.prenom.trim() || !c.nom.trim() || !/^[^@\s]+@belivay\.com$/.test(c.email.trim())) return 'incomplet'
  if ((c.role === 'operations' || c.role === 'terrain') && !c.zones?.length) return 'incomplet'
  if (tousLesAgents().some((a) => a.email === c.email.trim())) return 'email_pris'
  return null
}
function ajouterAgent(c: NouveauCompte, etat: EtatCompte, qy: string | null, amorcage: boolean): string {
  const id = slug(c.prenom, c.nom)
  const zone = c.role === 'operations' || c.role === 'terrain'
  const a: Agent = { id, prenom: c.prenom.trim(), nom: c.nom.trim(), initiales: (c.prenom[0] + c.nom[0]).toUpperCase(), roles: [c.role], zones: zone ? c.zones : null, telephone: '—', email: c.email.trim(), secondFacteur: 'application', appareils: [] }
  const equipe = equipeDuRole(c.role)
  const niveau = c.role === 'operations' ? 'responsable' : 'agent'
  equipeDemo.ecrire((s) => {
    s.nouveaux.push(a)
    s.membres[id] = { equipe, niveau, perimetre: perimetreParDefaut(equipe, niveau, zone ? c.zones : null), roleAdditionnel: null, temporaires: [], etat, derniereConnexion: null, confirmeLe: null, qy, amorcage, reactiveLe: null, inviteLe: etat === 'invitation' ? maintenant() : null, suspension: null, depart: null, sessionsFermeesLe: null }
  })
  return id
}
function setCompte(id: string, m: Partial<EtatMembre>) {
  equipeDemo.ecrire((s) => void (s.membres[id] && Object.assign(s.membres[id], m)))
}
function majFiche(id: string, f: (x: FicheTerrain) => void) {
  gouvDemo.ecrire((s) => f(s.fiches.find((x) => x.id === id)!))
}
/** Alertes nouvelles (compteur « fraude » de la coque, à brancher : INTEGRATION.md). */
export const alertesAInstruire = () => etats().filter(([, v]) => v.etat === 'nouvelle').length
export type { PorteeExport }
// ── États vivants lus par la File d'action (filtrés par l'appelant) ────────────────────────────────────────────────
/** Alertes calculées avec leur état (nouvelle, gel à revoir…), sans historique. */
export const alertesVivantes = () => etats().map(([cle, st]) => construire(cle, st)).filter((a): a is Omit<AlerteFraude, 'historique'> => a !== null)
/** Demandes de données ouvertes. */
/** Ce qui attend les Ressources humaines sur les comptes des employés (File d'action) : compte suspendu pour
 *  inactivité, invitation sans suite, rôle à confirmer avant la fin du trimestre. */
export function comptesAEquipe(): { id: string; nom: string; motif: 'suspendu' | 'invitation' | 'revue'; depuis: number; echeance: number | null }[] {
  const n = maintenant()
  type Ligne = { id: string; nom: string; motif: 'suspendu' | 'invitation' | 'revue'; depuis: number; echeance: number | null }
  return comptesConsole().flatMap((c): Ligne[] => {
    const nom = nomAgent(c.agent)
    if (c.etat === 'suspendu') return [{ id: c.agent.id, nom, motif: 'suspendu', depuis: c.derniereConnexion ?? n, echeance: null }]
    if (c.etat === 'invitation') return [{ id: c.agent.id, nom, motif: 'invitation', depuis: c.inviteLe ?? n, echeance: null }]
    return []
  })
}
export const demandesOuvertes = () => gouvDemo.lire().demandes.filter((d) => d.etat === 'ouverte')
