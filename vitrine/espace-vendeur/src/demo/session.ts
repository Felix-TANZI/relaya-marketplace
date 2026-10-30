// DONNÉES DE DÉMONSTRATION — domaine « session » (VD-03) : le « serveur » de la connexion et de l'ouverture.
// - Session : membre connecté (propriétaire ou accès Préparation), boutique, pastilles et badges, lus dans les autres
//   domaines de la démonstration (aucun compteur écrit).
// - Connexion : identifiant (@Penga12) ou e-mail du compte, mot de passe d'essai « Belivay2026 » (même valeur que la
//   démonstration du client) ; 5 essais faux puis 15 minutes (MDP-ESSAIS) ; appareil inconnu : code SMS (CNX-01) ;
//   Google et Apple liés au compte du propriétaire ; numéro et code (celui d'Aïcha ouvre l'accès Préparation).
// - Codes : 6 chiffres, 10 minutes, 5 essais puis 15 minutes, 60 s entre deux envois, 3 envois par heure (OTP-*, lus
//   dans le registre). Le code tiré au sort est rendu à l'écran sous « Démonstration » (l'API ne le renvoie jamais).
// - Ouverture : dossier en trois étapes, zone déduite du point (comme le serveur), deux comptes au plus par numéro,
//   pièces, numéro de versement, vérification (réponse donnée à la main sous « Démonstration »), contrat dont les
//   lignes sont lues dans les paramètres en vigueur et l'exemple calculé par src/calculs.
// - Saisie assistée : six fiches de l'agent de zone, contrôle du prix anormal recalculé à chaque modification.
// Valeurs de console propres au vendeur (parametres-vendeur.json), tenues ici par le « serveur » de démonstration :
// PWD_RESET_LINK_TTL_MIN, KYC_AUTO_MAX_MIN, KYC_HUMAN_MAX_H_OUVREES, RESILIATION_PREAVIS_J, SAI_FREE_FIRST_SHOPS,
// SAI_SESSION_PRICE_F, prix anormal (DP-56 Q-40), refus de pièces (DP-57 S-2).
import { calculerCommission20 } from './commission20'
import type {
  ArriveeClient,
  Canal,
  ContratVendeur,
  DefiConnexion,
  DomaineSession,
  DossierOuverture,
  EnvoiCode,
  FicheAgent,
  ResultatCode,
  ResultatConnexion,
  ResultatRenvoi,
  SaisieAssistee,
  SessionVendeur,
  StatutVendeur,
  Zone,
} from '../donnees/domaines/session'
import { FORME_NIU, FORME_RCCM, ReserveAuProprietaire, type Role } from '../donnees/communs'
import { CENTRES } from '@client/donnees/geo'
import { ZONES_EXPLOITEES, ZONES_YAOUNDE, zoneDuPoint } from '../calculs/zones'
import { decouverteActive, familleDe, finDecouverte } from '../calculs/commission'
import { Dec } from '../calculs/argent'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, jourDe, jourSemaine, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, MEMBRES, MOT_DE_PASSE_ESSAI } from './jeu-essai'
import { magasin, repondre } from './stockage'
import { etatBoutique } from './boutique'
import { compterCommandes, commandesComptees } from './commandes'
import { nonLuesNotifications } from './notifications'
import { nonLusMessages } from './messages'
import { argentGele } from './argent'
import { planCourant } from './plans'
import { decisionEnCours } from './trust'
import { membreEquipe, membresActifs } from './equipe'
import { TOUS_LES_DROITS, type Droit } from '../donnees/droits'
import { ajouterNotification } from './notifications'
import { ajouterFichesSaisie, brouillonsDeLOuverture, publierBrouillonsDeLOuverture } from './produits'
import { decisionsConsole, demanderActivation } from './pont-console'

// ── Paramètres ─────────────────────────────────────────────────────────────────────────────────────────────────────

const lireCode = (code: string, motif: RegExp): RegExpExecArray => {
  const m = motif.exec(REGISTRE[code] ?? '')
  if (!m) throw new Error(`${code} : forme inattendue « ${REGISTRE[code]} »`)
  return m
}
const OTP = {
  chiffres: Number(lireCode('OTP-LONG', /^(\d+) chiffres$/)[1]),
  minutes: Number(lireCode('OTP-DUREE', /^(\d+) minutes$/)[1]),
  essais: Number(lireCode('OTP-ESSAIS', /^(\d+), puis (\d+) minutes/)[1]),
  attenteMinutes: Number(lireCode('OTP-ESSAIS', /^(\d+), puis (\d+) minutes/)[2]),
  renvoiSecondes: Number(lireCode('OTP-RENVOI', /^(\d+) s entre deux envois, (\d+) envois par heure$/)[1]),
  envoisParHeure: Number(lireCode('OTP-RENVOI', /^(\d+) s entre deux envois, (\d+) envois par heure$/)[2]),
}
const MDP = {
  essais: Number(lireCode('MDP-ESSAIS', /^(\d+), puis (\d+) minutes$/)[1]),
  attenteMinutes: Number(lireCode('MDP-ESSAIS', /^(\d+), puis (\d+) minutes$/)[2]),
  longueur: Number(lireCode('MDP-LONG', /^(\d+) caractères au moins, dont un chiffre$/)[1]),
}
// Valeurs de console lues au registre (DP-57 : VD-MDP-LIEN, VD-KYC-DELAIS, VD-SAISIE-ASSISTEE, VD-PRIX-ANORMAL,
// VD-RESILIATION-PREAVIS).
export const PARAMETRES_ACCES = { otp: OTP, mdp: MDP, lienMinutes: PARAMETRES.console.lienMotDePasseMinutes }
const KYC = PARAMETRES.console.kyc
const SAISIE = { ...PARAMETRES.console.saisie, ...PARAMETRES.console.prixAnormal }
const PREAVIS_JOURS = PARAMETRES.console.preavisJours
const VERSION_CONTRAT = '2026-10'
const EMAIL_ESSAI = 'franck.penga@exemple.cm'

