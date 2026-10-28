// L'espace point relais en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit
// (backend-kit/_essai, Django + les applications relais_* et tout le kit), lancé par pw-api.config.ts (serveur 8050,
// base essai-relais.sqlite3 ; appli 5220).
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par les écrans de l'appli (src/donnees/source.ts → src/api/domaines → client HTTP) et par les
// vraies routes /api/relay/… Ce que font le livreur, l'application du client, l'agrégateur Mobile Money et les tâches
// planifiées passe par les routes réservées à l'essai (/api/_essai/…, relaya_essai/essai_relais.py) ; les codes SMS sont
// lus comme la gérante les lirait sur son téléphone (/api/_essai/codes).
import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = `http://localhost:${process.env.PORT_API_RELAIS || 8050}/api`

test.describe.configure({ mode: 'serial' })

interface Monde {
  relais: { id: number; nom: string; zone: string; quartier: string }
  gerante: { prenom: string; telephone: string; pin: string }
  employe: { prenom: string; telephone: string; pin: string }
}
let monde: Monde
let page: Page

async function essai<T = Record<string, unknown>>(api: APIRequestContext, chemin: string, data: object = {}): Promise<T> {
  const r = await api.post(`${API}/_essai/${chemin}`, { data })
  expect(r.ok(), `POST /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json() as Promise<T>
}
async function lire<T = Record<string, unknown>>(api: APIRequestContext, chemin: string): Promise<T> {
  const r = await api.get(`${API}/_essai/${chemin}`)
  expect(r.ok(), `GET /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json() as Promise<T>
}
/** Le code SMS reçu par ce numéro (le téléphone de la gérante). */
const codeSms = async (api: APIRequestContext, numero: string) => (await lire<{ code: string }>(api, `codes?destination=${numero}`)).code

/** Appelle `domaine.methode` de la source de l'appli (le même module que les écrans) dans la page. */
async function src<T = unknown>(p: Page, cle: string, ...args: unknown[]): Promise<T> {
  const r = await p.evaluate(
    async ([c, a]) => {
      const [d, m] = (c as string).split('.')
      const mod = (await import(/* @vite-ignore */ '/relais/src/donnees/source.ts')) as { source: Record<string, Record<string, (...x: unknown[]) => Promise<unknown>>> }
      try {
        return { ok: true, v: await mod.source[d][m](...(a as unknown[])) }
      } catch (e) {
        return { ok: false, nom: (e as Error).name, code: (e as { code?: string }).code ?? null, message: (e as Error).message }
      }
    },
    [cle, args] as const,
  )
  const x = r as { ok: boolean; v?: unknown; nom?: string; code?: string | null; message?: string }
  if (!x.ok) throw new Error(`${cle} : ${x.nom} ${x.code ?? ''} ${x.message}`)
  return x.v as T
}
const origine = () => ({ cle: `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, heure: Date.now(), position: null })

test.beforeAll(async ({ browser, request }) => {
  monde = await essai<Monde>(request, 'relais/monde')
  page = await browser.newPage()
  // Appareil photo : celui du navigateur piloté (flux simulé, pw-api.config.ts) pour les photos de preuve ; au guichet
  // (réception, retrait), « aucun appareil » ouvre le pavé où l'on tape le code et l'étiquette.
  await page.addInitScript(() => {
    const md = navigator.mediaDevices
    if (md && /\/(reception|retrait|camera)/.test(location.pathname))
      Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
  })
  // Les requêtes de l'appli (autre origine que l'API : CORS) ne doivent jamais échouer en silence.
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
})
test.afterAll(async () => {
  await page?.close()
})

test('connexion à l’écran : numéro de la gérante, code SMS (lu sur son téléphone), PIN, Aujourd’hui', async ({ request }) => {
  await page.goto('connexion')
  const numero = page.getByLabel('Numéro', { exact: true })
  await numero.fill('612345678')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Ce numéro n’est lié à aucun relais')).toBeVisible()
  await numero.fill(monde.gerante.telephone)
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Nouveau téléphone' })).toBeVisible()
  const code = page.getByPlaceholder('000000')
  await code.fill('000000')
  await expect(page.getByText(/Code\sincorrect/)).toBeVisible()
  await code.fill(await codeSms(request, monde.gerante.telephone))
  await expect(page.getByText(`Bonjour ${monde.gerante.prenom}`)).toBeVisible()
  await page.keyboard.type('999999')
  await expect(page.getByText(/PIN\sincorrect/)).toBeVisible()
  await page.waitForTimeout(300)
  await page.keyboard.type(monde.gerante.pin)
  await expect(page).toHaveURL(/\/relais\/?$/)
  const s = await src<{ connecte: boolean; membre: { prenom: string; role: string }; relais: { nom: string } }>(page, 'session.session')
  expect(s.connecte).toBe(true)
  expect(s.membre.prenom).toBe('Rose')
  expect(s.relais.nom).toBe(monde.relais.nom)
})

// ——— Réception d'un lot ———

const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
const pave = async (chiffres: string) => {
  for (const k of chiffres) await page.locator('main').getByRole('button', { name: k, exact: true }).click()
}
/** Étiquette au pavé : « BLV-<commande>-<n> » s'écrit en 6 chiffres (commande sur 5, numéro du colis). */
const etiquette = (commande: number, n = 1) => String(commande).padStart(5, '0') + n
let depot: { code: string; arret: number; commandes: number[] }

test('réception à l’écran : code de dépôt du livreur, scans, photo du lot et PIN, le livreur confirme : lot reçu', async ({ request }) => {
  depot = await essai(request, 'relais/depots', { n: 2 })
  await page.goto('reception')
  await pave('000000')
  await expect(page.getByText(/Code incorrect/)).toBeVisible()
  await pave(depot.code)
  await expect(page.getByText('CODE DE DÉPÔT VALIDÉ', { exact: true })).toBeVisible()
  await expect(page.getByText('sur 2 colis scannés')).toBeVisible()
  for (const c of depot.commandes) {
    await pave(etiquette(c))
    await expect(page.getByText(new RegExp(`BLV-${c}-1 → rangez`))).toBeVisible()
  }
  await page.getByRole('button', { name: 'Terminer' }).click()
  const f = page.getByRole('dialog')
  await f.locator('input[type=file]').setInputFiles(PHOTO)
  for (const k of '000000') await f.getByRole('button', { name: k, exact: true }).click()
  await expect(f.getByText('PIN incorrect. Réessayez.')).toBeVisible()
  for (const k of monde.gerante.pin) await f.getByRole('button', { name: k, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Le livreur confirme le lot' })).toBeVisible()
  expect(await essai(request, `relais/depots/${depot.arret}/confirmer`)).toEqual({ ok: true })
  await expect(page.getByRole('heading', { name: 'Lot reçu · 2 colis' })).toBeVisible({ timeout: 30_000 })
})

// ——— Retrait avec le code du client, garde encaissée ———

const tx = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s'))
const zone = async () => ((await page.getByRole('dialog').count()) ? page.getByRole('dialog') : page.locator('main'))
const taper = async (chiffres: string) => {
  const z = await zone()
  for (const k of chiffres) await z.getByRole('button', { name: k, exact: true }).click()
}

test('retrait à l’écran : code du client (lu dans son application), garde due encaissée, photo, « Remis », PIN', async ({ request }) => {
  const commande = depot.commandes[0]
  await essai(request, 'relais/garde', { commande, jours: 6 })
  const { codes } = await lire<{ codes: { ref: string; etat: string; code: string }[] }>(request, `relais/codes/${commande}`)
  expect(codes).toHaveLength(1)
  await page.goto('retrait')
  await expect(page.getByText(tx('Appareil photo indisponible : tapez le code.'))).toBeVisible()
  await taper('000000')
  // Code qui ne vise aucun colis : refus sans compte d'essais (le serveur ne sait pas quel colis il visait).
  await expect(page.getByRole('alert', { name: 'Code incorrect' })).toContainText('ne correspond à aucun colis prêt')
  await page.getByRole('button', { name: 'Ressaisir le code' }).click()
  await taper(codes[0].code)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await expect(page.locator('.cpt-emp-v')).toBeVisible()
  const remis = page.getByRole('button', { name: 'Remis', exact: true })
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await expect(page.getByText('Encaissez d’abord la garde.')).toBeVisible()
  await expect(remis).toBeDisabled()
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await expect(page.getByText(/Garde\s[\d\s ]+F\sencaissée/)).toBeVisible()
  await expect(remis).toBeEnabled()
  await remis.click()
  await expect(page).toHaveURL(/pin-remise\?remise=/)
  await taper(monde.gerante.pin)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  expect((await lire<{ codes: { etat: string }[] }>(request, `relais/codes/${commande}`)).codes[0].etat).toBe('remis')
})

// ——— Encaissement au comptoir : commande payable au retrait, Mobile Money ———

/** Un lot reçu par la source de l'appli (mêmes connecteurs que les écrans), puis confirmé par le livreur. */
async function recevoirParLaSource(request: APIRequestContext, comptoir = false) {
  const d = await essai<{ code: string; arret: number; commandes: number[] }>(request, 'relais/depots', { n: 1, comptoir })
  const v = await src<{ ok: boolean; lot: string }>(page, 'reception.verifierCodeDepot', d.code, origine())
  expect(v.ok, JSON.stringify(v)).toBe(true)
  for (const c of d.commandes) expect(await src(page, 'reception.resultat', v.lot, `BLV-${c}-1`, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null }, origine())).toEqual({ ok: true })
  expect(await src(page, 'reception.validerLot', v.lot, 'photo-lot', monde.gerante.pin, origine())).toMatchObject({ ok: true })
  expect(await essai(request, `relais/depots/${d.arret}/confirmer`)).toEqual({ ok: true })
  return d
}

test('encaissement au comptoir : commande cherchée par sa référence, demande Mobile Money, paiement confirmé, code, remise', async ({ request }) => {
  const d = await recevoirParLaSource(request, true)
  const commande = d.commandes[0]
  await page.goto('retrait')
  await page.getByRole('button', { name: 'À payer au comptoir' }).click()
  await page.getByLabel('RÉFÉRENCE OU NUMÉRO DU CLIENT').fill(`BLV-${commande}`)
  await page.getByRole('button', { name: 'Rechercher' }).click()
  await expect(page.getByText(/Articles\s:\s[\d\s ]+F\sen\sMobile\sMoney/)).toBeVisible()
  await page.getByRole('button', { name: 'Envoyer la demande de paiement' }).click()
  await expect(page.getByText(/Demande envoyée · (MTN|Orange) MoMo · en attente/)).toBeVisible()
  // L'agrégateur confirme (webhook) : l'écran le voit à sa relecture.
  const { mobileMoney } = await lire<{ mobileMoney: { reference: string }[] }>(request, 'paiements')
  const reference = mobileMoney.map((x) => x.reference).reverse().find((x) => x.startsWith('BLV-RC-'))
  expect(reference).toBeTruthy()
  await essai(request, 'paiements/confirmer', { reference, reussi: true })
  await expect(page.getByText(/Articles payés par Mobile Money/)).toBeVisible({ timeout: 15_000 })
  const { codes } = await lire<{ codes: { code: string }[] }>(request, `relais/codes/${commande}`)
  await page.getByRole('button', { name: /Scanner le code du colis qui manque/ }).click()
  await taper(codes[0].code)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  const juste = page.getByRole('button', { name: 'Compte juste' })
  if (await juste.count()) await juste.click()
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await page.getByRole('button', { name: 'Remis', exact: true }).click()
  await taper(monde.gerante.pin)
  await expect(page.getByText('Colis retiré')).toBeVisible()
})

// ——— Hors connexion : un geste signé du PIN part en file, avec la preuve de l'appareil, jamais le PIN ———

test('hors connexion : lot validé sans réseau (PIN vérifié par la preuve signée), file rejouée au retour du réseau', async ({ request }) => {
  const d = await essai<{ code: string; arret: number; commandes: number[] }>(request, 'relais/depots', { n: 1 })
  const v = await src<{ ok: boolean; lot: string }>(page, 'reception.verifierCodeDepot', d.code, origine())
  expect(v.ok).toBe(true)
  expect(await src(page, 'reception.resultat', v.lot, `BLV-${d.commandes[0]}-1`, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null }, origine())).toEqual({ ok: true })
  await page.goto('./')
  // Le module se charge avant la coupure (sans réseau, le serveur de l'appli ne le servirait plus).
  await page.evaluate(() => Promise.all([import(/* @vite-ignore */ '/relais/src/donnees/fileHorsLigne.ts'), import(/* @vite-ignore */ '/relais/src/donnees/source.ts')]))
  await page.context().setOffline(true)
  const enFile = await page.evaluate(
    async ([lot, pin]) => {
      const f = (await import(/* @vite-ignore */ '/relais/src/donnees/fileHorsLigne.ts')) as typeof import('../src/donnees/fileHorsLigne')
      const o = f.origine(Date.now())
      const x = await f.geste(false, 'validation_lot', lot, o, (s) => s.reception.validerLot(lot, 'photo-lot', pin, o), { local: true, photos: 1 })
      return x.etat
    },
    [v.lot, monde.gerante.pin] as const,
  )
  expect(enFile).toBe('en_file')
  const file = await src<{ actions: { etat: string; charge?: { args: unknown[] } }[] }>(page, 'horsligne.file')
  const action = file.actions.at(-1)!
  expect(action.etat).toBe('en_attente')
  expect(JSON.stringify(action.charge)).not.toContain(monde.gerante.pin)
  await page.context().setOffline(false)
  // Au retour du réseau, la file part toute seule (useReseauGlobal) ; le serveur rejoue le geste par sa route.
  await expect.poll(async () => (await src<{ actions: { etat: string; motif: string | null }[] }>(page, 'horsligne.file')).actions.at(-1), { timeout: 15_000 }).toMatchObject({ etat: 'envoyee', motif: null })
  const lot = await src<{ valideA: number | null }>(page, 'reception.lot', v.lot)
  expect(lot.valideA).toBeTruthy()
  expect(await essai(request, `relais/depots/${d.arret}/confirmer`)).toEqual({ ok: true })
})

// ——— Retours : un retour validé déposé par le client ———

async function photoFeuille(bouton: ReturnType<Page['locator']>) {
  await bouton.click()
  const feuille = page.getByRole('dialog', { name: 'Appareil photo' })
  await expect(feuille).toBeVisible()
  await feuille.getByRole('button', { name: 'Prendre la photo' }).click()
  await expect(feuille).toBeHidden()
}

test('retour à l’écran : numéro inconnu refusé, retour validé (console) scellé, photos, PIN : déposé', async ({ request }) => {
  const { reference } = await essai<{ reference: string }>(request, 'relais/retours', { commande: depot.commandes[0] })
  await page.goto('litiges?onglet=retour')
  const champ = page.getByRole('textbox', { name: 'Numéro du retour' })
  await champ.fill('RT-00000')
  await champ.press('Enter')
  await expect(page.getByText('Étiquette inconnue : vérifiez la référence (RT-…).')).toBeVisible()
  await champ.fill(reference)
  await champ.press('Enter')
  await expect(page.getByText('Motif validé')).toBeVisible()
  const sceller = page.getByRole('button', { name: /Scellé du retour posé/ })
  await page.getByRole('checkbox', { name: 'J’ai posé le scellé du retour sur le colis' }).click()
  await photoFeuille(sceller)
  await photoFeuille(page.getByRole('button', { name: /Scellé du retour posé/ }))
  await page.getByRole('button', { name: 'Enregistrer le dépôt' }).click()
  await page.locator('#r7-pin').fill(monde.gerante.pin)
  await page.getByRole('button', { name: 'Signer avec mon PIN' }).click()
  await expect(page.getByText(new RegExp(`${reference} déposé et scellé`))).toBeVisible()
})

// ——— Versements (gérante) ———

test('versements à l’écran : arrêté de la semaine (tâche du vendredi), relevé ligne par ligne, versement non reçu signalé', async ({ request }) => {
  const v = await essai<{ reference: string; etat: string; total: number }>(request, 'relais/versements')
  expect(v.reference).toMatch(/^BLV-VP-\d{4}$/)
  await page.goto('versements')
  const m = page.locator('main')
  await expect(m).toContainText('Gagné cette semaine')
  await page.getByRole('link', { name: new RegExp(v.reference) }).click()
  await expect(page).toHaveURL(/releve\?v=/)
  await expect(m).toContainText(v.reference)
  const signaler = page.getByRole('button', { name: 'Signaler un versement non reçu' })
  if (v.total > 0) {
    // Envoyé par Mobile Money au numéro vérifié du relais : il peut être signalé non reçu, une fois.
    expect(v.etat).toBe('envoye')
    await signaler.click()
    await expect(m).toContainText(/BelivaY vous répond/)
    await expect(signaler).toHaveCount(0)
  } else {
    // Semaine négative (espèces de garde gardées par le relais, plus que ses gains) : rien n'est envoyé, la dette est
    // reportée sur la semaine suivante ; rien à signaler.
    expect(v.etat).toBe('credite')
    await expect(signaler).toHaveCount(0)
  }
  await page.goto('releve')
  await expect(m).toContainText('Toutes les semaines')
})

test('numéro de versement : préfixe vérifié, deux codes SMS (nouveau numéro et téléphone de la gérante), changement annulé', async ({ request }) => {
  await page.goto('changer-momo')
  const m = page.locator('main')
  await page.getByRole('button', { name: 'Orange Money' }).click()
  await page.getByLabel('NUMÉRO').fill('677 40 21 18')
  await expect(m).toContainText('Ce préfixe ne correspond pas à l’opérateur choisi.')
  await page.getByRole('button', { name: 'MTN MoMo' }).click()
  await page.getByRole('button', { name: 'Recevoir les deux codes' }).click()
  await expect(m).toContainText('Deux codes à 6 chiffres sont partis par SMS')
  await page.getByLabel('CODE REÇU AU NOUVEAU NUMÉRO').fill('000000')
  await page.getByLabel('CODE REÇU SUR VOTRE TÉLÉPHONE').fill(await codeSms(request, monde.gerante.telephone))
  await page.getByRole('button', { name: 'Valider le numéro' }).click()
  await expect(m).toContainText('Un des deux codes est faux.')
  await page.getByLabel('CODE REÇU AU NOUVEAU NUMÉRO').fill(await codeSms(request, '677402118'))
  await page.getByRole('button', { name: 'Valider le numéro' }).click()
  await expect(m).toContainText('Nouveau numéro enregistré')
  await page.getByRole('link', { name: 'Retour aux versements' }).click()
  await page.getByRole('link', { name: 'Voir le changement en cours' }).click()
  await page.getByRole('button', { name: 'Annuler ce changement' }).click()
  await page.getByRole('button', { name: 'Oui, annuler le changement' }).click()
  await expect(page.getByRole('button', { name: 'Recevoir les deux codes' })).toBeVisible()
})

// ——— Mon compte : photo, numéro, appareils ———

test('compte à l’écran : photo recadrée enregistrée par le serveur (en-tête), numéro masqué, cet appareil listé', async () => {
  await page.goto('mon-compte')
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 600
    const x = c.getContext('2d')!
    x.fillStyle = '#C2410C'
    x.fillRect(0, 0, 900, 600)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.locator('[data-ck="changer-photo"]').click()
  await page.locator('input[data-ck="galerie"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await expect(page.locator('[data-ck="recadrage"]')).toBeVisible()
  await page.locator('[data-ck="utiliser"]').click()
  await expect(page.getByText('Photo enregistrée.')).toBeVisible()
  const s = await src<{ membre: { photo: string | null } }>(page, 'session.session')
  expect(s.membre.photo).toMatch(/^http:\/\/localhost:\d+\/media\//)
  expect((await page.request.get(s.membre.photo!)).ok()).toBe(true)
  await page.getByText('Numéro du compte').click()
  await expect(page.getByText('6 77 ·· ·· 01')).toBeVisible() // masqué par le serveur, jamais en clair
  await page.getByText('Mes appareils').click()
  await expect(page.getByText('Ce téléphone', { exact: true })).toBeVisible()
  await page.goto('./')
  await expect(page.locator('.r-avatar img')).toHaveAttribute('src', s.membre.photo!)
})

// ——— Zones v2 (Z1–Z12, logique-metier/livraison/zones-yaounde.geo.json) ———

test('zones v2 avec le serveur : la zone du relais sur sa carte, la table quartier → zone de la candidature', async () => {
  const geo = JSON.parse(readFileSync(new URL('../../logique-metier/livraison/zones-yaounde.geo.json', import.meta.url), 'utf-8')) as { features: { id: string; properties: { quartiers: string[] } }[] }
  const fiche = await src<{ zoneCode: string; quartier: string }>(page, 'relais.relais')
  expect(fiche.zoneCode).toBe(monde.relais.zone)
  await page.goto('zone')
  await expect(page.locator(`[data-zone="${fiche.zoneCode}"]`)).toHaveClass(/p10-zone-relais/)
  expect(await page.locator('[data-zone]').count()).toBe(12)
  await expect(page.locator('[data-test="relais-pin"]')).toHaveCount(1)
  // Même table que la carte de l'appli : 117 quartiers, chacun dans sa zone (Z1 à Z12, sans extension).
  const quartiers = await src<{ quartier: string; zone: string }[]>(page, 'acces.quartiers')
  const carte = Object.fromEntries(geo.features.flatMap((f) => f.properties.quartiers.map((q) => [q, f.id])))
  expect(quartiers.length).toBe(Object.keys(carte).length)
  for (const q of quartiers) expect(q.zone, q.quartier).toBe(carte[q.quartier])
})

// ——— Toutes les pages, avec le serveur ———

/** Ouvre chaque page de l'appli dans `p` et rend ce qui ne va pas (lecture en erreur, requête refusée, erreur de page). */
async function balayer(p: Page, request: APIRequestContext): Promise<string[]> {
  const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8')) as { route: string; sansSession: boolean }[]
  const fautes: string[] = []
  const surReponse = (r: import('@playwright/test').Response) => {
    const u = r.url()
    // 404 attendus : une page sans identifiant (fiche, dossier, versement) lit « introuvable » ; jamais 400, 403, 5xx.
    if (u.includes('/api/') && r.status() >= 400 && r.status() !== 404) fautes.push(`${r.request().method()} ${u} → ${r.status()}`)
  }
  const surErreur = (e: Error) => fautes.push(`pageerror ${e.message}`)
  p.on('response', surReponse)
  p.on('pageerror', surErreur)
  try {
    for (const x of PAGES.filter((y) => !y.sansSession && !['camera', 'pin-remise'].includes(y.route))) {
      // Quarante pages rechargées en quelques secondes dépassent la limite de lectures d'un membre (240/min, CAP-07) :
      // les compteurs sont remis à zéro entre deux pages (une personne n'ouvre pas une page toutes les 500 ms).
      await essai(request, 'limites')
      await p.goto(x.route === 'accueil' ? './' : x.route)
      await p.waitForLoadState('networkidle')
      const alerte = p.locator('[role=alert]').filter({ hasText: /réseau|Réessayer|pas pu être lu|indisponible|impossible|mal passé|Recharger/i })
      if (await alerte.count()) fautes.push(`${x.route} : ${(await alerte.first().innerText()).slice(0, 120)}`)
      await expect(p.locator('main, [role=main]').first(), x.route).toBeVisible()
    }
  } finally {
    p.off('response', surReponse)
    p.off('pageerror', surErreur)
  }
  return fautes
}

test('chaque page de l’appli s’ouvre avec le serveur (gérante) : aucune erreur de lecture, aucune requête refusée, aucune erreur de page', async ({ request }) => {
  test.setTimeout(240_000)
  expect(await balayer(page, request)).toEqual([])
})

test('chaque page avec le serveur (employé, autre téléphone) : rien de refusé ni d’erreur ; jamais l’argent du relais', async ({ browser, request }) => {
  test.setTimeout(240_000)
  const p = await browser.newPage()
  try {
    await p.goto('connexion')
    await p.getByLabel('Numéro', { exact: true }).fill(monde.employe.telephone)
    await p.getByRole('button', { name: 'Continuer' }).click()
    await expect(p.getByRole('heading', { name: 'Nouveau téléphone' })).toBeVisible()
    await p.getByPlaceholder('000000').fill(await codeSms(request, monde.employe.telephone))
    await expect(p.getByText(`Bonjour ${monde.employe.prenom}`)).toBeVisible()
    await p.keyboard.type(monde.employe.pin)
    await expect(p).toHaveURL(/\/relais\/?$/)
    expect(await balayer(p, request)).toEqual([])
    await p.goto('./')
    expect(await p.locator('main').innerText()).not.toMatch(/GAGNÉ CETTE SEMAINE|CAISSE DU JOUR/)
  } finally {
    await p.close()
  }
})
