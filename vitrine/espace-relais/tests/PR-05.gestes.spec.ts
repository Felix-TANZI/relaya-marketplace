// Gestes du guichet de retrait (PR-05), refait pour le comptoir : SCAN D'ABORD (sans appareil photo, le gros pavé
// s'ouvre et vérifie au 6e chiffre), fiche du colis avec l'emplacement en grand, garde en espèces par billets et
// monnaie à rendre (R36), photo de remise puis « Remis », PIN vérifié au dernier chiffre (ARL-42) ; retrait par un
// tiers selon R89 (nom et numéro) ; contestation, renonciation et refus sans motif en feuilles ; paiement Mobile Money
// au comptoir (R42) ; hors ligne (ARL-03) ; feuilles de cas. Le code du client n'est jamais vu : il est « présenté »
// par la démonstration.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

/** Texte à chercher, espaces typographiques comprises (t() pose des espaces insécables devant « : », dans « 1 000 F »). */
const tx = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s'))

const PIN = '240913'
const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
const RENDU = { nom: 'clair', theme: 'light' as const, lang: 'fr' as const }

async function sansAppareil(page: Page) {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices
    if (md) Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
  })
}
/** Le client « présente » son QR (ligne de démonstration), sur l'écran ou dans la feuille ouverte. */
async function presenter(page: Page, client: RegExp) {
  const zone = (await page.getByRole('dialog').count()) ? page.getByRole('dialog') : page.locator('main')
  const demo = zone.getByText(/Démonstration\s:\sle client présente son QR/)
  const details = zone.locator('details', { hasText: /Démonstration\s:\sle client présente son QR/ })
  if (!(await details.getAttribute('open').then((x) => x !== null))) await demo.click()
  await zone.getByRole('button', { name: client }).first().click()
}
/** Gros pavé : un chiffre par toucher, vérification au dernier (sans bouton « Valider »). */
async function taper(page: Page, chiffres: string) {
  const zone = (await page.getByRole('dialog').count()) ? page.getByRole('dialog') : page.locator('main')
  for (const k of chiffres) await zone.getByRole('button', { name: k, exact: true }).click()
}
async function remettre(page: Page, pin = PIN) {
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await expect(page.getByText('Photo du colis remis · prise')).toBeVisible()
  await page.getByRole('button', { name: 'Remis', exact: true }).click()
  await expect(page).toHaveURL(/pin-remise\?remise=/)
  await taper(page, pin)
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await sansAppareil(page)
})

test('scan d’abord : sans appareil photo le pavé s’ouvre ; code faux vérifié au 6e chiffre, sans bouton Valider', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await expect(page.getByText(tx('Appareil photo indisponible : tapez le code.'))).toBeVisible()
  await expect(page.getByRole('button', { name: 'Valider' })).toHaveCount(0)
  await taper(page, '12345')
  await expect(page.getByText(tx('Code incorrect'))).toHaveCount(0)
  await taper(page, '6')
  await expect(page.getByText(tx('Code incorrect · encore 2 essais'))).toBeVisible()
  await page.getByRole('button', { name: 'Ressaisir le code' }).click()
  await expect(page.getByText(tx('Code incorrect'))).toHaveCount(0)
})

