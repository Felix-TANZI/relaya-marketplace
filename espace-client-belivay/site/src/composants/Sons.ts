// Sons de l'application (marque sonore BelivaY) : tous synthétisés avec la Web Audio API, aucun fichier audio,
// rien à télécharger. Une seule famille de timbres : sinus doux, attaque courte, extinction naturelle, et une
// pointe de « verre » (partiel inharmonique léger) ; tous durent moins de 400 ms, volume maîtrisé.
// - Le contexte audio naît au premier geste du client (règle des navigateurs) : aucun son au chargement.
// - Aucun son ni vibration pendant les tests automatiques (navigator.webdriver).
// - Réglages (CL-13) : « Sons » et « Vibrations », activés par défaut, gardés sur l'appareil (preferences.tsx).
// Où ils sonnent, quel que soit l'écran qui appelle :
// - ajout au panier et favori : événements blv:panier et blv:favori émis par la source (src/donnees/source.ts) ;
// - paiements, retrait au comptoir, messages, litiges, codes faux, délai de paiement expiré : on se branche sur
//   les réponses de `source` (installerSons enveloppe ses méthodes, sans rien changer à ce qu'elles rendent) ;
// - notification non lue qui arrive, interrupteur touché, lien ou code copié : ici aussi ;
// - code de retrait affiché (CL-09/Code) et fin d'un compte à rebours (CompteARebours) : par les écrans.
import { source, type Source } from '../donnees/source'

export type Son =
  | 'panier'
  | 'paiement'
  | 'notification'
  | 'erreur'
  | 'favori'
  | 'favoriRetire'
  | 'message'
  | 'copie'
  | 'interrupteur'
  | 'retrait'
  | 'fin'
  | 'code'

// Aperçu (Réglages, « Écouter ») : chaque toucher joue le son suivant et dit lequel.
export const APERCU: { son: Son; nom: string }[] = [
  { son: 'panier', nom: 'Ajout au panier' },
  { son: 'paiement', nom: 'Paiement accepté' },
  { son: 'notification', nom: 'Notification reçue' },
  { son: 'retrait', nom: 'Retrait au comptoir réussi' },
  { son: 'message', nom: 'Message envoyé' },
  { son: 'favori', nom: 'Ajouté aux favoris' },
  { son: 'code', nom: 'Code de retrait affiché' },
  { son: 'copie', nom: 'Code copié' },
  { son: 'interrupteur', nom: 'Interrupteur' },
  { son: 'fin', nom: 'Fin du compte à rebours' },
  { son: 'erreur', nom: 'Paiement refusé' },
]

// Motifs de vibration (ms) : courts, jamais insistants.
const VIBRATIONS: Record<Son, number[]> = {
  panier: [12],
  paiement: [18, 40, 28],
  notification: [14, 60, 14],
  erreur: [35, 50, 35],
  favori: [10],
  favoriRetire: [6],
  message: [10],
  copie: [8],
  interrupteur: [6],
  retrait: [18, 40, 18, 40, 30],
  fin: [25, 60, 25],
  code: [10],
}

const VOLUME = 0.2 // volume général (0 à 1), sous le compresseur

const lit = (cle: string) => {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

let sonsOn = lit('blv_c_sons') !== 'non'
let vibrationsOn = lit('blv_c_vibr') !== 'non'
export const reglerSons = (on: boolean) => void (sonsOn = on)
export const reglerVibrations = (on: boolean) => void (vibrationsOn = on)

const robot = () => typeof navigator !== 'undefined' && !!navigator.webdriver

let ctx: AudioContext | null = null
let sortie: AudioNode | null = null

// Le contexte et la chaîne de sortie : volume, filtre doux (pas d'aigus agressifs), compresseur (jamais trop fort).
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
  const filtre = ctx.createBiquadFilter()
  filtre.type = 'lowpass'
  filtre.frequency.value = 7000
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  g.connect(filtre).connect(comp).connect(ctx.destination)
  sortie = g
  return ctx
}

