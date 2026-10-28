// Gestes et règles d'ENT-06 (missions et carte, incidents, colis, preuves) sur la démonstration, à l'heure figée du
// jeu d'essai (mardi 13 octobre 2026, 14 h 05).
import { expect, test } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.setViewportSize({ width: 1280, height: 900 })
})

test('missions : retard prévisible en tête, hors connexion, carte des seuls livreurs en mission active', async ({ page }) => {
  await ouvrir(page, adresse('missions'), FR)
  await expect(page.locator('.dk-banner.red')).toContainText('PQ-Z3-261013-001')
  await expect(page.getByText('Hors connexion').first()).toBeVisible()
  // Junior, Hugo, Paul, Serge et six autres livreurs en mission (trafic normal) ; Inès, affectée non partie : pas de position.
  // Marqueurs communs : un livreur seul, ou compté dans le groupe des livreurs trop proches (data-n).
  await expect(page.locator('.lv-carte .mq-livreur, .lv-carte .mq-groupe-livreur').first()).toBeVisible()
  const seuls = await page.locator('.lv-c-livreur').count()
  const groupes = await page.locator('.mq-groupe-livreur').evaluateAll((g) => g.reduce((n, x) => n + Number(x.getAttribute('data-n')), 0))
  expect(seuls + groupes).toBe(10)
  await expect(page.locator('.lv-c-livreur', { hasText: 'IK' })).toHaveCount(0)
  await page.locator('.tabs').getByRole('link', { name: /Closes/ }).click()
  await expect(page.locator('main')).toContainText('PQ-Z2-261012-014')
})

test('appel masqué : jamais de numéro, flottant et réductible, journalisé avec sa durée et sa note', async ({ page }) => {
  await ouvrir(page, adresse('missions', 'mission=MS-Z3-261013-001&sheet=mission'), FR)
  await page.locator('.sheet').getByRole('button', { name: 'Appeler' }).click()
  await page.getByRole('button', { name: 'Appeler dans l’application' }).click()
  // L'appel passe dans le panneau flottant : la feuille se ferme, l'espace reste utilisable.
  const panneau = page.locator('.ap-grand')
  await expect(panneau).toBeVisible()
  await expect(panneau).not.toContainText('+237')
  await panneau.getByRole('button', { name: 'Noter l’appel' }).click()
  await panneau.locator('textarea').fill('Livreur prévenu, arrêt suivant décalé')
  await panneau.getByRole('button', { name: 'Enregistrer la note' }).click()
  await expect(panneau).toContainText('Note enregistrée')
  // Réduit en bulle, il suit la navigation ; un toucher le rouvre en grand.
  await panneau.getByRole('button', { name: 'Réduire l’appel' }).click()
  const bulle = page.locator('.ap-bulle')
  await expect(bulle).toBeVisible()
  await page.locator('#app a[href$="/entreprise/flotte"]').first().click()
  await expect(page).toHaveURL(/\/flotte/)
  await expect(bulle).toBeVisible()
  await bulle.getByRole('button', { name: /Rouvrir l’appel/ }).click()
  await panneau.getByRole('button', { name: 'Raccrocher' }).click()
  await expect(panneau).toContainText('Terminé')
  await panneau.getByRole('button', { name: 'Fermer' }).first().click()
  await expect(panneau).toHaveCount(0)
  await page.goto(adresse('missions', 'mission=MS-Z3-261013-001&sheet=appel'))
  await expect(page.locator('.sheet .lv-journal li')).toHaveCount(1)
  await expect(page.locator('.sheet .lv-journal')).toContainText('Livreur prévenu')
})

