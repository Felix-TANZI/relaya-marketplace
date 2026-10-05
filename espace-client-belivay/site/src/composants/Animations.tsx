// Animations du site (demande du porteur, 4 oct. 2026) : discrètes, au service du geste, jamais bloquantes.
// Un seul composant, posé une fois (main.tsx), écoute la page : les écrans n'ont rien à faire.
// - jet au panier : la vignette du produit touché vole en arc jusqu'au panier, qui rebondit, et son badge
//   « poppe » (événement blv:panier émis par la source, src/donnees/source.ts) ;
// - favori : le cœur bat et lâche quelques étincelles (blv:favori) ;
// - badges, quantités, montants, comptes à rebours : le chiffre qui change défile ;
// - entrée des pages (glissé avant / arrière, fondu entre onglets du bas), cascade des listes qui arrivent,
//   images en fondu ;
// - pastille qui glisse dans les sélecteurs .seg ; choix en liste qui s'allume sur place ; puces en fondu ;
// - onde légère au toucher des cartes et des lignes ;
// - feuilles : on les tire vers le bas pour fermer ; carrousels : glisse à la souris, inertie, accroche ;
// - coche dessinée et confettis sur « Commande confirmée » et « Paiement accepté », et sur tout succès marqué
//   .blv-succes (cadeau offert, cotisation atteinte, panier payé pour un proche, merci envoyé) ;
// - tirer pour actualiser (Mes commandes, Notifications : useTirerPourActualiser).
// « Animations réduites » (réglage du site) et prefers-reduced-motion coupent tout ; sous un navigateur piloté
// (tests), tout est coupé aussi, sauf si localStorage « blv_mouv » vaut « 1 ».
// Le CSS est dans src/styles/animations.css, tout entier sous html[data-mouv].
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { ONGLETS, chemin } from '../config/pages'
import { usePreferences } from '../preferences'

export function mouvementLibre(): boolean {
  if (typeof window === 'undefined') return false
  if (document.documentElement.dataset.anim === 'reduites') return false
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (navigator.webdriver) {
    try {
      return localStorage.getItem('blv_mouv') === '1'
    } catch {
      return false
    }
  }
  return true
}

// ---------- Outils ----------
const minuteurs = new WeakMap<Element, Map<string, number>>()
// Rejoue une animation CSS portée par une classe (retirée, reflow, remise, retirée à la fin).
function rejouer(el: Element, classe: string, duree = 700) {
  let m = minuteurs.get(el)
  if (!m) minuteurs.set(el, (m = new Map()))
  clearTimeout(m.get(classe))
  el.classList.remove(classe)
  void (el as HTMLElement).offsetWidth
  el.classList.add(classe)
  m.set(classe, window.setTimeout(() => el.classList.remove(classe), duree))
}

const visible = (r: DOMRect) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth

// Calque fixe, au-dessus de tout, qui ne prend aucun toucher : vols, étincelles, ondes, indicateurs.
function calque(): HTMLElement {
  let c = document.getElementById('blv-calque')
  if (!c) {
    c = document.createElement('div')
    c.id = 'blv-calque'
    c.setAttribute('aria-hidden', 'true')
    document.body.appendChild(c)
  }
  return c
}

function fondDe(el: Element): string {
  let n: Element | null = el
  for (let i = 0; n && i < 4; i++, n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return cs.backgroundColor
  }
  return 'var(--card)'
}

// Dernier élément touché (doigt, souris, clavier) : d'où part le jet au panier, quel cœur bat.
let dernier: { el: Element; le: number } | null = null
const recent = () => (dernier && performance.now() - dernier.le < 5000 ? dernier.el : null)

// ---------- Jet au panier ----------
function plusGrande(racine: Element): Element | null {
  let meilleure: Element | null = null
  let aire = 0
  racine.querySelectorAll('img, svg').forEach((n) => {
    if (n.parentElement?.closest('svg')) return
    if (n.closest('header.hd, nav.dock, #blv-calque')) return
    const r = n.getBoundingClientRect()
    if (r.width < 36 || r.height < 36 || !visible(r)) return
    if (r.width * r.height > aire) {
      aire = r.width * r.height
      meilleure = n
    }
  })
  return meilleure
}

// La vignette du produit : dans la carte qui contient le bouton touché (en remontant), sinon la plus grande
// image visible de l'écran ou de la feuille.
function vignette(): Element | null {
  let n: Element | null = recent()
  for (let i = 0; n && i < 9; i++, n = n.parentElement) {
    if (n.matches('#app, body, html')) break
    const v = plusGrande(n)
    if (v) return v
    if (n.matches('main, [role=dialog], .sheet')) break
  }
  const main = document.querySelector('#app main')
  return main ? plusGrande(main) : null
}

function ciblesPanier(): HTMLElement[] {
  const href = chemin('panier')
  return [...document.querySelectorAll<HTMLElement>(`nav.dock a[href="${href}"], header.hd a[href="${href}"]`)].filter((e) => e.offsetParent !== null && visible(e.getBoundingClientRect()))
}

function rebondir(cibles: HTMLElement[]) {
  for (const c of cibles) {
    c.classList.remove('blv-attente')
    rejouer(c, 'blv-rebond', 400)
    const b = c.querySelector('.bdg')
    if (b) rejouer(b, 'blv-pop', 300)
  }
}

