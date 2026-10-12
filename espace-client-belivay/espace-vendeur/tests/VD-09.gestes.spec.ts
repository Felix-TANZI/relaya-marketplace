// Gestes des écrans d'argent (VD-09) : chaque montant vient des données (calculs de src/calculs, jeu d'essai du lundi
// 21 sept. 2026, 09 h 48), chaque geste change la source et l'écran suit ; l'accès Préparation ne voit aucun montant.
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const ROUTES = ['argent', 'se_libere', 'gele', 'gains', 'documents', 'versements', 'numero_versement']
const montant = (s: string) => Number(s.replace(/[^\d]/g, ''))

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('VD-09 · Mon argent', () => {
  test('quatre états calculés, phrases, « Passe à » et contrôle de la somme', async ({ page }) => {
    await ouvrir(page, '#argent', FR)
    await expect(page.locator('.hero.night .hk')).toHaveText('À verser vendredi 25 sept.')
    // À verser = BLV-00018 (11 592 F) + BLV-00003 (17 840 F), libérées ; ce soir BLV-00007 (17 840 F) s'y ajoute.
    await expect(page.locator('.hero.night .big')).toHaveText('29 432FCFA')
    await expect(page.locator('.hero.night .hs')).toHaveText('Passe à 47 272 F ce soir à 18 h, quand BLV-00007 se libère.')
    await expect(page.locator('[data-ligne=se_libere] .ls')).toHaveText('BLV-00007 · ce soir à 18 h · et 1 autre(s)')
    await expect(page.locator('[data-ligne=en_cours] .ls')).toHaveText('BLV-00012 et 3 autre(s) · pas encore retirées')
    await expect(page.locator('[data-ligne=gele] .ls')).toHaveText('3 litiges et 4 retours · sans date')
    const valeurs = await page.locator('[data-ligne] .rv').allTextContents()
    expect(valeurs).toHaveLength(4)
    // Le héros « À verser » est la ligne À verser ; « Passe à » = À verser + la prochaine somme qui se libère.
    const aVerser = montant((await page.locator('[data-ligne=a_verser] .rv').textContent())!)
    expect(montant((await page.locator('.hero.night .big').textContent())!)).toBe(aVerser)
    expect(montant((await page.locator('.hero.night .hs').textContent())!.split(' F')[0])).toBe(aVerser + 17840)
    const total = await page.locator('[data-total=circulation]').textContent()
    expect(montant(total!)).toBe(valeurs.map(montant).reduce((a, b) => a + b, 0))
    // Plusieurs commandes en cours : la ligne mène à la liste (Se libère), pas à une seule commande.
    await page.locator('[data-ligne=en_cours]').click()
    await expect(page).toHaveURL(/\/se_libere$/)
  })

  test('l’œil masque les montants sur place, le choix est gardé', async ({ page }) => {
    await ouvrir(page, '#argent', FR)
    await page.getByRole('button', { name: 'Masquer les montants' }).click()
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await expect(page.locator('.hero.night .big')).toContainText('•• •••')
    await page.reload()
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await page.goto('versements')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await page.getByRole('button', { name: 'Afficher les montants' }).click()
    await expect(page.locator('.hero.night .big')).toHaveText('29 432FCFA')
  })

  test('anglais : textes, dates et montants à l’anglaise', async ({ page }) => {
    await ouvrir(page, '#argent', EN)
    await expect(page.locator('.hero.night .hk')).toHaveText('To be paid out Friday 25 Sept')
    await expect(page.locator('.hero.night .hs')).toContainText('47,272 F tonight at 6 pm, when BLV-00007 is released.')
    await expect(page.locator('[data-ligne=gele] .ls')).toHaveText('3 disputes and 4 returns · no date')
  })

  test('hors connexion : montants du dernier calcul avec leur heure', async ({ page, context }) => {
    await ouvrir(page, '#argent', FR)
    await context.setOffline(true)
    await expect(page.locator('main .note.amber')).toContainText('Hors connexion. Montants de 09 h 48')
    await context.setOffline(false)
    await expect(page.locator('main .note.amber')).toHaveCount(0)
  })
})

