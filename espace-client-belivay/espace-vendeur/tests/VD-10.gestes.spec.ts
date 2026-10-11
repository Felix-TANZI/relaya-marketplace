// Gestes des écrans VD-10 (Trust Score, paliers, croissance) : chaque geste écrit dans la source de démonstration
// (gardée sur l'appareil) et l'écran suit ; les montants viennent des calculs (src/calculs), jamais écrits.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const main = '#app main'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('VD-10 · Mon palier', () => {
  test('où j’en suis : palier, score arrondi, prochain geste en commandes, gain en francs calculé', async ({ page }) => {
    await ouvrir(page, '#palier', FR)
    const nuit = page.locator('.hero.night')
    await expect(nuit).toContainText('Bronze')
    await expect(nuit.locator('.big')).toHaveText('63')
    await expect(nuit).toContainText('Argent à 65')
    await expect(nuit).toContainText('Plus que 3 commandes livrées sans incident pour passer Argent.')
    await expect(nuit).toContainText('Vous garderez alors 324 F de plus par ITEL.')
    await expect(page.locator(main)).toContainText('Trois conditions, à tenir 14 jours.')
    await expect(page.locator(main)).toContainText('+ 2')
    await expect(page.locator(main)).toContainText('acquis')
    await expect(page.locator(main)).toContainText('18 164 F')
    await expect(page.locator(main)).toContainText('1 554 F de plus')
    await page.getByText('Pourquoi 3 commandes ?').click()
    // Les deux issues projetées des litiges en cours.
    await expect(page.locator(main)).toContainText(/Vos\s3\slitiges\sen\scours\sne\scomptent\squ’une\sfois\stranchés\.\sGagnés,\svotre\sscore\sserait\sde\s64\s;\sperdus,\sde\s55\./)
    await page.getByText('Comment ça marche').click()
    await expect(page.locator(main)).toContainText('si le score reste sous le seuil de votre palier 14 jours de suite')
    await expect(page.locator(main)).not.toContainText('seuil moins 5')
    await nuit.getByText('Voir mes commandes à préparer').click()
    await expect(page).toHaveURL(/\/commandes$/)
  })

  // Litiges en cours : les seuls non tranchés (BLV-00005, 00006, 00017), comme l’écran Gelé.
  test('litiges en cours : les seuls litiges non tranchés, comme l’écran Gelé', async ({ page }) => {
    await ouvrir(page, '#palier', FR)
    await page.getByText('Pourquoi 3 commandes ?').click()
    await expect(page.locator(main)).toContainText('Vos 3 litiges en cours ne comptent qu’une fois tranchés.', { timeout: 3000 })
  })

  test('prochains gestes concrets : le critère qui rapporte le plus d’abord, chacun mène à son écran', async ({ page }) => {
    await ouvrir(page, '#palier', FR)
    const gestes = page.locator('.card', { hasText: 'Vos prochains gestes' })
    await expect(gestes.locator('a.li').first()).toContainText('Satisfaction · 54,5 sur 100')
    await gestes.getByText('Préparez à l’heure les 3 commandes du jour.').click()
    await expect(page).toHaveURL(/\/commandes$/)
  })

  test('descente proposée : note ambre, « Contester » une fois, puis « Contestation envoyée »', async ({ page }) => {
    await ouvrir(page, '#palier?cas=descente', FR)
    await expect(page.locator(main)).toContainText('Descente proposée vers Bronze')
    await page.getByRole('link', { name: 'Contester' }).click()
    await expect(page).toHaveURL(/\/contester\?d=DEC-2026-0919-P&depuis=palier/)
    await page.locator('#vd10-explication').fill('Mon score a baissé à cause de deux litiges encore en cours, pas encore tranchés.')
    await page.getByRole('button', { name: 'Envoyer ma contestation' }).click()
    await expect(page).toHaveURL(/\/palier$/)
    await page.goto('palier?cas=descente')
    await expect(page.locator(main)).toContainText('Contestation envoyée · réponse avant jeudi 24 sept. à 09 h 48')
  })

  test('accès Préparation : aucun montant, même prochain geste', async ({ page }) => {
    await ouvrir(page, '#palier?role=prep', FR)
    await expect(page.locator('.hero.night')).toContainText('Plus que 3 commandes livrées')
    await expect(page.locator(main)).not.toContainText(/\d F\b/)
    await expect(page.locator(main)).toContainText('réservés à Franck Penga, propriétaire')
  })

  test('anglais : Silver, jamais « Money »', async ({ page }) => {
    await ouvrir(page, '#palier', EN)
    await expect(page.locator('.hero.night')).toContainText('Just 3 more orders delivered without incident to move up to Silver.')
    await expect(page.locator('.hero.night')).toContainText('You will then keep 324 F more per ITEL.')
  })
})

