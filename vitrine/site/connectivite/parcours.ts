// Parcours partagés des recettes multi-applis : la commande témoin du 13 oct. (le défroisseur de Boutique B, payé par
// Carine au Relais Bastos), étape après étape, sur les écrans des cinq applications.
import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { journal } from './commun'

/** Panier vidé, puis un seul produit acheté au relais choisi, payé en MTN MoMo ; rend la référence de la commande. */
export async function acheter(client: Page, produit: string, titre: string, mode: 'Au relais' | 'À domicile' = 'Au relais'): Promise<string> {
  // Panier vidé d'abord (les lignes peuvent arriver après le premier rendu) : rien d'autre ne part avec la commande.
  await client.goto('/panier')
  const retirer = client.getByRole('link', { name: 'Retirer l’article' })
  await client.waitForLoadState('networkidle')
  await expect(async () => {
    while ((await retirer.count()) > 0) {
      await retirer.first().click()
      await client.waitForTimeout(200)
    }
    await client.waitForTimeout(400)
    expect(await retirer.count()).toBe(0)
  }).toPass({ timeout: 15_000 })
  await client.goto('/fiche?p=' + produit)
  await expect(client.locator('.fp-t')).toHaveText(titre)
  // Téléphone : la barre du bas ; ordinateur : le bloc d'achat de la colonne (le premier bouton visible).
  await client.getByRole('button', { name: 'Acheter', exact: true }).filter({ visible: true }).first().click()
  await expect(client).toHaveURL(/\/panier/)
  // Le mode se choisit dans le panier (CL-07), repris au paiement.
  await client.getByRole('radio', { name: new RegExp(mode) }).first().click()
  await client.getByRole('button', { name: /^Passer commande/ }).filter({ visible: true }).first().click()
  await expect(client).toHaveURL(/\/paiement-moyen/)
  await expect(client.locator('[data-livraison]')).toContainText(mode)
  await client.locator('.cl08-row', { hasText: 'MTN Mobile Money' }).first().click()
  await client.locator('button.btn.primary', { hasText: 'Payer' }).click()
  await expect(client).toHaveURL(/paiement-attente\?ref=BLV-\d+/)
  const ref = /ref=(BLV-\d+)/.exec(client.url())![1]
  await client.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(client).toHaveURL(new RegExp('confirmee\\?ref=' + ref))
  return ref
}

/** Le relais de la démonstration commune, choisi par le client (« Relais Bastos » = Relais Bastos Carrefour). */
export async function choisirRelaisBastos(client: Page) {
  await client.goto('/relais-choix')
  await client.getByRole('radio', { name: /Relais Bastos/ }).first().click()
  await client.getByRole('button', { name: 'Choisir le Relais Bastos' }).click()
}

export const PAQUET_TEMOIN = 'PQ-Z1-261013-020'

/** La commande témoin de bout en bout jusqu'au livreur affecté ; rend sa référence. */
/** Le paquet publié pour le colis d'une commande (lu au journal du pont, comme l'entreprise le voit). */
export async function paquetDe(page: Page, ref: string, sauf: string[] = []): Promise<string> {
  let id = ''
  const lire = async () => (await journal(page)).filter((e) => e.type === 'package.published' && (e.colis as string[]).includes(ref + '-1') && !sauf.includes(e.paquet as string)).pop()?.paquet as string | undefined
  await expect.poll(async () => (id = (await lire()) ?? ''), { timeout: 10_000 }).not.toBe('')
  return id
}
export async function jusquAuLivreur(client: Page, vendeur: Page, entreprise: Page, mode: 'Au relais' | 'À domicile' = 'Au relais', suivante = false): Promise<string> {
  // Le relais choisi reste celui du client pour les commandes suivantes.
  if (!suivante) await choisirRelaisBastos(client)
  const ref = await acheter(client, 'fer', 'Défroisseur vapeur Philips 3000', mode)
  await vendeur.goto('/vendeur/commandes')
  const carte = vendeur.locator('.card.ord', { hasText: ref })
  await expect(carte).toBeVisible({ timeout: 5000 })
  await carte.getByText('C’est prêt').click()
  await expect(vendeur).toHaveURL(new RegExp('commande_prete\\?ref=' + ref))
  // Le paquet publié chez Yafé Express, accepté, affecté à Serge A.
  const PAQUET_TEMOIN = await paquetDe(entreprise, ref)
  await entreprise.goto('/entreprise/paquets')
  const pq = entreprise.locator('article.entb-pq', { hasText: PAQUET_TEMOIN })
  await expect(pq).toBeVisible({ timeout: 5000 })
  await pq.getByRole('button', { name: 'Accepter', exact: true }).click()
  // « Annuler » pendant 5 s, puis l'acceptation part.
  await expect(entreprise.getByText(new RegExp('Paquet ' + PAQUET_TEMOIN + ' accepté\\s:\\saffectez'))).toBeVisible({ timeout: 15_000 })
  await entreprise.goto('/entreprise/affectation?id=' + PAQUET_TEMOIN)
  await entreprise.getByRole('button', { name: 'Affecter Serge A.' }).first().click()
  await expect(entreprise.getByText(/Serge A\. est affecté/)).toBeVisible({ timeout: 15_000 })
  return ref
}


