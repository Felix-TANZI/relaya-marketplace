// Étape 6 — relais → client : le retrait (CAHIER-CONNECTIVITE.md). Carine présente le code de retrait de la commande
// témoin au Relais Bastos : Rose M. le vérifie (elle ne le voit jamais), pose le colis, Carine confirme « Tout est en
// ordre », photo, PIN : « Retirée » chez le client, « Retirée par le client » chez le vendeur. Une deuxième commande,
// déposée et jamais retirée : au premier jour ouvert après le 7e, elle passe « à renvoyer » au relais, « Non retiré :
// renvoyé au vendeur » (remboursé moins la garde due) chez le client, vente annulée chez le vendeur.
import { expect, test } from '@playwright/test'
import { contexte, journal, ouvrir } from './commun'
import { codeDuVendeur, codeRetrait, demarrerPaquet, deposerAuRelais, jusquAuLivreur, paquetDe, PIN_RELAIS, ramasserTemoin, retirer } from './parcours'

test('retrait de la commande témoin ; une commande non retirée passe en renvoi au vendeur au 7e jour', async ({ browser }) => {
  test.setTimeout(420_000)
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

  // Retrait : le code lu par le client dans son application, jamais vu du relais.
  await retirer(relais, codeRetrait(ref), PIN_RELAIS)
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText('Retirée', { timeout: 5000 })
  await client.goto('/commandes')
  await client.getByText(/^Terminées/).first().click()
  await expect(client.locator('main')).toContainText(ref)
  await vendeur.goto('/vendeur/journal?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Retirée par le client', { timeout: 5000 })

  // Deuxième commande, déposée, jamais retirée.
  const ref2 = await jusquAuLivreur(client, vendeur, entreprise, 'Au relais', true)
  const paquet2 = await paquetDe(entreprise, ref2)
  await demarrerPaquet(livreur, paquet2)
  await ramasserTemoin(livreur, await codeDuVendeur(vendeur, ref2), '8210')
  await deposerAuRelais(livreur, relais, [ref2 + '-1'], PIN_RELAIS, paquet2)

  // Neuf jours ont passé : la garde est calée neuf jours plus tôt (comme le test du kit), la démonstration gardant une
  // seule journée. Au matin, le colis est « à renvoyer », son code invalidé.
  await relais.evaluate((id) => {
    const cle = 'blv_r_demo_colis'
    const m = JSON.parse(localStorage.getItem(cle)!)
    const c = m.etat.colis[id]
    const J = 9 * 24 * 3600_000
    c.arrivee.le -= J
    if (c.avisA) c.avisA -= J
    localStorage.setItem(cle, JSON.stringify(m))
  }, ref2 + '-1')
  await relais.goto('/relais/departs')
  await expect(relais.locator('main')).toContainText(ref2 + '-1', { timeout: 10_000 })
  await client.goto('/suivi?ref=' + ref2)
  await expect(client.locator('[data-en-direct]')).toContainText('Non retiré : renvoyé au vendeur', { timeout: 5000 })
  await vendeur.goto('/vendeur/journal?ref=' + ref2)
  await expect(vendeur.locator('main')).toContainText('Non retiré : renvoi au vendeur', { timeout: 5000 })
  const types = (await journal(relais)).map((e) => e.type)
  expect(types).toEqual(expect.arrayContaining(['handover.completed', 'parcel.unclaimed']))
  await ctx.close()
})
