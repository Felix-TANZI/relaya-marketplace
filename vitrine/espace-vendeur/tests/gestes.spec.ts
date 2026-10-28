// Gestes de la coque de l'espace vendeur (communs à tous les écrans), à 375 px, comme site/tests/gestes.spec.ts et
// site/tests/larges.spec.ts côté client : barre du bas (onglets, badge, point « Argent gelé », bulle de verre qu'on
// fait glisser), retour mémorisé, Menu (entrées et préférences), menu du profil, thème, langue, accès Préparation de
// bout en bout. Chaque écran repris a en plus SON fichier de gestes, tests/VD-xx.gestes.spec.ts.
//
// Gabarit d'un test de gestes d'écran (voir tests/VD-04.gestes.spec.ts, l'écran de référence) :
//
//   import { expect, test } from '@playwright/test'
//   import { figerHorloge, ouvrir } from './commun'
//
//   test.describe('VD-xx · <écran>', () => {
//     test.beforeEach(async ({ page }) => {
//       await figerHorloge(page) // lundi 21 sept. 2026, 09 h 48 : le jeu d'essai
//       await ouvrir(page, '#<route>', { nom: 'clair', theme: 'light', lang: 'fr' })
//     })
//     test('<geste> : <ce qui doit changer, dans les données et à l'écran>', async ({ page }) => {
//       await page.getByRole('button', { name: '…' }).click()
//       await expect(page.locator('…')).toHaveText('…') // l'écran suit les données
//       await page.reload() // l'état est gardé (démonstration : sur l'appareil ; API : sur le serveur)
//       await expect(page.locator('…')).toHaveText('…')
//     })
//     test('accès Préparation : aucun montant', async ({ page }) => {
//       await ouvrir(page, '#<route>?role=prep', { nom: 'clair', theme: 'light', lang: 'fr' })
//       await expect(page.locator('#app main')).not.toContainText(/\d F\b/)
//     })
//   })
import { expect, test, type Locator, type Page } from '@playwright/test'
import { AJOUTEES, OUVERTES, figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
// Un montant, sous toutes ses formes : « 17 840 F », « 17 840 FCFA », « 17,840 F » (espaces fines comprises).
const MONTANT = /\d[\d\s  ,.]* ?F(CFA)?\b/

const dock = (page: Page) => page.locator('nav.dock')
const onglet = (page: Page, nom: string) => dock(page).locator('a.tab', { hasText: nom })
const centre = async (l: Locator) => {
  const b = (await l.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
/** Route de l'adresse ouverte (« / » : accueil). */
const routeOuverte = (page: Page) => new URL(page.url()).pathname.replace(/^\/vendeur\/?/, '') || 'accueil'

test.describe('coque · 375 px', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('barre du bas : les quatre onglets mènent à leur page ; un seul onglet actif, marqué aria-current', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await expect(dock(page).locator('a.tab')).toHaveText([/Accueil/, /Commandes/, /Produits/, /Argent/])
    for (const [nom, adresse, titre] of [
      ['Commandes', /\/vendeur\/commandes$/, 'Commandes reçues'],
      ['Produits', /\/vendeur\/produits$/, 'Mes produits'],
      ['Argent', /\/vendeur\/argent$/, 'Mon argent'],
      ['Accueil', /\/vendeur\/?$/, 'Neuf choses à faire'],
    ] as const) {
      await onglet(page, nom).click()
      await expect(page).toHaveURL(adresse)
      await expect(page.locator('#app main h1').first()).toHaveText(titre)
      await expect(dock(page).locator('a.tab[aria-current="page"]')).toHaveCount(1)
      await expect(onglet(page, nom)).toHaveAttribute('aria-current', 'page')
      await expect(onglet(page, nom)).toHaveClass(/\bon\b/)
    }
    // Le toucher de l'onglet déjà actif ne change rien.
    await onglet(page, 'Accueil').click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
    await expect(dock(page).locator('a.tab[aria-current="page"]')).toHaveCount(1)
  })

  test('badge Commandes et point « Argent gelé » : ils disent ce que disent les données', async ({ page }) => {
    await ouvrir(page, '#commandes', FR)
    // Badge = nombre de commandes à préparer de la liste ; il suit un geste (« C’est prêt »).
    const aPreparer = async () => Number((await page.locator('#app main').innerText()).match(/(\d+) à préparer/)?.[1] ?? NaN)
    await expect.poll(aPreparer).toBeGreaterThan(0)
    const n = await aPreparer()
    expect(n).toBeGreaterThan(0)
    await expect(onglet(page, 'Commandes').locator('.bdg')).toHaveText(String(n))
    await ouvrir(page, '#accueil', FR)
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=/)
    await onglet(page, 'Commandes').click()
    await expect(page).toHaveURL(/\/commandes$/)
    await expect.poll(aPreparer).toBe(n - 1)
    if (n - 1 > 0) await expect(onglet(page, 'Commandes').locator('.bdg')).toHaveText(String(n - 1))
    else await expect(onglet(page, 'Commandes').locator('.bdg')).toHaveCount(0)
    // Point rouge de l'onglet Argent : présent si et seulement si une somme est gelée (ligne « Gelé » de Mon argent).
    await onglet(page, 'Argent').click()
    const gele = page.locator('[data-ligne="gele"] .rv')
    await expect(gele).toHaveText(MONTANT)
    const somme = Number((await gele.innerText()).replace(/\D/g, ''))
    await expect(onglet(page, 'Argent').locator('.dot')).toHaveCount(somme > 0 ? 1 : 0)
    if (somme > 0) await expect(onglet(page, 'Argent').locator('.dot')).toHaveAttribute('aria-label', 'Argent gelé')
  })

  test('bulle de verre : on la fait glisser d’un onglet à l’autre, la page de l’onglet lâché s’ouvre', async ({ page }) => {
    // Sous navigateur piloté avec animations permises, la glisse simulée par la souris n'est pas fidèle (élan de la
    // bulle libre) : vérifiée à la main dans un navigateur non piloté (glisser Accueil → Produits ouvre Produits).
    test.skip(!!process.env.PW_MOUVEMENTS, 'glisse simulée non fidèle avec animations ; contrôlée à la main')
    await ouvrir(page, '#accueil', FR)
    const glisser = async (de: string, vers: string) => {
      const a = await centre(onglet(page, de))
      const b = await centre(onglet(page, vers))
      await page.mouse.move(a.x, a.y)
      await page.mouse.down()
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + 2)
        await page.waitForTimeout(16)
        // Pendant la glisse, la bulle est saisie (barre « bouge », bulle dessinée). Avec les animations permises
        // (PW_MOUVEMENTS), la bulle libre suit son propre élan : seul le résultat (page de l'onglet lâché) est contrôlé.
        if (i === 5 && !process.env.PW_MOUVEMENTS) {
          await expect(dock(page)).toHaveClass(/\bbouge\b/)
          await expect(dock(page).locator('.dock-bulle')).toHaveCount(1)
        }
      }
      await page.mouse.up()
    }
    await glisser('Accueil', 'Produits')
    await expect(page).toHaveURL(/\/vendeur\/produits$/)
    await expect(onglet(page, 'Produits')).toHaveAttribute('aria-current', 'page')
    await expect(dock(page).locator('.dock-bulle')).toHaveCount(0)
    await glisser('Produits', 'Commandes')
    await expect(page).toHaveURL(/\/vendeur\/commandes$/)
    await expect(onglet(page, 'Commandes')).toHaveAttribute('aria-current', 'page')
    // Le lâcher n'est pas un toucher : l'onglet de départ ne s'ouvre pas après coup.
    await page.waitForTimeout(150)
    await expect(page).toHaveURL(/\/vendeur\/commandes$/)
  })

  test('retour mémorisé : la flèche ramène à la page précédente de la visite, puis à celle d’avant', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.getByRole('link', { name: 'Menu', exact: true }).click()
    await expect(page).toHaveURL(/\/menu$/)
    await page.locator('main a.li', { hasText: 'Horaires et fermetures' }).click()
    await expect(page).toHaveURL(/\/horaires$/)
    await page.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(/\/menu$/)
    await page.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
    // Ouverte directement (aucune page avant dans la visite) : le parent logique.
    await ouvrir(page, '#horaires', FR)
    const parent = await page.getByRole('link', { name: 'Revenir' }).getAttribute('href')
    await page.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(new RegExp(parent!.replace(/[?]/g, '\\?') + '$'))
    expect(routeOuverte(page)).not.toBe('horaires')
  })

  test('Menu : ouvert par l’icône de l’en-tête ; chaque entrée mène à une page qui existe', async ({ page }) => {
    test.setTimeout(120_000) // une vingtaine de pages ouvertes l'une après l'autre
    await ouvrir(page, '#accueil', FR)
    await page.locator('header.hd').getByRole('link', { name: 'Menu', exact: true }).click()
    await expect(page).toHaveURL(/\/vendeur\/menu$/)
    await expect(page.locator('#app main a.li', { hasText: 'Emplacement' })).toBeVisible()
    const liens = await page.locator('#app main a.li').evaluateAll((l) => l.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))
    expect(liens.length).toBeGreaterThan(15)
    expect(new Set(liens).size).toBe(liens.length) // aucun doublon
    for (const h of liens) {
      const route = h.replace(/^\/vendeur\/?/, '').split('?')[0] || 'accueil'
      expect([...OUVERTES, ...AJOUTEES], `${h} : route ouverte`).toContain(route)
      if (route === 'connexion') continue // « Se déconnecter » : essayé avec le menu du profil
      await page.goto(h)
      await expect(page.locator('#app')).toBeVisible()
      await expect(page.locator('#app'), h).not.toContainText(/Ce lien ne mène à aucune page|Écran retiré|Quelque chose s’est mal passé/)
      expect(routeOuverte(page), h).toBe(route)
    }
    // Un vrai toucher : l'entrée « Mes produits » ouvre la liste.
    await page.goto('menu')
    await page.locator('main a.li', { hasText: 'Mes produits' }).click()
    await expect(page).toHaveURL(/\/produits$/)
  })

  test('Menu : langue, taille du texte et thème appliqués aussitôt, gardés après rechargement', async ({ page }) => {
    await ouvrir(page, '#menu', FR)
    const html = page.locator('html')
    const bloc = page.locator('[data-preferences-menu]')
    await expect(html).toHaveAttribute('data-theme', 'light')
    await expect(html).toHaveAttribute('data-text', 'normale')
    await bloc.getByRole('radio', { name: 'Grande', exact: true }).click()
    await expect(html).toHaveAttribute('data-text', 'grande')
    await expect(bloc.getByRole('radio', { name: 'Grande', exact: true })).toHaveAttribute('aria-checked', 'true')
    await bloc.getByRole('radio', { name: 'Sombre' }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await bloc.getByRole('radio', { name: 'English' }).click()
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(bloc).toContainText('Text size')
    await expect(onglet(page, 'Orders')).toBeVisible()
    await page.reload()
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(html).toHaveAttribute('data-text', 'grande')
    await expect(bloc.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    await expect(bloc.getByRole('radio', { name: 'Large', exact: true })).toHaveAttribute('aria-checked', 'true')
    // Retour au réglage de départ, gardé aussi.
    await bloc.getByRole('radio', { name: 'Français' }).click()
    await bloc.getByRole('radio', { name: 'Normale' }).click()
    await bloc.getByRole('radio', { name: 'Clair' }).click()
    await page.reload()
    await expect(html).toHaveAttribute('lang', 'fr')
    await expect(html).toHaveAttribute('data-text', 'normale')
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('menu du profil : l’avatar l’ouvre (?pop=profil), ses entrées mènent à des pages, le voile et Échap le ferment', async ({ page }) => {
    await ouvrir(page, '#commandes', FR)
    const pm = page.locator('.pm')
    await expect(pm).toHaveCount(0)
    await page.locator('header.hd .avatar').click()
    await expect(page).toHaveURL(/\/commandes\?pop=profil$/)
    await expect(pm).toBeVisible()
    await expect(pm.locator('.ph')).toContainText('Tonton PG')
    await expect(pm.locator('.ph')).toContainText('propriétaire')
    await expect(pm.locator('a.r')).toHaveText([/Mon profil/, /Rechercher partout/, /Ma boutique/, /Mon argent/, /Messagerie/, /Notifications/, /Paramètres/, /Sécurité et appareils/, /Aide/, /Se déconnecter/])
    for (const h of await pm.locator('a.r').evaluateAll((l) => l.map((a) => a.getAttribute('href')!)))
      expect([...OUVERTES, ...AJOUTEES]).toContain(h.replace(/^\/vendeur\/?/, '').split('?')[0] || 'accueil')
    // Le voile le ferme sans changer de page.
    await page.locator('.pm-veil').click({ position: { x: 20, y: 700 } })
    await expect(pm).toHaveCount(0)
    await expect(page).toHaveURL(/\/commandes$/)
    // Échap aussi.
    await page.locator('header.hd .avatar').click()
    await expect(pm).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pm).toHaveCount(0)
    await expect(page).toHaveURL(/\/commandes$/)
    // Une entrée mène à sa page, menu refermé.
    await page.locator('header.hd .avatar').click()
    await pm.locator('a.r', { hasText: 'Paramètres' }).click()
    await expect(page).toHaveURL(/\/parametres$/)
    await expect(pm).toHaveCount(0)
  })

  test('menu du profil : « Se déconnecter » ferme la session, la connexion s’ouvre', async ({ page }) => {
    await ouvrir(page, '#accueil?pop=profil', FR)
    await page.locator('.pm a.r', { hasText: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/connexion$/)
    await page.goto('commandes')
    await expect(page).toHaveURL(/\/connexion\?next=/)
  })

  test('thème : la lune de l’en-tête passe en sombre, le soleil revient au clair ; le choix est gardé', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Thème sombre' }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Thème clair' })).toBeVisible()
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    // Le choix vaut partout : une autre page, un autre en-tête.
    await onglet(page, 'Produits').click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Thème clair' }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('langue : FR / EN de l’en-tête traduit les textes, change html[lang] et reste après rechargement', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    const html = page.locator('html')
    const bouton = page.locator('header.hd button.lang')
    await expect(bouton).toHaveText('FR')
    await expect(html).toHaveAttribute('lang', 'fr')
    await bouton.click()
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(bouton).toHaveText('EN')
    await expect(dock(page).locator('a.tab')).toHaveText([/Home/, /Orders/, /Products/, /Money/])
    await expect(page.locator('header.hd .hd-label')).toContainText('Seller space')
    await expect(page.locator('#app main')).not.toContainText('À préparer')
    await page.reload()
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(onglet(page, 'Orders')).toBeVisible()
    await bouton.click()
    await expect(html).toHaveAttribute('lang', 'fr')
    await expect(onglet(page, 'Commandes')).toBeVisible()
    await page.reload()
    await expect(html).toHaveAttribute('lang', 'fr')
  })

  test('accès Préparation de bout en bout : le rôle suit la navigation, aucun montant, rien à acheter', async ({ page }) => {
    test.setTimeout(120_000) // une quinzaine de pages parcourues
    await ouvrir(page, '#accueil?role=prep', FR)
    const pastilles = page.locator('header.hd .hd-pills')
    const corps = page.locator('body')
    const verifier = async (route: string) => {
      await expect(page).toHaveURL(/[?&]role=prep\b/)
      expect(routeOuverte(page)).toBe(route)
      await expect(page.locator('#app main')).toBeVisible()
      await expect(page.locator('#app'), route).not.toContainText(/Ce lien ne mène à aucune page|Quelque chose s’est mal passé/)
      await expect(corps, `${route} : aucun montant`).not.toContainText(MONTANT)
      await expect(dock(page).locator('.dot')).toHaveCount(0) // pas de point « Argent gelé »
    }
    await expect(pastilles).toContainText('accès Préparation')
    await expect(pastilles).not.toContainText(/\b(Bronze|Argent|Or|Platine)\b|découverte|Free/)
    await verifier('accueil')
    // Barre du bas : Commandes, une commande (lien de la liste), Produits ; pas d'onglet Argent (masqué sans le droit),
    // et l'adresse tapée est refusée proprement.
    await expect(onglet(page, 'Argent')).toHaveCount(0)
    await onglet(page, 'Commandes').click()
    await verifier('commandes')
    await expect(pastilles).toContainText('accès Préparation')
    await page.locator('main a[href*="commande?ref="]').first().click()
    await verifier('commande')
    await onglet(page, 'Produits').click()
    await verifier('produits')
    await page.goto('argent?role=prep')
    await verifier('argent')
    await expect(page.locator('#app main')).toContainText('Réservé au propriétaire')
    // Le Menu : ni argent ni achat (Mon argent, Nouvelle offre, Plans & tarifs, Se faire voir, Mon équipe).
    await page.locator('header.hd').getByRole('link', { name: 'Menu', exact: true }).click()
    await verifier('menu')
    const menu = page.locator('#app main')
    for (const absent of ['Mon argent', 'Versements', 'Documents', 'Nouvelle offre', 'Plans & tarifs', 'Se faire voir', 'Mon équipe'])
      await expect(menu.locator('a.li', { hasText: absent })).toHaveCount(0)
    // Une page ouverte depuis le Menu garde le rôle.
    await menu.locator('a.li', { hasText: 'Trust Score et palier' }).click()
    await verifier('palier')
    // Menu du profil : le membre, pas l'argent.
    await page.goto('./?role=prep&pop=profil')
    await expect(page.locator('.pm .ph')).toContainText('Accès Préparation')
    await expect(page.locator('.pm a.r', { hasText: 'Mon argent' })).toHaveCount(0)
    await expect(page.locator('.pm')).not.toContainText(MONTANT)
    // Rien à acheter : plans, visibilité, services et chiffres sont réservés au propriétaire (adresse tapée).
    for (const route of ['plans_liste', 'plans', 'visibilite', 'services', 'chiffres', 'gains', 'versements', 'documents']) {
      await page.goto(`${route}?role=prep`)
      await verifier(route)
      await expect(page.locator('#app main'), route).toContainText('Réservé au propriétaire')
      await expect(page.locator('#app main').getByRole('button', { name: /Acheter|Payer|Choisir|Essayer|Passer à|Activer|Souscrire|Commander/ }), route).toHaveCount(0)
    }
  })
})
