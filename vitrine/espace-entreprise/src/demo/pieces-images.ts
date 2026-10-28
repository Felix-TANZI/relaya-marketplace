// DONNÉES DE DÉMONSTRATION — images des pièces des livreurs du jeu d'essai : des SPÉCIMENS dessinés (SVG), jamais une
// vraie pièce. En production, le serveur sert l'image envoyée par le livreur par un lien signé de quelques minutes,
// en filigrane (backend-kit/apps/entreprise_flotte/pieces.py).
import type { FacePiece, FicheLivreur, PieceLivreur } from '../donnees/domaines/livreurs'
import { jourDe } from '../calculs/temps'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const date = (t: number | null) => (t === null ? '—' : jourDe(t).split('-').reverse().join('/'))

// Teinte stable par livreur (portrait du spécimen).
function teinte(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

function portrait(x: number, y: number, w: number, id: string): string {
  const h = teinte(id)
  return `<rect x="${x}" y="${y}" width="${w}" height="${w * 1.25}" rx="6" fill="hsl(${h} 30% 86%)"/><circle cx="${x + w / 2}" cy="${y + w * 0.5}" r="${w * 0.24}" fill="hsl(${h} 25% 42%)"/><path d="M${x + w * 0.14} ${y + w * 1.25} q${w * 0.36} -${w * 0.62} ${w * 0.72} 0z" fill="hsl(${h} 25% 42%)"/>`
}

function cadre(titre: string, couleur: string, corps: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 404" width="640" height="404"><rect width="640" height="404" rx="22" fill="#F4F1E8"/><rect x="0" y="0" width="640" height="64" rx="22" fill="${couleur}"/><rect x="0" y="40" width="640" height="24" fill="${couleur}"/><text x="28" y="42" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#fff">${esc(titre)}</text>${corps}<text x="320" y="250" text-anchor="middle" font-family="system-ui,sans-serif" font-size="64" font-weight="800" fill="#B42318" fill-opacity=".16" transform="rotate(-18 320 250)">SPÉCIMEN</text></svg>`
}

const ligne = (x: number, y: number, k: string, v: string) =>
  `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="13" fill="#6B6B6B">${esc(k)}</text><text x="${x}" y="${y + 22}" font-family="system-ui,sans-serif" font-size="19" font-weight="600" fill="#1F2328">${esc(v)}</text>`

function svg(l: Pick<FicheLivreur, 'id' | 'nom'>, p: PieceLivreur, face: FacePiece): string {
  const [prenom, nom] = l.nom.split(' ')
  const numero = (p.numero ?? '').replace(/\D/g, '').padStart(9, '0')
  if (p.type === 'selfie')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 404 520" width="404" height="520"><rect width="404" height="520" rx="22" fill="hsl(${teinte(l.id)} 22% 92%)"/>${portrait(72, 70, 260, l.id)}<text x="202" y="470" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#555">${esc('Selfie de vérification · ' + l.nom)}</text><text x="202" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="54" font-weight="800" fill="#B42318" fill-opacity=".16" transform="rotate(-18 202 300)">SPÉCIMEN</text></svg>`
  if (p.type === 'permis')
    return cadre(
      'PERMIS DE CONDUIRE · CAMEROUN',
      '#2F5D8A',
      portrait(28, 92, 150, l.id) + ligne(210, 100, 'Nom', (nom ?? '').replace('.', '') + ' ' + prenom) + ligne(210, 160, 'Catégories', l.id === 'l-herve' ? 'B' : 'A · B') + ligne(210, 220, 'N°', 'CM-' + numero) + ligne(210, 280, 'Valable jusqu’au', date(p.expireLe)),
    )
  return cadre(
    face === 'verso' ? 'CARTE NATIONALE D’IDENTITÉ · VERSO' : 'CARTE NATIONALE D’IDENTITÉ',
    '#1E6B4F',
    face === 'verso'
      ? ligne(28, 100, 'Adresse', 'Yaoundé') + ligne(28, 160, 'Délivrée le', '—') + ligne(28, 220, 'Expire le', date(p.expireLe)) + `<rect x="28" y="300" width="584" height="70" fill="#E6E2D6"/><text x="40" y="344" font-family="monospace" font-size="20" fill="#333">IDCMR${numero}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>`
      : portrait(28, 92, 150, l.id) + ligne(210, 100, 'Nom', (nom ?? '').replace('.', '')) + ligne(210, 160, 'Prénom', prenom) + ligne(210, 220, 'N°', numero) + ligne(210, 280, 'Expire le', date(p.expireLe)),
  )
}

/** Image d'une face de la pièce (adresse data: du spécimen). */
export const imagePiece = (l: Pick<FicheLivreur, 'id' | 'nom'>, p: PieceLivreur, face: FacePiece): string => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(l, p, face))
