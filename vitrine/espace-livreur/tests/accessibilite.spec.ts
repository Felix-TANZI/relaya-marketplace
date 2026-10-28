// Accessibilité de l'espace livreur (REVUE-CONFORMITE.md, point 5 ; DP-64) : WCAG 2.2 AA et règles du livreur, sur
// TOUTES les routes, en clair et en sombre, à 360 px (le plus petit téléphone : l'en-tête racine y est le plus serré).
// Le livreur est sur la route, d'une main, en plein soleil : les cibles sont plus grandes que le minimum WCAG.
// Aucun outil extérieur (axe-core n'est pas installé) : les contrôles sont écrits ici et exécutés dans la page
// (même moteur que l'espace vendeur). Règles :
// (a) texte : taille calculée ≥ 12 px pour tout nœud de texte visible ;
// (b) contraste texte / fond ≥ 4,5 : 1 (3 : 1 pour le grand texte : ≥ 24 px, ou ≥ 18,66 px gras). Le fond se calcule en
//     remontant les ancêtres (couleurs rgba composées, opacités comprises) ; un dégradé se juge à sa couleur la moins
//     contrastée ; un texte posé sur une image (photo, carte, fond en url()) n'est pas calculable : compté à part ;
// (c) nom accessible de tout élément interactif ; images : alt ; SVG : masqué ou nommé ;
// (d) cible de toucher ≥ 44 × 44 px pour TOUT interactif visible (en-tête racine sous 480 px compris), hors lien dans
//     le texte courant (zone agrandie par ::before / ::after comprise) ;
// (e) focus visible sur les 25 premiers arrêts de Tab, aucun tabindex positif, ordre du document ;
// (f) ARIA : ids uniques, références valides, rôles et valeurs permis, aucun interactif dans un autre, html[lang], un
//     seul <main>.
// Les états que seul un geste ouvre (menu du profil, arrivée, contrôle, appareil photo, audit, emballage, code, dépôt
// au relais, collecte, retour, remise à domicile, échec) sont contrôlés en rejouant la tournée du jeu d'essai.
// Puis, à la taille de texte maximale (140 %) : aucune page ne déborde à 360 px.
// A11Y_LARGEUR=390 (ou 768, 1280) contrôle une autre largeur.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, figerHorloge, ouvrir, type Rendu } from './commun'
import { arriver, recuperer, auditer, controler, emballer, photo, re, taperCode } from './LIV-06.parcours'

const RENDUS: Rendu[] = [
  { nom: 'clair', theme: 'light', lang: 'fr' },
  { nom: 'sombre', theme: 'dark', lang: 'fr' },
]
const ARRETS_TAB = 25
const LARGEUR = Number(process.env.A11Y_LARGEUR || 360)

const animationsFinies = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5000 }).catch(() => undefined)

interface Releve {
  defauts: string[]
  surImage: number
  separateurs: number
  graphiques: number
  textes: number
}

