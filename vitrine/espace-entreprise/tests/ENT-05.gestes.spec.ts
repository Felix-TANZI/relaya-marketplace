// Gestes et règles d'ENT-05 (prix et délais, paquets, détail et acceptation, affectation) sur la démonstration, à
// l'heure figée du jeu d'essai (mardi 13 octobre 2026, 14 h 05).
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.setViewportSize({ width: 1280, height: 900 })
})

test('paquets : visibles seulement s’ils sont permis (palier, déjà pris), sans nom de boutique avant l’acceptation', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), FR)
  const cartes = page.locator('article.entb-pq')
  await expect(cartes).toHaveCount(9) // trafic normal : les publiés du jeu d'essai et ceux du reste de la journée
  await expect(cartes.first()).toContainText('PQ-Z3-261013-028') // trié par échéance d'acceptation
  await expect(page.getByText('PQ-Z1-261013-005')).toHaveCount(0) // colis de 350 000 F > plafond Nouveau
  await expect(page.getByText('PQ-Z2-261013-010')).toHaveCount(0) // pris par une autre entreprise
  await expect(page.locator('main')).not.toContainText('Ets Ngono')
  await expect(page.getByText('9 paquets à accepter')).toBeVisible()
  await expect(page.locator('.entb-pq.hot')).toHaveCount(4)
})

test('accepter puis affecter son livreur (DP-63) : noms révélés, créneau annoncé, mission affectée', async ({ page }) => {
  await ouvrir(page, adresse('paquet', 'id=PQ-Z3-261013-009'), FR)
  await expect(page.getByText('Boutique à Mokolo', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(page.getByText(/Paquet accepté\s:\sla rémunération/)).toBeVisible()
  await expect(page.getByText('Ets Ngono').first()).toBeVisible()
  await page.getByRole('link', { name: 'Affecter un livreur' }).first().click()
  await expect(page).toHaveURL(/affectation\?id=PQ-Z3-261013-009/)
  await expect(page.getByText('Zone, charge et Trust Score')).toBeVisible()
  await expect(page.locator('.li.lv-non', { hasText: 'Hervé F.' })).toContainText('En activation')
  await page.getByRole('button', { name: 'Affecter Brice N.' }).first().click()
  await expect(page.getByText('Affectation de Brice N. à PQ-Z3-261013-009')).toBeVisible() // avis « Annuler » 5 s
  await expect(page.getByText(/Brice N\. est affecté/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Livreur affecté' })).toBeVisible()
  await page.goto(adresse('paquets'))
  await expect(page.locator('article.entb-pq')).toHaveCount(8)
})

test('affectation : alerte « non affecté », livreurs écartés et leurs raisons, kit manquant', async ({ page }) => {
  await ouvrir(page, adresse('affectation', 'id=PQ-Z3-261013-007'), FR)
  await expect(page.getByText(/Non affecté depuis l’acceptation à 13\sh\s47/)).toBeVisible()
  await expect(page.getByText(/Kit\s:\smanque 1 M/).first()).toBeVisible()
  await expect(page.locator('.li.lv-non', { hasText: 'Junior T.' })).toContainText('Déjà en mission')
  await expect(page.locator('.li.lv-non', { hasText: 'Inès K.' })).toContainText('Hors de ses zones')
})

test('rendre avant tout ramassage : le paquet retourne en publication', async ({ page }) => {
  await ouvrir(page, adresse('paquet', 'id=PQ-Z6-261013-008'), FR)
  await page.getByRole('button', { name: 'Rendre le paquet' }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Rendre le paquet' }).click()
  await expect(page).toHaveURL(/\/paquets$/)
  await page.goto(adresse('paquet', 'id=PQ-Z3-261013-001'))
  await expect(page.getByRole('button', { name: 'Rendre le paquet' })).toHaveCount(0) // déjà ramassé
})

test('rôles : le répartiteur ne voit aucun montant, le comptable n’ouvre pas les paquets', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), { ...FR, role: 'repartiteur' })
  await expect(page.getByText('Montant visible du propriétaire').first()).toBeVisible()
  await expect(page.locator('.entb-pq .entb-pay .v')).toHaveCount(0)
  await page.goto(adresse('sla'))
  await expect(page.getByText('Les montants de la grille sont réservés au propriétaire et au comptable.')).toBeVisible()
  await expect(page.getByText(/^Grille d’achat/)).toHaveCount(0)
  await page.goto(adresse('paquets', 'role=comptable'))
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
})

test('prix et délais : grille en lecture seule, écrêtage au plafond, grille annoncée, révision par message', async ({ page }) => {
  await ouvrir(page, adresse('sla'), FR)
  await expect(page.getByText('Fixé par BelivaY', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Écrêtée au plafond').first()).toBeVisible()
  await expect(page.getByText(/Nouvelle grille v2 annoncée/)).toBeVisible()
  await expect(page.getByText(/bloquée par la console jusqu’à décision écrite/).first()).toBeVisible()
  await expect(page.locator('.entb-t input, .entb-t select')).toHaveCount(0) // aucune saisie dans la grille (le simulateur et les alertes sont à part)
  await page.getByRole('button', { name: 'Demander une révision' }).click()
  await page.locator('.sheet textarea').fill('Trop court')
  await page.locator('.sheet textarea').fill('court')
  await page.getByRole('button', { name: 'Envoyer à BelivaY' }).click()
  await expect(page.getByText(/au moins 10 caractères/)).toBeVisible()
  await page.locator('.sheet textarea').fill('La course depuis Z1 ne couvre plus les heures de pointe.')
  await page.getByRole('button', { name: 'Envoyer à BelivaY' }).click()
  await expect(page.getByRole('link', { name: 'Voir le fil' })).toHaveAttribute('href', /messages\?fil=FI-GR-/)
})

test('anglais : paquets traduits', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), { ...FR, lang: 'en' })
  await expect(page.getByText('9 packages to accept')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept' }).first()).toBeVisible()
})

// ---------- Enrichissements (ENRICHISSEMENTS.md, P09 à P12) ----------

test('paquets : accepter avec « Annuler » pendant 5 s, puis envoyé', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), FR)
  const cartes = page.locator('article.entb-pq')
  await expect(cartes).toHaveCount(9)
  await cartes.first().getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(cartes).toHaveCount(8) // montré pris tout de suite
  await page.locator('.annuler').getByRole('button', { name: 'Annuler' }).click()
  await expect(cartes).toHaveCount(9)
  await expect(page.locator('.annuler')).toHaveCount(0)
  await page.locator('article.entb-pq', { hasText: 'PQ-Z3-261013-009' }).getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(page.getByText(/Paquet PQ-Z3-261013-009 accepté\s:\saffectez/)).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.locator('article.entb-pq')).toHaveCount(8)
})

