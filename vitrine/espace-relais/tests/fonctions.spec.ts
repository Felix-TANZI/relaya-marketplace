// Fonctions du point relais vérifiées de bout en bout (logique-metier/relais/CONTROLE-FONCTIONS.md) : ce que les
// tests de groupe (PR-xx.gestes) ne couvraient pas encore — session expirée et PIN faux à la reprise, photo de profil
// changée puis visible partout (recadrage, refus d'un fichier qui n'est pas une image, retrait), numéro masqué,
// horaires modifiés, acceptés par BelivaY puis affichés partout (pastille d'ouverture, carte de zone), carte de la zone
// du relais (douze zones de Yaoundé, zone du relais, position, quartiers, ville entière), fermetures à venir, employé.
import { expect, test, type Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const main = '#app main'
const feuille = '.sheet'
const PIN = '240913' // src/demo/jeu-essai.ts

// Une vraie image PNG de 4 × 2 px (paysage : le recadrage carré en garde le centre), écrite ici.
function png(l: number, h: number): Buffer {
  const crc = (b: Buffer) => {
    let c = ~0
    for (const x of b) {
      c ^= x
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
    return ~c >>> 0
  }
  const bloc = (type: string, data: Buffer) => {
    const t = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const n = Buffer.alloc(4)
    n.writeUInt32BE(data.length)
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(t))
    return Buffer.concat([n, t, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(l, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 2, 0, 0, 0], 8) // 8 bits, RVB
  const lignes = Buffer.concat(Array.from({ length: h }, (_, y) => Buffer.from([0, ...Array.from({ length: l }, (_, x) => [x * 60, y * 120, 200]).flat()])))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('IDAT', deflateSync(lignes)), bloc('IEND', Buffer.alloc(0))])
}
const PNG = png(4, 2)

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

const taper = async (page: Page, v: string) => {
  await page.keyboard.type(v)
  await page.waitForTimeout(250)
}

test('session expirée : PIN demandé avec la raison, PIN faux compté, PIN juste rouvre la page demandée', async ({ page }) => {
  await ouvrir(page, '#stock?demo=session_expiree', FR)
  await expect(page).toHaveURL(/\/connexion\?next=/)
  await expect(page.getByText(/Session\sfermée\s:\sl’application\sn’a\spas\sété\souverte\sdepuis\splus\sde\s30\sjours/)).toBeVisible()
  await expect(page.getByText('Bonjour Rose')).toBeVisible()
  await expect(page.getByText(/6 •• •• •3 10/)).toBeVisible()
  await taper(page, '999999')
  await expect(page.getByText(/PIN\sincorrect\s:\sil\sreste\s4\sessai/)).toBeVisible()
  await taper(page, PIN)
  await expect(page).toHaveURL(/\/relais\/stock/)
  // La session est reprise : la page suivante ne redemande rien.
  await page.goto('menu')
  await expect(page.locator(main)).toContainText('Rose Mbarga, gérant')
})

test('photo de profil : image choisie, recadrée, enregistrée, visible partout ; fichier refusé ; retirée', async ({ page }) => {
  await ouvrir(page, '#parametres', FR)
  await expect(page.locator(main)).toContainText('+237 6 •• •• •3 10')
  await page.getByRole('button', { name: 'Ajouter une photo de profil' }).click()
  await expect(page.locator(feuille).getByRole('heading', { name: 'Photo de profil' }).first()).toBeVisible()
  // Un fichier qui n'est pas une image est refusé avec sa raison.
  await page.locator('[data-test=photo-galerie]').setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('bonjour') })
  await expect(page.locator(feuille)).toContainText('Ce fichier n’est pas une image')
  await page.locator('[data-test=photo-galerie]').setInputFiles({ name: 'moi.png', mimeType: 'image/png', buffer: PNG })
  const cadre = page.getByRole('img', { name: /Recadrage de la photo/ })
  await expect(cadre).toBeVisible()
  // Zoom au curseur, déplacement au clavier : l'image reste bornée au cadre.
  await page.locator(feuille).getByLabel('ZOOM', { exact: true }).fill('2')
  await expect(cadre).toHaveAttribute('data-zoom', '2.00')
  await cadre.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(cadre).toHaveAttribute('data-x', '12')
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowLeft')
  await expect(cadre).toHaveAttribute('data-x', '360') // image de 960 × 480 au zoom 2 : (960 − 240) / 2, bord contre bord
  await page.getByRole('button', { name: 'Enregistrer la photo' }).click()
  await expect(page.locator(feuille)).toHaveCount(0)
  await expect(page.locator(main)).toContainText('Photo de profil enregistrée.')
  const avatar = page.getByRole('button', { name: 'Changer la photo de profil' }).locator('img')
  await expect(avatar).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  // Visible dans l'en-tête, le Menu et Mon équipe, et gardée après rechargement.
  await page.goto('./')
  await expect(page.locator('.p-hd-avatar img')).toHaveAttribute('src', /^data:image\/jpeg/)
  await page.goto('menu')
  await expect(page.locator('.p-jb3jyo img')).toHaveAttribute('src', /^data:image\/jpeg/)
  await page.goto('equipe')
  await expect(page.getByRole('region', { name: 'Rose Mbarga' }).locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
  // Retirer : les initiales reviennent.
  await page.goto('parametres')
  await page.getByRole('button', { name: 'Changer la photo de profil' }).click()
  await page.locator(feuille).getByRole('button', { name: 'Retirer la photo' }).click()
  await expect(page.locator(main)).toContainText('Photo retirée : vos initiales s’affichent.')
  await expect(page.getByRole('button', { name: 'Ajouter une photo de profil' })).toContainText('RM')
})

