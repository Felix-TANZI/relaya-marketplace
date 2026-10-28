// Source « hybride » (VITE_SOURCE=hybride, build Vercel) : les COMPTES sont réels (/api/auth/…), tout le reste reste
// la démonstration. Ce module tient ce que les six applications partagent :
// - la session réelle de l'espace (lue une fois au chargement, mise à jour à la connexion et à la déconnexion) ;
// - la marque « ce compte de démonstration ouvert sur l'appareil est celui d'un compte réel » (sinon, une session réelle
//   expirée ou fermée à distance laisserait la démonstration connectée) ;
// - le compte de démonstration reste utilisable : son mot de passe d'essai (Belivay2026) ouvre la démonstration seule,
//   et un compte réel ne peut pas le prendre (le serveur le refuse) ;
// - l'avis affiché quand la base n'est pas configurée ou qu'aucun e-mail ne part (rien d'inventé : on le dit).
import { env } from '../config/env'
import { comptesReels, type Espace, type Resultat, type SessionReelle } from './client'

export const hybride = env.source === 'hybride'

const MDP_DEMO = 'belivay2026'
/** Le mot de passe d'essai des démonstrations : il ouvre toujours le compte de démonstration. */
export const estMotDePasseDemo = (mdp: string) => mdp.trim().toLowerCase() === MDP_DEMO

export const indisponible = (r: Resultat) => !r.ok && r.code === 'indisponible'

const cache = new Map<Espace, Promise<SessionReelle | null>>()
/** La session réelle de l'espace (null : aucune, ou service indisponible). */
export function sessionReelle(espace: Espace): Promise<SessionReelle | null> {
  let p = cache.get(espace)
  if (!p) {
    p = comptesReels.session(espace).then((r) => (r.ok ? { user: r.user, session: r.session } : null))
    cache.set(espace, p)
  }
  return p
}
export function fixerSession(espace: Espace, s: SessionReelle | null) {
  cache.set(espace, Promise.resolve(s))
  marquer(espace, s ? s.user.id : null)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('blv:compte-reel', { detail: { espace, connecte: !!s } }))
}

const cle = (espace: Espace) => 'blv_compte_reel_' + espace
/** Le compte réel ouvert dans la démonstration de cet appareil (son identifiant), ou null. */
export function marque(espace: Espace): string | null {
  try {
    return localStorage.getItem(cle(espace))
  } catch {
    return null
  }
}
function marquer(espace: Espace, id: string | null) {
  try {
    if (id) localStorage.setItem(cle(espace), id)
    else localStorage.removeItem(cle(espace))
  } catch {
    /* stockage refusé : la session réelle reste lue au serveur à chaque chargement */
  }
}

/**
 * État au chargement : session réelle présente, absente alors que la démonstration croit un compte réel ouvert
 * (« perdue » : expirée ou fermée à distance), ou rien à voir.
 */
export async function etatAuChargement(espace: Espace): Promise<{ reelle: SessionReelle | null; perdue: boolean }> {
  const m = marque(espace)
  const reelle = await sessionReelle(espace)
  if (reelle) {
    if (m !== reelle.user.id) marquer(espace, reelle.user.id)
    return { reelle, perdue: false }
  }
  // Service injoignable : on ne ferme rien (la démonstration reste telle quelle).
  if (m) {
    const e = await comptesReels.etat()
    if (!e.base) return { reelle: null, perdue: false }
    marquer(espace, null)
    return { reelle: null, perdue: true }
  }
  return { reelle: null, perdue: false }
}

// ── Avis ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const anglais = () => typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')
export const AVIS = {
  base: () =>
    anglais()
      ? 'Real accounts are not open on this site yet: use the demo account (password Belivay2026).'
      : 'Les comptes réels ne sont pas encore ouverts sur ce site : utilisez le compte de démonstration (mot de passe Belivay2026).',
  email: () =>
    anglais()
      ? 'No e-mail is sent from this site yet: to recover your account, contact BelivaY support.'
      : 'Aucun e-mail ne part encore de ce site : pour retrouver l’accès à votre compte, contactez le support BelivaY.',
  session: () => (anglais() ? 'Your session has ended: sign in again.' : 'Votre session est terminée : reconnectez-vous.'),
}

