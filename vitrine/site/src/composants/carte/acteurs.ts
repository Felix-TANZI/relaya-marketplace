// Marqueurs des cartes : le module commun des six applications (client, vendeur, point relais, entreprise de
// livraison, livreur, console). Les cinq autres applications le lisent par l'alias « @client/composants/carte/… »
// (une seule copie). Ce fichier ne dépend de rien : il décrit chaque acteur (couleur de son interface, DP-60, et
// icône nette sur une grille de 24) et dessine un marqueur en texte SVG, que le marqueur React (Marqueurs.tsx) et le
// marqueur Google Maps (connecteurs/cartes.ts : AdvancedMarkerElement ou icône d'un Marker classique) emploient tous
// deux : le même dessin partout, quel que soit le fond (OpenStreetMap, Google Maps ou plan schématique).
// Le logo BelivaY n'est jamais employé comme marqueur.

export type Acteur = 'client' | 'boutique' | 'livreur' | 'relais' | 'entreprise' | 'stockage' | 'zone' | 'paquet' | 'alerte'
/** État d'un livreur sur la carte : en mission (position suivie), disponible, hors ligne (dernière position connue). */
export type EtatLivreur = 'mission' | 'disponible' | 'hors_ligne'

export interface DefActeur {
  libelle: string // nom de l'acteur dans la légende (texte français, traduit à l'affichage)
  fond: string // couleur de la pastille : celle de l'interface de l'acteur
  trait: string // couleur de l'icône sur la pastille
  chemins: string[] // icône, grille 24 × 24, trait de 2, extrémités rondes
}

// Cercle en chemin (une icône est une liste de chemins).
const rond = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

export const ACTEURS: Record<Acteur, DefActeur> = {
  // Client : orange de l'espace client ; sa maison (adresse de livraison). Jamais son adresse exacte hors de son espace.
  client: { libelle: 'Adresse du client', fond: '#E8630A', trait: '#FFFFFF', chemins: ['M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'] },
  // Boutique du vendeur : nuit et or de l'espace vendeur ; une devanture à auvent.
  boutique: { libelle: 'Boutique', fond: '#1B2540', trait: '#F4B740', chemins: ['M4 10v10h16V10', 'M2.5 4h19l-1.5 5a2.5 2.5 0 0 1-4.75 0 2.6 2.6 0 0 1-4.5 0 2.6 2.6 0 0 1-4.5 0A2.5 2.5 0 0 1 4 9z', 'M10 20v-5h4v5'] },
  // Livreur : vert de l'espace livreur ; une moto avec son coffre de livraison.
  livreur: { libelle: 'Livreur', fond: '#15803D', trait: '#FFFFFF', chemins: [rond(5.5, 16.5, 3), rond(18.5, 16.5, 3), 'M5.5 16.5 9 11h4.5l2 5.5H9', 'M18.5 16.5 15.8 8H13.5', 'M3 6.5h6v4.5H3z'] },
  // Point relais : bleu de l'espace relais ; un colis.
  relais: { libelle: 'Point relais', fond: '#2456D6', trait: '#FFFFFF', chemins: ['M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9z', 'M3.8 7.6 12 12.2l8.2-4.6', 'M12 12.2v9', 'm7.7 5.1 8.4 4.8'] },
  // Entreprise de livraison : sarcelle de l'espace entreprise ; un camion.
  entreprise: { libelle: 'Entreprise de livraison', fond: '#0F5E55', trait: '#FFFFFF', chemins: ['M2.5 6h11v11h-11z', 'M13.5 9.5h4l3.5 4V17h-7.5', rond(7, 17.5, 2), rond(17, 17.5, 2)] },
  // Point de stockage d'une entreprise : même couleur, un entrepôt.
  stockage: { libelle: 'Point de stockage', fond: '#0F5E55', trait: '#FFFFFF', chemins: ['M2.5 9 12 4l9.5 5v11.5h-19z', 'M6.5 20.5V12h11v8.5', 'M6.5 15.5h11'] },
  // Zone : graphite de la console ; un plan replié.
  zone: { libelle: 'Zone de livraison', fond: '#3B4A60', trait: '#FFFFFF', chemins: ['M3 6.5 8.5 4l7 3 5.5-2.5v13L15.5 20l-7-3L3 19.5z', 'M8.5 4v13', 'M15.5 7v13'] },
  // Paquet en cours (console) : violet ; une boîte qui roule.
  paquet: { libelle: 'Paquet en cours', fond: '#5B2BB5', trait: '#FFFFFF', chemins: ['M4 8h12v9H4z', 'M4 8l2-4h8l2 4', 'M10 8v4', 'M18 10.5h3.5', 'M18.5 14h3'] },
  // Alerte : rouge ; un triangle.
  alerte: { libelle: 'Alerte', fond: '#B42318', trait: '#FFFFFF', chemins: ['M12 3.5 21.5 20h-19z', 'M12 10v4.5', 'M12 17.4v.1'] },
}

