// Gestes du groupe VD-05 (Commandes et préparation) : chaque geste change les données (source de démonstration,
// gardée sur l'appareil) et les écrans les suivent ; compteurs, échéances et montants viennent des données.
// Heure du jeu d'essai : lundi 21 sept. 2026, 09 h 48 (Yaoundé).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'dark', lang: 'en' } as const
const main = (page: Page) => page.locator('#app main')

test.describe('VD-05 · Commandes reçues', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('phrase d’état = somme des états, quatre filtres, la plus urgente d’abord avec le seul bouton plein', async ({ page }) => {
    await ouvrir(page, '#commandes', FR)
    // 3 + 2 + 3 + 4 + 40 + 4 = 56 ; filtres : Terminées = 40 terminées + 4 annulées, Problèmes = 3 litiges + 4 retours.
    await expect(page.locator('.pg-s')).toHaveText('56 commandes · 3 à préparer · 2 en cours · 3 en litige · 4 en retour · 40 terminées · 4 annulées')
    await expect(page.locator('.seg.stack a b')).toHaveText(['3', '2', '44', '7'])
    // La plus urgente d'abord : BLV-00010 (échéance samedi 19 dépassée), puis BLV-00008 (12 h 42), puis BLV-00009 (13 h 05).
    const cartes = page.locator('.card.ord')
    await expect(cartes).toHaveCount(3)
    await expect(cartes.first()).toContainText('BLV-00010 · payée à 10 h')
    await expect(cartes.first().locator('.cd')).toHaveText('Délai dépassé')
    await expect(cartes.nth(1)).toContainText('BLV-00008 · payée à 08 h 42')
    await expect(cartes.nth(1).locator('.cd')).toHaveText('il reste 2 h 54')
    await expect(cartes.nth(2)).toContainText('BLV-00009')
    await expect(page.locator('main .btn.primary')).toHaveCount(1)
    await expect(cartes.first().locator('.btn.primary')).toHaveCount(1)
    // Montant gardé calculé (ITEL 20 000 F, Bronze, découverte), jamais écrit ; « Vous garderez » au comptoir.
    await expect(cartes.nth(1).locator('.keep')).toContainText('Vous gardez17 840 F')
    await expect(page.locator('.card.ord.amber .keep')).toContainText('Vous garderez · rien n’est encaissé')
  })

  test('recherche : par référence, sans résultat, effacer', async ({ page }) => {
    await ouvrir(page, '#commandes?f=fin', FR)
    const champ = page.getByRole('searchbox', { name: 'Chercher une référence ou un article' })
    await champ.fill('00003')
    await expect(page.locator('.card.ord')).toHaveCount(1)
    await expect(page.locator('.card.ord')).toContainText('BLV-00003')
    await champ.fill('zzz')
    await expect(main(page)).toContainText('Aucune commande ne correspond')
    await page.getByRole('button', { name: 'Effacer la recherche' }).first().click()
    await expect(page.locator('.card.ord')).toHaveCount(44) // toutes les terminées (40 + 4 annulées)
  })

  test('filtres : « En cours » montre les commandes en route ; terminées : état de l’argent et reçu', async ({ page }) => {
    await ouvrir(page, '#commandes?f=cours', FR)
    const cours = page.locator('.card.ord')
    await expect(cours).toHaveCount(2)
    await expect(cours.nth(0)).toContainText('Prête · livreur attendu')
    await expect(cours.nth(0)).toContainText('BLV-00011')
    await expect(cours.nth(1)).toContainText('Chez le livreur')
    await expect(cours.nth(1)).toContainText('BLV-00012')
    await page.getByRole('tab', { name: /Terminées/ }).click()
    await expect(page).toHaveURL(/f=fin/)
    await expect(page.locator('.card.ord', { hasText: 'BLV-00007' }).locator('.pill')).toHaveText('Se libère aujourd’hui à 18 h')
    await page.locator('.chips').getByRole('button', { name: /À verser/ }).click()
    const aVerser = page.locator('.card.ord')
    await expect(aVerser).toHaveCount(2)
    await expect(aVerser.locator('.pill')).toHaveText(['À verser vendredi 25 sept.', 'À verser vendredi 25 sept.'])
    await expect(aVerser.first()).toHaveAttribute('href', /\/recu\?ref=BLV-00003$/)
  })

  test('problèmes : litiges et retour gelés, montants gelés calculés, liens vers le litige et le retour', async ({ page }) => {
    await ouvrir(page, '#commandes?f=pb', FR)
    const cartes = page.locator('.card.ord.red')
    // 3 litiges ouverts, du plus pressé au moins pressé, puis 4 retours.
    await expect(cartes).toHaveCount(7)
    await expect(cartes.nth(0)).toContainText('il reste 0 h 12')
    await expect(cartes.nth(0)).toHaveAttribute('href', /\/litige\?ref=BLV-00017$/)
    await expect(cartes.nth(1)).toContainText('il reste 19 h 42')
    await expect(cartes.nth(1)).toContainText(/Gelé\d{3}\s\d{3}\sF/) // montant gardé figé de l'iPhone, calculé
    await expect(cartes.nth(1)).toHaveAttribute('href', /\/litige\?ref=BLV-00005$/)
    await expect(cartes.nth(2)).toContainText('il reste 44 h 14')
    await expect(cartes.nth(3)).toContainText('arrive mar. 22')
    await expect(cartes.nth(3)).toContainText('BLV-00004')
    for (const i of [3, 4, 5, 6]) await expect(cartes.nth(i)).toHaveAttribute('href', /\/retours$/)
  })

  test('« C’est prêt » depuis la liste : la remise s’ouvre, la commande passe « En cours », le badge suit', async ({ page }) => {
    await ouvrir(page, '#commandes', FR)
    await page.locator('.card.ord').first().getByText('C’est prêt').click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=BLV-00010$/)
    await page.goto('commandes?f=cours')
    await expect(page.locator('.seg.stack a b')).toHaveText(['2', '3', '44', '7'])
    const carte = page.locator('.card.ord', { hasText: 'BLV-00010' })
    await expect(carte).toContainText('Prête · livreur attendu')
    await expect(page.locator('nav.dock .tab', { hasText: 'Commandes' }).locator('.bdg')).toHaveText('2')
    await expect(carte.getByRole('link', { name: 'Remettre au livreur' })).toHaveAttribute('href', /commande_prete\?ref=BLV-00010/)
  })

  test('hors connexion : liste gardée, « C’est prêt » mis en file avec son heure, envoyé au retour du réseau', async ({ page, context }) => {
    await ouvrir(page, '#commandes', FR)
    await context.setOffline(true)
    await expect(page.locator('.offline-banner')).toContainText('Hors connexion · liste de 09 h 48')
    await expect(main(page)).toContainText('Rupture et délai : réseau nécessaire')
    await page.locator('.card.ord').first().getByText('C’est prêt').click()
    await expect(main(page)).toContainText('« C’est prêt » gardé')
    await expect(page.locator('.offline-banner')).toContainText('1 action en attente d’envoi')
    await context.setOffline(false)
    await expect(page.locator('.seg.stack a b').first()).toHaveText('2')
    await page.goto('journal?ref=BLV-00010') // la plus urgente, première de la liste
    await expect(main(page)).toContainText('Envoyé au retour du réseau')
  })

  test('menu ⋮ : export CSV (sans donnée du client), copier le résumé', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await ouvrir(page, '#commandes', FR)
    await page.getByRole('button', { name: 'Exporter, factures' }).click()
    const tel = page.waitForEvent('download')
    await page.getByRole('button', { name: /Exporter la liste/ }).click()
    const fichier = await tel
    expect(fichier.suggestedFilename()).toBe('commandes-prep-2026-09-21.csv')
    const csv = readFileSync((await fichier.path())!, 'utf-8')
    expect(csv).toContain('"BLV-00008";"À préparer";"ITEL AC52";"noir";"1";"S"')
    expect(csv).toContain('"17840"')
    expect(csv).not.toMatch(/client|quartier|relais/i)
    await page.getByRole('button', { name: 'Exporter, factures' }).click()
    await page.getByRole('button', { name: /Copier le résumé/ }).click()
    await expect(page.getByRole('button', { name: /Copié/ })).toBeVisible()
  })

  test('accès Préparation : aucun montant, pas de facture, une commande terminée ouvre la commande', async ({ page }) => {
    await ouvrir(page, '#commandes?role=prep', FR)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(main(page)).toContainText('Neuf · ×1 · colis S')
    await page.getByRole('button', { name: 'Exporter, factures' }).click()
    await expect(page.locator('.sheet')).not.toContainText('Factures')
    await page.goto('commandes?f=fin&role=prep')
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(page.locator('.card.ord', { hasText: 'BLV-00007' })).toHaveAttribute('href', /\/commande\?ref=BLV-00007&role=prep$/)
    await page.goto('commandes?f=pb&role=prep')
    await expect(page.locator('.card.ord.red', { hasText: 'BLV-00005' })).toContainText('Ajouter des preuves')
  })

  test('anglais : phrase d’état et cartes', async ({ page }) => {
    await ouvrir(page, '#commandes', EN)
    await expect(page.locator('.pg-t')).toHaveText('Orders received')
    await expect(page.locator('.pg-s')).toHaveText('56 orders · 3 to prepare · 2 in progress · 3 in dispute · 4 returning · 40 completed · 4 cancelled')
    await expect(page.locator('.card.ord').first()).toContainText('Deadline missed')
    await expect(page.locator('.card.ord').nth(1)).toContainText('17,840 F')
    await expect(page.locator('.card.ord').nth(1)).toContainText('Ready before 12:42 pm')
  })
})

