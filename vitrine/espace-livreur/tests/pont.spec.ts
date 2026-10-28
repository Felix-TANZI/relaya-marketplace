// Pont avec l'espace entreprise et l'espace point relais (src/demo/pont.ts, même appareil) : une mission affectée par
// Yafé Express dans son portail arrive chez Serge ; un incident déclaré par Serge part vers le portail, et la décision de
// l'entreprise revient. Au Relais Bastos Carrefour, les gestes de Rose M. dans l'application du relais (code de dépôt
// vérifié, résultat par colis, lot validé, colis présenté) arrivent chez Serge, qui confirme ; ses confirmations repartent.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { arriver, ramasserA2, re } from './LIV-06.parcours'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const LE = Date.parse('2026-10-13T13:04:00Z')
const AFFECTATION = {
  type: 'affectation',
  paquetId: 'PQ-Z1-261013-004',
  paquet: {
    genre: 'domicile',
    zone: 'Z1 Centre-ville',
    heureLimite: Date.parse('2026-10-13T17:35:00Z'),
    distanceKm: 3.1,
    arrets: [
      { id: 'PQ-Z1-261013-004#0', type: 'ramassage', nom: 'Tech Bastos', quartier: 'Bastos', colis: [{ id: 'BV 24 8161', classe: 'M', valeur: 62000, fragile: true, payable: false }], creneau: ['14:30', '15:00'] },
      { id: 'PQ-Z1-261013-004#1', type: 'domicile', nom: 'Remise à domicile', quartier: 'Bastos', colis: [{ id: 'BV 24 8161', classe: 'M', valeur: 62000, fragile: true, payable: false }], creneau: null },
    ],
  },
  cle: 'affectation-PQ-Z1-261013-004',
  app: 'entreprise',
  le: LE,
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('une mission affectée dans le portail de l’entreprise arrive chez le livreur, avec sa notification', async ({ page }) => {
  await ouvrir(page, '#aujourdhui', FR)
  // Yafé Express affecte le paquet dans son portail, sur le même appareil (journal partagé du pont).
  await page.evaluate((e) => localStorage.setItem('blv_pont', JSON.stringify([e])), AFFECTATION)
  await page.reload()
  await expect(page.locator('#app main .card.tight a.li').filter({ hasText: 'PQ-Z1-261013-004' })).toHaveCount(1)
  await page.goto('notifications')
  await expect(page.locator('#app main')).toContainText('Nouveau paquet affecté')
  await expect(page.locator('#app main')).toContainText('PQ-Z1-261013-004')
})

test('un incident déclaré par le livreur part vers l’entreprise ; sa décision revient dans le suivi', async ({ page }) => {
  await ouvrir(page, '#incident', FR)
  await page.getByRole('link', { name: /Sécurité/ }).click()
  await page.getByRole('radio', { name: /Lieu dangereux/ }).click()
  await page.locator('#l8-note').fill('Groupe agressif devant le relais, je reste à l’écart avec les colis.')
  await page.getByRole('button', { name: 'Envoyer l’incident' }).click()
  await expect(page).toHaveURL(/incident\?id=IN-/)
  const id = new URL(page.url()).searchParams.get('id')!
  const envoye = await page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; id?: string; app: string }[])
  expect(envoye.some((e) => e.type === 'incident' && e.id === id && e.app === 'livreur')).toBe(true)
  // L'entreprise décide dans son portail (même appareil) : le suivi du livreur le montre.
  await page.evaluate((x) => {
    const l = JSON.parse(localStorage.getItem('blv_pont') ?? '[]')
    l.push({ type: 'decision', id: x, decision: 'valide', motif: null, par: 'Gaëlle Wankeu', cle: 'decision-' + x, app: 'entreprise', le: Date.now() })
    localStorage.setItem('blv_pont', JSON.stringify(l))
  }, id)
  await page.reload()
  await expect(page.locator('#app main')).toContainText('Gaëlle Wankeu')
})

test('le tarif par mission réglé par l’entreprise s’affiche dans l’activité du livreur', async ({ page }) => {
  await ouvrir(page, '#activite', FR)
  await page.evaluate((le) => localStorage.setItem('blv_pont', JSON.stringify([{ type: 'tarif', montant: 700, cle: 'tarif-1', app: 'entreprise', le }])), LE)
  await page.reload()
  await expect(page.locator('#app main')).toContainText('700')
})

// ---------- Relais ----------
const LOT = 'PQ-Z1-261013-003'
const duRelais = (page: Page, evenements: Record<string, unknown>[]) =>
  page.evaluate((l) => {
    const j = JSON.parse(localStorage.getItem('blv_pont') ?? '[]')
    for (const e of l) j.push({ ...e, cle: 'relais-' + j.length, app: 'relais', le: Date.now() })
    localStorage.setItem('blv_pont', JSON.stringify(j))
  }, evenements)
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; [k: string]: unknown }[])

