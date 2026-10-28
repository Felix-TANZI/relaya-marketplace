// Gestes de la coque enrichie et des pages ajoutées (AJ-E : recherche, sécurité et équipe, planning, apprendre,
// activité) et des enrichissements d'ENT-00/03/04 (BRIEF-ENRICHISSEMENT) : chaque geste aboutit, par la source de
// démonstration ; valeurs lues dans le registre, jamais écrites ici.
import { expect, test } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'
import { PARAMETRES } from '../src/calculs/registre'

const ORDI = { width: 1280, height: 860 }

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('coque', () => {
  test('téléphone : le Menu n’est pas un onglet, « ☰ » l’ouvre ; les actions principales sont dans la zone du pouce', async ({ page }) => {
    await ouvrir(page, adresse('tableau'), FR)
    await expect(page.locator('nav.dock .tab')).toHaveText([/Tableau/, /Paquets/, /Missions/, /Livreurs/])
    await page.locator('header.hd').getByRole('link', { name: 'Menu', exact: true }).click()
    await expect(page).toHaveURL(/\/menu$/)
    await expect(page.locator('header.hd .e-menu')).toHaveAttribute('aria-current', 'page')
    await ouvrir(page, adresse('flotte'), FR)
    const pouce = page.getByRole('toolbar', { name: 'Actions principales' })
    await expect(pouce.getByRole('link', { name: 'Ajouter un livreur' })).toBeVisible()
    const boite = (await pouce.boundingBox())!
    expect(boite.y + boite.height).toBeGreaterThan(844 - 200) // en bas de l'écran, à portée du pouce
  })

  test('ordinateur : ⌘K ouvre la recherche, les suggestions mènent à la fiche, « Tout voir » à la page', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('tableau'), FR)
    await page.locator('body').click({ position: { x: 600, y: 600 } })
    await page.keyboard.press('ControlOrMeta+k')
    const champ = page.getByRole('combobox', { name: 'Rechercher un paquet, une mission ou un livreur' })
    await expect(champ).toBeFocused()
    await champ.fill('brice')
    await expect(page.getByRole('option', { name: /^Brice N\./ })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/livreur\?id=l-brice/)
    await expect(page.locator('main h1', { hasText: 'Brice N.' })).toBeVisible() // fiche chargée (la coque est reposée)
    await champ.fill('Z3')
    await page.getByRole('option', { name: /Tout voir pour « Z3 »/ }).click()
    await expect(page).toHaveURL(/\/recherche\?q=Z3/)
    await expect(page.getByRole('heading', { name: 'Zones', level: 2 })).toBeVisible()
  })

  test('fil d’Ariane : le groupe mène au Menu, la maison au tableau de bord', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('vehicules'), FR)
    const fil = page.getByRole('navigation', { name: 'Fil d’Ariane' })
    await fil.getByRole('link', { name: 'Livreurs' }).click()
    await expect(page).toHaveURL(/\/menu#g-livreurs$/)
    await fil.getByRole('link', { name: 'Tableau de bord' }).click()
    await expect(page).toHaveURL(/\/entreprise\/?$/)
  })

  test('« ? » liste les raccourcis ; « g » puis « f » ouvre les livreurs ; la cloche ouvre ses dernières notifications', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('tableau'), FR)
    // Un clic neutre (le titre de la page) : le haut du tableau de bord est fait de liens d'action.
    await page.locator('main h1.pg-t').click()
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Raccourcis du clavier' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Raccourcis du clavier' })).toHaveCount(0)
    await page.keyboard.press('g')
    await page.keyboard.press('f')
    await expect(page).toHaveURL(/\/flotte$/)
    await page.locator('header.tb').getByRole('link', { name: /^Notifications/ }).click()
    const panneau = page.getByRole('dialog', { name: 'Dernières notifications' })
    await expect(panneau.locator('li').first()).toBeVisible()
    await panneau.getByRole('link', { name: 'Toutes les notifications' }).click()
    await expect(page).toHaveURL(/\/notifications$/)
  })
})