/** Un avis discret en bas de l'écran (role="status"), fermé d'un toucher ou après 9 secondes. */
export function annoncer(message: string) {
  if (typeof document === 'undefined') return
  document.getElementById('blv-avis-comptes')?.remove()
  const el = document.createElement('div')
  el.id = 'blv-avis-comptes'
  el.setAttribute('role', 'status')
  el.textContent = message
  Object.assign(el.style, {
    position: 'fixed',
    left: '16px',
    right: '16px',
    bottom: 'calc(96px + env(safe-area-inset-bottom))',
    margin: '0 auto',
    maxWidth: '420px',
    zIndex: '10000',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#FFF4E0',
    color: '#5A3A00',
    border: '1px solid #F2C46D',
    font: '500 14px/1.4 system-ui, sans-serif',
    boxShadow: '0 6px 24px rgba(0,0,0,.18)',
  })
  const fermer = () => el.remove()
  el.addEventListener('click', fermer)
  document.body.appendChild(el)
  setTimeout(fermer, 9000)
}

// ── Aides communes aux applications ──────────────────────────────────────────────────────────────────────────────

/** Un domaine de démonstration (souvent un Proxy chargé à la demande) dont quelques méthodes sont réécrites. */
export function surcharger<T extends object>(demo: T, d: Partial<T>): T {
  return new Proxy(d as T, { get: (t, k) => (k in t ? t[k as keyof T] : demo[k as keyof T]) })
}

/** Ferme la session réelle de l'espace (s'il y en a une) et oublie la marque. */
export async function fermerReel(espace: Espace) {
  if (marque(espace) || (await sessionReelle(espace))) await comptesReels.deconnecter(espace)
  fixerSession(espace, null)
}

/**
 * La session d'une application en hybride : celle de la démonstration, ouverte pour le compte réel et habillée de son
 * nom ; une session réelle perdue (expirée, fermée ailleurs) ferme aussi la démonstration.
 */
const clePassage = (espace: Espace) => 'blv_hybride_passage_' + espace
/** L'espace a déjà été ouvert en source hybride sur cet appareil (stockage refusé : oui, rien n'est fermé). */
export function premierPassageFait(espace: Espace): boolean {
  try {
    return localStorage.getItem(clePassage(espace)) === '1'
  } catch {
    return true
  }
}
export function marquerPremierPassage(espace: Espace) {
  try {
    localStorage.setItem(clePassage(espace), '1')
  } catch {
    /* stockage refusé */
  }
}

export function sessionHabillee<S extends { connecte: boolean }>(
  espace: Espace,
  demo: { session: () => Promise<S>; deconnecter: () => Promise<unknown> },
  ouvrirDemo: (r: SessionReelle) => Promise<unknown> | void,
  habiller: (s: S, r: SessionReelle) => S,
): () => Promise<S> {
  return async () => {
    const { reelle, perdue } = await etatAuChargement(espace)
    if (perdue) {
      await demo.deconnecter()
      annoncer(AVIS.session())
    }
    if (!reelle) {
      // Premier passage sur cet appareil (décision du porteur) : la démonstration, ouverte d'avance sur le compte
      // d'essai, est fermée ; l'espace s'ouvre sur sa page de connexion, le compte de démonstration à un clic. Ensuite,
      // l'entrée dans la démonstration est un choix gardé sur l'appareil.
      let s = await demo.session()
      if (s.connecte && !premierPassageFait(espace)) {
        await demo.deconnecter()
        s = await demo.session()
      }
      marquerPremierPassage(espace)
      return s
    }
    let s = await demo.session()
    if (!s.connecte) {
      await ouvrirDemo(reelle)
      s = await demo.session()
    }
    return s.connecte ? habiller(s, reelle) : s
  }
}

export const initiales = (p: string, n: string) => ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '•'

/** Compte réel en attente de validation (vendeur, entreprise, point relais) : l'avis le dit à la connexion. */
export function annoncerStatut(r: SessionReelle) {
  const en = anglais()
  if (r.user.statut === 'en_attente')
    annoncer(en ? 'Your account is awaiting validation by BelivaY: what you see meanwhile is the demo.' : 'Votre compte est en attente de validation par BelivaY : ce que vous voyez en attendant est la démonstration.')
}

