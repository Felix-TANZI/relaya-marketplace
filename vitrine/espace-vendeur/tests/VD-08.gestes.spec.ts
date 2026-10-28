// Gestes du groupe VD-08 (Produits et nouvelle offre) : chaque geste change les données (source de démonstration,
// gardée sur l'appareil) et l'écran les suit ; montants calculés par src/calculs (jamais écrits) ; accès Préparation
// sans montant ; parcours T8 de la recette (VD-12 p9) de bout en bout sur la page unique « Nouveau produit » (DP-58).
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

/** Une vraie photo (PNG) de la taille voulue, fabriquée dans la page. */
async function photo(page: Page, l = 1200, h = 1000) {
  const b64 = await page.evaluate(
    ([l, h]) => {
      const c = document.createElement('canvas')
      c.width = l
      c.height = h
      const x = c.getContext('2d')!
      x.fillStyle = '#c9500e'
      x.fillRect(0, 0, l, h)
      x.fillStyle = '#fff'
      x.fillRect(l / 4, h / 4, l / 2, h / 2)
      return c.toDataURL('image/png').split(',')[1]
    },
    [l, h],
  )
  return { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

async function prendrePhoto(page: Page, l = 1200, h = 1000) {
  await page.locator('input[type=file][capture]').setInputFiles(await photo(page, l, h))
  await page.getByRole('button', { name: 'Utiliser cette photo' }).click()
}

test.describe('VD-08 · Mes produits', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('synthèse et tri viennent des données : ITEL noir en premier, gardé calculé, ventes du mois', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    // Jeu d'essai (src/demo/jeu-essai.ts) : 10 offres, une par état au moins (6 en vente, ITEL bleu en vérification,
    // ITEL 64 Go en pause, pagne rouge en brouillon, iPhone 128 Go refusé).
    await expect(page.locator('.pg-s')).toHaveText('10 produits · 6 en vente · 1 en vérification · 1 en pause · 1 brouillon · 1 refusée')
    const cartes = page.locator('.card.ord')
    await expect(cartes).toHaveCount(10)
    await expect(cartes.first()).toContainText('ITEL AC52 · noir')
    // ITEL à 20 000 F, Bronze, découverte : 17 840 F gardés ; 3 ventes en septembre (PRD-04 : gelées exclues).
    await expect(cartes.first()).toContainText('17 840 F')
    await expect(cartes.first()).toContainText('Ce mois : 2 ventes · 35 680 F gardés')
    await expect(cartes.first()).toContainText('Un vendeur est passé à 19 000 F')
    // La bande de vérification n'a pas d'action.
    await expect(page.locator('.card.ord.amber')).toContainText('Réponse avant mer. 14 oct. à 16 h 10')
  })

  test('stock rapide : la feuille enregistre, la bande « Stock bas » disparaît, gardé après rechargement', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    const noir = page.locator('.card.ord').first()
    await noir.getByRole('button', { name: /Changer le stock/ }).click()
    await page.getByRole('button', { name: '+10' }).click()
    await page.getByRole('button', { name: 'Enregistrer le stock' }).click()
    await expect(page.locator('.vd-toast')).toContainText('Stock enregistré : 13')
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · noir' })).not.toContainText('Stock bas')
    await page.reload()
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · noir' }).getByRole('button', { name: /Changer le stock/ })).toContainText('13')
  })

  test('recherche, filtres et tri : la liste suit, « Tout afficher » revient', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    await page.getByRole('searchbox', { name: 'Chercher dans mes produits' }).fill('iphone')
    await expect(page.locator('.card.ord')).toHaveCount(2) // 256 Go (en vente) et 128 Go (refusée)
    await page.getByRole('searchbox', { name: 'Chercher dans mes produits' }).fill('')
    await page.getByRole('tab', { name: /En vérification/ }).click()
    await expect(page).toHaveURL(/f=en_verification/)
    await expect(page.locator('.card.ord')).toHaveCount(1)
    await page.getByRole('tab', { name: /Tous/ }).click()
    await page.getByRole('radio', { name: 'Stock le plus bas' }).click()
    await expect(page.locator('.divider-t')).toHaveText('Le stock le plus bas en haut')
  })

  test('« Dupliquer » au pied de carte ouvre Dupliquer sans ouvrir la carte ; bande litige vers les litiges', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    await page.locator('.card.ord').first().getByRole('link', { name: 'Dupliquer' }).click()
    await expect(page).toHaveURL(/\/dupliquer\?p=itel-noir$/)
    await page.goBack()
    await page.locator('.card.ord', { hasText: 'iPhone' }).getByRole('link', { name: /en litige/ }).click()
    await expect(page).toHaveURL(/\/litiges$/)
  })

  test('accès Préparation : aucun montant, ni « Ajouter un produit » ni « Dupliquer », stock possible', async ({ page }) => {
    await ouvrir(page, '#produits?role=prep', FR)
    await expect(page.locator('#app main')).not.toContainText(/\d F\b/)
    await expect(page.getByText('Ajouter un produit')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Dupliquer' })).toHaveCount(0)
    await expect(page.locator('.card.ord').first().getByRole('button', { name: /Changer le stock/ })).toBeVisible()
  })

  test('anglais : synthèse et montants à l’anglaise', async ({ page }) => {
    await ouvrir(page, '#produits', { nom: 'anglais', theme: 'light', lang: 'en' })
    await expect(page.locator('h1.pg-t')).toHaveText('My products')
    await expect(page.locator('.card.ord').first()).toContainText('17,840 F')
  })
})

