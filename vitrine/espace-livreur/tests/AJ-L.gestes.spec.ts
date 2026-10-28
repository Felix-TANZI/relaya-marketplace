// Gestes des pages ajoutées (AJ-L) et des pages qui ont repris les besoins des pages retirées ou fusionnées (DP-66) :
// anciennes adresses, sécurité dans les Réglages (changer le PIN, puis l'ouvrir avec le nouveau ; empreinte), planning
// en lecture et absences, relevés dans « Mes gains » (PDF, CSV, semaine précédente), fiches de travail dans l'Aide, ma
// fiche dans Moi, sons et confort dans les Réglages, messages (recherche, tout lu), notifications (puces), historique
// (puces par issue), paquet (code d'un colis, feuille de route), thème sombre.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

async function taper(page: Page, chiffres: string, dans = 'body') {
  for (const c of chiffres) await page.locator(dans).locator('.keypad button', { hasText: new RegExp('^' + c + '$') }).click()
}

// DP-66 : chaque page retirée ou fusionnée garde son adresse, qui mène à la page qui reprend le besoin.
const ANCIENNES: [string, RegExp, string][] = [
  ['#recherche', /\/historique$/, 'Historique'],
  ['#profil', /\/moi$/, 'Véhicule et zones'],
  ['#securite', /\/reglages\?voir=securite$/, 'Dernières connexions'],
  ['#confort', /\/reglages\?voir=confort$/, 'Heures calmes'],
  ['#limites', /\/aide\?sujet=interdits$/, 'Les interdits'],
  ['#apprendre', /\/aide\?sujet=gestes$/, 'Contrôle au ramassage'],
  ['#apprendre?fiche=remise', /\/aide\?geste=remise$/, 'Code de remise du vendeur'],
  ['#gains?semaine=2026-10-09', /\/activite\?vue=releves&semaine=2026-10-09$/, 'Semaines précédentes'],
  ['#kit-suivi', /\/kit\?vue=suivi$/, 'Pochettes abîmées cette semaine'],
]

test('anciennes adresses : chaque page retirée ou fusionnée mène à celle qui reprend le besoin, jamais à une page vide', async ({ page }) => {
  for (const [a, url, texte] of ANCIENNES) {
    await ouvrir(page, a, FR)
    await expect(page, a).toHaveURL(url)
    await expect(page.locator('#app'), a).toContainText(texte)
    await expect(page.getByText('Ce lien ne mène à aucune page')).toHaveCount(0)
  }
  // Plus de recherche globale : ni lien dans le Menu, ni touche « / ».
  await ouvrir(page, '#menu', FR)
  await expect(page.getByRole('link', { name: /Rechercher partout/ })).toHaveCount(0)
  await page.keyboard.press('/')
  await expect(page).toHaveURL(/\/menu$/)
})

