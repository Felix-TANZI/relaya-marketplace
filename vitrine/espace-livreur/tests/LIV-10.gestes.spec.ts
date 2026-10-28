// Gestes des écrans LIV-10 (messages, notifications, moi, aide et SOS, réglages).
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('messages : un numéro écrit est masqué par le serveur ; message rapide envoyé', async ({ page }) => {
  await ouvrir(page, '#messages', FR)
  await page.getByRole('link', { name: /Maison Ngono/ }).click()
  await page.getByRole('textbox', { name: 'Écrire un message…' }).fill('Appelez-moi au 677 12 34 56')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.locator('.livc-b.out').last()).toContainText('Appelez-moi au')
  await expect(page.locator('.livc-b.out').last().locator('.livc-mask')).toContainText('masqué')
  await expect(page.locator('.livc-b.out').last()).not.toContainText('677')
  await expect(page.locator(main)).toContainText('passez par l’application')
  await page.locator('.livc-qr').getByRole('button', { name: 'J’arrive dans 5 minutes' }).click()
  await expect(page.locator('.livc-b.out').last()).toContainText('J’arrive dans 5 minutes')
})

test('messages : fil fermé en lecture seule ; appel au client refusé tant qu’on ne part pas vers lui', async ({ page }) => {
  await ouvrir(page, '#messages?fil=F9', FR)
  await expect(page.locator('.l10-cta')).toContainText('Lecture seule · ce fil est fermé')
  await expect(page.getByRole('textbox', { name: 'Écrire un message…' })).toHaveCount(0)
  await ouvrir(page, '#messages?fil=F6', FR)
  await page.getByRole('button', { name: 'Appel masqué' }).click()
  await expect(page.locator('.sheet')).toContainText('La ligne s’ouvre quand vous partez vers cet arrêt.')
})

test('notifications : par rubrique, ouverture vers l’écran concerné, tout marquer comme lu', async ({ page }) => {
  await ouvrir(page, '#notifications', FR)
  await expect(page.locator(main)).toContainText('Tournée')
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click()
  await expect(page.locator(main)).toContainText('Tout est lu')
  await page.getByRole('button', { name: /Vos pièces sont à jour/ }).click()
  await expect(page).toHaveURL(/\/moi$/)
})

/** Un geste de l'entreprise, déposé dans le pont de démonstration (même appareil), puis la page relue. */
async function depuisEntreprise(page: import('@playwright/test').Page, e: Record<string, unknown>) {
  await page.evaluate((x) => {
    const l = JSON.parse(localStorage.getItem('blv_pont') ?? '[]')
    l.push({ ...x, cle: x.type + '-' + l.length, app: 'entreprise', le: Date.now() })
    localStorage.setItem('blv_pont', JSON.stringify(l))
  }, e)
  await page.reload()
}

test('moi : une pièce se renvoie seulement quand l’entreprise la demande ; nouvelle photo par un selfie demandé', async ({ page }) => {
  await ouvrir(page, '#moi', FR)
  await expect(page.locator(main)).toContainText('dimanche 14 mars 2027')
  await expect(page.getByRole('button', { name: 'Mettre à jour : Attestation d’assurance' })).toHaveCount(0)
  // Yafé Express demande une nouvelle vérification de la photo (Pièces des livreurs, dans son portail).
  await depuisEntreprise(page, { type: 'piece_demandee', piece: 'selfie', motif: 'Photo floue : le vendeur ne vous reconnaît pas.' })
  await expect(page.locator('main .hero.amber')).toContainText('Nouvelle vérification de votre photo')
  await expect(page.locator('main .hero.amber')).toContainText('Photo floue')
  await page.locator('main .hero.amber').getByRole('button', { name: 'Prendre le selfie' }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64')
  await expect(page.locator('.sheet')).toContainText('Demandée par votre entreprise')
  await page.locator('.sheet [data-lc-photo]').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Envoyer la nouvelle pièce' }).click()
  await expect(page.locator('.sheet')).toContainText('Pièce envoyée')
  const envoye = await page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; piece?: string }[])
  expect(envoye.some((e) => e.type === 'piece_envoyee' && e.app === 'livreur' && e.piece === 'selfie')).toBe(true)
})

