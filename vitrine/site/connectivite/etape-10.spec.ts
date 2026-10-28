// Étape 10 — la console d'administration reliée aux cinq interfaces (sixième application, /admin/). Montée : la commande
// payée par Carine et le litige qu'elle ouvre, contesté par le vendeur, arrivent dans la console (commandes du jour,
// File d'action, Litiges). Descente : le Support tranche (« Rembourser », motif écrit) ; la décision redescend chez le
// client (litige tranché) et chez le vendeur (journal de la commande). Puis une panne déclarée par la console s'affiche
// dans les cinq applications ; levée, le bandeau disparaît.
import { expect, test } from '@playwright/test'
import { CHEMIN, contexte, journal, ouvrir, SIX } from './commun'
import { codeDuVendeur, codeRetrait, demarrerPaquet, deposerAuRelais, jusquAuLivreur, PIN_RELAIS, ramasserTemoin, retirer } from './parcours'

const PNG = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64') }
const MOTIF = 'Photos du client à l’ouverture : réservoir fendu, aucune preuve contraire du vendeur au dossier.'

test('litige du client contesté par le vendeur : la console tranche, la décision redescend chez le client et le vendeur', async ({ browser }) => {
  test.setTimeout(480_000)
  const ctx = await contexte(browser)
  const livreur = await ouvrir(ctx, 'livreur', '?demo=aucun_paquet')
  const client = await ouvrir(ctx, 'client')
  const vendeur = await ouvrir(ctx, 'vendeur', 'commandes')
  const entreprise = await ouvrir(ctx, 'entreprise', 'paquets')
  const relais = await ouvrir(ctx, 'relais')
  const admin = await ouvrir(ctx, 'admin', '?role=support')
  const ref = await jusquAuLivreur(client, vendeur, entreprise)

  // Montée : la commande payée est dans les commandes du jour de la console.
  await admin.goto(CHEMIN.admin + 'commandes?role=support')
  await expect(admin.locator('main')).toContainText(ref, { timeout: 10_000 })

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

  // Le vendeur conteste : la médiation de BelivaY décide.
  await vendeur.goto(`/vendeur/litige?ref=${ref}&pos=conteste`)
  await vendeur.locator('#vd07-constat').fill('Le livreur a contrôlé l’article devant moi au ramassage : intact.')
  await vendeur.getByRole('button', { name: 'Envoyer ma réponse' }).click()
  await vendeur.getByRole('dialog').getByRole('button', { name: 'Envoyer', exact: true }).click()
  await expect(vendeur).toHaveURL(/litige_envoye/)
  expect((await journal(admin)).some((e) => e.type === 'claim.answered' && e.dossier === dossier)).toBe(true)

  // La console (poste de travail, DECISIONS-ENCADREES.md) : le Support lit les preuves du pont ; des preuves qui ne
  // tranchent pas se transmettent à la Médiation, qui décide une issue permise, avec motif et note.
  await admin.goto(CHEMIN.admin + `litige?id=${dossier}&role=support&vue=decision`)
  await expect(admin.locator('.po-tete')).toContainText(dossier, { timeout: 10_000 })
  await expect(admin.locator('.po-sug')).toBeVisible()
  if (await admin.getByText('La règle ne tranche pas').isVisible()) {
    await admin.locator('.po-note textarea').first().fill(MOTIF)
    await admin.getByRole('button', { name: 'Transmettre', exact: true }).click()
    await admin.getByRole('button', { name: 'Transmettre au niveau supérieur' }).click()
    await expect(admin.getByRole('status')).toContainText('Dossier transmis')
    await admin.goto(CHEMIN.admin + `litige?id=${dossier}&role=mediation&vue=decision`)
    await expect(admin.locator('.po-tete')).toContainText(dossier, { timeout: 10_000 })
  }
  await admin.locator('.po-i:not([disabled])', { hasText: 'Rembourser' }).first().click({ timeout: 15_000 })
  await admin.locator('.po-motifs .chip').first().click()
  await admin.locator('.po-note textarea').first().fill(MOTIF)
  await admin.locator('.po-decider').click()
  await expect(admin.getByText(/Suites envoyées aux espaces|attend un second validateur/)).toBeVisible()
  await expect.poll(async () => (await journal(admin)).some((e) => e.type === 'litige_decide' && e.commande === ref)).toBe(true)

  // Descente : la décision chez le client (suivi du litige) et chez le vendeur (journal de la commande).
  await client.goto('/litige-suivi?id=' + dossier)
  await expect(client.locator('main')).toContainText(/BelivaY/, { timeout: 10_000 })
  await vendeur.goto('/vendeur/journal?ref=' + ref)
  await expect(vendeur.locator('main')).toContainText('Décision de BelivaY sur le litige', { timeout: 10_000 })
  await ctx.close()
})

test('panne déclarée par la console : bandeau dans les cinq applications, puis levé', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await contexte(browser)
  const pages = Object.fromEntries(await Promise.all(SIX.map(async (a) => [a, await ouvrir(ctx, a)] as const)))
  const le = await pages.admin.evaluate(() => Date.now())
  const publier = (etat: string, n: number) =>
    pages.admin.evaluate(
      ([etat, le, n]) => (window as unknown as { __blvPont: { publier: (e: unknown, cle: string, le: number) => void } }).__blvPont.publier({ type: 'panne', id: 'INC-ESSAI', etat, zones: ['Z1'], message: 'Paiements lents : réessayez dans quelques minutes.', relais: ['rel-z1-001'] }, `admin-essai-${etat}`, Number(le) + Number(n)),
      [etat, le, n] as const,
    )
  await publier('declare', 0)
  for (const a of ['client', 'vendeur', 'entreprise', 'livreur', 'relais'] as const) {
    await pages[a].reload()
    await expect(pages[a].getByText(/Paiements lents/).first(), a).toBeVisible({ timeout: 10_000 })
  }
  await publier('clos', 1000)
  for (const a of ['client', 'vendeur', 'entreprise', 'livreur', 'relais'] as const) {
    await pages[a].reload()
    await expect(pages[a].locator('[data-console]').filter({ hasText: /Paiements lents/ }), a).toHaveCount(0)
  }
  await ctx.close()
})
