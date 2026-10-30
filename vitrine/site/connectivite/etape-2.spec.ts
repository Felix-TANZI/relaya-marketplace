// Étape 2 — client → vendeur : la commande (CAHIER-CONNECTIVITE.md). Carine choisit le Relais Bastos, achète la
// défroisseur vapeur Philips 3000 de Boutique B (la commande témoin) et paie en MTN MoMo : la commande entre dans « À préparer »
// du vendeur (Tonton PG = Boutique B) en moins de 5 s, sans rien du client. Le vendeur ouvre le bon : le client voit
// « Le vendeur prépare ton colis ». Une deuxième commande en rupture : le client la voit annulée et remboursée.
import { expect, test } from '@playwright/test'
import { contexte, ouvrir } from './commun'
import { acheter, choisirRelaisBastos } from './parcours'

test('la commande témoin payée côté client entre chez le vendeur ; prise en charge et rupture reviennent au client', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await contexte(browser)
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')

  await choisirRelaisBastos(client)
  const ref = await acheter(client, 'fer', 'Défroisseur vapeur Philips 3000')
  // Au plus 5 s : la commande est dans « À préparer » du vendeur, avec l'article du catalogue du client.
  const carte = vendeur.locator('.card.ord', { hasText: ref })
  await expect(carte).toContainText('Défroisseur vapeur Philips 3000', { timeout: 5000 })
  await expect(vendeur.locator('main')).not.toContainText('Carine')

  // Le vendeur ouvre le bon : le client voit la prise en charge (fil « En direct »).
  await vendeur.goto('/vendeur/bon?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Défroisseur vapeur Philips 3000')
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Le vendeur prépare ton colis', { timeout: 5000 })

  // Deuxième commande, en rupture chez le vendeur : annulée et remboursée côté client.
  const ref2 = await acheter(client, 'fer', 'Défroisseur vapeur Philips 3000')
  await vendeur.goto('/vendeur/commandes')
  await expect(vendeur.locator('.card.ord', { hasText: ref2 })).toBeVisible({ timeout: 5000 })
  await vendeur.goto('/vendeur/rupture?ref=' + ref2)
  await vendeur.getByRole('button', { name: 'Signaler la rupture' }).click()
  await expect(vendeur.locator('main')).toContainText('Rupture signalée pour ' + ref2, { timeout: 10_000 })
  await client.goto('/suivi?ref=' + ref2)
  await expect(client.locator('[data-en-direct]')).toContainText('Article en rupture : remboursé', { timeout: 5000 })
  // Le centre de notifications regroupe les mises à jour de la commande (paiement, puis remboursement).
  await client.goto('/notifications')
  await expect(client.locator('main')).toContainText('Paiement protégé · ' + ref2 + '66 837 F. Ton argent reste bloqué jusqu’à ton retrait.2 mises à jour')
  await ctx.close()
})