// Écran sans panier visible (recherche, feuille…) : un petit « +1 » et un chariot montent du bouton touché.
function plusUn(qte: number) {
  const el = recent()?.closest('a, button, [role=button]')
  if (!el) return
  rejouer(el, 'blv-bat', 400)
  const r = el.getBoundingClientRect()
  const p = document.createElement('div')
  p.className = 'blv-plus'
  p.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>'
  p.appendChild(document.createTextNode('+' + qte))
  Object.assign(p.style, { left: r.left + r.width / 2 + 'px', top: r.top + 'px' })
  calque().appendChild(p)
  p.animate(
    [
      { transform: 'translate(-50%,0) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-26px) scale(1.08)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-38px) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%,-52px) scale(.9)', opacity: 0 },
    ],
    { duration: 580, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
  ).onfinish = () => p.remove()
}

function jeter(qte: number) {
  const cibles = ciblesPanier()
  const cible = cibles.find((c) => c.closest('nav.dock')) ?? cibles[0]
  if (!cible) return plusUn(qte)
  const v = vignette()
  if (!v) return rebondir(cibles)
  cibles.forEach((c) => c.classList.add('blv-attente'))
  const r = v.getBoundingClientRect()
  const c = cible.getBoundingClientRect()
  const vol = document.createElement('div')
  vol.className = 'blv-vol'
  const cs = getComputedStyle(v)
  const rayon = cs.borderRadius !== '0px' ? cs.borderRadius : v.parentElement ? getComputedStyle(v.parentElement).borderRadius : '14px'
  Object.assign(vol.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: rayon === '0px' ? '14px' : rayon, background: fondDe(v) })
  const copie = v.cloneNode(true) as HTMLElement
  copie.removeAttribute('id')
  copie.style.width = '100%'
  copie.style.height = '100%'
  copie.style.display = 'block'
  if (v.tagName === 'IMG') copie.style.objectFit = cs.objectFit
  vol.appendChild(copie)
  calque().appendChild(vol)
  rejouer(v, 'blv-souleve', 250)
  // Arc : courbe de Bézier du centre de la vignette au centre du panier, sommet au-dessus des deux.
  const x0 = r.left + r.width / 2
  const y0 = r.top + r.height / 2
  const x2 = c.left + c.width / 2
  const y2 = c.top + c.height / 2
  const x1 = x0 + (x2 - x0) * 0.35
  const y1 = Math.min(y0, y2) - Math.max(110, Math.abs(x2 - x0) * 0.45)
  const fin = 20 / Math.max(r.width, r.height)
  const N = 36
  const images: Keyframe[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = t * 0.55 + t * t * 0.45 // part vite, plonge dans le panier
    const bx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * x1 + u * u * x2
    const by = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * y1 + u * u * y2
    const s = (1 + (fin - 1) * Math.pow(t, 1.15)) * (1 + 0.08 * Math.sin(Math.PI * Math.min(1, t * 4)))
    const rot = -16 * Math.sin(Math.PI * t)
    images.push({ offset: t, transform: `translate3d(${bx - x0}px,${by - y0}px,0) rotate(${rot}deg) scale(${s})`, opacity: t > 0.86 ? 1 - ((t - 0.86) / 0.14) * 0.8 : 1 })
  }
  let fini = false
  const terminer = () => {
    if (fini) return
    fini = true
    vol.remove()
    rebondir(cibles)
    // Arrivée : petite gerbe au panier (signature, discrète).
    const cc = cible.getBoundingClientRect()
    etincelles(cc.left + cc.width / 2, cc.top + cc.height / 2, 7, 22)
  }
  const a = vol.animate(images, { duration: 520, easing: 'linear', fill: 'forwards' })
  a.onfinish = terminer
  window.setTimeout(terminer, 900)
}