test.describe('VD-10 · Mon score', () => {
  test('six critères, « Pourquoi 63 ? » au dixième, journal filtrable qui ouvre la commande', async ({ page }) => {
    await ouvrir(page, '#score', FR)
    await expect(page.locator('.vd10-ring')).toHaveAttribute('aria-label', '63')
    await page.getByText('Pourquoi 63 ?').click()
    await expect(page.locator('table.tbl').first()).toContainText('62,7')
    await expect(page.locator('table.tbl').first()).toContainText('17,4')
    const journal = page.locator('.card', { hasText: 'Ce qui a compté' })
    await journal.getByRole('button', { name: 'Satisfaction' }).click()
    await expect(journal.locator('.li')).toHaveCount(2)
    await expect(journal).toContainText('Avis 5 ★')
    await journal.getByRole('button', { name: 'Tout' }).click()
    await journal.locator('a.li', { hasText: 'BLV-00006' }).first().click()
    await expect(page).toHaveURL(/\/commande\?ref=BLV-00006$/)
  })

  test('anglais : critères et barème traduits, aucun code g1/g2/g3', async ({ page }) => {
    await ouvrir(page, '#score', EN)
    await expect(page.locator(main)).toContainText('Your Trust Score')
    await expect(page.locator(main)).toContainText('Punctuality')
    await expect(page.locator(main)).not.toContainText(/\bg[123]\b/)
  })
})