// ── Livreur et point relais : appareil lié à un compte réel, connexion par identifiant et PIN ────────────────────
// Pas de SMS (fournisseur à venir) : le numéro ou l'e-mail saisi lie l'appareil, le PIN (ou le mot de passe) choisi à
// l'activation de l'invitation ouvre la session. Le serveur hache le PIN comme un mot de passe et limite les essais ;
// l'écran ne dit jamais si le numéro a un compte (un PIN faux et un numéro inconnu répondent pareil).

export interface AppareilReel {
  identifiant: string // numéro +237… ou e-mail
  prenom: string | null
  nom: string | null
  essaisRestants: number
  bloqueJusqua: number | null
}
const cleAppareil = (espace: Espace) => 'blv_appareil_reel_' + espace
export function appareilReel(espace: Espace): AppareilReel | null {
  try {
    const v = localStorage.getItem(cleAppareil(espace))
    return v ? (JSON.parse(v) as AppareilReel) : null
  } catch {
    return null
  }
}
export function lierAppareil(espace: Espace, a: AppareilReel | null) {
  try {
    if (a) localStorage.setItem(cleAppareil(espace), JSON.stringify(a))
    else localStorage.removeItem(cleAppareil(espace))
  } catch {
    /* stockage refusé */
  }
}
/** « +237 6 77 •• •• 27 » ; un e-mail : masqué aussi. */
export function masquerIdentifiant(id: string) {
  const n = id.replace(/\D/g, '').slice(-9)
  if (!id.includes('@') && n.length === 9) return `+237 ${n[0]} ${n.slice(1, 3)} •• •• ${n.slice(7)}`
  const [u, d] = id.split('@')
  return (u[0] ?? '') + '•••@' + (d ?? '')
}

export type ResultatPin = { ok: true; reelle: SessionReelle } | { ok: false; raison: 'pin_faux'; essaisRestants: number } | { ok: false; raison: 'bloque'; jusqua: number } | { ok: false; raison: 'ferme' | 'indisponible' }

/** PIN saisi sur un appareil lié à un compte réel : la session réelle s'ouvre (ou le refus, compté par le serveur). */
export async function connecterParPin(espace: Espace, a: AppareilReel, pin: string): Promise<ResultatPin> {
  const r = await comptesReels.connecter(espace, a.identifiant, pin, true)
  if (r.ok) {
    fixerSession(espace, r)
    lierAppareil(espace, { ...a, prenom: r.user.first_name, nom: r.user.last_name, essaisRestants: 5, bloqueJusqua: null })
    return { ok: true, reelle: r }
  }
  if (indisponible(r)) return { ok: false, raison: 'indisponible' }
  if (r.code === 'bloque' || r.code === 'trop_de_tentatives') {
    const jusqua = Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 15 * 60_000
    lierAppareil(espace, { ...a, bloqueJusqua: jusqua, essaisRestants: 0 })
    return { ok: false, raison: 'bloque', jusqua }
  }
  if (r.code === 'compte_ferme') return { ok: false, raison: 'ferme' }
  const essaisRestants = Number(r.data?.essais_restants ?? 0)
  lierAppareil(espace, { ...a, essaisRestants })
  return { ok: false, raison: 'pin_faux', essaisRestants }
}

export const AVIS_PIN = {
  oubli: () =>
    anglais()
      ? 'No SMS is sent from this site yet: for a new PIN, ask your manager or BelivaY support.'
      : 'Aucun SMS ne part encore de ce site : pour un nouveau PIN, demandez à votre responsable ou au support BelivaY.',
}

/**
 * La démonstration lie d'avance l'appareil à son compte d'essai ; un vrai utilisateur ne doit jamais tomber sur l'écran
 * PIN de ce compte. En hybride, l'écran de connexion commence donc au numéro, tant que la personne n'a pas choisi la
 * démonstration en saisissant le numéro d'essai (choix gardé sur l'appareil).
 */
const cleChoixDemo = (espace: Espace) => 'blv_choix_demo_' + espace
export function choixDemo(espace: Espace): boolean {
  try {
    return localStorage.getItem(cleChoixDemo(espace)) === '1'
  } catch {
    return false
  }
}
export function choisirDemo(espace: Espace, oui: boolean) {
  try {
    if (oui) localStorage.setItem(cleChoixDemo(espace), '1')
    else localStorage.removeItem(cleChoixDemo(espace))
  } catch {
    /* stockage refusé */
  }
}
