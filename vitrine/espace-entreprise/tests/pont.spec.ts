// Pont avec l'espace livreur (src/demo/pont.ts, même appareil) : ce que Serge A. fait dans son application (arrêt fait,
// incident déclaré) se lit dans les missions et les incidents de Yafé ; une affectation à Serge part vers lui. DP-66 :
// sa demande de départ et son absence prévenue arrivent chez l'entreprise ; la clôture de son départ (refusée tant
// que sa tournée n'est pas finie), le kit constaté et l'absence vue repartent vers lui. DP-67 : absence avec motif de
// liste, texte et repères ; contestation de la retenue du kit reçue ; depart_kit (constat, manquants, retenue),
// depart_clos (kitNonConteste, versement), versement_fait et piece_demandee (jusqua) publiés.
import { expect, test } from '@playwright/test'
import { adresse, figerHorloge, ouvrir } from './commun'
import { PARAMETRES_FLOTTE as P } from '../src/calculs/flotte'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const LE = Date.parse('2026-10-13T13:03:00Z')
const DU_LIVREUR = [
  { type: 'arret', paquetId: 'PQ-Z1-261013-003', arretId: 'A2', etat: 'fait', cle: 'arret-A2-fait', app: 'livreur', le: LE },
  { type: 'incident', id: 'IN-122', paquetId: 'PQ-Z1-261013-003', lieu: 'Relais Bastos Carrefour', famille: 'relais', genre: 'relais_ferme', note: 'Rideau baissé à 15 h 10, la gérante ne répond pas.', bloquant: true, cle: 'incident-IN-122', app: 'livreur', le: LE + 60_000 },
]

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('les gestes du livreur de démonstration se lisent dans les missions et les incidents', async ({ page }) => {
  await ouvrir(page, adresse('incidents', 'id=IN-122'), FR)
  // Serge agit dans son application, sur le même appareil (journal partagé du pont).
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), DU_LIVREUR)
  await page.reload()
  await expect(page.locator('#contenu')).toContainText('Rideau baissé à 15 h 10') // IN-122, déclaré par Serge
  await expect(page.locator('#contenu')).toContainText('Serge A.')
  await page.goto(adresse('paquet', 'id=PQ-Z1-261013-003'))
  await expect(page.locator('#contenu')).toContainText('Maison Ngono')
})

test('Serge A., en tournée dans son application, est en mission chez l’entreprise : écarté de l’affectation', async ({ page }) => {
  await ouvrir(page, adresse('affectation', 'id=PQ-Z3-261013-007'), FR)
  await expect(page.locator('.lv-non', { hasText: 'Serge A.' })).toContainText('Déjà en mission')
  await page.goto(adresse('livreur', 'id=l-serge'))
  await expect(page.locator('#contenu')).toContainText('En tournée')
})

const PREAVIS = Date.parse('2026-10-20T13:00:00Z')
const DEMANDES = [
  { type: 'depart_demande', id: 'DP-SERGE', motif: 'horaires', texte: 'Je reprends mes études le soir.', preavisJusqua: PREAVIS, cle: 'depart_demande-DP-SERGE', app: 'livreur', le: LE },
  { type: 'absence', id: 'AB-SERGE', du: '2026-10-15', au: '2026-10-15', motif: 'demarches', texte: 'Rendez-vous à la préfecture', imprevu: false, apresDebut: false, cle: 'absence-AB-SERGE', app: 'livreur', le: LE + 1000 },
  { type: 'piece_envoyee', piece: 'cni', cle: 'piece_envoyee-cni', app: 'livreur', le: LE + 2000 },
]
type Ev = { type: string; app: string; id?: string; par?: string; [k: string]: unknown }
const lirePont = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as Ev[])

