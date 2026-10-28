// Étape 7 — retours et litiges (CAHIER-CONNECTIVITE.md). Carine, après le retrait de la commande témoin, signale le
// défroisseur abîmé (photo) et demande le remboursement : le dossier arrive chez le vendeur (48 h pour répondre). Le
// vendeur accepte : le retour part par le relais sous sa référence RT. Carine dépose l'article au Relais Bastos (scellé,
// photos, PIN de Rose) ; l'entreprise accepte la course de retour et l'affecte à Serge, qui collecte au relais et remet
// l'article à la boutique contre le code de réception du vendeur ; le vendeur inspecte (deux contrôles, deux photos) et
// rembourse : « Remboursé » chez le client. Trois réponses possibles : accepter, arrangement, contester ; le silence
// passe en médiation (BelivaY tranche, jamais seul).
import { expect, test, type Page } from '@playwright/test'
import { contexte, journal, ouvrir } from './commun'
import { arriver, codeDuVendeur, codeRetrait, demarrerPaquet, deposerAuRelais, jusquAuLivreur, PAQUET_TEMOIN, paquetDe, photo, PIN_RELAIS, ramasserTemoin, re, retirer, taperCode } from './parcours'

const PNG = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64') }
async function photoRelais(page: Page, bouton: ReturnType<Page['locator']>) {
  await bouton.click()
  const feuille = page.getByRole('dialog', { name: 'Appareil photo' })
  await feuille.getByRole('button', { name: 'Prendre la photo' }).click()
  await expect(feuille).toBeHidden()
}