test('remise en deux touchers : fiche (emplacement en grand), billets et monnaie, photo, « Remis », PIN, colis retiré', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /Mireille A\./)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await expect(page.locator('.cpt-emp-v')).toHaveText('A-03')
  const remis = page.getByRole('button', { name: 'Remis', exact: true })
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await expect(remis).toBeDisabled() // garde à encaisser d'abord (R36)
  await expect(page.getByText('Encaissez d’abord la garde.')).toBeVisible()
  // Garde : arrivé vendredi 9 à 12 h 10, 98 h plus tard : jour 5 (tranches de 24 h, R37), 500 F ; le client donne
  // un billet de 1 000 F : 500 F à rendre, en grand.
  await expect(page.locator('.cpt-garde-m')).toHaveText(tx('500 F'))
  await expect(page.getByText('Jour 5 de garde')).toBeVisible()
  await page.getByText('Détail des jours').click()
  await expect(page.getByText('1er jour · ven. 9')).toBeVisible()
  await expect(page.getByText(/relais fermé/)).toHaveCount(0) // un dimanche fermé chaque semaine n'arrête pas le compteur (R37)
  await page.getByRole('button', { name: tx('Reçu un billet de 1 000 F') }).click()
  await expect(page.locator('.cpt-monnaie-m')).toHaveText(tx('500 F'))
  await page.getByRole('button', { name: tx('Encaissé · rendre 500 F') }).click()
  await expect(page.getByText(tx('Garde 500 F encaissée · RM'))).toBeVisible()
  // « Tout est en ordre » part d'elle-même dans l'application du client ; elle ne bloque rien (DP-28).
  await expect(page.getByText(tx('Le client a confirmé : tout est en ordre'))).toBeVisible({ timeout: 10_000 })
  await expect(remis).toBeEnabled()
  await remis.click()
  await taper(page, PIN)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect(page.getByText(tx('A-03 est libre'))).toBeVisible()
  await expect(page.getByText(/Vous\stouchez\s200\sF\s\+\s\d+\sF\sde\sgarde/)).toBeVisible()
  await page.getByRole('button', { name: 'Retrait suivant' }).click()
  await expect(page.getByText('Code de retrait présenté par le client')).toBeVisible()
})

test('garde : il manque de l’argent, le bouton le dit ; « Compte juste » encaisse d’un toucher', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /Estelle M\./)
  await expect(page.locator('.cpt-garde-m')).toHaveText(tx('500 F'))
  await page.getByRole('button', { name: tx('Reçu un billet de 500 F') }).click()
  await expect(page.locator('.cpt-monnaie-m')).toHaveText(tx('0 F'))
  await page.getByRole('button', { name: 'Effacer' }).click()
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await expect(page.getByText(tx('Garde 500 F encaissée'))).toBeVisible()
})

test('retrait par un tiers (R89) : nom et numéro, client averti ; ni pièce ni plafond', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /Patrice M\./)
  await expect(page.locator('.cpt-emp-v')).toBeVisible()
  const juste = page.getByRole('button', { name: 'Compte juste' })
  if (await juste.count()) await juste.click()
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await page.getByText('Quelqu’un vient à sa place').click()
  const remis = page.getByRole('button', { name: 'Remis', exact: true })
  await expect(remis).toBeDisabled()
  await expect(page.getByText(/pièce d’identité/i)).toHaveCount(0)
  await page.getByLabel('Nom de la personne').fill('Aïcha N.')
  await expect(remis).toBeDisabled()
  await page.getByLabel('Son numéro').fill('677 12 34 56')
  await remis.click()
  await taper(page, PIN)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect(page.getByText('Le client est averti dans son application.')).toBeVisible()
})

test('plusieurs colis d’un client : un code chacun, le suivant se scanne dans une feuille, 2 colis retirés', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /BLV-00007-1/)
  await page.getByRole('button', { name: /1 autre colis pour ce client/ }).click()
  await presenter(page, /BLV-00007-2/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await expect(page.locator('.cpt-emp-v')).toBeVisible()
  const juste = page.getByRole('button', { name: 'Compte juste' })
  if (await juste.count()) await juste.click()
  await remettre(page)
  await expect(page.getByText('2 colis retirés')).toBeVisible()
})

