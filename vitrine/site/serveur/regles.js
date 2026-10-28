// Règles des comptes réels (site/COMPTES-REELS.md) : espaces, rôles, durées, limites et validation des entrées.
// Tout ce que le serveur des comptes décide est écrit ici, une fois ; les fonctions (comptes.js) ne font qu'appliquer.

/** Les six espaces : chacun a ses comptes (une même adresse peut avoir un compte client ET un compte vendeur). */
export const ESPACES = ['client', 'vendeur', 'entreprise', 'livreur', 'relais', 'console']

/**
 * Comment un compte naît dans chaque espace :
 * - libre : inscription ouverte (client, diaspora) ;
 * - attente : inscription ouverte, compte « en attente de validation » (vendeur) ou candidature (entreprise, relais) ;
 * - invitation : seulement avec un jeton d'invitation (livreur : par son entreprise ; console : par le propriétaire).
 */
export const NAISSANCE = { client: 'libre', vendeur: 'attente', entreprise: 'attente', relais: 'attente', livreur: 'invitation', console: 'invitation' }

/** Rôle donné à l'inscription (console : celui de l'invitation ; le premier compte est « proprietaire »). */
export const ROLE_INITIAL = { client: 'client', vendeur: 'proprietaire', entreprise: 'proprietaire', relais: 'gerant', livreur: 'livreur', console: 'support' }

/** Qui peut inviter qui : l'espace de l'invitant → l'espace du compte invité. */
export const INVITATIONS = { entreprise: 'livreur', console: 'console', relais: 'relais' }

/** Rôles de la console qu'une invitation peut donner (ADM-01 ; « proprietaire » ne s'invite pas). */
export const ROLES_CONSOLE = ['superviseur', 'finance', 'support', 'mediation', 'operations', 'verification', 'audit', 'terrain', 'rh']

export const STATUTS = ['actif', 'en_attente', 'refuse', 'suspendu']

export const DUREES = {
  sessionCourteH: 12, // « Se souvenir de moi » décoché : la session se ferme avec le navigateur, et au plus après 12 h
  sessionLongueJ: 30, // « Se souvenir de moi » : 30 jours
  sessionVuMin: 5, // dernière activité notée au plus toutes les 5 minutes (une écriture de moins par requête)
  reinitialisationMin: 30, // lien « mot de passe oublié » : 30 minutes, une seule fois (MDP-LIEN)
  invitationH: 72, // lien d'invitation : 72 heures, une seule fois
  defiMin: 5, // second facteur : 5 minutes entre le mot de passe et le code
  defiEssais: 5, // codes faux sur un même défi : il ne vaut plus (retour au mot de passe)
}

/** Limites de tentatives (fenêtre glissante simple, comptée en base) : [nombre, secondes]. */
export const LIMITES = {
  connexionEmail: [5, 15 * 60], // 5 mots de passe faux pour un compte : 15 minutes de blocage (CIN, MDP-ESSAIS)
  connexionIp: [50, 15 * 60],
  inscriptionIp: [10, 60 * 60],
  oubliEmail: [3, 60 * 60],
  oubliIp: [20, 60 * 60],
  reinitialisationIp: [20, 60 * 60],
  invitationCompte: [30, 24 * 60 * 60],
  premierAccesIp: [5, 60 * 60],
  deuxiemeFacteur: [5, 15 * 60], // codes faux du second facteur pour un compte : 15 minutes
}

/** Mots de passe réservés à la démonstration : un compte réel ne peut pas les prendre (le site les reconnaît). */
export const MOTS_DE_PASSE_DEMO = ['belivay2026']

export const TAILLES = { corpsMax: 400_000, photoMax: 150_000, candidatureMax: 8_000 }

export const VERSION_CONDITIONS_DEFAUT = '2026-10'

// ── Validation ───────────────────────────────────────────────────────────────────────────────────────────────────

export class Refus extends Error {
  /** @param {number} statut @param {string} code @param {string} message @param {unknown} [data] */
  constructor(statut, code, message, data) {
    super(message)
    this.statut = statut
    this.code = code
    this.data = data
  }
}

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
const NOM = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]{0,59}$/u

/** @param {unknown} v */
export const texte = (v) => (typeof v === 'string' ? v.normalize('NFC').trim() : '')

/** E-mail en minuscules, ou null s'il n'est pas valable. @param {unknown} v */
export function email(v) {
  const e = texte(v).toLowerCase()
  return e.length <= 254 && EMAIL.test(e) ? e : null
}

