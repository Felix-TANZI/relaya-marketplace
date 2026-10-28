// Étape 8 — l'argent (CAHIER-CONNECTIVITE.md). La commande témoin retirée, chaque interface montre sa part, calculée
// par les mêmes règles BV-DEV v2.0 (DP-69, oracle BV-DEV-07) : le client paie 65 000 F + 500 F de livraison (colis C1
// au relais 1 400 F, 900 F offerts dès 30 000 F, R07) en Mobile Money ⌈65 500 × 100 ÷ 98⌉ = 66 837 F (R02) ; le vendeur
// (Bronze, électroménager, famille A) paie 4 950 F de commission et 601 F de frais de versement (1 %, R22) et garde
// 59 449 F ; l'entreprise touche sa grille (600 F), jamais plus que le plafond d'achat R54 (950 F pour un C1 au relais) ;
// le relais touche son gain du colis. Les montants concordent : 66 837 − 1 337 = 59 449 + 601 + 4 950 + 500.
import { expect, test } from '@playwright/test'
import { contexte, ouvrir } from './commun'
import { codeDuVendeur, codeRetrait, demarrerPaquet, deposerAuRelais, jusquAuLivreur, PAQUET_TEMOIN, PIN_RELAIS, ramasserTemoin, re, retirer } from './parcours'

test('les montants de la commande témoin concordent d’une interface à l’autre', async ({ browser }) => {
  test.setTimeout(300_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const relais = await ouvrir(ctx, 'relais')
  const ref = await jusquAuLivreur(client, vendeur, entreprise)
  await demarrerPaquet(livreur)
  await ramasserTemoin(livreur, await codeDuVendeur(vendeur, ref))
  await deposerAuRelais(livreur, relais, [ref + '-1'], PIN_RELAIS)
  await retirer(relais, codeRetrait(ref), PIN_RELAIS)
  const touche = await relais.getByText(/Vous\stouchez\s[\d\s ]+\sF/).first().innerText()
  const gainRelais = Number(/Vous\stouchez\s([\d\s\u00a0\u202f]+)\sF/.exec(touche)![1].replace(/\D/g, ''))
  expect(gainRelais).toBeGreaterThan(0)

  const CLIENT = 66837, CAMPAY = 1337, LIVRAISON = 500, COMMISSION = 4950, FRAIS = 601, NET = 59449, COURSE = 600, COURSE_MAX = 950
  expect(COURSE).toBeLessThanOrEqual(COURSE_MAX)
  expect(CLIENT - CAMPAY).toBe(NET + FRAIS + COMMISSION + LIVRAISON)
  // BelivaY ne perd jamais (DP-55) : commission et livraison payée couvrent la course de l'entreprise et le gain du relais.
  expect(COMMISSION + LIVRAISON).toBeGreaterThanOrEqual(COURSE + gainRelais)

  await client.goto('/notifications')
  await expect(client.locator('main')).toContainText(re('Paiement protégé · ' + ref) , { timeout: 5000 })
  await expect(client.locator('main')).toContainText(re('66 837 F'))
  await vendeur.goto('/vendeur/commande?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText(re('59 449 F'), { timeout: 5000 })
  await entreprise.goto('/entreprise/paquet?id=' + PAQUET_TEMOIN)
  await expect(entreprise.locator('main')).toContainText(re('600 F garantis'), { timeout: 5000 })
  await ctx.close()
})
