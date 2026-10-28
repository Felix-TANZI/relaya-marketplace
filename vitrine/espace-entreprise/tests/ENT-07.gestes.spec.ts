// Gestes et règles d'ENT-07 (litiges selon DP-35, règlements du vendredi, relevés, score) au jeu d'essai du mardi
// 13 octobre 2026, 14 h 05 : chaque montant vient des prestations et des décisions, chaque geste change la source et
// les autres écrans suivent (recours ⇒ retenue suspendue ⇒ versement du vendredi recalculé).
import { readFileSync } from 'node:fs'
import { expect, test, type Download, type Page } from '@playwright/test'
import { FR, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1280, height: 900 } })
test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

const dossier = (page: Page) => page.locator('.e7-dossier')
const onglet = (page: Page) => page.locator('.px .tabs button.on')
const ongletNomme = (page: Page, nom: string) => page.locator('.px .tabs button', { hasText: nom })

test.describe('ENT-P17 · Litiges', () => {
  test('ouvert : échéance du registre, brouillon du répartiteur, arrangement trop court refusé, réponse envoyée', async ({ page }) => {
    await ouvrir(page, 'litiges?id=LT-031', FR)
    await expect(page.locator('[data-heros=compte] .ec7-count .n')).toHaveText('26:59:59')
    await expect(dossier(page)).toContainText('Préparée par Serge Mbarga')
    await expect(onglet(page)).toContainText('Ouverts1')
    await dossier(page).getByRole('radio', { name: 'Proposer un arrangement' }).click()
    await dossier(page).locator('textarea').fill('Remboursement partiel')
    await dossier(page).getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(dossier(page).locator('.e7-annonce.non')).toContainText('au moins 40 caractères')
    await dossier(page).getByRole('radio', { name: 'Contester avec preuves' }).click()
    await dossier(page).locator('textarea').fill('Photos intactes au ramassage et au dépôt : aucun choc pendant le transport.')
    await dossier(page).getByRole('button', { name: 'Envoyer la réponse' }).click()
    // Le dossier passe en examen ; le badge des litiges disparaît de la navigation.
    await expect(onglet(page)).toContainText('En examen2')
    await expect(page.locator('aside.sl a[href$="/litiges"] .compteur')).toHaveCount(0)
  })

  test('répartiteur : prépare sans envoyer, aucun montant ; comptable : lecture seule', async ({ page }) => {
    await ouvrir(page, 'litiges?id=LT-031', { ...FR, role: 'repartiteur' })
    await expect(dossier(page).getByRole('button', { name: 'Envoyer la réponse' })).toHaveCount(0)
    await expect(dossier(page).getByRole('button', { name: 'Préparer pour le propriétaire' })).toBeVisible()
    await expect(dossier(page)).toContainText('Réservé au propriétaire et au comptable')
    await page.goto('litiges?id=LT-029')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await page.goto('litiges?id=LT-031&role=comptable')
    await expect(dossier(page)).toContainText('Le comptable lit les dossiers')
    await expect(dossier(page).locator('textarea')).toHaveCount(0)
  })

  test('décidé : retenue DED-10 en trois lignes, recours une fois qui suspend la retenue du vendredi', async ({ page }) => {
    await ouvrir(page, 'reglements', FR)
    // Trafic normal : la semaine couvre la retenue de LT-029 (aucun report) ; le recours la suspend et le vendredi monte.
    await expect(page.locator('[data-heros=vendredi] .big')).toHaveText(/^110\s930\s?F$/)
    await expect(page.locator('main .dk-banner.amber', { hasText: 'reportés' })).toHaveCount(0)
    await page.goto('litiges?id=LT-029')
    await expect(dossier(page).locator('.kv').filter({ hasText: 'Valeur de l’article' })).toContainText('−17 840 F')
    await expect(dossier(page).locator('.kv').filter({ hasText: 'Livraison remboursée' })).toContainText('−900 F')
    await expect(dossier(page).locator('.kv').filter({ hasText: 'Trajet retour' })).toContainText('−500 F')
    await dossier(page).getByRole('button', { name: 'Faire un recours' }).click()
    await expect(dossier(page).locator('.e7-annonce.non')).toContainText('élément nouveau')
    await dossier(page).locator('textarea').fill('Le livreur a retrouvé le bon de dépôt signé du relais.')
    await dossier(page).getByRole('button', { name: 'Faire un recours' }).click()
    await expect(dossier(page)).toContainText('examiné par Médiateur senior BelivaY')
    await expect(dossier(page).getByRole('button', { name: 'Faire un recours' })).toHaveCount(0)
    await page.goto('reglements')
    await expect(page.locator('[data-heros=vendredi] .big')).toHaveText(/^130\s170\s?F$/)
    await ongletNomme(page, 'Retenues').click()
    await expect(page.locator('[data-retenue]').first()).toContainText('Suspendue par un recours')
  })
})