// ---------- Contrôles statiques (a), (b), (c), (d), (f) : exécutés dans la page ----------
async function controlesStatiques(page: Page, lang: string): Promise<Releve> {
  return page.evaluate(async (langue) => {
    const defauts: string[] = []
    const D = (regle: string, el: Element | null, valeur: string) => defauts.push(`${regle} · ${sel(el)} · ${valeur}`)

    // Sélecteur court et lisible : jusqu'à 4 niveaux, id ou classes, rang parmi les frères de même balise.
    function sel(el: Element | null): string {
      if (!el) return '(document)'
      const parts: string[] = []
      let e: Element | null = el
      for (let i = 0; e && e !== document.body && i < 4; i++, e = e.parentElement) {
        let s = e.tagName.toLowerCase()
        if (e.id) {
          parts.unshift(s + '#' + e.id)
          break
        }
        const cl = [...e.classList].filter((c) => !/^(on|run|glass)$/.test(c)).slice(0, 2)
        if (cl.length) s += '.' + cl.join('.')
        const p = e.parentElement
        if (p) {
          const memes = [...p.children].filter((c) => c.tagName === e!.tagName)
          if (memes.length > 1) s += `:nth-of-type(${memes.indexOf(e) + 1})`
        }
        parts.unshift(s)
      }
      const txt = (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)
      return parts.join(' > ') + (txt ? ` « ${txt} »` : '')
    }

    // ----- Couleurs -----
    type RGBA = [number, number, number, number]
    const cv = document.createElement('canvas').getContext('2d')!
    function couleur(c: string): RGBA | null {
      const m = /rgba?\(([^)]+)\)/.exec(c)
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
      }
      if (!c || c === 'transparent') return [0, 0, 0, 0]
      // color(srgb …), oklch(), color-mix() : le canevas les ramène à rgba.
      cv.clearRect(0, 0, 1, 1)
      cv.fillStyle = '#000'
      cv.fillStyle = c
      cv.fillRect(0, 0, 1, 1)
      const d = cv.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const sur = (h: RGBA, b: RGBA): RGBA => {
      const a = h[3] + b[3] * (1 - h[3])
      if (a === 0) return [0, 0, 0, 0]
      return [0, 1, 2].map((i) => (h[i] * h[3] + b[i] * b[3] * (1 - h[3])) / a).concat(a) as RGBA
    }
    const lum = (c: RGBA) => {
      const f = (v: number) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const ratio = (a: RGBA, b: RGBA) => {
      const [x, y] = [lum(a), lum(b)]
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    const hex = (c: RGBA) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
    const stops = (img: string) => [...img.matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,8}\b/gi)].map((m) => couleur(m[0])!).filter(Boolean)

    const racine = (() => {
      const h = couleur(getComputedStyle(document.documentElement).backgroundColor)!
      const b = couleur(getComputedStyle(document.body).backgroundColor)!
      return sur(b, sur(h, [255, 255, 255, 1]))
    })()

    // Découpe « a(…), b(…) » aux virgules de premier niveau.
    const decouper = (v: string) => {
      const out: string[] = []
      let p = 0
      let d = 0
      for (let i = 0; i < v.length; i++) {
        if (v[i] === '(') p++
        else if (v[i] === ')') p--
        else if (v[i] === ',' && p === 0) {
          out.push(v.slice(d, i).trim())
          d = i + 1
        }
      }
      out.push(v.slice(d).trim())
      return out
    }
    /**
     * Couleurs candidates d'une couche de dégradé sous un texte (rectangle `t`) : un dégradé radial dont la géométrie
     * se lit (« radial-gradient(L% H% at X% Y%, … ) », halos du thème) donne sa couleur au point du texte le plus
     * proche de son centre (pire cas) ; tout autre dégradé (linéaire : boutons braise, cartes de tête) donne toutes ses
     * couleurs, le contraste retenu étant le plus faible (pour un texte blanc : la couleur la plus claire).
     */
    function couche(c: string, boite: DOMRect, t: DOMRect): RGBA[] {
      const m = /^radial-gradient\((?:ellipse\s+)?([\d.]+)%\s+([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%\s*,(.*)\)$/s.exec(c)
      if (m) {
        const [rx, ry] = [(+m[1] / 100) * boite.width, (+m[2] / 100) * boite.height]
        const [cx, cy] = [boite.left + (+m[3] / 100) * boite.width, boite.top + (+m[4] / 100) * boite.height]
        const [px, py] = [Math.min(Math.max(cx, t.left), t.right), Math.min(Math.max(cy, t.top), t.bottom)]
        const pos = Math.hypot((px - cx) / rx, (py - cy) / ry) * 100
        const arrets = decouper(m[5]).map((a) => {
          const k = /^(.*?)(?:\s+([\d.]+)%)?$/.exec(a)!
          return { c: couleur(k[1])!, p: k[2] === undefined ? NaN : +k[2] }
        })
        arrets.forEach((a, i) => isNaN(a.p) && (a.p = i === 0 ? 0 : i === arrets.length - 1 ? 100 : arrets[i - 1].p))
        if (pos <= arrets[0].p) return [arrets[0].c]
        for (let i = 1; i < arrets.length; i++)
          if (pos <= arrets[i].p) {
            const [a, b] = [arrets[i - 1], arrets[i]]
            const f = b.p === a.p ? 1 : (pos - a.p) / (b.p - a.p)
            return [[0, 1, 2, 3].map((k) => a.c[k] + (b.c[k] - a.c[k]) * f) as RGBA]
          }
        return [arrets[arrets.length - 1].c]
      }
      return stops(c)
    }

    /** Fonds possibles derrière un texte (plusieurs pour un dégradé), ou 'image' si une image est dessous. */
    function fonds(pile: Element[], t: DOMRect): RGBA[] | 'image' {
      // Chaîne des éléments peints sous le texte (pile du point touché : ancêtres ET voisins posés dessous), du texte
      // jusqu'au premier fond opaque.
      const chaine: { s: CSSStyleDeclaration; e: Element }[] = []
      // Verre (backdrop-filter : en-tête, barre du bas) : le contenu qui défile dessous change à chaque instant ; le
      // verre se juge sur le fond de l'application (ses seuls ancêtres), comme son repli sans flou (prototype.css).
      let verre: Element | null = null
      for (const e of pile) {
        if (verre && !e.contains(verre)) continue
        const s = getComputedStyle(e)
        if (s.backdropFilter && s.backdropFilter !== 'none') verre = e
        const bi = s.backgroundImage
        if (/url\(/.test(bi)) return 'image'
        chaine.push({ s, e })
        const opaque = couleur(s.backgroundColor)![3] > 0.99 || (bi !== 'none' && decouper(bi).some((c) => !/^radial/.test(c) && stops(c).every((k) => k[3] > 0.99)))
        if (opaque) break
      }
      // Composition de bas en haut (couleur de fond, puis couches de dégradé de la dernière à la première).
      let res: RGBA[] = [racine]
      for (let i = chaine.length - 1; i >= 0; i--) {
        const { s, e } = chaine[i]
        const couches: RGBA[][] = [[couleur(s.backgroundColor)!]]
        if (s.backgroundImage !== 'none') {
          const boite = e.getBoundingClientRect()
          for (const c of decouper(s.backgroundImage).reverse()) couches.push(couche(c, boite, t))
        }
        for (const cs of couches) {
          if (cs.every((k) => k[3] < 0.005)) continue
          const n: RGBA[] = []
          for (const c of cs) for (const r of res) n.push(sur(c, r))
          res = n.slice(0, 32)
        }
      }
      return res
    }

    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return false
      const s = getComputedStyle(el)
      if (s.visibility !== 'visible' || s.display === 'none') return false
      for (let e: Element | null = el; e; e = e.parentElement) {
        const t = getComputedStyle(e)
        if (Number(t.opacity) < 0.05 || t.display === 'none') return false
        if (t.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(t.clipPath)) return false
      }
      return true
    }

    const app = document.querySelector('#app') ?? document.body
    const main = document.querySelector('main') as HTMLElement | null

    // ----- (a) et (b) : chaque nœud de texte visible, la page déroulée par pas (le texte doit être sur le dessus) -----
    let surImage = 0
    let separateurs = 0
    let graphiques = 0
    let textes = 0
    const vus = new Set<Element>()
    const noeuds: Text[] = []
    const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue!.trim() && n.parentElement && !n.parentElement.closest('style,script,noscript,template,option')) noeuds.push(n as Text)
    // Ce qui défile : le <main> s'il défile lui-même, sinon le document (cas de l'espace livreur : la page entière).
    const defile = (main && main.scrollHeight > main.clientHeight + 4 ? main : document.scrollingElement) as HTMLElement
    const vue = defile === main ? main.clientHeight : innerHeight
    const hauteur = defile.scrollHeight
    // Pas plus court que l'écran moins l'en-tête collant et la barre du bas : chaque texte passe une fois au milieu.
    const pas = Math.max(200, vue - 300)
    const positions = hauteur > vue + 4 ? Array.from({ length: Math.ceil((hauteur - vue) / pas) + 1 }, (_, i) => Math.min(i * pas, hauteur - vue)) : [0]
    for (const y of positions) {
      defile.scrollTop = y
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      for (const n of noeuds) {
        const el = n.parentElement!
        if (vus.has(el)) continue
        const rg = document.createRange()
        rg.selectNodeContents(n)
        const rects = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
        if (!rects.length) continue
        if (!visible(el)) continue
        // Sur le dessus : le centre du premier morceau de texte touche l'élément du texte (ou un de ses descendants).
        const r0 = rects[0]
        const cx = Math.min(Math.max(r0.left + r0.width / 2, 1), innerWidth - 1)
        const cy = r0.top + r0.height / 2
        if (cy < 0 || cy > innerHeight || r0.left + r0.width / 2 < 0 || r0.left + r0.width / 2 > innerWidth) continue
        const pile = document.elementsFromPoint(cx, cy)
        const dessus = pile[0]
        if (!dessus || !(dessus === el || el.contains(dessus) || dessus.contains(el))) continue
        vus.add(el)
        textes++
        const s = getComputedStyle(el)
        // (a) taille : le texte SVG se mesure à sa taille rendue (échelle du dessin comprise).
        let taille = parseFloat(s.fontSize)
        const svgT = el.closest('svg')
        // Texte d'un dessin masqué ou nommé (code-barres du viseur, plan simplifié) : partie d'une image (WCAG 1.4.3,
        // « texte faisant partie d'une image ») ; compté à part.
        if (svgT && (svgT.closest('[aria-hidden="true"]') || svgT.closest('[role=img][aria-label]'))) {
          graphiques++
          continue
        }
        if (svgT && el instanceof SVGGraphicsElement) {
          const m = el.getScreenCTM()
          if (m) taille *= Math.hypot(m.a, m.b)
        }
        if (taille < 11.95) D('(a) texte < 12 px', el, `${Math.round(taille * 100) / 100} px`)
        // (b) contraste ; un contrôle inactif (désactivé) en est exempté (WCAG 1.4.3).
        if (el.closest('[disabled],[aria-disabled="true"]')) continue
        // Pile sous le texte : l'élément du texte, puis ce qui est peint dessous (un descendant qui couvre le point est
        // sauté : il est au-dessus du fond de l'élément).
        const i0 = pile.indexOf(el)
        const dessous = i0 >= 0 ? pile.slice(i0) : [el, ...pile.filter((x) => x.contains(el) && x !== el)]
        const derriere = dessous.slice(1)
        // Une image sous le texte : <img>, <canvas>, <video>, fond en url(), ou un dessin SVG (illustration, photo
        // dessinée) plus grand que le texte et qui n'est pas son ancêtre.
        const tr = rg.getBoundingClientRect()
        const imageDessous = derriere.some((d) => {
          if (d.contains(el)) return /url\(/.test(getComputedStyle(d).backgroundImage)
          if (/^(IMG|CANVAS|VIDEO|PICTURE)$/.test(d.tagName) || /url\(/.test(getComputedStyle(d).backgroundImage)) return true
          const b = d.getBoundingClientRect()
          return d.tagName.toLowerCase() === 'svg' && b.width >= tr.width && b.height >= tr.height && b.width > 40
        })
        // Séparateur seul (« · », « | », « — ») : ponctuation décorative, sans information (WCAG 1.4.3) : comptée à part.
        if (/^[\s·•|/–—]+$/.test(n.nodeValue!)) {
          separateurs++
          continue
        }
        // Symboles seuls (★) dans un graphique nommé (role="img" + aria-label) : image de symboles dont le sens est dans
        // le nom (WCAG 1.4.11 et 1.1.1), pas du texte : comptés à part.
        if (/^[\s★☆✓✕]+$/.test(n.nodeValue!) && el.closest('[role=img][aria-label]')) {
          graphiques++
          continue
        }
        const fs = fonds(dessous, tr)
        if (imageDessous || fs === 'image') {
          surImage++
          continue
        }
        let c = couleur(svgT ? (s.fill.startsWith('rgb') ? s.fill : s.color) : s.color)!
        let op = 1
        for (let e: Element | null = el; e && e !== app.parentElement; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
        c = [c[0], c[1], c[2], c[3] * op]
        const grand = taille >= 24 || (taille >= 18.66 && Number(s.fontWeight) >= 700)
        const seuil = grand ? 3 : 4.5
        let pire = Infinity
        let fondPire: RGBA = racine
        for (const f of fs) {
          const v = ratio(sur(c, f), f)
          if (v < pire) [pire, fondPire] = [v, f]
        }
        if (pire < seuil - 0.005) D('(b) contraste', el, `${pire.toFixed(2)} : 1 < ${seuil} (texte ${hex(sur(c, fondPire))} sur ${hex(fondPire)}, ${Math.round(taille * 10) / 10} px)`)
      }
    }
    defile.scrollTop = 0

    // ----- (c) noms accessibles -----
    const INTERACTIFS = 'a[href],button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],[role=menuitem],input:not([type=hidden]),select,textarea'
    const texteNom = (e: Element): string => {
      let t = ''
      for (const n of e.childNodes) {
        if (n.nodeType === 3) t += n.nodeValue
        else if (n instanceof Element) {
          if (n.getAttribute('aria-hidden') === 'true' || getComputedStyle(n).display === 'none') continue
          if (n.tagName === 'IMG') t += n.getAttribute('alt') ?? ''
          else if (n.getAttribute('aria-label')) t += ' ' + n.getAttribute('aria-label') + ' '
          else t += ' ' + texteNom(n) + ' '
        }
      }
      return t.replace(/\s+/g, ' ').trim()
    }
    const nom = (e: Element): string => {
      const lb = e.getAttribute('aria-labelledby')
      if (lb) {
        const t = lb
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((x) => texteNom(x!) || x!.getAttribute('aria-label') || '')
          .join(' ')
          .trim()
        if (t) return t
      }
      const al = e.getAttribute('aria-label')?.trim()
      if (al) return al
      if (e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement) {
        const l = [...(e.labels ?? [])].map((x) => texteNom(x)).join(' ').trim()
        if (l) return l
        if (e instanceof HTMLInputElement && /^(submit|button|reset)$/.test(e.type) && e.value) return e.value
      } else {
        const t = texteNom(e)
        if (t) return t
      }
      return e.getAttribute('title')?.trim() ?? ''
    }
    const interactifs = [...app.querySelectorAll(INTERACTIFS)]
    for (const e of interactifs) {
      if (!visible(e) && !(e instanceof HTMLInputElement && e.labels?.length)) continue
      if (e.closest('[aria-hidden="true"]') && !e.closest('[inert]')) {
        D('(c) interactif dans aria-hidden', e, 'masqué aux lecteurs d’écran mais touchable')
        continue
      }
      if (!nom(e)) D('(c) sans nom accessible', e, `<${e.tagName.toLowerCase()}${e.getAttribute('role') ? ' role=' + e.getAttribute('role') : ''}>`)
    }
    for (const img of app.querySelectorAll('img')) if (!img.hasAttribute('alt') && img.getAttribute('aria-hidden') !== 'true' && img.getAttribute('role') !== 'presentation') D('(c) image sans alt', img, img.getAttribute('src')?.split('/').pop() ?? '')
    for (const svg of app.querySelectorAll('svg')) {
      if (svg.parentElement?.closest('svg')) continue
      if (svg.closest('[aria-hidden="true"]')) continue
      if ((svg.getAttribute('role') === 'img' && (svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby') || svg.querySelector('title'))) || svg.getAttribute('role') === 'presentation') continue
      let nomme = false
      for (let e: Element | null = svg.parentElement; e && e !== app; e = e.parentElement)
        if (e.matches(INTERACTIFS + ',[role=img],[aria-label],figure,label') && nom(e)) {
          nomme = true
          break
        }
      if (!nomme && visible(svg)) D('(c) SVG ni masqué ni nommé', svg, svg.getAttribute('class') ?? 'svg')
    }

    // ----- (d) cibles de toucher -----
    const zone = (e: Element) => {
      const r = e.getBoundingClientRect()
      let [l, t, d, b] = [r.left, r.top, r.right, r.bottom]
      for (const ps of ['::before', '::after']) {
        const s = getComputedStyle(e, ps)
        if (s.content === 'none' || s.content === 'normal' || s.display === 'none' || s.position !== 'absolute') continue
        const v = (x: string) => (/px$/.test(x) ? parseFloat(x) : NaN)
        const [pl, pt, pr, pb] = [v(s.left), v(s.top), v(s.right), v(s.bottom)]
        if (!isNaN(pl)) l = Math.min(l, r.left + pl)
        if (!isNaN(pt)) t = Math.min(t, r.top + pt)
        if (!isNaN(pr)) d = Math.max(d, r.right - pr)
        if (!isNaN(pb)) b = Math.max(b, r.bottom - pb)
      }
      return { w: d - l, h: b - t }
    }
    const dansLeTexte = (e: Element) => {
      if (getComputedStyle(e).display !== 'inline') return false
      const p = e.parentElement
      return !!p && [...p.childNodes].some((n) => n !== e && n.nodeType === 3 && n.nodeValue!.trim().length > 1)
    }
    for (const e of interactifs) {
      let cible: Element = e
      if (e instanceof HTMLInputElement && (!visible(e) || e.getBoundingClientRect().width < 4)) {
        // Case ou bouton radio dessinés : la cible est le libellé qui les porte.
        const l = e.labels?.[0]
        if (!l || !visible(l)) continue
        cible = l
      } else if (!visible(e)) continue
      if (dansLeTexte(cible)) continue
      const z = zone(cible)
      if (z.w < 43.5 || z.h < 43.5) D('(d) cible < 44 × 44 px', cible, `${Math.round(z.w * 10) / 10} × ${Math.round(z.h * 10) / 10} px`)
    }

    // ----- (f) ARIA et structure -----
    const ids = new Map<string, number>()
    for (const e of document.querySelectorAll('[id]')) ids.set(e.id, (ids.get(e.id) ?? 0) + 1)
    for (const [id, n] of ids) if (n > 1 && id) D('(f) id en double', document.getElementById(id), `#${id} × ${n}`)
    for (const at of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant'])
      for (const e of document.querySelectorAll(`[${at}]`))
        for (const id of e.getAttribute(at)!.split(/\s+/).filter(Boolean)) if (!document.getElementById(id)) D(`(f) ${at} sans cible`, e, `#${id}`)
    const ROLES = new Set(
      'alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img insertion link list listbox listitem log main mark marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem'.split(' '),
    )
    for (const e of document.querySelectorAll('[role]')) for (const r of e.getAttribute('role')!.split(/\s+/)) if (!ROLES.has(r)) D('(f) rôle inconnu', e, `role="${r}"`)
    const VALEURS: Record<string, string[]> = {
      'aria-current': ['page', 'step', 'location', 'date', 'time', 'true', 'false'],
      'aria-checked': ['true', 'false', 'mixed'],
      'aria-selected': ['true', 'false'],
      'aria-expanded': ['true', 'false'],
      'aria-pressed': ['true', 'false', 'mixed'],
      'aria-hidden': ['true', 'false'],
      'aria-disabled': ['true', 'false'],
    }
    for (const [at, ok] of Object.entries(VALEURS)) for (const e of document.querySelectorAll(`[${at}]`)) if (!ok.includes(e.getAttribute(at)!)) D(`(f) ${at} invalide`, e, `"${e.getAttribute(at)}"`)
    // aria-checked sur un rôle qui ne le porte pas, aria-selected hors onglet / option / cellule.
    for (const e of document.querySelectorAll('[aria-checked]')) if (!/^(checkbox|radio|switch|menuitemcheckbox|menuitemradio|option|treeitem)$/.test(e.getAttribute('role') ?? (e instanceof HTMLInputElement ? e.type : ''))) D('(f) aria-checked hors case', e, `role=${e.getAttribute('role') ?? e.tagName.toLowerCase()}`)
    for (const e of document.querySelectorAll('[aria-selected]')) if (!/^(tab|option|gridcell|row|columnheader|rowheader|treeitem)$/.test(e.getAttribute('role') ?? '')) D('(f) aria-selected hors onglet', e, `role=${e.getAttribute('role') ?? e.tagName.toLowerCase()}`)
    const INTERACTIF_IMBRIQUE = INTERACTIFS + ',[tabindex]:not([tabindex="-1"])'
    for (const e of document.querySelectorAll(INTERACTIF_IMBRIQUE)) {
      const p = e.parentElement?.closest(INTERACTIF_IMBRIQUE)
      if (p && !(p.tagName === 'LABEL')) D('(f) interactif imbriqué', e, `dans ${sel(p)}`)
    }
    const l = document.documentElement.lang
    if (l !== langue) D('(f) html[lang]', document.documentElement, `"${l}" ≠ "${langue}"`)
    const mains = document.querySelectorAll('main,[role=main]').length
    if (mains !== 1) D('(f) nombre de <main>', null, String(mains))
    return { defauts, surImage, separateurs, graphiques, textes }
  }, lang)
}

// ---------- (e) Clavier : tabindex positifs, ordre, indicateur de focus ----------
async function controlesClavier(page: Page): Promise<string[]> {
  const defauts: string[] = await page.evaluate(() => {
    const d: string[] = []
    // Styles de chaque élément focalisable AU REPOS, pour reconnaître un changement de fond ou de bordure au focus.
    const F = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable=true]'
    let i = 0
    const repos = (e: Element) => {
      const s = getComputedStyle(e)
      ;(e as HTMLElement).dataset.a11yRepos = JSON.stringify([s.backgroundColor, s.borderColor, s.boxShadow, s.outlineStyle, s.textDecorationLine, s.color])
    }
    for (const e of document.querySelectorAll(F)) {
      // Le champ dans une boîte (.inp) montre son focus sur la boîte (:focus-within, comme le client) : les trois
      // ancêtres gardent aussi leurs styles au repos.
      for (let x: Element | null = e, n = 0; x && n < 4; x = x.parentElement, n++) repos(x)
      ;(e as HTMLElement).dataset.a11yRang = String(i++)
      const t = e.getAttribute('tabindex')
      if (t !== null && Number(t) > 0) d.push(`(e) tabindex positif · ${e.tagName.toLowerCase()}.${[...e.classList].join('.')} · tabindex=${t}`)
    }
    ;(document.activeElement as HTMLElement | null)?.blur()
    return d
  })
  await page.locator('body').evaluate((b) => b.focus())
  let precedent = -1
  for (let k = 0; k < ARRETS_TAB; k++) {
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null
      if (!e || e === document.body || e === document.documentElement) return null
      const s = getComputedStyle(e)
      const rang = Number(e.dataset.a11yRang ?? -1)
      // Indicateur sur l'élément (contour, ombre, fond, bordure, soulignement qui change) ou sur un de ses trois ancêtres
      // (ombre, fond, bordure ou contour qui change : boîte d'un champ, libellé d'une case dessinée).
      const change = (x: HTMLElement, soi: boolean) => {
        const t = getComputedStyle(x)
        const repos = JSON.parse(x.dataset.a11yRepos ?? '[]') as string[]
        const contour = t.outlineStyle !== 'none' && parseFloat(t.outlineWidth) > 0 && !/rgba\([^)]*,\s*0\)/.test(t.outlineColor) && (soi || t.outlineStyle !== repos[3])
        const ombre = t.boxShadow !== 'none' && t.boxShadow !== repos[2]
        const fond = repos.length > 0 && (t.backgroundColor !== repos[0] || t.borderColor !== repos[1] || (soi && t.textDecorationLine !== repos[4]))
        return contour || ombre || fond
      }
      let indicateur = change(e, true)
      for (let x = e.parentElement, n = 0; x && n < 3 && !indicateur; x = x.parentElement, n++) indicateur = change(x, false) && x.getBoundingClientRect().width > 1
      const r = e.getBoundingClientRect()
      let cache = r.width < 1 || r.height < 1 || s.visibility !== 'visible'
      for (let x: Element | null = e; x && !cache; x = x.parentElement) if (Number(getComputedStyle(x).opacity) < 0.05) cache = true
      const txt = (e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)
      return { indicateur, cache, rang, id: `${e.tagName.toLowerCase()}${e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''}${txt ? ` « ${txt} »` : ''}` }
    })
    if (!r) break
    // Un champ masqué (curseur, case dessinée) peut prendre le focus si son dessin le montre (ancêtre qui change).
    if (!r.indicateur) defauts.push(r.cache ? `(e) focus sur un élément invisible · ${r.id} · arrêt ${k + 1}` : `(e) focus sans indicateur visible · ${r.id} · arrêt ${k + 1}`)
    if (r.rang >= 0 && r.rang <= precedent) defauts.push(`(e) ordre de tabulation hors de l’ordre du document · ${r.id} · arrêt ${k + 1}`)
    if (r.rang >= 0) precedent = r.rang
  }
  return defauts
}

for (const r of RENDUS)
  test.describe(`accessibilité, ${r.nom}${LARGEUR === 360 ? '' : ', ' + LARGEUR + ' px'}`, () => {
    for (const route of OUVERTES)
      test(route, async ({ page }) => {
        await page.setViewportSize({ width: LARGEUR, height: LARGEUR > 1000 ? 860 : 812 })
        await figerHorloge(page)
        await ouvrir(page, '#' + route, r)
        await page.evaluate(() => document.fonts.ready)
        await animationsFinies(page)
        const s = await controlesStatiques(page, r.lang)
        const c = await controlesClavier(page)
        const defauts = [...s.defauts, ...c]
        test.info().annotations.push({ type: 'textes', description: `${s.textes} textes contrôlés, ${s.surImage} sur une image (non calculables), ${s.separateurs} séparateurs décoratifs, ${s.graphiques} symboles de graphiques nommés` })
        expect(defauts, `${route} · ${r.nom} : ${defauts.length} défaut(s)\n` + defauts.join('\n')).toEqual([])
      })
  })

// États ouverts par un geste : la tournée du jeu d'essai rejouée, chaque étape contrôlée (a à d, f).
for (const r of RENDUS)
  test(`accessibilité des étapes de la tournée, ${r.nom}`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize({ width: LARGEUR, height: 812 })
    await figerHorloge(page)
    const defauts: string[] = []
    const etape = async (nom: string) => {
      await page.waitForLoadState('networkidle')
      await page.locator('#app main').waitFor()
      await page.waitForTimeout(300)
      await animationsFinies(page)
      for (const d of (await controlesStatiques(page, r.lang)).defauts) defauts.push(`${nom} · ${d}`)
    }
    await ouvrir(page, '#tournee', r)
    await arriver(page)
    await etape('arrivée')
    await recuperer(page)
    await expect(page).toHaveURL(/\/controle/)
    await etape('contrôle')
    await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
    await page.getByRole('button', { name: re('Prendre la photo') }).first().click()
    await expect(page.locator('.lv-cam')).toBeVisible()
    await etape('appareil photo')
    await page.locator('.lv-cam').getByRole('button', { name: re('Fermer l’appareil photo') }).click()
    await page.locator('.lv-cam').getByRole('button', { name: 'Quitter' }).click()
    await controler(page)
    await emballer(page, '8206')
    await controler(page)
    await etape('audit')
    await auditer(page)
    await etape('emballage')
    await emballer(page, '8207')
    await etape('code du vendeur')
    await taperCode(page, '305718')
    await page.getByRole('button', { name: re('Valider la remise') }).click()
    await expect(page.getByRole('heading', { name: 'Remise validée' })).toBeVisible()
    await etape('remise validée')
    await page.goto('tournee')
    await arriver(page, 'Je suis au relais')
    await expect(page).toHaveURL(/\/depot-relais/)
    await etape('dépôt au relais')
    await page.getByRole('button', { name: re('Elle scanne : une réserve et un refus') }).click()
    await page.getByRole('button', { name: re('J’accepte le constat en miroir') }).click()
    await page.getByRole('button', { name: re('J’accepte la réserve en miroir') }).click() // PR-RC-08 : la réserve aussi
    await page.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
    await etape('confirmation du dépôt')
    await page.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
    await expect(page.getByText(re('Dépôt complet · garde transférée'))).toBeVisible()
    await page.getByRole('link', { name: re('Collecter les départs') }).click()
    await arriver(page)
    await etape('collecte')
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: re('Elle présente le colis suivant') }).click()
      await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
    }
    await page.getByRole('button', { name: re('Continuer vers Tech Bastos') }).click()
    await page.getByRole('link', { name: re('Continuer vers Tech Bastos') }).click()
    await arriver(page)
    await etape('retour au vendeur')
    await taperCode(page, '518204')
    await photo(page)
    await page.getByRole('button', { name: re('Valider le retour') }).click()
    await expect(page.getByRole('heading', { name: 'Retourné au vendeur' })).toBeVisible()
    await page.goto('tournee')
    await arriver(page)
    await recuperer(page)
    await controler(page)
    await emballer(page, '8208')
    await taperCode(page, '640277')
    await page.getByRole('button', { name: re('Valider la remise') }).click()
    await page.goto('tournee')
    await arriver(page)
    await expect(page).toHaveURL(/\/domicile/)
    await etape('remise à domicile')
    await page.getByRole('button', { name: 'Un problème ?' }).click()
    await page.getByRole('link', { name: re('Lieu dangereux') }).click()
    await etape('remise impossible')
    expect(defauts, `${defauts.length} défaut(s)\n` + defauts.join('\n')).toEqual([])
  })

// Taille du texte maximale (8e taille, 140 %) : aucune page ne déborde ni ne coupe son en-tête à 360 px.
test.describe('taille du texte à 140 %', () => {
  for (const route of OUVERTES)
    test(route, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 812 })
      await figerHorloge(page)
      await ouvrir(page, '#' + route, { nom: 'clair', theme: 'light', lang: 'fr', text: 'tres' })
      await page.evaluate(() => localStorage.setItem('blv_l_echelle', '140'))
      await page.reload()
      await page.waitForSelector('#app', { state: 'attached' })
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('22.4px')
      const d = await page.evaluate(() => {
        const m = document.querySelector('#app main') as HTMLElement | null
        const h = document.querySelector('#app header') as HTMLElement | null
        const rang = h?.querySelector('.l-hd-rang,.l-hd-sub') as HTMLElement | null
        return { page: document.documentElement.scrollWidth - innerWidth, main: m ? m.scrollWidth - m.clientWidth : 0, entete: rang ? rang.scrollWidth - rang.clientWidth : 0 }
      })
      expect(d, `${route} : débordement à 140 %`).toEqual({ page: 0, main: 0, entete: 0 })
    })
})