test.describe('VD-09 · accès Préparation', () => {
  for (const r of ROUTES)
    test(`${r} : écran verrouillé, aucun montant`, async ({ page }) => {
      await ouvrir(page, `#${r}?role=prep`, FR)
      await expect(page.locator('main')).toContainText('Réservé au propriétaire')
      await expect(page.locator('main')).toContainText('visibles par Franck Penga seulement')
      await expect(page.locator('main')).not.toContainText(/\d F\b/)
      await expect(page.locator('nav.dock .dot')).toHaveCount(0)
      await page.getByText('Voir les commandes à préparer').click()
      await expect(page).toHaveURL(/\/commandes\?f=prep&role=prep$/)
    })
})

test.describe('VD-09 · Se libère', () => {
  test('compte à rebours, barre réelle, palier et vendredi calculés', async ({ page }) => {
    await ouvrir(page, '#se_libere', FR)
    const carte = page.locator('.hero.night[data-ref=BLV-00007]')
    await expect(carte.locator('.big')).toHaveText('8 h 12restantes')
    await expect(carte.locator('[role=progressbar]')).toHaveAttribute('aria-valuenow', '89')
    await expect(carte).toContainText('Confirmée ven. 18 sept., 18 h')
    await expect(carte).toContainText('Libérée aujourd’hui, 18 h')
    await expect(carte).toContainText('Versé vendredi 25 sept. sur MTN ···· 4 217')
    await expect(page.locator('main .hint-l').first()).toHaveText('Votre palier Bronze : libéré 3 jours après la confirmation du client.')
    await page.getByText('BLV-00008 · ITEL AC52').click()
    await expect(page).toHaveURL(/\/commande\?ref=BLV-00008$/)
  })
})

test.describe('VD-09 · Gelé', () => {
  test('total = somme des cartes, triées par échéance, la plus urgente en bouton plein, filtre', async ({ page }) => {
    await ouvrir(page, '#gele', FR)
    const refs = await page.locator('.card.ord').evaluateAll((l) => l.map((e) => e.getAttribute('data-ref')))
    // Échéance croissante : le retour dont le délai d'inspection est passé (BLV-00021) d'abord.
    expect(refs).toEqual(['BLV-00021', 'BLV-00017', 'BLV-00020', 'BLV-00022', 'BLV-00005', 'BLV-00006', 'BLV-00004'])
    const cartes = await page.locator('.card.ord .cr').allTextContents()
    const total = await page.locator('.hero.red .big').textContent()
    expect(montant(total!)).toBe(cartes.map(montant).reduce((a, b) => a + b, 0))
    await expect(page.locator('.card.ord').first().locator('.btn.primary')).toHaveText('Voir le retour')
    await expect(page.locator('.card.ord .btn.primary')).toHaveCount(1)
    await expect(page.locator('.card.ord').first()).toContainText('Délai d’inspection passé : écrivez au support.')
    await expect(page.locator('.card.ord[data-ref=BLV-00017]')).toContainText('Répondez avant aujourd’hui à 10 h')
    await expect(page.locator('.card.ord[data-ref=BLV-00005]')).toContainText('Répondez avant demain à 05 h 30')
    await expect(page.locator('.card.ord[data-ref=BLV-00004]')).toContainText('Inspectez-le avant jeudi 24 sept. à 16 h')
    await page.getByRole('radio', { name: 'Litiges' }).click()
    await expect(page.locator('.card.ord')).toHaveCount(3)
    await page.getByRole('radio', { name: 'Retours' }).click()
    await expect(page.locator('.card.ord')).toHaveCount(4)
    await page.getByRole('link', { name: 'Voir le retour' }).first().click()
    await expect(page).toHaveURL(/\/retours$/)
  })
})

test.describe('VD-09 · Mes gains', () => {
  test('mois, gagné, ce soir, graphique, recherche et reçu', async ({ page }) => {
    await ouvrir(page, '#gains', FR)
    await expect(page.locator('.hero.night .hk')).toHaveText('Septembre · vous avez gardé')
    // Septembre : BLV-00001, 00002, 00003 (3 × 17 840 F), 00018 (11 592 F), 00016 (6 944 F) libérées.
    await expect(page.locator('.hero.night .big')).toHaveText('72 056FCFA')
    await expect(page.locator('.hero.night')).toContainText('sur 82 000 F de ventes libérées ce mois-ci.')
    const ventes = await page.locator('.card a.li').allInnerTexts()
    expect(ventes).toHaveLength(5)
    expect(ventes.map((v) => montant(v.split('\n').pop()!)).reduce((a, b) => a + b, 0)).toBe(72056)
    // Ce soir = gagné depuis l'inscription + BLV-00007 (17 840 F) qui se libère à 18 h.
    await expect(page.locator('main')).toContainText('3 008 806 F')
    await expect(page.locator('main')).toContainText('3 026 646 F')
    await page.getByRole('searchbox', { name: 'Chercher une vente' }).fill('00002')
    await expect(page.locator('.card a.li')).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Chercher une vente' }).fill('')
    await page.locator('.vd9-graph button[aria-label^="Août 2026"]').click()
    await expect(page).toHaveURL(/mois=2026-08/)
    // Août : BLV-H033 (337 050 F) + BLV-H032 (3 300 F) + BLV-H031 (34 600 F).
    await expect(page.locator('.hero.night .big')).toHaveText('374 950FCFA')
    await expect(page.locator('.card a.li')).toHaveCount(3)
    await page.getByRole('button', { name: 'Mois suivant' }).click()
    await page.getByText('BLV-00003 · ITEL AC52').click()
    await expect(page).toHaveURL(/\/recu\?ref=BLV-00003$/)
  })
})

