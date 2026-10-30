// Recherche partout (motif M4 : barre du haut « Paquet, colis, livreur… » ouverte par ⌘K ou « / », page Rechercher
// partout) : un index lu à la demande dans la source (jamais en dur), filtré par rôle — une route fermée au rôle
// (ENT-RG-R25) n'est ni lue ni proposée. Chaque résultat mène à sa fiche : paquet, mission, incident, litige,
// livreur, véhicule, zone, colis (son paquet) et les pages de l'espace.
import { NAVIGATION } from '../config/navigation'
import { chemin } from '../config/pages'
import { source } from '../donnees/source'

export type Genre = 'page' | 'livreur' | 'paquet' | 'mission' | 'incident' | 'litige' | 'colis' | 'vehicule' | 'zone'
export interface Resultat {
  genre: Genre
  id: string
  titre: string
  sous?: string
  vers: string
  icone: string
  /** Texte de recherche (titre, sous-titre, identifiant, français et langue affichée), sans accents. */
  cle: string
}

/** Ordre et nom des groupes de résultats. */
export const GENRES: { genre: Genre; titre: string }[] = [
  { genre: 'paquet', titre: 'Paquets' },
  { genre: 'mission', titre: 'Missions' },
  { genre: 'colis', titre: 'Colis' },
  { genre: 'livreur', titre: 'Livreurs' },
  { genre: 'incident', titre: 'Incidents' },
  { genre: 'litige', titre: 'Litiges' },
  { genre: 'vehicule', titre: 'Véhicules' },
  { genre: 'zone', titre: 'Zones' },
  { genre: 'page', titre: 'Pages' },
]

/** Pages hors de la navigation, trouvables aussi (titre français, route, icône, mots associés). */
const PAGES_EN_PLUS: { route: string; titre: string; icone: string; mots?: string }[] = [
  { route: 'menu', titre: 'Menu', icone: 'menu' },
  { route: 'profil', titre: 'Mon profil', icone: 'user-round', mots: 'compte langue thème taille du texte affichage préférences sons' },
  { route: 'securite', titre: 'Sécurité et équipe', icone: 'lock', mots: 'appareils connexions équipe rôles droits mot de passe' },
  { route: 'planning', titre: 'Planning des livreurs', icone: 'calendar-days', mots: 'créneaux disponibilités semaine demain' },
  { route: 'apprendre', titre: 'Apprendre', icone: 'graduation-cap', mots: 'fiches aide délais preuves litiges score domicile' },
  { route: 'activite', titre: 'Activité de l’équipe', icone: 'history', mots: 'journal qui a fait quoi' },
  { route: 'ajout', titre: 'Ajouter un livreur', icone: 'user-plus', mots: 'inviter' },
]

export const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

type Traduire = (s: string) => string
const resultat = (r: Omit<Resultat, 'cle'>, ...mots: (string | null | undefined)[]): Resultat => ({ ...r, cle: sansAccents([r.titre, r.sous, r.id, ...mots].filter(Boolean).join(' ')) })

