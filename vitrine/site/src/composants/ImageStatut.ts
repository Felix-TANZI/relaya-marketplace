// Image de statut d'une liste d'envies (DP-54) : 1080 × 1920, le format vertical des statuts WhatsApp, des stories
// Facebook et Instagram et de TikTok. Dessinée sur un <canvas> dans le style BelivaY (logo, sable chaud, orange,
// police Plus Jakarta Sans) : titre de la liste, occasion et date, 3 ou 4 articles avec leur dessin et leur prix du
// jour, un vrai QR code (QrCode.ts) et le lien court de la liste. Mode surprise : rien sur ce qui est déjà offert
// ni par qui (la liste montre seulement ce qui reste à offrir). Les textes arrivent déjà traduits.
import logo from '../assets/prototype/be926f70d2b8.png'
import { svgDuDessin } from './Dessin'
import { qrMatrice } from './QrCode'

export const LARGEUR_STATUT = 1080
export const HAUTEUR_STATUT = 1920

export interface DonneesStatut {
  kicker: string // « Ma liste d'envies »
  titre: string // « La liste de Carine »
  sousTitre: string // « Mon anniversaire · le sam. 12 oct. »
  articles: { titre: string; prix: string; dessin: string }[]
  progression: string | null // « 2 sur 5 déjà offerts » (jamais en mode surprise)
  appel: string // « Scanne ou ouvre le lien pour m'offrir un cadeau »
  lienCourt: string // « belivay.com/l/k7Q2mX »
  lien: string // l'adresse complète, codée dans le QR
  pied: string // « Paiement protégé · Mobile Money ou carte, depuis n'importe où »
}

const POLICE = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
const C = { ink: '#1C1917', ink3: '#5F5853', or: '#F07A2E', orTxt: '#C2530F', sable: '#F6F4F2', sable2: '#F0ECE8', ligne: '#E6E0DB' }

function image(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => ok(null)
    i.src = src
  })
}
const svgImage = (svg: string) => image('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))

function arrondi(g: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + l, y, x + l, y + h, r)
  g.arcTo(x + l, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + l, y, r)
  g.closePath()
}

// Coupe un texte en lignes d'au plus `largeur` pixels ; au-delà de `max` lignes, la dernière finit par « … ».
function lignes(g: CanvasRenderingContext2D, texte: string, largeur: number, max: number): string[] {
  const mots = texte.split(/\s+/).filter(Boolean)
  const res: string[] = []
  let cur = ''
  for (const m of mots) {
    const essai = cur ? cur + ' ' + m : m
    if (g.measureText(essai).width <= largeur || !cur) cur = essai
    else (res.push(cur), (cur = m))
  }
  if (cur) res.push(cur)
  if (res.length <= max) return res
  const garde = res.slice(0, max)
  let der = garde[max - 1]
  while (der.length > 1 && g.measureText(der + '…').width > largeur) der = der.slice(0, -1)
  garde[max - 1] = der.trimEnd() + '…'
  return garde
}

