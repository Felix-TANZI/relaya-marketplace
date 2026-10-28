// Vague d'améliorations validée par le porteur (logique-metier/VAGUE-AMELIORATIONS.md) : les gestes des écrans du
// client, en données réelles de la démonstration.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

const section = (page: Page, texte: string) => page.locator('section.cl07-sc', { hasText: texte })

// N° 3 — panier : livraison offerte sur le panier entier (R07, v2.0), total livré, relais ou domicile, alertes, plus
// tard, accessoires, partage à un proche.
test('panier : livraison offerte, total livré, domicile, plus tard, accessoires, partage', async ({ page }) => {
  // Un article à 6 500 F d'une autre boutique : un colis de plus ; le seuil se compte sur le panier entier.
  await page.goto('/fiche?p=cahiers-scolaires')
  await page.getByRole('button', { name: 'Acheter', exact: true }).filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/panier/)
  await expect(section(page, 'Cahiers Clairefontaine')).toHaveCount(1)
  await expect(section(page, 'Cahiers Clairefontaine').locator('.pan-seuil')).toHaveCount(0)
  await expect(page.locator('[data-offerte]')).toContainText('Livraison offerte jusqu’à 900 F')
  // Barre du bas compacte : le total (frais de paiement compris) et la livraison, sans nom de prestataire.
  const total = page.locator('[data-total-livre]').first()
  await expect(total).toHaveText('Total 286 428 Fdont livraison 2 500 F') // R08 : une boutique de plus, dans la zone du relais (+ 500 F)
  await expect(page.locator('main')).not.toContainText('CamPay')
  // À domicile, choisi dans le panier (repris au paiement, jamais reproposé) : 1 500 F offerts dès 50 000 F.
  await page.getByRole('radio', { name: /À domicile/ }).click()
  await expect(page.getByRole('radio', { name: /À domicile/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-offerte]')).toContainText('Livraison offerte jusqu’à 1 500 F')
  await expect(page.locator('.cl07-rc')).toContainText('Livraison à domicile')
  await page.locator('.cl07-bar .btn.primary').click()
  await expect(page).toHaveURL(/\/paiement-moyen/)
  await expect(page.locator('[data-livraison]')).toContainText('À domicile')
  await page.goto('/panier')
  await page.getByRole('radio', { name: /Au relais/ }).click()
  await expect(page.getByRole('radio', { name: /Au relais/ })).toHaveAttribute('aria-checked', 'true')
  // Enregistré pour plus tard : l'iPhone 16 gardé à 625 000 F, vu au prix du jour et à son stock.
  const plusTard = page.locator('section.pan-pt')
  await expect(plusTard).toContainText('Enregistré pour plus tard (1)')
  await expect(plusTard).toContainText('Prix baissé de 17 400 F (−3 %) depuis que tu l’as enregistré.') // l'offre retenue aujourd'hui (BV-DEV-02)
  await expect(plusTard).toContainText('Plus que 2 en stock')
  // « Pour plus tard » : l'article sort du total, son colis disparaît.
  await section(page, 'Cahiers Clairefontaine').getByRole('link', { name: 'Enregistrer pour plus tard : Cahiers Clairefontaine 96 pages, lot de 5' }).click()
  await expect(page.locator('.note.green', { hasText: 'enregistré pour plus tard' })).toBeVisible()
  await expect(section(page, 'Cahiers Clairefontaine')).toHaveCount(0)
  await expect(plusTard).toContainText('Enregistré pour plus tard (2)')
  await expect(page.locator('.cl07-bar [data-total-livre] b')).toHaveText('279 285 F')
  // Remis au panier au prix du jour : l'iPhone 16 et ses accessoires compatibles (marque, même colis d'abord).
  await plusTard.locator('.pan-pt-i', { hasText: 'iPhone 16' }).getByRole('button', { name: 'Remettre au panier' }).click()
  await expect(page.locator('.note.green', { hasText: 'remis au panier, au prix du jour' })).toBeVisible()
  const acc = page.locator('.pan-acc', { hasText: 'Accessoires compatibles · iPhone 16' })
  await expect(acc.locator('.pan-acc-i')).toHaveCount(3)
  await expect(acc).toContainText('Chargeur Apple MagSafe 25 W')
  await expect(acc).not.toContainText('Galaxy')
  await acc.getByRole('button', { name: 'Ajouter au panier : Chargeur Apple MagSafe 25 W' }).click()
  await expect(page.locator('.note.green', { hasText: '« Chargeur Apple MagSafe 25 W » ajouté au panier.' })).toBeVisible()
  await expect(page.locator('.blk', { hasText: 'Chargeur Apple MagSafe 25 W' }).first()).toBeVisible()
  // Partager à un proche : un lien de paiement, partagé ou copié.
  await page.locator('.cl07-info', { hasText: 'Partager à un proche' }).click()
  await page.getByRole('button', { name: 'Créer le lien du panier' }).click()
  await expect(page.locator('.pan-pp')).toContainText('Lien prêt')
  await expect(page.locator('.pan-pp-l')).toContainText('/payeur?id=PP-')
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
})

// N° 4 — recherche intelligente : fautes corrigées dès la saisie, équivalents des mots de tous les jours, recherches
// récentes et populaires.
test('recherche : « Tu voulais dire … ? », équivalents, récentes et populaires', async ({ page }) => {
  await page.goto('/recherche-saisie?q=ifone')
  const corr = page.locator('.cl05-corr')
  await expect(corr).toHaveText('Tu voulais dire « iphone » ?')
  await expect(page.locator('.cl05-s2', { hasText: 'iPhone 16' }).first()).toBeVisible()
  await corr.click()
  await expect(page).toHaveURL(/recherche-resultats\?q=iphone/)
  await page.goto('/recherche-resultats?q=ifone%2016')
  await expect(page.locator('main')).toContainText('Corrigé depuis')
  await expect(page.locator('main')).toContainText('iPhone 16')
  // « samsoung » : trouvé par le début du mot (« sams… »), sans détour.
  await page.goto('/recherche-resultats?q=samsoung')
  await expect(page.locator('main')).toContainText('Samsung Galaxy')
  // « frigo » : le réfrigérateur, par son équivalent (aucune faute à corriger).
  await page.goto('/recherche-resultats?q=frigo')
  await expect(page.locator('main')).toContainText('Réfrigérateur')
  await expect(page.locator('main')).not.toContainText('Corrigé depuis')
  // Accueil de la recherche : la recherche faite plus haut, puis les populaires.
  await page.goto('/recherche')
  await expect(page.locator('.cl05-h', { hasText: 'iphone' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Recherches populaires')
})

// N° 5 — comparateur : jusqu'à trois produits d'une catégorie, barre « Comparer », meilleure valeur, différences.
// L'ordre de la liste suit la meilleure offre (donnees/recommandation.ts) et la grille se charge en défilant : on
// défile jusqu'au produit voulu.
async function produitDeLaListe(page: Page, nom: string) {
  const b = page.getByRole('button', { name: nom }).first()
  // La dernière carte montrée amène la suite de la grille (observateur sous la grille).
  await expect(page.locator('.pgrid.cl04-k > *').first()).toBeVisible()
  for (let i = 0; i < 15 && !(await b.count()); i++) {
    // La grille se redessine en chargeant la suite : une carte détachée entre-temps est simplement reprise au tour suivant.
    await page.locator('.pgrid.cl04-k > *').last().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined)
    await page.waitForTimeout(300)
  }
  return b
}
test('comparateur : barre « Comparer », meilleure valeur, seulement les différences', async ({ page }) => {
  await page.goto('/liste?cat=tel')
  await (await produitDeLaListe(page, 'Comparer : iPhone 16 Pro Max')).click()
  const barre = page.locator('.cmp-barre')
  await expect(barre).toContainText('1/3')
  await expect(barre).toContainText('Smartphones')
  await expect(barre.locator('.cmp-go')).toHaveAttribute('aria-disabled', 'true')
  // Une autre catégorie remplace la comparaison, annoncé ; on revient aux smartphones.
  await (await produitDeLaListe(page, 'Comparer : iPad Pro M4 11″')).click()
  await expect(page.getByText('Une catégorie à la fois : on compare maintenant les Tablettes.')).toBeVisible()
  await expect(barre).toContainText('1/3')
  await page.getByRole('button', { name: 'Retirer de la comparaison : iPad Pro M4 11″' }).first().click()
  await expect(barre).toHaveCount(0)
  for (const p of ['iPhone 16 Pro Max', 'Samsung Galaxy S25 Ultra', 'Google Pixel 9 Pro']) await (await produitDeLaListe(page, 'Comparer : ' + p)).click()
  await expect(barre).toContainText('3/3')
  await (await produitDeLaListe(page, 'Comparer : iPhone 16e')).click()
  await expect(page.getByText('3 produits au plus : retire-en un pour comparer « iPhone 16e ».')).toBeVisible()
  await barre.getByRole('link', { name: 'Comparer' }).click()
  await expect(page).toHaveURL(/\/comparer$/)
  await expect(page.locator('.cmp-col')).toHaveCount(3)
  await expect(page.locator('.cmp-col[data-meilleure]')).toHaveCount(1)
  await expect(page.locator('.cmp-col[data-meilleure] .cmp-badge')).toHaveText('Meilleure valeur')
  await expect(page.locator('.cmp-pourquoi')).toContainText('le moins cher livré au relais parmi les mieux notés')
  // Jamais la lettre de boutique : le vendeur est « certifié », avec son Trust Score.
  await expect(page.locator('.cmp-l[data-ligne="Vendeur"]')).toContainText('Vendeur certifié · Trust Score')
  await expect(page.locator('main')).not.toContainText(/Boutique [A-H]\b/)
  const toutes = await page.locator('.cmp-l').count()
  await page.getByRole('switch', { name: 'Seulement les différences' }).click()
  await expect(page.getByRole('switch', { name: 'Seulement les différences' })).toHaveAttribute('aria-checked', 'true')
  expect(await page.locator('.cmp-l').count()).toBeLessThan(toutes)
  await expect(page.locator('.cmp-l[data-ligne="Colis"]')).toHaveCount(0) // tous en colis S
  await page.getByRole('button', { name: 'Retirer de la comparaison : Google Pixel 9 Pro' }).click()
  await expect(page.locator('.cmp-col')).toHaveCount(2)
  await page.getByRole('button', { name: 'Ajouter au panier : Samsung Galaxy S25 Ultra' }).click()
  await expect(page.locator('.note.green', { hasText: '« Samsung Galaxy S25 Ultra » ajouté au panier.' })).toBeVisible()
})

// N° 8 — alerte de baisse de prix des favoris : la donnée (prix du jour, prix de l'ajout), la notification, le composant.
test('favoris : baisse de prix notifiée, montrée sous le panier', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.locator('main')).toContainText('Baisse de prix · Montre Garmin Fenix 8')
  await expect(page.locator('main')).toContainText('−60 000 F (−8 %) depuis ton ajout aux favoris')
  await page.goto('/panier')
  await expect(page.locator('.cl07-sv', { hasText: 'Montre Garmin Fenix 8' }).locator('[data-baisse]')).toHaveText('Prix baissé de 60 000 F (−8 %) depuis ton ajout.')
  await expect(page.locator('.cl07-sv', { hasText: 'Nike Air Max Dn' }).locator('[data-baisse]')).toHaveCount(0)
})

// N° 9 — suivi « vitrine » : le trajet dessiné, le livreur sur la carte (position approchée), l'arrivée estimée.
test('suivi vitrine : la carte du trajet remplace le plan indicatif', async ({ page }) => {
  await page.goto('/suivi?ref=BLV-52107')
  const v = page.locator('.c9v')
  await expect(v).toBeVisible()
  await expect(v).toHaveAttribute('data-vitrine', /^[0-3]$/)
  await expect(v.locator('.c9v-pin')).toHaveCount(2)
  await expect(v).toContainText('En direct')
  await expect(page.locator('main')).not.toContainText('Plan indicatif')
})

// N° 10 — accueil par moments : le moment du jour (Rentrée à l'heure de la démonstration), aperçu de la console.
test('accueil par moments : aucun moment le 13 oct. (Rentrée retirée), aperçu d’un autre moment, aucun', async ({ page }) => {
  // La Rentrée est retirée par le porteur (moment « rentree » désactivé) : le 13 octobre, l'accueil n'a pas de moment.
  await page.goto('/')
  await expect(page.locator('.acc-moment')).toHaveCount(0)
  await page.goto('/?moment=fetes')
  const m = page.locator('.acc-moment')
  await expect(m).toHaveAttribute('data-moment', 'fetes')
  await expect(m).toContainText('Les fêtes de fin d’année')
  await expect(m.locator('.acc-moment-i').first()).toBeVisible()
  await m.getByRole('link', { name: 'Voir la sélection' }).click()
  await expect(page).toHaveURL(/\/promotions/)
  await page.goto('/?moment=aucun')
  await expect(page.locator('.acc-moment')).toHaveCount(0)
})

// N° 14 (porteur) — « Mon abonnement » simplifié : « Changer de palier » en grand, « Ce mois-ci » calculé sur les
// commandes du mois, liste courte, « Résilier » discret ; le palier conseillé mis en avant sur « Abonnements ».
for (const [nom, largeur, theme] of [['téléphone clair', 390, 'light'], ['ordinateur sombre', 1440, 'dark']] as const)
  test(`mon abonnement simplifié · ${nom}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.addInitScript((t) => localStorage.setItem('blv_c_theme', t), theme)
    await page.setViewportSize({ width: largeur, height: 900 })
    await page.goto('/mon-abonnement')
    const tete = page.locator('.ab-tete')
    await expect(tete).toContainText('Prime · actif')
    await expect(tete).toContainText('4 000 F par mois')
    await expect(tete).toContainText('Prochain prélèvement : 4 000 F')
    const changer = page.locator('a.ab-changer')
    await expect(changer).toHaveText('Changer de palier')
    await expect(changer).toBeVisible()
    const [bt, bh] = [await changer.boundingBox(), await tete.boundingBox()]
    expect(bt!.width).toBeGreaterThan(bh!.width * 0.8)
    expect(bt!.height).toBeGreaterThanOrEqual(50)
    // En haut de la page, visible sans défiler dès l'ouverture (et sur un petit téléphone de 667 px de haut).
    expect(bt!.y + bt!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
    if (largeur === 390) {
      await page.setViewportSize({ width: 390, height: 667 })
      const b = (await changer.boundingBox())!
      expect(b.y + b.height).toBeLessThanOrEqual(667)
      await page.setViewportSize({ width: 390, height: 900 })
    }
    // Ce mois-ci : les 3 commandes payées ce matin avec Prime (relais 900 F, domicile 1 500 F, relais 900 F, cagnotte 2 %).
    await expect(page.locator('[data-economies]')).toHaveText('4 490 F économisés')
    await expect(page.locator('.ab-mois')).toContainText('3 commandes · 3 300 F de livraison · 1 190 F de cagnotte')
    await expect(page.locator('[data-jauge="Domicile offert"]')).toContainText('1 / 3')
    await expect(page.locator('[data-jauge="Commandes du mois"]')).toContainText('3 / 30')
    await expect(page.locator('main')).not.toContainText('Tes économies avec')
    for (const l of ['Ma cagnotte', 'Parrainer un proche', 'Moyen de paiement', 'Conditions de l’abonnement']) await expect(page.locator('.li', { hasText: l }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Résilier Prime' })).toHaveClass(/secondary/)
    await changer.click()
    await expect(page).toHaveURL(/\/abonnements/)
    await expect(page.locator('[data-conseille="prime"]')).toHaveText('Conseillé pour toi')
    await expect(page.locator('.ab-conseil-t')).toContainText('Sur tes 3 commandes du mois, Prime t’aurait fait gagner 4 490 F, pour 4 000 F par mois.')
  })