test('réglages · sécurité : changer le PIN (erreurs comprises), puis ouvrir l’application avec le nouveau ; empreinte', async ({ page }) => {
  await ouvrir(page, '#reglages?voir=securite', FR)
  await expect(page.locator(main)).toContainText('Infinix Hot 30')
  await expect(page.locator(main)).toContainText('Dernières connexions')
  await page.getByRole('button', { name: /Changer mon code PIN/ }).click()
  const feuille = page.locator('.sheet')
  await expect(feuille).toContainText('Étape 1 sur 3')
  await taper(page, '111111', '.sheet')
  await taper(page, '135790', '.sheet')
  await taper(page, '135790', '.sheet')
  await expect(feuille.getByRole('alert')).toContainText('Ancien code PIN faux')
  await taper(page, '240913', '.sheet')
  await taper(page, '111111', '.sheet')
  await taper(page, '111111', '.sheet')
  await expect(feuille.getByRole('alert')).toContainText('Code trop simple')
  await taper(page, '135790', '.sheet')
  await taper(page, '135791', '.sheet')
  await expect(feuille.getByRole('alert')).toContainText('pas identiques')
  await taper(page, '135790', '.sheet')
  await taper(page, '135790', '.sheet')
  await expect(feuille).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Code PIN changé' })).toBeVisible()
  // Empreinte : activée, puis le PIN reste le moyen d'ouvrir après un verrouillage.
  await page.getByRole('switch', { name: 'Ouvrir avec l’empreinte' }).click()
  await expect(page.getByRole('switch', { name: 'Ouvrir avec l’empreinte' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: /Verrouiller maintenant/ }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await taper(page, '240913')
  await expect(page.getByRole('alert')).toContainText('PIN incorrect')
  await taper(page, '135790')
  await expect(page).toHaveURL(/\/livreur\/?$/)
})

test('planning : en lecture seulement ; prévenir d’une absence, refus d’un chevauchement, retrait ; l’entreprise est prévenue', async ({ page }) => {
  await ouvrir(page, '#planning', FR)
  await expect(page.locator(main)).toContainText('Créneaux du jour')
  await expect(page.locator(main)).toContainText('Horaires prévus')
  // Plus aucune annonce de disponibilité : aucun choix de jour.
  await expect(page.locator(main).getByRole('radio')).toHaveCount(0)
  await expect(page.locator(main)).toContainText('Mes absences prévenues')
  await page.getByRole('button', { name: 'Prévenir d’une absence' }).click()
  const f = page.locator('.sheet')
  await expect(f.getByRole('button', { name: 'Prévenir mon entreprise' })).toBeDisabled()
  await f.locator('#ajl-abs-du').fill('2026-10-15')
  await f.locator('#ajl-abs-au').fill('2026-10-16')
  await f.getByRole('radio', { name: /Démarches/ }).click()
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Absence prévenue du jeudi 15 octobre au vendredi 16 octobre')
  await expect(page.locator(main).locator('.li', { hasText: 'jeudi 15 octobre' }).first()).toContainText('Absence prévenue')
  const envoye = await page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; du?: string }[])
  expect(envoye.some((e) => e.type === 'absence' && e.app === 'livreur' && e.du === '2026-10-15')).toBe(true)
  // Un chevauchement est refusé avec sa raison.
  await page.getByRole('button', { name: 'Prévenir d’une absence' }).click()
  await f.locator('#ajl-abs-du').fill('2026-10-16')
  await f.getByRole('radio', { name: /Autre/ }).click()
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f.getByRole('alert')).toContainText('déjà prévenue')
  await page.keyboard.press('Escape')
  await expect(f).toHaveCount(0)
  // Retirée tant qu'elle n'a pas commencé.
  await page.getByRole('button', { name: /Retirer l’absence du jeudi 15 octobre/ }).click()
  await expect(page.locator(main).locator('.li', { hasText: 'jeudi 15 octobre' }).first()).not.toContainText('Absence prévenue')
})

// DP-67 : absences prévue ou imprévue, quatorze jours au plus, motif de la liste et texte de 120 caractères, hors connexion.
const absences = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; du?: string; motif?: string; texte?: string | null; imprevu?: boolean; apresDebut?: boolean; le: number }[]).filter((e) => e.type === 'absence' && e.app === 'livreur'))

test('absence : imprévu le jour même accepté (marqué après le début du créneau), absence prévue refusée sous 24 h, 15 jours refusés', async ({ page }) => {
  await ouvrir(page, '#planning?sheet=absence', FR)
  const f = page.locator('.sheet')
  await expect(f).toContainText('Absence prévue : au moins 24 h avant votre premier créneau')
  await expect(f).toContainText('14 jours au plus par demande')
  // Demain mercredi, premier créneau à 7 h 30 : moins de 24 h. Des démarches se préviennent plus tôt.
  await f.locator('#ajl-abs-du').fill('2026-10-14')
  await f.getByRole('radio', { name: /Démarches/ }).click()
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f.getByRole('alert')).toContainText('Trop tard pour une absence prévue')
  await expect(f.getByRole('alert')).toContainText('voyez avec votre entreprise')
  // Quinze jours : refusés, voir avec l'entreprise.
  await f.locator('#ajl-abs-du').fill('2026-10-20')
  await f.locator('#ajl-abs-au').fill('2026-11-03')
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f.getByRole('alert')).toContainText('Plus de 14 jours : voyez avec votre entreprise.')
  // Une panne de moto demain : imprévu, prévenu avant le premier créneau, sans pénalité ; texte facultatif compté.
  await f.locator('#ajl-abs-du').fill('2026-10-14')
  await f.locator('#ajl-abs-au').fill('')
  await f.getByRole('radio', { name: /Panne de moto/ }).click()
  await expect(f.locator('#ajl-abs-texte')).toHaveAttribute('maxlength', '120')
  await f.locator('#ajl-abs-texte').fill('Embrayage cassé, garage demain matin.')
  await expect(f).toContainText('37 / 120 caractères')
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Absence prévenue' })).toContainText('Absence prévenue mercredi 14 octobre')
  let l = await absences(page)
  expect(l.at(-1)).toMatchObject({ du: '2026-10-14', motif: 'panne_moto', texte: 'Embrayage cassé, garage demain matin.', imprevu: true, apresDebut: false })
  // Malade aujourd'hui, après le début du créneau (7 h 30) : acceptée, marquée pour l'entreprise.
  await page.getByRole('button', { name: 'Prévenir d’une absence' }).click()
  await f.getByRole('radio', { name: /Maladie/ }).click()
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f).toHaveCount(0)
  await expect(page.locator(main)).toContainText('Prévenue après le début du créneau')
  l = await absences(page)
  expect(l.at(-1)).toMatchObject({ du: '2026-10-13', motif: 'maladie', texte: null, imprevu: true, apresDebut: true })
})