test('DP-66 : la demande de départ, l’absence et la pièce renvoyée de Serge arrivent ; en tournée, sa clôture est refusée', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), DEMANDES)
  await page.reload()
  const bloc = page.locator('#depart')
  await expect(bloc).toContainText('Horaires')
  await expect(bloc).toContainText('Je reprends mes études le soir.')
  await expect(bloc).toContainText('une mission est encore en cours')
  await expect(bloc.getByRole('button', { name: 'Clôturer le départ' })).toBeDisabled()
  await expect(page.locator('.panel', { hasText: 'Absences prévenues' })).toContainText('Démarches')
  await expect(page.locator('.panel', { hasText: 'Absences prévenues' })).toContainText('« Rendez-vous à la préfecture »')
  // Kit constaté et absence vue : Serge le voit dans son application.
  await bloc.getByRole('button', { name: 'Constater : kit restitué' }).click()
  await page.locator('.panel', { hasText: 'Absences prévenues' }).getByRole('button', { name: 'Marquer comme vue' }).click()
  await expect.poll(async () => (await lirePont(page)).filter((e) => e.app === 'entreprise').map((e) => e.type)).toEqual(['depart_kit', 'absence_vue'])
  expect((await lirePont(page)).find((e) => e.type === 'depart_kit')).toMatchObject({ id: 'DP-SERGE', constat: 'restitue', manquants: [], retenue: 0 })
  // La pièce d'identité renvoyée passe « à contrôler » dans la file des pièces.
  await page.goto(adresse('pieces', 'id=l-serge'))
  await expect(page.locator('#piece-identite')).toContainText('À contrôler')
  await page.goto(adresse('flotte', 'statut=departs'))
  await expect(page.locator('section[aria-label="Départs"]')).toContainText('Serge A.')
})

test('DP-66 : tournée finie et paquets rendus, la clôture du départ de Serge part vers lui ; une annulation retire la demande', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  const fini = [
    ...['A1', 'A2', 'A3'].map((a, k) => ({ type: 'arret', paquetId: 'PQ-Z1-261013-003', arretId: a, etat: 'fait', cle: 'arret-' + a, app: 'livreur', le: LE + k })),
    ...['A4', 'A5'].map((a, k) => ({ type: 'arret', paquetId: 'PQ-Z1-261013-006', arretId: a, etat: 'fait', cle: 'arret-' + a, app: 'livreur', le: LE + 10 + k })),
    ...['A6', 'A7'].map((a, k) => ({ type: 'arret', paquetId: 'PQ-Z1-261013-008', arretId: a, etat: 'fait', cle: 'arret-' + a, app: 'livreur', le: LE + 20 + k })),
    ...['007', '011', '012', '013'].map((n) => ({ type: 'rendu', paquetId: 'PQ-Z1-261013-' + n, motif: 'Fin de mes missions', cle: 'rendu-' + n, app: 'livreur', le: LE + 30 })),
  ]
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), [...DEMANDES.slice(0, 1), ...fini])
  await page.reload()
  const bloc = page.locator('#depart')
  await expect(bloc).toContainText('Toutes ses missions sont finies')
  await bloc.getByRole('button', { name: 'Constater : kit restitué' }).click()
  await bloc.getByRole('button', { name: 'Clôturer le départ' }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Clôturer définitivement' }).click()
  await expect(page.locator('#contenu')).toContainText('Départ de Serge A. clôturé')
  await expect.poll(async () => (await lirePont(page)).find((e) => e.type === 'depart_clos')).toMatchObject({ app: 'entreprise', id: 'DP-SERGE', par: 'entreprise', kitNonConteste: false, versement: { du: null, verse: null, retenueKit: 0, kitDeCote: 0 } })
  // Dernier versement Mobile Money marqué fait : Serge reçoit son SMS.
  await page.locator('.panel', { hasText: 'Départs clôturés' }).locator('.li', { hasText: 'Serge A.' }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Marquer le versement Mobile Money fait' }).click()
  await expect.poll(async () => (await lirePont(page)).find((e) => e.type === 'versement_fait')).toMatchObject({ app: 'entreprise', id: 'DP-SERGE', montant: null })

  // Une autre visite : Serge demande puis annule ; la demande disparaît de la file.
  await page.evaluate(() => localStorage.clear())
  await page.goto(adresse('flotte', 'statut=departs'))
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), [DEMANDES[0], { type: 'depart_annule', id: 'DP-SERGE', cle: 'depart_annule-DP-SERGE', app: 'livreur', le: LE + 5000 }])
  await page.reload()
  await expect(page.locator('section[aria-label="Départs"]')).toContainText('Josiane E.')
  await expect(page.locator('section[aria-label="Départs"]')).not.toContainText('Serge A.')
})