// Premier geste : le contexte est créé (ou repris) dans le geste, comme l'exigent Safari et Chrome.
function deverrouiller() {
  if (!sonsOn || robot()) return
  const c = contexte()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  // Safari (iOS) : un échantillon muet joué dans le geste ouvre la sortie.
  const b = c.createBuffer(1, 1, 22050)
  const s = c.createBufferSource()
  s.buffer = b
  s.connect(c.destination)
  s.start(0)
}

interface Note {
  f: number // fréquence de départ (Hz)
  a?: number // décalage (s)
  d?: number // durée d'extinction (s)
  g?: number // gain relatif (0 à 1)
  vers?: number // glissando : fréquence d'arrivée
  glisse?: number // durée du glissando (s)
  forme?: OscillatorType
  verre?: number // gain du partiel « verre » (rapport 2,76), 0 : aucun
}

function note(c: AudioContext, t0: number, n: Note) {
  const debut = t0 + (n.a ?? 0)
  const duree = n.d ?? 0.2
  const gain = n.g ?? 0.6
  const partiels: [number, number, number][] = [[1, gain, duree]]
  if (n.verre) partiels.push([2.76, gain * n.verre, duree * 0.6])
  for (const [r, g, d] of partiels) {
    const o = c.createOscillator()
    o.type = r === 1 ? (n.forme ?? 'sine') : 'sine'
    o.frequency.setValueAtTime(n.f * r, debut)
    if (n.vers) o.frequency.exponentialRampToValueAtTime(n.vers * r, debut + (n.glisse ?? duree * 0.6))
    const e = c.createGain()
    e.gain.setValueAtTime(0.0001, debut)
    e.gain.exponentialRampToValueAtTime(g, debut + 0.008)
    e.gain.exponentialRampToValueAtTime(0.0001, debut + d)
    o.connect(e).connect(sortie!)
    o.start(debut)
    o.stop(debut + d + 0.02)
  }
}

// Les sons. Gammes : do majeur (C5 523, E5 659, G5 784, C6 1047, E6 1319, G6 1568).
const PARTITIONS: Record<Son, Note[]> = {
  // « Pop » (chute rapide) puis petit glissando montant.
  panier: [
    { f: 620, vers: 260, glisse: 0.05, d: 0.08, g: 0.7 },
    { f: 660, vers: 990, glisse: 0.12, a: 0.06, d: 0.2, g: 0.35, verre: 0.15 },
  ],
  // Accord ascendant joyeux, arpégé.
  paiement: [
    { f: 523, d: 0.26, g: 0.42, verre: 0.1 },
    { f: 659, a: 0.055, d: 0.26, g: 0.42, verre: 0.1 },
    { f: 784, a: 0.11, d: 0.26, g: 0.42, verre: 0.12 },
    { f: 1047, a: 0.165, d: 0.22, g: 0.38, verre: 0.15 },
  ],
  // Deux notes cristallines.
  notification: [
    { f: 1175, d: 0.24, g: 0.38, verre: 0.3 },
    { f: 1568, a: 0.11, d: 0.26, g: 0.34, verre: 0.3 },
  ],
  // Deux notes descendantes, graves et discrètes.
  erreur: [
    { f: 330, d: 0.16, g: 0.45, forme: 'triangle' },
    { f: 247, a: 0.13, d: 0.22, g: 0.45, forme: 'triangle' },
  ],
  favori: [{ f: 784, vers: 1175, glisse: 0.09, d: 0.22, g: 0.4, verre: 0.2 }],
  favoriRetire: [{ f: 700, vers: 520, glisse: 0.07, d: 0.12, g: 0.25 }],
  // Petit « envol » montant.
  message: [
    { f: 520, vers: 980, glisse: 0.12, d: 0.17, g: 0.32 },
    { f: 1319, a: 0.1, d: 0.1, g: 0.18, verre: 0.2 },
  ],
  copie: [
    { f: 1568, d: 0.06, g: 0.25 },
    { f: 2093, a: 0.04, d: 0.08, g: 0.22 },
  ],
  interrupteur: [{ f: 1200, vers: 900, glisse: 0.02, d: 0.045, g: 0.28 }],
  // Retrait réussi : deux accords (sixte puis octave), éclat de verre.
  retrait: [
    { f: 784, d: 0.18, g: 0.32, verre: 0.15 },
    { f: 988, d: 0.18, g: 0.28, verre: 0.15 },
    { f: 1047, a: 0.12, d: 0.26, g: 0.34, verre: 0.25 },
    { f: 1319, a: 0.12, d: 0.26, g: 0.3, verre: 0.25 },
  ],
  // Fin d'un compte à rebours : deux tics égaux, puis une note plus basse.
  fin: [
    { f: 988, d: 0.07, g: 0.3 },
    { f: 988, a: 0.1, d: 0.07, g: 0.3 },
    { f: 740, a: 0.2, d: 0.17, g: 0.34, verre: 0.1 },
  ],
  // Code affiché : scintillement léger.
  code: [
    { f: 1047, d: 0.12, g: 0.22, verre: 0.2 },
    { f: 1319, a: 0.04, d: 0.12, g: 0.22, verre: 0.2 },
    { f: 1568, a: 0.08, d: 0.16, g: 0.22, verre: 0.25 },
  ],
}