const chiffres = (s: string) => s.replace(/\D/g, '').replace(/^237(?=6\d{8}$)/, '')
export const masquer = (n: string) => (n.length === 9 ? `${n.slice(0, 3)} •• •• ${n.slice(7)}` : n)
/** Opérateur Mobile Money d'un numéro camerounais (préfixes MTN et Orange). */
export function operateurDe(n: string): 'MTN' | 'Orange' | null {
  if (!/^6\d{8}$/.test(n)) return null
  const p2 = Number(n.slice(0, 2))
  const p3 = Number(n.slice(0, 3))
  if (p2 === 67 || (p3 >= 650 && p3 <= 654) || (p3 >= 680 && p3 <= 683)) return 'MTN'
  if (p2 === 69 || (p3 >= 655 && p3 <= 659)) return 'Orange'
  return null
}
const telephoneDe = (m: (typeof MEMBRES)[number]) => chiffres(m.telephone)
const PROPRIO = MEMBRES.find((m) => m.role === 'proprietaire')!
const estLeCompte = (v: string) => {
  const s = v.trim().toLowerCase()
  return s.replace(/^@?/, '@') === BOUTIQUE.identifiant.toLowerCase() || s === EMAIL_ESSAI || chiffres(s) === telephoneDe(PROPRIO)
}

// ── Codes ──────────────────────────────────────────────────────────────────────────────────────────────────────────

interface Defi {
  id: string
  code: string
  telephone: string
  canal: Canal
  envoyeA: number
  essais: number
  bloqueJusqua: number
  envois: number[]
}
const tirer = () => String(Math.floor(Math.random() * 10 ** OTP.chiffres)).padStart(OTP.chiffres, '0')
const nouvelId = () => Math.random().toString(36).slice(2, 10)
function creerDefi(telephone: string, canal: Canal): Defi {
  const t = maintenant()
  return { id: nouvelId(), code: tirer(), telephone, canal, envoyeA: t, essais: 0, bloqueJusqua: 0, envois: [t] }
}
function envoiDe(d: Defi): EnvoiCode {
  const t = maintenant()
  return {
    id: d.id,
    canal: d.canal,
    destination: masquer(d.telephone),
    envoyeA: d.envoyeA,
    valideMinutes: OTP.minutes,
    renvoiSecondes: Math.max(0, Math.ceil((d.envoyeA + OTP.renvoiSecondes * 1000 - t) / 1000)),
    renvoisRestants: Math.max(0, OTP.envoisParHeure - d.envois.filter((x) => t - x < HEURE).length),
    codeDemo: d.code,
  }
}
/** Vérifie un code (le défi est modifié en place : à appeler dans un ecrire()). */
function verifier(d: Defi, code: string): ResultatCode {
  const t = maintenant()
  if (d.bloqueJusqua > t) return { ok: false, raison: 'bloque', jusqua: d.bloqueJusqua }
  if (t > d.envoyeA + OTP.minutes * 60_000) return { ok: false, raison: 'expire' }
  if (code === d.code) return { ok: true }
  d.essais++
  if (d.essais >= OTP.essais) {
    d.bloqueJusqua = t + OTP.attenteMinutes * 60_000
    d.essais = 0
    return { ok: false, raison: 'bloque', jusqua: d.bloqueJusqua }
  }
  return { ok: false, raison: 'code', essaisRestants: OTP.essais - d.essais }
}
function renvoyer(d: Defi, canal?: Canal): ResultatRenvoi {
  const t = maintenant()
  const attente = Math.ceil((d.envoyeA + OTP.renvoiSecondes * 1000 - t) / 1000)
  if (attente > 0) return { ok: false, raison: 'trop_tot', secondes: attente }
  const recents = d.envois.filter((x) => t - x < HEURE)
  if (recents.length >= OTP.envoisParHeure) return { ok: false, raison: 'limite', jusqua: Math.min(...recents) + HEURE }
  d.code = tirer()
  d.envoyeA = t
  d.essais = 0
  d.envois = [...recents, t]
  if (canal) d.canal = canal
  return { ok: true, envoi: envoiDe(d) }
}

// ── Session ────────────────────────────────────────────────────────────────────────────────────────────────────────

const etat = magasin('session', () => ({ connecte: true, membre: 'm-franck' }))
// Accès : appareil reconnu, « se souvenir », essais faux, défis en cours, mot de passe d'essai.
const acces = magasin('acces', () => ({
  appareilConnu: true,
  seSouvenir: true,
  echecs: 0,
  bloqueJusqua: 0,
  motDePasse: MOT_DE_PASSE_ESSAI,
  defi: null as (Defi & { demandeA: number }) | null,
  numero: null as (Defi & { membre: string }) | null,
  lien: null as { jeton: string; envoyeA: number; compte: boolean; defi: Defi | null } | null,
}))
const CLE_ONGLET = 'blv_v_session_onglet'
const ongletOuvert = () => {
  try {
    return sessionStorage.getItem(CLE_ONGLET) === '1'
  } catch {
    return true
  }
}
const marquerOnglet = () => {
  try {
    sessionStorage.setItem(CLE_ONGLET, '1')
  } catch {
    /* rien */
  }
}

/** Scénario du prototype : « ?role=prep » montre l'accès employé d'Aïcha ; « ?role=<id d'un membre> » celui d'un autre
 *  employé de l'équipe (démonstration seulement, comme les états ?st= du client). */
function employeDemande(): string | null {
  try {
    const r = new URLSearchParams(location.search).get('role')
    if (r === 'prep') return MEMBRES.find((m) => m.role === 'preparation')!.id
    if (r && membreEquipe(r)?.role === 'preparation') return r
  } catch {
    /* hors navigateur */
  }
  return null
}
export function roleCourant(): Role {
  if (employeDemande()) return 'preparation'
  return MEMBRES.find((m) => m.id === etat.lire().membre)?.role ?? 'proprietaire'
}
export const estProprietaire = () => roleCourant() === 'proprietaire'

/** Identifiant du membre connecté (propriétaire, ou employé du scénario ?role=). */
export const membreCourant = (): string => employeDemande() ?? etat.lire().membre

/** Droits du membre connecté (src/donnees/droits.ts) : tous pour le propriétaire, ceux cochés pour un employé. */
export function droitsCourants(): Droit[] {
  if (estProprietaire()) return TOUS_LES_DROITS
  return membreEquipe(membreCourant())?.droits ?? []
}
export const aLeDroit = (d: Droit): boolean => droitsCourants().includes(d)