test.describe('VD-05 · Commande à préparer', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('carte clé : échéance, temps restant en heures d’ouverture, barre réelle, « Vous gardez » et prix de vente', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    await expect(page.locator('header h1')).toHaveText('Commande BLV-00008')
    await expect(page.locator('.hero.night .hk')).toHaveText('Prête aujourd’hui avant 12 h 42')
    await expect(page.locator('.hero.night .big')).toHaveText('2 h 54restantes')
    await expect(page.locator('.hero.night .bar i')).toHaveAttribute('style', /width: 28%/)
    await expect(page.locator('.hero.night')).toContainText('Payée à 08 h 42 · 4 h ouvrées (boutique ouverte)')
    await expect(main(page)).toContainText('17 840 F')
    await expect(main(page)).toContainText('Prix de vente20 000 F')
    await expect(main(page)).toContainText('Aujourd’hui entre 14 h et 16 h')
  })

  test('préparation article par article : une case cochée reste cochée, signée, et le bon la voit', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    await page.getByRole('checkbox', { name: /Article neuf, allumé et testé/ }).click()
    await expect(page.getByRole('checkbox', { name: /Article neuf/ })).toHaveAttribute('aria-checked', 'true')
    await expect(main(page)).toContainText('1 sur 4')
    await expect(main(page)).toContainText('Coché par Franck Penga')
    await page.goto('bon?ref=BLV-00008')
    await expect(page.getByRole('checkbox', { name: /Article neuf/ })).toHaveAttribute('aria-checked', 'true')
  })

  test('scan de la référence : une autre référence est refusée, la bonne coche « Bon modèle » et s’écrit au journal', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    await page.getByRole('button', { name: 'Scanner la référence de la boîte' }).click()
    const champ = page.getByLabel('Référence sur la boîte')
    await champ.fill('ITL-AC52-BL')
    await page.getByRole('button', { name: 'Vérifier la référence' }).click()
    await expect(page.locator('.sheet')).toContainText('Ce n’est pas la bonne référence. Attendue : ITL-AC52-NR.')
    await champ.fill('itl ac52 nr')
    await page.getByRole('button', { name: 'Vérifier la référence' }).click()
    await expect(page.getByRole('checkbox', { name: /Bon modèle et bonne couleur/ })).toHaveAttribute('aria-checked', 'true')
    await page.goto('journal?ref=BLV-00008')
    await expect(main(page)).toContainText('Référence vérifiée · ITL-AC52-NR')
  })

  test('payable au retrait : « Vous garderez », rien n’est encaissé', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00009', FR)
    await expect(page.locator('.meta .pill.amber')).toHaveText('Payable au retrait')
    await expect(page.locator('.hero.night')).toContainText('Validée à 09 h 05')
    await expect(main(page)).toContainText('Vous garderez')
    await expect(main(page)).toContainText('Rien n’est encaissé : le client paie au retrait.')
  })

  test('message du client (anonyme) et autres actions', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    await expect(page.getByRole('link', { name: /1 message du client/ })).toHaveAttribute('href', /\/messages\?fil=f-00008$/)
    await expect(page.locator('.card.tight .li .lt')).toContainText(['Plus de temps', 'Rupture', 'Bon de préparation', 'Journal de la commande'])
  })

  test('commande terminée : son état et son reçu ; adresse inconnue : « Commande introuvable »', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00001', FR)
    await expect(main(page)).toContainText('Livrée le 31 août')
    await expect(page.getByRole('link', { name: 'Voir le reçu' })).toHaveAttribute('href', /\/recu\?ref=BLV-00001$/)
    await expect(page.locator('.hero.night')).toHaveCount(0)
    await page.goto('commande?ref=BLV-99999')
    await expect(main(page)).toContainText('Commande introuvable')
  })

  test('accès Préparation : aucun montant, mêmes gestes', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008&role=prep', FR)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(page.locator('.hero.night').getByText('C’est prêt')).toBeVisible()
    await expect(main(page)).toContainText('réservés à Franck Penga, propriétaire')
  })

  test('anglais', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', EN)
    await expect(page.locator('.hero.night .hk')).toHaveText('Ready today before 12:42 pm')
    await expect(page.locator('.hero.night')).toContainText('Paid at 8:42 am · 4 h business hours (shop open)')
  })
})

