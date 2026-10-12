// Son « nouvelle commande » de l'espace vendeur : des pièces qui s'entrechoquent, court (≈ 450 ms), généré avec la
// Web Audio API comme les sons du client (site/src/composants/Sons.ts) : aucun fichier, rien à télécharger.
// Chaque choc de pièce : quelques partiels métalliques inharmoniques (rapports d'une plaque mince), attaque très
// brève, extinction rapide, plus un souffle filtré (le « tchink ») ; trois chocs décalés et légèrement désaccordés.
// Règles : le contexte naît au premier geste (règle des navigateurs) ; jamais sous navigateur piloté (tests) ni
// onglet caché ; seulement si les sons sont activés (Paramètres) et hors du silence de la nuit (reglerSilence).
const VOLUME = 0.22

let ctx: AudioContext | null = null
let sortie: AudioNode | null = null
let actif = true // réglage « Sons » (Paramètres)
let silence: [string, string] | null = null // « 21:00 », « 07:00 » (Silence la nuit)
let distinct = true // « Son distinct » des commandes (Paramètres, notifications)

export const reglerSonPieces = (on: boolean) => void (actif = on)
export const reglerSilence = (plage: [string, string] | null, sonDistinct = true) => void ((silence = plage), (distinct = sonDistinct))

const robot = () => typeof navigator !== 'undefined' && !!navigator.webdriver

function contexte(): AudioContext | null {
  if (ctx) return ctx
  const C = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!C) return null
  try {
    ctx = new C()
  } catch {
    return null
  }
  const g = ctx.createGain()
  g.gain.value = VOLUME
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  g.connect(comp).connect(ctx.destination)
  sortie = g
  return ctx
}

let installe = false
/** Le contexte audio s'ouvre au premier geste (Safari, Chrome) : aucun son avant. */
export function installerSonPieces() {
  if (installe || typeof window === 'undefined') return
  installe = true
  const ouvrir = () => {
    if (!actif || robot()) return
    const c = contexte()
    if (c?.state === 'suspended') c.resume().catch(() => {})
  }
  for (const e of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(e, ouvrir, { capture: true, passive: true })
}

/** Minutes depuis minuit, heure de Yaoundé (UTC+1, sans heure d'été). */
const minutesYaounde = (t: number) => {
  const d = new Date(t + 3600 * 1000)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}
const enMinutes = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + (b || 0)
}
/** Dans la plage de silence (qui peut passer minuit : 21:00 → 07:00). */
export function dansLeSilence(t: number, plage: [string, string] | null = silence): boolean {
  if (!plage) return false
  const m = minutesYaounde(t)
  const [de, a] = plage.map(enMinutes)
  return de <= a ? m >= de && m < a : m >= de || m < a
}

function choc(c: AudioContext, t0: number, base: number, gain: number) {
  // Partiels d'une pièce (plaque mince) : 1 ; 1,59 ; 2,14 ; 2,65 ; 3,16, chacun plus bref que le précédent.
  const partiels: [number, number, number][] = [
    [1, 1, 0.22],
    [1.59, 0.7, 0.16],
    [2.14, 0.5, 0.12],
    [2.65, 0.35, 0.09],
    [3.16, 0.25, 0.07],
  ]
  for (const [r, g, d] of partiels) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(base * r, t0)
    const e = c.createGain()
    e.gain.setValueAtTime(0.0001, t0)
    e.gain.exponentialRampToValueAtTime(gain * g, t0 + 0.002)
    e.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
    o.connect(e).connect(sortie!)
    o.start(t0)
    o.stop(t0 + d + 0.02)
  }
  // « Tchink » : souffle bref, filtré haut.
  const n = Math.floor(c.sampleRate * 0.03)
  const b = c.createBuffer(1, n, c.sampleRate)
  const x = b.getChannelData(0)
  for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const s = c.createBufferSource()
  s.buffer = b
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 5200
  const e = c.createGain()
  e.gain.setValueAtTime(gain * 0.45, t0)
  e.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03)
  s.connect(f).connect(e).connect(sortie!)
  s.start(t0)
}

let dernier = -1e9
/** Joue les pièces (nouvelle commande). maintenant : heure de la session (silence de la nuit). */
export function jouerPieces(maintenant: number = Date.now()) {
  if (typeof window === 'undefined' || robot() || document.hidden || !actif || !distinct) return
  if (dansLeSilence(maintenant)) return
  const t = performance.now()
  if (t - dernier < 800) return // plusieurs commandes d'un coup : un seul son
  dernier = t
  const c = ctx
  if (!c || !sortie) return // pas encore de geste : le navigateur refuserait le son
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + 0.01
  choc(c, t0, 2350, 0.55)
  choc(c, t0 + 0.075, 2790, 0.42)
  choc(c, t0 + 0.16, 2510, 0.32)
}
