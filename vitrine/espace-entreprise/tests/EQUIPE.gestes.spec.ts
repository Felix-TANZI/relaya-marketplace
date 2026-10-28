// Équipe : l'entreprise employeur de ses livreurs (DP-66, DP-67). Chaque décision passe par un motif écrit et un
// récapitulatif confirmé, s'inscrit à l'historique et part vers l'application du livreur de démonstration (Serge A.)
// par le pont ; droits par rôle : décisions au propriétaire et au gérant, horaires au répartiteur, attestation au
// comptable. Valeurs (préavis) lues dans le registre, jamais écrites ici.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'
import { PARAMETRES_FLOTTE } from '../src/calculs/flotte'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

type Ev = { type: string; app: string; livreurId?: string; [k: string]: unknown }
const lirePont = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as Ev[])
const section = (page: Page, id: string) => page.locator('#emploi-' + id)
async function deplier(page: Page, id: string) {
  const s = section(page, id)
  if ((await s.getAttribute('open')) === null) await s.locator('summary').click()
  return s
}
/** Motif, « Continuer », puis « Confirmer : … » dans la feuille. */
async function decider(page: Page, motif: string, confirmer: string) {
  const f = page.getByRole('dialog')
  await f.locator('textarea').fill(motif)
  await f.getByRole('button', { name: 'Continuer' }).click()
  await expect(f.getByText('Vérifiez avant de confirmer')).toBeVisible()
  await f.getByRole('button', { name: 'Confirmer : ' + confirmer }).click()
  await expect(f).toHaveCount(0)
}

test('suspendre avec une date de fin, puis réintégrer : motif écrit, confirmation, effet chez le livreur', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge&t=emploi'), FR)
  let s = await deplier(page, 'discipline')
  await s.getByRole('button', { name: 'Suspendre' }).click()
  const f = page.getByRole('dialog')
  await f.getByLabel('Fin de la suspension (facultative)').fill('2026-10-20')
  await decider(page, 'Colis remis sans photo deux fois cette semaine.', 'Suspendre')
  await expect(page.locator('.hero')).toContainText('Suspendu par votre entreprise')
  s = await deplier(page, 'discipline')
  await expect(s).toContainText('jusqu’au')
  let ev = (await lirePont(page)).find((e) => e.type === 'emploi_suspendu')!
  expect(ev).toMatchObject({ app: 'entreprise', livreurId: 'l-serge', motif: 'Colis remis sans photo deux fois cette semaine.' })
  expect(ev.jusqua).toBeGreaterThan(Date.parse('2026-10-20T00:00:00Z'))
  await s.getByRole('button', { name: 'Réintégrer' }).click()
  await decider(page, 'Point fait avec lui ce matin, consignes relues.', 'Réintégrer')
  await expect(page.locator('.hero')).not.toContainText('Suspendu')
  ev = (await lirePont(page)).find((e) => e.type === 'emploi_retabli')!
  expect(ev).toMatchObject({ livreurId: 'l-serge', motif: 'Point fait avec lui ce matin, consignes relues.' })
  const h = await deplier(page, 'historique')
  await expect(h).toContainText('Réintégration')
  await expect(h).toContainText('Gaëlle Wankeu')
})

test('avertissement écrit : rang suivant, historique, sans motif rien ne part', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-brice&t=emploi'), FR)
  const s = await deplier(page, 'discipline')
  await expect(s.locator('.eq-avert li')).toHaveCount(1)
  await s.getByRole('button', { name: 'Avertissement écrit' }).click()
  const f = page.getByRole('dialog')
  await expect(f.getByRole('button', { name: 'Continuer' })).toBeDisabled()
  await decider(page, 'Retard de 40 minutes au ramassage sans prévenir.', 'Envoyer l’avertissement')
  await expect(s.locator('.eq-avert li')).toHaveCount(2)
  await expect(s.locator('.eq-avert li').first()).toContainText('N° 2')
  await expect(await deplier(page, 'historique')).toContainText('Avertissement écrit n° 2')
})

