// Gestes des écrans PR-08 Communication : Notifications, Messagerie, Aide, et les pages ajoutées (fiche du comptoir,
// appel masqué, mode papier). Critères d'acceptation de PR-08 (PR-08-R01) et règles cachées PR-RC-20, PR-RC-25.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'
// Petite photo (PNG 4 × 4) donnée à l'appareil photo de l'application.
const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4EaAARwzEcQAF0hOBdaGyegAAAABJRU5ErkJggg==', 'base64') }

/** Code de démonstration d'un colis (même calcul que src/demo/colis.ts : empreinte FNV-1a, 6 chiffres). */
function codeDemo(colis: string): string {
  let x = 0x811c9dc5
  for (const c of 'code:' + colis) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0
  return String(x % 10 ** 6).padStart(6, '0')
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

/** Une notification ne porte jamais un code (6 chiffres) ni un montant (NOT-03, NTF-06, PR-RC-20). */
async function sansCodeNiMontant(page: Page) {
  const lignes = await page.locator('main .pr08-ligne').allInnerTexts()
  expect(lignes.length).toBeGreaterThan(3)
  for (const l of lignes) {
    expect(l, l).not.toMatch(/\d[\d\s  ]*\s?(F|FCFA)\b/)
    expect(l, l).not.toMatch(/(?<![\w-])\d{6,}(?![\w-])/)
  }
}

test('notifications : résumé du matin, À traiter / Pour information, ni code ni montant, toucher ouvre l’écran et marque lue', async ({ page }) => {
  await ouvrir(page, '#notifications', FR)
  await expect(page.locator('.p-018ssc')).toContainText('RÉSUMÉ DU MATIN · 7 H')
  await expect(page.locator('.p-018ssc')).toContainText('places libres ce matin')
  await expect(page.locator(main)).toContainText('À TRAITER')
  await expect(page.locator(main)).toContainText('POUR INFORMATION')
  await expect(page.locator(main)).toContainText('Voir le détail · réf. BLV-VP-0141')
  await sansCodeNiMontant(page)
  await page.getByRole('button', { name: /^Photo demandée\. CS-2207/ }).click()
  // Le fil d'un dossier vit dans le dossier (ARL-95) : la notification ouvre le dossier.
  await expect(page).toHaveURL(/\/dossier-litige\?id=CS-2207$/)
  await page.goBack()
  await expect(page.getByRole('button', { name: /^Photo demandée\./ })).not.toHaveAccessibleName(/non lue/)
})

test('notifications : interrupteur coupé et heure du résumé gardés ; jamais avant 7 h ; tout marquer comme lu', async ({ page }) => {
  await ouvrir(page, '#notifications', FR)
  const approche = page.getByRole('switch', { name: 'Livreur en approche' })
  await expect(approche).toHaveAttribute('aria-checked', 'true')
  await approche.click()
  await expect(approche).toHaveAttribute('aria-checked', 'false')
  const heure = page.getByLabel('Heure du résumé')
  await expect(heure.locator('option').first()).toHaveText('7 h')
  await heure.selectOption('07:30')
  await expect(page.locator('.p-018ssc')).toContainText('RÉSUMÉ DU MATIN · 7 H 30')
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Livreur en approche' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByLabel('Heure du résumé')).toHaveValue('07:30')
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click()
  await expect(page.locator(main)).toContainText('Tout est lu')
  await expect(page.locator('main .p-byvapn')).toHaveCount(0)
})

test('notifications : l’employé ne reçoit rien d’argent ni de score, pas de réglage « Versements »', async ({ page }) => {
  await ouvrir(page, '#notifications?demo=employe', FR)
  await expect(page.locator(main)).toContainText('À TRAITER')
  await expect(page.locator(main)).not.toContainText('Versement envoyé')
  await expect(page.locator(main)).not.toContainText('Trust Score')
  await expect(page.getByRole('switch', { name: 'Versements' })).toHaveCount(0)
  await expect(page.locator(main)).not.toContainText('Score et sanctions')
})

test('messagerie : le fil d’un dossier ouvre le dossier (ARL-95) ; photo jointe ; numéro masqué par le serveur', async ({ page }) => {
  await ouvrir(page, '#messagerie?fil=T-CS-2207', FR)
  await expect(page).toHaveURL(/\/dossier-litige\?id=CS-2207$/)
  await ouvrir(page, '#messagerie', FR)
  await page.locator('.p-ax5aok').getByRole('button', { name: /Dossier CS-2207/ }).click()
  await expect(page).toHaveURL(/\/dossier-litige\?id=CS-2207$/)
  await ouvrir(page, '#messagerie?etat=sup', FR)
  await page.locator('.p-5whd7g input[type=file]').setInputFiles(PHOTO)
  await expect(page.locator('.pr08-joint')).toContainText('Photo prête à envoyer')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.locator('.pr08-photo img').last()).toBeVisible()
  await page.getByRole('textbox', { name: 'Votre message' }).fill('Le client a laissé son numéro 677 24 53 10')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.locator('.p-7nzqjl').last()).toContainText('[numéro masqué]')
  await expect(page.locator('.p-7nzqjl').last()).not.toContainText('677')
  await expect(page.locator('.p-7nzqjl').last()).toContainText('numéro masqué par BelivaY')
})

