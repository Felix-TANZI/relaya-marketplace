// Gestes des pages ajoutées AJ-A (DP-58) : stock et inventaire, promotions, questions des clients, livraison et colis.
// Chaque geste écrit dans la source de démonstration et la page suit ; les montants sont calculés (src/calculs).
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = (page: Page) => page.locator('main')
const carte = (page: Page, offre: string) => page.locator(`.card[data-offre="${offre}"]`)

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('AJ-A · Stock et inventaire', () => {
  test('compteurs et alerte de seuil viennent des données ; + / saisie enregistrent, signés dans l’historique', async ({ page }) => {
    await ouvrir(page, '#stock', FR)
    // Jeu d'essai (OFFRES, hors brouillon) : 9 produits, 6 en vente ; écouteurs à 0 (rupture) ; ITEL noir 3 ≤ 5 et
    // pagne bleu 2 ≤ 3 (sous le seuil) ; iPhone 2 > 1 (au-dessus).
    await expect(page.locator('.aja-tuile .tv')).toHaveText(['9', '6', '1', '2'])
    await expect(page.locator('.aja-alerte')).toContainText('1 en rupture, 2 sous le seuil d’alerte')
    await expect(page.locator('.aja-alerte')).toContainText('ITEL AC52')
    const itel = carte(page, 'itel-noir')
    await itel.getByRole('button', { name: /Un de plus/ }).click()
    await expect(itel.locator('input')).toHaveValue('4')
    await itel.locator('input').fill('7')
    await itel.locator('input').press('Enter')
    await expect(page.locator('.aja-tuile .tv').nth(3)).toHaveText('1') // 7 > 5 : l'ITEL sort de l'alerte, le pagne y reste
    await expect(page.locator('.aja-alerte')).toContainText('1 en rupture, 1 sous le seuil d’alerte')
    await expect(page.locator('.aja-alerte')).not.toContainText('ITEL AC52')
    await itel.getByRole('button', { name: 'Historique' }).click()
    await expect(page.locator('.sheet .aja-mv').first()).toContainText('par Franck P.')
    await expect(page.locator('.sheet .aja-mv').first()).toContainText('4 → 7')
    await page.reload()
    await expect(carte(page, 'itel-noir').locator('input')).toHaveValue('7')
  })

  test('réapprovisionner : conseil proposé, réception enregistrée ; mouvements filtrés par type', async ({ page }) => {
    await ouvrir(page, '#stock', FR)
    await carte(page, 'itel-noir').getByRole('button', { name: 'Réapprovisionner' }).click()
    await expect(page.locator('#aja-recu')).toHaveValue('3')
    await page.locator('#aja-recu').fill('10')
    await page.getByRole('button', { name: 'Enregistrer la réception' }).click()
    await expect(carte(page, 'itel-noir').locator('input')).toHaveValue('13')
    await page.locator('.seg a', { hasText: 'Mouvements' }).click()
    await page.locator('.chip', { hasText: 'Réception' }).click()
    await expect(page.locator('.aja-mv').first()).toContainText('+10')
    await expect(page.locator('.aja-mv').first()).toContainText('par Franck P.')
  })

  test('accès Préparation : le stock se change, aucun prix ni seuil', async ({ page }) => {
    await ouvrir(page, '#stock?role=prep', FR)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(carte(page, 'itel-noir').getByRole('button', { name: 'Seuil' })).toHaveCount(0)
    await carte(page, 'iphone').getByRole('button', { name: /Un de moins/ }).click()
    await expect(carte(page, 'iphone').locator('input')).toHaveValue('1')
    await page.locator('.seg a', { hasText: 'Mouvements' }).click()
    await expect(page.locator('.aja-mv').first()).toContainText('par Aïcha N.')
  })

  test('accueil : « Stock bas » ouvre le stock sur le produit', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    // Trois produits au seuil ou dessous (ITEL noir, pagne bleu, écouteurs) : chacun ouvre le stock sur lui.
    await expect(page.locator('[data-carte=stock-bas] a.li')).toHaveCount(3)
    await page.locator('[data-carte=stock-bas] a.li').filter({ hasText: 'ITEL AC52' }).click()
    await expect(page).toHaveURL(/\/stock\?p=itel-noir$/)
  })
})

test.describe('AJ-A · Promotions', () => {
  test('aperçu calculé sur le prix remisé, remise trop faible refusée, promotion programmée puis arrêtée', async ({ page }) => {
    await ouvrir(page, '#offre_detail?p=itel-noir', FR)
    await page.getByText('Faire une promotion').click()
    await expect(page).toHaveURL(/\/promotions\?p=itel-noir$/)
    // ITEL 20 000 F, −10 % : 18 000 F ; Bronze, découverte : commission 1 944 F, gardé 16 056 F (au lieu de 17 840 F).
    await expect(page.locator('#aja-nouvelle .aja-client')).toContainText('18 000 F')
    await expect(page.locator('.keep')).toContainText('16 056 F')
    await expect(page.locator('.keep')).toContainText('17 840 F')
    await page.locator('#aja-valeur').fill('5')
    await expect(main(page)).toContainText('Remise trop faible : 10 % au moins')
    await expect(page.getByRole('button', { name: 'Programmer la promotion' })).toBeDisabled()
    await page.locator('.chip', { hasText: '20 %' }).click()
    await page.getByRole('button', { name: 'Programmer la promotion' }).click()
    await expect(page.locator('.blv-succes')).toContainText('Promotion programmée')
    await expect(page.locator('.seg a.on')).toContainText('Programmées')
    // La programmée du jeu d'essai (coque) reste à côté : on suit la nouvelle, celle de l'ITEL noir.
    const nouvelle = page.locator('.card[data-promo]', { hasText: 'ITEL AC52 · noir' })
    await expect(nouvelle).toContainText('16 000 F')
    await nouvelle.getByRole('button', { name: 'Annuler la promotion' }).click()
    await page.locator('.sheet').getByRole('button', { name: 'Annuler la promotion' }).click()
    await expect(page.locator('.seg a.on')).toContainText('Terminées')
    await expect(page.locator('.card[data-promo]').first()).toContainText('Arrêtée')
    await expect(page.locator('.card[data-promo]').first()).toContainText('ITEL AC52 · noir')
  })

  test('accès Préparation : réservé au propriétaire', async ({ page }) => {
    await ouvrir(page, '#promotions?role=prep', FR)
    await expect(main(page)).toContainText('Réservé au propriétaire')
    await expect(main(page)).not.toContainText(/\d F\b/)
  })
})