export const ETATS_LIVREUR: Record<EtatLivreur, string> = { mission: 'Livreur en mission', disponible: 'Livreur disponible', hors_ligne: 'Livreur hors ligne' }
/** Statut d'un lieu, posé en petite pastille sur son marqueur (relais saturé, paquet en retard, en configuration…). */
export type StatutMarqueur = 'alerte' | 'attention' | 'inactif'
export const STATUTS: Record<StatutMarqueur, string> = { alerte: '#D92D20', attention: '#E89B0C', inactif: '#94A3B8' }

/** Gris d'un livreur hors ligne (dernière position connue). */
export const GRIS_HORS_LIGNE = '#8A96A8'

/** Cap d'un trajet en degrés (0 = nord, sens horaire), du point a vers le point b ; null si les deux se confondent. */
export function capVers(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number | null {
  const r = Math.PI / 180
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r)
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r)
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return null
  return ((Math.atan2(y, x) / r) + 360) % 360
}

export interface ApparenceMarqueur {
  etat?: EtatLivreur
  cap?: number | null // degrés, 0 = nord, sens horaire (livreur en mouvement)
  choisi?: boolean
}

/** Couleurs d'un marqueur selon l'acteur et l'état du livreur. */
export function couleurs(a: Acteur, o: ApparenceMarqueur = {}): { fond: string; trait: string; bord: string } {
  const d = ACTEURS[a]
  if (a === 'livreur' && o.etat === 'hors_ligne') return { fond: GRIS_HORS_LIGNE, trait: '#FFFFFF', bord: '#FFFFFF' }
  if (a === 'livreur' && o.etat === 'disponible') return { fond: '#FFFFFF', trait: d.fond, bord: d.fond }
  return { fond: d.fond, trait: d.trait, bord: '#FFFFFF' }
}

/** Le marqueur en texte SVG, centré sur (0, 0), pour un diamètre `t` en pixels : ombre légère, pastille cerclée de
 * blanc, icône, flèche de cap (livreur), anneau de sélection. Sert au marqueur Google Maps ; Marqueurs.tsx dessine
 * exactement les mêmes formes. */
export function formesMarqueur(a: Acteur, t: number, o: ApparenceMarqueur = {}) {
  const r = t / 2
  const c = couleurs(a, o)
  const icone = t * 0.56
  return {
    r,
    c,
    ombre: { cy: t * 0.06, r: r + 0.6 },
    icone: { k: icone / 24, d: -icone / 2 },
    cap: a === 'livreur' && o.cap != null && o.etat !== 'hors_ligne' ? `M0 ${-(r + t * 0.24)}L${t * 0.17} ${-r + 1}L${-t * 0.17} ${-r + 1}Z` : null,
  }
}

const echapper = (s: string) => s.replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[x]!)

/** SVG autonome d'un marqueur (Google Maps : contenu d'un marqueur avancé, ou icône d'un marqueur classique). */
export function svgMarqueur(a: Acteur, t = 32, o: ApparenceMarqueur = {}, titre?: string): string {
  const f = formesMarqueur(a, t, o)
  const m = Math.ceil(t * 0.3) + 2
  const l = t + 2 * m
  const cap = f.cap ? `<path d="${f.cap}" transform="rotate(${o.cap ?? 0})" fill="${a === 'livreur' && o.etat === 'disponible' ? ACTEURS.livreur.fond : f.c.fond}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>` : ''
  const choix = o.choisi ? `<circle r="${f.r + 3.5}" fill="none" stroke="#0F172A" stroke-width="2.5"/>` : ''
  const pointilles = a === 'livreur' && o.etat === 'hors_ligne' ? ' stroke-dasharray="3 2.4"' : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${l}" viewBox="${-l / 2} ${-l / 2} ${l} ${l}"${titre ? ` aria-label="${echapper(titre)}" role="img"` : ' aria-hidden="true"'}>` +
    `<circle cy="${f.ombre.cy}" r="${f.ombre.r}" fill="rgba(15,23,42,.24)"/>` +
    cap +
    `<circle r="${f.r}" fill="${f.c.bord}"/>` +
    `<circle r="${f.r - 2}" fill="${f.c.fond}"${a === 'livreur' && o.etat === 'disponible' ? ` stroke="${ACTEURS.livreur.fond}" stroke-width="2"` : ''}${pointilles ? ` stroke="#fff" stroke-width="1.4"${pointilles}` : ''}/>` +
    `<g transform="translate(${f.icone.d} ${f.icone.d}) scale(${f.icone.k})" fill="none" stroke="${f.c.trait}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    ACTEURS[a].chemins.map((d) => `<path d="${d}"/>`).join('') +
    `</g>` +
    choix +
    `</svg>`
  )
}

/** Image d'un marqueur (adresse data:), pour l'icône d'un marqueur Google Maps classique. */
export const imageMarqueur = (a: Acteur, t = 32, o: ApparenceMarqueur = {}) => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarqueur(a, t, o))
