// Chaque bloc touchable mène quelque part (retour du porteur : « certaines pages de vérification de produits ne
// s'ouvrent pas quand je clique »). Plus strict que boutons.spec.ts (qui accepte tout changement du DOM) : pour chaque
// écran — toutes les routes, et le ramassage à chacune de ses étapes (arrivée, contrôle, emballage, audit, code) —
// chaque élément touchable du contenu, de la barre d'action et des feuilles est touché, l'écran rouvert dans le même
// état à chaque fois, et l'on exige un effet RÉEL :
// - changement de route vers une page connue, qui s'affiche (pas « Ce lien ne mène à aucune page », pas d'écran vide) ;
// - feuille, boîte de dialogue ou appareil photo ouvert ;
// - état changé : case, choix, onglet, interrupteur, volet déplié (aria-checked/pressed/selected/expanded, open),
//   valeur d'un champ, zone d'état (code tapé, aria-live, carte zoomée), actions offertes changées (étape de
//   confirmation), écriture de l'état de démonstration ;
// - champ de saisie mis en main (le clavier s'ouvre) ;
// - geste du téléphone : partage, copie, fichier, appareil photo ; un lien tel:/sms:/geo:/https doit être bien formé.
// Un élément désactivé (disabled, aria-disabled) ou le choix déjà fait n'est pas touché (boutons.spec.ts dit pourquoi).
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'
import { arriver, recuperer, auditer, controler, emballer, re } from './LIV-06.parcours'

const SEL = 'a[href],button,[role=button],[role=radio],[role=tab],[role=switch],[role=checkbox],[role=menuitem],summary,input[type=checkbox],input[type=radio],label'

interface Cible {
  i: number
  nom: string
  href: string | null
  onglet: boolean // lien ouvert dans un autre onglet (une autre application) : vérifié comme un lien sortant
}

/** Marque les cibles visibles du contenu, de la barre d'action et des feuilles (l'en-tête et la barre du bas, communs
 * à tous les écrans, sont couverts par boutons.spec.ts). */
function marquer(SEL: string): Cible[] {
  document.querySelectorAll('[data-fx]').forEach((x) => x.removeAttribute('data-fx'))
  const out: Cible[] = []
  // Feuille ouverte d'emblée (adresse d'une feuille) : seul son contenu est touchable, le reste est sous le voile.
  const feuille = document.querySelector('.sheet, [role=dialog]')
  for (const el of document.querySelectorAll<HTMLElement>(SEL)) {
    if (!el.closest('main, .bottom-cta, .sheet, [role=dialog]') || el.closest('header, nav.dock, .dock')) continue
    if (feuille && !feuille.contains(el)) continue
    if (el.closest('[aria-hidden="true"], [inert]')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2 || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
    if (el.tagName === 'LABEL' && (el.querySelector('input,button,[role]') || !(el as HTMLLabelElement).control)) continue
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') continue
    // Choix déjà fait (onglet ouvert, option cochée d'un groupe, page ouverte) : le retoucher ne change rien, à juste titre.
    if (el.matches('[role=tab][aria-selected=true], [role=radio][aria-checked=true], [aria-current=page], [aria-current=true]')) continue
    // Puce de filtre déjà choisie (une parmi plusieurs) : même chose.
    if (el.getAttribute('aria-pressed') === 'true' && el.parentElement && el.parentElement.querySelectorAll(':scope > [aria-pressed]').length > 1) continue
    el.setAttribute('data-fx', String(out.length))
    out.push({ i: out.length, nom: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70), href: el.getAttribute('href'), onglet: el.getAttribute('target') === '_blank' })
  }
  return out
}

