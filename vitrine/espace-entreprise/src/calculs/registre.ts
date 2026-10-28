// Lecture des paramètres de l'entreprise de livraison (CCH-15 : aucune valeur dans le code). Source : le registre
// officiel seul (logique-metier/parametres-en-vigueur.json, généré par logique-metier/outils/revue.py ; les paramètres
// de l'extraction du paquet y sont entrés par DP-62, avec leur unité). Chaque valeur est lue avec une forme et une unité
// attendues : si l'une change, la lecture s'arrête (ParametreIllisible) au lieu de deviner. En production, les mêmes
// codes viendront de la configuration versionnée du serveur (GET /config), comme pour le vendeur.
// SQUELETTE prêt pour les moteurs : chaque famille (accès, délais, paliers, pilote, tournées) a son lecteur typé ;
// un moteur (src/calculs/<moteur>.ts, portage de moteurs/belivay_moteurs) lit PARAMETRES.<famille>, jamais le JSON.
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import type { PalierEntreprise } from '../donnees/communs'
import { ParametreAbsent, ParametreIllisible } from './erreurs'

export interface Parametre {
  code: string
  valeur: string
  unite: string | null
}
export type Registre = Record<string, Parametre>

/** Code → paramètre (code, valeur, unité), tel qu'écrit dans le registre. */
export function chargerRegistre(d: { parametres: { code: string; valeur: string; unite?: string | null }[] } = donnees): Registre {
  return Object.fromEntries(d.parametres.map((p) => [p.code, { code: p.code, valeur: p.valeur, unite: p.unite ?? null }]))
}
export const REGISTRE: Registre = chargerRegistre()

function parametre(r: Registre, code: string): Parametre {
  const p = r[code]
  if (!p) throw new ParametreAbsent(code)
  return p
}

/** Entier positif écrit seul (« 15 », « 75 000 »), dans l'unité attendue (début du libellé d'unité). */
export function entier(r: Registre, code: string, unite: RegExp): number {
  const p = parametre(r, code)
  const v = p.valeur.replace(/[\s  ]/g, '')
  if (!/^\d+$/.test(v)) throw new ParametreIllisible(`${code} : « ${p.valeur} » n'est pas un nombre entier`)
  if (!unite.test(p.unite ?? '')) throw new ParametreIllisible(`${code} : unité « ${p.unite} » inattendue`)
  return Number(v)
}

/** Nombre écrit avec son unité dans la valeur même (« 48 h », « 40 caractères ») : motif à un groupe numérique. */
export function nombre(r: Registre, code: string, motif: RegExp): number {
  const p = parametre(r, code)
  const m = motif.exec(p.valeur.trim())
  if (!m) throw new ParametreIllisible(`${code} : « ${p.valeur} » ne suit pas la forme attendue`)
  return Number(m[1].replace(/[\s\u00a0\u202f]/g, ''))
}

// ── Accès (ENT-P01, ENT-P24 ; ENT-ACC-01, ENT-ACC-02, ENT-P01R-02) ────────────────────────────────────────────────
export interface ParametresAcces {
  sessionHeures: number
  echecsAvantBlocage: number
  blocageMinutes: number
  renvoiCodeSecondes: number
  longueurCode: number
  renvoisAvantSupport: number
  accesInternesMax: number
  tailleMaxPieceMo: number
  /** ENT-PIECE-RESOLUTION-MIN (proposé) : petit côté minimal d'une photo de pièce, en pixels. */
  resolutionPiecePx: number
}
export function lireAcces(r: Registre): ParametresAcces {
  return {
    sessionHeures: entier(r, 'duree_session', /^heures?/),
    echecsAvantBlocage: entier(r, 'echecs_avant_blocage', /^échecs/),
    blocageMinutes: entier(r, 'duree_blocage', /^minutes/),
    renvoiCodeSecondes: entier(r, 'delai_renvoi_code_sms', /^secondes/),
    longueurCode: entier(r, 'ENT-CODE-SMS-LONGUEUR', /^chiffres/),
    renvoisAvantSupport: entier(r, 'ENT-RENVOIS-AVANT-SUPPORT', /^renvois/),
    accesInternesMax: entier(r, 'acces_internes_max', /^accès/),
    tailleMaxPieceMo: entier(r, 'taille_max_piece', /^Mo/),
    resolutionPiecePx: entier(r, 'ENT-PIECE-RESOLUTION-MIN', /^px\b/),
  }
}

