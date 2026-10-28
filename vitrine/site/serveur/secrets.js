// Mots de passe et jetons : scrypt (sel unique de 16 octets, N = 2^15, r = 8, p = 1, 64 octets), comparaison à temps
// constant ; jetons aléatoires de 32 octets dont la base ne garde que l'empreinte SHA-256 (un vol de la base ne donne
// ni mot de passe ni session utilisable).
import { createHash, createHmac, randomBytes, scrypt as scryptRappel, timingSafeEqual } from 'node:crypto'

/** @type {(mdp: string, sel: Buffer, long: number, o: import('node:crypto').ScryptOptions) => Promise<Buffer>} */
const scrypt = (mdp, sel, long, o) => new Promise((ok, ko) => scryptRappel(mdp, sel, long, o, (e, k) => (e ? ko(e) : ok(k))))

export const PARAMETRES_SCRYPT = { N: 2 ** 15, r: 8, p: 1 }
const LONGUEUR = 64

/**
 * « scrypt$N$r$p$sel$empreinte » (base64url). Les paramètres sont gardés avec l'empreinte : on peut les relever plus
 * tard sans casser les comptes existants.
 * @param {string} mdp @param {{N: number, r: number, p: number}} [o]
 */
export async function hacherMotDePasse(mdp, o = PARAMETRES_SCRYPT) {
  const sel = randomBytes(16)
  const k = await scrypt(mdp.normalize('NFC'), sel, LONGUEUR, { ...o, maxmem: 256 * o.N * o.r })
  return ['scrypt', o.N, o.r, o.p, sel.toString('base64url'), k.toString('base64url')].join('$')
}

/** @param {string} mdp @param {string | null} stocke */
export async function verifierMotDePasse(mdp, stocke) {
  // Compte sans mot de passe (ou inconnu) : on calcule quand même une empreinte, pour que la durée ne dise rien.
  const p = (stocke ?? '').split('$')
  if (p.length !== 6 || p[0] !== 'scrypt') {
    await hacherMotDePasse(mdp)
    return false
  }
  const [N, r, pp] = [Number(p[1]), Number(p[2]), Number(p[3])]
  if (!(N >= 1024 && N <= 2 ** 20 && r >= 1 && r <= 32 && pp >= 1 && pp <= 16)) return false
  const attendu = Buffer.from(p[5], 'base64url')
  const k = await scrypt(mdp.normalize('NFC'), Buffer.from(p[4], 'base64url'), attendu.length, { N, r, p: pp, maxmem: 256 * N * r })
  return k.length === attendu.length && timingSafeEqual(k, attendu)
}

/** Jeton à donner (cookie, lien) : 32 octets aléatoires, base64url. */
export const nouveauJeton = () => randomBytes(32).toString('base64url')

/** Ce que la base garde d'un jeton. @param {string} jeton */
export const empreinte = (jeton) => createHash('sha256').update(jeton).digest('hex')

/** Clé de limite (e-mail, adresse IP) : jamais la valeur en clair dans la base. @param {string} type @param {string} valeur */
export function cleLimite(type, valeur) {
  // Aucune clé dans le code : SECRET_COMPTES, sinon une clé dérivée de l'adresse de la base (secrète, propre à chaque
  // déploiement) ; la valeur fixe ne sert qu'aux tests sans base.
  const base = process.env.DATABASE_URL || process.env.POSTGRES_URL
  const secret = process.env.SECRET_COMPTES || (base ? createHash('sha256').update('limites|' + base).digest('hex') : 'essais-locaux-sans-base')
  return type + ':' + createHmac('sha256', secret).update(valeur).digest('hex').slice(0, 40)
}

/** Égalité de deux textes à temps constant. @param {string} a @param {string} b */
export function egal(a, b) {
  const x = createHash('sha256').update(a).digest()
  const y = createHash('sha256').update(b).digest()
  return timingSafeEqual(x, y) && a.length === b.length
}