test('moi : demander à quitter avec un motif, préavis et conditions, annulation ; l’entreprise clôture', async ({ page }) => {
  await ouvrir(page, '#moi', FR)
  await page.getByRole('button', { name: /Demander à quitter/ }).click()
  const f = page.locator('.sheet')
  await expect(f).toContainText('Aucun effet immédiat')
  await expect(f.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled()
  await f.getByRole('radio', { name: 'Autre emploi' }).click()
  await f.locator('#l10-depart-texte').fill('Merci pour tout.')
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(f).toContainText('Préavis jusqu’au mardi 20 octobre')
  // DP-67 : il travaille normalement jusqu'à la veille du dernier jour ; hors service sans point perdu ; commun accord.
  await expect(f).toContainText('Vous continuez à travailler normalement jusqu’à la veille du mardi 20 octobre. À partir de ce jour, plus aucune nouvelle mission.')
  await expect(f).toContainText('Pendant le préavis, passer « hors service » ne vous coûte aucun point de Trust Score.')
  await expect(f).toContainText('D’un commun accord, Yafé Express peut clôturer avant la fin du préavis')
  await expect(f).toContainText('Mon dernier versement · estimé à ce jour')
  await expect(f).toContainText('au plus tard le vendredi 23 octobre à 14 h 05')
  await expect(f).toContainText('Une mission est en cours')
  await expect(f).toContainText('Kit à rendre à votre entreprise')
  await expect(f).toContainText('contact@belivay.com')
  const envoye = await page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; motif?: string }[])
  expect(envoye.some((e) => e.type === 'depart_demande' && e.app === 'livreur' && e.motif === 'autre_emploi')).toBe(true)
  // Annulée tant qu'elle n'est pas close : rien n'a changé.
  await f.getByRole('button', { name: 'Annuler ma demande' }).click()
  await expect(f).toContainText('Aucun effet immédiat')
  // Demandée à nouveau, puis close par Yafé Express (kit contrôlé, conditions remplies dans son portail).
  await f.getByRole('radio', { name: 'Horaires' }).click()
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(f).toContainText('Préavis jusqu’au')
  await page.keyboard.press('Escape')
  const id = (await page.evaluate(() => (JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; id?: string }[]).filter((e) => e.type === 'depart_demande').pop()!.id))!
  await depuisEntreprise(page, { type: 'depart_kit', id, constat: 'restitue', manquants: [], retenue: 0 })
  await depuisEntreprise(page, { type: 'depart_clos', id, par: 'entreprise', versementLe: Date.parse('2026-10-16T11:00:00Z'), kitNonConteste: false, versement: VERSEMENT })
  await expect(page.locator(main)).toContainText('Départ clôturé')
  await page.getByRole('button', { name: /Demander à quitter/ }).click()
  await expect(f).toContainText('Dernier versement le vendredi 16 octobre')
  await expect(f).toContainText('Kit rendu complet')
  await expect(f.getByRole('button', { name: 'Annuler ma demande' })).toHaveCount(0)
})

const VERSEMENT = { du: 18400, missions: 41, retenuLitiges: 300, litiges: 1, retenueKit: 0, kitDeCote: 0, verse: 18100 }
const pont = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; id?: string; motif?: string }[])

test('départ : kit constaté incomplet par l’entreprise, retenue plafonnée contestée (BelivaY décide)', async ({ page }) => {
  await ouvrir(page, '#moi?sheet=depart', FR)
  const f = page.locator('.sheet')
  await f.getByRole('radio', { name: 'Déménagement' }).click()
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(f).toContainText('Kit à rendre à votre entreprise')
  const id = (await pont(page)).filter((e) => e.type === 'depart_demande').pop()!.id!
  await depuisEntreprise(page, { type: 'depart_kit', id, constat: 'incomplet', manquants: ['pochettes du kit journalier'], retenue: 4500 })
  await expect(f).toContainText('Kit incomplet : pochettes du kit journalier')
  await expect(f).toContainText(/Retenue de 4\s500\sF sur votre dernier relevé \(au plus 21\s000\sF, la valeur du kit\)/)
  await expect(f).toContainText('Kit constaté par votre entreprise')
  await f.getByRole('button', { name: 'Contester la retenue' }).click()
  await expect(f.getByRole('button', { name: 'Envoyer ma contestation' })).toBeDisabled()
  await f.locator('#l10-kit-motif').fill('J’ai rendu les pochettes au chef d’équipe lundi.')
  await f.getByRole('button', { name: 'Envoyer ma contestation' }).click()
  await expect(f).toContainText('Contestée le mardi 13 octobre.')
  await expect(f).toContainText(/BelivaY décide\s;\s4\s500\sF sont mis de côté d’ici là/)
  await expect(f).toContainText('Kit contesté · mis de côté')
  expect((await pont(page)).some((e) => e.type === 'kit_conteste' && e.app === 'livreur' && e.id === id && e.motif === 'J’ai rendu les pochettes au chef d’équipe lundi.')).toBe(true)
  await expect(f.getByRole('button', { name: 'Contester la retenue' })).toHaveCount(0)
})