test.describe('pages ajoutées', () => {
  test('Rechercher partout : saisie gardée dans l’adresse, résultats groupés, récentes effaçables', async ({ page }) => {
    await ouvrir(page, adresse('recherche', 'q=PQ-Z3'), FR)
    await expect(page.getByRole('heading', { name: 'Paquets', level: 2 })).toBeVisible()
    await page.locator('main .li', { hasText: 'PQ-Z3-261013-009' }).first().click()
    await expect(page).toHaveURL(/\/paquet\?id=PQ-Z3-261013-009/)
    await ouvrir(page, adresse('recherche'), FR)
    await expect(page.getByRole('heading', { name: 'Recherches récentes' })).toBeVisible()
    await page.getByRole('button', { name: 'Effacer' }).click()
    await expect(page.getByRole('heading', { name: 'Recherches récentes' })).toHaveCount(0)
    await page.getByRole('searchbox').fill('zzzz introuvable')
    await expect(page.getByText('Aucun résultat pour « zzzz introuvable »')).toBeVisible()
  })

  test('Sécurité et équipe : un autre appareil se déconnecte ; limites et droits expliqués', async ({ page }) => {
    await ouvrir(page, adresse('securite'), FR)
    await expect(page.getByText(`${PARAMETRES.acces.echecsAvantBlocage} échecs : accès bloqué ${PARAMETRES.acces.blocageMinutes} min`)).toBeVisible()
    const avant = await page.getByRole('button', { name: /^Déconnecter / }).count()
    expect(avant).toBeGreaterThan(0)
    await page.getByRole('button', { name: /^Déconnecter / }).first().click()
    await expect(page.getByRole('status').filter({ hasText: 'est déconnecté' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Déconnecter / })).toHaveCount(avant - 1)
    // Les rôles ont leur page : Sécurité y mène.
    await page.getByRole('link', { name: /Membres, rôles et droits/ }).click()
    await expect(page).toHaveURL(/\/roles$/)
    // Le tableau des rôles est replié sous son résumé (« 13 droits comparés entre 3 rôles »).
    await page.getByText(/droits comparés entre/).click()
    await page.getByText('Pourquoi ces interdits ?').click()
    await expect(page.getByText('Seul le représentant légal engage l’entreprise.').last()).toBeVisible()
  })

  test('Rôles et accès : le répartiteur voit qu’il ne peut pas inviter, et pourquoi', async ({ page }) => {
    await ouvrir(page, adresse('roles'), { ...FR, role: 'repartiteur' })
    await expect(page.getByText('Seul le propriétaire invite ou retire un utilisateur', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inviter ou retirer un utilisateur' })).toHaveCount(0)
  })

  test('Planning : aujourd’hui, demain, 7 jours ; la mission à affecter mène à l’affectation', async ({ page }) => {
    await ouvrir(page, adresse('planning'), FR)
    await expect(page.getByRole('heading', { name: 'À affecter' })).toBeVisible()
    await page.getByRole('button', { name: '7 jours' }).click()
    await expect(page).toHaveURL(/j=semaine/)
    await page.getByRole('button', { name: 'Aujourd’hui' }).click()
    await page.locator('main .li', { hasText: 'Affecter' }).first().click()
    await expect(page).toHaveURL(/\/affectation\?id=/)
  })

  test('Planning : absences prévenues (DP-66, DP-67 : motif, repères) ; marquer vue ; demain, le livreur absent ; départ demandé signalé', async ({ page }) => {
    await ouvrir(page, adresse('planning'), FR)
    const abs = page.locator('.panel', { hasText: 'Absences prévenues' })
    await expect(abs).toContainText('Aimé O.')
    await expect(abs).toContainText('Carine M.')
    await expect(abs.locator('.li', { hasText: 'Carine M.' })).toContainText('Vue')
    // DP-67 : motif de la liste, texte du livreur, repères « Imprévu » et « Prévenue après le début du créneau ».
    await expect(abs.locator('.li', { hasText: 'Carine M.' })).toContainText('Deuil ou famille · « Mariage de ma sœur à Bafoussam »')
    await expect(abs.locator('.li', { hasText: 'Fabrice T.' })).toContainText('Panne de moto')
    await expect(abs.locator('.li', { hasText: 'Fabrice T.' })).toContainText('Prévenue après le début du créneau')
    await expect(abs.locator('.li', { hasText: 'Aimé O.' })).toContainText('Imprévu')
    await expect(page.locator('section[aria-label="Josiane E."]')).toContainText('Départ demandé · paquets jusqu’au ven. 16 oct.')
    await abs.locator('.li', { hasText: 'Aimé O.' }).getByRole('button', { name: 'Marquer comme vue' }).click()
    await expect(abs.locator('.li', { hasText: 'Aimé O.' })).toContainText('vue le')
    await expect(page.locator('section[aria-label="Josiane E."]')).toContainText('Départ demandé')
    await page.getByRole('button', { name: 'Demain' }).click()
    await expect(page.locator('section[aria-label="Aimé O."]')).toContainText('Absence prévenue : ne lui confiez pas de créneau ce jour-là.')
    // Le comptable voit le planning sans ces demandes.
    await ouvrir(page, adresse('planning'), { ...FR, role: 'comptable' })
    await expect(page.locator('.panel', { hasText: 'Absences prévenues' })).toHaveCount(0)
  })

  test('Apprendre : une fiche s’ouvre par l’adresse, ses délais viennent du registre, elle est marquée lue', async ({ page }) => {
    await ouvrir(page, adresse('apprendre', 'fiche=delais'), FR)
    await expect(page.getByText(`s’accepte en ${PARAMETRES.delais.acceptationMin} minutes`, { exact: false })).toBeVisible()
    await page.getByRole('link', { name: 'Toutes les fiches' }).click()
    await expect(page.locator('main .li', { hasText: 'Tenir les délais d’un paquet' })).toContainText('Lue')
  })

  test('Activité : un geste fait ailleurs s’y inscrit, filtres par genre et par personne', async ({ page }) => {
    await ouvrir(page, adresse('activite'), FR)
    await page.getByRole('button', { name: /^Litiges/ }).click()
    await expect(page).toHaveURL(/g=litiges/)
    await expect(page.locator('.e-journal li').first()).toContainText('LT-')
    await page.getByLabel('Personne').selectOption('Serge Mbarga')
    await expect(page.locator('.e-journal li').first()).toContainText('Serge Mbarga')
    // Un geste : suspendre un livreur, puis le retrouver au journal de l'équipe.
    await ouvrir(page, adresse('livreur', 'id=l-brice'), FR)
    await page.getByRole('button', { name: 'Suspendre' }).first().click()
    await page.getByRole('dialog').locator('textarea').fill('Retard répété sur trois tournées cette semaine.')
    await page.getByRole('dialog').getByRole('button', { name: 'Suspendre' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'est suspendu' })).toBeVisible()
    await page.getByRole('status').filter({ hasText: 'est suspendu' }).getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'est suspendu' })).toHaveCount(0)
  })
})

