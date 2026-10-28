// Outils partagés par les tests de l'espace entreprise.
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
  roles: string[] | null
  sansSession: boolean
}
// Inventaire des routes (npm run inventaire ; tests/squelette.spec.ts vérifie qu'il est à jour).
export const PAGES: Fiche[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
export const ROUTES = PAGES.map((p) => p.route)
export const REPRISES = PAGES.filter((p) => p.statut === 'repris').map((p) => p.route)
export const FICHE: Record<string, Fiche> = Object.fromEntries(PAGES.map((p) => [p.route, p]))
/** Routes ouvertes au propriétaire connecté (toutes, sauf celles qu'il n'a pas : aucune aujourd'hui). */
export const OUVERTES = PAGES.filter((p) => !p.roles || p.roles.includes('proprietaire')).map((p) => p.route)

/** Adresse relative à la base /entreprise/ : le tableau de bord est « ./ ». */
export const adresse = (route: string, q = '') => (route === 'tableau' ? './' : route) + (q ? '?' + q : '')

// Heure du jeu d'essai (mardi 13 oct. 2026, 14 h 05 à Yaoundé), figée : comptes à rebours immobiles ; les minuteurs
// continuent de tourner (setFixedTime).
export async function figerHorloge(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-13T13:05:00.500Z'))
}

export interface Rendu {
  nom: string
  theme: 'light' | 'dark'
  lang: 'fr' | 'en'
  role?: 'proprietaire' | 'gerant' | 'repartiteur' | 'comptable'
}

/** Ouvre une adresse de l'espace entreprise dans un rendu (préférences posées avant le premier script). */
export async function ouvrir(page: Page, a: string, r: Rendu) {
  await page.addInitScript(
    ([t, l, m]) => {
      try {
        // Une fois par onglet : état de démonstration neuf, préférences du rendu ; ensuite, les gestes décident.
        if (!sessionStorage.getItem('blv_e_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_e_test', '1')
          localStorage.setItem('blv_e_theme', t)
          localStorage.setItem('blv_e_lang', l)
        }
        // PW_MOUVEMENTS=1 : animations du vrai navigateur sous navigateur piloté (observateurs, compteurs, pastilles).
        if (m) localStorage.setItem('blv_mouv', '1')
      } catch {
        /* rien */
      }
    },
    [r.theme, r.lang, !!process.env.PW_MOUVEMENTS] as const,
  )
  const role = r.role && r.role !== 'proprietaire' ? (a.includes('?') ? '&' : '?') + 'role=' + r.role : ''
  await page.goto(a + role)
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
}

export const FR: Rendu = { nom: 'clair, français', theme: 'light', lang: 'fr' }
