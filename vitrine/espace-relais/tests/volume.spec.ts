// Données de démo qui grossissent (tests, présentation) : aucune page de l'espace point relais ne plante. Le pont commun
// annonce 15 lots de 10 colis (paquets affectés par l'entreprise vers ce relais) ; les 150 colis sont ensuite mis « en
// stock » sur l'appareil (rangés sur les étagères du plan, quelques-uns sans case, payés ou à payer au comptoir, dernier
// jour). Puis chaque écran s'ouvre, téléphone et ordinateur : ni écran d'erreur, ni « NaN », ni erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'

const LE = Date.UTC(2026, 9, 13, 11, 0)
const lot = (k: number) => `PQ-Z1-261013-${String(200 + k).padStart(3, '0')}`
const colisDuLot = (k: number) => Array.from({ length: 10 }, (_, i) => `BLV-${73000 + k * 10 + i}-1`)

const affecte = (k: number) => ({
  type: 'package.assigned',
  paquet: lot(k),
  colis: colisDuLot(k),
  livreur: 'Serge A.',
  entreprise: 'Yafé Express',
  creneau: null,
  relais: 'rel-z1-001',
  cle: 'vol-assigned-' + k,
  app: 'entreprise',
  le: LE - k * 60_000,
  n: LE - k * 60_000,
})

async function preparer(page: Page) {
  await figerHorloge(page)
  await page.addInitScript((evs) => {
    if (sessionStorage.getItem('blv_r_volume')) return
    sessionStorage.setItem('blv_r_volume', '1')
    localStorage.clear()
    localStorage.setItem('blv_r_theme', 'light')
    localStorage.setItem('blv_r_lang', 'fr')
    localStorage.setItem('blv_demo_debut', String(Date.now()))
    localStorage.setItem('blv_pont', JSON.stringify(evs))
  }, Array.from({ length: 15 }, (_, k) => affecte(k)))
}

async function verifier(page: Page, a: string, errs: string[], problemes: string[]) {
  errs.length = 0
  await page.goto(adresse(a))
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)
  const texte = await page.locator('body').innerText()
  if (/Quelque chose s.est mal passé/.test(texte)) problemes.push(a + ' : écran d’erreur')
  if (/\bNaN\b/.test(texte)) problemes.push(a + ' : NaN')
  if (/\bundefined\b|\[object /.test(texte)) problemes.push(a + ' : « undefined » affiché')
  for (const e of errs) problemes.push(a + ' : ' + e)
}

test('relais : 150 colis en stock', async ({ page }) => {
  test.setTimeout(600_000)
  page.setDefaultTimeout(15_000)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('exception : ' + e.message))
  const problemes: string[] = []
  await preparer(page)
  // Les lots annoncés : 150 colis attendus, gardés sur l'appareil ; puis mis en stock.
  await page.goto(adresse('#reception'))
  await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('blv_r_demo_colis') ?? '{"etat":{"colis":{}}}').etat.colis).some((id) => id.startsWith('BLV-73')))
  const n = await page.evaluate((le) => {
    const brut = JSON.parse(localStorage.getItem('blv_r_demo_colis')!)
    const cases = [...Array.from({ length: 6 }, (_, k) => `A-0${k + 1}`), ...Array.from({ length: 6 }, (_, k) => `B-0${k + 1}`), 'C-01', 'C-02']
    const miens = Object.values(brut.etat.colis as Record<string, { id: string; etat: string; emplacement: string | null; arrivee: { le: number | null; resultat: string | null; photo: string | null }; avisA: number | null; paiement: unknown; classe: string }>).filter((c) => c.id.startsWith('BLV-73'))
    miens.forEach((c, i) => {
      c.etat = i % 25 === 0 ? 'dernier_jour' : 'en_stock'
      c.emplacement = i % 11 === 10 ? null : cases[i % cases.length]
      c.arrivee = { ...c.arrivee, le: le - (i % 7) * 86_400_000, resultat: 'ok', photo: 'ph-vol-' + i }
      c.avisA = le - (i % 7) * 86_400_000 + 120_000
      if (i % 6 === 0) c.paiement = { mode: 'au_comptoir', montant: 5000 + i * 100, etat: 'a_payer', reference: null }
    })
    localStorage.setItem('blv_r_demo_colis', JSON.stringify(brut))
    return miens.length
  }, LE)
  expect(n).toBe(150)
  await page.goto(adresse('#stock'))
  await page.waitForTimeout(3000)
  expect(errs).toEqual([])
  await expect(page.getByText(/BLV-73\d{3}-1/).first()).toBeVisible({ timeout: 15_000 })

  const chemins = [...OUVERTES.map((r) => '#' + r), '#colis?ref=BLV-73000-1', '#colis?ref=BLV-73149-1', '#stock?etat=pay', '#inventaire']
  for (const a of chemins) await verifier(page, a, errs, problemes)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const a of chemins) await verifier(page, a, errs, problemes)
  expect(problemes).toEqual([])
})