test('départ clôturé : SMS avec la date du dernier versement, compte au rattachement fermé, versement fait', async ({ page }) => {
  await ouvrir(page, '#moi?sheet=depart', FR)
  const f = page.locator('.sheet')
  await f.getByRole('radio', { name: 'Horaires' }).click()
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(f).toContainText('Préavis jusqu’au')
  const id = (await pont(page)).filter((e) => e.type === 'depart_demande').pop()!.id!
  await depuisEntreprise(page, { type: 'depart_kit', id, constat: 'incomplet', manquants: ['rouleau d’étiquettes'], retenue: 3000 })
  await depuisEntreprise(page, { type: 'depart_clos', id, par: 'entreprise', versementLe: Date.parse('2026-10-15T23:00:00Z'), kitNonConteste: false, versement: { ...VERSEMENT, retenueKit: 3000, verse: 15100 } })
  await page.goto('notifications')
  await expect(page.locator(main)).toContainText('SMS · Départ clôturé')
  await expect(page.locator(main)).toContainText('Dernier versement en Mobile Money le vendredi 16 octobre')
  await page.goto('compte')
  await expect(page.locator(main)).toContainText('Rattachement fermé')
  await expect(page.locator(main)).toContainText('Mon dernier versement')
  await expect(page.locator(main)).toContainText(/Retenu\s·\s1 litige ouvert\s*−\s300\sF/)
  await expect(page.locator(main)).toContainText(/Versé en Mobile Money\s*15\s100\sF/)
  await expect(page.locator(main)).toContainText('vendredi 16 octobre')
  // Contestable même accès fermé.
  await expect(page.getByRole('button', { name: 'Contester la retenue' })).toBeVisible()
  await depuisEntreprise(page, { type: 'versement_fait', id, montant: 15100 })
  await expect(page.locator(main)).toContainText('Versement fait le mardi 13 octobre.')
  await page.goto('notifications')
  await expect(page.locator(main)).toContainText('SMS · Dernier versement fait')
  await expect(page.locator(main)).toContainText(/15\s100\sF envoyés sur votre Mobile Money/)
})

test('clôture par BelivaY sans constat du kit dans le délai : « kit non contesté », aucune retenue', async ({ page }) => {
  await ouvrir(page, '#moi?sheet=depart', FR)
  const f = page.locator('.sheet')
  await f.getByRole('radio', { name: 'Santé' }).click()
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(f).toContainText('Préavis jusqu’au')
  const id = (await pont(page)).filter((e) => e.type === 'depart_demande').pop()!.id!
  await depuisEntreprise(page, { type: 'depart_clos', id, par: 'admin', versementLe: Date.parse('2026-10-15T23:00:00Z'), kitNonConteste: true, versement: VERSEMENT })
  await page.goto('compte')
  await expect(page.locator(main)).toContainText('Kit non contesté')
  await expect(page.locator(main)).toContainText('Yafé Express n’a rien constaté dans le délai : aucune retenue.')
  await expect(page.locator(main)).not.toContainText('Retenue sur le kit')
})

