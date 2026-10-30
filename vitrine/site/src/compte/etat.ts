// Kit « compte » partagé par les quatre applications (client, vendeur, livreur, point relais) : ce que la démonstration
// garde du compte en plus des données de chaque application — photo et couverture choisies, nom, numéro, e-mail, mot
// de passe, compte Google associé, appareil retenu (« Se souvenir de cet appareil »), compte désactivé, et les avis
// envoyés à chaque changement sensible. Gardé sur l'appareil (localStorage, une clé par application) ; aucune vraie
// donnée : comptes de démonstration seulement. Les applications lisent leurs surcharges (photo, nom) dans leur propre
// source de démonstration : l'en-tête, le menu et le profil changent aussitôt (événements blv:compte et blv:donnees).
import { useSyncExternalStore } from 'react'
import { CODE_DEMO, MDP_DEMO } from '../demo/valeurs-essai'

/** Application (« client », « vendeur », « livreur ») ou compte d'un membre (« relais:m-rose »). */
export type AppCompte = 'client' | 'vendeur' | 'livreur' | `relais:${string}`

export interface CompteGoogle {
  email: string
  nom: string
  photo: string
}

/** Identité de départ du compte, donnée par l'application (jeu d'essai). */
export interface IdentiteDepart {
  prenom: string
  nom: string
  telephone: string // 9 chiffres (+237)
  email: string | null
  photo: string | null
}

export interface AvisCompte {
  id: string
  texte: string
  a: number
  lu: boolean
}

export interface CompteDemo {
  prenom?: string
  nom?: string
  telephone?: string
  email?: string | null
  photo?: string | null
  couverture?: string | null
  motDePasse: string
  google: CompteGoogle | null
  /** Appareil retenu : au retour, l'e-mail suffit (compte reconnu, photo affichée). */
  retenu: boolean
  desactive: 'desactive' | 'supprime' | null
  avis: AvisCompte[]
}

// Mot de passe et code des comptes de démonstration : valeurs du jeu d'essai (src/demo/valeurs-essai.ts), reprises
// ici pour les écrans du kit ; elles partent avec la démonstration (logique-metier/RETIRER-LA-DEMO.md).
export { CODE_DEMO, MDP_DEMO }

const VIDE: CompteDemo = { motDePasse: MDP_DEMO, google: null, retenu: false, desactive: null, avis: [] }
const cle = (app: AppCompte) => `blv_ck_${app}`
const caches = new Map<AppCompte, CompteDemo>()
const abonnes = new Set<() => void>()

export function lireCompte(app: AppCompte): CompteDemo {
  const c = caches.get(app)
  if (c) return c
  let v: CompteDemo = VIDE
  try {
    const brut = localStorage.getItem(cle(app))
    if (brut) v = { ...VIDE, ...(JSON.parse(brut) as Partial<CompteDemo>) }
  } catch {
    // Stockage refusé ou illisible : le compte de départ.
  }
  caches.set(app, v)
  return v
}

export function ecrireCompte(app: AppCompte, f: (c: CompteDemo) => Partial<CompteDemo>) {
  const avant = lireCompte(app)
  const apres = { ...avant, ...f(avant) }
  // Compte Google associé : il reste synchronisé (même nom, même photo, même e-mail).
  if (apres.google) {
    const nom = [apres.prenom, apres.nom].filter(Boolean).join(' ')
    apres.google = { email: apres.email ?? apres.google.email, nom: nom || apres.google.nom, photo: apres.photo ?? apres.google.photo }
  }
  caches.set(app, apres)
  try {
    localStorage.setItem(cle(app), JSON.stringify(apres))
  } catch {
    // Plein ou refusé : le changement vaut le temps de la page.
  }
  abonnes.forEach((x) => x())
  window.dispatchEvent(new Event('blv:compte'))
  window.dispatchEvent(new Event('blv:donnees'))
}

/** Avis envoyé au titulaire après un changement sensible (notification de l'application et e-mail en démo). */
export function aviser(app: AppCompte, texte: string) {
  ecrireCompte(app, (c) => ({ avis: [{ id: 'ck-' + Date.now().toString(36), texte, a: Date.now(), lu: false }, ...c.avis].slice(0, 20) }))
}

export function useCompteDemo(app: AppCompte): CompteDemo {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      const autre = (e: StorageEvent) => e.key === cle(app) && (caches.delete(app), f())
      window.addEventListener('storage', autre)
      return () => (abonnes.delete(f), window.removeEventListener('storage', autre))
    },
    () => lireCompte(app),
    () => VIDE,
  )
}