// Le point relais (même appareil) : le lot confirmé par Serge au Relais Bastos Carrefour valide la mission ; un colis
// refusé par la gérante arrive en incident ; la saturation du relais arrive en alerte (paquets réorientés, PR-RC-05).
const DU_RELAIS = [
  { type: 'relay.drop.item_result', lot: 'PQ-Z1-261013-003', colis: 'BLV-00014-1', resultat: 'refuse', motif: 'Scellé cassé', photos: 2, cle: 'item-14', app: 'relais', le: LE },
  { type: 'relay.drop.completed', lot: 'PQ-Z1-261013-003', arretId: 'A3', remis: ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'], refuses: ['BLV-00014-1'], mode: 'scan', cle: 'depot-003', app: 'livreur', le: LE + 60_000 },
  { type: 'relay.stock.updated', occupees: 57, declarees: 60, sature: true, cle: 'stock-57', app: 'relais', le: LE + 120_000 },
]

test('relais : mission validée au dépôt, colis refusé en incident, saturation en alerte', async ({ page }) => {
  await ouvrir(page, adresse('notifications'), FR)
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), DU_RELAIS)
  await page.reload()
  const contenu = page.locator('#contenu')
  await expect(contenu).toContainText('Mission validée au relais')
  await expect(contenu).toContainText('3 colis gardés par le Relais Bastos Carrefour')
  await expect(contenu).toContainText('Relais saturé')
  await page.goto(adresse('incidents', 'id=IN-R000141'))
  await expect(contenu).toContainText('BLV-00014-1 refusé au Relais Bastos Carrefour : Scellé cassé')
})

test('DP-67 : kit incomplet constaté avec photo (retenue publiée) ; la contestation de Serge arrive, le constat est figé', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), DEMANDES.slice(0, 1))
  await page.reload()
  const kit = page.locator('#depart section[aria-label="Kit rendu"]')
  await kit.getByRole('radio', { name: 'Incomplet' }).click()
  await kit.getByRole('checkbox', { name: /sac de transport étanche/ }).check()
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 700
    c.getContext('2d')!.fillRect(0, 0, 10, 10)
    return c.toDataURL('image/png').split(',')[1]
  })
  await kit.getByLabel('Choisir la photo du kit').setInputFiles({ name: 'kit.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await kit.getByRole('button', { name: 'Constater : kit incomplet' }).click()
  await expect(kit).toContainText('Kit incomplet : sac de transport étanche')
  await expect.poll(async () => (await lirePont(page)).find((e) => e.type === 'depart_kit')).toMatchObject({ app: 'entreprise', id: 'DP-SERGE', constat: 'incomplet', manquants: ['sac de transport étanche'], retenue: P.kit.elements.find((e) => e.libelle === 'sac de transport étanche')!.valeur })
  // Serge conteste depuis son application : BelivaY examine, le montant est mis de côté, le constat ne se corrige plus.
  await page.evaluate((e) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), e])), { type: 'kit_conteste', id: 'DP-SERGE', motif: 'J’ai rendu le sac à Serge Mbarga lundi.', cle: 'kit_conteste-DP-SERGE', app: 'livreur', le: LE + 5000 })
  await page.reload()
  await expect(kit).toContainText('Retenue contestée par Serge le')
  await expect(kit).toContainText('« J’ai rendu le sac à Serge Mbarga lundi. »')
  await expect(kit).toContainText('BelivaY examine ; le montant est mis de côté jusqu’à sa décision.')
  await expect(kit.getByRole('button', { name: 'Corriger le constat' })).toHaveCount(0)
})

