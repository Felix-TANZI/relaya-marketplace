// Gestes des remises (LIV-07 : P16 relais, P17-P18 domicile, P19 départs, P20 retour) : QR de dépôt et code de dépôt,
// résultats de la gérante en miroir, refus accepté en miroir avant la confirmation, garde transférée ; départs
// confirmés colis par colis ; retour avec code du vendeur et photo ; à domicile (toujours payé en ligne), code de la cliente
// et photo ; remise impossible avec preuves cochées par le système.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { arriver, photo, ramasser, ramasserA2, re, taperCode } from './LIV-06.parcours'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

async function deposerA3(page: Page) {
  await page.goto('tournee')
  await arriver(page, 'Je suis au relais')
  await expect(page).toHaveURL(/\/depot-relais\?a=A3/)
  await expect(page.locator('.lr-code')).toHaveText('418306')
  await expect(page.getByText(re('Aucun colis ne quitte votre garde sans le scan de la gérante'))).toBeVisible()
  const confirmer = page.getByRole('button', { name: re('Confirmer la remise du lot') })
  await expect(confirmer).toBeDisabled()
  await page.getByRole('button', { name: re('Elle scanne : une réserve et un refus') }).click()
  await expect(confirmer).toBeDisabled() // un refus et une réserve attendent leur constat en miroir
  await page.getByRole('button', { name: re('J’accepte le constat en miroir') }).click()
  await page.getByRole('button', { name: re('J’accepte la réserve en miroir') }).click() // PR-RC-08 : la réserve aussi
  await confirmer.click()
  await page.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect(page.getByText(re('Dépôt complet · garde transférée'))).toBeVisible()
  await expect(page.getByText(re('Garde transférée à'))).toBeVisible()
  await expect(page.getByText(re('1 colis refusé repart avec vous'))).toBeVisible()
  const recu = page.waitForEvent('download')
  await page.getByRole('button', { name: re('Reçu de dépôt (PDF)') }).click()
  expect((await recu).suggestedFilename()).toMatch(/^recu-depot-.+\.pdf$/)
}

async function collecterA4EtRetournerA5(page: Page) {
  await page.getByRole('link', { name: re('Collecter les départs') }).click()
  await arriver(page)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: re('Elle présente le colis suivant') }).click()
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  }
  await page.getByRole('button', { name: re('Continuer vers Tech Bastos') }).click()
  await expect(page.getByText('Collecte terminée')).toBeVisible()
  await page.getByRole('link', { name: re('Continuer vers Tech Bastos') }).click()
  await expect(page).toHaveURL(/\/retour-vendeur\?a=A5/)
  await arriver(page)
  await expect(page.getByText(re('Vous avez 48 heures pour inspecter BV 24 7741'))).toBeVisible()
  await expect(page.getByRole('button', { name: /ouvrir/i })).toHaveCount(0)
  await taperCode(page, '518204')
  await photo(page)
  await page.getByRole('button', { name: re('Valider le retour') }).click()
  await expect(page.getByRole('heading', { name: 'Retourné au vendeur' })).toBeVisible()
}

async function jusquADomicile(page: Page) {
  await ramasserA2(page)
  await deposerA3(page)
  await collecterA4EtRetournerA5(page)
  await ramasser(page, [{ etiquette: '8208' }], '640277')
  await page.goto('tournee')
  await expect(page.getByRole('heading', { name: re('Solange · Bastos') })).toBeVisible()
  await arriver(page)
  await expect(page).toHaveURL(/\/domicile\?a=A7/)
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#tournee', CLAIR)
})

test('relais, départs, retour, puis domicile : payé en ligne, remise avec code et photo', async ({ page }) => {
  test.setTimeout(300_000)
  await jusquADomicile(page)
  // Le client a toujours payé en ligne : aucun paiement ni encaissement à la porte, le code s'ouvre tout de suite.
  await expect(page.getByText('Payé en ligne').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/paiement sur place|payable au retrait|encaiss|espèce/i)
  await expect(page.getByText(re('Tendez votre téléphone à Solange'))).toBeVisible()
  await taperCode(page, '772041')
  await photo(page)
  await page.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(page.getByRole('heading', { name: /^Remis ·/ })).toBeVisible()
})