test('paquets : hors connexion, l’acceptation est gardée puis envoyée au retour du réseau', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), FR)
  await page.context().setOffline(true)
  await page.locator('article.entb-pq', { hasText: 'PQ-Z3-261013-009' }).getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(page.getByText(/Hors connexion\s:\sl’acceptation de PQ-Z3-261013-009 est gardée/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('1 geste en attente d’envoi', { exact: true })).toBeVisible()
  await page.context().setOffline(false)
  await expect(page.getByText('1 geste en attente d’envoi', { exact: true })).toHaveCount(0, { timeout: 10_000 })
  await page.goto(adresse('paquet', 'id=PQ-Z3-261013-009'))
  await expect(page.getByRole('link', { name: 'Affecter un livreur' }).first()).toBeVisible()
})

test('paquets : recherche « / », puces, tri dans l’adresse, zéro résultat, compte à rebours qui décroît', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), FR)
  const rebours = page.locator('article.entb-pq').first().locator('.rebours b')
  const avant = await rebours.textContent()
  await page.clock.setFixedTime(new Date('2026-10-13T13:06:05.500Z'))
  await expect(rebours).not.toHaveText(avant!)
  await page.keyboard.press('/')
  await page.keyboard.type('zzz')
  await expect(page).toHaveURL(/q=zzz/)
  await expect(page.getByText('Aucun paquet pour ces filtres')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer les filtres' }).click()
  await expect(page.locator('article.entb-pq')).toHaveCount(9)
  await page.getByRole('button', { name: /^Premier rang/ }).click()
  await expect(page).toHaveURL(/f=premier/)
  await expect(page.locator('article.entb-pq')).toHaveCount(3)
  await page.getByLabel('Trier').selectOption('distance')
  await expect(page).toHaveURL(/tri=distance/)
})