test.describe('ENT-P18 · Règlements', () => {
  test('lignes de la période : validées, minorée, en revue sous litige, colis perdu non payé', async ({ page }) => {
    await ouvrir(page, 'reglements', FR)
    await expect(page.locator('[data-prestation]')).toHaveCount(80) // la semaine du jeudi 8 au jeudi 15 octobre
    const ligne = (id: string) => page.locator('tr', { has: page.locator(`[data-prestation=${id}]`) })
    await expect(ligne('PR-2346')).toContainText('800 F')
    await expect(ligne('PR-2346')).toContainText('Minorée')
    await expect(ligne('PR-2355')).toContainText('Litige LT-031 ouvert')
    await expect(ligne('PR-2349')).toContainText('Non payée')
    // Trois vendredis déjà versés ; chacun mène au relevé de sa semaine.
    await ongletNomme(page, 'Historique').click()
    await expect(page.locator('main table tbody tr')).toHaveCount(3)
    await expect(page.locator('main table')).toContainText('MP261009')
    await page.locator('main table tbody tr').first().getByRole('link', { name: /PDF · CSV/ }).click()
    await expect(page).toHaveURL(/releves\?id=RL-2026-S41/)
    await expect(page.locator('[data-periode=RL-2026-S41]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('changer le moyen : numéro vérifié, code SMS, versements bloqués 7 jours', async ({ page }) => {
    await ouvrir(page, 'reglements', FR)
    await page.getByRole('button', { name: 'Changer' }).click()
    const f = page.locator('.sheet')
    await f.getByLabel('Numéro (+237)').fill('612 34')
    await f.getByLabel('Ce compte est au nom de l’entreprise').check()
    await expect(f.getByRole('button', { name: 'Recevoir le code par SMS' })).toBeDisabled()
    await f.getByLabel('Numéro (+237)').fill('677 12 34 56')
    await f.getByRole('button', { name: 'Recevoir le code par SMS' }).click()
    await f.getByLabel(/Code reçu/).fill('000000')
    await f.getByRole('button', { name: 'Confirmer le changement' }).click()
    await expect(f.locator('.e7-annonce.non')).toContainText('Code incorrect')
    const code = (await f.locator('.e7-aide', { hasText: 'Démonstration' }).textContent())!.replace(/\D/g, '')
    await f.getByLabel(/Code reçu/).fill(code)
    await f.getByRole('button', { name: 'Confirmer le changement' }).click()
    await expect(f).toContainText('Versements bloqués 7 jours')
    await f.getByRole('button', { name: 'Fermer' }).first().click()
    await expect(page.locator('main .dk-banner.amber').first()).toContainText('Moyen de règlement en revue')
    await expect(page.getByRole('button', { name: 'Changer' })).toBeDisabled()
  })

  test('répartiteur : règlements et relevés réservés', async ({ page }) => {
    await ouvrir(page, 'reglements', { ...FR, role: 'repartiteur' })
    await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
    await page.goto('releves')
    await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
  })
})

test.describe('ENT-P19 · Relevés', () => {
  test('semaine provisoire : lignes et retenues, net, fichiers attendus après l’arrêté', async ({ page }) => {
    await ouvrir(page, 'releves', { ...FR, role: 'comptable' })
    await expect(page.locator('[data-releve=RL-2026-S42]')).toContainText('Net de la période')
    await expect(page.locator('.ec7-tot .e7-net')).toHaveText('110 930 F')
    await expect(page.getByRole('button', { name: 'CSV' })).toBeDisabled()
    await expect(page.locator('main')).toContainText('Relevé provisoire, arrêté jeu. 15 oct. à 23 h 59')
    await expect(page.locator('main')).toContainText('RCCM CM-NSI-02-2026-B13-00886')
  })
})

test.describe('ENT-P20 · Score', () => {
  test('score calculé, palier Nouveau, livreur sous le seuil en ambre, événement ouvre son paquet', async ({ page }) => {
    await ouvrir(page, 'score', FR)
    await expect(page.locator('[data-heros=score] .ring b')).toContainText('77')
    await expect(page.locator('[data-heros=score]')).toContainText('Palier Nouveau · 75 000 F par colis')
    await expect(page.locator('[data-heros=score]')).toContainText('Vers Confirmé : 70 tenu 14 jours')
    await expect(page.locator('[data-heros=score]')).toContainText('seuil atteint : il reste à le tenir')
    await ongletNomme(page, 'Livreurs').click()
    await expect(page.locator('[data-livreur=l-ines]')).toContainText('Tire le score vers le bas')
    await ongletNomme(page, 'Événements').click()
    await page.locator('.ec7-evt a.li', { hasText: 'Remise après la promesse' }).first().click()
    await expect(page).toHaveURL(/\/paquet\?id=PQ-\d+$/)
  })
})

// ── Enrichissements (ENRICHISSEMENTS.md P17-P20) ─────────────────────────────────────────────────────────────────
const lire = async (d: Download) => readFileSync((await d.path())!)
const HEURE_TEST = new Date('2026-10-13T13:05:00.500Z').getTime()

test.describe('ENT-P17 · Litiges enrichis', () => {
  test('recherche « / », puces (à répondre, ouverts, clos), zéro résultat puis effacer', async ({ page }) => {
    await ouvrir(page, 'litiges', FR)
    const puce = (n: string) => page.locator('.e-puces .chip', { hasText: n })
    await expect(puce('À répondre')).toContainText('1')
    await expect(puce('Ouverts')).toContainText('3')
    await expect(puce('Clos')).toContainText('8') // les litiges des semaines passées, décidés
    await puce('Ouverts').click()
    await expect(page).toHaveURL(/f=ouverts/)
    await expect(page.locator('[data-litige]')).toHaveCount(3)
    await puce('Tous').click()
    await page.keyboard.press('/')
    await page.keyboard.type('LT-029')
    await expect(page.getByRole('searchbox', { name: 'Rechercher un litige' })).toHaveValue('LT-029')
    await expect(page.locator('[data-litige]')).toHaveCount(1)
    await expect(page.locator('.e7-dossier')).toHaveAttribute('data-dossier', 'LT-029')
    await page.getByRole('searchbox', { name: 'Rechercher un litige' }).fill('zzzz')
    await expect(page.locator('.e-zero')).toContainText('Aucun résultat')
    await page.getByRole('button', { name: 'Effacer les filtres' }).click()
    await expect(page.locator('[data-litige]')).toHaveCount(1) // retour à l'onglet Ouverts
  })

  test('compte à rebours du délai de réponse : une seconde de moins chaque seconde', async ({ page }) => {
    await ouvrir(page, 'litiges?id=LT-031', FR)
    const n = page.locator('[data-heros=compte] .ec7-count .n')
    await expect(n).toHaveText('26:59:59')
    await page.clock.setFixedTime(new Date(HEURE_TEST + 5000))
    await expect(n).toHaveText('26:59:54')
    await expect(page.locator('[data-litige=LT-031] .rebours')).toContainText('Répondre sous')
    await expect(dossier(page).locator('.e-limite', { hasText: 'Délai de réponse : 48 h' })).toBeVisible()
  })

  test('hors connexion : contestation gardée puis envoyée au retour du réseau ; « Accepter » attend le réseau', async ({ page }) => {
    await ouvrir(page, 'litiges?id=LT-031', FR)
    await page.context().setOffline(true)
    await dossier(page).getByRole('radio', { name: 'Accepter' }).click()
    await expect(dossier(page).getByRole('button', { name: 'Envoyer la réponse' })).toBeDisabled()
    await expect(dossier(page)).toContainText('« Accepter » engage une retenue')
    await dossier(page).getByRole('radio', { name: 'Contester avec preuves' }).click()
    await dossier(page).locator('textarea').fill('Photos intactes au ramassage et au dépôt : aucun choc pendant le transport.')
    await dossier(page).getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(dossier(page).locator('.e7-annonce.ok')).toContainText('Gardée sur cet appareil')
    await expect(page.locator('.en-file')).toContainText('1 geste en attente')
    await expect(onglet(page)).toContainText('Ouverts1')
    await page.context().setOffline(false)
    await expect(page.locator('.en-file')).toHaveCount(0)
    await expect(onglet(page)).toContainText('En examen2')
  })

  test('dossier en PDF : un vrai PDF avec les preuves et le journal', async ({ page }) => {
    await ouvrir(page, 'litiges?id=LT-029', FR)
    const [dl] = await Promise.all([page.waitForEvent('download'), dossier(page).locator('[data-pdf-dossier]').click()])
    expect(dl.suggestedFilename()).toBe('dossier-LT-029.pdf')
    const b = await lire(dl)
    expect(b.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(b.toString('latin1')).toContain('LT-029')
  })
})

test.describe('ENT-P18 · Règlements enrichis', () => {
  test('rebours vers le vendredi, montants masqués au toucher et gardés, période et recherche', async ({ page }) => {
    await ouvrir(page, 'reglements', FR)
    await expect(page.locator('[data-heros=vendredi] .rebours').first()).toContainText('Versement dans 2 j 21 h')
    await page.locator('[data-montant-heros]').click()
    await expect(page.locator('[data-heros=vendredi] .big')).toContainText('••••')
    await expect(page.locator('[data-heros=vendredi] .kpi, [data-heros=vendredi] .m4').first()).not.toContainText(/\d\s?F\b/)
    await page.reload()
    await expect(page.locator('[data-heros=vendredi] .big')).toContainText('••••')
    await page.getByRole('button', { name: 'Afficher les montants' }).first().click()
    await expect(page.locator('[data-heros=vendredi] .big')).toHaveText(/^110\s930\s?F$/)
    const total = await page.locator('[data-prestation]').count()
    await page.locator('.e-puces .chip', { hasText: 'Aujourd’hui' }).click()
    await expect(page).toHaveURL(/p=jour/)
    await expect.poll(() => page.locator('[data-prestation]').count()).toBeLessThan(total)
    await expect(page.locator('.e7-outils-l .e-compte')).toContainText(`sur ${total}`)
    await page.locator('.e-puces .chip', { hasText: 'Toute la période' }).click()
    await page.getByRole('searchbox', { name: 'Rechercher dans les règlements' }).fill('PQ-2346')
    await expect(page.locator('[data-prestation]')).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Rechercher dans les règlements' }).fill('zzzz')
    await expect(page.locator('.e-zero')).toBeVisible()
  })

  test('exports CSV et PDF de l’onglet affiché ; le comptable voit pourquoi il ne change pas le moyen', async ({ page }) => {
    await ouvrir(page, 'reglements', FR)
    const outils = page.locator('.e7-outils-l .e-exports')
    const [csv] = await Promise.all([page.waitForEvent('download'), outils.getByRole('button', { name: 'CSV' }).click()])
    const texte = (await lire(csv)).toString('utf-8')
    expect(texte).toContain('PQ-2346')
    expect(texte.split('\r\n')[0]).toContain('Paquet;Mission')
    const [pdf] = await Promise.all([page.waitForEvent('download'), outils.getByRole('button', { name: 'PDF' }).click()])
    expect((await lire(pdf)).subarray(0, 5).toString('latin1')).toBe('%PDF-')
    await page.goto('reglements?role=comptable')
    await expect(page.locator('.e-interdit', { hasText: 'Changer le moyen de règlement' })).toContainText('réservé à Propriétaire')
  })
})

test.describe('ENT-P19 · Relevés enrichis', () => {
  test('puces de période, totaux ; l’export attend la période arrêtée', async ({ page }) => {
    await ouvrir(page, 'releves', { ...FR, role: 'comptable' })
    await expect(page.locator('[data-totaux]')).toContainText('Net')
    await page.locator('.e-puces .chip', { hasText: 'Mois' }).click()
    await expect(page.locator('[data-periode]')).toHaveCount(2)
    await expect(page.locator('[data-periode=RL-2026-10]')).toBeVisible()
    await expect(page.locator('[data-periode=RL-2026-09]')).toBeVisible()
    // Closes : les trois semaines versées et septembre, exportables ; la semaine en cours attend son arrêté.
    await page.locator('.e-puces .chip', { hasText: 'Closes' }).click()
    await expect(page.locator('[data-periode]')).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Exporter en CSV' }).first()).toBeEnabled()
    // Le fichier lui-même (vrai PDF, CSV, refus en provisoire) : src/demo/exports.test.ts.
  })
})

test.describe('ENT-P20 · Score enrichi', () => {
  test('échelle des paliers, évolution animée jusqu’au score, fiche « Comment monter » depuis un critère', async ({ page }) => {
    await ouvrir(page, 'score', FR)
    await expect(page.locator('[data-echelle]')).toContainText('Confirmé : 70 tenu 14 jours')
    await expect(page.locator('[data-heros=score] .ring b')).toHaveText('77')
    await page.locator('[data-critere=manquements] .e7-monter').first().click()
    await expect(page).toHaveURL(/sheet=monter&fiche=manquements/)
    const f = page.locator('[data-fiche=manquements]')
    await expect(f).toContainText('Ce qui compte')
    await expect(f).toContainText('Répondez aux litiges dans les 48 heures')
    await page.keyboard.press('Escape')
    await expect(f).toHaveCount(0)
  })
})