/** Le livreur démarre le paquet de la commande témoin (journée sans autre paquet : ?demo=aucun_paquet). */
export async function demarrerPaquet(livreur: Page, paquet = PAQUET_TEMOIN) {
  await livreur.goto('/livreur/paquet?id=' + paquet)
  await livreur.getByRole('button', { name: 'Démarrer la tournée' }).click()
  await expect(livreur).toHaveURL(/\/livreur\/tournee/)
}

/** Le code de remise que le vendeur montre au livreur (masqué, affiché au toucher). */
export async function codeDuVendeur(vendeur: Page, ref: string): Promise<string> {
  await vendeur.goto('/vendeur/commande_prete?ref=' + ref)
  await vendeur.getByRole('button', { name: 'Afficher le code' }).click()
  const chiffres = await vendeur.locator('.hero.night .code6 span').allTextContents()
  return chiffres.join('')
}

// Gestes du livreur (repris de espace-livreur/tests/LIV-06.parcours.ts : même application, mêmes écrans).
/** Expression tolérante aux espaces typographiques français (« Non : … »). */
export const re = (texte: string) => new RegExp(texte.split(' ').map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\u00a0\\u202f]+'))

/** Prend la prochaine photo exigée encore vide (ou celle d'un emplacement donné) avec la photo de démonstration. */
export async function photo(page: Page, ou = page.locator('main')) {
  await ou.getByRole('button', { name: re('Prendre la photo') }).first().click()
  const cam = page.locator('.lv-cam')
  await expect(cam).toBeVisible()
  await cam.getByRole('button', { name: re('Photo de démonstration') }).click()
  await expect(cam).toHaveCount(0, { timeout: 15_000 })
}

export async function arriver(page: Page, libelle = 'Je suis arrivé') {
  await page.getByRole('button', { name: re(libelle) }).first().click()
}

/** Récupération groupée chez le vendeur (arrivée faite) : chaque colis photographié, puis « Tout récupéré ». */
export async function recuperer(page: Page) {
  await expect(page).toHaveURL(/\/arrivee/)
  await expect(page.locator('.lvt-compteur')).toHaveText(/^0\/\d+$/)
  const boutons = page.getByRole('button', { name: /^Photographier ·/ })
  const n = await boutons.count()
  for (let i = 0; i < n; i++) {
    await boutons.first().click()
    const cam = page.locator('.lv-cam')
    await cam.getByRole('button', { name: re('Photo de démonstration') }).click()
    await expect(cam).toHaveCount(0, { timeout: 15_000 })
    await expect(boutons).toHaveCount(n - i - 1)
  }
  await page.getByRole('link', { name: 'Tout récupéré' }).click()
}

const CASES = ['Bon article', 'Bonne variante', 'Bonne quantité', 'État conforme', 'Aucun dommage visible', 'Accessoires annoncés présents']

/** Contrôle C1 du colis affiché (six cases, photo 1), jusqu'à l'écran suivant. */
export async function controler(page: Page) {
  await expect(page).toHaveURL(/\/controle/)
  await expect(page.getByRole('checkbox', { name: /^Bon article/ })).toBeVisible()
  await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
  for (const c of CASES) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Emballer et sceller') }).click()
}

export async function auditer(page: Page) {
  await expect(page).toHaveURL(/\/audit/)
  await expect(page.getByRole('radio', { name: 'Conforme' })).toHaveCount(4)
  for (const b of await page.getByRole('radio', { name: 'Conforme' }).all()) await b.click()
  for (let i = 0; i < 3; i++) await photo(page)
  await page.getByRole('button', { name: re('Terminer l’audit') }).click()
}