/** Refus du serveur (403) pour un droit que l'employé n'a pas : l'écran dit « Réservé ». */
export function exigerDroit(d: Droit, quoi: string) {
  if (!aLeDroit(d)) throw new ReserveAuProprietaire(quoi)
}
/** Même refus, pour une méthode qui rend une promesse sans être async. */
export const avecDroit = <T>(d: Droit, quoi: string, f: () => Promise<T>): Promise<T> => (aLeDroit(d) ? f() : Promise.reject(new ReserveAuProprietaire(quoi)))

/** Connecté : session ouverte, et gardée sur l'appareil (« Se souvenir de moi ») ou ouverte dans cet onglet. */
const connecteMaintenant = () => etat.lire().connecte && (acces.lire().seSouvenir || ongletOuvert())

function lireSession(): SessionVendeur {
  const e = etat.lire()
  const role = roleCourant()
  const idEmploye = role === 'preparation' ? membreCourant() : null
  const employe = idEmploye ? membreEquipe(idEmploye) : null
  // Un employé retiré n'est plus dans l'équipe : il garde son nom pour l'écran de connexion, plus sa session.
  const membre = employe ?? (idEmploye ? (MEMBRES.find((m) => m.id === idEmploye) ?? MEMBRES.find((m) => m.role === 'preparation')!) : MEMBRES.find((m) => m.id === e.membre)!)
  // Un membre retiré de l'équipe perd sa session (EQU-04, VD11-R22) : la connexion s'ouvre.
  const connecte = connecteMaintenant() && membresActifs().includes(membre.id)
  // Sanction en cours (domaine trust ; scénario ?cas=suspension de la démonstration) : pastilles « Compte suspendu ».
  const sanction = decisionEnCours()
  const b = etatBoutique()
  const jour = jourDe(maintenant())
  const comptees = commandesComptees()
  const decouverte = decouverteActive(BOUTIQUE.premiereCommandePayee, jour, comptees, PARAMETRES.commission)
  return {
    connecte,
    membre: connecte ? { id: membre.id, prenom: membre.prenom, nom: membre.nom, initiales: membre.initiales, role, droits: droitsCourants(), profil: employe?.profil ?? null } : null,
    proprietaire: { prenom: PROPRIO.prenom, nom: PROPRIO.nom },
    boutique: {
      nom: BOUTIQUE.nom,
      etat: sanction?.type === 'suspension' ? 'suspendue' : b.enPause ? 'en_pause' : b.fermeeAujourdhui ? 'fermee_aujourdhui' : 'ouverte',
      fermeA: b.fermeA,
      palier: BOUTIQUE.palier,
      trustScore: BOUTIQUE.trustScore,
      plan: planCourant(), // essai ou plan payé (domaine plans), pas le plan du jeu d'essai
      decouverte: { active: decouverte, fin: finDecouverte(BOUTIQUE.premiereCommandePayee, PARAMETRES.commission), commandes: comptees },
    },
    badges: { notifications: nonLuesNotifications(), commandes: compterCommandes().prep, messages: nonLusMessages() },
    argentGele: role === 'proprietaire' && argentGele() > 0,
    maintenant: maintenant(),
  }
}

function ouvrirSession(membre: string, seSouvenir: boolean) {
  marquerOnglet()
  acces.ecrire((a) => {
    a.seSouvenir = seSouvenir
    a.echecs = 0
    a.bloqueJusqua = 0
    a.defi = null
    a.numero = null
  })
  etat.ecrire((e) => {
    e.connecte = true
    e.membre = membre
  })
}

/** Connexion par lien reçu par e-mail ou par Google (kit « compte », démonstration) : la session du propriétaire. */
export function ouvrirParCompte(seSouvenir: boolean) {
  ouvrirSession(PROPRIO.id, seSouvenir)
}

/** Appareil qui demande la connexion (navigateur réel ; lieu donné par le réseau côté serveur). */
function appareilDemandeur() {
  let ua = ''
  try {
    ua = navigator.userAgent
  } catch {
    /* hors navigateur */
  }
  const sys = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Ordinateur'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  return { nom: `${sys} · ${nav}`, lieu: 'Yaoundé' }
}
const defiPublic = (d: Defi & { demandeA: number }): DefiConnexion => ({ ...envoiDe(d), appareil: appareilDemandeur(), demandeA: d.demandeA })

function apresIdentification(seSouvenir: boolean): ResultatConnexion {
  if (acces.lire().appareilConnu) {
    ouvrirSession(PROPRIO.id, seSouvenir)
    return { ok: true, session: lireSession() }
  }
  // Appareil inconnu : le code part par SMS au numéro du compte (CNX-01, V14) ; la session s'ouvre après le code.
  const d = { ...creerDefi(telephoneDe(PROPRIO), 'sms'), demandeA: maintenant() }
  acces.ecrire((a) => {
    a.defi = d
    a.seSouvenir = seSouvenir
  })
  return { ok: false, raison: 'deuxieme_facteur', defi: defiPublic(d) }
}

// ── Ouverture ──────────────────────────────────────────────────────────────────────────────────────────────────────

// Zones de Yaoundé (la zone est calculée par le serveur à partir du point, VD03-R06) : les douze polygones de la carte
// (src/calculs/zones.ts) ; « centres » : quartiers de geo.ts (CENTRES) dont le centre tombe dans la zone ; celui qui
// donne son nom à la zone porte le centre BelivaY de la zone, les autres un relais BelivaY (GET /hubs).
export const ZONES: { code: string; nom: string; quartiers: string; centres: string[] }[] = ZONES_YAOUNDE.map((z) => ({
  code: z.code,
  nom: z.nom,
  quartiers: z.nomComplet,
  centres: Object.keys(CENTRES).filter((q) => zoneDuPoint(CENTRES[q][0], CENTRES[q][1]) === z.code),
}))
/** Zone du point (polygone qui le contient), même forme que le kit (vendeur_session.ouverture.zone_du_point) : code,
 *  nom complet, zone exploitée ou non ; null : hors des douze zones de Yaoundé. */
export function zoneDe(p: { lat: number; lon: number }): Zone | null {
  const z = ZONES.find((x) => x.code === zoneDuPoint(p.lat, p.lon))
  return z ? { code: z.code, quartiers: z.quartiers, exploitee: ZONES_EXPLOITEES.includes(z.code) } : null
}

