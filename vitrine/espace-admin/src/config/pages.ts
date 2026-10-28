// Adresses de la console et onglets du téléphone. La File d'action (APP.home du prototype) est « /admin/ » ; une route
// « litige » est « /admin/litige?id=X ». Le préfixe /admin/ est celui du routeur (basename) : chemin() rend l'adresse
// dans l'application, sans lui. Ce module remplace aussi site/src/config/pages pour le code du client réutilisé
// (vite.config.ts) : il en garde les noms utilisés par ce code (ONGLETS, chemin).
import type { Role } from '../donnees/communs'

export const ACCUEIL = 'file'

/** Page d'arrivée d'un rôle : la File d'action, sauf l'agent terrain (sa tournée : Comptes et agents terrain, ADM-P34). */
export const ACCUEIL_ROLE: Record<Role, string> = {
  superviseur: 'file', finance: 'file', support: 'file', mediation: 'file', operations: 'file', verification: 'file', audit: 'file', terrain: 'comptes', rh: 'file',
}

export interface Onglet {
  id: string
  titre: string
  icone: string
}
// Barre du bas du téléphone (APP.mtabs : File, Litiges, Argent, Menu) ; chaque rôle a les siens (ADMA_ROLES du
// prototype) : jamais un onglet vers une page qu'il n'ouvre pas.
const MENU: Onglet = { id: 'menu', titre: 'Menu', icone: 'menu' }
const FILE: Onglet = { id: 'file', titre: 'File', icone: 'inbox' }
export const ONGLETS_ROLE: Record<Role, Onglet[]> = {
  superviseur: [FILE, { id: 'litige', titre: 'Litiges', icone: 'scale' }, { id: 'versements', titre: 'Argent', icone: 'banknote' }, MENU],
  finance: [FILE, { id: 'escrow', titre: 'Escrow', icone: 'landmark' }, { id: 'versements', titre: 'Versements', icone: 'banknote' }, MENU],
  support: [FILE, { id: 'litige', titre: 'Litiges', icone: 'scale' }, { id: 'support', titre: 'Support', icone: 'life-buoy' }, MENU],
  mediation: [FILE, { id: 'litige', titre: 'Litiges', icone: 'scale' }, { id: 'sanctions', titre: 'Sanctions', icone: 'gavel' }, MENU],
  operations: [FILE, { id: 'paquets', titre: 'Paquets', icone: 'boxes' }, { id: 'zones', titre: 'Zones', icone: 'map-pinned' }, MENU],
  verification: [FILE, { id: 'kyc', titre: 'KYC', icone: 'id-card' }, { id: 'moderation', titre: 'Modération', icone: 'badge-check' }, MENU],
  audit: [FILE, { id: 'journal', titre: 'Journal', icone: 'scroll-text' }, { id: 'fraude', titre: 'Fraude', icone: 'shield-alert' }, MENU],
  rh: [FILE, { id: 'roles', titre: 'Équipe', icone: 'key-round' }, { id: 'journal', titre: 'Journal', icone: 'scroll-text' }, MENU],
  terrain: [{ id: 'comptes', titre: 'Tournée', icone: 'user-plus' }, { id: 'mes-descentes', titre: 'Descentes', icone: 'footprints' }, { id: 'kyc', titre: 'Photos', icone: 'camera' }, MENU],
}
/** Onglets par défaut (code du client réutilisé ; Direction). */
export const ONGLETS: Onglet[] = ONGLETS_ROLE.superviseur

/** Adresse d'une route dans l'application, avec ses paramètres : chemin('litige', { id: 'LT-0412' }). */
export function chemin(route: string, params?: Record<string, string | number | undefined | null>): string {
  const base = route === ACCUEIL ? '/' : '/' + route
  if (!params) return base
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? base + '?' + s : base
}

/** Route d'une adresse de l'application (« /litige » → « litige », « / » → « file »). */
export const routeDe = (pathname: string) => pathname.replace(/^\/+/, '').split('/')[0] || ACCUEIL