test('le retour de la commande témoin traverse les cinq interfaces et se termine par un remboursement chez le client', async ({ browser }) => {
  test.setTimeout(480_000)
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

  // Le client signale : abîmé, une photo, remboursement souhaité.
  await client.goto('/litige?ref=' + ref)
  const colis = client.locator('.cl11-it', { hasText: 'Colis 1' })
  if (await colis.count()) await colis.click()
  await client.locator('.cl11-it', { hasText: 'Abîmé' }).click()
  await client.locator('input[type=file][multiple]').setInputFiles(PNG)
  await client.locator('textarea').fill('Le réservoir est fendu à l’ouverture de la boîte.')
  await client.getByRole('button', { name: 'Continuer' }).click()
  await client.locator('.cl11-it', { hasText: 'Être remboursé' }).click()
  await expect(client).toHaveURL(/litige-confirme\?id=LIT-\d+/)
  const dossier = /id=(LIT-\d+)/.exec(client.url())![1]
  const rt = 'RT-' + dossier.replace(/\D/g, '')

  // Le vendeur reçoit le dossier et accepte.
  await vendeur.goto('/vendeur/litiges')
  await expect(vendeur.locator('main')).toContainText(ref, { timeout: 5000 })
  await vendeur.goto(`/vendeur/litige?ref=${ref}&pos=accepte`)
  await vendeur.getByRole('button', { name: 'Envoyer ma réponse' }).click()
  await vendeur.getByRole('dialog').getByRole('button', { name: 'Envoyer', exact: true }).click()
  await expect(vendeur).toHaveURL(/litige_envoye/)
  await client.goto('/litige-suivi?id=' + dossier)
  await expect(client.locator('main')).toContainText('Le vendeur a accepté', { timeout: 5000 })
  await client.goto('/suivi?ref=' + ref)
  await expect(client.locator('[data-en-direct]')).toContainText(rt, { timeout: 5000 })

  // Dépôt du retour au relais : référence, scellé, deux photos, PIN.
  await relais.goto('/relais/litiges?onglet=retour')
  const champ = relais.getByRole('textbox', { name: 'Numéro du retour' })
  await champ.fill(rt)
  await champ.press('Enter')
  await relais.getByRole('button', { name: new RegExp(rt) }).click()
  await relais.getByRole('checkbox', { name: 'J’ai posé le scellé du retour sur le colis' }).click()
  await photoRelais(relais, relais.getByRole('button', { name: /Scellé du retour posé/ }))
  await photoRelais(relais, relais.getByRole('button', { name: /Scellé du retour posé/ }))
  await relais.getByRole('button', { name: 'Enregistrer le dépôt' }).click()
  await relais.locator('#r7-pin').fill(PIN_RELAIS)
  await relais.getByRole('button', { name: 'Signer avec mon PIN' }).click()
  await expect(relais.getByText(new RegExp(rt + ' déposé et scellé'))).toBeVisible()

  // La course de retour : publiée, acceptée, affectée à Serge.
  const paquet = await paquetDe(entreprise, ref, [PAQUET_TEMOIN])
  await entreprise.goto('/entreprise/paquets')
  await entreprise.locator('article.entb-pq', { hasText: paquet }).getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(entreprise.getByText(new RegExp('Paquet ' + paquet + ' accepté\\s:\\saffectez'))).toBeVisible({ timeout: 15_000 })
  await entreprise.goto('/entreprise/affectation?id=' + paquet)
  await entreprise.getByRole('button', { name: 'Affecter Serge A.' }).first().click()
  await expect(entreprise.getByText(/Serge A\. est affecté/)).toBeVisible({ timeout: 15_000 })

  // Collecte au relais : Rose tend le colis, Serge le confirme, Rose valide la sortie (photo, PIN).
  await demarrerPaquet(livreur, paquet)
  await livreur.goto('/livreur/tournee')
  await arriver(livreur)
  await relais.goto('/relais/departs')
  await relais.getByLabel('Étiquette du colis').fill(ref + '-1')
  await relais.getByRole('button', { name: 'Scanner', exact: true }).click()
  await livreur.reload()
  await livreur.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await relais.locator('.r6-cta .p-ncx7qc').click()
  const feuille = relais.getByRole('dialog', { name: 'Valider la sortie' })
  await feuille.locator('.r6-prise').click()
  await feuille.getByRole('button', { name: 'Photo de démonstration' }).click()
  await feuille.getByLabel(/Votre PIN/).fill(PIN_RELAIS)
  await feuille.getByRole('button', { name: 'Valider la sortie' }).click()
  await expect(async () => {
    await relais.getByRole('tab', { name: 'Partis' }).click()
    await expect(relais.getByRole('tabpanel')).toContainText(rt, { timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  await livreur.getByRole('button', { name: re('Continuer vers') }).click()

  // À la boutique : le code de réception que lit le vendeur, la photo, « Valider le retour ».
  await vendeur.goto('/vendeur/retours?f=en_route')
  const code = (await vendeur.locator('[data-code-reception]').innerText({ timeout: 10_000 })).replace(/\D/g, '').slice(0, 6)
  await livreur.goto('/livreur/tournee')
  await arriver(livreur)
  await expect(livreur).toHaveURL(/retour-vendeur/)
  await taperCode(livreur, code)
  await photo(livreur)
  await livreur.getByRole('button', { name: re('Valider le retour') }).click()

  // Le vendeur inspecte et rembourse ; le client voit « Remboursé ».
  await vendeur.goto('/vendeur/inspection?ref=' + ref + '&d=conforme')
  await vendeur.getByRole('checkbox', { name: 'Scellé du retour intact' }).click()
  await vendeur.getByRole('checkbox', { name: /numéro de série/ }).click()
  for (const n of ['a.png', 'b.png']) {
    const avant = await vendeur.locator('.photo').count()
    await vendeur.locator('input[data-vd07-photo]').first().setInputFiles({ ...PNG, name: n })
    await expect(vendeur.locator('.photo')).toHaveCount(avant + 1)
  }
  await vendeur.getByRole('button', { name: 'Continuer : remplacer ou rembourser' }).click()
  await vendeur.getByRole('radio', { name: /Rembourser le client/ }).click()
  await vendeur.getByRole('button', { name: 'Rembourser le client' }).click()
  await expect(vendeur).toHaveURL(/\/retours\?f=clos$/)
  await client.goto('/litige-suivi?id=' + dossier)
  await expect(client.locator('main')).toContainText('Remboursement accordé', { timeout: 5000 })
  await expect(client.locator('main')).toContainText('Article contrôlé')
  const types = (await journal(client)).map((e) => e.type)
  expect(types).toEqual(expect.arrayContaining(['claim.opened', 'claim.answered', 'return.dropped', 'relay.departure.confirmed', 'parcel.returned', 'return.closed']))
  await ctx.close()
})