test('nouvelle photo : délai PHOTO-REVERIF-J avec compte à rebours (il travaille), puis plus de nouvelle mission jusqu’à la validation', async ({ page }) => {
  await ouvrir(page, '#moi', FR)
  const jusqua = Date.parse('2026-10-19T09:00:00Z')
  await depuisEntreprise(page, { type: 'piece_demandee', piece: 'selfie', motif: 'Photo trop sombre.', jusqua })
  await expect(page.locator('main .hero.amber')).toContainText('Nouvelle vérification de votre photo')
  await expect(page.locator('main .hero.amber')).toContainText('Encore 6 jours')
  await expect(page.locator('main .hero.amber')).toContainText('à envoyer avant le lundi 19 octobre à 10 h. Vous continuez à travailler d’ici là.')
  await expect(page.locator(main).locator('.li', { hasText: 'Selfie avec preuve de vie' })).toContainText('Nouvelle vérification demandée')
  await expect(page.locator(main)).not.toContainText('Refusée')
  await page.goto('./')
  await expect(page.locator(main)).toContainText('Nouvelle photo demandée · encore 6 jours, avant le lundi 19 octobre. Vous continuez à travailler d’ici là.')
  // Délai passé (demande du 5 octobre, échue le 12) : plus aucune nouvelle mission jusqu'à la validation.
  await depuisEntreprise(page, { type: 'piece_demandee', piece: 'selfie', motif: 'Photo trop sombre.', jusqua: Date.parse('2026-10-12T09:00:00Z') })
  await expect(page.locator(main).getByRole('alert').filter({ hasText: 'Plus de nouvelle mission' })).toContainText('le délai pour votre nouvelle photo est passé')
  await page.goto('moi')
  await expect(page.locator('main .hero.red')).toContainText('Plus de nouvelle mission jusqu’à la validation de votre photo')
  await page.locator('main .hero.red').getByRole('button', { name: 'Prendre le selfie' }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64')
  await page.locator('.sheet [data-lc-photo]').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Envoyer la nouvelle pièce' }).click()
  await expect(page.locator('.sheet')).toContainText('Pièce envoyée')
  await page.keyboard.press('Escape')
  // Envoyée, pas encore validée : toujours bloqué, la photo est en vérification.
  await expect(page.locator('main .hero.red')).toContainText('Photo envoyée, en vérification')
})

test('situations DP-67 : préavis (hors service sans point perdu, kit contestable), départ clôturé, nouvelle photo en retard', async ({ page }) => {
  await ouvrir(page, '#statut?demo=preavis', FR)
  await expect(page.locator('.l4-statut')).toContainText('Pendant le préavis, passer « hors service » ne vous coûte aucun point de Trust Score.')
  await page.goto('moi?demo=preavis&sheet=depart')
  const f = page.locator('.sheet')
  await expect(f).toContainText('Préavis jusqu’au jeudi 15 octobre')
  await expect(f).toContainText('jusqu’à la veille du jeudi 15 octobre')
  await expect(f).toContainText('Kit incomplet : pochettes du kit journalier')
  await expect(f.getByRole('button', { name: 'Contester la retenue' })).toBeVisible()
  await expect(f).toContainText(/Versé en Mobile Money\s*\d/)
  await page.goto('compte?demo=depart_clos')
  await expect(page.locator(main)).toContainText('Mon dernier versement')
  await expect(page.locator(main)).toContainText(/Versé en Mobile Money\s*13\s600\sF/)
  await expect(page.locator(main)).toContainText('vendredi 16 octobre')
  await page.goto('./?demo=photo_retard')
  await expect(page.locator(main).getByRole('alert').filter({ hasText: 'Plus de nouvelle mission' })).toBeVisible()
  await page.goto('moi')
  await expect(page.locator('main .hero.red')).toContainText('Plus de nouvelle mission jusqu’à la validation de votre photo')
})

test('aide : accident avec blessé, numéros d’urgence ; SOS par appui long, puis arrêt en un geste', async ({ page }) => {
  await ouvrir(page, '#aide?s=urgence', FR)
  await expect(page.locator('.l10-num').first()).toHaveAttribute('href', 'tel:119')
  await ouvrir(page, '#aide?s=sos', FR)
  const sos = page.locator('.l10-sosb')
  await sos.click()
  await expect(sos).toContainText('Maintenez le bouton')
  await sos.hover()
  await page.mouse.down()
  await page.waitForTimeout(2300)
  await page.mouse.up()
  await expect(page.locator(main)).toContainText('SOS en cours · depuis')
  await page.getByRole('button', { name: 'Arrêter le SOS' }).click()
  await expect(page.locator(main)).toContainText('SOS arrêté à', { timeout: 8000 })
})

test('réglages : taille du texte réglable, langue anglaise, notifications de tournée verrouillées', async ({ page }) => {
  await ouvrir(page, '#reglages', FR)
  await expect(page.getByRole('switch', { name: 'Notifications de tournée' })).toHaveAttribute('aria-disabled', 'true')
  await page.locator('[data-taille-texte] input[type=range]').fill('3')
  await expect(page.locator('[data-taille-texte]')).toContainText('Un peu grande · 108 %')
  await page.getByRole('button', { name: 'Revenir à la taille normale' }).click()
  await expect(page.locator('[data-taille-texte]')).toContainText('Normale · 100 %')
  await page.getByRole('radio', { name: 'English' }).click()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await expect(page.locator(main)).toContainText('Sounds and comfort')
})

test('réglages : feuilles ouvertes par l’adresse du prototype, déconnexion retenue tant que des colis sont sous garde', async ({ page }) => {
  await ouvrir(page, '#reglages?s=deconnexion', FR)
  await expect(page.locator('.sheet')).toContainText('Se déconnecter ?')
  await expect(page.locator('.sheet').getByRole('button', { name: 'Se déconnecter' })).toBeDisabled()
  await page.locator('.sheet').getByRole('checkbox').check()
  await expect(page.locator('.sheet').getByRole('button', { name: 'Se déconnecter' })).toBeEnabled()
  // L'ancienne feuille « Quitter l'entreprise » des réglages mène à la demande de départ, dans Moi (DP-66).
  await ouvrir(page, '#reglages?s=quitter', FR)
  await expect(page).toHaveURL(/\/moi\?sheet=depart$/)
  await expect(page.locator('.sheet')).toContainText('Aucun effet immédiat')
})
