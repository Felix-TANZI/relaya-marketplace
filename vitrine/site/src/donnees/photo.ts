// Photos prises ou choisies par la cliente (profil, avis, litige…) : contrôlées et allégées sur l'appareil.
// Photo : JPG, PNG, WebP ou HEIC, 10 Mo au plus ; recadrée au carré et réduite à 320 px sur l'appareil
// (le serveur la recevra déjà légère).
export const TYPES_PHOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export function reduirePhoto(fichier: File): Promise<string> {
  return new Promise((ok, ko) => {
    if (!TYPES_PHOTO.includes(fichier.type)) return ko(new Error('type'))
    if (fichier.size > 10 * 1024 * 1024) return ko(new Error('taille'))
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => {
      const cote = Math.min(img.naturalWidth, img.naturalHeight)
      const toile = document.createElement('canvas')
      toile.width = toile.height = 320
      toile.getContext('2d')!.drawImage(img, (img.naturalWidth - cote) / 2, (img.naturalHeight - cote) / 2, cote, cote, 0, 0, 320, 320)
      URL.revokeObjectURL(url)
      ok(toile.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => (URL.revokeObjectURL(url), ko(new Error('lecture')))
    img.src = url
  })
}


// Photo de profil (demande du porteur, 4 oct. 2026 : « qu'on puisse rogner la photo de profil ») : la cliente
// choisit ou prend une photo, la place dans le cercle (glisser, pincer, curseur, quart de tour), puis
// l'appareil la rend en carré de 512 px, JPEG 0,85. Trop lourde après compression (photo très détaillée) :
// qualité abaissée deux fois, puis refus net (« lourde ») ; jamais de quota de stockage dépassé en silence.
export const PHOTO_PROFIL = { cote: 512, qualite: 0.85, maxOctets: 300 * 1024, maxFichier: 10 * 1024 * 1024 }

// Lit le fichier choisi : type et poids contrôlés, image décodée (HEIC illisible ici : « lecture »).
export function ouvrirPhoto(fichier: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((ok, ko) => {
    if (!TYPES_PHOTO.includes(fichier.type)) return ko(new Error('type'))
    if (fichier.size > PHOTO_PROFIL.maxFichier) return ko(new Error('taille'))
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => (img.naturalWidth && img.naturalHeight ? ok({ img, url }) : (URL.revokeObjectURL(url), ko(new Error('lecture'))))
    img.onerror = () => (URL.revokeObjectURL(url), ko(new Error('lecture')))
    img.src = url
  })
}

// Cadrage : décalage du centre de l'image (px du cadre), zoom (1 = l'image couvre juste le cadre), quart de tour.
export interface Cadrage {
  x: number
  y: number
  zoom: number
  rotation: 0 | 90 | 180 | 270
}
export const ZOOM_MIN = 1
export const ZOOM_MAX = 4

// Taille affichée de l'image tournée, pour un cadre de « cote » px : elle couvre toujours tout le cadre.
export function tailleAffichee(img: { w: number; h: number }, c: Pick<Cadrage, 'zoom' | 'rotation'>, cote: number) {
  const tourne = c.rotation % 180 !== 0
  const w = tourne ? img.h : img.w
  const h = tourne ? img.w : img.h
  const echelle = (cote / Math.min(w, h)) * c.zoom
  return { echelle, largeur: w * echelle, hauteur: h * echelle }
}

// Le cadre reste toujours plein : le décalage est borné par ce qui dépasse de l'image.
export function borner(img: { w: number; h: number }, c: Cadrage, cote: number): Cadrage {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom))
  const t = tailleAffichee(img, { zoom, rotation: c.rotation }, cote)
  const mx = Math.max(0, (t.largeur - cote) / 2)
  const my = Math.max(0, (t.hauteur - cote) / 2)
  return { ...c, zoom, x: Math.min(mx, Math.max(-mx, c.x)), y: Math.min(my, Math.max(-my, c.y)) }
}

// Rendu final : ce que montre le cadre, en carré de 512 px (fond blanc sous une image transparente).
export function rognerPhoto(img: HTMLImageElement, c: Cadrage, cote: number): string {
  const n = PHOTO_PROFIL.cote
  const k = n / cote
  const dims = { w: img.naturalWidth, h: img.naturalHeight }
  const { echelle } = tailleAffichee(dims, c, cote)
  const toile = document.createElement('canvas')
  toile.width = toile.height = n
  const ctx = toile.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, n, n)
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(n / 2 + c.x * k, n / 2 + c.y * k)
  ctx.rotate((c.rotation * Math.PI) / 180)
  ctx.scale(echelle * k, echelle * k)
  ctx.drawImage(img, -dims.w / 2, -dims.h / 2)
  for (const q of [PHOTO_PROFIL.qualite, 0.72, 0.6]) {
    const d = toile.toDataURL('image/jpeg', q)
    if (octets(d) <= PHOTO_PROFIL.maxOctets) return d
  }
  throw new Error('lourde')
}

// Poids réel d'une image en data URL (base64 : 3 octets pour 4 caractères).
export const octets = (d: string) => Math.ceil(((d.length - d.indexOf(',') - 1) * 3) / 4)