async function telecharge(page: Page, nom: string | RegExp) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: nom }).click()])
  return { nom: d.suggestedFilename(), contenu: readFileSync((await d.path())!) }
}

test.describe('VD-09 · Documents', () => {
  test('relevés CSV et PDF, facture, contrat : de vrais fichiers', async ({ page }) => {
    await ouvrir(page, '#documents', FR)
    const csv = await telecharge(page, 'Télécharger le relevé de Septembre 2026 en CSV')
    expect(csv.nom).toBe('belivay-releve-2026-09.csv')
    expect(csv.contenu.toString('utf-8')).toContain('BLV-00003;2026-09-19;ITEL AC52 · noir;20000;17840')
    const pdf = await telecharge(page, 'Télécharger le relevé de Août 2026 en PDF')
    expect(pdf.contenu.subarray(0, 5).toString()).toBe('%PDF-')
    const facture = await telecharge(page, 'Télécharger la facture de Août 2026 en PDF')
    expect(facture.nom).toBe('belivay-facture-2026-08.pdf')
    await expect(page.locator('main')).toContainText('56 reçus, BLV-H001 à BLV-00009 · sans donnée du client')
    await expect(page.locator('main')).toContainText('Aucune pour l’instant : vous êtes sur Free.')
    await expect(page.locator('main')).toContainText('Signé électroniquement le 15 septembre 2025')
  })

  test('hors connexion : la liste reste lisible, le téléchargement attend', async ({ page, context }) => {
    await ouvrir(page, '#documents', FR)
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Télécharger le contrat en PDF' }).dispatchEvent('click')
    await expect(page.locator('.vd9-toast')).toHaveText('Hors connexion : le téléchargement attend le réseau. Rien n’est perdu.')
    await context.setOffline(false)
  })
})