test.describe('AJ-A · Questions des clients', () => {
  test('coordonnées refusées, réponse publiée, compteur suivi ; signaler masque la question', async ({ page }) => {
    await ouvrir(page, '#questions', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('2 questions à répondre')
    const q = page.locator('.card[data-question="q-1"]')
    await q.getByRole('button', { name: 'Répondre' }).click()
    await q.locator('textarea').fill('Oui, appelez-moi au 6 77 12 42 17 pour les détails.')
    await expect(q.locator('.note.red')).toContainText('Coordonnées détectées')
    await expect(q.getByRole('button', { name: 'Publier la réponse' })).toBeDisabled()
    await q.locator('textarea').fill('')
    await q.locator('.chip', { hasText: 'Contenu de la boîte' }).click()
    await q.getByRole('button', { name: 'Publier la réponse' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('1 question à répondre')
    await page.locator('.card[data-question="q-2"]').getByRole('button', { name: 'Signaler' }).click()
    await page.locator('.sheet').getByRole('button', { name: 'Signaler' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Aucune question en attente')
    await page.locator('.seg a', { hasText: 'Répondues' }).click()
    await expect(page.locator('.card[data-question="q-1"]')).toContainText('Réponse du vendeur')
  })

  // VAGUE n° 12 : réponses rapides modifiables ; un modèle de BelivaY modifié devient celui du vendeur.
  test('modèles de réponse : modifier un modèle de BelivaY, le reprendre dans une réponse', async ({ page }) => {
    await ouvrir(page, '#questions', FR)
    await page.getByRole('button', { name: /Mes modèles de réponse/ }).click()
    const f = page.locator('.sheet')
    await f.getByRole('button', { name: 'Modifier le modèle · Disponibilité' }).click()
    await expect(f.getByLabel('Titre du modèle')).toHaveValue('Disponibilité')
    await f.getByLabel('Texte').fill('Bonjour, il est en stock : je le prépare le jour même.')
    await f.getByRole('button', { name: 'Enregistrer le modèle' }).click()
    await expect(f).toContainText('Votre version d’un modèle de BelivaY')
    await expect(f.locator('.li', { hasText: 'Disponibilité' })).toHaveCount(1)
    await page.keyboard.press('Escape')
    const q = page.locator('.card[data-question="q-1"]')
    await q.getByRole('button', { name: 'Répondre' }).click()
    await q.locator('.chip', { hasText: 'Disponibilité' }).click()
    await expect(q.locator('textarea')).toHaveValue('Bonjour, il est en stock : je le prépare le jour même.')
  })

  test('notifications et menu mènent aux questions', async ({ page }) => {
    await ouvrir(page, '#notifications', FR)
    await page.locator('a.li', { hasText: 'Question d’un client sur ITEL AC52' }).first().click()
    await expect(page).toHaveURL(/\/questions\?q=q-\d$/)
    await expect(page.locator('.card[data-question] textarea')).toBeVisible()
    await page.goto('menu')
    await expect(page.locator('a.li', { hasText: 'Questions des clients' }).locator('.badge-num')).toHaveText('2')
    for (const x of ['Stock et inventaire', 'Promotions', 'Livraison et colis']) await expect(page.locator('a.li', { hasText: x })).toHaveCount(1)
  })
})

test.describe('AJ-A · Livraison et colis', () => {
  test('défaut et produit : paiement au retrait, colis calculé par les mesures, relais préféré', async ({ page }) => {
    await ouvrir(page, '#livraison', FR)
    await page.getByRole('switch', { name: 'Accepter le paiement au retrait par défaut' }).click()
    await expect(page.getByRole('switch', { name: 'Accepter le paiement au retrait par défaut' })).toHaveAttribute('aria-checked', 'false')
    const iphone = page.getByRole('button', { name: 'Régler le colis de iPhone 15 Pro Max 256 Go' })
    await iphone.click()
    await page.locator('.sheet .seg a', { hasText: 'Plus grand' }).click()
    await page.locator('#aja-poids').fill('6')
    for (const [i, v] of ['30', '20', '15'].entries()) await page.locator('#aja-dim-' + i).fill(v)
    await expect(page.locator('.sheet .note')).toContainText('Classe du colis : L')
    await page.locator('.sheet').getByRole('button', { name: 'Enregistrer' }).click()
    await expect(iphone).toContainText('Colis L')
    await page.getByRole('switch', { name: /Relais préféré · Relais Essos/ }).click()
    await expect(page.getByRole('switch', { name: /Relais préféré · Relais Essos/ })).toHaveAttribute('aria-checked', 'true')
  })

  test('accès Préparation : lecture seule', async ({ page }) => {
    await ouvrir(page, '#livraison?role=prep', FR)
    await expect(main(page)).toContainText('Lecture seule')
    await expect(page.getByRole('switch', { name: 'Accepter le paiement au retrait par défaut' })).toBeDisabled()
  })
})