export async function emballer(page: Page, etiquette: string) {
  await expect(page).toHaveURL(/\/emballage/)
  await expect(page.getByRole('heading', { name: 'Étiquette', exact: true })).toBeVisible()
  await page.getByLabel(re('Ou saisissez le numéro à la main')).fill(etiquette)
  await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
  await expect(page.getByText(re('définitivement'))).toBeVisible()
  for (const s of ['Ruban sur toutes les ouvertures', 'Signature au marqueur', 'Étiquette collée à plat']) await page.getByRole('checkbox', { name: re(s) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Valider l’emballage') }).click()
}

export async function taperCode(page: Page, code: string) {
  for (const c of code) await page.locator('.lv-pave, .keypad').getByRole('button', { name: c, exact: true }).click()
}


/** Ramassage complet de la commande témoin chez le vendeur (paquet démarré) : contrôle, emballage, code du vendeur. */
export async function ramasserTemoin(livreur: Page, code: string, etiquette = '8209') {
  await livreur.goto('/livreur/tournee')
  await arriver(livreur)
  await expect(livreur).toHaveURL(/\/arrivee\?a=/)
  await recuperer(livreur)
  await controler(livreur)
  await emballer(livreur, etiquette)
  await expect(livreur).toHaveURL(/\/code-remise/)
  await taperCode(livreur, code)
  await livreur.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(livreur.getByRole('heading', { name: 'Remise validée' })).toBeVisible()
}

/** Photo au comptoir du relais (pas d'appareil photo dans le navigateur de test : photo de démonstration). */
export async function photoRelais(page: Page) {
  await expect(page).toHaveURL(/\/camera\?/)
  const autoriser = page.getByRole('button', { name: 'Autoriser l’appareil photo' })
  await expect(page.getByRole('button', { name: /^(Autoriser l’appareil photo|Prendre la photo)/ }).first()).toBeVisible()
  if (await autoriser.isVisible()) await autoriser.click()
  await page.getByRole('button', { name: /^Prendre la photo/ }).click()
}

/** Dépôt du lot de la commande témoin au Relais Bastos : Serge présente son code, Rose M. reçoit et valide, Serge confirme. */
export async function deposerAuRelais(livreur: Page, relais: Page, colis: string[], pin: string, lot = PAQUET_TEMOIN) {
  await livreur.goto('/livreur/tournee')
  await arriver(livreur, 'Je suis au relais')
  const code = (await livreur.locator('.lr-code').textContent())!.replace(/\D/g, '')
  expect(code).toMatch(/^\d{6}$/)
  await recevoirLot(relais, code, colis, pin)
  await expect(relais.getByRole('heading', { name: 'Le livreur confirme le lot' })).toBeVisible()
  await livreur.reload()
  await livreur.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
  await livreur.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect(livreur.getByText(re('Dépôt complet · garde transférée'))).toBeVisible()
  await expect(async () => {
    await relais.goto('/relais/reception?lot=' + lot)
    await expect(relais.getByRole('heading', { name: `Lot reçu · ${colis.length} colis` })).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 30_000 })
}

/** PIN du gérant de démonstration (lu dans le jeu d'essai du relais, comme le test des deux onglets). */
export const PIN_RELAIS = /PIN_DEMO = '(\d+)'/.exec(readFileSync(new URL('../../espace-relais/src/demo/jeu-essai.ts', import.meta.url), 'utf-8'))![1]

/** Code de retrait que le client lit dans son application (formule de la démonstration, comme le serveur). */
export const codeRetrait = (ref: string) => String(100000 + ((Number(ref.replace(/\D/g, '')) * 7919) % 900000))
const PHOTO_DEMO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
/** Gros pavé du comptoir (feuille ouverte d'abord, sinon l'écran) : un chiffre par toucher, vérifié au dernier. */
async function taperComptoir(relais: Page, chiffres: string) {
  const zone = (await relais.getByRole('dialog').count()) ? relais.getByRole('dialog') : relais.locator('main')
  for (const k of chiffres) await zone.getByRole('button', { name: k, exact: true }).click()
}
/** Réception au comptoir (scan d'abord, sans appareil : pavé) : code de dépôt, chaque colis par sa référence
 * (« BLV-00008-1 » = 000081), « Terminer », photo du lot et PIN au pavé. */
export async function recevoirLot(relais: Page, code: string, colis: string[], pin: string) {
  await relais.goto('/relais/reception')
  await taperComptoir(relais, code)
  await expect(relais.getByText('CODE DE DÉPÔT VALIDÉ', { exact: true })).toBeVisible()
  for (const ref of colis) {
    const [, a, b] = /BLV-(\d{5})-(\d)/.exec(ref)!
    await taperComptoir(relais, a + b)
    await expect(relais.locator('#r4-colis-' + ref)).toContainText('scanné')
  }
  await relais.getByRole('button', { name: 'Terminer' }).click()
  const f = relais.getByRole('dialog')
  await f.locator('input[type=file]').setInputFiles(PHOTO_DEMO)
  await taperComptoir(relais, pin)
}
/** Retrait au comptoir : code au pavé, photo, « Remis » (« Tout est en ordre » part seule chez le client), PIN. */
export async function retirer(relais: Page, code: string, pin: string) {
  await relais.goto('/relais/retrait')
  await taperComptoir(relais, code)
  await expect(relais.getByText('✓ Code correct')).toBeVisible()
  await relais.locator('main input[type=file]').first().setInputFiles(PHOTO_DEMO)
  const remis = relais.getByRole('button', { name: 'Remis', exact: true })
  await expect(remis).toBeEnabled({ timeout: 15_000 })
  await remis.click()
  await expect(relais).toHaveURL(/pin-remise\?remise=/)
  await taperComptoir(relais, pin)
  await expect(relais.getByText('Colis retiré')).toBeVisible()
}