test.describe('VD-10 · Les paliers', () => {
  test('montants calculés par palier, ITEL puis iPhone ; ce qui manque mène à Mon palier', async ({ page }) => {
    await ouvrir(page, '#paliers', FR)
    for (const m of ['17 840 F', '18 164 F', '18 488 F', '18 704 F', '+324 F', '+648 F', '+864 F']) await expect(page.locator(main)).toContainText(m)
    await expect(page.locator(main)).toContainText('Trust Score 90, audit chaque trimestre')
    await expect(page.locator(main)).not.toContainText('tenu 6 mois')
    await page.getByRole('button', { name: 'iPhone 15 Pro Max' }).click()
    await expect(page.locator(main)).toContainText('Pour un iPhone 15 Pro Max vendu 350 000 F')
    await expect(page.locator(main)).toContainText('+1 554 F')
    await page.getByText('Il vous manque 2 points et 3 commandes livrées').click()
    await expect(page).toHaveURL(/\/palier$/)
  })

  test('accès Préparation : conditions sans montant', async ({ page }) => {
    await ouvrir(page, '#paliers?role=prep', FR)
    await expect(page.locator(main)).toContainText('Argent libéré en 3 jours')
    await expect(page.locator(main)).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-10 · Sanctions et contrôle', () => {
  test('aucune sanction : carte verte, contrôle 1 sur 20, historique vide, rien à contester', async ({ page }) => {
    await ouvrir(page, '#sanctions', FR)
    await expect(page.locator(main)).toContainText('Aucune sanction, aucun avertissement')
    await expect(page.locator('.kv').first()).toContainText('1 commande sur 20')
    await expect(page.locator(main)).toContainText('À partir de 70 de Trust Score')
    await expect(page.locator(main)).toContainText('Aucune décision pour l’instant.')
    await expect(page.getByRole('button', { name: 'Contester une décision' })).toBeDisabled()
    await expect(page.locator(main)).toContainText('pendant 14 jours')
  })

  test('avertissement : carte ambre, contestation envoyée puis gardée dans l’historique', async ({ page }) => {
    await ouvrir(page, '#sanctions?cas=avertissement', FR)
    await expect(page.locator(main)).toContainText('Avertissement · niveau 1')
    await page.locator('.card', { hasText: 'Historique des décisions' }).getByRole('link', { name: 'Contester' }).click()
    await page.locator('#vd10-explication').fill('La commande était prête à l’heure : le livreur est arrivé après la fin du créneau prévu.')
    await page.getByRole('button', { name: 'Envoyer ma contestation' }).click()
    await expect(page).toHaveURL(/\/sanctions\?cas=avertissement$/)
    await page.reload()
    await expect(page.locator(main)).toContainText('Votre contestation · envoyée lundi 21 sept. à 09 h 48')
    await expect(page.locator(main)).toContainText('Réponse avant jeudi 24 sept. à 09 h 48')
  })
})

test.describe('VD-10 · Contester une décision', () => {
  test('sans décision : rien à contester', async ({ page }) => {
    await ouvrir(page, '#contester', FR)
    await expect(page.locator(main)).toContainText('Aucune décision à contester.')
  })

  test('saisie vérifiée, preuve jointe, une seule contestation', async ({ page }) => {
    await ouvrir(page, '#contester?d=DEC-2026-0918-S3', FR)
    await expect(page.locator(main)).toContainText('Suspension · niveau 3')
    await expect(page.locator(main)).toContainText('Motif : « Trois commandes non préparées en 30 jours »')
    const envoyer = page.getByRole('button', { name: 'Envoyer ma contestation' })
    await envoyer.click()
    await expect(page.locator('#vd10-err')).toHaveText('Expliquez en une phrase au moins.')
    await page.locator('#vd10-explication').fill('Trop court.')
    await envoyer.click()
    await expect(page.locator('#vd10-err')).toContainText('caractères au moins')
    await page.locator('#vd10-preuves').setInputFiles({ name: 'boutique.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })
    await expect(page.locator('.vd10-prv')).toHaveCount(1)
    await page.locator('#vd10-explication').fill('Les commandes du 14 et du 16 n’ont pas été ramassées : le livreur n’est pas passé, ma boutique était ouverte.')
    await envoyer.click()
    await expect(page).toHaveURL(/\/sanctions$/)
    await page.goto('contester?d=DEC-2026-0918-S3')
    await expect(page.locator(main)).toContainText('Une personne vous répond avant jeudi 24 sept. à 09 h 48')
    await expect(page.locator(main)).toContainText('1 preuve jointe')
    await expect(page.getByRole('button', { name: 'Envoyer ma contestation' })).toHaveCount(0)
  })
})

test.describe('VD-10 · Les plans', () => {
  test('plan actuel : découverte en francs, réponse du simulateur, essai d’un mois qui s’active tout de suite', async ({ page }) => {
    await ouvrir(page, '#plans_liste', FR)
    await expect(page.locator(main)).toContainText('Vous gardez 540 F de plus sur chaque ITEL AC52 vendu 20 000 F.')
    await expect(page.locator(main)).toContainText('22 commandes sur 50')
    await expect(page.locator(main)).toContainText('Ce mois-ci, Free vous fait garder le plus.')
    await expect(page.locator(main)).toContainText('Ou 25 000 F par an · 10 mois payés')
    await expect(page.locator(main)).not.toContainText('mises en avant')
    await page.locator('.card', { hasText: 'Boost' }).getByRole('button', { name: 'Essayer un mois offert' }).first().click()
    await expect(page).toHaveURL(/\?essai=boost$/)
    await expect(page.locator('.sheet')).toContainText('Aujourd’hui : 0 F.')
    await expect(page.locator('nav.dock')).toHaveCount(0)
    await page.getByRole('button', { name: 'Commencer l’essai' }).click()
    await expect(page.locator('.sheet')).toHaveCount(0)
    await expect(page.locator('.card').first()).toContainText('Essai offert')
    await expect(page.locator('.card').first()).toContainText('Offert jusqu’au 21 oct.')
    await page.reload()
    await expect(page.locator('.card').first()).toContainText('Rappel le 18 oct.')
  })

  test('essai déjà utilisé : « Choisir Boost » à l’année, paiement confirmé sur le téléphone', async ({ page }) => {
    await ouvrir(page, '#plans_liste?essai=boost', FR)
    await page.getByRole('button', { name: 'Commencer l’essai' }).click()
    await page.locator('.card', { hasText: 'Pro' }).getByRole('button', { name: 'Essayer un mois offert' }).click()
    await page.getByRole('button', { name: 'Commencer l’essai' }).click()
    await page.getByRole('button', { name: 'Choisir Boost' }).click()
    await page.getByRole('radio', { name: /À l’année/ }).click()
    await page.getByRole('button', { name: 'Payer 25 000 F' }).click()
    await expect(page.locator('.sheet')).toContainText('Demande de 25 000 F envoyée sur votre téléphone')
    await page.getByRole('button', { name: 'J’ai confirmé sur mon téléphone' }).click()
    await expect(page.locator('.card').first()).toContainText('Boost')
    await expect(page.locator('.card').first()).toContainText('par an')
  })

  test('arrêter puis garder le plan', async ({ page }) => {
    await ouvrir(page, '#plans_liste?essai=pro', FR)
    await page.getByRole('button', { name: 'Commencer l’essai' }).click()
    await page.getByRole('button', { name: 'Arrêter l’essai' }).click()
    await expect(page.locator(main)).toContainText('Arrêt demandé : retour à Free le 21 oct., sans frais.')
    await page.getByRole('button', { name: 'Garder Pro' }).click()
    await expect(page.locator(main)).not.toContainText('Arrêt demandé')
  })

  test('accès Préparation : réservé au propriétaire', async ({ page }) => {
    await ouvrir(page, '#plans_liste?role=prep', FR)
    await expect(page.locator(main)).toContainText('Réservé au propriétaire')
    await expect(page.locator(main)).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-10 · Le simulateur', () => {
  test('dit la vérité : Free garde le plus à 60 000 F ; le curseur recalcule ; à l’année', async ({ page }) => {
    await ouvrir(page, '#plans', FR)
    const gardes = page.locator('.split3 .mv')
    const curseur = page.locator('.vd10-curseur')
    // 60 000 F = 3 ITEL AC52 à 20 000 F : Free garde 3 × 17 840 F, plus que Boost et Pro (prix du plan non remboursé).
    await curseur.fill('60000')
    await expect(gardes).toHaveText(['53 520 F', '51 344 F', '46 668 F'])
    await expect(page.locator(main)).toContainText('Boost')
    await expect(page.locator(main)).toContainText('dès 480 000 F de ventes')
    await curseur.fill('500000')
    await expect(gardes).toHaveText(['446 000 F', '446 000 F', '443 900 F'])
    await curseur.fill('700000')
    await expect(gardes).toHaveText(['624 400 F', '624 400 F', '624 400 F'])
    // « Revenir à mes ventes du mois » remet le curseur sur le montant annoncé, au pas du curseur (un ITEL AC52, 20 000 F)
    // et borné à son maximum : 82 000 F → 80 000 F.
    const retour = page.getByRole('button', { name: /Revenir à mes ventes du mois/ })
    const annonce = Number(((await retour.textContent())!.match(/\(([^)]+)\)/)![1]).replace(/\D/g, ''))
    await retour.click()
    await expect(curseur).toHaveValue(String(Math.min(Math.round(annonce / 20000) * 20000, Number(await curseur.getAttribute('max')))))
    await curseur.fill('60000')
    await page.getByRole('radio', { name: 'Payé à l’année' }).click()
    await expect(gardes.nth(1)).toHaveText('51 761 F')
    await page.getByRole('link', { name: 'Rester en Free' }).click()
    await expect(page).toHaveURL(/\/visibilite$/)
  })
})

// Ventes du mois : celles libérées en septembre, même base que Mes gains (Q-83) : BLV-00001, 00002, 00003, 00016, 00018.
test('VD-10 · Le simulateur part des ventes libérées du mois (Mes gains)', async ({ page }) => {
  await ouvrir(page, '#plans', FR)
  await expect(page.getByRole('button', { name: /Revenir à mes ventes du mois/ })).toContainText('82 000 F', { timeout: 3000 })
})

test.describe('VD-10 · Se faire voir', () => {
  test('récompenses au mérite : vitrine sans paiement, jamais « Sponsorisé »', async ({ page }) => {
    await ouvrir(page, '#visibilite', FR)
    await expect(page.locator(main)).not.toContainText('Sponsorisé')
    await expect(page.locator('.hero.night')).toContainText('1 vente flash et 1 vitrine de quartier')
    await page.getByRole('button', { name: 'Mettre l’ITEL AC52 en vitrine' }).click()
    await expect(page).toHaveURL(/\?achat=1$/)
    await expect(page.locator('.sheet')).toContainText('Rien à payer : c’est votre récompense.')
    await page.getByRole('button', { name: 'Mettre en vitrine' }).click()
    await expect(page.locator(main)).toContainText('ITEL AC52 en vitrine')
    await page.reload()
    await expect(page.locator(main)).toContainText('il reste 168 h 00')
  })

  test('vente flash : 10 % au moins, au-delà de 50 % relue', async ({ page }) => {
    await ouvrir(page, '#visibilite', FR)
    await page.getByRole('button', { name: 'Programmer la vente flash' }).click()
    await page.locator('#vd10-remise').fill('5')
    await page.getByRole('button', { name: 'Programmer', exact: true }).click()
    await expect(page.locator('.sheet .vd10-err')).toHaveText('10 % au moins.')
    await page.locator('#vd10-remise').fill('60')
    await page.getByRole('button', { name: 'Programmer', exact: true }).click()
    await expect(page.locator(main)).toContainText('Remise de 60 % en vérification : la console la relit sous 24 h.')
  })
})

test.describe('VD-10 · Services', () => {
  test('agent photos : paiement confirmé, visite prévue, le frein quitte La demande', async ({ page }) => {
    await ouvrir(page, '#services', FR)
    await page.getByRole('button', { name: 'Demander un agent' }).click()
    await page.getByRole('button', { name: 'Payer 3 000 F' }).click()
    await page.getByRole('button', { name: 'J’ai confirmé sur mon téléphone' }).click()
    await expect(page.locator(main)).toContainText('Demande confirmée.')
    await expect(page.locator(main)).toContainText('passe avant jeudi 24 sept. à 09 h 48')
    await page.goto('demande')
    await expect(page.locator(main)).not.toContainText('Une seule photo sur l’ITEL')
  })
})

test.describe('VD-10 · Mes chiffres et La demande', () => {
  test('chiffres lus dans les commandes : 947 000 F, panier, dépendance, ventes par jour, export', async ({ page }) => {
    await ouvrir(page, '#chiffres', FR)
    await expect(page.locator('.hero.night .big')).toContainText('947 000')
    await expect(page.locator('.hero.night')).toContainText('24 commandes · 22 encaissées.')
    await expect(page.locator('.hero.night')).toContainText('Mardi et mercredi portent vos ventes d’iPhone.')
    // Panier moyen = ventes / commandes encaissées, au franc ; conversion = achats / vues (340).
    const panier = Math.round(947000 / 22).toLocaleString('fr-FR').replace(/\s/g, ' ')
    await expect(page.locator(main)).toContainText(`${panier} F`)
    await expect(page.locator(main)).toContainText(`${((22 / 340) * 100).toFixed(1).replace('.', ',')} %`)
    await expect(page.locator(main)).toContainText('l’iPhone fait 74 % de vos ventes')
    await page.getByRole('button', { name: /^mardi/ }).click()
    await expect(page.locator(main)).toContainText('Le mardi : 354 000 F sur 30 jours.')
    const fichier = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter mes chiffres' }).click()
    expect((await fichier).suggestedFilename()).toBe('belivay-mes-chiffres-30-jours.csv')
  })

  test('demande anonyme : le plus cherché en tête, « Ajouter » avec les mots, recherches verrouillées sans Boost', async ({ page }) => {
    await ouvrir(page, '#demande', FR)
    await expect(page.locator(main)).toContainText('« chargeur itel »')
    await expect(page.locator(main)).toContainText('Avec Boost')
    await page.getByRole('link', { name: 'Ajouter ce produit' }).click()
    await expect(page).toHaveURL(/\/offre1\?q=chargeur\+itel$/)
  })

  test('accès Préparation : la demande se lit, l’ajout reste au propriétaire', async ({ page }) => {
    await ouvrir(page, '#demande?role=prep', FR)
    await expect(page.locator(main)).toContainText('« chargeur itel »')
    await expect(page.getByRole('link', { name: 'Ajouter ce produit' })).toHaveCount(0)
    await expect(page.locator(main)).not.toContainText(/\d F\b/)
  })
})