/** Ajoute des heures ouvrées BelivaY : toutes les heures sauf le dimanche (DP-15, DP-56 Q-53). */
function plusHeuresOuvrees(depuis: number, heures: number): number {
  let t = depuis
  let reste = heures
  while (reste > 0) {
    t += HEURE
    if (jourSemaine(jourDe(t)) !== 6) reste--
  }
  return t
}

// Comptes vendeur déjà ouverts par numéro (contrôle serveur à l'envoi du code, OUV-03, DP-56 Q-21).
const COMPTES_PAR_NUMERO: Record<string, number> = { [telephoneDe(PROPRIO)]: 1, '690112233': 2 }

const pourCent = (d: Dec) => d.texte().replace('.', ',')
function contratEnVigueur(): ContratVendeur {
  const p = PARAMETRES.commission
  const taux = Object.values(p.bareme).flatMap((ts) => ts.map((x) => x.tauxPourCent))
  const plusHaut = taux.reduce((a, b) => (b.cmp(a) > 0 ? b : a))
  const plusBas = taux.reduce((a, b) => (b.cmp(a) < 0 ? b : a))
  const a = ARTICLES['itel-noir']
  const ligne = [{ famille: familleDe(a.categorie, p), prixUnitaire: a.prix }]
  const avec = calculerCommission20(ligne, 'Bronze', true, p).garde
  const sans = calculerCommission20(ligne, 'Bronze', false, p).garde
  const pal = PARAMETRES.paliers
  return {
    version: VERSION_CONTRAT,
    gardeMinPourCent: pourCent(Dec.de(100).moins(plusHaut)),
    gardeMaxPourCent: pourCent(Dec.de(100).moins(plusBas)),
    minimumParCommande: p.plancherCommande,
    plafondDemarrage: pal.plafondDemarrage,
    commandesDemarrage: pal.demarrageCommandes,
    preavisJours: PREAVIS_JOURS,
    exemple: { titre: a.titre, prix: a.prix, garde: avec, gainDecouverte: avec - sans },
    decouverte: { mois: p.decouverteMois, commandes: p.decouverteCommandes },
    lancement: { mois: pal.lancementMois, argent: pal.lancementProduits.Argent, or: pal.lancementProduits.Or, platine: pal.lancementProduits.Platine },
    immatricule: false,
    rccm: '',
    niu: '',
    signeA: null,
  }
}

const element = () => ({ etat: 'a_faire' as const, a: null, motif: null })
type Dossier = Omit<DossierOuverture, 'contrat' | 'delais' | 'refusMax'> & { contrat: Pick<ContratVendeur, 'immatricule' | 'rccm' | 'niu' | 'signeA'> }
const ouv = magasin('ouverture', () => ({
  dossier: null as Dossier | null,
  code: null as Defi | null,
  versement: null as Defi | null,
  comptes: COMPTES_PAR_NUMERO,
  seq: 913,
}))

/** Dossier de la boutique déjà ouverte du jeu d'essai (signée le 20 août) : tout est vérifié. */
function dossierDuJeuDEssai(): Dossier {
  const signe = yaounde(2026, 9, 11, 10)
  const v = { etat: 'verifie' as const, a: signe, motif: null }
  return {
    ref: 'VD-2026-0820',
    depuisClient: false,
    etape: 'signee',
    boutique: { nom: BOUTIQUE.nom, categorie: 'Électronique', statut: BOUTIQUE.statut, telephone: masquer(telephoneDe(PROPRIO)), zone: zoneDe(BOUTIQUE.position), point: { ...BOUTIQUE.position, precision: 0 } },
    numeroVerifie: true,
    pieces: { recto: v, verso: v, selfie: v },
    versement: { ...v, operateur: BOUTIQUE.numeroVersement.operateur, masque: BOUTIQUE.numeroVersement.masque },
    envoyeA: signe - 2 * HEURE,
    reponseAvant: null,
    refus: 0,
    brouillons: 0,
    enLigne: 3,
    contrat: { immatricule: false, rccm: '', niu: '', signeA: signe },
  }
}
function complet(d: Dossier): DossierOuverture {
  return { ...d, brouillons: d.brouillons + brouillonsDeLOuverture(d.ref), contrat: { ...contratEnVigueur(), ...d.contrat }, delais: { autoMinutes: KYC.autoMinutes, humainHeures: KYC.humainHeures }, refusMax: KYC.refusMax }
}
/** Référence du dossier d'ouverture en cours (pas encore signé), ou null : les brouillons créés s'y rattachent. */
export function ouvertureEnCours(): string | null {
  const d = ouv.lire().dossier
  return d && d.etape !== 'signee' && d.etape !== 'refusee' ? d.ref : null
}
function dossierCourant(): Dossier | null {
  const d = ouv.lire().dossier
  if (d) return d
  return connecteMaintenant() && estProprietaire() ? dossierDuJeuDEssai() : null
}
/** Pièce du dossier d'ouverture nommée par la console (recto, verso, selfie ; « cni », « identité » : le recto). */
const pieceKyc = (nature: string): PieceKycVd => (/verso/i.test(nature) ? 'verso' : /selfie|visage|photo/i.test(nature) ? 'selfie' : 'recto')
type PieceKycVd = 'recto' | 'verso' | 'selfie'
/**
 * Décision de la console sur le dossier d'ouverture envoyé (pont : kyc_decide), comme la réponse de démonstration :
 * approuvé, l'ouverture passe au contrat (brouillons publiables en ligne) ; complément, les pièces visées sont à
 * renvoyer avec leur motif ; rejeté (ou refus répétés, KYC.refusMax), le dossier est refusé. Vrai si appliquée.
 */
