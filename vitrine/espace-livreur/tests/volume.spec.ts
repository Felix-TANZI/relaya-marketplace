// Données de démo qui grossissent (tests, présentation) : aucune page de l'espace livreur ne plante. Le pont commun
// reçoit de l'entreprise un paquet de 40 arrêts (ramassages, dépôts au relais, remises à domicile, collectes ; lieux
// avec et sans position) et 8 paquets de plus ; le livreur démarre le grand paquet : la tournée du jour passe à 47 arrêts. Puis chaque écran
// s'ouvre, téléphone et ordinateur : ni écran d'erreur, ni « NaN », ni erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'

const LE = Date.UTC(2026, 9, 13, 12, 30)
const TYPES = ['ramassage', 'relais', 'domicile', 'collecte', 'ramassage', 'domicile', 'retour'] as const
const QUARTIERS = ['Bastos', 'Nlongkak', 'Mvog-Ada', 'Essos', 'Quartier inconnu']

function affectation(k: number, arrets: number) {
  const paquetId = `PQ-Z1-261013-${String(100 + k).padStart(3, '0')}`
  return {
    type: 'affectation',
    paquetId,
    paquet: {
      genre: (['relais', 'domicile', 'retour'] as const)[k % 3],
      zone: 'Z1 Centre-ville',
      heureLimite: LE + (k === 0 ? 2 : 4 + k) * 3600_000,
      distanceKm: 3.5 + k,
      arrets: Array.from({ length: arrets }, (_, i) => ({
        id: `V${k}-${i + 1}`,
        type: TYPES[i % TYPES.length],
        nom: 'Arrêt de volume ' + (i + 1),
        quartier: QUARTIERS[i % QUARTIERS.length],
        colis: Array.from({ length: 1 + (i % 2) }, (_, j) => ({ id: `BLV-${72000 + k * 100 + i}-${j + 1}`, classe: (['XL', 'S', 'HG', 'XL', 'M'] as const)[(i + j) % 5], valeur: 2500 + i * 700, fragile: i % 4 === 0, payable: i % 5 === 0 })),
        creneau: i % 2 ? (['14:00', '16:00'] as [string, string]) : null,
        position: i % 3 === 2 ? null : { lat: 3.87 + i * 0.001, lng: 11.51 + i * 0.001 },
        repere: i % 2 ? 'Portail bleu' : null,
      })),
    },
    cle: 'vol-affectation-' + k,
    app: 'entreprise',
    le: LE - k * 60_000,
    n: LE - k * 60_000,
  }
}

async function preparer(page: Page) {
  await figerHorloge(page)
  await page.addInitScript((evs) => {
    if (sessionStorage.getItem('blv_l_volume')) return
    sessionStorage.setItem('blv_l_volume', '1')
    localStorage.clear()
    localStorage.setItem('blv_l_theme', 'light')
    localStorage.setItem('blv_l_lang', 'fr')
    localStorage.setItem('blv_demo_debut', String(Date.now()))
    localStorage.setItem('blv_pont', JSON.stringify(evs))
  }, [affectation(0, 40), ...Array.from({ length: 8 }, (_, k) => affectation(k + 1, 3 + k))])
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

test('livreur : tournée de 40 arrêts et 8 paquets de plus', async ({ page }) => {
  test.setTimeout(600_000)
  page.setDefaultTimeout(15_000)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('exception : ' + e.message))
  const problemes: string[] = []
  await preparer(page)
  // Le paquet de 40 arrêts est reçu (affecté, notifié).
  await page.goto(adresse('#paquet?id=PQ-Z1-261013-100'))
  await expect(page.getByText('PQ-Z1-261013-100').first()).toBeVisible()
  // Le livreur démarre ce paquet (heure limite la plus proche) : ses 40 arrêts entrent dans la tournée du jour.
  await page.getByRole('button', { name: 'Démarrer la tournée' }).click()
  await page.goto(adresse('#tournee'))
  await expect(page.getByText(/Arrêt de volume/).first()).toBeVisible()
  const chemins = [
    ...OUVERTES.map((r) => '#' + r),
    '#paquet?id=PQ-Z1-261013-100',
    '#paquet?id=PQ-Z1-261013-108',
    '#statut?paquet=PQ-Z1-261013-100',
    '#tournee?arret=V0-40',
  ]
  for (const a of chemins) await verifier(page, a, errs, problemes)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const a of chemins) await verifier(page, a, errs, problemes)
  expect(problemes).toEqual([])
})