test('DP-67 : préavis échu depuis plus de 72 h : « incomplet » refusé, « restitué » reste possible ; nouvelle photo demandée avec son échéance', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  const vieux = { ...DEMANDES[0], preavisJusqua: LE - 4 * 86_400_000, le: LE - 11 * 86_400_000 }
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), [vieux])
  await page.reload()
  const kit = page.locator('#depart section[aria-label="Kit rendu"]')
  await expect(kit).toContainText('Délai du constat passé : le constat « incomplet » n’est plus reçu')
  await expect(kit.getByRole('radio', { name: 'Incomplet' })).toBeDisabled()
  await kit.getByRole('button', { name: 'Constater : kit restitué' }).click()
  await expect(kit).toContainText('Kit restitué')
  // Nouvelle photo : piece_demandee porte la fin du délai PHOTO-REVERIF-J.
  await page.goto(adresse('pieces', 'id=l-serge&sheet=photo'))
  await page.locator('.sheet').getByRole('button', { name: /Contrôle périodique/ }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Demander la nouvelle photo' }).click()
  const fige = Date.parse('2026-10-13T13:05:00.500Z')
  await expect.poll(async () => (await lirePont(page)).find((e) => e.type === 'piece_demandee')).toMatchObject({ app: 'entreprise', piece: 'selfie', jusqua: fige + P.photoReverifJours * 86_400_000 })
})

// Console d'administration (espace-admin, « app: 'admin' ») → entreprise : suspension par BelivaY puis rétablissement,
// clôture d'office d'un départ (kit non contesté), décision sur une retenue de kit contestée.
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: import('@playwright/test').Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)

test('console : Serge suspendu par BelivaY (non levable ici) puis rétabli ; départ de Kevin clôturé d’office', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  await ajouter(page, [ADMIN({ type: 'livreur_suspendu', livreurId: 'l-serge', motif: 'Espèces demandées à un client, enquête en cours.', jusqua: LE + 7 * 86_400_000 }, 's1'), ADMIN({ type: 'livreur_suspendu', livreurId: 'l-inconnu', motif: 'x', jusqua: null }, 's2')])
  await page.reload()
  await expect(page.locator('#contenu')).toContainText('Espèces demandées à un client, enquête en cours.')
  await page.goto(adresse('flotte'))
  const serge = page.locator('#contenu tr').filter({ hasText: 'Serge A.' })
  await expect(serge).toContainText('Suspendu par BelivaY')
  await ajouter(page, [ADMIN({ type: 'livreur_retabli', livreurId: 'l-serge', motif: 'Enquête close sans suite.' }, 'r1', LE + 1000)])
  await page.reload()
  await expect(serge).not.toContainText('Suspendu')
  const versement = { du: 9800, missions: 14, retenuLitiges: 0, litiges: 0, retenueKit: 0, kitDeCote: 0, verse: 9800 }
  await ajouter(page, [ADMIN({ type: 'depart_clos', id: 'DP-0398', par: 'admin', versementLe: LE + 3 * 86_400_000, kitNonConteste: true, versement }, 'c1', LE + 2000)])
  await page.goto(adresse('livreur', 'id=l-kevin'))
  await expect(page.locator('#contenu')).toContainText('Kevin D. est parti : départ clôturé')
  await page.getByRole('link', { name: 'Voir son départ' }).click()
  await expect(page.locator('#contenu')).toContainText('Clôturé par BelivaY')
  await expect(page.locator('#contenu')).toContainText('kit non contesté')
})

