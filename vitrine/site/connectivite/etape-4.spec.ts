// Étape 4 — livreur ↔ vendeur : le ramassage (CAHIER-CONNECTIVITE.md). La commande témoin affectée à Serge A. : il
// démarre le paquet, arrive chez Tonton PG (Boutique B), contrôle et photographie le défroisseur, l'emballe et le
// scelle, saisit le code de remise que lui donne le vendeur : le vendeur voit « Remis au livreur », l'entreprise
// l'arrêt fait, le client « Ramassé ». Puis, sur une autre commande, un refus motivé au ramassage, visible chez le
// vendeur et remboursé au client.
import { expect, test } from '@playwright/test'
import { contexte, journal, ouvrir } from './commun'
import { arriver, codeDuVendeur, controler, recuperer, demarrerPaquet, emballer, jusquAuLivreur, PAQUET_TEMOIN, photo, re, taperCode } from './parcours'

test('ramassage complet de la commande témoin : remis au livreur, ramassé, arrêt fait chez l’entreprise', async ({ browser }) => {
  test.setTimeout(240_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const ref = await jusquAuLivreur(client, vendeur, entreprise)
  const code = await codeDuVendeur(vendeur, ref)
  expect(code).toMatch(/^\d{6}$/)

  await demarrerPaquet(livreur)
  await arriver(livreur)
  await expect(livreur).toHaveURL(/\/arrivee\?a=/)
  await recuperer(livreur)
  await expect(livreur.locator('main')).toContainText('Défroisseur vapeur Philips 3000')
  await controler(livreur)
  await emballer(livreur, '8209')
  await expect(livreur).toHaveURL(/\/code-remise/)
  await taperCode(livreur, code)
  await livreur.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(livreur.getByRole('heading', { name: 'Remise validée' })).toBeVisible()

  // Le vendeur : remis au livreur ; le client : ramassé ; l'entreprise : l'arrêt de ramassage fait.
  await vendeur.goto('/vendeur/commande?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Remis', { timeout: 5000 })
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Ramassé', { timeout: 5000 })
  const types = (await journal(entreprise)).map((e) => e.type)
  expect(types).toEqual(expect.arrayContaining(['courier.arrived', 'parcel.collected', 'arret']))
  await entreprise.goto('/entreprise/paquet?id=' + PAQUET_TEMOIN)
  await expect(entreprise.locator('main')).toContainText('Serge A.')
  await ctx.close()
})

test('refus motivé au ramassage sur une autre commande : visible chez le vendeur, remboursé au client', async ({ browser }) => {
  test.setTimeout(240_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const ref = await jusquAuLivreur(client, vendeur, entreprise)
  await demarrerPaquet(livreur)
  await arriver(livreur)
  await livreur.goto(`/livreur/refus?a=${PAQUET_TEMOIN}%230&c=${ref}-1`)
  await livreur.getByRole('radio', { name: re('Abîmé') }).click()
  await livreur.getByRole('button', { name: re('Continuer : photo et note') }).click()
  await photo(livreur)
  await livreur.getByLabel(re('Note : ce que vous constatez')).fill('Réservoir fendu sur le côté, visible avant emballage.')
  await livreur.getByRole('button', { name: re('Envoyer le refus') }).click()
  await expect(livreur.locator('main').getByRole('heading', { name: 'Refus envoyé' })).toBeVisible({ timeout: 10_000 })

  await vendeur.goto('/vendeur/notifications')
  await expect(vendeur.locator('main')).toContainText('Refusé au ramassage · ' + ref, { timeout: 5000 })
  await expect(vendeur.locator('main')).toContainText('Article abîmé')
  await vendeur.goto('/vendeur/journal?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Refusé au ramassage')
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Refusé au ramassage : remboursé', { timeout: 5000 })
  await ctx.close()
})