test('garde + paiement Mobile Money au comptoir (R42) : feuille de recherche, demande, webhook, code présenté', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await page.getByRole('button', { name: 'À payer au comptoir' }).click()
  await page.getByLabel('RÉFÉRENCE OU NUMÉRO DU CLIENT').fill('691 22 03 18')
  await page.getByRole('button', { name: 'Rechercher' }).click()
  await expect(page.getByText('691')).toHaveCount(0) // le numéro n'est jamais affiché (PR-RC-11)
  await expect(page.getByText(tx('Articles : 18 000 F en Mobile Money'))).toBeVisible()
  await page.getByRole('button', { name: 'Envoyer la demande de paiement' }).click()
  await expect(page.getByText(tx('Demande envoyée · MTN MoMo · en attente'))).toBeVisible()
  await expect(page.getByText(tx('Articles payés par Mobile Money · CP-'))).toBeVisible({ timeout: 12_000 })
  await page.getByRole('button', { name: /Scanner le code du colis qui manque/ }).click()
  await presenter(page, /Franck O\./)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await expect(page.locator('.cpt-emp-v')).toBeVisible()
  const juste = page.getByRole('button', { name: 'Compte juste' })
  if (await juste.count()) await juste.click()
  await remettre(page)
  await expect(page.getByText('Colis retiré')).toBeVisible()
})

test('commande à payer refusée sans motif : feuille, PIN au pavé, commande annulée (DP-24)', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await page.getByRole('button', { name: 'À payer au comptoir' }).click()
  await page.getByLabel('RÉFÉRENCE OU NUMÉRO DU CLIENT').fill('BLV-00032')
  await page.getByRole('button', { name: 'Rechercher' }).click()
  await page.getByRole('button', { name: 'Refus sans motif' }).click()
  await taper(page, '111111')
  await expect(page.getByRole('alert').filter({ hasText: 'PIN incorrect' })).toBeVisible()
  await taper(page, PIN)
  await expect(page.getByText('Commande refusée et annulée')).toBeVisible()
})

test('« Le client conteste » : feuille, motif, déballage photographié, PIN ; pas de remise', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /Nadège E\./)
  await page.getByRole('button', { name: 'Le client conteste' }).click()
  const f = page.getByRole('dialog')
  await f.getByRole('radio', { name: 'Abîmé' }).click()
  await f.locator('input[type=file]').setInputFiles([PHOTO, { ...PHOTO, name: 'b.png' }])
  await expect(f.getByText('Déballage · 2 sur 2')).toBeVisible()
  await taper(page, PIN)
  await expect(page.getByText(tx('Constat ouvert : pas de remise'))).toBeVisible()
  await expect(page.getByRole('link', { name: /Voir le dossier CS-/ })).toBeVisible()
})

test('3 PIN faux pendant une remise : annulée, colis en stock, espèces rendues', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await presenter(page, /Estelle M\./)
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await remettre(page, '000000')
  await expect(page.getByText('PIN incorrect · encore 2 essais')).toBeVisible()
  await taper(page, '000000')
  await expect(page.getByText('PIN incorrect · dernier essai avant l’annulation')).toBeVisible()
  await taper(page, '000000')
  await expect(page.getByText(tx('Remise annulée : PIN faux'))).toBeVisible()
  await expect(page.getByText(tx('Rendez 500 F au client.'))).toBeVisible()
})

