// Recherche de la console (barre du haut, ⌘K ; page Rechercher partout) : les pages que le rôle ouvre, et les
// identifiants de l'écosystème qui mènent droit à leur fiche (BLV-… commande, PQ-… paquet, LT-… litige, KYC-…,
// RB-… remboursement, QY-… quatre yeux, SP-… ticket). Rien de ce que le rôle n'ouvre pas n'est proposé (ADM-ROL-01).
// Les groupes d'écrans enrichissent l'index par la page Rechercher partout (AJ-A) ; ce module reste le socle.
import { normaliser } from './prototype'
import { NAVIGATION } from '../config/navigation'
import { chemin } from '../config/pages'

export interface Resultat {
  genre: 'page' | 'fiche'
  id: string
  titre: string
  sous?: string
  icone: string
  vers: string
}

/** Pages ouvertes au rôle, avec leur groupe. */
export function indexDesPages(ouverte: (route: string) => boolean, t: (fr: string) => string): Resultat[] {
  return NAVIGATION.flatMap((g) => g.entrees.filter((e) => ouverte(e.route)).map((e) => ({ genre: 'page' as const, id: e.route, titre: t(e.titre), sous: t(g.titre), icone: e.icone, vers: chemin(e.route) })))
}

export function filtrer(index: Resultat[], q: string, max = 7): Resultat[] {
  const n = normaliser(q)
  return index.filter((r) => normaliser(`${r.titre} ${r.sous ?? ''} ${r.id}`).includes(n)).slice(0, max)
}

/** Identifiants reconnus : préfixe → page et paramètre. */
export const IDENTIFIANTS: { motif: RegExp; route: string; param: string }[] = [
  { motif: /^BLV-\d{5}$/i, route: 'commandes', param: 'ref' },
  { motif: /^PQ-Z\d+-\d{6}-\d{3}$/i, route: 'paquets', param: 'id' },
  { motif: /^LT-\d{4}$/i, route: 'litige', param: 'id' },
  { motif: /^KYC-\d{4}$/i, route: 'kyc', param: 'id' },
  { motif: /^RB-\d{4}$/i, route: 'remboursements', param: 'id' },
  { motif: /^QY-\d{4}$/i, route: 'quatreyeux', param: 'id' },
  { motif: /^SP-\d{4}$/i, route: 'support', param: 'id' },
]

/** Adresse directe d'un identifiant entier (si le rôle ouvre sa page), sinon null. */
export function adresseDirecte(q: string, ouverte: (route: string) => boolean = () => true): string | null {
  const v = q.trim().toUpperCase()
  const i = IDENTIFIANTS.find((x) => x.motif.test(v) && ouverte(x.route))
  return i ? chemin(i.route, { [i.param]: v }) : null
}

const CLE = 'blv_a_recherches'
/** Garde les dernières recherches de l'appareil (page Rechercher partout). */
export function retenir(q: string) {
  const v = q.trim()
  if (!v) return
  try {
    const l = (JSON.parse(localStorage.getItem(CLE) ?? '[]') as string[]).filter((x) => x !== v)
    localStorage.setItem(CLE, JSON.stringify([v, ...l].slice(0, 8)))
  } catch {
    /* stockage refusé */
  }
}
export function recentes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]') as string[]
  } catch {
    return []
  }
}