test('photo de profil de l’employé : il change la sienne, depuis ses paramètres', async ({ page }) => {
  await ouvrir(page, '#parametres?demo=employe', FR)
  await page.getByRole('button', { name: 'Ajouter une photo de profil' }).click()
  await page.locator('[data-test=photo-camera]').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Enregistrer la photo' }).click()
  await expect(page.getByRole('button', { name: 'Changer la photo de profil' }).locator('img')).toBeVisible()
  await page.goto('./')
  await expect(page.locator('.p-hd-avatar img')).toBeVisible()
})

test('horaires : fermer plus tôt aujourd’hui, accord de BelivaY, relais affiché fermé partout', async ({ page }) => {
  await ouvrir(page, '#', FR)
  await expect(page.locator('.p-hd-pastilles')).toContainText('Ouvert · 19 h')
  await page.goto('capacite')
  await page.getByRole('button', { name: /^Mardi : 08 h – 19 h, changer/ }).click()
  await page.locator(feuille).getByLabel('FERMETURE').fill('14:00')
  await page.locator(feuille).getByRole('button', { name: 'Garder ces heures' }).click()
  await page.getByRole('button', { name: 'Demander ces changements' }).click()
  await expect(page.locator(main)).toContainText('Nouveaux horaires demandés le')
  // Tant que BelivaY n'a pas répondu, les horaires en vigueur restent (le relais est encore ouvert).
  await page.goto('zone')
  await expect(page.locator('.p10-semaine li[aria-current=date]')).toContainText('08 h – 19 h')
  await expect(page.locator(main)).toContainText('ceux-ci restent en vigueur jusqu’à l’accord de BelivaY')
  await page.goto('capacite')
  await page.getByRole('button', { name: 'Démonstration : BelivaY accepte les horaires' }).click()
  await expect(page.locator(main)).toContainText('BelivaY a accepté vos nouveaux horaires')
  await expect(page.locator(main)).not.toContainText('Nouveaux horaires demandés le')
  // Mardi 14 h 05 : fermé depuis 14 h ; la pastille de l'en-tête, la carte de zone et la notification le disent.
  await page.goto('./')
  await expect(page.locator('.p-hd-pastilles')).toContainText('Fermé · rouvre')
  await page.goto('zone')
  await expect(page.locator('.p10-semaine li[aria-current=date]')).toContainText('08 h – 14 h')
  await expect(page.locator(main)).toContainText('Fermé maintenant · rouvre')
  await page.goto('notifications')
  await expect(page.locator(main)).toContainText('Demande acceptée par BelivaY')
})

test('places : une hausse acceptée par BelivaY devient les places déclarées de l’en-tête', async ({ page }) => {
  await ouvrir(page, '#capacite', FR)
  await page.getByRole('button', { name: 'Ajouter une place' }).click()
  await page.getByRole('button', { name: 'Demander ces changements' }).click()
  await page.getByRole('button', { name: 'Démonstration : BelivaY accepte les places' }).click()
  await expect(page.locator(main)).toContainText('BelivaY a accepté vos nouvelles places.')
  await page.goto('./')
  await expect(page.locator('.p-hd-pastilles')).toContainText('/ 61 places')
})

