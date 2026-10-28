// Étape 11 — la console et les candidatures, les descentes et la fin de convention, de bout en bout (même origine) :
// une entreprise candidate depuis /entreprise/candidature ; la candidature arrive dans « Candidatures des partenaires »
// de la console sous sa dénomination ; pièces manquantes, la console demande un complément : la décision redescend et
// l'entreprise la lit sur sa page de suivi.
// Les Opérations planifient l'inspection du Relais Bastos Carrefour : le relais est prévenu (notification).
import { expect, test } from '@playwright/test'
import { CHEMIN, contexte, journal, ouvrir } from './commun'

const MOTIF = 'Merci d’envoyer l’autorisation de transport et l’assurance des véhicules pour compléter le dossier.'

test('candidature d’une entreprise : reçue par la console, complément demandé, la décision redescend', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await contexte(browser)
  const ent = await ouvrir(ctx, 'entreprise', 'candidature')
  await ent.locator('#cand-denomination').fill('Kribi Express Livraison')
  await ent.locator('#cand-rccm').fill('CM-YAO-2024-B-01234')
  await ent.locator('#cand-niu').fill('M012345678901A')
  // Candidature en trois étapes courtes (Entreprise, Zones, Responsable).
  await ent.getByRole('button', { name: 'Continuer' }).click()
  await ent.getByRole('button', { name: /Z3 · / }).click()
  await ent.locator('#cand-livreurs').fill('6')
  await ent.getByRole('button', { name: 'Continuer' }).click()
  await ent.locator('#cand-responsable').fill('Joël Ondoa')
  await ent.locator('#cand-numero').fill('699112233')
  await ent.getByRole('button', { name: /Envoyer/ }).click()
  await expect(ent.locator('[data-candidature-recue]')).toBeVisible()
  await expect(ent.locator('[data-suivi-candidatures]')).toContainText('en vérification')
  const e = (await journal(ent)).find((x) => x.type === 'account.requested' && x.app === 'entreprise')!
  expect(e).toMatchObject({ denomination: 'Kribi Express Livraison', zones: ['Z3'], livreurs: 6 })

  const admin = await ouvrir(ctx, 'admin', 'candidatures?role=verification')
  const carte = admin.locator('section', { hasText: String(e.dossier) })
  await expect(carte).toContainText('Kribi Express Livraison')
  await carte.getByRole('button', { name: 'Demander un complément' }).click()
  const f = admin.locator('.sheet').last()
  await f.locator('textarea').fill(MOTIF)
  await f.locator('.btn.primary').click()
  await expect(admin.locator('main')).toContainText('décision appliquée')

  await ent.goto(CHEMIN.entreprise + 'candidature')
  await expect(ent.locator('[data-suivi-candidatures]')).toContainText('Complément demandé', { timeout: 10_000 })
})

test('inspection annoncée : le relais est prévenu', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await contexte(browser)
  const admin = await ouvrir(ctx, 'admin', 'descentes?role=operations')
  await admin.getByRole('button', { name: /^Planifier/ }).first().click()
  const f = admin.locator('.sheet')
  await f.getByLabel('Lieu ou dossier').selectOption({ label: 'Relais Bastos Carrefour · Z1' })
  await f.getByRole('button', { name: 'Planifier', exact: true }).click()
  await expect(f.getByRole('status')).toContainText('planifiée')

  const relais = await ouvrir(ctx, 'relais', 'notifications')
  await expect(relais.locator('main')).toContainText('Inspection prévue', { timeout: 15_000 })
  expect((await journal(relais)).some((x) => x.type === 'inspection_annoncee' && x.relais === 'rel-z1-001')).toBe(true)
})
