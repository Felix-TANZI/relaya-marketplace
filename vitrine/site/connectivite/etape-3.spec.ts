// Étape 3 — vendeur → entreprise de livraison : « C'est prêt » (CAHIER-CONNECTIVITE.md). La commande témoin payée par
// Carine (le défroisseur de Boutique B, au Relais Bastos) : le vendeur marque « C'est prêt » ; le client voit « Prêt,
// livreur bientôt affecté » ; le paquet est publié chez Yafé Express (BelivaY n'affecte jamais) ; Yafé l'accepte et
// l'affecte à Serge A. : le paquet apparaît chez le livreur, le vendeur et le client voient Serge A. de Yafé Express.
import { expect, test } from '@playwright/test'
import { contexte, ouvrir } from './commun'
import { PAQUET_TEMOIN, acheter, choisirRelaisBastos } from './parcours'

test('« C’est prêt » publie le paquet chez Yafé Express ; l’affectation à Serge A. apparaît chez le livreur, le vendeur et le client', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await contexte(browser)
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const livreur = await ouvrir(ctx, 'livreur')

  await choisirRelaisBastos(client)
  const ref = await acheter(client, 'fer', 'Défroisseur vapeur Philips 3000')
  await vendeur.goto('/vendeur/commandes')
  const carte = vendeur.locator('.card.ord', { hasText: ref })
  await expect(carte).toBeVisible({ timeout: 5000 })
  await carte.getByText('C’est prêt').click()
  await expect(vendeur).toHaveURL(new RegExp('commande_prete\\?ref=' + ref))
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Prêt, livreur bientôt affecté', { timeout: 5000 })

  await entreprise.goto('/entreprise/paquets')
  const pq = entreprise.locator('article.entb-pq', { hasText: PAQUET_TEMOIN })
  await expect(pq).toBeVisible({ timeout: 5000 })
  await expect(pq).not.toContainText('Carine')
  await expect(pq).toContainText('1 colis')
  await pq.getByRole('button', { name: 'Accepter', exact: true }).click()
  // « Annuler » pendant 5 s, puis l'acceptation part.
  await expect(entreprise.getByText(new RegExp('Paquet ' + PAQUET_TEMOIN + ' accepté\\s:\\saffectez'))).toBeVisible({ timeout: 15_000 })
  await entreprise.goto('/entreprise/affectation?id=' + PAQUET_TEMOIN)
  await entreprise.getByRole('button', { name: 'Affecter Serge A.' }).first().click()
  await expect(entreprise.getByText(/Serge A\. est affecté/)).toBeVisible({ timeout: 15_000 })

  await livreur.goto('/livreur/')
  await expect(livreur.locator('main')).toContainText(PAQUET_TEMOIN, { timeout: 5000 })
  await vendeur.goto('/vendeur/commande?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Serge A.', { timeout: 5000 })
  await expect(vendeur.locator('main')).toContainText('Yafé Express')
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-livreur]')).toContainText('Serge A. · Yafé Express', { timeout: 5000 })
  await expect(client.locator('[data-en-direct]')).toContainText('Livreur affecté')
  await ctx.close()
})