test('messagerie : fil logistique = réponses rapides seulement (critère 2) ; « Rappelez-moi » dans le fil support', async ({ page }) => {
  await ouvrir(page, '#messagerie?etat=log', FR)
  await expect(page.locator('.p-rj1mot')).toContainText('Collectes et livraisons')
  await expect(page.getByRole('textbox', { name: 'Réponses rapides seulement' })).toBeDisabled()
  await page.getByRole('button', { name: 'Relais presque plein' }).click()
  await expect(page.locator('.p-7nzqjl').last()).toContainText('Relais presque plein')
  await page.locator('.p-ax5aok').getByRole('button', { name: /Support BelivaY/ }).click()
  await expect(page.locator('.p-rj1mot')).toContainText('Première réponse sous 2 h')
  await page.getByRole('button', { name: 'Rappelez-moi' }).click()
  await expect(page.locator(main)).toContainText('Rappel demandé : le support vous appelle avant')
  await expect(page.getByRole('button', { name: 'Rappelez-moi' })).toBeDisabled()
})

test('aide : questions dépliables, recherche, « Parler à quelqu’un » sans WhatsApp, demande au support visible dans la Messagerie', async ({ page }) => {
  await ouvrir(page, '#aide', FR)
  const q = page.getByRole('button', { name: 'Le livreur n’a pas de code de dépôt' })
  await expect(q).toHaveAttribute('aria-expanded', 'true')
  await q.click()
  await expect(q).toHaveAttribute('aria-expanded', 'false')
  const code = page.getByRole('button', { name: 'Le client a perdu son code' })
  await code.click()
  await expect(page.locator(main)).toContainText('3 fois par 24 h au plus')
  await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Parler à quelqu’un/ })).toHaveAttribute('href', /messagerie/)
  await page.getByRole('searchbox', { name: 'Rechercher dans l’aide' }).fill('papier')
  await expect(page.getByRole('button', { name: 'Panne générale : le mode papier' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Le client a perdu son code' })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Rechercher dans l’aide' }).fill('')
  await page.getByRole('button', { name: 'Application' }).click()
  await page.getByLabel('RÉFÉRENCE DU COLIS (SI CONCERNÉ)').fill('XYZ')
  await page.getByLabel('MESSAGE').fill('Le scanner ne lit plus les étiquettes.')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.locator(main)).toContainText('Référence inconnue')
  await page.getByLabel('RÉFÉRENCE DU COLIS (SI CONCERNÉ)').fill('BLV-00031-1')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page).toHaveURL(/\/messagerie\?fil=T-S/)
  await expect(page.locator('.p-rj1mot')).toContainText('Demande · Application · BLV-00031-1')
  await expect(page.locator('.p-7nzqjl').last()).toContainText('Le scanner ne lit plus les étiquettes.')
})