test.describe('VD-08 · Une offre', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('défaut 3 corrigé : « ?p=iphone » montre l’iPhone, pas l’ITEL', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=iphone', FR)
    await expect(page.locator('.card .an').first()).toHaveText('iPhone 15 Pro Max · 256 Go')
  })

  test('zones lues dans les données ; « Modifier le prix » ouvre l’étape 3 sur l’offre', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    await expect(page.locator('.hero.night .big')).toContainText('2 zones')
    await expect(page.locator('.hero.night .big small')).toHaveText('sur 4')
    await expect(page.locator('.hero.night')).toContainText('À 19 750 F, vous passez en premier dans 2 zones sur 4.') // R34 : médiane des prix gagnants des zones
    await page.getByRole('link', { name: 'Modifier le prix' }).click()
    await expect(page).toHaveURL(/\/offre3\?o=itel-noir$/)
  })

  test('paiement au retrait coupé puis « Annuler » ; mise en pause → Mes produits ; remise en vente', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    const tg = page.getByRole('switch', { name: 'Accepter le paiement au retrait' })
    await tg.click()
    await expect(tg).toHaveAttribute('aria-checked', 'false')
    await page.locator('.vd-toast').getByRole('button', { name: 'Annuler' }).click()
    await expect(tg).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Mettre en pause' }).click()
    await expect(page).toHaveURL(/\/produits$/)
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · noir' })).toContainText('En pause')
    await page.goto('offre_detail?p=itel-noir')
    await expect(page.locator('main')).toContainText('Invisible des clients')
    await page.getByRole('button', { name: 'Remettre en vente' }).first().click()
    await expect(page.locator('main')).toContainText('Où les clients vous voient')
  })

  test('prix automatique : le plancher privé est exigé, puis gardé', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    await page.getByRole('switch', { name: 'Prix automatique' }).click()
    await page.getByLabel('Ne jamais descendre sous').fill('30000')
    await page.getByRole('button', { name: 'Activer' }).click()
    await expect(page.locator('main')).toContainText('Entre 500 F et votre prix de 20 000 F.')
    await page.getByLabel('Ne jamais descendre sous').fill('18000')
    await page.getByRole('button', { name: 'Activer' }).click()
    await expect(page.locator('main')).toContainText('Jamais sous 18 000 F')
  })

  test('proposition de description (Q-34) : coordonnées refusées, puis envoyée', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    await page.getByRole('button', { name: 'Proposer une correction' }).click()
    await page.getByLabel('Ce qui manque ou ce qui est faux').fill('Appelez-moi au 677 12 42 17 pour les détails.')
    await page.getByRole('button', { name: 'Envoyer la proposition' }).click()
    await expect(page.locator('.sheet')).toContainText('Sans numéro de téléphone')
    await page.getByLabel('Ce qui manque ou ce qui est faux').fill('La batterie fait 5 000 mAh et non 4 000 mAh.')
    await page.getByRole('button', { name: 'Envoyer la proposition' }).click()
    await expect(page.locator('main')).toContainText('Proposition envoyée')
  })

  test('aperçu client : la fiche avec prix, stock et « Payer au comptoir »', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    await page.getByRole('button', { name: 'Aperçu client' }).click()
    const f = page.getByRole('dialog', { name: 'Ce que verra le client' })
    await expect(f).toContainText('20 000 F')
    await expect(f).toContainText('En stock · 3 disponibles')
    await expect(f).toContainText('Payer au comptoir')
  })

  test('accès Préparation : aucun montant, stock modifiable', async ({ page }) => {
    await ouvrir(page, '#offre_detail?role=prep', FR)
    await expect(page.locator('#app main')).not.toContainText(/\d F\b/)
    await expect(page.getByRole('button', { name: 'Changer le stock' })).toBeVisible()
  })
})

