// Gestes du groupe ENT-03 (connexion, tableau de bord, contrat et documents, état du compte) : chaque geste passe par
// la source de démonstration et l'écran suit ; valeurs lues dans le registre (PARAMETRES), jamais écrites ici.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'
import { PARAMETRES } from '../src/calculs/registre'

const A = PARAMETRES.acces
const ORDI = { width: 1280, height: 860 }

async function deconnecter(page: Page) {
  await ouvrir(page, adresse('profil'), FR)
  await page.locator('button', { hasText: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
}
async function saisirCode(page: Page) {
  const code = (await page.locator('.note', { hasText: 'Démonstration : le code reçu est' }).innerText()).replace(/\D/g, '')
  expect(code).toHaveLength(A.longueurCode)
  await page.locator('.otp input').first().fill(code[0])
  for (let i = 1; i < code.length; i++) await page.locator('.otp input').nth(i).fill(code[i])
  await page.getByRole('button', { name: 'Valider' }).click()
}
/** Image PNG lisible (assez grande) fabriquée dans la page. */
async function photo(page: Page, l = 900, h = 700) {
  const b64 = await page.evaluate(
    ([w, hh]) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = hh
      c.getContext('2d')!.fillRect(0, 0, 10, 10)
      return c.toDataURL('image/png').split(',')[1]
    },
    [l, h] as const,
  )
  return { name: 'piece.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

test.describe('ENT-03 · gestes', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('connexion : échec compté, code SMS pour la propriétaire, choix de l’espace, tableau de bord', async ({ page }) => {
    await deconnecter(page)
    await page.getByLabel('Numéro +237 ou e-mail').fill('+237 677 000 001')
    await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais1')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(`Encore ${A.echecsAvantBlocage - 1} essais`)
    // Compte d'essai de la propriétaire (mot de passe d'essai du jeu de démonstration).
    await page.getByLabel('Numéro +237 ou e-mail').fill('+237 677 000 001')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Code de vérification' })).toBeVisible()
    await saisirCode(page)
    // Deux espaces (entreprise et point relais de l'agence) : on choisit.
    await expect(page.getByRole('heading', { name: 'Choisissez un espace' })).toBeVisible()
    await expect(page.locator('a.radio')).toHaveAttribute('href', /^https:\/\//)
    await page.locator('button.radio').click()
    await expect(page).toHaveURL(/\/entreprise\/?$/)
    await expect(page.getByText('Bonjour Gaëlle')).toBeVisible()
  })

  test('connexion : blocage après les échecs du registre, accès retiré, mot de passe oublié', async ({ page }) => {
    await deconnecter(page)
    await page.getByLabel('Numéro +237 ou e-mail').fill('+237 677 000 004')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Accès retiré par votre entreprise')
    await page.getByLabel('Numéro +237 ou e-mail').fill('serge@yafeexpress.cm')
    for (let i = 0; i < A.echecsAvantBlocage; i++) {
      await page.getByLabel('Mot de passe', { exact: true }).fill('faux' + i + 'x')
      await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
      await page.waitForTimeout(80)
    }
    await expect(page.getByText(/Connexion bloquée jusqu’à/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click()
    await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()
  })

  test('invitation : bienvenue, mot de passe permis, code SMS, l’espace s’ouvre avec le rôle', async ({ page }) => {
    await deconnecter(page)
    await page.goto(adresse('connexion', 'invitation=bienvenue-serge'))
    await expect(page.getByRole('heading', { name: 'Bienvenue Serge' })).toBeVisible()
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('court')
    await page.getByLabel('Confirmer le mot de passe').fill('court')
    await expect(page.getByRole('button', { name: 'Créer mon accès' })).toBeDisabled()
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Livraison7')
    await page.getByLabel('Confirmer le mot de passe').fill('Livraison7')
    await page.getByRole('button', { name: 'Créer mon accès' }).click()
    await saisirCode(page)
    await expect(page.getByText('Bonjour Serge')).toBeVisible()
    await expect(page.locator('.hd-pills .pill', { hasText: 'Répartiteur' }).first()).toBeVisible()
    // L'invitation est à usage unique.
    await page.goto(adresse('connexion', 'invitation=bienvenue-serge'))
    await expect(page.getByText('Vous êtes connecté')).toBeVisible()
  })

  test('tableau : à faire trié par échéance, la plus urgente bordée ; montant réservé ; vue de la comptable', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('tableau'), FR)
    const taches = page.locator('.panel', { hasText: 'À faire maintenant' }).locator('.entA-row')
    await expect(taches.first()).toHaveClass(/hot/)
    expect(await taches.count()).toBeGreaterThan(3)
    await expect(page.locator('.kpi', { hasText: 'À verser vendredi' })).toHaveCount(1)
    await expect(page.locator('.kpi', { hasText: 'Délai tenu' })).toHaveCount(1)
    await ouvrir(page, adresse('tableau', 'role=repartiteur'), FR)
    await expect(page.locator('.kpi', { hasText: 'À verser vendredi' })).toHaveCount(0)
    await ouvrir(page, adresse('tableau', 'role=comptable'), FR)
    await expect(page.getByRole('link', { name: 'Voir les règlements' }).first()).toBeVisible()
    await expect(page.locator('.panel', { hasText: 'À faire maintenant' }).locator('.entA-row')).toHaveCount(0)
    await expect(page.locator('.kpi', { hasText: 'À verser vendredi' })).toHaveCount(1)
  })

  test('configuration : le guide remplace le tableau ; signer la lettre coche la conformité', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('tableau', 'etat=configuration'), FR)
    await expect(page.getByText('Guide de démarrage')).toBeVisible()
    await expect(page.locator('.panel', { hasText: 'À faire maintenant' })).toHaveCount(0)
    await expect(page.locator('.entA-step.bad')).toContainText('NIU')
    await page.goto(adresse('contrat', 't=contrat'))
    const lettre = page.locator('.panel', { hasText: 'Documents signés' }).locator('.entA-row', { hasText: 'Lettre d’engagement' })
    await lettre.getByRole('button', { name: 'Lire et signer' }).click()
    await page.getByRole('button', { name: 'J’ai lu et je signe' }).click()
    await expect(lettre.locator('.pill')).toHaveText('En vigueur')
    await expect(page.locator('.hero .hk')).toHaveText('Pièce rejetée')
  })

  test('contrat : pièce à renouveler envoyée avec un aperçu lisible ; identité réservée à la propriétaire', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('contrat'), FR)
    const mint = page.locator('.entA-row', { hasText: 'Autorisation de transport' })
    await expect(mint.locator('.pill')).toHaveText('À renouveler')
    await mint.getByRole('button', { name: 'Renvoyer' }).click()
    await expect(page.getByRole('button', { name: 'Envoyer la pièce' })).toBeDisabled()
    await page.getByLabel('Choisir le fichier').setInputFiles(await photo(page, 300, 200))
    await expect(page.getByText('Photo trop petite')).toBeVisible()
    await page.getByLabel('Choisir le fichier').setInputFiles(await photo(page))
    await page.getByRole('button', { name: 'Envoyer la pièce' }).click()
    await expect(page.getByRole('heading', { name: 'Pièce envoyée' })).toBeVisible()
    await page.getByRole('button', { name: 'Fermer' }).last().click()
    await expect(mint.locator('.pill')).toHaveText('En vérification')
    await expect(page.locator('.entA-row', { hasText: 'Pièce d’identité du gérant' })).toHaveCount(1)
    await ouvrir(page, adresse('contrat', 'role=comptable'), FR)
    await expect(page.locator('.entA-row', { hasText: 'Pièce d’identité du gérant' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Renvoyer' })).toHaveCount(0)
  })

  test('état du compte : suspendu, motif et recours une seule fois', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('etat', 'etat=suspendu'), FR)
    await expect(page.locator('.hero .hk')).toHaveText('Compte suspendu')
    await expect(page.locator('.hero')).toContainText('Autorisation de transport')
    await page.getByRole('button', { name: 'Faire un recours (une fois)' }).click()
    await page.getByLabel('Pourquoi la décision vous semble fausse').fill('La nouvelle autorisation a été déposée au ministère le 2 octobre.')
    await page.getByRole('button', { name: 'Envoyer le recours' }).click()
    await expect(page.getByRole('link', { name: /Recours envoyé/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Faire un recours (une fois)' })).toHaveCount(0)
    // Le tableau de bord n'offre plus de paquets à accepter.
    await page.goto(adresse('tableau'))
    await expect(page.getByText('Compte suspendu · aucun nouveau paquet')).toBeVisible()
    await expect(page.locator('.entA-row', { hasText: 'Paquet PQ-' })).toHaveCount(0)
  })
})
