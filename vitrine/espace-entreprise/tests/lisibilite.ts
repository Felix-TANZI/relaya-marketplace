// Lisibilité mesurée (REVUE-CONFORMITE §5, DP-64) : contraste AA de chaque texte visible et taille des cibles tactiles,
// calculés dans la page. Pas de dépendance : les couleurs calculées (rgb, color(srgb …), oklch, color-mix) sont
// ramenées en octets par un canevas 1 × 1 ; le fond d'un texte est composé de ses ancêtres (couleurs semi-transparentes
// empilées jusqu'au premier fond opaque) ; un dégradé compte par chacune de ses couleurs (le pire contraste l'emporte) ;
// un fond d'image (photo, carte) n'est pas jugé.
//   Texte normal 4,5:1 ; grand texte (24 px, ou 18,66 px gras) 3:1 (WCAG 1.4.3). Élément désactivé : exempté (1.4.3).
//   Cible : 44 × 44 px au moins (2.5.5) ; un lien dans une phrase est exempté (en ligne dans du texte).
import type { Page } from '@playwright/test'

export interface Ecart {
  genre: 'contraste' | 'cible'
  ou: string
  texte: string
  mesure: string
}

export async function auditer(page: Page): Promise<Ecart[]> {
  return page.evaluate(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const cx = cv.getContext('2d', { willReadFrequently: true })!
    const cache = new Map<string, number[]>()
    /** Couleur CSS → [r, g, b, a] (0-255, a 0-1). */
    const octets = (c: string): number[] => {
      const k = cache.get(c)
      if (k) return k
      cx.clearRect(0, 0, 1, 1)
      cx.fillStyle = '#000'
      cx.fillStyle = c
      cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      const v = [d[0], d[1], d[2], d[3] / 255]
      cache.set(c, v)
      return v
    }
    const sur = (h: number[], b: number[]) => {
      const a = h[3]
      return [h[0] * a + b[0] * (1 - a), h[1] * a + b[1] * (1 - a), h[2] * a + b[2] * (1 - a), 1]
    }
    const lum = (c: number[]) => {
      const f = (x: number) => {
        const s = x / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const ratio = (a: number[], b: number[]) => {
      const x = lum(a)
      const y = lum(b)
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    const COULEUR = /(?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-f]{3,8}\b/gi
    const nom = (el: Element) => {
      const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
      return el.tagName.toLowerCase() + c
    }
    const chemin = (el: Element) => {
      const p: string[] = []
      for (let e: Element | null = el; e && p.length < 3 && e !== document.body; e = e.parentElement) p.unshift(nom(e))
      return p.join(' > ')
    }
    /** Fonds possibles derrière un élément (plusieurs si dégradé), ou null (image : non jugé). */
    const fonds = (el: Element): number[][] | null => {
      const couches: string[][] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e)
        const bg = octets(s.backgroundColor)
        const img = s.backgroundImage
        const avant: string[][] = []
        if (img && img !== 'none') {
          if (/url\(/.test(img)) return null
          // Couches du fond, la première peinte au-dessus (virgules de premier niveau).
          let prof = 0
          let debut = 0
          const parts: string[] = []
          for (let i = 0; i < img.length; i++) {
            if (img[i] === '(') prof++
            else if (img[i] === ')') prof--
            else if (img[i] === ',' && prof === 0) {
              parts.push(img.slice(debut, i))
              debut = i + 1
            }
          }
          parts.push(img.slice(debut))
          for (const p of parts) {
            const cs = p.match(COULEUR) ?? []
            if (/transparent/.test(p)) cs.push('rgba(0,0,0,0)')
            if (cs.length) avant.push(cs)
          }
        }
        // Les dégradés sont peints au-dessus de la couleur de fond du même élément.
        const opaque = avant.findIndex((cs) => cs.every((c) => octets(c)[3] >= 0.99))
        couches.push(...(opaque >= 0 ? avant.slice(0, opaque + 1) : avant))
        if (opaque >= 0) break
        if (bg[3] > 0) couches.push([s.backgroundColor])
        if (bg[3] >= 0.99) break
      }
      let res: number[][] = [octets(getComputedStyle(document.documentElement).backgroundColor)]
      if (res[0][3] < 0.99) res = [sur(res[0], [255, 255, 255, 1])]
      for (const c of couches.reverse()) {
        const n: number[][] = []
        for (const b of res) for (const x of c) n.push(sur(octets(x), b))
        res = n.slice(0, 24)
      }
      return res
    }
    const opacite = (el: Element) => {
      let o = 1
      for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity)
      return o
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none') return false
      if (opacite(el) < 0.05) return false
      if (s.clip && s.clip !== 'auto' && /rect\(0/.test(s.clip)) return false
      if (s.clipPath && /inset\(50%\)/.test(s.clipPath)) return false
      return true
    }
    const desactive = (el: Element) => !!el.closest(':disabled, [aria-disabled="true"], [inert]')
    const ecarts: Ecart[] = []
    const vus = new Set<string>()
    const noter = (e: Ecart) => {
      const k = e.genre + e.ou + e.texte
      if (!vus.has(k)) {
        vus.add(k)
        ecarts.push(e)
      }
    }

    // ── Contraste ──
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (el.closest('svg, script, style, noscript, .leaflet-container, [data-lisibilite="image"]')) continue
      const texte = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim()
      if (!texte || !/[\p{L}\p{N}]/u.test(texte)) continue
      if (!visible(el) || desactive(el)) continue
      const s = getComputedStyle(el)
      const fs = parseFloat(s.fontSize)
      const gras = Number(s.fontWeight) >= 700
      const grand = fs >= 24 || (fs >= 18.66 && gras)
      const min = grand ? 3 : 4.5
      const f = fonds(el)
      if (!f) continue
      const c = octets(s.color)
      const a = c[3] * opacite(el)
      let pire = Infinity
      for (const b of f) pire = Math.min(pire, ratio(sur([c[0], c[1], c[2], a], b), b))
      if (pire + 0.005 < min) noter({ genre: 'contraste', ou: chemin(el), texte: texte.slice(0, 40), mesure: `${pire.toFixed(2)} < ${min} (${s.color})` })
    }

    // ── Cibles ──
    const CIBLES =
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=switch], [role=checkbox], [role=radio], [role=menuitem], [tabindex]:not([tabindex="-1"])'
    for (const el of Array.from(document.body.querySelectorAll(CIBLES))) {
      if (el.closest('.leaflet-control-attribution, [data-lisibilite="image"]')) continue
      if (desactive(el)) continue
      let cible: Element = el
            // Champ dans son libellé (case, recherche) : le libellé entier active le champ, c'est lui qu'on touche.
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) && el.closest('label')) cible = el.closest('label')!
      if (!visible(cible)) continue
      const s = getComputedStyle(el)
      // Lien ou bouton-lien dans une phrase : exempté (2.5.5, cible en ligne).
      if (/^inline(-block)?$/.test(s.display)) {
        const p = el.parentElement
        const autour = p ? Array.from(p.childNodes).some((n) => n !== el && (n.textContent ?? '').trim().length > 0) : false
        if (autour) continue
      }
      const r = cible.getBoundingClientRect()
      if (r.width + 0.5 < 44 || r.height + 0.5 < 44) {
        // Une petite cible dans une grande (lien qui couvre une carte) : c'est la grande qu'on touche.
        const parent = cible.parentElement?.closest(CIBLES)
        if (parent && visible(parent)) {
          const q = parent.getBoundingClientRect()
          if (q.width >= 44 && q.height >= 44) continue
        }
        noter({ genre: 'cible', ou: chemin(cible), texte: (cible.textContent || cible.getAttribute('aria-label') || '').trim().slice(0, 40), mesure: `${Math.round(r.width)} × ${Math.round(r.height)}` })
      }
    }
    return ecarts
  })
}