test('détail : bon de prise en vrai PDF après l’acceptation', async ({ page }) => {
  await ouvrir(page, adresse('paquet', 'id=PQ-Z3-261013-007'), FR)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Bon de prise (PDF)' }).first().click()])
  expect(dl.suggestedFilename()).toBe('bon-de-prise-PQ-Z3-261013-007.pdf')
  const octets = readFileSync((await dl.path())!)
  expect(octets.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  expect(octets.toString('latin1')).toContain('Bon de prise')
  await expect(page.locator('.rebours').first()).toBeVisible()
})

test('affectation : recherche et tri, Annuler 5 s, hors connexion gardée puis envoyée', async ({ page }) => {
  await ouvrir(page, adresse('affectation', 'id=PQ-Z3-261013-007'), FR)
  await expect(page.getByText('Une mission à la fois')).toBeVisible()
  await page.getByLabel('Rechercher un livreur').fill('zzz')
  await expect(page.getByText('Aucun livreur éligible ne correspond à cette recherche.')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer les filtres' }).click()
  await page.getByLabel('Trier').selectOption('score')
  await expect(page).toHaveURL(/tri=score/)
  await expect(page.getByText(/Tri choisi par vous\s:\sla suggestion reste/)).toBeVisible()
  const bouton = page.getByRole('button', { name: /^Affecter / }).first()
  await bouton.click()
  await expect(page.locator('.annuler')).toBeVisible()
  await page.locator('.annuler').getByRole('button', { name: 'Annuler' }).click()
  await page.waitForTimeout(5500)
  await expect(page.getByRole('heading', { name: 'Livreur affecté' })).toHaveCount(0)
  await page.context().setOffline(true)
  await page.getByRole('button', { name: /^Affecter / }).first().click()
  await expect(page.getByText(/Hors connexion\s:\sl’affectation de .+ est gardée/)).toBeVisible({ timeout: 10_000 })
  await page.context().setOffline(false)
  await expect(page.getByText('1 geste en attente d’envoi', { exact: true })).toHaveCount(0, { timeout: 10_000 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Livreur affecté' })).toBeVisible()
})

test('prix et délais : simulateur, alertes avant échéance (bornes, enregistrement, journal, hors connexion)', async ({ page }) => {
  await ouvrir(page, adresse('sla'), FR)
  const sem = page.locator('.lv-simu-r .v').first()
  const avant = await sem.textContent()
  await page.getByRole('button', { name: 'Un colis de plus' }).click()
  await expect(sem).not.toHaveText(avant!)
  const acc = page.getByLabel('Délai d’acceptation')
  await acc.fill('99')
  await expect(page.getByText('Valeur hors des bornes : elle ne sera pas enregistrée.').first()).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer les alertes' }).click()
  await expect(page.getByText('Valeur hors des bornes du registre : rien n’a été enregistré.')).toBeVisible()
  await acc.fill('10')
  await page.getByRole('button', { name: 'Enregistrer les alertes' }).click()
  await expect(page.getByText('Alertes enregistrées : les comptes à rebours en cours les appliquent déjà.')).toBeVisible()
  await page.context().setOffline(true)
  await acc.fill('12')
  await page.getByRole('button', { name: 'Enregistrer les alertes' }).click()
  await expect(page.getByText(/Hors connexion\s:\sle réglage est gardé/)).toBeVisible()
  await page.context().setOffline(false)
  await expect(page.getByText('1 geste en attente d’envoi', { exact: true })).toHaveCount(0, { timeout: 10_000 })
  await page.getByRole('link', { name: 'Journal des changements' }).first().click()
  await expect(page).toHaveURL(/parametres-journal/)
  await expect(page.locator('main')).toContainText(/Alertes avant échéance\s:\sacceptation\s12\smin/)
})

// VAGUE n° 6 : chaque paquet à affecter porte sa suggestion (zone, charge, Trust Score), validée d'un clic.
test('paquets à affecter : la suggestion de chacun, validée d’un clic (Annuler 5 s)', async ({ page }) => {
  await ouvrir(page, adresse('affectation'), FR)
  const ligne = page.locator('.entb-aaf[data-paquet="PQ-Z3-261013-007"]')
  await expect(ligne).toContainText('Suggéré :')
  await expect(ligne).toContainText(/Trust Score \d+/)
  await expect(ligne).toContainText(/\d+\/100/)
  const nom = ((await ligne.locator('.entb-aaf-s .b7').textContent()) ?? '').match(/Suggéré\s:\s(.+?\.)/)![1]
  await ligne.getByRole('button', { name: `Valider : affecter ${nom} à PQ-Z3-261013-007` }).click()
  await expect(page.locator('.annuler')).toBeVisible()
  await expect(page.getByText(`${nom} est affecté à PQ-Z3-261013-007.`)).toBeVisible({ timeout: 10_000 })
  await expect(ligne).toHaveCount(0)
  // Le détail du paquet : le livreur affecté est celui de la suggestion.
  await page.goto(adresse('affectation', 'id=PQ-Z3-261013-007'))
  await expect(page.getByRole('heading', { name: 'Livreur affecté' })).toBeVisible()
  await expect(page.locator('main')).toContainText(nom)
})