test.describe('VD-08 · Nouveau produit (DP-58, T8)', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })
  const recherche = (page: Page) => page.getByRole('textbox', { name: /Rechercher le produit/ })
  const creer = (page: Page) => page.getByRole('button', { name: /créer un nouveau produit/ })

  test('T8 : recherche, « Je vends ce produit », 3 photos réelles, 21 000 F → 18 800 F, ajuster au conseil (R34) 19 750 F → 17 617 F, publié', async ({ page }) => {
    test.slow()
    await ouvrir(page, '#offre1', FR)
    await recherche(page).fill('itel ac52')
    await expect(page.locator('.divider-t').filter({ hasText: 'au catalogue' })).toHaveText('3 produits au catalogue')
    await expect(page.locator('.np-ligne.mienne')).toHaveCount(4) // « Vous le vendez déjà » : noir, bleu, 64 Go, coque
    const ligne = page.locator('.np-ligne', { hasText: 'Prix du marché : 19 000 – 20 500 F' })
    await expect(ligne).toContainText('Vous gardez 89 % à 20 000 F')
    await expect(ligne).toContainText('3 vendeurs')
    await ligne.getByRole('button', { name: 'Je vends ce produit' }).click()
    await expect(page).toHaveURL(/\/offre1\?b=/)
    await expect(page.getByLabel('Variante')).toHaveValue('vert')
    await expect(page.locator('main')).toContainText('Encore 3 photos')
    await page.getByRole('link', { name: 'Prendre' }).click()
    await expect(page).toHaveURL(/\/camera\?mode=photo/)
    await prendrePhoto(page, 700, 700) // trop petite : refusée (PHO-01)
    await expect(page.getByRole('alert')).toHaveText('Moins de 800 × 800 px : reprenez-la')
    for (let i = 0; i < 3; i++) await prendrePhoto(page)
    await page.getByRole('link', { name: 'Terminé · 3' }).click()
    await expect(page).toHaveURL(/\/offre1\?b=/)
    await expect(page.locator('.np-principale')).toHaveCount(1)
    await page.getByLabel('Stock disponible').fill('12')
    await page.getByLabel('Prix de vente').fill('21000')
    await expect(page.locator('.keep')).toContainText('18 800 F')
    await expect(page.locator('.keep')).toContainText('soit 89,5 %')
    await expect(page.locator('.np-conseil')).toContainText('Prix conseillé : 19 750 F')
    await expect(page.locator('.np-conseil')).toContainText('Vous gardez 17 617 F')
    await page.locator('.np-conseil').getByRole('button', { name: 'Ajuster' }).click()
    await expect(page.locator('.keep')).toContainText('17 617 F')
    await page.getByRole('button', { name: 'Publier · vérification sous 48 h' }).click()
    await expect(page.getByRole('alert')).toContainText('Il manque : l’état')
    await page.getByLabel('État du produit').selectOption('Neuf')
    await page.getByRole('button', { name: 'Publier · vérification sous 48 h' }).click()
    await expect(page).toHaveURL(/\/offre_publiee\?o=/)
    await expect(page.locator('main')).toContainText('ITEL AC52 vert à 19 750 F.')
    await expect(page.locator('.hero.night')).toHaveCount(0) // R34 : pas de « Meilleur prix », une offre à 19 000 F reste moins chère
    await page.getByRole('link', { name: 'Voir mes produits' }).click()
    await expect(page.locator('.pg-s')).toHaveText('11 produits · 6 en vente · 2 en vérification · 1 en pause · 1 brouillon · 1 refusée')
  })

  test('« créer un nouveau produit » grisé avant la recherche, actif après ; nom, catégorie et marque proposés ; promotion et note vérifiées', async ({ page }) => {
    await ouvrir(page, '#offre1', FR)
    await expect(creer(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('main')).toContainText('Cherchez d’abord : il existe peut-être déjà.')
    await recherche(page).fill('ch')
    await expect(creer(page)).toHaveAttribute('aria-disabled', 'true')
    await recherche(page).fill('chargeur itel')
    await expect(page.locator('main')).toContainText('« chargeur itel » : cherché 14 fois près de chez vous, sans résultat.')
    await expect(creer(page)).not.toHaveAttribute('aria-disabled', 'true')
    await creer(page).click()
    await expect(page).toHaveURL(/\/offre1\?b=/)
    await expect(page.getByLabel('Nom du produit')).toHaveValue('chargeur itel')
    await expect(page.getByLabel('Catégorie')).toHaveValue('Électronique')
    await expect(page.getByLabel('Marque')).toHaveValue('itel')
    await page.getByLabel('Prix de vente').fill('15000')
    await expect(page.locator('.keep')).toBeVisible()
    await page.getByLabel('Prix barré (avant promo)').fill('15500')
    await expect(page.locator('#np-promo + .hint')).toContainText('10 % de remise au moins')
    await page.getByLabel('Prix barré (avant promo)').fill('18000')
    await page.getByLabel('Fin de promotion').fill('2026-10-22')
    await expect(page.locator('#np-promo + .hint')).toContainText('−16 % jusqu’au 22 octobre')
    await page.getByLabel('Note vendeur').fill('Appelez le 699 00 00 00')
    await expect(page.locator('#np-note')).toContainText('l’échange passe par BelivaY')
    await page.getByRole('button', { name: /^Publier/ }).click()
    await expect(page.getByRole('alert').first()).toContainText('Il manque : les photos, le stock, l’état, la note')
    // Brouillon gardé : Mes produits le montre avec ce qui manque.
    await page.waitForTimeout(600)
    await page.goto('produits')
    await expect(page.locator('.card.ord', { hasText: 'chargeur itel' })).toContainText('Il manque : le stock, l’état, les photos')
  })

  test('doublon (FCH-02) : le nom d’une fiche existante propose « Je vends celui-ci », la saisie est gardée', async ({ page }) => {
    await ouvrir(page, '#offre1', FR)
    await recherche(page).fill('itel ac52 neuf')
    await creer(page).click()
    await page.getByLabel('Prix de vente').fill('19500')
    await page.getByLabel('Nom du produit').fill('ITEL AC52')
    await page.getByRole('button', { name: 'Je vends celui-ci' }).click()
    await expect(page).toHaveURL(/rattache=1/)
    await expect(page.locator('main')).toContainText('Ce produit existe déjà : votre offre y est rattachée.')
    await expect(page.getByLabel('Prix de vente')).toHaveValue('19500')
    await expect(page.locator('main')).toContainText('Fiche BelivaY : titre, description et photos de référence déjà écrits')
  })

  test('code-barres : le scan vaut une recherche (connu : sa fiche ; inconnu : « créer » s’active)', async ({ page }) => {
    await ouvrir(page, '#camera?mode=scan', FR)
    await page.getByRole('button', { name: 'Taper les chiffres du code-barres' }).click()
    await page.getByRole('textbox', { name: 'Code-barres' }).fill('0000000000')
    await page.getByRole('button', { name: 'Trouver la fiche' }).click()
    await expect(page).toHaveURL(/\/offre1\?code=0000000000/)
    await expect(page.locator('main')).toContainText('inconnu du catalogue')
    await expect(creer(page)).not.toHaveAttribute('aria-disabled', 'true')
    await page.goto('camera?mode=scan')
    await page.getByRole('button', { name: 'Taper les chiffres du code-barres' }).click()
    await page.getByRole('textbox', { name: 'Code-barres' }).fill('6941812725203')
    await page.getByRole('button', { name: 'Trouver la fiche' }).click()
    await expect(page).toHaveURL(/\/offre1\?code=6941812725203/)
    await expect(page.locator('.np-ligne', { hasText: 'ITEL AC52' }).getByRole('button', { name: 'Je vends ce produit' })).toBeVisible()
  })

  test('accès Préparation : la publication est réservée ; les anciennes étapes mènent à la page unique', async ({ page }) => {
    await ouvrir(page, '#offre1?role=prep', FR)
    await expect(page.locator('main')).toContainText('Réservé au propriétaire')
    await page.goto('fiche?q=chargeur')
    await expect(page).toHaveURL(/\/offre1\?q=chargeur/)
  })
})