test('remise impossible : lieu dangereux, note exigée, suite décidée par le système', async ({ page }) => {
  test.setTimeout(300_000)
  await jusquADomicile(page)
  await page.getByRole('button', { name: 'Un problème ?' }).click()
  await page.getByRole('link', { name: re('Lieu dangereux') }).click()
  await expect(page.getByRole('heading', { name: re('N’y allez pas') })).toBeVisible()
  const enregistrer = page.getByRole('button', { name: re('Envoyer le signalement') })
  await expect(enregistrer).toBeDisabled()
  await page.getByLabel(re('Ce qui rend le lieu dangereux')).fill('Attroupement agressif devant le portail, je ne peux pas approcher.')
  await enregistrer.click()
  await expect(page.getByText(re('Suite décidée par le système. Vous n’avez rien à choisir.'))).toBeVisible()
  await page.getByRole('link', { name: re('Aller au Relais Bastos Carrefour') }).click()
  await expect(page.locator('.lv-liste').last()).toContainText(re('dépôt au relais'))
})

test('relais hors ligne : registre papier, trois vérifications et photo ; départs : colis manquant signalé ; retour : vendeur absent', async ({ page }) => {
  test.setTimeout(300_000)
  await ramasserA2(page)
  await page.goto('tournee')
  await arriver(page, 'Je suis au relais')
  await expect(page).toHaveURL(/\/depot-relais\?a=A3/)
  await page.getByRole('button', { name: re('Relais hors ligne') }).click()
  const confirmer = page.getByRole('button', { name: re('Confirmer la remise sur registre') })
  await expect(confirmer).toBeDisabled()
  for (const c of await page.getByRole('checkbox').all()) await c.click()
  await expect(confirmer).toBeDisabled() // la photo du registre signé manque encore
  await photo(page)
  await confirmer.click()
  await expect(page.getByText(re('Dépôt sur registre papier'))).toBeVisible()
  // Départs : « Continuer » attend que chaque colis soit confirmé ou signalé manquant.
  await page.getByRole('link', { name: re('Collecter les départs') }).click()
  await arriver(page)
  const continuer = page.getByRole('button', { name: re('Continuer vers Tech Bastos') })
  await expect(continuer).toBeDisabled()
  await page.getByRole('button', { name: re('Elle présente le colis suivant') }).click()
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await expect(continuer).toBeDisabled()
  await page.getByRole('button', { name: /^Signaler .* manquant$/ }).click()
  await expect(page.getByText(re('Envoi dans'))).toBeVisible()
  await expect(page.getByText(re('n’a pas été présenté'))).toBeVisible({ timeout: 10_000 })
  await continuer.click()
  await expect(page.getByText('Collecte terminée')).toBeVisible()
  // Retour : vendeur absent, photo exigée avant de rapporter au relais de la zone.
  await page.getByRole('link', { name: re('Continuer vers Tech Bastos') }).click()
  await arriver(page)
  await page.getByRole('button', { name: re('Vendeur absent') }).click()
  const rapporter = page.getByRole('button', { name: re('Rapporter au relais de la zone') })
  await expect(rapporter).toBeDisabled()
  await photo(page)
  await rapporter.click()
  await expect(page.getByText(re('Envoi dans'))).toBeVisible()
  await expect(page.getByRole('link', { name: re('Aller au Relais Bastos Carrefour') })).toBeVisible({ timeout: 10_000 })
})

test('remise impossible : aucun motif de paiement, le client a toujours payé en ligne', async ({ page }) => {
  test.setTimeout(300_000)
  await jusquADomicile(page)
  await page.goto('echec-domicile?a=A7')
  await expect(page.getByRole('radio', { name: re('Client absent') })).toBeVisible()
  await expect(page.getByRole('radio', { name: /payer/ })).toHaveCount(0)
})