const dernier: Partial<Record<Son, number>> = {}

// Joue un son (et sa vibration), si le client les a laissés activés. Sans geste du client encore, rien.
// forcer : l'aperçu des réglages, qui rejoue à chaque toucher.
export function jouer(son: Son, forcer = false) {
  if (typeof window === 'undefined' || robot() || document.hidden || !(sonsOn || vibrationsOn)) return
  const t = performance.now()
  if (!forcer && t - (dernier[son] ?? -1e9) < 120) return // un même son ne se répète pas en rafale
  dernier[son] = t
  const actif = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean; isActive: boolean } }).userActivation
  if (vibrationsOn && actif?.hasBeenActive !== false) navigator.vibrate?.(VIBRATIONS[son])
  if (!sonsOn) return
  // Contexte pas encore né : seulement si l'on est dans un geste (sinon le navigateur le refuse).
  const c = ctx ?? (actif?.isActive ? contexte() : null)
  if (!c || !sortie) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + 0.01
  for (const n of PARTITIONS[son]) note(c, t0, n)
}

// Branche les sons sur la source : chaque réponse est rendue telle quelle, le son suit.
type Methode = { [K in keyof Source]: Source[K] extends (...a: never[]) => Promise<unknown> ? K : never }[keyof Source]
type Rendu<K extends Methode> = Source[K] extends (...a: never[]) => Promise<infer R> ? R : never
type Args<K extends Methode> = Source[K] extends (...a: infer A) => unknown ? A : never
function apres<K extends Methode>(k: K, f: (r: Rendu<K>, a: Args<K>) => void) {
  const s = source as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
  const orig = s[k]
  s[k] = async (...a: unknown[]) => {
    const r = await orig.apply(source, a)
    try {
      f(r as Rendu<K>, a as Args<K>)
    } catch {
      /* un son ne casse jamais un geste */
    }
    return r
  }
}

const paie = () => jouer('paiement')
const selon = (r: { ok: boolean }, oui: Son) => jouer(r.ok ? oui : 'erreur')