test.describe('VD-05 · Rupture', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('la commande demandée (défaut 4 corrigé) et l’interrupteur du stock', async ({ page }) => {
    await ouvrir(page, '#rupture?ref=BLV-00009', FR)
    await expect(page.locator('header h1')).toHaveText('Rupture · BLV-00009')
    await expect(main(page)).toContainText('BLV-00009 · prête avant 13 h 05')
    const inter = page.getByRole('switch')
    await expect(inter).toHaveAttribute('aria-checked', 'true')
    await inter.click()
    await expect(inter).toHaveAttribute('aria-checked', 'false')
    await expect(main(page)).toContainText('Le stock reste en ligne')
  })

  test('« Signaler la rupture » : 5 s pour annuler, puis la commande quitte la file, le stock passe à 0, le journal le prouve', async ({ page }) => {
    await ouvrir(page, '#rupture?ref=BLV-00008', FR)
    await page.getByRole('button', { name: 'Signaler la rupture' }).click()
    await expect(main(page)).toContainText('Envoi de la rupture dans')
    await page.getByRole('button', { name: 'Annuler l’envoi' }).click()
    await expect(page.getByRole('button', { name: 'Signaler la rupture' })).toBeVisible()
    await page.getByRole('button', { name: 'Signaler la rupture' }).click()
    await expect(page).toHaveURL(/\/commandes$/, { timeout: 9000 })
    await expect(main(page)).toContainText('Rupture signalée pour BLV-00008')
    // Une à préparer de moins, une annulée de plus ; le total ne change pas.
    await expect(page.locator('.pg-s')).toHaveText('56 commandes · 2 à préparer · 2 en cours · 3 en litige · 4 en retour · 40 terminées · 5 annulées')
    await page.goto('commandes?f=fin&voir=annulees')
    await expect(page.locator('.card.ord', { hasText: 'BLV-00008' })).toContainText('Rupture signalée')
    await page.goto('journal?ref=BLV-00008')
    await expect(main(page)).toContainText('Rupture signalée')
    await expect(main(page)).toContainText('Stock de l’ITEL AC52 noir mis à jour')
    await expect(page.locator('.tl .pill').first()).toHaveText('3')
    await page.goto('rupture?ref=BLV-00008')
    await expect(main(page)).toContainText('La rupture de cette commande est déjà signalée.')
    await expect(page.getByRole('button', { name: 'Signaler la rupture' })).toBeDisabled()
  })

  test('accès Préparation et anglais', async ({ page }) => {
    await ouvrir(page, '#rupture?ref=BLV-00008&role=prep', EN)
    await expect(main(page)).toContainText('Report out of stock')
    await expect(main(page)).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-05 · Besoin de plus de temps', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('trois choix et leur effet sur le livreur ; le bouton suit le choix ; échéance absolue en heures d’ouverture', async ({ page }) => {
    await ouvrir(page, '#delai?ref=BLV-00008', FR)
    await expect(page.getByRole('radio')).toHaveCount(3)
    await expect(page.getByRole('radio').nth(0)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio').nth(0)).toContainText('+ 1 h · prête avant 13 h 42Le livreur passe toujours entre 14 h et 16 h')
    await expect(page.getByRole('radio').nth(1)).toContainText('Le livreur attendra la fin de la préparation')
    await expect(main(page)).toContainText('Au plus tard mercredi 23 sept. à 12 h 42, 24 heures d’ouverture après le paiement.')
    await page.getByRole('radio').nth(2).click()
    await expect(page).toHaveURL(/c=d/)
    await expect(page.getByRole('button', { name: 'Demander jusqu’à demain 08 h' })).toBeVisible()
  })

  test('demander + 2 h : nouvelle heure sur la commande, « Plus de temps » disparaît, une seule fois', async ({ page }) => {
    await ouvrir(page, '#delai?ref=BLV-00008&c=2', FR)
    await page.getByRole('button', { name: 'Demander 2 heures de plus' }).click()
    await expect(page).toHaveURL(/\/commande\?ref=BLV-00008$/)
    await expect(main(page)).toContainText('Nouvelle heure : prête avant 14 h 42. Le client et le livreur sont prévenus.')
    await expect(page.locator('.hero.night .hk')).toHaveText('Prête aujourd’hui avant 14 h 42')
    await expect(page.locator('.card.tight .li .lt')).not.toContainText(['Plus de temps'])
    await page.goto('delai?ref=BLV-00008')
    await expect(main(page)).toContainText('Plus de temps déjà demandé')
    await page.goto('journal?ref=BLV-00008')
    await expect(page.locator('.tl .ti').first()).toContainText('Plus de temps demandé')
    await expect(page.locator('.tl .ti').first().locator('.pill')).toHaveText(['12 h 42', '14 h 42'])
  })

  test('anglais : « Demander jusqu’à demain 08 h » traduit (défaut 5 corrigé)', async ({ page }) => {
    await ouvrir(page, '#delai?ref=BLV-00008&c=d', EN)
    await expect(page.getByRole('button', { name: 'Ask until tomorrow 8 am' })).toBeVisible()
  })
})

