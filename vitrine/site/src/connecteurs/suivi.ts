// Suivi des erreurs et mesure d'audience, sans dépendance ni cookie.
// - Erreurs : toute erreur non attrapée (script, promesse rejetée, écran qui plante) part en POST JSON vers
//   VITE_ERREURS_URL si elle est posée (format proche de ce qu'acceptent Sentry, GlitchTip ou un point du serveur
//   via un petit relais) ; sinon, en développement, dans la console. Aucune donnée personnelle : l'adresse est
//   envoyée sans ses paramètres (un lien court porte un jeton), pas de numéro, pas de nom.
// - Mesure d'audience : seulement si le client l'a acceptée (Réglages, « Mesure d'audience », éteinte par défaut)
//   et que VITE_MESURE_URL est posée ; une page vue = la route, la langue et la largeur d'écran arrondie. Pas
//   d'identifiant, pas de cookie, rien d'autre.
import { connecteurs } from '../config/env'

const { erreursUrl, mesureUrl, version } = connecteurs.suivi
const MAX_RAPPORTS = 20 // par visite : une boucle d'erreurs ne doit pas inonder le réseau du client
const deja = new Set<string>()
let envoyes = 0

function poster(url: string, corps: unknown) {
  const json = JSON.stringify(corps)
  try {
    if (navigator.sendBeacon?.(url, new Blob([json], { type: 'application/json' }))) return
  } catch {
    // sendBeacon refusé (taille, contexte) : fetch ci-dessous.
  }
  fetch(url, { method: 'POST', body: json, headers: { 'Content-Type': 'application/json' }, keepalive: true, credentials: 'omit' }).catch(() => undefined)
}

export type GenreErreur = 'script' | 'promesse' | 'ecran' | 'connecteur'

// Signale une erreur (une seule fois par message et par visite).
export function signalerErreur(e: unknown, genre: GenreErreur, contexte?: Record<string, string | undefined>) {
  const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e) ?? String(e))
  const empreinte = genre + ':' + err.message
  if (deja.has(empreinte) || envoyes >= MAX_RAPPORTS) return
  deja.add(empreinte)
  const rapport = {
    genre,
    nom: err.name,
    message: err.message.slice(0, 500),
    pile: err.stack?.slice(0, 4000),
    adresse: location.pathname, // sans les paramètres
    langue: document.documentElement.lang,
    navigateur: navigator.userAgent,
    version,
    quand: new Date().toISOString(),
    ...contexte,
  }
  if (erreursUrl) {
    envoyes++
    poster(erreursUrl, rapport)
  } else if (import.meta.env.DEV) console.warn('[suivi]', rapport)
}

let installe = false
// Erreurs non attrapées de toute la page (à appeler une fois, au démarrage).
export function installerSuivi() {
  if (installe) return
  installe = true
  window.addEventListener('error', (ev) => {
    // Une image ou un script qui n'arrive pas n'a pas d'objet erreur : le réseau, pas le code.
    if (ev.error || ev.message) signalerErreur(ev.error ?? ev.message, 'script', { fichier: ev.filename?.replace(/\?.*$/, '') })
  })
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason as { name?: string } | undefined
    if (r?.name === 'AbortError') return // requête annulée par l'écran : normal
    signalerErreur(ev.reason, 'promesse')
  })
}

// Accord du client (préférence « Mesure d'audience », src/preferences.tsx).
const accord = () => {
  try {
    return localStorage.getItem('blv_c_mesure') === 'oui'
  } catch {
    return false
  }
}

// Une page vue. La route seule (sans paramètres), la langue, la largeur d'écran arrondie à 100 px.
export function mesurerPage(chemin: string) {
  if (!accord()) return
  const mesure = { genre: 'page', page: chemin, langue: document.documentElement.lang, largeur: Math.round(innerWidth / 100) * 100, version, quand: new Date().toISOString() }
  if (mesureUrl) poster(mesureUrl, mesure)
  else if (import.meta.env.DEV) console.debug('[mesure]', mesure)
}

// Un geste qui compte (ajout au panier, commande payée…) : son nom et, au plus, quelques nombres.
export function mesurerEvenement(nom: string, valeurs?: Record<string, number>) {
  if (!accord()) return
  const mesure = { genre: 'evenement', nom, valeurs, page: location.pathname, version, quand: new Date().toISOString() }
  if (mesureUrl) poster(mesureUrl, mesure)
  else if (import.meta.env.DEV) console.debug('[mesure]', mesure)
}
