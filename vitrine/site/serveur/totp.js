// Second facteur de la console : TOTP (RFC 6238, HMAC-SHA1, 6 chiffres, pas de 30 s, fenêtre ±1 pas), secret chiffré au
// repos (AES-256-GCM, clé dérivée de TOTP_CLE), codes de secours à usage unique (seule leur empreinte est gardée).
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const PAS_S = 30
export const CHIFFRES = 6
export const FENETRE = 1

/** @param {Buffer} b */
export function base32(b) {
  let bits = 0
  let v = 0
  let s = ''
  for (const o of b) {
    v = (v << 8) | o
    bits += 8
    while (bits >= 5) {
      s += B32[(v >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) s += B32[(v << (5 - bits)) & 31]
  return s
}

/** @param {string} s */
export function deBase32(s) {
  const t = s.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let v = 0
  const o = []
  for (const c of t) {
    const i = B32.indexOf(c)
    if (i < 0) throw new Error('base32')
    v = (v << 5) | i
    bits += 5
    if (bits >= 8) {
      o.push((v >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(o)
}

/** HOTP (RFC 4226). @param {Buffer} secret @param {number} compteur */
export function hotp(secret, compteur) {
  const c = Buffer.alloc(8)
  c.writeBigUInt64BE(BigInt(compteur))
  const h = createHmac('sha1', secret).update(c).digest()
  const d = h[h.length - 1] & 15
  const n = ((h[d] & 0x7f) << 24) | (h[d + 1] << 16) | (h[d + 2] << 8) | h[d + 3]
  return String(n % 10 ** CHIFFRES).padStart(CHIFFRES, '0')
}

/** Pas courant. @param {Date} t */
export const pasDe = (t) => Math.floor(t.getTime() / 1000 / PAS_S)

/**
 * Le pas où le code est juste, dans la fenêtre ±1 et strictement après le dernier pas déjà utilisé (un code ne sert
 * qu'une fois) ; null sinon.
 * @param {Buffer} secret @param {string} code @param {Date} t @param {number | null} dernier
 */
export function verifierTotp(secret, code, t, dernier) {
  if (!/^\d{6}$/.test(code)) return null
  const p = pasDe(t)
  let trouve = null
  for (let i = -FENETRE; i <= FENETRE; i++) {
    const a = Buffer.from(hotp(secret, p + i))
    if (timingSafeEqual(a, Buffer.from(code)) && (dernier === null || p + i > dernier)) trouve = p + i
  }
  return trouve
}

export const nouveauSecret = () => randomBytes(20)

/** Lien d'enrôlement lu par les applications d'authentification. @param {string} secret32 @param {string} compte */
export const otpauth = (secret32, compte) =>
  `otpauth://totp/${encodeURIComponent('BelivaY console:' + compte)}?secret=${secret32}&issuer=${encodeURIComponent('BelivaY')}&algorithm=SHA1&digits=${CHIFFRES}&period=${PAS_S}`

// ── Chiffrement au repos ─────────────────────────────────────────────────────────────────────────────────────────

/** Clé AES-256 dérivée de TOTP_CLE (32 caractères au moins) ; null si absente ou trop courte. @param {string | undefined} cle */
export function cleTotp(cle) {
  if (!cle || cle.length < 32) return null
  return createHash('sha256').update('belivay-totp|' + cle).digest()
}

/** @param {Buffer} cle @param {Buffer} clair */
export function chiffrer(cle, clair) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', cle, iv)
  const ct = Buffer.concat([c.update(clair), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join(':')
}

/** @param {Buffer} cle @param {string} s */
export function dechiffrer(cle, s) {
  const [v, iv, tag, ct] = s.split(':')
  if (v !== 'v1') throw new Error('format')
  const d = createDecipheriv('aes-256-gcm', cle, Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()])
}

// ── Codes de secours ─────────────────────────────────────────────────────────────────────────────────────────────

/** Dix codes « ABCD-EFGH » (40 bits chacun). */
export function nouveauxCodesSecours(n = 10) {
  return Array.from({ length: n }, () => {
    const s = base32(randomBytes(5))
    return s.slice(0, 4) + '-' + s.slice(4, 8)
  })
}
/** @param {string} code */
export const empreinteSecours = (code) => createHash('sha256').update('secours|' + code.replace(/[\s-]/g, '').toUpperCase()).digest('hex')