test('absence hors connexion : mise en file, datée à la saisie, envoyée au retour du réseau', async ({ page, context }) => {
  await ouvrir(page, '#planning', FR)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Prévenir d’une absence' }).click()
  const f = page.locator('.sheet')
  await expect(f).toContainText('Sans réseau : votre demande part au retour du réseau, datée de maintenant.')
  await f.locator('#ajl-abs-du').fill('2026-10-14')
  await f.getByRole('radio', { name: /Deuil ou famille/ }).click()
  await f.getByRole('button', { name: 'Prévenir mon entreprise' }).click()
  await expect(f).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Absence enregistrée' })).toContainText('au retour du réseau, datée de 14 h 05')
  await expect(page.locator(main)).toContainText('1 absence en attente d’envoi')
  expect(await absences(page)).toHaveLength(0)
  await context.setOffline(false)
  await expect.poll(async () => (await absences(page)).length, { timeout: 8000 }).toBe(1)
  const [a] = await absences(page)
  expect(a).toMatchObject({ du: '2026-10-14', motif: 'deuil_famille', imprevu: true, apresDebut: false })
  expect(a.le).toBe(Date.parse('2026-10-13T13:05:00.500Z'))
  await expect(page.locator(main).locator('.li', { hasText: 'mercredi 14 octobre' }).first()).toContainText('Absence prévenue')
})

test('mes gains · relevés : onglet des relevés, PDF et CSV téléchargés, semaine précédente', async ({ page }) => {
  await ouvrir(page, '#activite', FR)
  await page.getByRole('tab', { name: 'Relevés' }).click()
  await expect(page).toHaveURL(/vue=releves/)
  await expect(page.locator(main)).toContainText('Semaine en cours')
  await expect(page.locator(main)).toContainText('BelivaY ne vous paie jamais')
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Relevé en PDF' }).click()
  expect((await pdf).suggestedFilename()).toMatch(/^releve-2026-10-10-2026-10-16\.pdf$/)
  const csv = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tableau CSV' }).click()
  expect((await csv).suggestedFilename()).toMatch(/\.csv$/)
  await page.getByRole('button', { name: /du samedi 3 octobre au vendredi 9 octobre/ }).click()
  await expect(page).toHaveURL(/semaine=2026-10-09/)
  await expect(page.locator(main).locator('.sec').first()).toContainText('Semaine')
  // Retour aux compteurs du jour : un seul onglet à la fois.
  await page.getByRole('tab', { name: 'Jour' }).click()
  await expect(page).not.toHaveURL(/vue=releves/)
  await expect(page.locator(main)).toContainText('Missions validées par type')
})

test('aide · fiches de travail : liste, fiche aux nombres du serveur, fiche suivante ; cherchées avec les autres fiches', async ({ page }) => {
  await ouvrir(page, '#aide', FR)
  await page.getByRole('link', { name: /Fiches de travail/ }).click()
  await expect(page).toHaveURL(/sujet=gestes/)
  await page.getByRole('link', { name: /Code de remise du vendeur/ }).click()
  await expect(page).toHaveURL(/geste=remise/)
  await expect(page.locator(main)).toContainText(/\d+\s*essais, puis blocage de \d+\s*h/)
  await expect(page.locator(main)).not.toContainText('{')
  await page.getByRole('link', { name: /Fiche suivante/ }).click()
  await expect(page).toHaveURL(/geste=domicile/)
  await ouvrir(page, '#aide', FR)
  await page.getByRole('searchbox', { name: 'Rechercher une fiche' }).fill('scellé')
  await expect(page.locator(main).getByRole('link', { name: /Emballage, étiquette et scellé/ })).toBeVisible()
})

