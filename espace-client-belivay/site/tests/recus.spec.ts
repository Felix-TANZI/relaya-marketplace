// Reçus (DP-54, consigne du porteur du 5 oct. : « tout ce qui est envoyé doit avoir une façon d'être reçu et d'être
// exécuté »). Symétrie de chaque envoi : un compte A l'envoie, un compte B le voit dans sa boîte « Reçus » et
// l'exécute jusqu'au paiement ou à l'accord, puis A voit la réponse (et remercie), B voit le merci.
// Comptes de l'appareil (src/demo/reseau.ts) : A = Carine (jeu d'essai), B = Bertrand (compte neuf, numéro vérifié),
// D = Hervé (compte diaspora). Les envois sans écran d'envoi propre passent par la source, comme leurs écrans.
import { expect, test, type Page } from '@playwright/test'

test.setTimeout(240_000)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

// Appelle la source de l'application (serveur de développement : le module est chargé tel quel).
async function appel<T = unknown>(page: Page, corps: string, args: unknown = null): Promise<T> {
  return page.evaluate(
    async ([c, a]) => {
      const m = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as { source: unknown }
      return new Function('source', 'args', `return (async () => { ${c} })()`)(m.source, a)
    },
    [corps, args] as const,
  ) as Promise<T>
}
async function ouvrirCompte(page: Page, email: string) {
  const ok = await appel<boolean>(page, 'await source.deconnecter(); const r = await source.connecterEmail(args, "Belivay2026", true); return r.ok', email)
  expect(ok, 'connexion de ' + email).toBe(true)
}
const B = { email: 'bertrand@exemple.cm', numero: '691234567' }
const D = { email: 'herve.mbarga@exemple.fr' }