test.describe('VD-08 · Dupliquer', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('variante libre de la fiche, déjà créées citées, brouillon puis « Nouveau produit » ; « Autre… » mène à la recherche', async ({ page }) => {
    await ouvrir(page, '#dupliquer?p=itel-noir', FR)
    await expect(page.locator('main')).toContainText('Déjà créées : noir (en vente), bleu (en vérification).')
    await expect(page.getByRole('radio', { name: 'vert' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.note.green')).toContainText('Le vert existe déjà au catalogue')
    await page.getByRole('radio', { name: 'Autre…' }).click()
    await page.getByLabel('Nom de la variante').fill('rose')
    await expect(page.getByRole('button', { name: 'Demander une fiche' })).toBeVisible()
    await page.getByRole('radio', { name: 'vert' }).click()
    await page.getByRole('button', { name: 'Créer le brouillon' }).click()
    await expect(page).toHaveURL(/\/offre1\?b=/)
    await page.goto('produits')
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · vert' })).toContainText('Brouillon')
    // Supprimer, puis « Annuler ».
    await page.locator('.card.ord', { hasText: 'ITEL AC52 · vert' }).getByRole('button', { name: 'Supprimer' }).click()
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · vert' })).toHaveCount(0)
    await page.locator('.vd-toast').getByRole('button', { name: 'Annuler' }).click()
    await expect(page.locator('.card.ord', { hasText: 'ITEL AC52 · vert' })).toHaveCount(1)
  })

  test('sans offre source : le choix de l’offre à dupliquer', async ({ page }) => {
    await ouvrir(page, '#dupliquer', FR)
    await page.getByRole('link', { name: 'iPhone 15 Pro Max · 256 Go' }).click()
    await expect(page).toHaveURL(/\/dupliquer\?p=iphone$/)
    // Le 128 Go est désormais une offre du jeu d'essai (refusée) : cité parmi les déjà créées, jamais proposé (DUP-04).
    await expect(page.locator('main')).toContainText('Déjà créées : 128 Go (refusée), 256 Go (en vente).')
    await expect(page.getByRole('radio', { name: '128 Go' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: '512 Go' })).toHaveAttribute('aria-checked', 'true')
  })
})

// VAGUE n° 11 : assistant de mise en ligne en trois étapes — photo (reconnaissance), prix suggéré par la meilleure
// offre (R34 : le prix conseillé sans borne haute), stock — jusqu'à l'offre envoyée.
for (const r of [FR, { nom: 'sombre', theme: 'dark', lang: 'fr' } as const])
  test(`mise en ligne guidée : photo, prix suggéré, stock · ${r.nom}`, async ({ page }) => {
    await figerHorloge(page)
    await ouvrir(page, '#produits', r)
    await page.getByRole('link', { name: 'Mise en ligne guidée : photo, prix, stock' }).click()
    await expect(page).toHaveURL(/mise_en_ligne/)
    const fichier = page.locator('input[data-assistant-photo]')
    await fichier.setInputFiles(await photo(page))
    await expect(page.getByText('C’est celui-ci ?')).toBeVisible()
    await page.locator('.ml-fiche').first().click()
    await expect(page).toHaveURL(/[?&]b=/)
    while (await page.getByText(/^Encore \d photos?\.$/).count()) {
      await fichier.setInputFiles(await photo(page))
      await page.waitForTimeout(150)
    }
    await page.getByRole('button', { name: 'Continuer : le prix' }).click()
    const sugg = page.locator('[data-prix-suggere]')
    await expect(sugg).toContainText('Prix suggéré par la meilleure offre')
    const suggere = Number(await sugg.getAttribute('data-prix-suggere'))
    await expect(page.getByLabel('Votre prix de vente')).toHaveValue(String(suggere))
    await expect(page.locator('.hint', { hasText: 'Vous gardez' })).toBeVisible()
    await page.getByLabel('Votre prix de vente').fill(String(suggere + 1000))
    await page.getByRole('button', { name: /Prendre le prix suggéré/ }).click()
    await expect(page.getByLabel('Votre prix de vente')).toHaveValue(String(suggere))
    await page.getByRole('button', { name: 'Continuer : le stock' }).click()
    await page.getByRole('button', { name: 'Plus', exact: true }).click()
    await expect(page.locator('.ml-qte b')).toHaveText('2')
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: /^Mettre en ligne/ }).click()
    await expect(page).toHaveURL(/offre_publiee\?o=/)
    await expect(page.getByRole('main').getByRole('heading', { name: /Offre envoyée|Offre gardée/ })).toBeVisible()
  })