test('moi · ma fiche : identité en lecture, « Qui voit ma fiche ? », pièces à jour non renvoyables, ordre de « Mon espace »', async ({ page }) => {
  await ouvrir(page, '#moi', FR)
  await expect(page.locator('main .hero.night')).toContainText('+237 6 77 •• •• 27')
  const qui = page.getByRole('button', { name: 'Qui voit ma fiche ?' })
  await qui.click()
  await expect(qui).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator(main)).toContainText('Vendeurs et gérants de relais')
  // Une pièce à jour et non demandée ne se renvoie pas (DP-66) ; la photo non plus.
  await expect(page.getByRole('button', { name: /Mettre à jour : Carte nationale/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Mettre à jour : Selfie/ })).toHaveCount(0)
  await expect(page.getByText('Changer la photo')).toHaveCount(0)
  await expect(page.locator('main .livc-menu a .mt')).toHaveText(['Mes gains', 'Mon score', 'Mes preuves', 'Prévenir d’une absence', 'Aide et SOS', 'Mon compte', 'Réglages'])
  const bas = page.locator(main).locator('.card.tight').last().locator('.li')
  await expect(bas.last()).toContainText('Demander à quitter')
})

test('réglages · sons et confort : heures calmes gardées, notification d’essai, gains masqués ; les notifications y mènent', async ({ page }) => {
  await ouvrir(page, '#notifications', FR)
  await page.getByRole('link', { name: /Heures calmes et notification d’essai/ }).click()
  await expect(page).toHaveURL(/\/reglages\?voir=confort$/)
  await page.getByRole('switch', { name: 'Heures calmes' }).click()
  await page.getByRole('switch', { name: 'Masquer mes gains' }).click()
  await page.getByRole('button', { name: 'Recevoir une notification d’essai' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Essai envoyé' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Heures calmes' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('switch', { name: 'Masquer mes gains' })).toHaveAttribute('aria-checked', 'true')
})

test('messages : recherche dans les fils, tout marquer comme lu ; notifications : puces par type', async ({ page }) => {
  await ouvrir(page, '#messages', FR)
  await page.getByRole('searchbox', { name: 'Chercher dans les messages' }).fill('zzzz')
  await expect(page.locator(main)).toContainText('Aucun fil ici')
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  const toutLu = page.getByRole('button', { name: /Tout marquer comme lu/ })
  await expect(toutLu).toBeVisible()
  await toutLu.click()
  await expect(toutLu).toHaveCount(0)
  await expect(page.locator('nav.dock .tab', { hasText: 'Messages' }).locator('.bdg')).toHaveCount(0)
  await ouvrir(page, '#notifications', FR)
  await page.getByRole('button', { name: /^Tournée/ }).click()
  await expect(page.locator(main).locator('.livc-prio')).toHaveCount(1)
  await expect(page.locator(main).locator('.livc-prio')).toContainText('Tournée')
  await page.getByRole('button', { name: /^Non lues/ }).click()
  await expect(page.getByRole('button', { name: /^Non lues/ })).toHaveAttribute('aria-pressed', 'true')
})

test('historique : puces par issue ; paquet : colis retrouvé par son code, feuille de route en PDF', async ({ page }) => {
  await ouvrir(page, '#historique?periode=30', FR)
  await page.getByRole('button', { name: /^Dossier ouvert/ }).click()
  await expect(page).toHaveURL(/issue=dossier/)
  await expect(page.locator(main).locator('.l9-m, .li').first()).toBeVisible()
  await ouvrir(page, '#paquet?id=PQ-Z1-261013-003', FR)
  const champ = page.getByRole('searchbox', { name: 'Retrouver un colis par son code' })
  await champ.fill('BLV')
  await expect(page.locator(main)).toContainText(/Classe \w+ · arrêt \d/)
  await champ.fill('zzz')
  await expect(page.locator(main)).toContainText('Aucun colis de ce paquet ne porte ce code.')
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Feuille de route en PDF' }).click()
  expect((await pdf).suggestedFilename()).toBe('feuille-de-route-PQ-Z1-261013-003.pdf')
})

test('thème sombre graphite : fond neutre quasi noir, vert seulement en accent (bouton principal)', async ({ page }) => {
  await ouvrir(page, '#aujourdhui', { nom: 'sombre', theme: 'dark', lang: 'fr' })
  const c = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    const b = document.querySelector('.hero .btn.primary') as HTMLElement | null
    return { fond: s.backgroundColor, bouton: b ? getComputedStyle(b).backgroundColor : null }
  })
  expect(c.fond).toBe('rgb(15, 17, 16)')
  expect(c.bouton).toBe('rgb(47, 181, 127)')
})
