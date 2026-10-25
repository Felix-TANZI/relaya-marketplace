// L'appareil photo du relais (route « camera », PR-04 CAM-01 à CAM-06), vu des écrans qui l'ouvrent : Réception ici,
// Retrait, Constats, Départs ailleurs. Contrat d'adresse (le même pour tous) :
//   camera?mode=qr&pour=<depot|etiquette|retrait|retour>&retour=<adresse de retour>
//       → au scan (ou à la saisie à la main), retour vers <adresse>&scan=<contenu lu>
//   camera?mode=photo&pour=<lot|reserve|refus|en_trop|remise|deballage|constat|retour|sortie>&n=<photos>&retour=<adresse>
//       → les n photos prises, retour vers <adresse>&photos=<id1,id2>
//   camera (sans « pour ») : le scanner reconnaît le type de QR et ouvre le bon écran (CAM-01).
// Les photos (preuves, CAM-04 : prises dans l'application, jamais dans la galerie ; heure et position incrustées) sont
// gardées SUR L'APPAREIL jusqu'à leur envoi (file hors connexion : une photo n'est jamais perdue) ; l'action qui les
// cite part avec leur identifiant. Une photo de preuve ne se modifie jamais (CAM-06).
import { chemin } from '../../config/pages'

export type PourScan = 'depot' | 'etiquette' | 'retrait' | 'retour'
export type PourPhoto = 'lot' | 'reserve' | 'refus' | 'en_trop' | 'remise' | 'deballage' | 'constat' | 'retour' | 'sortie'

/** Adresse de l'appareil photo, avec l'adresse où revenir (chemin de l'application, paramètres compris). */
export function versCamera(p: { mode: 'qr'; pour?: PourScan; retour: string } | { mode: 'photo'; pour: PourPhoto; n: number; retour: string }): string {
  return chemin('camera', { mode: p.mode === 'photo' ? 'photo' : undefined, pour: p.pour, n: p.mode === 'photo' ? p.n : undefined, retour: p.retour })
}

/** Ajoute un paramètre à une adresse de retour. */
export function avecParametre(adresse: string, cle: string, valeur: string): string {
  const [route, q] = adresse.split('?')
  const s = new URLSearchParams(q ?? '')
  s.set(cle, valeur)
  return route + '?' + s.toString()
}

// ── Photos gardées sur l'appareil ───────────────────────────────────────────────────────────────────────────────
const PREFIXE = 'blv_r_photo_'
const MEMOIRE = new Map<string, string>()

/** Garde une photo (image JPEG compressée) et rend son identifiant. */
export function garderPhoto(image: string, cle: string): string {
  const id = 'ph-' + cle
  MEMOIRE.set(id, image)
  try {
    localStorage.setItem(PREFIXE + id, image)
  } catch {
    /* appareil plein : la photo vaut pour la visite, l'envoi part tout de suite */
  }
  return id
}

/** L'image d'une photo gardée (aperçu), ou null. */
export function imageDe(id: string | null | undefined): string | null {
  if (!id) return null
  const m = MEMOIRE.get(id)
  if (m) return m
  try {
    return localStorage.getItem(PREFIXE + id)
  } catch {
    return null
  }
}

/** Photos rendues par l'appareil photo (« photos=a,b »), dans l'ordre. */
export const photosRendues = (v: string | null): string[] => (v ? v.split(',').filter(Boolean) : [])