test.describe('VD-05 · Bon de préparation', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('bon sans donnée du client : imprimer, partager en PDF (A4 puis ticket 80 mm)', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __imprime: number }).__imprime = 0
      window.print = () => void ((window as unknown as { __imprime: number }).__imprime += 1)
    })
    await ouvrir(page, '#bon?ref=BLV-00008', FR)
    await expect(page.locator('.vd05-bon')).toContainText('Payée lun. 21 sept. à 08 h 42 · prête avant 12 h 42')
    await expect(page.locator('.vd05-bon')).toContainText('Aucune donnée du client ne figure sur ce bon.')
    await expect(page.locator('.vd05-bon')).toContainText('Libéré 3 jours après la confirmation du client')
    await page.getByRole('button', { name: 'Imprimer' }).click()
    expect(await page.evaluate(() => (window as unknown as { __imprime: number }).__imprime)).toBe(1)
    let tel = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Partager en PDF' }).click()
    let f = await tel
    expect(f.suggestedFilename()).toBe('bon-BLV-00008.pdf')
    expect(readFileSync((await f.path())!, 'latin1').slice(0, 8)).toBe('%PDF-1.4')
    await page.getByRole('radio', { name: 'Ticket 80 mm' }).click()
    tel = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Partager en PDF' }).click()
    f = await tel
    expect(f.suggestedFilename()).toBe('bon-BLV-00008-80mm.pdf')
    const pdf = readFileSync((await f.path())!, 'latin1')
    expect(pdf).toContain('ITL-AC52-NR')
    expect(pdf).not.toMatch(/481729/) // jamais le code de remise (BON-02)
  })

  test('accès Préparation : sans « Vous gardez » ; l’ouverture du bon est signée au journal', async ({ page }) => {
    await ouvrir(page, '#bon?ref=BLV-00009&role=prep', FR)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(main(page)).not.toContainText('Vous gardez')
    await page.goto('journal?ref=BLV-00009&role=prep')
    await expect(page.locator('.tl .ti').first()).toContainText('Bon de préparation ouvert')
    await expect(page.locator('.tl .ti').first()).toContainText('Aïcha N. · accès préparation')
  })
})