async function auRelais(page: Page) {
  await ouvrir(page, '#tournee', FR)
  await ramasserA2(page)
  await page.goto('tournee')
  await arriver(page, 'Je suis au relais')
  await expect(page).toHaveURL(/\/depot-relais\?a=A3/)
}

test('dépôt : les résultats de Rose M. viennent de l’application du relais ; Serge confirme après la validation du lot', async ({ page }) => {
  test.setTimeout(180_000)
  await auRelais(page)
  const main = page.locator('#app main')
  await expect(main).toContainText('Rose M.')
  await expect(main).not.toContainText('Mireille')
  await expect(page.locator('.lr-code')).toHaveText('418306') // le code de dépôt du lot au relais (RELAIS_DEMO)
  // Serge s'est annoncé au relais en finissant l'arrêt qui précède.
  expect((await journal(page)).some((e) => e.type === 'courier.approaching' && e.lot === LOT && e.app === 'livreur')).toBe(true)
  await duRelais(page, [
    { type: 'relay.drop_code.verified', lot: LOT },
    ...['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'].map((colis) => ({ type: 'relay.drop.item_result', lot: LOT, colis, resultat: 'controle', motif: null, photos: 0 })),
    { type: 'relay.drop.item_result', lot: LOT, colis: 'BLV-00014-1', resultat: 'refuse', motif: 'Scellé cassé', photos: 2 },
  ])
  await page.reload()
  const confirmer = page.getByRole('button', { name: re('Confirmer la remise du lot') })
  await page.getByRole('button', { name: re('J’accepte le constat en miroir') }).click()
  await expect(confirmer).toBeDisabled()
  await expect(page.getByText(re('La gérante n’a pas encore validé le lot'))).toBeVisible()
  expect((await journal(page)).some((e) => e.type === 'relay.drop.report_accepted' && e.colis === 'BLV-00014-1')).toBe(true)
  await duRelais(page, [{ type: 'relay.drop.validated', lot: LOT, emplacements: { 'BLV-00008-1': 'A-06', 'BLV-00009-1': 'B-05', 'BLV-00011-1': 'A-06' }, photoLot: true }])
  await page.reload()
  await confirmer.click()
  await page.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect(page.getByText(re('Dépôt complet · garde transférée'))).toBeVisible()
  const fait = (await journal(page)).find((e) => e.type === 'relay.drop.completed')
  expect(fait).toMatchObject({ app: 'livreur', lot: LOT, remis: ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'], refuses: ['BLV-00014-1'], mode: 'scan' })
})

test('collecte : le colis présenté par le relais se confirme ; la confirmation et le manquant repartent vers le relais', async ({ page }) => {
  test.setTimeout(180_000)
  await auRelais(page)
  await page.getByRole('button', { name: re('Elle scanne : tout est conforme') }).click()
  await page.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
  await page.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
  await page.getByRole('link', { name: re('Collecter les départs') }).click()
  await arriver(page)
  await expect(page.locator('#app main')).toContainText('Rose M.')
  await duRelais(page, [{ type: 'relay.departure.scanned', collecte: 'A4', colis: 'BLV-00004-2' }])
  await page.reload()
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await page.getByRole('button', { name: /^Signaler .* manquant$/ }).click()
  await expect.poll(async () => (await journal(page)).filter((e) => e.app === 'livreur' && e.type.startsWith('relay.departure')).map((e) => [e.type, e.colis]), { timeout: 15_000 }).toEqual([
    ['relay.departure.confirmed', ['BLV-00004-2']],
    ['relay.departure.missing', 'BLV-00003-1'],
  ])
})

// Console d'administration (« app: 'admin' ») → livreur : compte suspendu puis rétabli par BelivaY, selfie à reprendre
// (KYC), panne en bandeau tant qu'elle n'est pas rétablie, message diffusé : chacun en notification « BelivaY · … ».
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)

test('console : Serge suspendu puis rétabli par BelivaY, selfie à reprendre, panne en bandeau, message diffusé', async ({ page }) => {
  await ouvrir(page, '#aujourdhui', FR)
  await ajouter(page, [
    ADMIN({ type: 'livreur_suspendu', livreurId: 'l-serge', motif: 'Espèces demandées à un client, enquête en cours.', jusqua: LE + 7 * 86_400_000 }, 's1'),
    ADMIN({ type: 'livreur_suspendu', livreurId: 'l-josiane', motif: 'Autre livreur.', jusqua: null }, 's2'),
    ADMIN({ type: 'piece_demandee', piece: 'selfie', motif: 'Visage flou sur la dernière photo.', jusqua: LE + 3 * 86_400_000 }, 'k1'),
    ADMIN({ type: 'panne', id: 'INC-9', etat: 'declare', zones: ['Z1'], message: 'Réseau coupé à Bastos : gardez vos preuves.', relais: [] }, 'p1'),
    ADMIN({ type: 'diffusion', id: 'DIF-1', espaces: ['livreur'], zones: [], programmeeLe: LE, texte: 'Pluie forte cet après-midi : prudence.' }, 'd1'),
    ADMIN({ type: 'diffusion', id: 'DIF-2', espaces: ['vendeur'], zones: [], programmeeLe: LE, texte: 'Pour les vendeurs seulement.' }, 'd2'),
  ])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-9"]')).toContainText('Réseau coupé à Bastos')
  await page.goto('notifications')
  const main = page.locator('#app main')
  await expect(main).toContainText('BelivaY · Compte suspendu')
  await expect(main).toContainText('Espèces demandées à un client')
  await expect(main).not.toContainText('Autre livreur.')
  await expect(main).toContainText('BelivaY · Nouvelle photo demandée')
  await expect(main).toContainText('Pluie forte cet après-midi')
  await expect(main).not.toContainText('Pour les vendeurs seulement.')
  await ajouter(page, [ADMIN({ type: 'livreur_retabli', livreurId: 'l-serge', motif: 'Enquête close sans suite.' }, 'r1', LE + 1000), ADMIN({ type: 'panne', id: 'INC-9', etat: 'retabli', zones: ['Z1'], message: 'REPRISE', relais: [] }, 'p2', LE + 1000)])
  await page.reload()
  await expect(main).toContainText('BelivaY · Accès rétabli')
  await expect(page.locator('[data-console="panne-INC-9"]')).toHaveCount(0)
})

test('employeur : suspension datée, avertissement, horaires, zones et fin de contrat de Yafé Express arrivent chez Serge', async ({ page }) => {
  await ouvrir(page, '#aujourdhui', FR)
  const FIN = Date.parse('2026-10-20T13:00:00Z')
  const ev = (e: Record<string, unknown>, n: number) => ({ ...e, cle: `${e.type}-test`, app: 'entreprise', le: LE + n * 1000 })
  await page.evaluate(
    (l) => localStorage.setItem('blv_pont', JSON.stringify(l)),
    [
      ev({ type: 'emploi_suspendu', id: 'SU-1', livreurId: 'l-serge', motif: 'Colis remis sans photo deux fois.', jusqua: Date.parse('2026-10-16T22:00:00Z') }, 1),
      ev({ type: 'avertissement_ecrit', id: 'AV-1', livreurId: 'l-serge', motif: 'Retard de 40 minutes au ramassage.', rang: 1 }, 2),
      ev({ type: 'horaires_changes', livreurId: 'l-serge', creneaux: [{ jour: 0, de: '08:00', a: '16:00' }] }, 3),
      ev({ type: 'zones_changees', livreurId: 'l-serge', zones: ['Z6'], motif: null }, 4),
      ev({ type: 'fin_contrat', id: 'FC-1', livreurId: 'l-serge', motif: 'Réorganisation des zones.', preavisJusqua: FIN }, 5),
      ev({ type: 'emploi_suspendu', id: 'SU-X', livreurId: 'l-autre', motif: 'Pas pour Serge.', jusqua: null }, 6),
    ],
  )
  await page.reload()
  await expect(page.locator('[data-emploi="suspension"]')).toContainText('Suspendu par votre entreprise jusqu’au')
  await expect(page.locator('[data-emploi="suspension"]')).toContainText('Colis remis sans photo deux fois.')
  await expect(page.locator('[data-emploi="fin"]')).toContainText('Fin de contrat · préavis jusqu’au')
  await page.goto('notifications')
  await expect(page.locator('#app main')).toContainText('Avertissement écrit n° 1')
  await expect(page.locator('#app main')).toContainText('Horaires de travail changés')
  await expect(page.locator('#app main')).not.toContainText('Pas pour Serge.')
  // Moi : la zone confiée et la fin de contrat (sans « Annuler ma demande » : seule l'entreprise la retire).
  await page.goto('moi')
  await expect(page.locator('#app main')).toContainText('Biyem-Assi') // Z6 sur la carte du 23 oct. 2026
  await expect(page.locator('#app main')).toContainText('Fin de contrat décidée par Yafé Express')
  // L'entreprise lève la suspension et annule la fin de contrat : les bandeaux disparaissent.
  await page.evaluate(
    (l) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...l])),
    [
      { type: 'emploi_retabli', id: 'RE-1', livreurId: 'l-serge', motif: 'Point fait.', cle: 'emploi_retabli-test', app: 'entreprise', le: LE + 9000 },
      { type: 'fin_contrat_annulee', id: 'FC-1', livreurId: 'l-serge', cle: 'fin_contrat_annulee-test', app: 'entreprise', le: LE + 10_000 },
    ],
  )
  await page.reload()
  await expect(page.locator('[data-emploi]')).toHaveCount(0)
})