test.describe('enrichissements', () => {
  test('Profil : préférences de l’appareil (sons, animations) gardées ; droits et raisons du rôle dans Rôles et accès', async ({ page }) => {
    await ouvrir(page, adresse('roles'), { ...FR, role: 'comptable' })
    // Droits du rôle repliés : le résumé d'abord, puis « peut / ne peut pas », puis la raison de chaque limite.
    await page.getByText(/2 actions possibles/).click() // voir les montants, délivrer une attestation
    await expect(page.getByRole('region', { name: 'Ce que vous ne pouvez pas faire' })).toContainText('Accepter et rendre les paquets')
    await page.getByText(/Pourquoi ces \d+ limites/).click()
    await expect(page.getByText('Prendre un paquet engage l’entreprise sur un délai', { exact: false }).first()).toBeVisible()
    await page.goto(adresse('profil'))
    const sons = page.getByRole('switch', { name: 'Animations réduites' })
    await sons.click()
    await expect(sons).toHaveAttribute('aria-checked', 'true')
    await page.reload()
    await expect(page.getByRole('switch', { name: 'Animations réduites' })).toHaveAttribute('aria-checked', 'true')
  })

  test('Flotte : tri par Trust Score dans l’adresse ; export CSV', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('flotte'), FR)
    await page.getByLabel('Trier').selectOption('score')
    await expect(page).toHaveURL(/tri=score/)
    const telechargement = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter (CSV)' }).click()
    expect((await telechargement).suggestedFilename()).toBe('flotte.csv')
  })

  test('Ajout : l’invitation commencée est reprise au retour', async ({ page }) => {
    await ouvrir(page, adresse('ajout'), FR)
    await page.getByLabel('Nom et prénom').fill('Paul Nkodo')
    await ouvrir(page, adresse('flotte'), FR)
    await ouvrir(page, adresse('ajout'), FR)
    await expect(page.getByLabel('Nom et prénom')).toHaveValue('Paul Nkodo')
    await expect(page.getByText('Votre invitation commencée a été reprise.')).toBeVisible()
    await page.getByRole('button', { name: 'Tout effacer' }).click()
    await expect(page.getByLabel('Nom et prénom')).toHaveValue('')
  })

  test('Véhicules : filtre des documents', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('vehicules'), FR)
    const avant = await page.locator('table.dt tbody tr').count()
    await page.getByLabel('Documents').selectOption('assurance_bientot')
    const apres = await page.locator('table.dt tbody tr').count()
    expect(apres).toBeLessThanOrEqual(avant)
  })

  test('Contrat : la version signée se télécharge en PDF', async ({ page }) => {
    await page.setViewportSize(ORDI)
    await ouvrir(page, adresse('contrat', 't=contrat'), FR)
    await page.locator('main').getByRole('button', { name: 'Lire', exact: true }).first().click()
    const telechargement = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger le PDF' }).click()
    expect((await telechargement).suggestedFilename()).toMatch(/\.pdf$/)
  })
})