test.describe('VD-05 · Journal de la commande', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('fil signé du plus récent au plus ancien, filtre par auteur, copie comme preuve', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await ouvrir(page, '#journal?ref=BLV-00008', FR)
    await expect(page.locator('.tl .tt')).toHaveText(['Stock de l’ITEL AC52 noir mis à jour', 'Bon de préparation ouvert', 'Entrée dans la file à préparer', 'Commande payée par le client'])
    await expect(page.locator('.tl .td').nth(2)).toHaveText('Système BelivaY · prête avant 12 h 42')
    await page.locator('.chips').getByRole('button', { name: /Accès Préparation/ }).click()
    await expect(page.locator('.tl .ti')).toHaveCount(1)
    await page.getByRole('button', { name: 'Copier le journal comme preuve' }).click()
    await expect(page.getByRole('button', { name: 'Journal copié' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Journal de la commande BLV-00008')
  })

  test('« C’est prêt » s’y écrit, signé du propriétaire ; anglais', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00009', EN)
    await page.locator('.hero.night').getByRole('link', { name: 'It’s ready' }).click()
    await expect(page).toHaveURL(/commande_prete/)
    await page.goto('journal?ref=BLV-00009')
    await expect(page.locator('.tl .ti').first()).toContainText('“It’s ready”')
    await expect(page.locator('.tl .ti').first()).toContainText('Franck Penga · owner')
  })
})