test('fin de contrat à l’initiative de l’employeur : préavis du registre, départ ouvert, annulation', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge&t=emploi'), FR)
  const s = await deplier(page, 'fin')
  await s.getByRole('button', { name: 'Mettre fin au contrat' }).click()
  await decider(page, 'Réorganisation : la zone Bastos passe à un sous-traitant.', 'Mettre fin au contrat')
  await expect(page.locator('#depart')).toContainText('Fin de contrat décidée par votre entreprise')
  const ev = (await lirePont(page)).find((e) => e.type === 'fin_contrat')!
  expect(ev).toMatchObject({ livreurId: 'l-serge' })
  expect(Number(ev.preavisJusqua) - Number((ev as { le: number }).le)).toBe(PARAMETRES_FLOTTE.preavisDepartJours * 86_400_000)
  await expect(section(page, 'fin').locator('summary')).toContainText('préavis jusqu’au')
  await section(page, 'fin').getByRole('button', { name: 'Annuler la fin de contrat' }).click()
  await decider(page, 'Le sous-traitant a renoncé.', 'Annuler la fin de contrat')
  await expect(page.locator('#depart')).toHaveCount(0)
  expect((await lirePont(page)).some((e) => e.type === 'fin_contrat_annulee')).toBe(true)
})

test('attestation de travail : le comptable la télécharge depuis le registre, en PDF', async ({ page }) => {
  await ouvrir(page, adresse('equipe'), { ...FR, role: 'comptable' })
  await expect(page.locator('h1', { hasText: 'Registre du personnel' })).toBeVisible()
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Attestation de travail de Junior T.' }).click()
  const d = await telechargement
  expect(d.suggestedFilename()).toBe('attestation-travail-junior.pdf')
  // Anciens : leur attestation reste disponible.
  await page.getByRole('button', { name: /^Anciens/ }).click()
  await expect(page.getByRole('button', { name: 'Attestation de travail de Pauline K.' })).toBeVisible()
})

test('droits : le répartiteur règle les horaires mais ne décide pas ; le gérant décide ; le comptable n’organise pas', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge&t=emploi'), { ...FR, role: 'repartiteur' })
  const d = await deplier(page, 'discipline')
  await expect(d.getByRole('button', { name: 'Avertissement écrit' })).toHaveCount(0)
  await expect(d).toContainText('Avertir, suspendre ou réintégrer : réservé à Propriétaire / Gérant.')
  const h = await deplier(page, 'horaires')
  await h.getByRole('button', { name: 'Modifier les horaires' }).click()
  const f = page.getByRole('dialog')
  await f.getByLabel('Samedi · fin').fill('12:00')
  await f.getByRole('button', { name: 'Enregistrer et prévenir le livreur' }).click()
  await expect(h).toContainText('12:00')
  const ev = (await lirePont(page)).find((e) => e.type === 'horaires_changes')!
  expect(ev.creneaux).toContainEqual({ jour: 5, de: '07:30', a: '12:00' })

  await ouvrir(page, adresse('livreur', 'id=l-brice&t=emploi'), { ...FR, role: 'gerant' })
  await expect((await deplier(page, 'discipline')).getByRole('button', { name: 'Avertissement écrit' })).toBeVisible()
  await expect((await deplier(page, 'fin')).getByRole('button', { name: 'Mettre fin au contrat' })).toBeVisible()

  await ouvrir(page, adresse('livreur', 'id=l-brice&t=emploi'), { ...FR, role: 'comptable' })
  await expect((await deplier(page, 'horaires')).getByRole('button', { name: 'Modifier les horaires' })).toHaveCount(0)
  await expect((await deplier(page, 'attestation')).getByRole('button', { name: 'Télécharger l’attestation' })).toBeVisible()
  await expect(section(page, 'discipline').locator('.eq-avert')).toHaveCount(0)
})
