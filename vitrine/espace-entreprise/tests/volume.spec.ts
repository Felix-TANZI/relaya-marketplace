// Données de démo qui grossissent (tests, présentation) : aucune page de l'espace entreprise ne plante. Le pont commun
// reçoit 60 colis « prêts » chez le vendeur (60 paquets publiés, relais et domicile, plusieurs zones et classes) ; la
// flotte passe à plus de 30 livreurs (fiches du jeu d'essai recopiées après un geste qui garde l'état sur l'appareil).
// Puis chaque écran s'ouvre, téléphone et ordinateur : ni écran d'erreur, ni « NaN », ni erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'

const pret = (i: number, le: number) => {
  const domicile = i % 3 === 0
  return {
    type: 'suborder.ready',
    commande: 'BLV-' + (71000 + i),
    colis: `BLV-${71000 + i}-1`,
    classe: (['S', 'M', 'L', 'XL'] as const)[i % 4],
    valeur: 4000 + i * 900,
    lieu: i % 5 === 4 ? 'b-inconnu-' + i : 'b-tontonnl',
    zone: ['Z1', 'Z2', 'Z3', 'Z6'][i % 4],
    relais: domicile ? null : 'rel-z1-001',
    quartier: domicile ? ['Nlongkak', 'Bastos', 'Mvog-Ada', 'Quartier inconnu'][i % 4] : null,
    photo: true,
    cle: 'vol-ready-' + i,
    app: 'vendeur',
    le: le - i * 60_000,
    n: le - i * 60_000,
  }
}

async function preparer(page: Page) {
  await figerHorloge(page)
  await page.addInitScript((evs) => {
    if (sessionStorage.getItem('blv_e_volume')) return
    sessionStorage.setItem('blv_e_volume', '1')
    localStorage.clear()
    localStorage.setItem('blv_e_theme', 'light')
    localStorage.setItem('blv_e_lang', 'fr')
    localStorage.setItem('blv_demo_debut', String(Date.now()))
    localStorage.setItem('blv_pont', JSON.stringify(evs))
  }, [
    ...Array.from({ length: 60 }, (_, i) => pret(i, Date.UTC(2026, 9, 13, 12, 50))),
    { type: 'piece_envoyee', piece: 'selfie', cle: 'vol-piece', app: 'livreur', le: Date.UTC(2026, 9, 13, 12, 0), n: Date.UTC(2026, 9, 13, 12, 0) },
  ])
}

async function verifier(page: Page, a: string, errs: string[], problemes: string[]) {
  errs.length = 0
  await page.goto(a)
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)
  const texte = await page.locator('body').innerText()
  if (/Quelque chose s.est mal passé/.test(texte)) problemes.push(a + ' : écran d’erreur')
  if (/\bNaN\b/.test(texte)) problemes.push(a + ' : NaN')
  if (/\bundefined\b|\[object /.test(texte)) problemes.push(a + ' : « undefined » affiché')
  for (const e of errs) problemes.push(a + ' : ' + e)
}

test('entreprise : 60 paquets publiés et 30 livreurs de plus', async ({ page }) => {
  test.setTimeout(600_000)
  page.setDefaultTimeout(15_000)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('exception : ' + e.message))
  const problemes: string[] = []
  await preparer(page)

  // Une pièce renvoyée par le livreur (pont) garde la flotte sur l'appareil ; puis 30 livreurs de plus, recopiés des fiches.
  await page.goto(adresse('livreur', 'id=l-serge'))
  await expect(page.getByRole('heading', { name: 'Serge A.' }).first()).toBeVisible()
  await page.waitForFunction(() => !!localStorage.getItem('blv_e_demo_livreurs'))
  const n = await page.evaluate(() => {
    const brut = JSON.parse(localStorage.getItem('blv_e_demo_livreurs')!)
    const modeles = brut.etat.livreurs as { id: string; nom: string; telephone: string; statut: string; vehiculeId: string | null }[]
    const ajout = Array.from({ length: 30 }, (_, i) => {
      const m = structuredClone(modeles[i % modeles.length])
      return { ...m, id: 'l-vol-' + i, nom: 'Livreur Volume ' + i, initiales: 'LV', telephone: '+2376900' + String(10000 + i), vehiculeId: i % 2 ? m.vehiculeId : null }
    })
    brut.etat.livreurs.push(...ajout)
    localStorage.setItem('blv_e_demo_livreurs', JSON.stringify(brut))
    return brut.etat.livreurs.length
  })
  expect(n).toBeGreaterThanOrEqual(40)
  // Les paquets du pont sont publiés.
  await page.goto(adresse('paquets'))
  await expect(page.getByText(/PQ-Z\d-\d{6}-0[2-7]\d/).first()).toBeVisible()

  const chemins = [
    ...OUVERTES.map((r) => adresse(r)),
    adresse('livreur', 'id=l-vol-0'),
    adresse('livreur', 'id=l-vol-29'),
    adresse('paquet', 'id=PQ-Z1-261013-020'),
    adresse('paquet', 'id=PQ-Z2-261013-020'),
    adresse('affectation', 'id=PQ-Z2-261013-020'),
  ]
  for (const a of chemins) await verifier(page, a, errs, problemes)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const a of chemins) await verifier(page, a, errs, problemes)
  expect(problemes).toEqual([])
})