// ── Délais opérationnels (ENT-P10 à ENT-P15 ; ENT-ZON-05, ENT-P12R-01) ────────────────────────────────────────────
export interface ParametresDelais {
  acceptationMin: number // un paquet publié s'accepte dans ce délai
  fenetrePrioriteMin: number // priorité du premier rang
  ramassageMin: number // ramassage après acceptation
  livraisonH: number // promesse de livraison (strictement moins de)
  alerteNonAffecteMin: number
  alerteDepartMin: number // départ absent avant le créneau
  decisionIncidentMin: number // incident bloquant à décider
  gardeAlerteH: number // garde longue
}
export function lireDelais(r: Registre): ParametresDelais {
  return {
    acceptationMin: entier(r, 'ENT-T-ACCEPT', /^minutes/),
    fenetrePrioriteMin: entier(r, 'ENT-FENETRE-PRIORITE', /^minutes/),
    ramassageMin: entier(r, 'ENT-T-RAMASSAGE', /^minutes/),
    livraisonH: entier(r, 'ENT-SLA-LIVRAISON', /^heures/),
    alerteNonAffecteMin: entier(r, 'ENT-ALERTE-NON-AFFECTE', /^minutes/),
    alerteDepartMin: entier(r, 'ENT-ALERTE-DEPART', /^minutes/),
    decisionIncidentMin: entier(r, 'ENT-INCIDENT-DELAI', /^minutes/),
    gardeAlerteH: entier(r, 'ENT-GARDE-ALERTE', /^heures/),
  }
}

// ── Paliers et Trust Score de l'entreprise (ENT-PLAFOND-*, ENT-SEUIL-*, ENT-HYST-*, ENT-TSC-*) ───────────────────
export interface ParametresPaliers {
  plafonds: Record<PalierEntreprise, number | null> // null : sans plafond (Or, assurance obligatoire)
  seuils: { Confirme: number; Or: number }
  tenueJours: number // un seuil doit être tenu ce nombre de jours
  ecartDescente: number // points sous le seuil avant de descendre
  baisseMax: number // baisse maximale par recalcul
  veto: number
}
export function lirePaliers(r: Registre): ParametresPaliers {
  const or = parametre(r, 'ENT-PLAFOND-OR')
  if (!/^sans plafond\b/.test(or.valeur)) throw new ParametreIllisible(`ENT-PLAFOND-OR : « ${or.valeur} » (attendu : sans plafond)`)
  const p: ParametresPaliers = {
    plafonds: { Nouveau: entier(r, 'ENT-PLAFOND-NOUVEAU', /^F CFA/), Confirme: entier(r, 'ENT-PLAFOND-CONFIRME', /^F CFA/), Or: null },
    seuils: { Confirme: entier(r, 'ENT-SEUIL-CONFIRME', /^points/), Or: entier(r, 'ENT-SEUIL-OR', /^points/) },
    tenueJours: entier(r, 'ENT-HYST-JOURS', /^jours/),
    ecartDescente: entier(r, 'ENT-HYST-POINTS', /^points/),
    baisseMax: entier(r, 'ENT-TSC-BAISSE-MAX', /^points/),
    veto: entier(r, 'ENT-VETO-PLAFOND', /^points/),
  }
  if (p.plafonds.Nouveau! >= p.plafonds.Confirme!) throw new ParametreIllisible('plafonds : Nouveau doit être sous Confirmé')
  if (p.seuils.Confirme >= p.seuils.Or || p.seuils.Or > 100) throw new ParametreIllisible('seuils : Confirmé < Or ≤ 100')
  return p
}

