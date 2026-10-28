// Outils partagés par les tests de l'espace livreur.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import type { Page } from '@playwright/test'

export interface Page_ {
  route: string
  page: string
  titre: string
  groupe: string
  statut: 'provisoire' | 'repris'
  entete: 'racine' | 'enfant' | 'aucun'
  retour: string | null
  onglet: string | null
  etats: { adresse: string; libelle: string }[]
}
const lire = (u: string) => JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf-8'))
// Inventaire (npm run inventaire) : les routes, leur coque et les états du prototype.
export const PAGES: Page_[] = lire('../src/genere/pages.json')

// Statut réel de chaque route : celui que déclare son groupe dans src/pages/LIV-xx/routes.ts (l'inventaire peut
// retarder sur un écran tout juste repris).
const STATUTS: Record<string, string> = {}
for (const d of readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })) {
  const f = new URL(`../src/pages/${d.name}/routes.ts`, import.meta.url)
  if (!d.isDirectory() || !existsSync(f)) continue
  for (const m of readFileSync(f, 'utf-8').matchAll(/route:\s*'([\w-]+)'[^}]*?statut:\s*'(\w+)'/g)) STATUTS[m[1]] = m[2]
}
export const ROUTES_DECLAREES = Object.keys(STATUTS)
export const OUVERTES = PAGES.map((p) => p.route)
export const REPRISES = OUVERTES.filter((r) => STATUTS[r] === 'repris')
export const PROVISOIRES = OUVERTES.filter((r) => STATUTS[r] !== 'repris')

/** Adresse relative à la base /livreur/ : « #paquet?id=X » → « paquet?id=X » ; aujourdhui → « ./ ». */
export function adresse(a: string): string {
  const [r, q] = a.replace(/^#/, '').split('?')
  return (r === 'aujourdhui' ? './' : r) + (q ? '?' + q : '')
}

// Heure du jeu d'essai (mardi 13 oct. 2026, 14 h 05 à Yaoundé), figée : comptes à rebours immobiles. Les minuteurs
// continuent de tourner (setFixedTime) : l'application démarre comme d'habitude.
export async function figerHorloge(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-13T13:05:00.500Z'))
}

export interface Rendu {
  nom: string
  theme: 'light' | 'dark'
  lang: 'fr' | 'en'
  text?: 'normale' | 'grande' | 'tres'
}

/** Ouvre une adresse de l'espace livreur dans un rendu (préférences posées avant le premier script). */
export async function ouvrir(page: Page, a: string, r: Rendu) {
  await page.addInitScript(
    ([t, l, x, m]) => {
      try {
        // Une fois par onglet : état de démonstration neuf, préférences du rendu ; ensuite, les gestes décident.
        if (!sessionStorage.getItem('blv_l_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_l_test', '1')
          localStorage.setItem('blv_l_theme', t)
          localStorage.setItem('blv_l_lang', l)
          localStorage.setItem('blv_l_text', x)
        }
        // PW_MOUVEMENTS=1 : animations du vrai téléphone sous navigateur piloté (observateurs, compteurs, pastilles).
        if (m) localStorage.setItem('blv_mouv', '1')
      } catch {
        /* rien */
      }
    },
    [r.theme, r.lang, r.text ?? 'normale', !!process.env.PW_MOUVEMENTS] as const,
  )
  await page.goto(adresse(a))
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
}

/** États du prototype écartés des parcours automatiques (pidgin : pas dans l'application, DP-13). */
export const exclu = (a: string) => /[?&](lang|langue)=pcm\b/.test(a)