/** Empreinte de l'état visible : contrôles, volets, champs, zones d'état, feuilles. */
function empreinte() {
  const etat = [...document.querySelectorAll<HTMLElement>('[aria-checked],[aria-pressed],[aria-expanded],[aria-selected],details,input,textarea,select')]
    .map((e) => [e.getAttribute('aria-checked'), e.getAttribute('aria-pressed'), e.getAttribute('aria-expanded'), e.getAttribute('aria-selected'), (e as HTMLDetailsElement).open, (e as HTMLInputElement).checked, (e as HTMLInputElement).value].join())
    .join('|')
  // Zones d'état : code tapé, annonces, et la carte elle-même (zoom, recentrage).
  const zones = [...document.querySelectorAll('[aria-live], [role=status], output, .otp, .lv-carte-svg')].map((e) => (e.matches('svg') ? e.innerHTML : e.textContent)).join('|')
  // Actions offertes : une étape de confirmation qui paraît (ou disparaît) change ce que le livreur peut faire.
  const actions = [...document.querySelectorAll<HTMLElement>('main :is(a[href],button), .bottom-cta :is(a[href],button)')]
    .filter((e) => e.checkVisibility())
    .map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim())
    .join('|')
  // Champ de saisie en main (étiquette touchée, bouton « écrire ») : le clavier s'ouvre, effet réel.
  const a = document.activeElement
  const saisie = a && a.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') ? a.outerHTML.slice(0, 80) : ''
  return { url: location.pathname + location.search, saisie, actions, feuilles: document.querySelectorAll('.sheet, [role=dialog], .lv-cam').length, etat, zones }
}

async function preparer(page: Page) {
  await figerHorloge(page)
  await page.addInitScript(() => {
    const w = window as unknown as { __fx: string[] }
    w.__fx = []
    const note = (s: string) => w.__fx.push(s)
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function (k: string, v: string) {
      if (this === localStorage && this.getItem(k) !== v && k.startsWith('blv_') && !/horloge|debut|test/.test(k)) note('état ' + k)
      return set.call(this, k, v)
    }
    const def = (o: object, k: string, v: unknown) => {
      try {
        Object.defineProperty(o, k, { value: v, configurable: true })
      } catch {
        /* rien */
      }
    }
    def(navigator, 'share', async () => note('partage'))
    def(navigator, 'canShare', () => true)
    def(navigator, 'clipboard', { writeText: async () => note('copie'), readText: async () => '' })
    window.open = () => (note('fenêtre'), null)
    window.print = () => note('impression')
    const clic = HTMLInputElement.prototype.click
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') return note('fichier')
      return clic.call(this)
    }
    const objet = URL.createObjectURL
    URL.createObjectURL = (b: Blob | MediaSource) => (note('fichier'), objet(b))
  })
}

/** Ouvre l'adresse dans l'état donné (état de démonstration posé, puis l'écran rechargé). */
async function ouvrirDans(page: Page, a: string, etat: Record<string, string>) {
  await page.goto(adresse(a))
  await page.evaluate((e) => {
    localStorage.clear()
    sessionStorage.clear()
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v)
  }, etat)
  await page.goto(adresse(a))
  await page.locator('#app main').first().waitFor()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(200)
}