// ── Pilote et tournées (ENT-PILOTE-DUREE, ENT-OBJECTIF-TOURNEE, ENT-SEUIL-DEPART) ───────────────────────────────────
export interface ParametresPilote {
  dureeJours: number
  objectifTournee: number // colis par tournée
  seuilDepart: number // départ d'une tournée relais dès ce nombre de colis
}
export function lirePilote(r: Registre): ParametresPilote {
  return {
    dureeJours: entier(r, 'ENT-PILOTE-DUREE', /^jours/),
    objectifTournee: entier(r, 'ENT-OBJECTIF-TOURNEE', /^colis/),
    seuilDepart: entier(r, 'ENT-SEUIL-DEPART', /^colis/),
  }
}

// ── Incidents et litiges (ENT-P14, ENT-P17) ─────────────────────────────────────────────────────────────────────
export interface ParametresLitiges {
  motifRefusIncidentMin: number // caractères du motif d'un incident refusé
  reponseLitigeH: number // délai de réponse à un litige ouvert
  arrangementMin: number // caractères d'une proposition d'arrangement
}
export function lireLitiges(r: Registre): ParametresLitiges {
  return {
    motifRefusIncidentMin: entier(r, 'longueur_min_motif_refus', /^caractères/),
    reponseLitigeH: nombre(r, 'delai_reponse_litige', /^(\d+) h$/),
    arrangementMin: nombre(r, 'longueur_min_arrangement', /^(\d+) caractères$/),
  }
}

// ── Saisies, relances et mentions légales (ENT-P13, ENT-P15, ENT-06, ENT-08, ENT-P19R-02 ; DP-62) ────────────────────
export interface MentionsLegales {
  denomination: string
  forme: string
  capital: string
  siege: string
  rccm: string
  niu: string
}
export interface ParametresSaisies {
  revisionTexteMin: number // caractères d'une demande de révision de grille
  preuveCommentaireMin: number // caractères d'un signalement ou d'un complément de preuve
  emballageCommandeMax: number // multiple du stock avancé
  relanceMin: number // minutes entre deux relances du même sujet au même livreur
  mentions: MentionsLegales
}
/** « BELIVAY SARL · forme · capital 1 000 000 F CFA · siège · RCCM … · NIU … » (BLV-MENTIONS-LEGALES). */
export function lireMentions(r: Registre): MentionsLegales {
  const v = parametre(r, 'BLV-MENTIONS-LEGALES').valeur.split(' · ').map((x) => x.trim())
  const capital = /^capital (.+)$/.exec(v[2] ?? '')
  const rccm = /^RCCM (\S+)$/.exec(v[4] ?? '')
  const niu = /^NIU (\S+)$/.exec(v[5] ?? '')
  if (v.length !== 6 || !capital || !rccm || !niu) throw new ParametreIllisible('BLV-MENTIONS-LEGALES : forme inattendue')
  return { denomination: v[0], forme: v[1], capital: capital[1], siege: v[3], rccm: rccm[1], niu: niu[1] }
}
export function lireSaisies(r: Registre): ParametresSaisies {
  return {
    revisionTexteMin: entier(r, 'ENT-REVISION-TEXTE-MIN', /^caractères/),
    preuveCommentaireMin: entier(r, 'ENT-PREUVE-COMMENTAIRE-MIN', /^caractères/),
    emballageCommandeMax: entier(r, 'ENT-EMB-COMMANDE-MAX', /^fois le stock avancé/),
    relanceMin: entier(r, 'ENT-RELANCE-MIN', /^minutes/),
    mentions: lireMentions(r),
  }
}

/** Paramètres en vigueur, lus une fois. */
export const PARAMETRES = {
  acces: lireAcces(REGISTRE),
  delais: lireDelais(REGISTRE),
  paliers: lirePaliers(REGISTRE),
  pilote: lirePilote(REGISTRE),
  litiges: lireLitiges(REGISTRE),
  saisies: lireSaisies(REGISTRE),
}