test('aide : l’employé ne lit ni l’argent ni la convention ; fiche du comptoir ouvre l’écran du geste', async ({ page }) => {
  await ouvrir(page, '#aide?demo=employe', FR)
  await expect(page.locator(main)).toContainText('Questions fréquentes')
  await expect(page.getByRole('button', { name: 'Quand et comment suis-je payé ?' })).toHaveCount(0)
  await expect(page.locator(main)).not.toContainText('Convention et partenariat')
  await expect(page.getByRole('button', { name: 'Argent', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: /Recevoir un lot/ }).click()
  await expect(page).toHaveURL(/\/aide-fiche\?id=recevoir$/)
  await expect(page.locator('.pr08-etapes li')).toHaveCount(4)
  await page.getByRole('link', { name: 'Ouvrir l’écran' }).click()
  await expect(page).toHaveURL(/\/reception$/)
})

test('appel masqué : le support s’appelle pendant ses heures, le livreur seulement pendant sa mission ; journal sans contenu', async ({ page }) => {
  await ouvrir(page, '#appel', FR)
  await expect(page.locator(main)).toContainText('L’appel s’ouvre 15 min avant l’arrivée du livreur')
  await expect(page.getByRole('button', { name: 'Appeler le livreur' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Appeler le support' }).click()
  // L'appel passe dans le panneau flottant (il ne bloque pas le relais) ; l'écran le rappelle.
  const panneau = page.locator('.ap-grand')
  await expect(panneau).toBeVisible()
  await expect(page.locator(main)).toContainText('Appel en cours avec')
  await panneau.getByRole('button', { name: 'Réduire l’appel' }).click()
  await expect(page.locator('.ap-bulle')).toBeVisible()
  await page.getByRole('button', { name: 'Afficher l’appel' }).click()
  await panneau.getByRole('button', { name: 'Raccrocher' }).click()
  await expect(panneau).toContainText('Terminé')
  await panneau.getByRole('button', { name: 'Fermer' }).first().click()
  await expect(page.locator(main)).toContainText('Derniers appels')
  await expect(page.locator(main)).toContainText('par RM')
  await expect(page.locator(main)).not.toContainText(/\b6\d{8}\b/)
})

test('mode papier : seuls les colis sans montant se remettent, code vérifié, photo et PIN', async ({ page }) => {
  await ouvrir(page, '#mode-papier', FR)
  await expect(page.locator(main)).toContainText('Panne générale DIF-0312')
  const saisir = async (ref: string, code: string) => {
    await page.getByLabel('RÉFÉRENCE', { exact: true }).fill(ref)
    await page.getByLabel(/HEURE/).selectOption('17:00')
    await page.getByLabel('CODE DONNÉ PAR LE CLIENT (ÉCRIT SUR LE REGISTRE)').fill(code)
    await page.getByLabel('Pièce d’identité vérifiée').check()
    await page.getByLabel('Signature du client sur le registre').check()
    if (await page.locator('.pr08-joint').count() === 0) await page.locator('main input[type=file]').setInputFiles(PHOTO)
    await page.getByLabel('VOTRE PIN').fill('240913')
    await page.getByRole('button', { name: 'Saisir la ligne' }).click()
  }
  await saisir('BLV-00037-1', codeDemo('BLV-00037-1'))
  await expect(page.locator(main)).toContainText('il ne se remet jamais sur papier')
  await saisir('BLV-00031-1', '000000')
  await expect(page.locator(main)).toContainText('Le code écrit ne correspond pas à ce colis.')
  await saisir('BLV-00031-1', codeDemo('BLV-00031-1'))
  await expect(page.locator(main)).toContainText('Remise de BLV-00031-1 enregistrée')
  await expect(page.locator(main)).toContainText('Remise enregistrée')
})