/** Numéro : +237 et 9 chiffres (commence par 6 ou 2), ou un numéro international de 8 à 15 chiffres. @param {unknown} v */
export function telephone(v) {
  const brut = texte(v)
  if (!brut) return null
  const c = brut.replace(/[\s.()-]/g, '')
  if (/^(?:\+?237)?[62]\d{8}$/.test(c)) return '+237' + c.slice(-9)
  if (/^\+[1-9]\d{7,14}$/.test(c)) return c
  return undefined // donné mais invalide
}

/** @param {unknown} v */
export const nom = (v) => {
  const n = texte(v).replace(/\s+/g, ' ')
  return NOM.test(n) ? n : null
}

/**
 * Mot de passe (DP-04) : 8 à 128 caractères, dont un chiffre et une lettre ; jamais celui de la démonstration.
 * Livreur et point relais : un code personnel de 6 chiffres est aussi accepté s'il n'est pas trop simple.
 * @param {unknown} v @param {string} espace
 */
export function regleMotDePasse(v, espace) {
  if (typeof v !== 'string') return 'mot_de_passe'
  if ((espace === 'livreur' || espace === 'relais') && /^\d{6}$/.test(v)) return pinTropSimple(v) ? 'pin_trop_simple' : null
  if (v.length < 8 || v.length > 128) return 'mot_de_passe'
  if (!/\d/.test(v) || !/\p{L}/u.test(v)) return 'mot_de_passe'
  if (MOTS_DE_PASSE_DEMO.includes(v.toLowerCase())) return 'mot_de_passe_demo'
  return null
}

/** 123456, 000000, 654321, 121212… @param {string} p */
export function pinTropSimple(p) {
  const d = [...p].map(Number)
  const pas = d.slice(1).map((x, i) => x - d[i])
  if (pas.every((s) => s === pas[0]) && Math.abs(pas[0]) <= 1) return true
  if (new Set(d).size <= 2) return true
  return false
}

/** Photo de profil : data:image/(png|jpeg|webp);base64, au plus TAILLES.photoMax octets, signature vérifiée. @param {unknown} v */
export function photo(v) {
  if (v === null) return null
  const t = texte(v)
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(t)
  if (!m) return undefined
  const octets = Buffer.from(m[2], 'base64')
  if (octets.length > TAILLES.photoMax || octets.length < 32) return undefined
  const sig = octets.subarray(0, 12)
  const png = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47
  const jpeg = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff
  const webp = sig.subarray(0, 4).toString('latin1') === 'RIFF' && sig.subarray(8, 12).toString('latin1') === 'WEBP'
  if ((m[1] === 'png' && !png) || (m[1] === 'jpeg' && !jpeg) || (m[1] === 'webp' && !webp)) return undefined
  return t
}

/**
 * Candidature (entreprise, point relais) ou dossier (vendeur) : un objet plat de textes courts, nombres et booléens,
 * gardé tel quel pour la validation par la console. Rien d'autre (ni fichier, ni objet imbriqué profond).
 * @param {unknown} v
 */
export function candidature(v) {
  if (v === undefined || v === null) return {}
  if (typeof v !== 'object' || Array.isArray(v)) return undefined
  /** @type {Record<string, string | number | boolean | string[]>} */
  const r = {}
  const entrees = Object.entries(v)
  if (entrees.length > 30) return undefined
  for (const [k, x] of entrees) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(k)) return undefined
    if (typeof x === 'string') r[k] = texte(x).slice(0, 500)
    else if (typeof x === 'number' && Number.isFinite(x)) r[k] = x
    else if (typeof x === 'boolean') r[k] = x
    else if (Array.isArray(x) && x.length <= 20 && x.every((e) => typeof e === 'string')) r[k] = x.map((e) => texte(e).slice(0, 100))
    else if (x !== null && x !== undefined) return undefined
  }
  if (JSON.stringify(r).length > TAILLES.candidatureMax) return undefined
  return r
}

/** Liens envoyés par e-mail, par espace (chemins des applications ; {j} : le jeton). */
export const LIENS = {
  reinitialisation: {
    client: '/mdp-nouveau?jeton={j}',
    vendeur: '/vendeur/connexion?s=nouveau&jeton={j}',
    entreprise: '/entreprise/connexion?reinitialiser={j}',
    livreur: '/livreur/connexion?reinitialiser={j}',
    relais: '/relais/connexion?reinitialiser={j}',
    console: '/admin/connexion?reinitialiser={j}',
  },
  invitation: {
    livreur: '/livreur/connexion?invitation={j}',
    console: '/admin/activation?jeton={j}',
    relais: '/relais/invitation?jeton={j}',
  },
}