function decisionKycConsole(dossier: string, decision: 'approuve' | 'rejete' | 'complement', pieces: { nature: string; motif: string | null }[]): boolean {
  let fait = false
  ouv.ecrire((x) => {
    const d = x.dossier
    if (!d || d.ref !== dossier || d.etape !== 'attente') return
    const t = maintenant()
    if (decision === 'approuve') {
      for (const k of ['recto', 'verso', 'selfie'] as const) d.pieces[k] = { etat: 'verifie', a: t, motif: null }
      d.etape = 'contrat'
      d.enLigne = d.brouillons + publierBrouillonsDeLOuverture(d.ref)
    } else {
      d.refus++
      const visees = pieces.filter((p) => p.motif)
      for (const p of visees.length ? visees : [{ nature: 'recto', motif: 'Pièce à reprendre.' }]) d.pieces[pieceKyc(p.nature)] = { etat: 'refuse', a: t, motif: p.motif }
      d.etape = decision === 'rejete' || d.refus >= KYC.refusMax ? 'refusee' : 'pieces'
    }
    d.reponseAvant = null
    fait = true
  })
  return fait
}
// Les décisions de la console arrivées depuis la dernière lecture s'appliquent au dossier avant qu'on le lise (une fois
// chacune, clé) ; une décision qui ne vise pas le dossier en attente est seulement marquée vue.
const KYC_VUS = magasin('ouverture_console', () => ({ cles: [] as string[] }))
let appliquantKyc = false
function appliquerKycConsole() {
  if (appliquantKyc) return
  appliquantKyc = true
  try {
    const vus = new Set(KYC_VUS.lire().cles)
    const l = decisionsConsole('vendeur').filter((e) => e.type === 'kyc_decide' && !vus.has(e.cle))
    if (!l.length) return
    for (const e of l) if (e.type === 'kyc_decide') decisionKycConsole(e.dossier, e.decision, e.pieces)
    KYC_VUS.ecrire((s) => void s.cles.push(...l.map((e) => e.cle)))
  } finally {
    appliquantKyc = false
  }
}
const lireOuverture = ouv.lire
ouv.lire = () => (appliquerKycConsole(), lireOuverture())
const piecesRecues = (d: Dossier) => (['recto', 'verso', 'selfie'] as const).every((k) => d.pieces[k].etat === 'recu' || d.pieces[k].etat === 'verifie') && d.versement.etat === 'verifie'

// Arrivée depuis l'espace client (même appareil, même session) : le compte client de la démonstration du client.
function lireCompteClient(): { present: boolean; arrivee: ArriveeClient | null } {
  try {
    const brut = localStorage.getItem('blv_demo_etat')
    if (!brut) return { present: false, arrivee: null }
    const e = JSON.parse(brut) as { profil?: { prenom?: string; numeroMasque?: string; operateur?: 'MTN' | 'Orange' }; boutique?: { nom: string; categorie: string; type: StatutVendeur; code?: string } | null }
    if (!e.boutique || !e.profil) return { present: true, arrivee: null }
    return {
      present: true,
      arrivee: {
        ref: 'VD-2026-' + (e.boutique.code?.replace(/\D/g, '') || '0913'),
        prenom: e.profil.prenom ?? '',
        boutique: { nom: e.boutique.nom, categorie: e.boutique.categorie, statut: e.boutique.type },
        telephone: e.profil.numeroMasque ?? '',
        operateur: e.profil.operateur ?? null,
      },
    }
  } catch {
    return { present: false, arrivee: null }
  }
}
// Sans compte client sur l'appareil : la demande du jeu d'essai (prototype, « Carine Mode »).
const ARRIVEE_ESSAI: ArriveeClient = { ref: 'VD-2026-0913', prenom: 'Carine', boutique: { nom: 'Carine Mode', categorie: 'Mode Femme', statut: 'particulier' }, telephone: '677 •• •• 41', operateur: 'MTN' }

// ── Saisie assistée ────────────────────────────────────────────────────────────────────────────────────────────────

const ok4 = { photo: 'ok', doublon: 'ok', prix: 'ok', description: 'ok' } as const
const FICHES: FicheAgent[] = [
  { id: 'sa-1', titre: 'Écouteurs filaires · jack 3,5 mm', dessin: 'ecouteurs', prix: 2500, stock: 15, photos: 3, controles: { ...ok4 }, rattachee: false, mediane: 3000, modifieeA: null },
  { id: 'sa-2', titre: 'Chargeur 10 W · micro-USB', dessin: 'charger', prix: 1500, stock: 12, photos: 3, controles: { ...ok4 }, rattachee: false, mediane: 2000, modifieeA: null },
  { id: 'sa-3', titre: 'Coque ITEL A70 · transparente', dessin: 'coque', prix: 1500, stock: 18, photos: 3, controles: { ...ok4 }, rattachee: false, mediane: 1500, modifieeA: null },
  { id: 'sa-4', titre: 'Écouteurs Bluetooth · boîtier', dessin: 'ecouteurs', prix: 6000, stock: 6, photos: 4, controles: { ...ok4 }, rattachee: false, mediane: 7000, modifieeA: null },
  { id: 'sa-5', titre: 'Chargeur rapide 18 W · USB-C', dessin: 'charger', prix: 1800, stock: 10, photos: 3, controles: { ...ok4, prix: 'echec' }, rattachee: false, mediane: 4000, modifieeA: null },
  { id: 'sa-6', titre: 'Coque ITEL AC52 · silicone', dessin: 'coque', prix: 2000, stock: 20, photos: 3, controles: { ...ok4, doublon: 'echec' }, rattachee: true, mediane: 2000, modifieeA: null },
]
const saisie = magasin('saisie_assistee', () => ({ fiches: FICHES, validees: [] as SaisieAssistee['validees'] }))
const prixAnormal = (prix: number, mediane: number | null) => mediane !== null && (prix * 100 < mediane * SAISIE.basPourCent || prix > mediane * SAISIE.hautFois)
function lireSaisie(): SaisieAssistee {
  const s = saisie.lire()
  const proprio = estProprietaire()
  return {
    agent: { prenom: 'Aïssatou B.', zone: BOUTIQUE.zone },
    le: '2026-10-12',
    gratuite: true,
    premieresBoutiques: SAISIE.premieresBoutiques,
    prixSession: proprio ? SAISIE.prixSession : null,
    // L'accès Préparation ne voit aucun montant : les fiches (prix) restent au propriétaire.
    fiches: proprio ? s.fiches : [],
    validees: s.validees,
    seuilPrix: { basPourCent: SAISIE.basPourCent, hautFois: SAISIE.hautFois },
  }
}

const biometrie = magasin('biometrie', () => ({ proposee: false, active: false }))
/** Face ID / empreinte de cet appareil (même état que l'écran faceid ; lu par Sécurité, VD-11). */
export const lireBiometrie = () => biometrie.lire()

