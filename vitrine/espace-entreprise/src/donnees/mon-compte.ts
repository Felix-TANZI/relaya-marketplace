// Mon compte — même module dans la console et l'espace entreprise (seule la clé d'application change) ; dans l'espace
// entreprise en mode API (VITE_SOURCE=api), chaque geste part au kit (src/api/mon-compte.ts : routes
// /api/company/me/account…, /api/company/profile/cover, /api/company/auth/link…), le reste de ce texte décrit la
// démonstration. La personne connectée gère son compte : photo de profil (recadrée au cercle, ≤ 300 Ko, vue
// partout : en-tête, barre latérale, profil, connexion), photo de couverture de l'entreprise, nom, téléphone (code à
// 6 chiffres envoyé au nouveau numéro), e-mail (code envoyé à la nouvelle adresse), mot de passe (ancien + nouveau),
// compte Google associé (nom, photo, e-mail synchronisés) ; chaque changement sensible demande le mot de passe ou un
// code, et laisse une notification (« alertes de sécurité »). L'appareil peut se souvenir de la personne : la
// connexion revient alors avec son e-mail seulement.
// Tout est gardé sur l'appareil (localStorage) et prévient la coque (« blv:donnees ») : la session de démonstration
// relit le nom, l'e-mail et le téléphone retouchés (src/demo/session.ts).
// Routes du kit (entreprise) : backend-kit/apps/entreprise_session/mon_compte.py (CONNECTEURS-ENTREPRISE.md, « Mon
// compte »). Le code de démonstration est CODE_DEMO_COMPTE.
import { useEffect, useState } from 'react'
import { env } from '@client/config/env'
import * as kit from '../api/mon-compte'
import { CODE_ESSAI_COMPTE } from '../demo/mon-compte'

/** Mode API : Mon compte est servi par le kit (src/api/mon-compte.ts). */
const API = env.source === 'api'

const APP = 'e' as const
const CLE = `blv_${APP}_compte`
const CLE_MEMO = `blv_${APP}_appareil_memo`

/**
 * Code reçu par SMS ou par e-mail, en démonstration : valeur du jeu d'essai (src/demo/mon-compte.ts). Avec l'API
 * (VITE_SOURCE=api), null : le code n'arrive que par SMS ou par e-mail, l'écran ne l'affiche jamais.
 */
export const CODE_DEMO_COMPTE: string | null = env.source === 'api' ? null : CODE_ESSAI_COMPTE
/** Poids maximal d'une photo de profil (après recadrage et compression). */
export const PHOTO_MAX_OCTETS = 300 * 1024

export interface CompteGoogle {
  email: string
  nom: string
  photo: string
}
export interface AlerteSecurite {
  id: string
  quoi: string // « E-mail changé »
  vers: string // où la notification est partie (« ancienne adresse f•••@belivay.com »)
  le: number
}
export interface Retouches {
  prenom?: string
  nom?: string
  telephone?: string
  email?: string
  photo?: string | null
  google?: CompteGoogle | null
  motDePasse?: string
  motDePasseLe?: number
  alertes: AlerteSecurite[]
}
interface Defi {
  quoi: 'telephone' | 'email'
  valeur: string
  essais: number
}
interface Etat {
  comptes: Record<string, Retouches>
  couvertures: Record<string, string | null>
  defis: Record<string, Defi>
}
const VIDE: Etat = { comptes: {}, couvertures: {}, defis: {} }

function lire(): Etat {
  try {
    const x = localStorage.getItem(CLE)
    return x ? { ...VIDE, ...(JSON.parse(x) as Etat) } : structuredClone(VIDE)
  } catch {
    return structuredClone(VIDE)
  }
}
function ecrire(f: (e: Etat) => void) {
  const e = lire()
  f(e)
  try {
    localStorage.setItem(CLE, JSON.stringify(e))
  } catch {
    /* stockage plein ou bloqué : la démonstration continue sans garder */
  }
  window.dispatchEvent(new Event('blv:compte'))
  window.dispatchEvent(new Event('blv:donnees'))
}
const retouches = (e: Etat, id: string): Retouches => (e.comptes[id] ??= { alertes: [] })