// ---------- Favori : cœur qui bat, étincelles ----------
const COULEURS = ['var(--braise-1)', 'var(--or)', '#FF5A7A', '#FFB020', 'var(--green)', '#8B6CF0']
function etincelles(x: number, y: number, n = 6, portee = 24) {
  const c = calque()
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i')
    p.className = 'blv-etincelle'
    p.style.left = x + 'px'
    p.style.top = y + 'px'
    p.style.background = COULEURS[i % COULEURS.length]
    c.appendChild(p)
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4
    const d = portee * (0.75 + Math.random() * 0.5)
    const a = p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px),calc(-50% + ${Math.sin(ang) * d}px)) scale(.2)`, opacity: 0 },
      ],
      { duration: 290 + Math.random() * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    )
    a.onfinish = () => p.remove()
  }
}

function coeur(on: boolean) {
  const el = recent()?.closest('button, a, [role=button]')
  if (!el) return
  rejouer(el, on ? 'blv-bat' : 'blv-retrait', 400)
  if (on) {
    const r = el.getBoundingClientRect()
    etincelles(r.left + r.width / 2, r.top + r.height / 2)
  }
}

// ---------- Confettis (succès) ----------
function confettis(el: Element) {
  const r = el.getBoundingClientRect()
  if (!visible(r)) return
  const c = calque()
  const x0 = r.left + r.width / 2
  const y0 = r.top + r.height / 2
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i')
    p.className = 'blv-confetti'
    p.style.left = x0 + 'px'
    p.style.top = y0 + 'px'
    p.style.background = COULEURS[i % COULEURS.length]
    if (i % 3 === 0) p.style.borderRadius = '50%'
    c.appendChild(p)
    const vx = (Math.random() - 0.5) * 280
    const vy = -200 - Math.random() * 180
    const tour = (Math.random() - 0.5) * 900
    const images: Keyframe[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      const s = t * 1.1
      images.push({ offset: t, transform: `translate(${vx * s}px,${vy * s + 520 * s * s}px) rotate(${tour * t}deg)`, opacity: t > 0.75 ? (1 - t) / 0.25 : 1 })
    }
    const a = p.animate(images, { duration: 760 + Math.random() * 160, easing: 'linear', fill: 'forwards', delay: 80 })
    a.onfinish = () => p.remove()
  }
}

// ---------- Onde au toucher (cartes, lignes) ----------
function onde(e: PointerEvent) {
  const el = (e.target as Element).closest<HTMLElement>('a, button, [role=button], [role=link], label')
  if (!el || el.matches('.btn, .ibtn, .tab, .chip, .tg, .pill, .bdg, [aria-disabled=true], :disabled')) return
  if (el.closest('nav.dock, header.hd, .blv-vol')) return
  const r = el.getBoundingClientRect()
  if (r.width < 120 || r.height < 40 || r.height > 420) return
  const cs = getComputedStyle(el)
  const cadre = document.createElement('div')
  cadre.className = 'blv-onde'
  Object.assign(cadre.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: cs.borderRadius })
  const rond = document.createElement('i')
  const d = Math.hypot(r.width, r.height) * 2
  Object.assign(rond.style, { left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px', width: d + 'px', height: d + 'px', background: cs.color })
  cadre.appendChild(rond)
  calque().appendChild(cadre)
  rond.animate([{ transform: 'scale(0)', opacity: 0.12 }, { transform: 'scale(1)', opacity: 0.1, offset: 0.6 }, { transform: 'scale(1)', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).onfinish = () => cadre.remove()
}

// ---------- Feuilles : tirer vers le bas pour fermer ----------
function tirerFeuille(e: PointerEvent) {
  const cible = e.target as Element
  const feuille = cible.closest<HTMLElement>('.sheet')
  if (!feuille) return
  const r = feuille.getBoundingClientRect()
  const surPoignee = !!cible.closest('.grab')
  const hautSouris = e.pointerType === 'mouse' && e.clientY - r.top < 44 && !cible.closest('a, button, input, textarea, select, [role=button], [role=switch]')
  if (!surPoignee && !hautSouris) return
  const voile = (feuille.previousElementSibling?.matches('.veil') ? feuille.previousElementSibling : document.querySelector('.veil')) as HTMLElement | null
  const y0 = e.clientY
  let dy = 0
  let derniers: [number, number][] = [[performance.now(), y0]]
  try {
    feuille.setPointerCapture(e.pointerId)
  } catch {
    /* pointeur déjà relâché */
  }
  feuille.style.transition = 'none'
  const bouger = (m: PointerEvent) => {
    if (m.pointerId !== e.pointerId) return
    const brut = m.clientY - y0
    dy = brut > 0 ? brut : brut / 6 // vers le haut : résistance
    feuille.style.transform = `translate3d(0,${dy}px,0)`
    if (voile) voile.style.opacity = String(Math.max(0.15, 1 - Math.max(0, dy) / (r.height * 1.1)))
    derniers = [...derniers.slice(-4), [performance.now(), m.clientY]]
  }
  const lacher = (m: PointerEvent) => {
    if (m.pointerId !== e.pointerId) return
    feuille.removeEventListener('pointermove', bouger)
    feuille.removeEventListener('pointerup', lacher)
    feuille.removeEventListener('pointercancel', lacher)
    const [t0, ya] = derniers[0]
    const [t1, yb] = derniers[derniers.length - 1]
    const vitesse = ((yb - ya) / Math.max(1, t1 - t0)) * 1000
    if (voile && (dy > Math.min(140, r.height * 0.32) || (vitesse > 700 && dy > 20))) {
      feuille.style.transition = 'transform .22s cubic-bezier(.4,0,1,1)'
      feuille.style.transform = `translate3d(0,${r.height + 40}px,0)`
      voile.style.transition = 'opacity .22s'
      voile.style.opacity = '0'
      window.setTimeout(() => {
        voile.click()
        // La feuille est restée (fermeture refusée) : elle revient.
        window.setTimeout(() => {
          if (feuille.isConnected) {
            feuille.style.transition = ''
            feuille.style.transform = ''
            voile.style.opacity = ''
          }
        }, 60)
      }, 200)
    } else {
      feuille.style.transition = 'transform .34s cubic-bezier(.3,1.3,.5,1)'
      feuille.style.transform = ''
      if (voile) {
        voile.style.transition = 'opacity .3s'
        voile.style.opacity = ''
      }
      window.setTimeout(() => (feuille.style.transition = ''), 360)
    }
  }
  feuille.addEventListener('pointermove', bouger)
  feuille.addEventListener('pointerup', lacher)
  feuille.addEventListener('pointercancel', lacher)
}

// ---------- Carrousels : glisse à la souris, inertie, accroche ----------
const defilantX = (el: Element | null): HTMLElement | null => {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (!(n instanceof HTMLElement)) continue
    const o = getComputedStyle(n).overflowX
    if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth + 4) return n
  }
  return null
}
function accrocher(d: HTMLElement) {
  const enfants = [...d.children] as HTMLElement[]
  if (enfants.length < 2 || getComputedStyle(d).scrollSnapType !== 'none') return
  const base = d.getBoundingClientRect().left + parseFloat(getComputedStyle(d).paddingLeft || '0')
  let meilleur = d.scrollLeft
  let ecart = Infinity
  for (const c of enfants) {
    const x = d.scrollLeft + c.getBoundingClientRect().left - base
    const e = Math.abs(x - d.scrollLeft)
    if (e < ecart) {
      ecart = e
      meilleur = x
    }
  }
  meilleur = Math.max(0, Math.min(meilleur, d.scrollWidth - d.clientWidth))
  if (Math.abs(meilleur - d.scrollLeft) > 2) d.scrollTo({ left: meilleur, behavior: 'smooth' })
}
let clicAnnule = 0
function glisserCarrousel(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  const d = defilantX(e.target as Element)
  if (!d || d.closest('nav.dock')) return
  const x0 = e.clientX
  const s0 = d.scrollLeft
  let actif = false
  let echant: [number, number][] = [[performance.now(), x0]]
  const bouger = (m: PointerEvent) => {
    const dx = m.clientX - x0
    if (!actif && Math.abs(dx) > 6) {
      actif = true
      d.classList.add('blv-tire')
    }
    if (actif) {
      d.scrollLeft = s0 - dx
      echant = [...echant.slice(-4), [performance.now(), m.clientX]]
    }
  }
  const lacher = () => {
    window.removeEventListener('pointermove', bouger)
    window.removeEventListener('pointerup', lacher)
    if (!actif) return
    clicAnnule = performance.now()
    d.classList.remove('blv-tire')
    const [t0, xa] = echant[0]
    const [t1, xb] = echant[echant.length - 1]
    let v = ((xb - xa) / Math.max(1, t1 - t0)) * 16 // px par image
    const elan = () => {
      if (Math.abs(v) < 0.6) return accrocher(d)
      d.scrollLeft -= v
      v *= 0.93
      requestAnimationFrame(elan)
    }
    requestAnimationFrame(elan)
  }
  window.addEventListener('pointermove', bouger)
  window.addEventListener('pointerup', lacher)
}

// ---------- Tirer pour actualiser ----------
let actualiseur: (() => unknown) | null = null
export function useTirerPourActualiser(f: () => unknown) {
  const ref = useRef(f)
  ref.current = f
  useEffect(() => {
    const fn = () => ref.current()
    actualiseur = fn
    return () => {
      if (actualiseur === fn) actualiseur = null
    }
  }, [])
}
function tirerActualiser(y0: number, suivre: (cb: (y: number) => void, fin: () => void) => void) {
  const main = document.querySelector<HTMLElement>('#app main')
  const f = actualiseur
  if (!main || !f || main.scrollTop > 0) return
  const haut = main.getBoundingClientRect().top + parseFloat(getComputedStyle(main).paddingTop || '0')
  const rond = document.createElement('div')
  rond.className = 'blv-actualise'
  rond.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>'
  const left = main.getBoundingClientRect().left + main.clientWidth / 2
  Object.assign(rond.style, { left: left + 'px', top: Math.max(haut, 60) + 'px' })
  let d = 0
  let monte = false
  suivre(
    (y) => {
      d = Math.max(0, y - y0)
      if (main.scrollTop > 0) d = 0
      const tire = Math.min(110, d * 0.5)
      if (tire > 4 && !monte) {
        calque().appendChild(rond)
        monte = true
      }
      rond.style.transform = `translate(-50%,${tire - 44}px) rotate(${tire * 4}deg)`
      rond.style.opacity = String(Math.min(1, tire / 60))
      rond.classList.toggle('pret', tire >= 64)
    },
    async () => {
      if (!monte) return
      if (Math.min(110, d * 0.5) >= 64) {
        rond.classList.add('tourne')
        rond.style.transform = 'translate(-50%,24px)'
        const debut = performance.now()
        try {
          await f()
        } finally {
          await new Promise((ok) => setTimeout(ok, Math.max(0, 650 - (performance.now() - debut))))
          rond.classList.remove('tourne')
          rond.animate([{ transform: 'translate(-50%,24px) scale(1)', opacity: 1 }, { transform: 'translate(-50%,24px) scale(.3)', opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => rond.remove()
        }
      } else {
        rond.animate([{ opacity: rond.style.opacity }, { opacity: 0, transform: 'translate(-50%,-44px)' }], { duration: 200, fill: 'forwards' }).onfinish = () => rond.remove()
      }
    },
  )
}

// ---------- Défilement des chiffres, pop des badges, cascades, succès ----------
const badges = new Map<string, string>()
const cleBadge = (b: Element) => {
  const l = b.closest('a, button')
  return l ? (l.closest('nav, header')?.tagName ?? 'x') + '|' + (l.getAttribute('href') ?? l.getAttribute('aria-label') ?? '') : null
}
function badgeVu(b: Element, pop: boolean) {
  const k = cleBadge(b)
  if (!k) return
  const v = b.textContent ?? ''
  const avant = badges.get(k)
  badges.set(k, v)
  if (pop && avant !== undefined && avant !== v) rejouer(b, 'blv-pop', 300)
}
const nombre = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const derniersChangements = new WeakMap<Element, number>()
function rouler(el: HTMLElement, avant: string, apres: string) {
  if (el.closest('input, textarea, [contenteditable], .hd-strip, #blv-calque, .dock-bulle, svg')) return
  if (!visible(el.getBoundingClientRect())) return
  // Un minuteur change chaque seconde : seules les minutes (tout sauf les deux derniers chiffres) défilent,
  // pour ne pas faire clignoter l'écran.
  const maintenant = performance.now()
  const frequent = maintenant - (derniersChangements.get(el) ?? -1e9) < 1500
  derniersChangements.set(el, maintenant)
  if (frequent && avant.slice(0, -2) === apres.slice(0, -2)) return
  if (getComputedStyle(el).display === 'inline') el.classList.add('blv-ib')
  rejouer(el, nombre(apres) >= nombre(avant) ? 'blv-roule-h' : 'blv-roule-b', 280)
  window.setTimeout(() => el.classList.remove('blv-ib'), 290)
}
// État qui change sans chiffre (pastille de commande, « Copié », statut) : léger fondu agrandi.
const ETATS_TEXTE = '.pill, .chip, .tag, .st, .def, .badge, .stt, .etat, button, .btn'
function changerEtat(el: HTMLElement, avant: string, apres: string) {
  if (el.closest('input, textarea, [contenteditable], .hd-strip, #blv-calque, .dock-bulle, svg, nav.dock')) return
  const cible = el.closest<HTMLElement>(ETATS_TEXTE)
  if (!cible || !visible(cible.getBoundingClientRect())) return
  if (/copi[ée]|copied/i.test(apres) || !/^\s*$/.test(avant)) rejouer(cible, 'blv-maj', 280)
}
const succesVus = new WeakSet<Element>()
const LISTE = '.card, .li, .pc, .mini, .cl07-fv, .cl05-row, .cl06-bub, .cl10-bub, .msg, .bub'
function observer(liste: MutationRecord[]) {
  if (!mouvementLibre()) return
  const textes = liste.filter((m) => m.type === 'characterData')
  const enMasse = textes.length > 24 // changement de langue, nouvel écran : pas de défilement
  const gagnants: HTMLElement[] = []
  const perdants: HTMLElement[] = []
  const ajouts = new Map<Element, Element[]>()
  for (const m of liste) {
    if (m.type === 'characterData') {
      const el = m.target.parentElement
      if (!el) continue
      if (el.matches('.bdg')) badgeVu(el, true)
      else if (enMasse || m.oldValue === m.target.nodeValue) continue
      // Chiffres qui changent, ou code masqué (•••) qui se révèle.
      else if (/[\d•●*]/.test(m.oldValue ?? '') && /\d/.test(m.target.nodeValue ?? '') && (m.target.nodeValue ?? '').length < 28) rouler(el, m.oldValue ?? '', m.target.nodeValue ?? '')
      else if ((m.target.nodeValue ?? '').length < 40) changerEtat(el, m.oldValue ?? '', m.target.nodeValue ?? '')
    } else if (m.type === 'attributes') {
      const el = m.target as HTMLElement
      const avant = ` ${m.oldValue ?? ''} `.includes(' on ')
      const apres = el.classList.contains('on')
      if (avant === apres || el.matches('.tg, .tab, .fp-th button') || el.closest('nav.dock')) continue
      ;(apres ? gagnants : perdants).push(el)
    } else {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return
        if (n.matches('.bdg')) badgeVu(n, true)
        n.querySelectorAll('.bdg').forEach((b) => badgeVu(b, false))
        // « Copié » qui apparaît à la place du bouton ou à côté.
        if (/^\s*(copié|copied)/i.test(n.textContent ?? '') && (n.textContent ?? '').length < 40) rejouer(n, 'blv-maj', 280)
        for (const s of [n, ...n.querySelectorAll('.cl08-sq:not(.or), .xp-fid, .blv-succes')]) {
          if (s.matches('.cl08-sq:not(.or), .xp-fid, .blv-succes') && !succesVus.has(s)) {
            succesVus.add(s)
            window.setTimeout(() => confettis(s), 260)
          }
        }
        if (n.matches(LISTE) && n.parentElement && n.closest('main')) {
          const g = ajouts.get(n.parentElement) ?? []
          g.push(n)
          ajouts.set(n.parentElement, g)
        }
      })
    }
  }
  // Passer d'un choix à l'autre, simple et net :
  // - sélecteur à 2 ou 3 choix (.seg : relais ou domicile, devise, moyen…) : une vraie pastille glisse sous le choix ;
  // - choix en liste (moyen de paiement, relais, adresse) : la ligne choisie s'allume sur place ;
  // - puces, filtres, onglets : fondu de couleur (CSS) et petit retour au toucher, rien ne saute.
  for (const g of gagnants) {
    const seg = g.parentElement?.closest('.seg')
    if (seg && g.parentElement === seg) {
      placerPastille(seg as HTMLElement, true)
      continue
    }
    const p = perdants.find((x) => x.parentElement === g.parentElement) ?? perdants.find((x) => x.parentElement?.parentElement === g.parentElement?.parentElement)
    if (!p) continue
    const ra = p.getBoundingClientRect()
    const rb = g.getBoundingClientRect()
    rejouer(g, Math.abs(ra.top - rb.top) < 4 && rb.height <= 56 ? 'blv-doux' : 'blv-choisi', 420)
  }
  document.querySelectorAll<HTMLElement>('main .seg:not(.blv-pill)').forEach((x) => placerPastille(x, false))
  // Cascade : des cartes qui arrivent ensemble (liste chargée, filtre changé) entrent l'une après l'autre.
  for (const g of ajouts.values()) {
    if (g.length > 40) continue
    g.forEach((el, i) => {
      ;(el as HTMLElement).style.setProperty('--blv-i', String(Math.min(i, 10)))
      rejouer(el, 'blv-cascade', 300 + Math.min(i, 10) * 30)
    })
  }
}

// ---------- Pastille des sélecteurs .seg (styles/animations.css : .seg.blv-pill::before) ----------
function placerPastille(seg: HTMLElement, anime: boolean) {
  const on = seg.querySelector<HTMLElement>(':scope > .on')
  if (!on) {
    seg.classList.remove('blv-pill')
    return
  }
  if (!anime) seg.classList.add('blv-pill-fixe')
  // La pastille prend l'allure exacte du choix actif de ce sélecteur (blanc, orange, sombre…), lue sans la pastille.
  seg.classList.remove('blv-pill')
  const cs = getComputedStyle(on)
  seg.style.setProperty('--pbg', cs.backgroundColor)
  seg.style.setProperty('--pbgi', cs.backgroundImage)
  seg.style.setProperty('--psh', cs.boxShadow)
  seg.style.setProperty('--prad', cs.borderRadius)
  seg.style.setProperty('--px', on.offsetLeft + 'px')
  seg.style.setProperty('--py', on.offsetTop + 'px')
  seg.style.setProperty('--pw', on.offsetWidth + 'px')
  seg.style.setProperty('--ph', on.offsetHeight + 'px')
  seg.classList.add('blv-pill')
  if (!anime) requestAnimationFrame(() => requestAnimationFrame(() => seg.classList.remove('blv-pill-fixe')))
}

// ---------- Le composant ----------
const ONGLETS_CHEMINS = new Set(ONGLETS.map((o) => chemin(o.id)))

// ---------- Défilements automatiques de l'accueil, en boucle continue (consigne du porteur) ----------
// - Carrousel (.h0-hero) : une bande toutes les 5 s, toujours vers l'avant ; après la dernière vient la première.
// - Rangée des catégories (.h0-pills) : glisse lentement et sans fin (≈ 22 px/s).
// La boucle sans couture vient d'une copie des éléments posée à la suite (aria-hidden, hors tabulation) : quand
// la vue atteint la copie, elle est replacée d'un coup sur l'original identique, sans que rien ne se voie. Un clic
// sur une copie est rendu à l'original. Pause tant qu'on touche, survole ou a le focus dessus, et 8 s après un
// défilement à la main. Coupé avec les animations réduites et sous navigateur piloté (aucune copie posée).
const DEFILE_MS = 5000
const VITESSE_PILLS = 22 // px par seconde
const originaux = (r: Element) => [...r.children].filter((c) => !(c as HTMLElement).dataset.copie) as HTMLElement[]
function boucler(r: HTMLElement): number {
  const o = originaux(r)
  const copies = [...r.children].filter((c) => (c as HTMLElement).dataset.copie)
  if (copies.length !== o.length || (copies[0] && copies[0].textContent !== o[0]?.textContent)) {
    copies.forEach((c) => c.remove())
    o.forEach((el) => {
      const c = el.cloneNode(true) as HTMLElement
      c.dataset.copie = '1'
      c.setAttribute('aria-hidden', 'true')
      c.querySelectorAll<HTMLElement>('a,button,[tabindex]').forEach((x) => x.setAttribute('tabindex', '-1'))
      if (c.matches('a,button')) c.setAttribute('tabindex', '-1')
      r.appendChild(c)
    })
  }
  // Les copies suivent leurs originaux : une photo chargée après la copie apparaît aussi dans la copie.
  const cs = [...r.children].filter((c) => (c as HTMLElement).dataset.copie) as HTMLElement[]
  cs.forEach((c, i) => {
    const so = o[i]?.querySelectorAll<HTMLElement>('.h0-ph')
    const sc = c.querySelectorAll<HTMLElement>('.h0-ph')
    so?.forEach((ph, k) => {
      const cible = sc[k]
      if (!cible) {
        // photo apparue dans l'original après la copie : on la recopie
        const parent = c.querySelector('.im')
        if (parent) parent.appendChild(ph.cloneNode(true))
        return
      }
      if (cible.className !== ph.className) cible.className = ph.className
      const io = ph.querySelector('img')
      const ic = cible.querySelector('img')
      if (io && ic && ic.getAttribute('src') !== io.getAttribute('src')) ic.setAttribute('src', io.getAttribute('src') ?? '')
      if (ic) ic.loading = 'eager'
    })
  })
  const premiere = cs[0]
  return premiere && o[0] ? premiere.offsetLeft - o[0].offsetLeft : 0
}
function retirerCopies() {
  document.querySelectorAll('.h0-pills>[data-copie], .h0-hero>[data-copie]').forEach((c) => c.remove())
}
function defilementAuto(): () => void {
  const pause = new WeakMap<Element, number>()
  const SEL = '.h0-pills, .h0-hero'
  const marquer = (e: Event) => {
    const r = (e.target as Element | null)?.closest?.(SEL)
    if (r) pause.set(r, performance.now() + 8000)
  }
  // Clic sur une copie : rendu à l'élément original (même lien, même action).
  const clicCopie = (e: MouseEvent) => {
    const c = (e.target as Element | null)?.closest?.('[data-copie]') as HTMLElement | null
    const r = c?.parentElement
    if (!c || !r) return
    const i = [...r.children].filter((x) => (x as HTMLElement).dataset.copie).indexOf(c)
    const o = originaux(r)[i]
    if (!o) return
    e.preventDefault()
    e.stopPropagation()
    o.click()
  }
  const libre = (r: HTMLElement) => {
    if ((pause.get(r) ?? 0) > performance.now() || r.matches(':hover') || r.contains(document.activeElement)) return false
    const b = r.getBoundingClientRect()
    return !!b.width && b.bottom > 0 && b.top < innerHeight && r.scrollWidth > r.clientWidth + 4
  }
  // Carrousel : bande suivante toutes les 5 s ; arrivé sur la copie de la première, on se replace sur l'original.
  const minuterie = window.setInterval(() => {
    if (!mouvementLibre() || document.hidden) return retirerCopies()
    document.querySelectorAll<HTMLElement>('main .h0-hero').forEach((r) => {
      if (!libre(r)) return
      const periode = boucler(r)
      const w = Math.max(1, r.clientWidth)
      const i = Math.round(r.scrollLeft / w) + 1
      r.scrollTo({ left: i * w, behavior: 'smooth' })
      if (periode && i * w >= periode - 2)
        window.setTimeout(() => r.scrollTo({ left: i * w - periode, behavior: 'instant' as ScrollBehavior }), 900)
    })
  }, DEFILE_MS)
  // Rangée des catégories : glisse continue ; passé la longueur des originaux, on retranche cette longueur.
  const pos = new WeakMap<Element, number>()
  let raf = 0
  let avant = performance.now()
  const glisser = (t: number) => {
    const dt = Math.min(0.1, (t - avant) / 1000)
    avant = t
    if (mouvementLibre() && !document.hidden)
      document.querySelectorAll<HTMLElement>('main .h0-pills').forEach((r) => {
        if (!libre(r)) return
        const periode = boucler(r)
        if (!periode) return
        let p = pos.get(r) ?? r.scrollLeft
        if (Math.abs(p - r.scrollLeft) > 3) p = r.scrollLeft // déplacée à la main : on repart de là
        p += VITESSE_PILLS * dt
        if (p >= periode) p -= periode
        pos.set(r, p)
        r.scrollTo({ left: p, behavior: 'instant' as ScrollBehavior })
      })
    raf = requestAnimationFrame(glisser)
  }
  raf = requestAnimationFrame(glisser)
  const evts = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const
  evts.forEach((n) => document.addEventListener(n, marquer, { capture: true, passive: true }))
  document.addEventListener('click', clicCopie, true)
  return () => {
    window.clearInterval(minuterie)
    cancelAnimationFrame(raf)
    evts.forEach((n) => document.removeEventListener(n, marquer, { capture: true }))
    document.removeEventListener('click', clicCopie, true)
    retirerCopies()
  }
}

// ---------- Barre flottante « colis au relais » de l'accueil (consigne du porteur) ----------
// Sur téléphone, la barre ne reste plus ouverte en permanence :
// - elle monte 1,2 s après l'arrivée sur l'accueil, puis se retire d'elle-même au bout de 8 s ;
// - elle se retire dès qu'on fait défiler la page vers le bas, et revient un instant (4 s) quand on remonte en haut ;
// - on la chasse d'un balayage du doigt (vers le bas ou sur le côté) ou par sa croix ;
// - chassée, elle ne revient pas de la journée, sauf si le nombre de colis à retirer change.
// En ligne dans la page (tablette, ordinateur) elle reste en place. Animations réduites : apparition sans glisse.
const CLE_COLIS = 'blv_colis_chasse'
function barreColis(): () => void {
  let barre: HTMLElement | null = null
  let minuteurs: number[] = []
  let dernierY = 0
  const effacer = () => (minuteurs.forEach((m) => window.clearTimeout(m)), (minuteurs = []))
  const signature = (b: HTMLElement) => (b.querySelector('.ft b')?.textContent ?? '') + '|' + new Date().toDateString()
  const chassee = (b: HTMLElement) => {
    try {
      return localStorage.getItem(CLE_COLIS) === signature(b)
    } catch {
      return false
    }
  }
  const flottante = (b: HTMLElement) => getComputedStyle(b).position === 'fixed' || getComputedStyle(b).position === 'absolute'
  const montrer = (b: HTMLElement, duree: number) => {
    if (chassee(b)) return
    b.classList.remove('blv-colis-cache', 'blv-colis-part-bas', 'blv-colis-part-cote')
    effacer()
    minuteurs.push(window.setTimeout(() => cacher(b), duree))
  }
  const cacher = (b: HTMLElement, sens: 'bas' | 'cote' = 'bas') => {
    effacer()
    b.classList.add('blv-colis-cache', sens === 'cote' ? 'blv-colis-part-cote' : 'blv-colis-part-bas')
  }
  const chasser = (b: HTMLElement, sens: 'bas' | 'cote') => {
    try {
      localStorage.setItem(CLE_COLIS, signature(b))
    } catch {
      /* stockage indisponible : chassée pour cette visite */
    }
    cacher(b, sens)
  }
  const brancher = () => {
    const b = document.querySelector<HTMLElement>('main ~ * .h0-float, #app .h0-float')
    if (b === barre) return
    effacer()
    barre = b
    if (!b) return
    // En ligne (tablette, ordinateur) : pas d'apparition minutée, mais une croix ; chassée, elle se replie pour la journée.
    if (!flottante(b)) {
      try {
        if (navigator.webdriver && localStorage.getItem('blv_mouv') !== '1') return
      } catch {
        return
      }
      b.classList.add('blv-colis-ligne')
      if (chassee(b)) b.classList.add('blv-colis-replie')
      if (!b.querySelector('.blv-colis-x')) {
        const x = document.createElement('button')
        x.type = 'button'
        x.className = 'blv-colis-x'
        x.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Hide' : 'Masquer')
        x.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
        x.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          try {
            localStorage.setItem(CLE_COLIS, signature(b))
          } catch {
            /* stockage indisponible */
          }
          b.classList.add('blv-colis-replie')
        })
        b.appendChild(x)
      }
      return
    }
    // Navigateur piloté (tests au pixel) : la barre reste comme dans le prototype, sauf avec blv_mouv = 1.
    try {
      if (navigator.webdriver && localStorage.getItem('blv_mouv') !== '1') return
    } catch {
      return
    }
    b.classList.add('blv-colis', 'blv-colis-cache')
    if (!b.querySelector('.blv-colis-x')) {
      const x = document.createElement('button')
      x.type = 'button'
      x.className = 'blv-colis-x'
      x.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Hide' : 'Masquer')
      x.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
      x.addEventListener('click', (e) => (e.preventDefault(), e.stopPropagation(), chasser(b, 'bas')))
      b.appendChild(x)
    }
    // Balayage du doigt.
    let d: { x: number; y: number; id: number } | null = null
    b.addEventListener('pointerdown', (e) => (d = { x: e.clientX, y: e.clientY, id: e.pointerId }))
    b.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return
      const dx = e.clientX - d.x
      const dy = Math.max(0, e.clientY - d.y)
      b.style.transform = `translate(${dx}px, ${dy}px)`
      b.style.opacity = String(Math.max(0.2, 1 - Math.max(Math.abs(dx) / 220, dy / 120)))
    })
    const fin = (e: PointerEvent) => {
      if (!d || e.pointerId !== d.id) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      d = null
      b.style.transform = ''
      b.style.opacity = ''
      if (dy > 36) {
        e.preventDefault()
        chasser(b, 'bas')
      } else if (Math.abs(dx) > 70) {
        e.preventDefault()
        chasser(b, 'cote')
      }
    }
    b.addEventListener('pointerup', fin)
    b.addEventListener('pointercancel', fin)
    minuteurs.push(window.setTimeout(() => montrer(b, 8000), 1200))
  }
  const defile = (e: Event) => {
    const m = e.target as HTMLElement
    if (!barre || !m.matches?.('main') || !flottante(barre)) return
    const y = m.scrollTop
    if (y > dernierY + 8 && y > 40) cacher(barre)
    else if (y < 24 && dernierY >= 24) montrer(barre, 4000)
    dernierY = y
  }
  const observer = new MutationObserver(() => brancher())
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('scroll', defile, true)
  brancher()
  return () => {
    observer.disconnect()
    document.removeEventListener('scroll', defile, true)
    effacer()
    document.querySelectorAll('.blv-colis').forEach((b) => b.classList.remove('blv-colis', 'blv-colis-cache', 'blv-colis-part-bas', 'blv-colis-part-cote'))
    document.querySelectorAll('.blv-colis-x').forEach((x) => x.remove())
  }
}

export function Animations() {
  const { animationsReduites } = usePreferences()
  const lieu = useLocation()
  const type = useNavigationType()
  const precedent = useRef<string | null>(null)
  const dernierMain = useRef<Element | null>(null)

  // html[data-mouv] : le CSS d'animation ne vaut que là.
  useEffect(() => {
    const maj = () => {
      if (mouvementLibre()) document.documentElement.dataset.mouv = '1'
      else delete document.documentElement.dataset.mouv
    }
    maj()
    const m = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    m?.addEventListener('change', maj)
    return () => m?.removeEventListener('change', maj)
  }, [animationsReduites])

  // Entrée des pages : glissé avant ou arrière, fondu entre onglets du bas ; cascade des premiers blocs.
  useLayoutEffect(() => {
    const avant = precedent.current
    precedent.current = lieu.pathname
    const ancien = dernierMain.current
    if (avant === null || avant === lieu.pathname || !mouvementLibre()) {
      dernierMain.current = document.querySelector('#app main')
      return
    }
    const sens = ONGLETS_CHEMINS.has(avant) && ONGLETS_CHEMINS.has(lieu.pathname) ? 'blv-fondu' : type === 'POP' ? 'blv-arriere' : 'blv-avant'
    // La page suivante peut arriver un peu plus tard (document chargé à la demande) : on attend son <main>.
    const debut = performance.now()
    let id = 0
    const poser = () => {
      const main = document.querySelector('#app main')
      if (main && main !== ancien) {
        dernierMain.current = main
        rejouer(main, sens, 900)
      } else if (performance.now() - debut < 1500) id = window.setTimeout(poser, 16)
    }
    poser()
    return () => clearTimeout(id)
  }, [lieu.pathname, type])

  useEffect(() => {
    const toucher = (e: PointerEvent) => {
      dernier = { el: e.target as Element, le: performance.now() }
      if (!mouvementLibre()) return
      onde(e)
      tirerFeuille(e)
      glisserCarrousel(e)
      if (e.pointerType === 'mouse' && e.button === 0 && actualiseur && !(e.target as Element).closest('a, button, input, textarea, select, [role=button], .sheet')) {
        tirerActualiser(e.clientY, (cb, fin) => {
          const mv = (m: PointerEvent) => cb(m.clientY)
          const up = () => (window.removeEventListener('pointermove', mv), window.removeEventListener('pointerup', up), fin())
          window.addEventListener('pointermove', mv)
          window.addEventListener('pointerup', up)
        })
      }
    }
    const doigt = (e: TouchEvent) => {
      if (!mouvementLibre() || !actualiseur || e.touches.length !== 1 || (e.target as Element).closest('.sheet, nav.dock')) return
      tirerActualiser(e.touches[0].clientY, (cb, fin) => {
        const mv = (m: TouchEvent) => cb(m.touches[0].clientY)
        const up = () => (window.removeEventListener('touchmove', mv), window.removeEventListener('touchend', up), window.removeEventListener('touchcancel', up), fin())
        window.addEventListener('touchmove', mv, { passive: true })
        window.addEventListener('touchend', up)
        window.addEventListener('touchcancel', up)
      })
    }
    const clic = (e: MouseEvent) => {
      dernier = { el: e.target as Element, le: performance.now() }
      // Un carrousel tiré à la souris ne suit pas le lien sous le pointeur.
      if (performance.now() - clicAnnule < 80) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const fin = (e: Event) => {
      const d = e.target
      if (mouvementLibre() && d instanceof HTMLElement && !d.classList.contains('blv-tire') && getComputedStyle(d).overflowX !== 'visible' && d.scrollWidth > d.clientWidth + 4 && d.matches('main *')) accrocher(d)
    }
    const charge = (e: Event) => {
      if (mouvementLibre() && e.target instanceof HTMLImageElement && e.target.closest('main, .sheet')) rejouer(e.target, 'blv-img', 520)
    }
    const panier = (e: Event) => mouvementLibre() && jeter(Number((e as CustomEvent<{ qte?: number }>).detail?.qte) || 1)
    const favori = (e: Event) => mouvementLibre() && coeur(!!(e as CustomEvent<{ on: boolean }>).detail?.on)
    document.addEventListener('pointerdown', toucher, true)
    document.addEventListener('touchstart', doigt, { capture: true, passive: true })
    document.addEventListener('click', clic, true)
    document.addEventListener('scrollend', fin, true)
    document.addEventListener('load', charge, true)
    window.addEventListener('blv:panier', panier)
    window.addEventListener('blv:favori', favori)
    const arreterDefile = defilementAuto()
    const arreterColis = barreColis()
    const mo = new MutationObserver(observer)
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true })
    document.querySelectorAll('.bdg').forEach((b) => badgeVu(b, false))
    const repasser = () => document.querySelectorAll<HTMLElement>('.seg.blv-pill').forEach((x) => placerPastille(x, false))
    window.addEventListener('resize', repasser)
    const theme = new MutationObserver(() => requestAnimationFrame(repasser))
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-text'] })
    return () => {
      document.removeEventListener('pointerdown', toucher, true)
      document.removeEventListener('touchstart', doigt, true)
      document.removeEventListener('click', clic, true)
      document.removeEventListener('scrollend', fin, true)
      document.removeEventListener('load', charge, true)
      window.removeEventListener('blv:panier', panier)
      window.removeEventListener('blv:favori', favori)
      window.removeEventListener('resize', repasser)
      theme.disconnect()
      arreterDefile()
      arreterColis()
      mo.disconnect()
    }
  }, [])
  return null
}
