// Outils des recettes multi-applis : les cinq interfaces ouvertes dans des onglets d'un même navigateur (même origine,
// un seul localStorage : le pont de démonstration, src/demo/pont.ts), à l'heure de la démonstration commune (mardi
// 13 octobre 2026, 14 h 05 à Yaoundé), avec un état neuf posé une seule fois pour tous les onglets.
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

export type App = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais' | 'admin'
/** Les cinq applications des acteurs (la console d'administration, « admin », s'y ajoute dans SIX). */
export const APPS: App[] = ['client', 'vendeur', 'entreprise', 'livreur', 'relais']
export const SIX: App[] = [...APPS, 'admin']
export const CHEMIN: Record<App, string> = { client: '/', vendeur: '/vendeur/', entreprise: '/entreprise/', livreur: '/livreur/', relais: '/relais/', admin: '/admin/' }
const PREFIXE: Record<App, string> = { client: 'blv_c_', vendeur: 'blv_v_', entreprise: 'blv_e_', livreur: 'blv_l_', relais: 'blv_r_', admin: 'blv_a_' }
export const HEURE_DEMO = new Date('2026-10-13T13:05:00.500Z')

export interface Rendu {
  theme: 'light' | 'dark'
  lang: 'fr' | 'en'
  viewport: { width: number; height: number }
  /** Navigateur non piloté : navigator.webdriver à false (animations et effets du vrai navigateur). */
  nonPilote?: boolean
  /** Heure figée (par défaut) ou heure qui avance depuis 14 h 05. */
  heure?: 'figee' | 'avance'
}
export const TELEPHONE = { width: 390, height: 844 }
export const ORDINATEUR = { width: 1366, height: 900 }
export const CLAIR: Rendu = { theme: 'light', lang: 'fr', viewport: TELEPHONE }

/** Un contexte (un navigateur, une origine) préparé pour les cinq applications. */
export async function contexte(browser: Browser, r: Rendu = CLAIR): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: r.viewport, colorScheme: r.theme, locale: r.lang === 'fr' ? 'fr-FR' : 'en-GB', timezoneId: 'Africa/Douala' })
  await ctx.addInitScript(
    ([prefixes, theme, lang, nonPilote]) => {
      if (nonPilote) Object.defineProperty(Navigator.prototype, 'webdriver', { configurable: true, get: () => false })
      try {
        if (localStorage.getItem('blv_essai_connectivite')) return
        localStorage.clear()
        localStorage.setItem('blv_essai_connectivite', '1')
        for (const p of prefixes) {
          localStorage.setItem(p + 'theme', theme)
          localStorage.setItem(p + 'lang', lang)
          localStorage.setItem(p + 'text', 'normale')
        }
      } catch {
        /* rien */
      }
      // Pas d'appareil photo dans le navigateur de test : les écrans proposent la photo simulée.
      const md = navigator.mediaDevices
      if (md) Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
    },
    [Object.values(PREFIXE), r.theme, r.lang, !!r.nonPilote] as const,
  )
  return ctx
}

/** Ouvre une application (chemin relatif à sa base) dans un nouvel onglet du contexte. */
export async function ouvrir(ctx: BrowserContext, app: App, chemin = '', r: Pick<Rendu, 'heure'> = {}): Promise<Page> {
  const page = await ctx.newPage()
  if (r.heure !== 'avance') await page.clock.setFixedTime(HEURE_DEMO)
  await page.goto(CHEMIN[app] + chemin)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __blvPont?: { app: string } }).__blvPont?.app ?? null), { timeout: 20_000 }).toBe(app)
  return page
}

/** Le journal du pont tel que le voit une application (événements des autres qui la concernent). */
export const journalPour = (page: Page, app: App) =>
  page.evaluate((a) => (window as unknown as { __blvPont: { evenementsPour: (d: string) => { type: string; app: string; cle: string }[] } }).__blvPont.evenementsPour(a), app)
/** Tout le journal (vue de l'administrateur). */
export const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as ({ type: string; app: string; cle: string } & Record<string, unknown>)[])