/** Retouches d'un compte (nom, e-mail, téléphone, photo…), lues par la session de démonstration. */
export function retouchesDe(id: string): Retouches {
  return lire().comptes[id] ?? { alertes: [] }
}
/** Le compte dont l'e-mail ou le téléphone retouché correspond à cet identifiant (connexion de démonstration). */
export function compteParIdentifiant(identifiant: string): string | null {
  const k = identifiant.trim().toLowerCase()
  const chiffres = k.replace(/\D/g, '').replace(/^237/, '')
  for (const [id, r] of Object.entries(lire().comptes)) {
    if (r.email && r.email.toLowerCase() === k) return id
    if (r.google && r.google.email.toLowerCase() === k) return id
    if (r.telephone && chiffres.length >= 9 && r.telephone.replace(/\D/g, '').replace(/^237/, '') === chiffres) return id
  }
  return null
}
/** Mot de passe changé depuis Mon compte (console), sinon null : la connexion de démonstration le prend en compte. */
export const motDePasseDe = (id: string): string | null => lire().comptes[id]?.motDePasse ?? null

export const initialesDe = (prenom: string, nom: string) => `${prenom.trim()[0] ?? ''}${nom.trim()[0] ?? ''}`.toUpperCase()
export const estGoogle = (email: string | null | undefined) => !!email && /@(gmail|googlemail)\.com$/i.test(email.trim())
export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim())
/** Numéro camerounais : 9 chiffres commençant par 6 (avec ou sans +237). */
export const telephoneValide = (t: string) => /^6\d{8}$/.test(t.replace(/\D/g, '').replace(/^237/, ''))
export const normerTelephone = (t: string) => {
  const n = t.replace(/\D/g, '').replace(/^237/, '')
  return `+237 ${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
}
export const masquerEmail = (e: string) => {
  const [a, d] = e.split('@')
  return d ? `${a[0]}•••@${d}` : e
}
export const masquerTelephone = (t: string) => {
  const n = t.replace(/\D/g, '').replace(/^237/, '')
  return n.length >= 9 ? `+237 ${n[0]}•• •• •• ${n.slice(-2)}` : t
}
/** Mot de passe acceptable : 8 caractères au moins, dont un chiffre. */
export const motDePasseValide = (m: string) => m.length >= 8 && /\d/.test(m)

/** Photo du compte Google de démonstration : un portrait dessiné (fond, visage, initiales), en SVG. */
export function photoGoogleDemo(nom: string): string {
  const ini = nom
    .split(/\s+/)
    .map((x) => x[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const teinte = [...nom].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${teinte} 55% 62%)"/><stop offset="1" stop-color="hsl(${(teinte + 40) % 360} 60% 38%)"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><circle cx="60" cy="48" r="22" fill="hsl(28 45% 38%)"/><path d="M18 120c4-26 22-38 42-38s38 12 42 38z" fill="hsl(${(teinte + 180) % 360} 35% 92%)"/><text x="60" y="113" font-family="Arial,sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="hsl(${teinte} 40% 25%)">${ini}</text></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const alerte = (r: Retouches, quoi: string, vers: string) => {
  r.alertes.unshift({ id: 'al-' + Math.random().toString(36).slice(2, 8), quoi, vers, le: Date.now() })
  r.alertes = r.alertes.slice(0, 8)
}

export type RefusCompte = 'code' | 'valeur' | 'mot_de_passe' | 'faible' | 'meme' | 'essais' | 'lourde' | 'indisponible' | 'trop_tot'
export type Issue = { ok: true } | { ok: false; raison: RefusCompte }
const non = (raison: RefusCompte): Issue => ({ ok: false, raison })

/** Code à 6 chiffres envoyé au nouveau numéro (SMS) ou à la nouvelle adresse (e-mail). */
export async function demanderCode(id: string, quoi: 'telephone' | 'email', valeur: string, actuel: string): Promise<({ ok: true; vers: string } | { ok: false; raison: RefusCompte })> {
  const v = valeur.trim()
  if (quoi === 'email' ? !emailValide(v) : !telephoneValide(v)) return non('valeur') as { ok: false; raison: RefusCompte }
  if (API) return kit.demanderCode(quoi, v)
  const propre = quoi === 'email' ? v.toLowerCase() : normerTelephone(v)
  if ((quoi === 'email' ? actuel.toLowerCase() : actuel.replace(/\D/g, '')) === (quoi === 'email' ? propre : propre.replace(/\D/g, ''))) return non('meme') as { ok: false; raison: RefusCompte }
  ecrire((e) => void (e.defis[id + ':' + quoi] = { quoi, valeur: propre, essais: 0 }))
  return { ok: true, vers: quoi === 'email' ? masquerEmail(propre) : masquerTelephone(propre) }
}

/** Le code reçu confirme le nouveau numéro ou la nouvelle adresse ; l'ancien canal reçoit la notification. */
export async function confirmerCode(id: string, quoi: 'telephone' | 'email', code: string, ancien: string): Promise<Issue> {
  if (API) return kit.confirmerCode(quoi, code.trim())
  const e = lire()
  const d = e.defis[id + ':' + quoi]
  if (!d) return non('code')
  if (code.trim() !== CODE_DEMO_COMPTE) {
    const essais = d.essais + 1
    ecrire((x) => {
      if (essais >= 3) delete x.defis[id + ':' + quoi]
      else x.defis[id + ':' + quoi].essais = essais
    })
    return non(essais >= 3 ? 'essais' : 'code')
  }
  ecrire((x) => {
    const r = retouches(x, id)
    if (quoi === 'email') {
      r.email = d.valeur
      alerte(r, 'E-mail changé', masquerEmail(ancien))
    } else {
      r.telephone = d.valeur
      alerte(r, 'Téléphone changé', masquerTelephone(ancien))
    }
    delete x.defis[id + ':' + quoi]
  })
  return { ok: true }
}

/** Code du changement de nom (SMS au numéro du compte) : envoyé par le kit en mode API ; la démonstration n'envoie rien. */
export async function demanderCodeNom(): Promise<{ ok: true; vers: string | null } | { ok: false; raison: RefusCompte }> {
  return API ? kit.demanderCodeNom() : { ok: true, vers: null }
}

/** Nom affiché (confirmé par le code envoyé par SMS au numéro du compte). */
export async function changerNom(id: string, prenom: string, nom: string, code: string, email: string): Promise<Issue> {
  if (!prenom.trim() || !nom.trim()) return non('valeur')
  if (API) return kit.changerNom(prenom.trim(), nom.trim(), code.trim())
  if (code.trim() !== CODE_DEMO_COMPTE) return non('code')
  ecrire((x) => {
    const r = retouches(x, id)
    r.prenom = prenom.trim()
    r.nom = nom.trim()
    alerte(r, 'Nom changé', masquerEmail(email))
  })
  return { ok: true }
}

/** Mot de passe gardé ici (console) : ancien vérifié par l'appelant, nouveau ≥ 8 caractères dont un chiffre. */
export async function changerMotDePasse(id: string, ancienOk: boolean, ancien: string, nouveau: string, email: string): Promise<Issue> {
  if (!ancienOk) return non('mot_de_passe')
  if (!motDePasseValide(nouveau)) return non('faible')
  if (nouveau === ancien) return non('meme')
  ecrire((x) => {
    const r = retouches(x, id)
    r.motDePasse = nouveau
    r.motDePasseLe = Date.now()
    alerte(r, 'Mot de passe changé', masquerEmail(email))
  })
  return { ok: true }
}
/** Notification seule (mot de passe changé par la source de l'espace, par exemple). */
export function noterAlerte(id: string, quoi: string, vers: string) {
  if (API) return void kit.relireCompte() // le kit pose l'alerte lui-même (mot de passe changé : /me/password)
  ecrire((x) => alerte(retouches(x, id), quoi, vers))
}

/** Photo de profil (data URL déjà recadrée) ou null pour la retirer. */
export async function changerPhoto(id: string, photo: string | null): Promise<Issue> {
  if (API) return kit.changerPhoto(photo)
  if (photo && Math.ceil(((photo.length - photo.indexOf(',') - 1) * 3) / 4) > PHOTO_MAX_OCTETS && !photo.startsWith('data:image/svg')) return non('lourde')
  ecrire((x) => void (retouches(x, id).photo = photo))
  return { ok: true }
}

/** Photo de couverture d'une entreprise (bandeau 3:1) ou null. */
export async function changerCouverture(entreprise: string, photo: string | null): Promise<Issue> {
  if (API) return kit.changerCouverture(photo) // l'entreprise de la personne connectée (propriétaire)
  ecrire((x) => void (x.couvertures[entreprise] = photo))
  return { ok: true }
}

/** Associer un compte Google (démonstration : l'adresse Google saisie, le nom et la photo du compte). */
export async function associerGoogle(id: string, email: string, nom: string, emailCompte: string): Promise<Issue> {
  // Kit : jeton d'identité Google (Google Identity Services, à brancher dans l'écran) vérifié par le vérificateur du kit ;
  // tant qu'il n'est pas configuré, la réponse est « indisponible ».
  if (API) return kit.associerGoogle(email.trim())
  if (!estGoogle(email)) return non('valeur')
  ecrire((x) => {
    const r = retouches(x, id)
    r.google = { email: email.trim().toLowerCase(), nom, photo: photoGoogleDemo(nom) }
    alerte(r, 'Compte Google associé', masquerEmail(emailCompte))
  })
  return { ok: true }
}
export async function dissocierGoogle(id: string, emailCompte: string): Promise<Issue> {
  if (API) return kit.dissocierGoogle()
  ecrire((x) => {
    const r = retouches(x, id)
    r.google = null
    alerte(r, 'Compte Google dissocié', masquerEmail(emailCompte))
  })
  return { ok: true }
}
/** Synchroniser depuis Google : nom et photo du compte Google (l'e-mail Google sert aussi à se connecter). */
export async function synchroniserGoogle(id: string): Promise<Issue> {
  if (API) return kit.synchroniserGoogle()
  const g = retouchesDe(id).google
  if (!g) return non('valeur')
  const [prenom, ...reste] = g.nom.split(' ')
  ecrire((x) => {
    const r = retouches(x, id)
    r.prenom = prenom
    r.nom = reste.join(' ') || r.nom
    r.photo = g.photo
  })
  return { ok: true }
}

/** Compte vu par l'écran : la base (session) et ses retouches ; relu à chaque changement. */
export interface CompteVu {
  prenom: string
  nom: string
  initiales: string
  telephone: string
  email: string
  photo: string | null
  google: CompteGoogle | null
  motDePasseLe: number | null
  alertes: AlerteSecurite[]
}
export function useCompte(id: string | null | undefined, base: { prenom: string; nom: string; telephone: string; email: string }): CompteVu {
  const [, maj] = useState(0)
  useEffect(() => {
    const f = () => maj((n) => n + 1)
    window.addEventListener('blv:compte', f)
    window.addEventListener('storage', f)
    return () => {
      window.removeEventListener('blv:compte', f)
      window.removeEventListener('storage', f)
    }
  }, [])
  useEffect(() => {
    if (API && id) void kit.relireCompte()
  }, [id])
  if (API) {
    const k = kit.compteLu(id)
    const prenom = k?.prenom || base.prenom
    const nom = k?.nom || base.nom
    return { prenom, nom, initiales: initialesDe(prenom, nom), telephone: k?.telephone || base.telephone, email: k?.email || base.email, photo: k?.photo ?? null, google: k?.google ?? null, motDePasseLe: k?.motDePasseLe ?? null, alertes: k?.alertes ?? [] }
  }
  const r = id ? retouchesDe(id) : { alertes: [] as AlerteSecurite[] }
  const prenom = r.prenom ?? base.prenom
  const nom = r.nom ?? base.nom
  return { prenom, nom, initiales: initialesDe(prenom, nom), telephone: r.telephone ?? base.telephone, email: r.email ?? base.email, photo: r.photo ?? null, google: r.google ?? null, motDePasseLe: r.motDePasseLe ?? null, alertes: r.alertes }
}
/** Photo de profil seule (en-tête, barre latérale) : relue à chaque changement. */
export function usePhoto(id: string | null | undefined): string | null {
  const [, maj] = useState(0)
  useEffect(() => {
    const f = () => maj((n) => n + 1)
    window.addEventListener('blv:compte', f)
    if (API && id && !kit.compteLu(id)) void kit.relireCompte()
    return () => window.removeEventListener('blv:compte', f)
  }, [id])
  if (API) return kit.compteLu(id)?.photo ?? null
  return id ? (retouchesDe(id).photo ?? null) : null
}
/** Couverture d'une entreprise : relue à chaque changement. */
export function useCouverture(entreprise: string | null | undefined): string | null {
  const [, maj] = useState(0)
  useEffect(() => {
    const f = () => maj((n) => n + 1)
    window.addEventListener('blv:compte', f)
    if (API && entreprise) void kit.relireCompte()
    return () => window.removeEventListener('blv:compte', f)
  }, [entreprise])
  if (API) return entreprise ? kit.couvertureLue() : null
  return entreprise ? (lire().couvertures[entreprise] ?? null) : null
}

// ── Appareil qui se souvient de la personne ──────────────────────────────────────────────────────────────────────────
export interface AppareilMemorise {
  email: string
  prenom: string
  initiales: string
  photo: string | null
}
export function appareilMemorise(): AppareilMemorise | null {
  try {
    const x = localStorage.getItem(CLE_MEMO)
    return x ? (JSON.parse(x) as AppareilMemorise) : null
  } catch {
    return null
  }
}
export function memoriserAppareil(a: AppareilMemorise | null) {
  // Kit : l'appareil retenu (ou oublié) est gardé au serveur ; le stockage de l'appareil n'en est que la copie.
  if (API) void (a ? kit.retenirAppareil(true) : kit.oublierAppareil()).catch(() => undefined)
  try {
    if (a) localStorage.setItem(CLE_MEMO, JSON.stringify(a))
    else localStorage.removeItem(CLE_MEMO)
  } catch {
    /* rien */
  }
}

/** Kit : l'appareil se souvient-il encore de quelqu'un ? La copie locale suit la réponse (null : rien de retenu). */
export async function synchroniserAppareil(): Promise<AppareilMemorise | null> {
  if (!API) return appareilMemorise()
  const a = await kit.appareilRetenu().catch(() => appareilMemorise())
  try {
    if (a) localStorage.setItem(CLE_MEMO, JSON.stringify(a))
    else localStorage.removeItem(CLE_MEMO)
  } catch {
    /* rien */
  }
  return a
}

/** Lien de connexion par e-mail (démonstration : il vaut 15 minutes ; la réponse ne dit jamais si l'adresse existe). */
export async function envoyerLienConnexion(email: string): Promise<{ ok: true; vers: string } | { ok: false; raison: 'valeur' }> {
  if (!emailValide(email)) return { ok: false, raison: 'valeur' }
  if (API) return kit.envoyerLienConnexion(email)
  return { ok: true, vers: masquerEmail(email.trim().toLowerCase()) }
}

// ── Kit seulement (mode API) : le lien reçu par e-mail ─────────────────────────────────────────────────────────────
/** Ouvrir le lien de connexion reçu par e-mail (« ?lien= ») : il remplace le mot de passe, le code SMS reste demandé
 *  là où il l'est. */
export const ouvrirLienConnexion = (jeton: string): Promise<kit.ResultatLien> => kit.ouvrirLienConnexion(jeton)