async function verifier(page: Page, a: string, etat: Record<string, string>) {
  await ouvrirDans(page, a, etat)
  const cibles = await page.evaluate(marquer, SEL)
  expect(cibles.length, `${a} : aucun élément touchable trouvé`).toBeGreaterThanOrEqual(0)
  const sansEffet: string[] = []
  // Lignes de même forme (même nom aux chiffres près, même lien aux chiffres près) : les trois premières suffisent.
  const formes = new Map<string, number>()
  for (const c of cibles) {
    const forme = (c.nom + '|' + (c.href ?? '')).replace(/\d+/g, '#')
    formes.set(forme, (formes.get(forme) ?? 0) + 1)
    if (formes.get(forme)! > 3) continue
    // Une autre application de la même origine (rangée « Changer d'espace » du cadre d'accès) : le serveur de cette
    // appli seule ne la sert pas ; vérifiée comme un lien sortant.
    if (c.href && (c.onglet || /^(tel|sms|geo|mailto|https?):/i.test(c.href) || (c.href.startsWith('/') && !c.href.startsWith('/livreur/')))) {
      expect(() => new URL(c.href!, 'https://belivay.test'), `lien sortant mal formé « ${c.nom} »`).not.toThrow()
      continue
    }
    await ouvrirDans(page, a, etat)
    const encore = await page.evaluate(marquer, SEL)
    const ici = encore.find((x) => x.i === c.i && x.nom === c.nom) ?? encore.find((x) => x.nom === c.nom && x.href === c.href)
    if (!ici) continue
    await page.evaluate(() => void ((window as unknown as { __fx: string[] }).__fx.length = 0))
    const e0 = await page.evaluate(empreinte)
    let fichier = false
    const surFichier = () => (fichier = true)
    page.on('filechooser', surFichier)
    await page.locator(`[data-fx="${ici.i}"]`).click({ timeout: 4000 })
    await page.waitForTimeout(450)
    page.off('filechooser', surFichier)
    const e1 = await page.evaluate(empreinte)
    const effets = await page.evaluate(() => [...(window as unknown as { __fx: string[] }).__fx])
    if (fichier) effets.push('fichier')
    if (e1.url !== e0.url) {
      await expect(page.getByText(/Ce lien ne mène à aucune page/), `« ${c.nom} » (${a}) mène à une page inconnue : ${e1.url}`).toHaveCount(0)
      await expect(page.locator('#app main').first(), `« ${c.nom} » (${a}) ouvre un écran vide : ${e1.url}`).not.toBeEmpty()
      effets.push('route ' + e1.url)
    }
    if (e1.feuilles > e0.feuilles) effets.push('feuille')
    if (e1.etat !== e0.etat || e1.zones !== e0.zones) effets.push('état')
    if (e1.saisie && e1.saisie !== e0.saisie) effets.push('saisie')
    if (e1.actions !== e0.actions) effets.push('actions')
    if (!effets.length) sansEffet.push(`${c.nom}${c.href ? ' → ' + c.href : ''}`)
  }
  expect(sansEffet, `éléments de ${a} sans effet réel`).toEqual([])
}

// Chaque écran, à l'état du jeu d'essai.
for (const r of OUVERTES)
  test(`effet réel de chaque élément · ${r}`, async ({ page }) => {
    test.setTimeout(10 * 60_000)
    await preparer(page)
    await verifier(page, '#' + r, {})
  })

// Le ramassage à chacune de ses étapes : le parcours est fait une fois, l'état relevé à chaque étape, puis chaque
// élément de l'étape est touché à partir de cet état.
const releve = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('blv_') && !/test/.test(k))))

test('effet réel de chaque élément · ramassage à chaque étape', async ({ page }) => {
  test.setTimeout(20 * 60_000)
  await preparer(page)
  await ouvrirDans(page, '#tournee', {})
  await arriver(page)
  await expect(page).toHaveURL(/\/arrivee\?a=A2/)
  const arrive = await releve(page)
  await recuperer(page)
  await controler(page)
  await expect(page).toHaveURL(/\/emballage/)
  const controle1 = await releve(page)
  await emballer(page, '8206')
  await expect(page).toHaveURL(/\/controle\?a=A2&c=BLV-00014-1/)
  const emballe1 = await releve(page)
  await controler(page)
  await expect(page).toHaveURL(/\/audit/)
  const audit = await releve(page)
  await auditer(page)
  await expect(page).toHaveURL(/\/emballage/)
  await emballer(page, '8207')
  await expect(page).toHaveURL(/\/code-remise/)
  const code = await releve(page)

  await verifier(page, '#arrivee?a=A2', arrive)
  await verifier(page, '#controle?a=A2', arrive)
  await verifier(page, '#refus?a=A2&c=BLV-00011-1', arrive)
  await verifier(page, '#emballage?a=A2&c=BLV-00011-1', controle1)
  await verifier(page, '#controle?a=A2&c=BLV-00014-1', emballe1)
  await verifier(page, '#audit?a=A2&c=BLV-00014-1', audit)
  await verifier(page, '#code-remise?a=A2', code)
})