let installe = false
export function installerSons() {
  if (installe || typeof window === 'undefined') return
  installe = true
  for (const e of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(e, deverrouiller, { capture: true, passive: true })

  window.addEventListener('blv:panier', () => jouer('panier'))
  window.addEventListener('blv:favori', (e) => jouer((e as CustomEvent<{ on?: boolean }>).detail?.on ? 'favori' : 'favoriRetire'))

  // Interrupteurs (réglages, notifications, alertes…) : un tic discret.
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('[role="switch"], .tg, .tg2, .tg3') : null
      if (el && !el.classList.contains('lock')) jouer('interrupteur')
    },
    true,
  )

  // Lien, code ou numéro copié, où que ce soit.
  const cb = navigator.clipboard
  if (cb?.writeText)
    try {
      const ecrire = cb.writeText.bind(cb)
      cb.writeText = (texte: string) => ecrire(texte).then(() => jouer('copie'))
    } catch {
      /* presse-papiers figé : pas de son */
    }

  // Paiements.
  apres('passerCommande', (r) => r.etat === 'payee' && paie())
  apres('confirmerPaiement', (r) => r.etat === 'payee' && paie())
  apres('echouerPaiement', (_r, a) => jouer(a[1] === 'expire' ? 'fin' : 'erreur'))
  for (const k of ['payerTroc', 'payerPanierFamille', 'payerVersement', 'creerMiseDeCote', 'creerMiseDeCoteListe', 'payerAbonnement', 'souscrire', 'payerAuComptoir', 'commanderRentree', 'payerPanierPartage', 'verserCagnotte'] as const) apres(k, paie)
  apres('deciderHausse', (_r, a) => a[1] === 'completer' && paie())
  apres('participer', (r) => selon(r, 'paiement'))
  // Cadeau offert depuis une liste : paiement ; une vérification renforcée (code e-mail) n'est pas un refus.
  apres('offrirArticleListe', (r) => (r.ok ? paie() : r.raison !== 'verification' && jouer('erreur')))
  // Liste mise en statut (WhatsApp, Facebook, Instagram, TikTok…) : le son du message envoyé.
  apres('partagerStatutListe', () => jouer('message'))
  // Échanges entre clients (DP-54) : panier payé pour un proche ; partage, rappel et remerciement envoyés ; liste
  // d'un proche suivie ; colis accepté ou refusé.
  apres('envoyerPanierA', (r) => selon(r, 'paiement'))
  apres('envoyerAuxProches', (r) => r.envoyes > 0 && jouer('message'))
  apres('rappelerInvites', (r) => selon(r, 'message'))
  apres('remercier', () => jouer('message'))
  apres('suivreListe', (_r, a) => jouer(a[1] ? 'favori' : 'favoriRetire'))
  apres('repondreColis', (r) => jouer(r.etat === 'accepte' ? 'notification' : 'interrupteur'))
  apres('offrirAbonnement', (r) => selon(r, 'paiement'))
  apres('commanderPour', (r) => selon(r, 'paiement'))
  apres('ajouterFlash', (r) => !r.ok && jouer('erreur'))

  // Retrait au comptoir : « Tout est en ordre ».
  apres('confirmerRetrait', () => jouer('retrait'))

  // Messages envoyés, litiges ouverts ou complétés.
  for (const k of ['envoyerMessage', 'ecrireSupport', 'poserQuestion', 'repondreWhatsapp', 'ouvrirLitige', 'ajouterPreuve', 'contesterDecision'] as const) apres(k, () => jouer('message'))
  apres('envoyerAvis', (r) => selon(r, 'message'))

  // Codes de vérification refusés.
  for (const k of ['confirmerMoyen', 'confirmerProfil', 'verifierCodeEmail', 'confirmerEmail', 'verifierCodeNumeroAncien', 'confirmerNumero'] as const)
    apres(k, (r) => !r.ok && jouer('erreur'))
  apres('lierParCode', (r) => !r.ok && jouer('erreur'))

  // Notifications : une non lue pas encore annoncée (à l'arrivée sur les notifications), ou le compteur qui monte.
  const annoncees = new Set<string>()
  apres('notificationsClient', (r) => {
    const nouvelles = r.notifications.filter((n) => !n.lu && !annoncees.has(n.id))
    if (!nouvelles.length || !ctx || !sonsOn) return // pas encore de geste : elles seront annoncées plus tard
    nouvelles.forEach((n) => annoncees.add(n.id))
    jouer('notification')
  })
  let nonLus: number | null = null
  apres('session', (r) => {
    const n = r.badges.nonLus
    if (nonLus !== null && n > nonLus) jouer('notification')
    nonLus = n
  })
}