/** Identité affichée : celle du jeu d'essai, remplacée par ce que la personne a changé. */
export function identite(app: AppCompte, d: IdentiteDepart): IdentiteDepart & { couverture: string | null } {
  const c = lireCompte(app)
  return {
    prenom: c.prenom ?? d.prenom,
    nom: c.nom ?? d.nom,
    telephone: c.telephone ?? d.telephone,
    email: c.email !== undefined ? c.email : d.email,
    photo: c.photo !== undefined ? c.photo : d.photo,
    couverture: c.couverture ?? null,
  }
}

/** Photo du compte si elle a été changée ici (undefined : celle de l'application). */
export const photoChangee = (app: AppCompte): string | null | undefined => lireCompte(app).photo

// ── Affichage ──────────────────────────────────────────────────────────────────────────────────────────────────

export const initiales = (prenom: string, nom = '') =>
  [prenom, nom]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join('')
    .toUpperCase() || '·'

// Initiales colorées : une couleur stable par nom, lisible en clair comme en sombre (texte blanc).
const TEINTES = ['#C2410C', '#1D4ED8', '#15803D', '#7C3AED', '#BE185D', '#0E7490', '#A16207', '#4338CA']
export function teinte(nom: string): string {
  let h = 0
  for (const ch of nom) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TEINTES[h % TEINTES.length]
}

export const masquerEmail = (e: string | null | undefined) => {
  if (!e) return ''
  const [a, d] = e.split('@')
  return d ? `${a[0]}•••••@${d}` : e
}
export const masquerTel = (n: string) => {
  const c = n.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')
  return c.length === 9 ? `+237 ${c[0]} ${c.slice(1, 3)} •• •• ${c.slice(7)}` : n
}
export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim())
export const telValide = (n: string) => /^6\d{8}$/.test(n.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, ''))
export const chiffres = (n: string) => n.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')

/** Règles de solidité du mot de passe (8 caractères au moins, dont un chiffre ; une lettre). */
export const REGLES_MDP: [string, (m: string) => boolean][] = [
  ['8 caractères au moins', (m) => m.length >= 8],
  ['Un chiffre', (m) => /\d/.test(m)],
  ['Une lettre', (m) => /\p{L}/u.test(m)],
]
export const mdpSolide = (m: string) => REGLES_MDP.every(([, f]) => f(m))

/**
 * Compte Google du téléphone (démonstration) : son nom, son adresse et sa photo, dessinée (aucune vraie personne).
 * La même adresse que le compte BelivaY quand celui-ci est une adresse Gmail ; sinon une adresse Gmail au même nom.
 */
export function googleDuTelephone(prenom: string, nom: string, email: string | null): CompteGoogle {
  const simple = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  const adresse = email && /@gmail\.com$/i.test(email) ? email : `${simple(prenom) || 'compte'}.${simple(nom) || 'belivay'}@gmail.com`
  return { email: adresse, nom: [prenom, nom].filter(Boolean).join(' '), photo: portraitDessine(teinte(prenom + nom)) }
}

/**
 * Portrait dessiné (fond en dégradé, silhouette) : la « photo » du compte Google de démonstration. Une image JPEG
 * (comme une vraie photo : acceptée par chaque application), dessinée une fois par couleur.
 */
const portraits = new Map<string, string>()
export function portraitDessine(couleur: string): string {
  const deja = portraits.get(couleur)
  if (deja) return deja
  let url = ''
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 240
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 240, 240)
    g.addColorStop(0, '#FFFFFF')
    g.addColorStop(0.15, couleur)
    g.addColorStop(1, '#1C1917')
    x.fillStyle = g
    x.fillRect(0, 0, 240, 240)
    x.fillStyle = '#FFFFFF'
    x.globalAlpha = 0.92
    x.beginPath()
    x.ellipse(120, 250, 92, 80, 0, Math.PI, 0)
    x.fill()
    x.globalAlpha = 1
    x.fillStyle = '#F2CBA8'
    x.beginPath()
    x.arc(120, 100, 46, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#2B1B12'
    x.beginPath()
    x.ellipse(120, 78, 50, 30, 0, Math.PI, 0)
    x.fill()
    url = c.toDataURL('image/jpeg', 0.86)
  } catch {
    url = ''
  }
  if (!/^data:image\/jpeg;base64,/.test(url)) url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${couleur}"/><circle cx="60" cy="50" r="23" fill="#F2CBA8"/><path d="M14 120c4-26 22-38 46-38s42 12 46 38z" fill="#fff"/></svg>`)
  portraits.set(couleur, url)
  return url
}