test('hors ligne : remise avec garde seule permise (en file) ; feuille coupure ; paiement Mobile Money refusé', async ({ page, context }) => {
  await ouvrir(page, '#retrait', RENDU)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Réseau ou courant coupé' }).click()
  await expect(page.getByRole('dialog').getByText(tx('Hors connexion : vous pouvez continuer'))).toBeVisible()
  await expect(page.getByRole('dialog').getByText(/scan marche sans réseau/)).toBeVisible()
  await page.keyboard.press('Escape')
  await presenter(page, /Yannick D\./)
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await remettre(page)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect(page.getByText(tx('opérations en attente d’envoi'))).toBeVisible()
  await page.getByRole('button', { name: 'Retrait suivant' }).click()
  await page.getByRole('button', { name: 'À payer au comptoir' }).click()
  await page.getByLabel('RÉFÉRENCE OU NUMÉRO DU CLIENT').fill('BLV-00038')
  await page.getByRole('button', { name: 'Rechercher' }).click()
  await expect(page.getByText('Réseau nécessaire pour le paiement Mobile Money').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Envoyer la demande de paiement' })).toHaveCount(0)
  await context.setOffline(false)
})

test('feuilles de cas : code oublié, colis introuvable, fermeture imprévue (R37) ; retour déposé en pastille', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await page.getByRole('button', { name: 'Code oublié ou pas de téléphone' }).click()
  await expect(page.getByRole('dialog').getByText(/Sans code\s:\spas de remise/)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Colis introuvable' }).click()
  await expect(page.getByRole('dialog').getByText(/ne remettez jamais un autre colis/)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Je dois fermer' }).click()
  await expect(page.getByRole('dialog').getByText(/la garde s’arrête et la date de renvoi recule/)).toBeVisible()
  await page.getByRole('link', { name: 'Déclarer une fermeture' }).click()
  await expect(page).toHaveURL(/\/fermeture/)
  await page.goto('retrait')
  await expect(page.getByRole('link', { name: 'Retour déposé' })).toHaveAttribute('href', /litiges\?onglet=retour/)
})

test('PIN de remise sans remise prête : renvoie au retrait ; écran des erreurs : chaque cas a son action', async ({ page }) => {
  await ouvrir(page, '#pin-remise', RENDU)
  await expect(page.getByRole('heading', { name: 'Aucune remise à signer' })).toBeVisible()
  await page.getByRole('link', { name: 'Aller au retrait' }).click()
  await expect(page).toHaveURL(/\/retrait$/)
  await page.goto('erreurs')
  for (const [cas, titre] of [
    ['Colis bloqué', 'Colis bloqué 24 h'],
    ['Paiement', 'Paiement non abouti'],
    ['Mauvais QR', 'Ce colis n’est pas pour votre relais'],
    ['Sans réseau', 'Réseau nécessaire pour le paiement Mobile Money'],
    ['Non remettable', 'Ce colis ne peut pas être remis'],
    ['PIN faux', 'Remise annulée : PIN faux'],
  ]) {
    await page.getByRole('button', { name: cas, exact: true }).click()
    await expect(page.getByText(titre, { exact: true })).toBeVisible()
  }
})

test('employé de comptoir : il encaisse et remet, sans voir la rémunération (ARL-06, PR-RC-09)', async ({ page }) => {
  await ouvrir(page, '#retrait?demo=employe', RENDU)
  await presenter(page, /Mireille A\./)
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await expect(page.getByText(tx('encaissée · PE'))).toBeVisible()
  await remettre(page)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect(page.getByText(tx('Vous touchez'))).toHaveCount(0)
})

// VAGUE n° 7 : la file du comptoir — clients attendus (sans nom), colis dans l'ordre des étagères, scan rapide.
for (const r of [RENDU, { nom: 'sombre', theme: 'dark' as const, lang: 'fr' as const }])
  test(`file du comptoir : colis prêts par étagère, dans l’ordre, scan rapide · ${r.nom}`, async ({ page }) => {
    await figerHorloge(page)
    await ouvrir(page, 'retrait', r)
    await page.getByRole('link', { name: 'File du comptoir' }).click()
    await expect(page).toHaveURL(/\/relais\/file$/)
    await expect(page.getByRole('heading', { name: 'File du comptoir' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Étagère A/ })).toBeVisible()
    // Étagères dans l'ordre (lettre, puis numéro).
    const cases = (await page.locator('.r5f-case').allTextContents()).filter((x) => /^[A-Z]-\d+/.test(x))
    const cle = (x: string) => [x.split('-')[0], Number(x.split('-')[1])] as const
    expect(cases).toEqual([...cases].sort((a, b) => cle(a)[0].localeCompare(cle(b)[0]) || cle(a)[1] - cle(b)[1]))
    // Jamais le nom d'un client : la référence de sa commande.
    await expect(page.locator('.r5f-t-l b').first()).toHaveText(/^BLV-\d+/)
    // Scan rapide : le code tapé par la douchette ouvre le retrait et le vérifie.
    await page.getByLabel('Scan rapide').fill('000000')
    await page.getByLabel('Scan rapide').press('Enter')
    await expect(page).toHaveURL(/retrait\?scan=000000/)
  })