test('console : la retenue de kit contestée par Serge est annulée par BelivaY ; l’entreprise voit la décision', async ({ page }) => {
  await ouvrir(page, adresse('livreur', 'id=l-serge'), FR)
  await page.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), DEMANDES.slice(0, 1))
  await page.reload()
  const kit = page.locator('#depart section[aria-label="Kit rendu"]')
  await kit.getByRole('radio', { name: 'Incomplet' }).click()
  await kit.getByRole('checkbox', { name: /sac de transport étanche/ }).check()
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 700
    c.getContext('2d')!.fillRect(0, 0, 10, 10)
    return c.toDataURL('image/png').split(',')[1]
  })
  await kit.getByLabel('Choisir la photo du kit').setInputFiles({ name: 'kit.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await kit.getByRole('button', { name: 'Constater : kit incomplet' }).click()
  await expect(kit).toContainText('Kit incomplet : sac de transport étanche')
  await ajouter(page, [{ type: 'kit_conteste', id: 'DP-SERGE', motif: 'J’ai rendu le sac lundi.', cle: 'kit_conteste-DP-SERGE', app: 'livreur', le: LE + 5000 }, ADMIN({ type: 'kit_decide', id: 'DP-SERGE', decision: 'retenue_annulee', motif: 'Sac retrouvé au dépôt.' }, 'k1', LE + 6000)])
  await page.reload()
  await expect(kit).toContainText('BelivaY a annulé la retenue : le montant lui est versé.')
})

// Console → Yafé Express elle-même : pièce à renvoyer (KYC), panne et maintenance (bandeau), litige où le transporteur
// est en cause et grille annoncée (notification « BelivaY · … »).
test('console : Yafé Express voit la panne, la maintenance et la pièce à renvoyer en bandeau, le litige et la grille en notification', async ({ page }) => {
  await ouvrir(page, adresse('tableau'), FR)
  await ajouter(page, [
    ADMIN({ type: 'panne', id: 'INC-7', etat: 'declare', zones: ['Z1'], message: 'Paiements en attente : les remises continuent.', relais: [] }, 'p1'),
    ADMIN({ type: 'maintenance_annoncee', id: 'MT-2', service: 'Application', debut: LE + 86_400_000, fin: LE + 90_000_000 }, 'm1'),
    ADMIN({ type: 'kyc_decide', dossier: 'KYC-0201', espace: 'entreprise', acteur: 'ent-yafe', decision: 'complement', pieces: [{ nature: 'Assurance responsabilité civile', motif: 'Attestation illisible' }] }, 'k1'),
    ADMIN({ type: 'kyc_decide', dossier: 'KYC-0202', espace: 'vendeur', acteur: 'b-tontonnl', decision: 'rejete', pieces: [] }, 'k2'),
    ADMIN({ type: 'litige_decide', id: 'LIT-1', commande: 'BLV-52108', decision: 'transporteur', motif: 'Scellé ouvert à la remise.', montant: 65000, transporteurEnCause: true }, 'l1'),
    ADMIN({ type: 'grille_annoncee', version: 'V03', dateEffet: LE + 30 * 86_400_000 }, 'g1'),
  ])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-7"]')).toContainText('Paiements en attente')
  await expect(page.locator('[data-console="maintenance-MT-2"]')).toContainText('Maintenance prévue')
  await expect(page.locator('[data-console="kyc"]')).toContainText('Attestation illisible')
  await expect(page.locator('#contenu')).not.toContainText('Dossier refusé') // décision d'un autre espace
  await page.goto(adresse('notifications'))
  await expect(page.locator('#contenu')).toContainText('BelivaY · Litige : transporteur en cause')
  await expect(page.locator('#contenu')).toContainText('BelivaY · Nouvelle grille tarifaire')
  await ajouter(page, [ADMIN({ type: 'panne', id: 'INC-7', etat: 'retabli', zones: ['Z1'], message: 'REPRISE', relais: [] }, 'p2', LE + 1000)])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-7"]')).toHaveCount(0)
})