// ── Domaine ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const demoSession: DomaineSession = {
  session: () => repondre(lireSession()),

  async connecter(identifiant, motDePasse, o) {
    const a = acces.lire()
    const t = maintenant()
    if (a.bloqueJusqua > t) return { ok: false, raison: 'bloque', jusqua: a.bloqueJusqua }
    if (!estLeCompte(identifiant) || motDePasse !== a.motDePasse) {
      // Aucune erreur technique, jamais « identifiant inconnu » (VD03-R03) ; le propriétaire est prévenu au blocage.
      const e = acces.ecrire((x) => {
        x.echecs++
        if (x.echecs >= MDP.essais) {
          x.bloqueJusqua = t + MDP.attenteMinutes * 60_000
          x.echecs = 0
        }
      })
      // CNX-03 : au blocage, un message part au propriétaire (notification urgente, sans montant).
      if (e.bloqueJusqua > t && a.bloqueJusqua <= t)
        ajouterNotification({ type: 'securite', canal: 'notification', titre: { modele: 'Connexion bloquée {n} min', valeurs: { n: MDP.attenteMinutes } }, texte: { modele: '{essais} mots de passe faux depuis {appareil}.', valeurs: { essais: MDP.essais, appareil: appareilDemandeur().nom } }, a: t, urgent: true, argent: false, lien: 'securite', contester: null })
      return e.bloqueJusqua > t ? { ok: false, raison: 'bloque', jusqua: e.bloqueJusqua } : { ok: false, raison: 'identifiants', essaisRestants: MDP.essais - e.echecs }
    }
    return apresIdentification(o?.seSouvenir ?? true)
  },
  async connecterAvec(_fournisseur, o) {
    // Google et Apple confirment l'e-mail du compte du propriétaire (OAuth) ; l'appareil inconnu passe par le code.
    return apresIdentification(o?.seSouvenir ?? true)
  },
  async validerDeuxiemeFacteur(code) {
    if (!acces.lire().defi) return { ok: false, raison: 'expire' }
    let r = { ok: false, raison: 'expire' } as ResultatCode
    const seSouvenir = acces.lire().seSouvenir
    acces.ecrire((a) => {
      if (a.defi) r = verifier(a.defi, code)
      if (r.ok) a.appareilConnu = true // l'appareil est enregistré à la première connexion réussie (VD03-R02)
    })
    if (r.ok) ouvrirSession(PROPRIO.id, seSouvenir)
    return r
  },
  defiEnCours: async () => {
    const d = acces.lire().defi
    return d ? defiPublic(d) : null
  },
  async renvoyerDeuxiemeFacteur() {
    let r = { ok: false, raison: 'trop_tot', secondes: OTP.renvoiSecondes } as ResultatRenvoi
    acces.ecrire((a) => {
      if (a.defi) r = renvoyer(a.defi)
    })
    return r
  },
  async demanderCodeNumero(telephone, canal, o) {
    const n = chiffres(telephone)
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero' }
    const m = MEMBRES.find((x) => telephoneDe(x) === n)
    if (!m) return { ok: false, raison: 'inconnu' }
    const ancien = acces.lire().numero
    if (ancien && ancien.telephone === n && maintenant() < ancien.envoyeA + OTP.minutes * 60_000) {
      // Même numéro redemandé : nouvel envoi si le délai est passé, sinon le code déjà parti vaut encore.
      let r = { ok: false, raison: 'trop_tot', secondes: 0 } as ResultatRenvoi
      acces.ecrire((a) => {
        if (a.numero) r = renvoyer(a.numero, canal)
        a.seSouvenir = o?.seSouvenir ?? true
      })
      if (r.ok || r.raison === 'limite') return r
      return { ok: true, envoi: envoiDe(acces.lire().numero!) }
    }
    const d = { ...creerDefi(n, canal), membre: m.id }
    acces.ecrire((a) => {
      a.numero = d
      a.seSouvenir = o?.seSouvenir ?? true
    })
    return { ok: true, envoi: envoiDe(d) }
  },
  envoiNumero: async () => {
    const d = acces.lire().numero
    return d ? envoiDe(d) : null
  },
  async validerCodeNumero(code) {
    let r = { ok: false, raison: 'expire' } as ResultatCode
    let membre = ''
    acces.ecrire((a) => {
      if (!a.numero) return
      r = verifier(a.numero, code)
      membre = a.numero.membre
      if (r.ok) a.appareilConnu = true
    })
    if (r.ok) ouvrirSession(membre, acces.lire().seSouvenir)
    return r
  },
  async renvoyerCodeNumero(canal) {
    let r = { ok: false, raison: 'trop_tot', secondes: OTP.renvoiSecondes } as ResultatRenvoi
    acces.ecrire((a) => {
      if (a.numero) r = renvoyer(a.numero, canal)
    })
    return r
  },
  async demanderLienMotDePasse(identifiant) {
    const v = identifiant.trim()
    if (!v) return { ok: false, raison: 'vide' }
    const lien = { jeton: nouvelId() + nouvelId(), envoyeA: maintenant(), compte: estLeCompte(v), defi: null }
    acces.ecrire((a) => {
      a.lien = lien
    })
    // La réponse est la même, que le compte existe ou non ; la démonstration ouvre le lien seulement s'il est parti.
    return { ok: true, lien: { envoyeA: lien.envoyeA, valideMinutes: PARAMETRES_ACCES.lienMinutes, renvoiSecondes: OTP.renvoiSecondes, jetonDemo: lien.compte ? lien.jeton : undefined } }
  },
  async ouvrirLienMotDePasse(jeton) {
    const l = acces.lire().lien
    if (!l || l.jeton !== jeton || !l.compte || maintenant() > l.envoyeA + PARAMETRES_ACCES.lienMinutes * 60_000) return { ok: false, raison: 'expire' }
    const d = l.defi ?? creerDefi(telephoneDe(PROPRIO), 'sms')
    acces.ecrire((a) => {
      if (a.lien) a.lien.defi = d
    })
    return { ok: true, nouveau: { envoi: envoiDe(d), identifiant: BOUTIQUE.identifiant } }
  },
  async choisirMotDePasse(jeton, code, motDePasse) {
    if (motDePasse.length < MDP.longueur || !/\d/.test(motDePasse)) return { ok: false, raison: 'faible' }
    let r = { ok: false, raison: 'expire' } as ResultatCode
    acces.ecrire((a) => {
      if (!a.lien || a.lien.jeton !== jeton || !a.lien.defi) return
      r = verifier(a.lien.defi, code)
      if (r.ok) {
        a.motDePasse = motDePasse
        a.lien = null
        a.echecs = 0
        a.bloqueJusqua = 0
      }
    })
    return r
  },
  async deconnecter() {
    etat.ecrire((e) => {
      e.connecte = false
    })
    return lireSession()
  },
  async changerMembre(id) {
    if (MEMBRES.some((m) => m.id === id))
      etat.ecrire((e) => {
        e.membre = id
      })
    return lireSession()
  },
  async oublierAppareil() {
    acces.ecrire((a) => {
      a.appareilConnu = false
    })
  },
  // Lien de connexion par e-mail : la démonstration l'ouvre par la boîte de réception du kit « compte » (écran) ;
  // ces deux méthodes servent le mode API (aucun vrai e-mail ici).
  async demanderLienConnexion(email) {
    const e = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, raison: 'email' }
    const [nom, domaine] = e.split('@')
    return { ok: true, destination: `${nom[0]}•••••@${domaine}`, valideMinutes: 15 }
  },
  async ouvrirLienConnexion() {
    return { ok: false, raison: 'invalide' }
  },

  categories: async () => Object.keys(PARAMETRES.commission.familles),
  zoneDuPoint: async (p) => zoneDe(p),
  ouverture: async () => {
    const d = dossierCourant()
    return d ? structuredClone(complet(d)) : null
  },
  async demarrerOuverture(c) {
    const nom = c.nom.trim()
    if (nom.length < 2 || nom.length > 40) return { ok: false, raison: 'nom' }
    if (!(c.categorie in PARAMETRES.commission.familles)) return { ok: false, raison: 'categorie' }
    const n = chiffres(c.telephone)
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero' }
    if (!c.point) return { ok: false, raison: 'point' }
    const zone = zoneDe(c.point)
    if (!zone) return { ok: false, raison: 'hors_zone' }
    if ((ouv.lire().comptes[n] ?? 0) >= 2) return { ok: false, raison: 'deux_comptes' }
    const ancien = ouv.lire().code
    const d = ancien && ancien.telephone === n && maintenant() < ancien.envoyeA + OTP.minutes * 60_000 ? ancien : creerDefi(n, 'sms')
    ouv.ecrire((o) => {
      const ref = o.dossier?.etape === 'ouvrir' ? o.dossier.ref : `VD-2026-${String(++o.seq).padStart(4, '0')}`
      o.dossier = {
        ref,
        depuisClient: false,
        etape: 'ouvrir',
        boutique: { nom, categorie: c.categorie, statut: c.statut, telephone: n, zone, point: c.point },
        numeroVerifie: false,
        pieces: { recto: element(), verso: element(), selfie: element() },
        versement: { ...element(), operateur: null, masque: null },
        envoyeA: null,
        reponseAvant: null,
        refus: 0,
        brouillons: 0,
        enLigne: 0,
        contrat: { immatricule: c.statut === 'entreprise', rccm: '', niu: '', signeA: null },
      }
      o.code = d
    })
    return { ok: true, envoi: envoiDe(d) }
  },
  envoiOuverture: async () => {
    const o = ouv.lire()
    return o.code && o.dossier?.etape === 'ouvrir' ? envoiDe(o.code) : null
  },
  async validerCodeOuverture(code) {
    let r = { ok: false, raison: 'expire' } as ResultatCode
    ouv.ecrire((o) => {
      if (!o.code || !o.dossier || o.dossier.etape !== 'ouvrir') return
      r = verifier(o.code, code)
      if (!r.ok) return
      // POST /auth/verify : la boutique existe ; étape 2 ; le numéro vérifié sert aussi au versement s'il est Mobile Money.
      const n = o.dossier.boutique.telephone
      const op = operateurDe(n)
      o.dossier.numeroVerifie = true
      o.dossier.etape = 'pieces'
      o.dossier.boutique.telephone = masquer(n)
      if (op) o.dossier.versement = { etat: 'verifie', a: maintenant(), motif: null, operateur: op, masque: '···· ' + n.slice(5) }
      o.comptes[n] = (o.comptes[n] ?? 0) + 1
      o.code = null
    })
    if (r.ok) {
      acces.ecrire((a) => {
        a.appareilConnu = true
      })
      ouvrirSession(PROPRIO.id, true)
    }
    return r
  },
  async renvoyerCodeOuverture() {
    let r = { ok: false, raison: 'trop_tot', secondes: OTP.renvoiSecondes } as ResultatRenvoi
    ouv.ecrire((o) => {
      if (o.code) r = renvoyer(o.code)
    })
    return r
  },
  async envoyerPiece(piece, image) {
    if (!image) return { ok: false, raison: piece === 'selfie' ? 'visage' : 'illisible' }
    const o = ouv.ecrire((x) => {
      const d = x.dossier
      if (!d || d.etape !== 'pieces') return
      d.pieces[piece] = { etat: 'recu', a: maintenant(), motif: null }
    })
    return { ok: true, dossier: complet(o.dossier ?? dossierDuJeuDEssai()) }
  },
  async demanderCodeVersement(telephone) {
    const n = chiffres(telephone)
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero' }
    if (!operateurDe(n)) return { ok: false, raison: 'operateur' }
    const d = creerDefi(n, 'sms')
    ouv.ecrire((o) => {
      o.versement = d
    })
    return { ok: true, envoi: envoiDe(d) }
  },
  async validerCodeVersement(code) {
    let r = { ok: false, raison: 'expire' } as ResultatCode
    ouv.ecrire((o) => {
      if (!o.versement || !o.dossier) return
      r = verifier(o.versement, code)
      if (!r.ok) return
      const n = o.versement.telephone
      o.dossier.versement = { etat: 'verifie', a: maintenant(), motif: null, operateur: operateurDe(n), masque: '···· ' + n.slice(5) }
      o.versement = null
    })
    return r
  },
  async envoyerPourVerification() {
    const d = ouv.lire().dossier
    if (!d || d.etape !== 'pieces' || !piecesRecues(d)) return { ok: false, raison: 'incomplet' }
    const t = maintenant()
    const o = ouv.ecrire((x) => {
      x.dossier!.etape = 'attente'
      x.dossier!.envoyeA = t
      x.dossier!.reponseAvant = plusHeuresOuvrees(t, KYC.humainHeures)
    })
    // Vers la console : le dossier complet attend la vérification de BelivaY (KYC, R59) ; sa décision revient par
    // le pont (kyc_decide, decisionKycConsole).
    demanderActivation('vendeur', d.ref, d.ref, 4, t)
    return { ok: true, dossier: complet(o.dossier!) }
  },
  async reponseVerificationDemo(accord) {
    const o = ouv.ecrire((x) => {
      const d = x.dossier
      if (!d || d.etape !== 'attente') return
      const t = maintenant()
      if (accord) {
        for (const k of ['recto', 'verso', 'selfie'] as const) d.pieces[k] = { etat: 'verifie', a: t, motif: null }
        d.etape = 'contrat'
        // P-1 (DP-57) : les brouillons sur une fiche existante qui passent les 4 contrôles sont en ligne tout de suite.
        d.enLigne = d.brouillons + publierBrouillonsDeLOuverture(d.ref)
      } else {
        d.refus++
        d.pieces.recto = { etat: 'refuse', a: t, motif: 'Un reflet cache le numéro de la carte.' }
        d.etape = d.refus >= KYC.refusMax ? 'refusee' : 'pieces'
      }
      d.reponseAvant = null
    })
    return complet(o.dossier ?? dossierDuJeuDEssai())
  },
  async signerContrat(c) {
    const d = ouv.lire().dossier
    if (!d || d.etape !== 'contrat') return { ok: false, raison: 'etape' }
    if (c.immatricule) {
      if (!FORME_RCCM.test(c.rccm?.trim() ?? '')) return { ok: false, raison: 'rccm' }
      if (!FORME_NIU.test(c.niu?.trim() ?? '')) return { ok: false, raison: 'niu' }
    }
    const o = ouv.ecrire((x) => {
      x.dossier!.etape = 'signee'
      x.dossier!.contrat = { immatricule: c.immatricule, rccm: c.immatricule ? c.rccm!.trim().toUpperCase() : '', niu: c.immatricule ? c.niu!.trim().toUpperCase() : '', signeA: maintenant() }
    })
    return { ok: true, dossier: complet(o.dossier!) }
  },
  async arriveeClient() {
    const c = lireCompteClient()
    return c.present ? c.arrivee : ARRIVEE_ESSAI
  },
  async confirmerArriveeClient(point) {
    const a = lireCompteClient()
    const arrivee = a.present ? a.arrivee : ARRIVEE_ESSAI
    if (!arrivee || !point) return { ok: false, raison: 'point' }
    const zone = zoneDe(point)
    if (!zone) return { ok: false, raison: 'hors_zone' }
    const categorie = arrivee.boutique.categorie in PARAMETRES.commission.familles ? arrivee.boutique.categorie : 'Mode Femme'
    const o = ouv.ecrire((x) => {
      x.dossier = {
        ref: arrivee.ref,
        depuisClient: true,
        etape: 'pieces',
        boutique: { nom: arrivee.boutique.nom, categorie, statut: arrivee.boutique.statut, telephone: arrivee.telephone, zone, point },
        numeroVerifie: true,
        pieces: { recto: element(), verso: element(), selfie: element() },
        versement: arrivee.operateur ? { etat: 'verifie', a: maintenant(), motif: null, operateur: arrivee.operateur, masque: '···· ' + arrivee.telephone.slice(-2) } : { ...element(), operateur: null, masque: null },
        envoyeA: null,
        reponseAvant: null,
        refus: 0,
        brouillons: 0,
        enLigne: 0,
        contrat: { immatricule: arrivee.boutique.statut === 'entreprise', rccm: '', niu: '', signeA: null },
      }
    })
    acces.ecrire((x) => {
      x.appareilConnu = true
    })
    ouvrirSession(PROPRIO.id, true)
    return { ok: true, dossier: complet(o.dossier!) }
  },

  biometrie: async () => biometrie.lire(),
  async reglerBiometrie(active) {
    return biometrie.ecrire((b) => {
      b.proposee = true
      b.active = active
    })
  },

  saisieAssistee: async () => repondre(lireSaisie()),
  async validerFiches(ids) {
    if (!estProprietaire()) return lireSaisie()
    const t = maintenant()
    let n = 0
    const valides: Parameters<typeof ajouterFichesSaisie>[0] = []
    saisie.ecrire((s) => {
      for (const id of ids) {
        const f = s.fiches.find((x) => x.id === id)
        if (!f) continue
        n++
        s.fiches = s.fiches.filter((x) => x.id !== id)
        // Prix anormal validé : relecture humaine, jamais de blocage automatique (DP-56 Q-40).
        s.validees.unshift({ id, titre: f.titre, enVerification: f.controles.prix === 'echec', a: t })
        valides.push({ id, titre: f.titre, dessin: f.dessin, prix: f.prix, stock: f.stock, enVerification: f.controles.prix === 'echec' })
      }
    })
    // Les fiches validées rejoignent Mes produits ; pendant une ouverture, ce sont ses brouillons (en ligne dès l'accord).
    if (n) ajouterFichesSaisie(valides, ouvertureEnCours())
    return lireSaisie()
  },
  async modifierFiche(id, c) {
    if (!estProprietaire()) return { ok: false, raison: 'prix' }
    if (!Number.isInteger(c.prix) || c.prix < PARAMETRES.commission.prixMin) return { ok: false, raison: 'prix' }
    if (!Number.isInteger(c.stock) || c.stock < 0 || c.stock > 9999) return { ok: false, raison: 'stock' }
    saisie.ecrire((s) => {
      const f = s.fiches.find((x) => x.id === id)
      if (!f) return
      f.prix = c.prix
      f.stock = c.stock
      f.controles.prix = prixAnormal(c.prix, f.mediane) ? 'echec' : 'ok'
      f.modifieeA = maintenant()
    })
    return { ok: true, saisie: lireSaisie() }
  },
}
