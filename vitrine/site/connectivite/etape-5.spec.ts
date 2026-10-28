// Étape 5 — transport et remise : livreur → relais (CAHIER-CONNECTIVITE.md). La commande témoin ramassée par Serge A.
// est déposée au Relais Bastos Carrefour : Serge présente son code de dépôt, Rose M. reçoit le colis (scellé intact),
// photographie et valide le lot sous PIN, Serge confirme : la garde passe au relais. Le colis est dans le stock de Rose,
// « Prêt au retrait » côté client (code de retrait après paiement), « Déposé au relais » chez le vendeur.
import { expect, test } from '@playwright/test'
import { contexte, journal, ouvrir } from './commun'
import { arriver, codeDuVendeur, demarrerPaquet, deposerAuRelais, jusquAuLivreur, photo, PIN_RELAIS, ramasserTemoin, re, taperCode } from './parcours'

test('la commande témoin déposée au Relais Bastos : en stock chez Rose, « Prêt au retrait » chez le client', async ({ browser }) => {
  test.setTimeout(300_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const relais = await ouvrir(ctx, 'relais')
  const ref = await jusquAuLivreur(client, vendeur, entreprise)
  const code = await codeDuVendeur(vendeur, ref)
  await demarrerPaquet(livreur)
  await ramasserTemoin(livreur, code)
  await deposerAuRelais(livreur, relais, [ref + '-1'], PIN_RELAIS)

  // Dans le stock de Rose : le colis rangé, 1er jour gratuit, le client prévenu ; aucune donnée du client ni du vendeur.
  await relais.goto('/relais/colis?ref=' + ref + '-1')
  await expect(relais.locator('main')).toContainText(ref + '-1', { timeout: 5000 })
  await expect(relais.locator('main')).toContainText('RANGÉ EN')
  await expect(relais.locator('main')).toContainText('Client prévenu')
  await expect(relais.locator('main')).not.toContainText('Carine')
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Prêt au retrait', { timeout: 5000 })
  await expect(client.locator('main')).toContainText('Retirable maintenant')
  await vendeur.goto('/vendeur/journal?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Déposé au relais', { timeout: 5000 })
  const types = (await journal(relais)).map((e) => e.type)
  expect(types).toEqual(expect.arrayContaining(['relay.drop_code.verified', 'relay.drop.validated', 'relay.drop.completed', 'parcel.arrival_notice', 'parcel.pickup_code']))
  await ctx.close()
})

// À domicile : la même commande livrée chez Carine. Serge part vers elle : elle le suit en direct (« En route vers
// toi », heure estimée) ; il arrive, elle lui donne le code de réception lu dans son suivi, il photographie la remise et
// valide : « Livré » chez le client, « Remis au client » chez le vendeur, l'arrêt fait chez l'entreprise.
test('la commande témoin livrée à domicile : suivi en direct, code de réception, photo, « Livré » partout', async ({ browser }) => {
  test.setTimeout(300_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const ref = await jusquAuLivreur(client, vendeur, entreprise, 'À domicile')
  const code = await codeDuVendeur(vendeur, ref)
  await demarrerPaquet(livreur)
  await ramasserTemoin(livreur, code)

  // En route : l'itinéraire vers la cliente publie l'heure estimée ; le client la voit en direct.
  await livreur.goto('/livreur/tournee')
  await livreur.getByRole('link', { name: re('Itinéraire') }).first().click()
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('En route vers toi', { timeout: 5000 })
  const reception = (await client.locator('[data-code-reception]').innerText()).replace(/\D/g, '').slice(0, 6)
  expect(reception).toMatch(/^\d{6}$/)

  // Sur place : le code de la cliente, la photo de remise, « Valider la remise ».
  await livreur.goto('/livreur/tournee')
  await arriver(livreur)
  await expect(livreur).toHaveURL(/\/domicile\?a=/)
  await taperCode(livreur, reception)
  await photo(livreur)
  await livreur.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(livreur.getByText(re('La remise est validée par le serveur'))).toBeVisible({ timeout: 10_000 })

  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Livré', { timeout: 5000 })
  await vendeur.goto('/vendeur/journal?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Remis au client', { timeout: 5000 })
  const types = (await journal(client)).map((e) => e.type)
  expect(types).toEqual(expect.arrayContaining(['home.departed', 'parcel.delivered']))
  await ctx.close()
})