/** Dessine l'image de statut sur le canvas (redimensionné à 1080 × 1920). */
export async function dessinerStatut(canvas: HTMLCanvasElement, d: DonneesStatut): Promise<void> {
  canvas.width = LARGEUR_STATUT
  canvas.height = HAUTEUR_STATUT
  const g = canvas.getContext('2d')
  if (!g) return
  try {
    await Promise.all(['500', '700', '800'].map((w) => document.fonts?.load(`${w} 40px 'Plus Jakarta Sans'`)))
  } catch {
    // Police indisponible : la police du système prend le relais.
  }
  const [logoImg, ...dessins] = await Promise.all([image(logo), ...d.articles.slice(0, 4).map(async (a) => (a.dessin ? svgImage((await svgDuDessin(a.dessin)) ?? '') : null))])
  const W = LARGEUR_STATUT
  const H = HAUTEUR_STATUT
  const M = 72 // marge

  // Fond : sable chaud, deux halos orange.
  const fond = g.createLinearGradient(0, 0, 0, H)
  fond.addColorStop(0, '#FFF3E8')
  fond.addColorStop(0.55, C.sable)
  fond.addColorStop(1, '#FBE3D0')
  g.fillStyle = fond
  g.fillRect(0, 0, W, H)
  for (const [x, y, r, a] of [
    [W - 60, 120, 380, 0.22],
    [40, H - 260, 340, 0.14],
  ] as const) {
    const h = g.createRadialGradient(x, y, 0, x, y, r)
    h.addColorStop(0, `rgba(240,122,46,${a})`)
    h.addColorStop(1, 'rgba(240,122,46,0)')
    g.fillStyle = h
    g.fillRect(0, 0, W, H)
  }

  // Logo BelivaY.
  if (logoImg) g.drawImage(logoImg, M, 80, 360, 95)
  else {
    g.fillStyle = C.ink
    g.font = `800 72px ${POLICE}`
    g.textBaseline = 'top'
    g.fillText('BelivaY', M, 84)
  }

  // Kicker, titre, occasion et date.
  g.textBaseline = 'alphabetic'
  g.fillStyle = C.orTxt
  g.font = `800 40px ${POLICE}`
  g.fillText(d.kicker.toUpperCase(), M, 262)
  g.fillStyle = C.ink
  g.font = `800 84px ${POLICE}`
  let y = 352
  for (const l of lignes(g, d.titre, W - 2 * M, 2)) (g.fillText(l, M, y), (y += 96))
  g.fillStyle = C.ink3
  g.font = `600 44px ${POLICE}`
  for (const l of lignes(g, d.sousTitre, W - 2 * M, 2)) (g.fillText(l, M, y - 18), (y += 58))

  // Articles : grille de 2 colonnes (3 articles : le troisième centré).
  const arts = d.articles.slice(0, 4)
  const gap = 32
  const lc = (W - 2 * M - gap) / 2
  const yp = H - 400 // haut du pied (QR code)
  const y0 = y + 6
  const rangs = Math.max(1, Math.ceil(arts.length / 2))
  const place = yp - 40 - (d.progression ? 96 : 0) - y0
  const hc = Math.min(560, Math.floor((place - (rangs - 1) * gap) / rangs))
  // Peu d'articles : le bloc est centré dans la place qui reste.
  const y0c = y0 + Math.max(0, Math.floor((place - (rangs * hc + (rangs - 1) * gap)) / 2))
  arts.forEach((a, i) => {
    const ligne = Math.floor(i / 2)
    const seulDernier = arts.length === 3 && i === 2
    const x = seulDernier ? (W - lc) / 2 : M + (i % 2) * (lc + gap)
    const yc = y0c + ligne * (hc + gap)
    g.save()
    g.shadowColor = 'rgba(28,25,23,0.12)'
    g.shadowBlur = 36
    g.shadowOffsetY = 12
    g.fillStyle = '#FFFFFF'
    arrondi(g, x, yc, lc, hc, 40)
    g.fill()
    g.restore()
    const ti = hc - 170
    g.save()
    arrondi(g, x + 20, yc + 20, lc - 40, ti, 28)
    g.clip()
    g.fillStyle = C.sable2
    g.fillRect(x + 20, yc + 20, lc - 40, ti)
    const im = dessins[i]
    if (!im) {
      g.fillStyle = C.or
      g.font = `800 120px ${POLICE}`
      g.textAlign = 'center'
      g.fillText(a.titre.charAt(0).toUpperCase(), x + lc / 2, yc + 20 + ti / 2 + 42)
      g.textAlign = 'left'
    } else {
      const cote = Math.min(lc - 40, ti)
      g.drawImage(im, x + 20 + (lc - 40 - cote) / 2, yc + 20 + (ti - cote) / 2, cote, cote)
    }
    g.restore()
    g.fillStyle = C.ink
    g.font = `700 32px ${POLICE}`
    let yt = yc + ti + 62
    for (const l of lignes(g, a.titre, lc - 48, 2)) (g.fillText(l, x + 24, yt), (yt += 40))
    g.fillStyle = C.orTxt
    g.font = `800 40px ${POLICE}`
    g.fillText(a.prix, x + 24, yc + hc - 28)
  })
  const yFin = y0c + Math.ceil(arts.length / 2) * (hc + gap)

  // Progression (sans dire qui a offert ; absente en mode surprise).
  if (d.progression) {
    g.font = `700 36px ${POLICE}`
    const l = g.measureText(d.progression).width + 64
    g.fillStyle = 'rgba(240,122,46,0.14)'
    arrondi(g, (W - l) / 2, yFin, l, 64, 32)
    g.fill()
    g.fillStyle = C.orTxt
    g.textAlign = 'center'
    g.fillText(d.progression, W / 2, yFin + 45)
    g.textAlign = 'left'
  }

  // Pied : QR code et lien court.
  g.save()
  g.shadowColor = 'rgba(28,25,23,0.14)'
  g.shadowBlur = 40
  g.shadowOffsetY = 14
  g.fillStyle = '#FFFFFF'
  arrondi(g, M, yp, W - 2 * M, 290, 44)
  g.fill()
  g.restore()
  const q = qrMatrice(d.lien)
  const cote = 242
  const mod = cote / (q.length + 2)
  g.fillStyle = '#FFFFFF'
  g.fillRect(M + 24, yp + 24, cote, cote)
  g.fillStyle = '#111111'
  q.forEach((r, yy) => r.forEach((v, xx) => v && g.fillRect(M + 24 + (xx + 1) * mod, yp + 24 + (yy + 1) * mod, Math.ceil(mod), Math.ceil(mod))))
  const xt = M + 24 + cote + 36
  const lt = W - M - 32 - xt
  g.fillStyle = C.ink
  g.font = `700 34px ${POLICE}`
  let ya = yp + 74
  for (const l of lignes(g, d.appel, lt, 3)) (g.fillText(l, xt, ya), (ya += 42))
  g.fillStyle = C.orTxt
  g.font = `800 40px ${POLICE}`
  for (const l of lignes(g, d.lienCourt, lt, 2)) (g.fillText(l, xt, ya + 14), (ya += 48))
  g.fillStyle = C.ink3
  g.font = `500 30px ${POLICE}`
  g.textAlign = 'center'
  const pied = lignes(g, d.pied, W - 2 * M, 2)
  pied.forEach((l, i) => g.fillText(l, W / 2, H - 44 - (pied.length - 1 - i) * 38))
  g.textAlign = 'left'
}

/** Le canvas en fichier PNG (pour le partage du téléphone ou l'enregistrement). */
export function enFichier(canvas: HTMLCanvasElement, nom: string): Promise<File | null> {
  return new Promise((ok) => canvas.toBlob((b) => ok(b ? new File([b], nom, { type: 'image/png' }) : null), 'image/png'))
}