test.describe('VD-09 · Versements', () => {
  test('date, référence annoncée, commandes couvertes, période', async ({ page }) => {
    await ouvrir(page, '#versements', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Vendredi 25 septembre')
    await expect(page.locator('.hero.night')).toContainText('Référence prévue BLV-VS-4086')
    // En-tête + BLV-00018, BLV-00003, BLV-00007, BLV-00015 (libérées avant jeudi minuit) + total.
    await expect(page.locator('.tbl tr')).toHaveCount(6)
    const couvertes = await page.locator('.tbl tr').evaluateAll((l) => l.slice(1, -1).map((r) => r.lastElementChild!.textContent!))
    const prevu = couvertes.map(montant).reduce((a, b) => a + b, 0)
    expect(prevu).toBe(58864)
    await expect(page.locator('.tbl')).toContainText('Total prévu58 864 F')
    await expect(page.locator('main')).toContainText('10 versements en 3 mois · 0 F de frais')
    await expect(page.locator('main button.li[aria-expanded]')).toHaveCount(10)
    await page.getByRole('radio', { name: 'Tout' }).click()
    await expect(page).toHaveURL(/periode=tout/)
    // Depuis la signature du contrat (BOUTIQUE.signature, 15 sept. 2025) : l'année est écrite.
    await expect(page.locator('main')).toContainText('35 versements depuis le 15 septembre 2025 · 0 F de frais')
    await expect(page.locator('main button.li[aria-expanded]')).toHaveCount(35)
  })

  test('refus de l’opérateur : motif, à faire, trois essais datés', async ({ page }) => {
    await ouvrir(page, '#versements?refus=1', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Nouvel essai samedi 26 sept.')
    await expect(page.locator('main [role=alert]')).toContainText('MTN a refusé le versement du vendredi 25 sept.')
    await expect(page.locator('main [role=alert]')).toContainText('Nouvel essai sam. 26 sept. à 12 h (1 sur 3), puis dim. 27 sept. et lun. 28 sept.')
    await expect(page.locator('.hero.night .hk')).toHaveText('En attente')
    await ouvrir(page, '#versements?refus=1&motif=tiers', FR)
    await page.getByRole('link', { name: 'Changer de numéro de versement' }).first().click()
    await expect(page).toHaveURL(/\/numero_versement$/)
  })

  test('versement non reçu : signalé avec sa référence, puis la messagerie', async ({ page }) => {
    await ouvrir(page, '#versements', FR)
    await page.getByRole('button', { name: /Vendredi 18 sept\./ }).click()
    await page.getByRole('button', { name: 'Pas reçu ?' }).click()
    await expect(page).toHaveURL(/\/messages\?fil=support&sujet=BLV-VS-4085$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/versements$/)
    // Sous forte charge, la liste peut se redessiner juste après le retour : on rouvre la ligne jusqu'à la voir ouverte.
    const ligne = page.getByRole('button', { name: /Vendredi 18 sept\./ })
    await expect(async () => {
      if ((await ligne.getAttribute('aria-expanded')) !== 'true') await ligne.click()
      await expect(page.locator('main')).toContainText('Déjà signalé au support', { timeout: 1000 })
    }).toPass({ timeout: 10_000 })
  })
})

test.describe('VD-09 · Numéro de versement', () => {
  test('préfixe contrôlé, deux codes, revue de 7 jours, versements reportés', async ({ page }) => {
    await ouvrir(page, '#numero_versement', FR)
    await page.getByRole('radio', { name: /MTN Mobile Money/ }).click()
    await page.getByRole('textbox', { name: 'Nouveau numéro' }).fill('655312048')
    await expect(page.locator('#vd9-numero-aide')).toHaveText('655 est un numéro Orange Money, pas MTN Mobile Money. Choisissez Orange Money ou corrigez le numéro.')
    await expect(page.getByRole('button', { name: 'Recevoir le code' })).toBeDisabled()
    await page.getByRole('radio', { name: /Orange Money/ }).click()
    await expect(page.locator('#vd9-numero-aide')).toHaveText('655 : c’est bien Orange Money. Un préfixe qui ne correspond pas est refusé avant l’envoi.')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page).toHaveURL(/s=code/)
    await expect(page.locator('main')).toContainText('1 · Code reçu par SMS au 655 •• •• 48')
    await page.getByLabel('Code reçu au nouveau numéro').fill('000000')
    await page.getByLabel('Code reçu au téléphone personnel').fill('123456')
    await page.getByRole('button', { name: 'Valider le numéro' }).click()
    await expect(page.locator('main')).toContainText('Ce code ne correspond pas. Encore 4 essais.')
    for (const k of '123456') await page.getByRole('group', { name: 'Clavier' }).getByRole('button', { name: k, exact: true }).click()
    await page.getByRole('button', { name: 'Valider le numéro' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Numéro enregistré, en revue')
    await expect(page.locator('.hero.night')).toContainText('Jusqu’au lundi 28 septembre')
    await expect(page.locator('.hero.night')).toContainText('Il part vendredi 2 oct., après la revue.')
    await expect(page.locator('main')).toContainText('Orange ···· 2 048')
    await expect(page.locator('main .pill.ink')).toHaveText('Désactivé')
    await page.reload()
    await expect(page.locator('h1.pg-t')).toHaveText('Numéro enregistré, en revue')
    await page.getByRole('link', { name: 'Retour aux versements' }).click()
    await expect(page.locator('.pg-k')).toHaveText('Versement reporté')
    await expect(page.locator('h1.pg-t')).toHaveText('Vendredi 2 octobre')
  })

  test('sans réseau, « Recevoir le code » attend et le dit', async ({ page, context }) => {
    await ouvrir(page, '#numero_versement', FR)
    await page.getByRole('radio', { name: /Orange Money/ }).click()
    await page.getByRole('textbox', { name: 'Nouveau numéro' }).fill('655312048')
    await context.setOffline(true)
    await expect(page.getByRole('button', { name: 'Recevoir le code' })).toBeDisabled()
    await expect(page.locator('main')).toContainText('Sans réseau, le code ne peut pas partir')
    await context.setOffline(false)
  })
})