/** Lit l'index de la recherche (pages, puis données des routes ouvertes au rôle ; un domaine en panne est sauté). */
export async function chargerIndex(ouverte: (route: string) => boolean, t: Traduire): Promise<Resultat[]> {
  const out: Resultat[] = []
  for (const g of NAVIGATION)
    for (const e of g.entrees) if (ouverte(e.route)) out.push(resultat({ genre: 'page', id: e.route, titre: t(e.titre), sous: t(g.titre), vers: chemin(e.route), icone: e.icone }, e.titre))
  for (const p of PAGES_EN_PLUS) if (ouverte(p.route)) out.push(resultat({ genre: 'page', id: p.route, titre: t(p.titre), vers: chemin(p.route), icone: p.icone }, p.titre, p.mots))
  const lire = async <T>(route: string, f: () => Promise<T>): Promise<T | null> => {
    if (!ouverte(route)) return null
    try {
      return await f()
    } catch {
      return null
    }
  }
  const [livreurs, disponibles, missions, incidents, litiges, vehicules, zones, colis] = await Promise.all([
    lire('flotte', () => source.livreurs.liste()),
    lire('paquets', () => source.paquets.disponibles()),
    lire('missions', async () => (await Promise.all((['a_affecter', 'affectees', 'en_cours', 'deposees', 'incidents'] as const).map((o) => source.missions.liste(o)))).flat()),
    lire('incidents', () => source.incidents.liste()),
    lire('litiges', () => source.litiges.liste()),
    lire('vehicules', () => source.vehicules.liste()),
    lire('zones', () => source.zones.zones()),
    lire('colis', async () => (await Promise.all((['a_ramasser', 'sous_garde'] as const).map((f) => source.colis.file(f)))).flat()),
  ])
  for (const l of livreurs ?? []) out.push(resultat({ genre: 'livreur', id: l.id, titre: l.nom, sous: [l.zones.join(', '), l.plaque].filter(Boolean).join(' · '), vers: chemin('livreur', { id: l.id }), icone: 'user-round' }))
  for (const p of disponibles?.paquets ?? []) out.push(resultat({ genre: 'paquet', id: p.id, titre: p.id, sous: `${p.zone} · ${p.colis.nombre} colis${p.relais ? ' · ' + p.relais : ''}`, vers: chemin('paquet', { id: p.id }), icone: 'boxes' }))
  const vus = new Set(out.filter((r) => r.genre === 'paquet').map((r) => r.id))
  for (const m of missions ?? []) {
    out.push(resultat({ genre: 'mission', id: m.id, titre: m.id, sous: [m.paquetId, m.livreur?.nom, m.lieu].filter(Boolean).join(' · '), vers: chemin('missions', { id: m.id }), icone: 'map' }, m.zone))
    if (!vus.has(m.paquetId)) {
      vus.add(m.paquetId)
      out.push(resultat({ genre: 'paquet', id: m.paquetId, titre: m.paquetId, sous: [m.zone, m.livreur?.nom].filter(Boolean).join(' · '), vers: chemin('paquet', { id: m.paquetId }), icone: 'boxes' }))
    }
  }
  for (const i of incidents ?? []) out.push(resultat({ genre: 'incident', id: i.id, titre: i.id, sous: `${i.livreur.nom} · ${i.lieu}`, vers: chemin('incidents', { id: i.id }), icone: 'triangle-alert' }, i.paquetId))
  for (const l of litiges ?? []) out.push(resultat({ genre: 'litige', id: l.id, titre: l.id, sous: [l.commande, l.livreur?.nom].filter(Boolean).join(' · '), vers: chemin('litiges', { id: l.id }), icone: 'scale' }, l.paquetId, l.motif))
  for (const v of vehicules ?? []) out.push(resultat({ genre: 'vehicule', id: v.id, titre: v.plaque, sous: v.type, vers: chemin('vehicules', { id: v.id }), icone: 'bike' }))
  for (const z of zones ?? []) out.push(resultat({ genre: 'zone', id: z.code, titre: `${z.code} · ${z.nom}`, vers: chemin('zones', { sheet: 'fiche', z: z.code }), icone: 'map-pinned' }))
  for (const c of colis ?? []) out.push(resultat({ genre: 'colis', id: c.etiquette, titre: c.etiquette, sous: [c.paquetId, c.livreur?.nom].filter(Boolean).join(' · '), vers: chemin('paquet', { id: c.paquetId }), icone: 'package' }, c.etiquette.replace(/\s/g, '')))
  return out
}

/** Résultats d'une saisie : tous les mots doivent y être ; un identifiant ou un début de titre passe devant. */
export function filtrer(index: Resultat[], q: string, max = 50): Resultat[] {
  const n = sansAccents(q.trim())
  if (!n) return []
  const mots = n.split(/\s+/)
  const compacte = n.replace(/\s/g, '')
  const score = (r: Resultat) => {
    const titre = sansAccents(r.titre)
    if (sansAccents(r.id) === n || titre === n) return 0
    if (titre.startsWith(n) || sansAccents(r.id).startsWith(n)) return 1
    return 2
  }
  return index
    .filter((r) => mots.every((m) => r.cle.includes(m)) || (compacte.length > 3 && r.cle.replace(/\s/g, '').includes(compacte)))
    .map((r) => [score(r), r] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, max)
    .map(([, r]) => r)
}

/** Adresse directe d'un identifiant saisi en entier (« PQ-… », « MS-… », « IN-… », « LT-… ») ; sinon null. */
export function adresseDirecte(q: string): string | null {
  const id = q.trim().toUpperCase()
  if (/^PQ-[\w-]+$/.test(id)) return chemin('paquet', { id })
  if (/^MS-[\w-]+$/.test(id)) return chemin('missions', { id })
  if (/^IN-\d+$/.test(id)) return chemin('incidents', { id })
  if (/^LT-\d+$/.test(id)) return chemin('litiges', { id })
  return null
}

// Recherches récentes (sur l'appareil, 6 au plus).
const CLE = 'blv_e_recherches'
export function recentes(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}
export function retenir(q: string) {
  const v = q.trim()
  if (v.length < 2) return
  try {
    localStorage.setItem(CLE, JSON.stringify([v, ...recentes().filter((x) => x !== v)].slice(0, 6)))
  } catch {
    /* stockage indisponible */
  }
}
export function oublierRecentes() {
  try {
    localStorage.removeItem(CLE)
  } catch {
    /* rien */
  }
}