test('incidents : refus motivé (longueur du registre), validation, tournée ajustée', async ({ page }) => {
  await ouvrir(page, adresse('incidents'), FR)
  await expect(page.locator('.dk-banner.amber')).toContainText('Boutique fermée')
  await page.getByRole('button', { name: 'Refuser', exact: true }).click()
  await page.locator('.sheet textarea').fill('Trop court')
  await expect(page.getByRole('button', { name: 'Refuser et envoyer le motif' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Valider l’incident' }).click()
  await expect(page.getByText(/Incident validé\s:\sla tournée est ajustée/)).toBeVisible({ timeout: 10_000 }) // après les 5 s d'« Annuler »
  // La mission débloquée quitte l'onglet des incidents ; seule reste celle de Gilles A. (IN-110, pas encore décidé).
  await page.goto(adresse('missions', 'onglet=incidents'))
  await expect(page.locator('main table')).not.toContainText('PQ-Z1-261013-002')
  await expect(page.locator('main table')).toContainText('PQ-Z6-261013-027')
})

test('transfert : seulement vers un livreur éligible', async ({ page }) => {
  await ouvrir(page, adresse('incidents', 'transfert=PQ-Z2-261013-003'), FR)
  await expect(page.getByText('Aucun livreur éligible disponible')).toBeVisible()
})

test('colis : une seule file par colis, QR unique, aucun client ; comptable refusé', async ({ page }) => {
  await ouvrir(page, adresse('colis'), FR)
  await expect(page.locator('.tabs').getByRole('link', { name: /Sous garde/ })).toHaveAttribute('aria-current', 'true')
  await page.getByRole('button', { name: 'QR du colis BV 24 8101' }).first().click()
  await expect(page.locator('.sheet svg.lv-qr')).toHaveCount(0) // masqué jusqu'au toucher
  await expect(page.locator('.sheet')).toContainText('BV •• ••01')
  await page.getByRole('button', { name: /Afficher le QR et le code/ }).click()
  await expect(page.locator('.sheet svg.lv-qr')).toBeVisible()
  await expect(page.locator('.sheet')).toContainText('BV 24 8101')
  await page.keyboard.press('Escape')
  await page.locator('.tabs').getByRole('link', { name: /À ramasser/ }).click()
  await expect(page.locator('.lv-etq.prevue').first()).toBeVisible()
  await page.goto(adresse('colis', 'role=comptable'))
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
})

test('preuves : dossier à revoir d’abord, file de revue, signalement sans suppression, export PDF', async ({ page }) => {
  await ouvrir(page, adresse('preuves'), FR)
  await expect(page.locator('#pr-galerie')).toContainText('PQ-Z3-261013-001')
  await expect(page.locator('#pr-revue')).toContainText('BV 24 9006')
  await page.getByRole('button', { name: 'Signaler une preuve défectueuse' }).click()
  await page.locator('.sheet textarea').fill('Photo floue, étiquette illisible.')
  await page.locator('.sheet').getByRole('button', { name: 'Signaler' }).click()
  await expect(page.getByText(/Preuve signalée\s:\sBelivaY la revoit/)).toBeVisible({ timeout: 10_000 })
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter le dossier (PDF)' }).click()
  expect((await telechargement).suggestedFilename()).toBe('dossier-preuves-PQ-Z3-261013-001.pdf')
})

// ── Enrichissements (file hors connexion, rebours, exports, recherche, Annuler, visionneuse) ──────────────────────

const lireTelechargement = async (d: import('@playwright/test').Download) => {
  const chemin = await d.path()
  const { readFileSync } = await import('node:fs')
  return readFileSync(chemin!)
}

test('missions : relance gardée hors connexion, envoyée au retour du réseau puis relue', async ({ page }) => {
  await ouvrir(page, adresse('missions', 'mission=MS-Z3-261013-001&sheet=mission'), FR)
  await page.context().setOffline(true)
  await page.locator('.sheet').getByRole('button', { name: 'Position' }).click()
  await expect(page.locator('.sheet')).toContainText('Relance gardée sur cet appareil')
  await expect(page.locator('.en-file')).toContainText('1 geste en attente d’envoi')
  await page.context().setOffline(false)
  await expect(page.locator('.en-file')).toHaveCount(0)
  // Relue : la relance est partie, une seconde est refusée par l'intervalle du registre.
  await page.locator('.sheet').getByRole('button', { name: 'Position' }).click()
  await expect(page.locator('.sheet')).toContainText('Déjà relancé')
})

test('missions : rebours en direct sur l’heure limite, export CSV de la journée sans position, plein écran', async ({ page }) => {
  await ouvrir(page, adresse('missions'), FR)
  const r = page.locator('.entb-t td .rebours').first()
  const avant = await r.innerText()
  await page.clock.setFixedTime(new Date('2026-10-13T13:07:00.500Z'))
  await expect(r).not.toHaveText(avant)
  const d = page.waitForEvent('download')
  await page.getByRole('group', { name: 'Exporter les missions de la journée' }).getByRole('button', { name: 'CSV' }).click()
  const f = await d
  expect(f.suggestedFilename()).toBe('missions-2026-10-13.csv')
  const texte = (await lireTelechargement(f)).toString('utf-8')
  expect(texte).toContain('Paquet;Onglet;Genre')
  expect(texte).toContain('PQ-Z3-261013-001')
  expect(texte).not.toMatch(/lat|lng|3\.8\d{3}/)
  await expect(page.locator('.lv-maj')).toContainText('Dernière position reçue à')
  await page.getByRole('button', { name: 'Plein écran', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Quitter le plein écran' }).first()).toBeVisible()
  await page.locator('.lv-carte-cadre').getByRole('button', { name: 'Quitter le plein écran' }).click()
  await expect(page.getByRole('button', { name: 'Plein écran', exact: true })).toBeVisible()
})

test('incidents : recherche, puces, zéro résultat, rebours de réponse et limite affichée', async ({ page }) => {
  await ouvrir(page, adresse('incidents'), FR)
  await expect(page.locator('.entb-inc .rebours').first()).toBeVisible()
  await expect(page.locator('.e-limite')).toContainText('Délai de réponse')
  await page.getByRole('searchbox', { name: 'Rechercher un incident' }).fill('zzzz')
  await expect(page.getByText('Aucun résultat')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer les filtres' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await page.getByRole('group', { name: 'Filtrer les incidents' }).getByRole('button', { name: /Traités/ }).click()
  await expect(page).toHaveURL(/f=traites/)
  await expect(page.locator('.entb-inc .rebours')).toHaveCount(0)
})

test('incidents : Annuler reprend la décision ; hors connexion elle est gardée puis envoyée', async ({ page }) => {
  await ouvrir(page, adresse('incidents'), FR)
  await page.getByRole('button', { name: 'Valider l’incident' }).click()
  await page.locator('.annuler').getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByRole('button', { name: 'Valider l’incident' })).toBeVisible()
  await page.waitForTimeout(5_500)
  await expect(page.getByText(/Incident validé/)).toHaveCount(0)
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Valider l’incident' }).click()
  await expect(page.getByText('Décision gardée sur cet appareil')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.en-file')).toContainText('Valider un incident')
  await page.context().setOffline(false)
  await expect(page.locator('.en-file')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(/Validé par/).first()).toBeVisible()
})

test('colis : recherche lancée par un scan (saisie sans caméra), zéro résultat, export CSV', async ({ page }) => {
  await ouvrir(page, adresse('colis', 'file=a_ramasser'), FR)
  await page.getByRole('button', { name: /Scanner une étiquette|Saisir une étiquette/ }).click()
  await page.locator('.sheet').getByLabel('Numéro de l’étiquette').fill('BV248101')
  await page.locator('.sheet').getByRole('button', { name: 'Chercher ce colis' }).click()
  await expect(page).toHaveURL(/file=sous_garde/)
  await expect(page.getByRole('searchbox', { name: 'Rechercher un colis' })).toHaveValue('BV 24 8101')
  await expect(page.locator('.entb-t tbody tr')).toHaveCount(1)
  const d = page.waitForEvent('download')
  await page.getByRole('group', { name: 'Exporter les colis de la file' }).getByRole('button', { name: 'CSV' }).click()
  const texte = (await lireTelechargement(await d)).toString('utf-8')
  expect(texte).toContain('Étiquette;Paquet;File')
  expect(texte).toContain('BV 24 8101')
  await page.getByRole('searchbox', { name: 'Rechercher un colis' }).fill('zzzz')
  await expect(page.getByText('Aucun résultat')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer les filtres' }).click()
  await expect(page.locator('.entb-t tbody tr').first()).toBeVisible()
})

test('preuves : visionneuse (zoom, heure et lieu incrustés), filtre preuves manquantes, vrai PDF et CSV, Annuler', async ({ page }) => {
  await ouvrir(page, adresse('preuves'), FR)
  await page.locator('.photo.lv-ouvrable').first().click()
  const v = page.getByRole('dialog')
  await expect(v).toContainText('(téléphone)')
  await v.getByRole('button', { name: 'Agrandir' }).click()
  await expect(v).toContainText('150 %')
  await page.keyboard.press('Escape')
  await expect(page.locator('.lv-vis')).toHaveCount(0)
  await page.getByRole('group', { name: 'Filtrer les dossiers de preuves' }).getByRole('button', { name: /Preuves manquantes/ }).click()
  await expect(page).toHaveURL(/f=manquantes/)
  await expect(page.locator('#pr-missions .entb-mis').first()).toBeVisible()
  await expect(page.locator('#pr-missions')).not.toContainText('Complet')
  const d1 = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter le dossier (PDF)' }).click()
  expect((await lireTelechargement(await d1)).subarray(0, 5).toString('latin1')).toBe('%PDF-')
  const d2 = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter le dossier (CSV)' }).click()
  expect((await lireTelechargement(await d2)).toString('utf-8')).toContain('Maillon;Lieu du maillon;Preuve')
  await page.getByRole('button', { name: 'Signaler une preuve défectueuse' }).click()
  await page.locator('.sheet textarea').fill('Photo floue, étiquette illisible.')
  await page.locator('.sheet').getByRole('button', { name: 'Signaler' }).click()
  await page.locator('.annuler').getByRole('button', { name: 'Annuler' }).click()
  await page.waitForTimeout(5_500)
  await expect(page.getByText(/Preuve signalée\s:\sBelivaY/)).toHaveCount(0)
  await expect(page.locator('#pr-galerie')).not.toContainText('signalée par')
})