test('carte de zone : douze zones, zone du relais, position, quartiers ; vue de la ville ; plan sans réseau', async ({ page }) => {
  await ouvrir(page, '#parametres', FR)
  await page.getByRole('link', { name: /Ma zone sur la carte/ }).click()
  await expect(page).toHaveURL(/\/zone/)
  const carte = page.getByRole('img', { name: 'Carte de Yaoundé : zone Z1 Centre-ville et position du relais Relais Bastos Carrefour' })
  await expect(carte).toBeVisible()
  await expect(carte.locator('path[data-zone]')).toHaveCount(12)
  await expect(carte.locator('path.p10-zone-relais')).toHaveAttribute('data-zone', 'Z1')
  await expect(carte.locator('[data-test=relais-pin]')).toBeVisible()
  await expect(carte).toContainText('Votre relais')
  await expect(carte).toContainText('Z1 · Centre-ville')
  // Navigateur piloté : le plan schématique (jamais de tuiles OSM demandées par les tests).
  await expect(carte).toHaveAttribute('data-fond', 'plan')
  await expect(page.locator(main)).toContainText('Plan des zones BelivaY')
  // Quartiers de Z1 selon la carte du 23 oct. 2026 (DP-70 : Etoudi passe en Z1, Tsinga en Z3).
  for (const q of ['Bastos', 'Nlongkak', 'Etoa-Meki', 'Mballa', 'Etoudi']) await expect(page.locator('.p10-quartiers')).toContainText(q)
  await expect(page.locator('.p10-quartiers')).not.toContainText('Tsinga')
  await expect(page.locator(main)).toContainText('Z1 · Centre-ville / Mballa')
  await expect(page.locator(main)).toContainText('17,8 km²') // Z1 de la carte du 23 oct. 2026
  await expect(page.locator(main)).toContainText('3.89512, 11.51158')
  await expect(page.getByRole('link', { name: 'Ouvrir dans OpenStreetMap' })).toHaveAttribute('href', /openstreetmap\.org\/\?mlat=3\.89512&mlon=11\.51158/)
  // Toute la ville : les douze codes sont écrits, la zone du relais reste marquée.
  await page.getByRole('radio', { name: 'Toute la ville' }).click()
  await expect(carte).toHaveAttribute('data-vue', 'ville')
  await expect(carte.locator('text.p10-zone-nom')).toHaveCount(12)
  await page.getByRole('radio', { name: 'Ma zone' }).click()
  await expect(carte).toHaveAttribute('data-vue', 'zone')
  // Horaires en vigueur et fermeture à venir (congé du samedi 24 octobre, jeu d'essai).
  await expect(page.locator('.p10-semaine li')).toHaveCount(7)
  await expect(page.locator('.p10-semaine')).toContainText('Dimanche')
  await expect(page.locator('.p10-semaine li').last()).toContainText('Fermé')
  await expect(page.locator('.p10-semaine li[aria-current=date]')).toContainText('pause 13 h – 13 h 30')
  await expect(page.locator(main)).toContainText('Ouvert maintenant · ferme à 19 h')
  await expect(page.locator(main)).toContainText('Congé')
  await expect(page.locator(main)).toContainText('samedi 24 octobre')
})

test('carte de zone : le Menu y mène ; l’employé la voit sans pouvoir changer les horaires', async ({ page }) => {
  await ouvrir(page, '#menu?demo=employe', FR)
  await page.locator(main).getByRole('link', { name: 'Ma zone sur la carte' }).click()
  await expect(page.getByRole('img', { name: /Carte de Yaoundé/ })).toBeVisible()
  await expect(page.locator(main)).toContainText('Les horaires se changent par le gérant')
  await expect(page.getByRole('link', { name: 'Demander un changement d’horaires' })).toHaveCount(0)
})

test('anglais : carte de zone et photo de profil', async ({ page }) => {
  await ouvrir(page, '#zone', EN)
  await expect(page.getByRole('heading', { name: 'My area on the map' }).first()).toBeVisible()
  await expect(page.locator(main)).toContainText('NEIGHBOURHOODS IN THE AREA')
  await expect(page.locator(main)).toContainText('Open now · closes at 7 pm')
  await page.goto('parametres')
  await page.getByRole('button', { name: 'Add a profile photo' }).click()
  await expect(page.locator(feuille)).toContainText('Choose a picture from the phone')
})