// Payer avec un numéro Mobile Money (compte neuf : aucun moyen enregistré) puis valider sur le téléphone.
async function payerMomo(page: Page, bouton: RegExp, numero = B.numero) {
  const zone = page.locator('.blv-payer').last()
  const champ = zone.getByLabel('Numéro MTN ou Orange')
  if (!(await champ.isVisible())) await zone.getByRole('radio', { name: /numéro Mobile Money/ }).click()
  await zone.getByLabel('Numéro MTN ou Orange').fill(numero)
  await zone.getByRole('button', { name: bouton }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.blv-succes').first()).toBeVisible()
}
async function ouvrirRecu(page: Page, texte: RegExp | string) {
  await page.goto('/recus')
  await page.locator('.blv-recus .li', { hasText: texte }).first().click()
  await expect(page).toHaveURL(/\/recu\?id=/)
}

test('boîte Reçus du jeu d’essai : chaque groupe, chaque vue de réception s’exécute', async ({ page }) => {
  await page.goto('/recus')
  for (const g of ['À offrir', 'À payer', 'À rejoindre', 'À accepter', 'À retirer pour quelqu’un', 'Parrainages et partages']) await expect(page.locator('.sec h2', { hasText: g })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Reçus \(14\)/ })).toBeVisible()

  // Liste de mariage : l'événement, offrir un article avec la livraison payée, la cagnotte « voyage de noces ».
  await ouvrirRecu(page, 'Liste de mariage de Mireille & Paul')
  await expect(page.locator('.blv-recu')).toContainText('Les mariés')
  await expect(page.locator('.blv-recu')).toContainText('Mireille & Paul')
  await page.locator('.li', { hasText: 'Marmite en fonte' }).getByRole('button', { name: 'Offrir' }).click()
  await expect(page.locator('.blv-quipaie')).toBeVisible()
  await page.getByRole('button', { name: 'Offrir · payer 22 900 F' }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.blv-succes')).toContainText('C’est offert')
  await expect(page.locator('.li', { hasText: 'Marmite en fonte' }).first()).toContainText('Offert par Carine')
  await page.getByRole('button', { name: 'Participer à la cagnotte' }).click()
  await page.getByRole('button', { name: '5 000 F', exact: true }).click()
  await page.getByRole('button', { name: 'Participer · 5 000 F' }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.blv-recu')).toContainText(/90\s000/)
  // La page publique de la liste le sait aussi.
  await page.getByRole('link', { name: 'Voir la page de la liste' }).click()
  await expect(page.locator('.pg-t')).toContainText('Liste de mariage de Mireille & Paul')
  await expect(page.locator('.card', { hasText: 'Marmite en fonte' })).toContainText('Déjà offert')
  await expect(page.locator('.blv-cagnotte')).toContainText(/90\s000/)

  // Panier à payer : avec le portefeuille (solde du compte), sans rien ressaisir.
  await ouvrirRecu(page, 'Junior t’envoie son panier')
  await page.getByRole('radio', { name: /Portefeuille BelivaY/ }).click()
  await page.getByRole('button', { name: /^Payer .* F$/ }).click()
  await page.getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.locator('.blv-succes')).toContainText('Payé')
  await expect(page.getByRole('link', { name: /Suivre BLV-/ })).toBeVisible()

  await page.goto('/wallet')
  await expect(page.locator('main')).toContainText('Payé pour Junior')
  // Lien de paiement : refusé avec un mot.
  await ouvrirRecu(page, 'Sandrine te demande de payer')
  await page.getByRole('button', { name: 'Refuser' }).click()
  await page.getByLabel('Ta réponse à Sandrine (facultatif)').fill('Le mois prochain !')
  await page.getByRole('button', { name: 'Confirmer le refus' }).click()
  await expect(page.locator('.blv-recu .pill', { hasText: 'Refusé' })).toBeVisible()

  // Cotisation : participer.
  await ouvrirRecu(page, 'Joël t’invite à une cotisation')
  await page.getByRole('button', { name: '2 000 F', exact: true }).click()
  await page.getByRole('button', { name: 'Participer · 2 000 F' }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.blv-recu')).toContainText(/128\s000/)

  // Colis offert : ce qui reste à payer au retrait, AVANT d'accepter ; accepté, puis le merci.
  await ouvrirRecu(page, 'Paul t’offre un colis')
  await expect(page.locator('.blv-recu')).toContainText('Tu paies au retrait')
  await page.getByRole('button', { name: 'Accepter le colis' }).click()
  await expect(page.locator('.blv-succes')).toContainText('Colis accepté')
  await page.getByLabel('Ton mot pour Paul').fill('Merci Paul !')
  await page.getByRole('button', { name: 'Remercier Paul' }).click()
  await expect(page.locator('.blv-recu')).toContainText('Merci envoyé à Paul')

  // Retrait confié : accepter, le code, « J'ai retiré ».
  await ouvrirRecu(page, 'Nadège te confie le retrait')
  await page.getByRole('button', { name: 'Accepter de le retirer' }).click()
  await expect(page.locator('.blv-recu')).toContainText('418 207')
  await page.getByRole('button', { name: 'J’ai retiré le colis' }).click()
  await expect(page.locator('.blv-recu .pill', { hasText: 'Fait' })).toBeVisible()

  // Lien famille, abonnement offert, panier famille, parrainage, partage : accepter.
  for (const [ligne, bouton] of [
    ['Hervé veut être relié', 'Accepter et relier'],
    ['Hervé t’offre un abonnement', 'Activer mon abonnement offert'],
    ['Hervé t’envoie un panier chaque mois', 'Accepter le panier'],
    ['Aïcha t’invite sur BelivaY', 'Accepter l’invitation'],
    ['Joël te partage une question', 'Merci, c’est vu'],
  ] as const) {
    await ouvrirRecu(page, ligne)
    await page.getByRole('button', { name: bouton }).click()
    await expect(page.locator('.blv-succes')).toBeVisible()
  }
  await page.goto('/mon-abonnement')
  await expect(page.locator('main')).toContainText('Hervé')
  await page.goto('/recus')
  await expect(page.locator('.sec h2', { hasText: 'Déjà traités' })).toBeVisible()
})

test('symétrie : chaque envoi de A arrive chez B, B l’exécute, A voit la réponse', async ({ page }) => {
  await page.goto('/')
  // B : un compte neuf, numéro vérifié (trouvable par ses proches) ; Carine reste sur l'appareil.
  await appel(page, 'await source.inscrire({ prenom: "Bertrand", email: args.email, motDePasse: "Belivay2026" }, true); return (await source.verifierPremierNumero(args.numero, "503917")).ok', B)
  // D : un compte diaspora (France).
  await page.goto('/inscription-diaspora')
  await page.getByRole('link', { name: 'Avec mon e-mail' }).click()
  await page.getByLabel('Prénom').fill('Hervé')
  await page.getByLabel('Nom', { exact: true }).fill('Mbarga')
  await page.getByLabel('E-mail').fill(D.email)
  await page.getByLabel('Pays où tu vis').selectOption('France')
  await page.getByLabel('Ville').fill('Lyon')
  await page.getByLabel('Date de naissance').fill('1990-05-14')
  await page.getByLabel('Ton numéro de téléphone').fill('612345678')
  await page.getByLabel('Mot de passe').fill('Belivay2026')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Recevoir mes codes (SMS et e-mail)' }).click()
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByLabel('Code reçu par e-mail').fill('284615')
  await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
  // D envoie à B : l'invitation de lien famille, un abonnement offert (par son numéro).
  await appel(page, 'await source.envoyerRecu({ type: "lien-famille", a: args, prenom: "Bertrand", titre: "Hervé veut être relié à ton compte", mot: "Je paierai tes courses depuis Lyon." })', B.numero)
  await appel(page, 'return (await source.offrirAbonnement({ numero: args, prenom: "Bertrand", palier: "prime", mois: 3, message: "Bon courage !", carte: { jeton: "tok_demo", marque: "Visa", derniers: "4242", expire: "08/29", bin: "424242" } })).ok', B.numero)

  // A (Carine) : sa liste de mariage, créée et envoyée dans l'application de B par son numéro.
  await ouvrirCompte(page, 'carine@gmail.com')
  await page.goto('/liste-creer')
  await page.getByRole('radio', { name: 'Mariage', exact: true }).click()
  await page.getByLabel('Nom de la liste').fill('Mariage de Carine & Éric')
  await page.getByLabel('Prénom de ton fiancé ou de ta fiancée').fill('Éric')
  await page.getByLabel('Objectif de la cagnotte (F)').fill('200000')
  await page.getByLabel('Date de remise (obligatoire)').fill('2026-10-24')
  await page.getByRole('button', { name: 'Créer la liste' }).click()
  await expect(page).toHaveURL(/liste-envies\?id=/)
  await expect(page.locator('.blv-occasion')).toContainText('Carine & Éric')
  await page.getByRole('button', { name: 'Ajouter des articles' }).click()
  await page.getByRole('searchbox', { name: 'Chercher un produit' }).fill('marmite')
  await page.getByRole('button', { name: /Ajouter : Marmite/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Envoyer ma liste' }).click()
  const envoi = page.locator('.blv-envoi')
  await envoi.getByLabel('Ajouter par son numéro').fill(B.numero)
  await envoi.getByRole('button', { name: 'Chercher' }).click()
  await expect(envoi).toContainText('Bertrand est sur BelivaY')
  await envoi.getByRole('button', { name: /Envoyer dans leur application/ }).click()
  await expect(envoi).toContainText(/Envoyé à \d proche/)
  // Les autres envois de A, par les méthodes de leurs écrans.
  await appel(
    page,
    `const p = await source.chercherProche(args.numero)
     const c = await source.creerCotisation({ nom: "Ventilateur pour papa", occasion: "Fête", p: "ventilo", beneficiaire: "Papa", relais: "Relais Mvog-Ada", jusqua: Date.UTC(2026, 9, 20) })
     await source.envoyerAuxProches({ type: "cotisation", id: c.id }, [p.proche.id])
     const l = (p2) => ({ p: p2.p, titre: p2.titre, dessin: p2.dessins[0], qte: 1, prix: p2.prix, livraison: 0, offertPar: null })
     const riz = l(await source.produit("riz")), cafe = l(await source.produit("cafe")), cartable = l(await source.produit("cartable")), mixeur = l(await source.produit("mixeur"))
     await source.envoyerRecu({ type: "panier", a: args.numero, prenom: "Bertrand", titre: "Mon panier", lignes: [riz] })
     await source.envoyerRecu({ type: "lien-paiement", a: args.numero, prenom: "Bertrand", titre: "Ma commande", lignes: [cafe] })
     await source.envoyerRecu({ type: "rentree", a: args.numero, prenom: "Bertrand", titre: "Rentrée de Lucas", occasion: "rentree", lignes: [cartable] })
     await source.envoyerRecu({ type: "cagnotte", a: args.numero, prenom: "Bertrand", titre: "Fête de fin d'année", occasion: "fete", objectif: 50000 })
     await source.envoyerRecu({ type: "partage", a: args.numero, prenom: "Bertrand", titre: "Une question sur le mixeur", detail: "Le bol est en verre trempé.", lignes: [mixeur] })
     await source.envoyerRecu({ type: "parrainage", a: args.numero, prenom: "Bertrand", titre: "Rejoins Prime", detail: "Ton premier mois à 1 500 F." })
     await source.ajouterAuPanier("Boutique D", "chargeur33")
     await source.envoyerPanierA({ prenom: "Bertrand", proche: p.proche.id, relais: "Relais Mvog-Ada", qui: "payeur", moyen: "6 77 ·· ·· 41", mot: "Pour toi" })
     await source.deleguerRetrait("BLV-52107", "Bertrand", args.numero)`,
    B,
  )

  // B : tout est dans sa boîte, à traiter, et s'exécute depuis son compte.
  await ouvrirCompte(page, B.email)
  await page.goto('/recus')
  const types = ['Liste de mariage de Carine & Éric', 'Carine t’invite à une cotisation', 'Carine t’envoie son panier', 'Carine te demande de payer', 'Carine t’envoie une liste de rentrée', 'Cagnotte de Carine', 'Carine te partage une question', 'Carine t’invite sur BelivaY', 'Carine t’offre un colis', 'Carine te confie le retrait', 'Hervé veut être relié', 'Hervé t’offre un abonnement']
  for (const x of types) await expect(page.locator('.blv-recus .li', { hasText: x }), x).toBeVisible()
  await expect(page.getByRole('tab', { name: `Reçus (${types.length})` })).toBeVisible()

  await ouvrirRecu(page, 'Liste de mariage de Carine & Éric')
  await page.locator('.li', { hasText: 'Marmite en fonte' }).getByRole('button', { name: 'Offrir' }).click()
  await payerMomo(page, /Offrir · payer/)
  await page.getByRole('button', { name: 'Participer à la cagnotte' }).click()
  await page.getByRole('button', { name: '10 000 F', exact: true }).click()
  await payerMomo(page, /Participer · 10 000 F/)
  await ouvrirRecu(page, 'Carine t’invite à une cotisation')
  await page.getByRole('button', { name: '5 000 F', exact: true }).click()
  await payerMomo(page, /Participer · 5 000 F/)
  for (const x of ['Carine t’envoie son panier', 'Carine te demande de payer', 'Carine t’envoie une liste de rentrée']) {
    await ouvrirRecu(page, x)
    await payerMomo(page, /^Payer .* F$/)
  }
  await ouvrirRecu(page, 'Cagnotte de Carine')
  await page.getByRole('button', { name: '2 000 F', exact: true }).click()
  await payerMomo(page, /Participer · 2 000 F/)
  for (const [x, bouton] of [
    ['Carine te partage une question', 'Merci, c’est vu'],
    ['Carine t’invite sur BelivaY', 'Accepter l’invitation'],
    ['Carine t’offre un colis', 'Accepter le colis'],
    ['Carine te confie le retrait', 'Accepter de le retirer'],
    ['Hervé veut être relié', 'Accepter et relier'],
    ['Hervé t’offre un abonnement', 'Activer mon abonnement offert'],
  ] as const) {
    await ouvrirRecu(page, x)
    await page.getByRole('button', { name: bouton }).click()
    await expect(page.locator('.blv-succes')).toBeVisible()
  }
  await page.getByLabel('Ton mot pour Hervé').fill('Merci Hervé !')
  await page.getByRole('button', { name: 'Remercier Hervé' }).click()
  await page.goto('/recus')
  await expect(page.getByRole('tab', { name: 'Reçus', exact: true })).toBeVisible() // plus rien à traiter
  // B envoie son panier à payer à D (compte diaspora), par son e-mail.
  await appel(page, 'const r = await source.produit("ventilo"); await source.envoyerRecu({ type: "demande-diaspora", a: args, prenom: "Hervé", titre: "Mon panier", lignes: [{ p: r.p, titre: r.titre, dessin: r.dessins[0], qte: 1, prix: r.prix, livraison: 0, offertPar: null }] })', D.email)

  // D : le panier de B, payé par Apple Pay (2 % de frais de service) ; ses envois ont leur réponse.
  await ouvrirCompte(page, D.email)
  await ouvrirRecu(page, 'Bertrand t’a envoyé son panier')
  await expect(page.locator('.blv-payer')).toContainText('Depuis l’étranger, tu paies par carte')
  await page.getByRole('radio', { name: /Apple Pay/ }).click()
  await page.getByRole('button', { name: /^Payer .* F$/ }).click()
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.locator('.blv-succes')).toContainText('Payé')
  await page.goto('/recus?vue=envoyes')
  await page.locator('.blv-recus .li', { hasText: 'Lien famille · pour Bertrand' }).click()
  await expect(page.locator('.blv-recu')).toContainText('Bertrand a accepté')
  await page.goto('/recus?vue=envoyes')
  await page.locator('.blv-recus .li', { hasText: 'Abonnement offert · pour Bertrand' }).click()
  await expect(page.locator('.blv-recu')).toContainText('Merci de Bertrand')
  await page.goto('/proches')
  await expect(page.locator('main')).toContainText('Bertrand')

  // A : chaque envoi a sa réponse ; la liste de mariage le sait ; A remercie B.
  await ouvrirCompte(page, 'carine@gmail.com')
  await page.goto('/recus?vue=envoyes')
  await expect(page.locator('.blv-recus .li', { hasText: 'pour Bertrand' }).filter({ hasText: 'Réponse reçue' })).toHaveCount(10)
  await page.locator('.blv-recus .li', { hasText: 'Liste d’envies · pour Bertrand' }).click()
  await expect(page.locator('.blv-recu')).toContainText('Bertrand a offert Marmite en fonte 8 L')
  await page.getByLabel('Ton mot pour Bertrand').fill('Merci Bertrand, à samedi !')
  await page.getByRole('button', { name: 'Remercier Bertrand' }).click()
  await expect(page.locator('.blv-recu')).toContainText('Merci envoyé à Bertrand')
  await page.goto('/listes')
  await page.locator('a', { hasText: 'Mariage de Carine & Éric' }).first().click()
  await expect(page.locator('.blv-occasion')).toContainText(/Bertrand · 10\s000 F/)
  await page.goto('/parrainage')
  await expect(page.locator('main')).toContainText('Bertrand')

  // B voit le merci de A.
  await ouvrirCompte(page, B.email)
  await ouvrirRecu(page, 'Liste de mariage de Carine & Éric')
  await expect(page.locator('.blv-recu')).toContainText('Merci de Carine : « Merci Bertrand, à samedi ! »')
})

test('grands écrans : maître-détail de la boîte, sans défilement horizontal', async ({ page }) => {
  for (const [w, h] of [
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/recus')
    await expect(page.locator('.blv-recus')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${w} px`).toBeLessThanOrEqual(0)
    if (w >= 1024) {
      // La boîte à gauche, l'envoi choisi à droite (le premier à traiter), la ligne choisie marquée.
      await expect(page.locator('.d13-md-liste .blv-recus')).toBeVisible()
      await expect(page.locator('.d13-md-detail .blv-recu')).toBeVisible()
      await expect(page.locator('.d13-md-liste .li[aria-current="true"]')).toHaveCount(1)
      await page.locator('.d13-md-liste .li', { hasText: 'Paul t’offre un colis' }).click()
      await expect(page).toHaveURL(/recu\?id=R-colis/)
      await expect(page.locator('.d13-md-detail')).toContainText('Tu paies au retrait')
      await expect(page.locator('.d13-md-liste .li[aria-current="true"]')).toContainText('Paul t’offre un colis')
      const [liste, detail] = await Promise.all([page.locator('.d13-md-liste').boundingBox(), page.locator('.d13-md-detail').boundingBox()])
      expect(liste!.x + liste!.width).toBeLessThanOrEqual(detail!.x)
    } else {
      await expect(page.locator('.d13-md-detail')).toHaveCount(0)
    }
  }
})
