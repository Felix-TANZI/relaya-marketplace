// Outils partagés par les tests de la console.
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

export interface Fiche {
  route: string
  ecran: string
  titre: string
  groupe: string
  statut: 'provisoire' | 'repris'
  parent: string | null
  onglet: string | null
  sansSession: boolean
}
// Inventaire des routes (npm run inventaire ; tests/squelette.spec.ts vérifie qu'il est à jour).
export const PAGES: Fiche[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
export const ROUTES = PAGES.map((p) => p.route)
export const REPRISES = PAGES.filter((p) => p.statut === 'repris').map((p) => p.route)
export const FICHE: Record<string, Fiche> = Object.fromEntries(PAGES.map((p) => [p.route, p]))
/** Routes cachées par un interrupteur fermé au lancement (assistant : FF-IA) : elles renvoient à l'accueil. */
export const CACHEES = ['assistant']
/** Routes ouvertes à la Direction connectée (toutes, sauf les fonctions cachées). */
export const OUVERTES = ROUTES.filter((r) => !CACHEES.includes(r))

export type Role = 'superviseur' | 'finance' | 'support' | 'mediation' | 'operations' | 'verification' | 'audit' | 'terrain'
export const ROLES: Role[] = ['superviseur', 'finance', 'support', 'mediation', 'operations', 'verification', 'audit', 'terrain']

/** Adresse relative à la base /admin/ : la File d'action est « ./ ». */
export const adresse = (route: string, q = '') => (route === 'file' ? './' : route) + (q ? '?' + q : '')

// Heure du jeu d'essai (mardi 13 oct. 2026, 14 h 05 à Yaoundé), figée : comptes à rebours immobiles ; les minuteurs
// continuent de tourner (setFixedTime).
export async function figerHorloge(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-13T13:05:00.500Z'))
}

export interface Rendu {
  nom: string
  theme: 'light' | 'dark'
  lang: 'fr' | 'en'
  role?: Role
}

/** Ouvre une adresse de la console dans un rendu (préférences posées avant le premier script ; rôle par « ?role= »). */
// `attente` : « reseau » (défaut) attend le repos du réseau, donc la fin du préchargement de TOUS les écrans (main.tsx :
// un écran par rappel de repos du navigateur, ≈ 3,8 s mesurées pour 62 écrans, bien plus quand la machine est chargée :
// requestIdleCallback ne vient alors qu'à son délai de 2 s). « ecran » attend seulement l'écran ouvert : affiché (plus
// d'attente de Suspense), polices et images chargées — assez pour mesurer une mise en page, sans dépendre du repos.
export async function ouvrir(page: Page, a: string, r: Rendu, attente: 'reseau' | 'ecran' = 'reseau') {
  await page.addInitScript(
    ([t, l, m]) => {
      try {
        // Une fois par onglet : état de démonstration neuf, préférences du rendu ; ensuite, les gestes décident.
        if (!sessionStorage.getItem('blv_a_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_a_test', '1')
          localStorage.setItem('blv_a_theme', t)
          localStorage.setItem('blv_a_lang', l)
        }
        // PW_MOUVEMENTS=1 : animations du vrai navigateur sous navigateur piloté (observateurs, compteurs, pastilles).
        if (m) localStorage.setItem('blv_mouv', '1')
      } catch {
        /* rien */
      }
    },
    [r.theme, r.lang, !!process.env.PW_MOUVEMENTS] as const,
  )
  const role = r.role && r.role !== 'superviseur' ? (a.includes('?') ? '&' : '?') + 'role=' + r.role : ''
  await page.goto(a + role)
  await page.waitForSelector('#app', { state: 'attached' })
  if (attente === 'ecran')
    await page.waitForFunction(
      () =>
        !!document.querySelector('#root > *') &&
        !document.querySelector('.attente[aria-busy=true]') &&
        document.fonts.status === 'loaded' &&
        [...document.images].every((i) => i.complete),
    )
  else await page.waitForLoadState('networkidle')
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
}

export const FR: Rendu = { nom: 'clair, français', theme: 'light', lang: 'fr' }
