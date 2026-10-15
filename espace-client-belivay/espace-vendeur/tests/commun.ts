// Outils partagés par les tests de l'espace vendeur.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { PROTO } from '../outils/proto.mjs'

export interface Page_ {
  route: string
  titre: string
  groupe: string
  statut: 'provisoire' | 'repris' | 'retiré'
  ajoutee?: boolean
  etats: { adresse: string }[]
}
const lire = (u: string) => JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf-8'))
export const PAGES: Page_[] = lire('../src/genere/pages.json')
export const ETATS: Record<string, { route: string; entete: string; barre: unknown }> = lire('../src/genere/etats.json')
export const PROTOTYPE = PROTO.href

// Statut réel de chaque route : celui que déclare son groupe dans src/pages/VD-xx/routes.ts (pages.json n'est
// régénéré qu'en vague d'intégration).
const STATUTS: Record<string, string> = {}
for (const d of readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })) {
  const f = new URL(`../src/pages/${d.name}/routes.ts`, import.meta.url)
  if (!d.isDirectory() || !existsSync(f)) continue
  for (const m of readFileSync(f, 'utf-8').matchAll(/route:\s*'([\w-]+)'[^}]*?statut:\s*'(\w+)'/g)) STATUTS[m[1]] = m[2]
}
export const RETIREES = PAGES.filter((p) => p.statut === 'retiré').map((p) => p.route)
export const OUVERTES = PAGES.filter((p) => p.statut !== 'retiré').map((p) => p.route)
export const REPRISES = OUVERTES.filter((r) => STATUTS[r] === 'repris')
export const PROVISOIRES = OUVERTES.filter((r) => STATUTS[r] !== 'repris')
// Pages ajoutées après le prototype (DP-58 : AJ-A, AJ-B) : déclarées par leur routes.ts (pages.json les marque
// « ajoutee » ; le prototype ne les connaît pas, aucune comparaison avec lui). Les liens vers elles sont des liens vers des pages ouvertes.
export const AJOUTEES = Object.keys(STATUTS).filter((r) => !PAGES.some((p) => p.route === r && !p.ajoutee))
export const exclu = (a: string) => /[?&](dyn=|etat=deplie|langue=pcm|lang=pcm)/.test(a) || /^#ile\b/.test(a)
export const etatsDe = (route: string) => [...new Set(['#' + route, ...PAGES.find((p) => p.route === route)!.etats.map((e) => e.adresse)])].filter((a) => !exclu(a))

/** Adresse relative à la base /vendeur/ : « #commande?ref=X » → « commande?ref=X » ; accueil → « ./ ». */
export function adresse(a: string): string {
  const [r, q] = a.replace(/^#/, '').split('?')
  return (r === 'accueil' ? './' : r) + (q ? '?' + q : '')
}

// Heure du jeu d'essai (lundi 21 sept. 2026, 09 h 48 à Yaoundé), figée : comptes à rebours immobiles. Les minuteurs
// continuent de tourner (setFixedTime) : l'application démarre comme d'habitude.
export async function figerHorloge(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-21T08:48:00.500Z'))
}

export interface Rendu {
  nom: string
  theme: 'light' | 'dark'
  lang: 'fr' | 'en'
  text?: 'normale' | 'grande' | 'tres'
}

/** Ouvre une adresse de l'espace vendeur dans un rendu (préférences posées avant le premier script). */
export async function ouvrir(page: Page, a: string, r: Rendu) {
  await page.addInitScript(
    ([t, l, x]) => {
      try {
        // Une fois par onglet : état de démonstration neuf, préférences du rendu ; ensuite, les gestes décident.
        if (!sessionStorage.getItem('blv_v_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_v_test', '1')
          localStorage.setItem('blv_v_theme', t)
          localStorage.setItem('blv_v_lang', l)
          localStorage.setItem('blv_v_text', x)
        }
      } catch {
        /* rien */
      }
    },
    [r.theme, r.lang, r.text ?? 'normale'] as const,
  )
  await page.goto(adresse(a))
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
}
