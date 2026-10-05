// Chaque bouton répond (demande du porteur : « tous les boutons, sans exception, sur toutes les pages »).
// Pour chaque route du site, à 375 px, état de démonstration propre (localStorage vidé), chaque élément cliquable
// visible de l'application (en-tête, contenu, barre du bas, barres fixes) est touché, un par un, et l'on vérifie
// qu'il se passe quelque chose d'observable :
// - changement d'adresse, de DOM (hors bruit de fond mesuré avant le toucher : minuteurs, bandeau défilant),
//   d'attribut aria-checked / aria-expanded / aria-pressed, feuille ou modale ouverte ;
// - focus déplacé, défilement ;
// - appel au partage, au presse-papiers, à window.open, à un téléchargement, au sélecteur de fichier, à une
//   permission (notifications, caméra), à l'impression, à une boîte de dialogue (bouchons posés avant la page) ;
// - écriture de l'état (localStorage : la source de démonstration enregistre), événement blv:* (son, animation),
//   requête vers l'API.
// Les éléments volontairement inactifs (disabled, aria-disabled="true", .off, interrupteur verrouillé) sont listés à
// part avec leur raison ; les liens sortants (wa.me, sms:, mailto:, tel:, https) ne sont pas suivis : leur adresse
// doit être bien formée et encodée. Un élément couvert (sous le voile d'une feuille ouverte) est noté à part.
// Rapport : test-results/boutons/<route>.json, puis test-results/boutons.json (outils : voir la fin du fichier).
// Variables : BOUTONS_ROUTES=panier,fiche (sous-ensemble), BOUTONS_LARGEUR=375, BOUTONS_THEME=dark, BOUTONS_LANG=en,
// BOUTONS_ETATS=1 (ajoute les adresses d'états du prototype : ?st=…).
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

interface P {
  route: string
  interrupteur: string | null
  etats?: { adresse: string }[]
}
const lire = (u: string) => JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf-8'))
const PAGES: P[] = lire('../src/genere/pages.json')
const INTERRUPTEURS: Record<string, boolean> = lire('../src/config/interrupteurs.json')
const OUVERTES = PAGES.filter((p) => !p.interrupteur || INTERRUPTEURS[p.interrupteur])
const DOSSIERS = readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true }).filter((d) => d.isDirectory())
const PAGES_SITE: string[] = DOSSIERS.filter((d) => existsSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url))).flatMap(
  (d) => lire(`../src/pages/${d.name}/pages-site.json`).routes as string[],
)
const CONSTRUITS: string[] = DOSSIERS.filter((d) => existsSync(new URL(`../src/pages/${d.name}/construits.json`, import.meta.url))).flatMap(
  (d) => lire(`../src/pages/${d.name}/construits.json`).routes as string[],
)
const OUVERTES_ROUTES = new Set(OUVERTES.map((p) => p.route))
const ROUTES = [...new Set([...OUVERTES.map((p) => p.route), ...CONSTRUITS.filter((r) => OUVERTES_ROUTES.has(r)), ...PAGES_SITE])]
const chemin = (r: string) => (r === 'accueil' ? '/' : '/' + r)
const FILTRE = process.env.BOUTONS_ROUTES?.split(',').filter(Boolean)
const ADRESSES: string[] = [
  ...ROUTES.map(chemin),
  ...(process.env.BOUTONS_ETATS
    ? OUVERTES.flatMap((p) => (p.etats ?? []).map((e) => e.adresse.replace(/^#/, '/'))).filter((a) => a.includes('?'))
    : []),
].filter((a) => !FILTRE || FILTRE.includes(a.slice(1).split('?')[0] || 'accueil'))
const LARGEUR = Number(process.env.BOUTONS_LARGEUR || 375)
const THEME = process.env.BOUTONS_THEME || 'light'
const LANG = process.env.BOUTONS_LANG || 'fr'
// Rendu par défaut (375 px, clair, français) : test-results/boutons/ ; autre rendu : un sous-dossier à son nom.
const VARIANTE = LARGEUR === 375 && THEME === 'light' && LANG === 'fr' ? '' : `${LARGEUR}-${THEME}-${LANG}/`
const DOSSIER = new URL('../test-results/boutons/' + VARIANTE, import.meta.url)

const SEL = [
  'a[href]',
  'button',
  '[role=button]',
  '[role=radio]',
  '[role=tab]',
  '[role=switch]',
  '[role=checkbox]',
  '[role=menuitem]',
  'summary',
  'input[type=checkbox]',
  'input[type=radio]',
  'label',
].join(',')

// Bouchons et témoins, posés avant le premier script de la page. Rien n'est noté hors de la fenêtre d'un toucher.
function instrumenter() {
  const w = window as unknown as Record<string, unknown>
  const fx: string[] = []
  w.__fx = fx
  w.__arme = false
  const note = (s: string) => {
    if (w.__arme) fx.push(s)
  }
  try {
    localStorage.clear()
  } catch {
    /* rien */
  }
  const def = (o: object, k: string, v: unknown) => {
    try {
      Object.defineProperty(o, k, { value: v, configurable: true, writable: true })
    } catch {
      /* rien */
    }
  }
  def(navigator, 'share', async () => note('partage'))
  def(navigator, 'canShare', () => true)
  def(navigator, 'clipboard', {
    writeText: async () => note('presse-papiers'),
    write: async () => note('presse-papiers'),
    readText: async () => '',
  })
  def(navigator, 'vibrate', () => (note('vibration'), true))
  w.open = () => (note('window.open'), { opener: null, closed: false, close() {}, focus() {}, location: {} })
  w.print = () => note('impression')
  w.alert = () => note('alerte')
  w.confirm = () => (note('confirmation'), false)
  w.prompt = () => (note('saisie'), null)
  if ('Notification' in window) def(Notification, 'requestPermission', async () => (note('permission notifications'), 'default'))
  if (navigator.mediaDevices) def(navigator.mediaDevices, 'getUserMedia', async () => (note('caméra'), Promise.reject(new Error('refus'))))
  if (navigator.geolocation)
    def(navigator.geolocation, 'getCurrentPosition', (_ok: unknown, ko?: (e: unknown) => void) => (note('position'), ko?.({ code: 1, message: 'refus' })))
  const clicInput = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') return note('sélecteur de fichier')
    return clicInput.call(this)
  }
  def(HTMLInputElement.prototype, 'showPicker', function () {
    note('sélecteur')
  })
  const clicA = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    if (this.download || /^(blob|data):/.test(this.href)) return note('téléchargement')
    return clicA.call(this)
  }
  const objet = URL.createObjectURL
  URL.createObjectURL = (b: Blob | MediaSource) => (note('fichier'), objet(b))
  const siv = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (o?: boolean | ScrollIntoViewOptions) {
    note('défilement')
    return siv.call(this, o)
  }
  const st = Element.prototype.scrollTo as (...a: unknown[]) => void
  Element.prototype.scrollTo = function (...a: unknown[]) {
    note('défilement')
    return st.apply(this, a)
  } as typeof Element.prototype.scrollTo
  const wst = window.scrollTo.bind(window) as (...a: unknown[]) => void
  window.scrollTo = ((...a: unknown[]) => (note('défilement'), wst(...a))) as typeof window.scrollTo
  const foc = HTMLElement.prototype.focus
  HTMLElement.prototype.focus = function (o?: FocusOptions) {
    if (document.activeElement !== this) note('focus')
    return foc.call(this, o)
  }
  const disp = window.dispatchEvent.bind(window)
  window.dispatchEvent = (e: Event) => (e.type.startsWith('blv:') && note('évènement ' + e.type), disp(e))
  const set = Storage.prototype.setItem
  Storage.prototype.setItem = function (k: string, v: string) {
    if (this.getItem(k) !== v) note('état ' + k)
    return set.call(this, k, v)
  }
  const rem = Storage.prototype.removeItem
  Storage.prototype.removeItem = function (k: string) {
    if (this.getItem(k) !== null) note('état ' + k)
    return rem.call(this, k)
  }
  for (const m of ['pushState', 'replaceState'] as const) {
    const o = history[m].bind(history)
    history[m] = (...a: Parameters<History['pushState']>) => {
      const avant = location.href
      o(...a)
      if (location.href !== avant) note('adresse')
    }
  }
}

// Attend que le DOM se taise (chargement des données) : 250 ms sans mutation, 4 s au plus.
async function calme(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((ok) => {
        let t = setTimeout(fin, 250)
        const mo = new MutationObserver(() => {
          clearTimeout(t)
          t = setTimeout(fin, 250)
        })
        const max = setTimeout(fin, 4000)
        function fin() {
          mo.disconnect()
          clearTimeout(max)
          ok()
        }
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
      }),
  )
}

interface Cible {
  i: number
  sig: string
  nom: string
  tag: string
  href: string | null
  zone: string
  inactif: string | null // raison si volontairement inactif
  natif: boolean // bouton disabled (le navigateur ne le laisse pas toucher)
  externe: boolean
}

// Énumère les cibles visibles de l'application et pose data-bt sur chacune (dans l'ordre du document).
function enumerer(SEL: string): Cible[] {
  const app = document.querySelector('#app') ?? document.body
  document.querySelectorAll('[data-bt]').forEach((x) => x.removeAttribute('data-bt'))
  const tous = [...app.querySelectorAll<HTMLElement>(SEL)]
  const visible = (el: HTMLElement) => {
    if (el.closest('[aria-hidden="true"], [inert], .proto-only')) return false
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return false
    return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  }
  const nomDe = (el: HTMLElement) =>
    (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const raison = (el: HTMLElement) => {
    const id = el.getAttribute('aria-describedby')
    const dit = id ? id.split(' ').map((x) => document.getElementById(x)?.textContent ?? '').join(' ') : ''
    const pres = el.nextElementSibling && !el.nextElementSibling.matches(SEL) ? el.nextElementSibling.textContent : ''
    return (el.getAttribute('title') || dit || el.getAttribute('data-raison') || pres || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  }
  const out: Cible[] = []
  const vus = new Map<string, number>()
  for (const el of tous) {
    if (!visible(el)) continue
    // Une étiquette qui enveloppe une autre cible : la cible suffit ; une case cachée : son étiquette suffit.
    // Une étiquette sans champ (titre d'un groupe) n'est pas une cible.
    if (el.tagName === 'LABEL' && (el.querySelector(SEL) || !(el as HTMLLabelElement).control)) continue
    const tag = el.tagName.toLowerCase()
    const href = el.getAttribute('href')
    const externe = !!href && /^(https?:|mailto:|sms:|tel:|geo:|whatsapp:)/i.test(href) && !href.startsWith(location.origin)
    let inactif: string | null = null
    const lock = el.matches('.tg.lock, .lock[role=switch]')
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('off') || el.classList.contains('dis') || lock)
      inactif = raison(el) || (lock ? 'interrupteur verrouillé' : '(aucune raison affichée)')
    const zone = el.closest('header') ? 'en-tête' : el.closest('nav.dock, .dock') ? 'barre' : el.closest('main') ? 'contenu' : el.closest('.sheet') ? 'feuille' : 'fixe'
    // Navigation globale (en-tête, barre) vers la page ouverte : onglet courant, logo sur l'accueil.
    const ici = href && !href.startsWith('#') && new URL(href, location.href).pathname + new URL(href, location.href).search === location.pathname + location.search
    if (href && ((el.getAttribute('aria-current') === 'page' && href.split('?')[0] === location.pathname) || (ici && (zone === 'en-tête' || zone === 'barre'))))
      inactif = 'onglet de la page ouverte'
    const base = [tag, el.getAttribute('role') || '', nomDe(el).replace(/\d+/g, '#'), href || ''].join('|')
    const n = vus.get(base) ?? 0
    vus.set(base, n + 1)
    const i = out.length
    el.setAttribute('data-bt', String(i))
    out.push({ i, sig: base + '#' + n, nom: nomDe(el), tag, href, zone, inactif, natif: !!(el as HTMLButtonElement).disabled, externe })
  }
  return out
}

interface Effet {
  sig: string
  nom: string
  zone: string
  href: string | null
  effets: string[]
  vers?: string | null
}

for (const adresse of ADRESSES) {
  test(`boutons ${adresse}`, async ({ page, context }) => {
    test.setTimeout(20 * 60_000)
    page.setDefaultTimeout(15_000)
    page.setDefaultNavigationTimeout(20_000)
    await page.setViewportSize({ width: LARGEUR, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(instrumenter)
    await page.addInitScript(
      ([t, l]) => {
        localStorage.setItem('blv_c_theme', t)
        localStorage.setItem('blv_c_lang', l)
      },
      [THEME, LANG],
    )
    const reseau: string[] = []
    let arme = false
    page.on('request', (r) => {
      if (!arme) return
      const u = r.url()
      if (/\/(@vite|@fs|@id|src|node_modules)\/|\.(css|js|ts|tsx|png|jpe?g|svg|webp|woff2?)(\?|$)/.test(u) || u.startsWith('data:')) return
      reseau.push('requête ' + r.method() + ' ' + u.replace(/^https?:\/\/localhost:\d+/, ''))
    })
    page.on('download', () => arme && reseau.push('téléchargement'))
    page.on('filechooser', () => arme && reseau.push('sélecteur de fichier'))
    page.on('dialog', (d) => (arme && reseau.push('boîte ' + d.type()), d.dismiss().catch(() => {})))
    context.on('page', (p) => (arme && reseau.push('nouvel onglet'), p.close().catch(() => {})))

    const ouvrir = async () => {
      // Une navigation encore en route (geste async du toucher précédent) peut couper la première : on réessaie.
      await page.goto(adresse).catch(async () => {
        await page.waitForTimeout(500)
        await page.goto(adresse)
      })
      await page.locator('#app').first().waitFor({ state: 'attached', timeout: 15_000 })
      await calme(page)
      return page.evaluate(enumerer, SEL)
    }
    let cibles: Cible[] = []
    for (let k = 0; k < 3 && !cibles.length; k++) cibles = await ouvrir().catch(() => [])
    const liste = cibles.map((c) => ({ ...c }))
    const sansEffet: Effet[] = []
    const actifs: Effet[] = []
    const inactifs: { sig: string; nom: string; raison: string }[] = []
    const couverts: { sig: string; nom: string; par: string }[] = []
    const externes: { nom: string; href: string; erreur: string | null }[] = []
    const absents: string[] = []
    const dejaChoisis: { sig: string; nom: string }[] = []
    const mauvaises: { sig: string; nom: string; vers: string }[] = []
    let sale = false

    // Un élément : en cas d'accident (navigation tardive, rechargement du serveur), on rouvre la page et on recommence
    // une fois ; un second échec est noté dans « erreurs ».
    const erreurs: { sig: string; nom: string; erreur: string }[] = []
    const aRevoir: Cible[] = [] // derrière une feuille ouverte d'emblée : revus feuille fermée
    const un = async (c: Cible, fermer = false) => {
      // Inactif : un bouton natif disabled ou l'onglet ouvert ne se touche pas ; un .off / aria-disabled se touche
      // (il peut dire pourquoi) : sans effet, il est listé avec sa raison.
      if (c.inactif && (c.inactif === 'onglet de la page ouverte' || c.natif)) {
        inactifs.push({ sig: c.sig, nom: c.nom, raison: c.inactif })
        return
      }
      if (c.externe) {
        let erreur: string | null = null
        try {
          const u = new URL(c.href!)
          if (/\s/.test(c.href!)) erreur = 'espace non encodé'
          else if (/^https?:$/.test(u.protocol) && !u.hostname.includes('.')) erreur = 'hôte invalide'
          else if (/[^\x21-\x7e]/.test(c.href!)) erreur = 'caractère non encodé'
          else
            for (const v of u.searchParams.values())
              if (!v) {
                /* paramètre vide : permis (sms:?&body=…) */
              }
        } catch {
          erreur = 'adresse mal formée'
        }
        externes.push({ nom: c.nom, href: c.href!, erreur })
        return
      }
      if (sale || fermer) {
        cibles = await ouvrir()
        sale = false
      }
      if (!cibles.length) throw new Error('page vide')
      // Feuille ouverte d'emblée : Échap, sinon le voile ; si elle mène ailleurs, ce qui est dessous appartient à
      // une autre page (testée à sa propre adresse).
      if (fermer) {
        sale = true
        const url = page.url()
        await page.keyboard.press('Escape')
        await calme(page)
        if (await page.locator('.veil').first().isVisible().catch(() => false)) {
          await page.locator('.veil').first().click({ force: true, position: { x: 10, y: 10 } }).catch(() => {})
          await calme(page)
        }
        if (page.url() !== url) {
          couverts.push({ sig: c.sig, nom: c.nom, par: 'feuille ouverte d’emblée (la fermer mène à ' + new URL(page.url()).pathname + ')' })
          return
        }
        cibles = await page.evaluate(enumerer, SEL)
      }
      const ici = cibles.find((x) => x.sig === c.sig)
      if (!ici) {
        absents.push(c.sig)
        return
      }
      const loc = page.locator(`[data-bt="${ici.i}"]`)
      // Au milieu de l'écran (hors de l'en-tête et de la barre fixes), puis bruit de fond mesuré 300 ms.
      await loc.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {})
      // Couvert (voile d'une feuille, barre fixe) : le doigt toucherait autre chose ; noté à part, pas touché.
      const dessus = await loc
        .evaluate((el) => {
          const r = el.getBoundingClientRect()
          const pts = [
            [r.left + r.width / 2, r.top + r.height / 2],
            [r.left + 3, r.top + 3],
            [r.right - 3, r.bottom - 3],
          ]
          for (const [x, y] of pts) {
            if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return
            const h = document.elementFromPoint(x, y)
            if (h && (h === el || el.contains(h) || h.contains(el) || (el as HTMLLabelElement).control === h || h.closest('label') === el)) return null
          }
          const h = document.elementFromPoint(pts[0][0], pts[0][1])
          if (!h) return 'hors écran'
          const f = h.closest('.sheet, [role=dialog], .veil, .feuille')
          if (f && !f.contains(el)) return 'feuille ouverte : ' + (f.getAttribute('aria-label') || f.className)
          return h.outerHTML.slice(0, 120)
        })
        .catch(() => 'disparu')
      if (dessus) {
        if (!fermer && dessus.startsWith('feuille ouverte')) return void aRevoir.push(c)
        couverts.push({ sig: c.sig, nom: c.nom, par: dessus })
        return
      }
      await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>
        const bruit = new Set<Node>()
        const mo = new MutationObserver((ms) => ms.forEach((m) => bruit.add(m.target)))
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
        w.__bruitMo = mo
        w.__bruit = bruit
      })
      await page.waitForTimeout(300)
      const avant = await page.evaluate((i) => {
        const w = window as unknown as Record<string, unknown>
        ;(w.__bruitMo as MutationObserver).disconnect()
        w.__cible = String(i)
        const mut: string[] = []
        const bruit = w.__bruit as Set<Node>
        const larges = new Set<Node | null>([document.documentElement, document.body, document.querySelector('#app'), document.querySelector('main')])
        const dansBruit = (n: Node) => {
          for (let x: Node | null = n; x; x = x.parentNode) if (bruit.has(x) && (x === n || !larges.has(x))) return true
          return false
        }
        const mo = new MutationObserver((ms) => {
          for (const m of ms) {
            if (m.type === 'attributes' && m.attributeName === 'data-bt') return
            if (dansBruit(m.target)) return
            mut.push(m.type === 'attributes' ? 'attribut ' + m.attributeName : m.type === 'childList' ? 'contenu' : 'texte')
          }
        })
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
        w.__mut = mut
        w.__mo = mo
        ;(w.__fx as string[]).length = 0
        w.__arme = true
        const m = document.querySelector('main')
        return { url: location.href, scroll: [window.scrollY, m?.scrollTop ?? 0] }
      }, ici.i)
      arme = true
      reseau.length = 0
      let erreur: string | null = null
      try {
        // aria-disabled : Playwright refuse de le toucher ; le doigt, lui, le peut (le point a été vérifié dégagé).
        await loc.click({ timeout: 2500, force: !!c.inactif })
      } catch (e) {
        erreur = String((e as Error).message)
      }
      // Effet : jusqu'à 900 ms, sortie dès le premier signe.
      let effets: string[] = []
      // Rien après 700 ms : une dernière lecture à 2 s (machine chargée, données lentes).
      for (let k = 0; k < 8; k++) {
        await page.waitForTimeout(k === 7 ? 1300 : 100)
        const r = await page
          .evaluate((u) => {
            const w = window as unknown as Record<string, unknown>
            const m = document.querySelector('main')
            const e = [...new Set([...(w.__fx as string[]), ...(w.__mut as string[])])]
            if (location.href !== u) e.push('navigation')
            const a = document.activeElement
            const cible = document.querySelector('[data-bt="' + (w.__cible as string) + '"]')
            if (a && a !== document.body && cible && a !== cible && !cible.contains(a) && !a.contains(cible)) e.push('focus déplacé')
            return { e, scroll: [window.scrollY, m?.scrollTop ?? 0] }
          }, avant.url)
          .catch(() => ({ e: ['navigation (document)'], scroll: avant.scroll }))
        effets = [...r.e, ...reseau]
        if (Math.abs(r.scroll[0] - avant.scroll[0]) > 4 || Math.abs(r.scroll[1] - avant.scroll[1]) > 4) effets.push('défilement')
        if (effets.length) break
      }
      arme = false
      // Destination : l'adresse ouverte (liste pour l'examen des paramètres), et page inconnue = mauvaise destination.
      const vers = await page.evaluate(() => location.pathname + location.search).catch(() => null)
      if (vers && avant.url.replace(/^https?:\/\/[^/]+/, '') !== vers) {
        await page.waitForTimeout(150)
        if (await page.getByText(/Ce lien ne mène à aucune page|This link leads to no page/).count().catch(() => 0)) mauvaises.push({ sig: c.sig, nom: c.nom, vers })
      }
      await page
        .evaluate(() => {
          const w = window as unknown as Record<string, unknown>
          w.__arme = false
          ;(w.__mo as MutationObserver | undefined)?.disconnect()
        })
        .catch(() => {})
      const e: Effet = { sig: c.sig, nom: c.nom, zone: c.zone, href: c.href, effets, vers }
      if (erreur && !effets.length) {
        const par = /intercepts pointer events/.test(erreur) ? (erreur.match(/<[^>]+>/)?.[0] ?? 'un autre élément') : erreur.split('\n')[0]
        couverts.push({ sig: c.sig, nom: c.nom, par })
        return
      }
      if (effets.length) {
        actifs.push(e)
        sale = true
      } else if (c.inactif) inactifs.push({ sig: c.sig, nom: c.nom, raison: c.inactif })
      else if (
        await loc
          .evaluate(
            (el) =>
              el.matches('[aria-checked=true], [aria-selected=true], [aria-pressed=true], [aria-current], .on, .active, :checked, :has(> input:checked)') ||
              // Étiquette d'un champ déjà en main (autofocus) : rien à déplacer.
              (el instanceof HTMLLabelElement && !!el.control && el.control === document.activeElement),
          )
          .catch(() => false)
      )
        dejaChoisis.push({ sig: c.sig, nom: c.nom })
      else sansEffet.push(e)
        }
    const passe = async (c: Cible, fermer: boolean) => {
      for (let essai = 0; essai < 2; essai++) {
        try {
          await un(c, fermer)
          break
        } catch (e) {
          arme = false
          sale = true
          if (essai) erreurs.push({ sig: c.sig, nom: c.nom, erreur: String((e as Error).message).split('\n')[0] })
        }
      }
    }
    for (const c of liste) await passe(c, false)
    // La feuille ouverte d'emblée se ferme-t-elle sur place ? Sinon (elle mène ailleurs), tout ce qui est dessous
    // appartient à cette autre page, testée à sa propre adresse.
    let ailleurs: string | null = null
    if (aRevoir.length) {
      sale = true
      for (let k = 0; k < 2 && sale; k++) {
        try {
          await ouvrir()
          sale = false
        } catch {
          await page.waitForTimeout(500)
        }
      }
      const url = page.url()
      await page.keyboard.press('Escape')
      await calme(page).catch(() => {})
      if (page.url() === url && (await page.locator('.veil').first().isVisible().catch(() => false))) {
        await page.locator('.veil').first().click({ force: true, position: { x: 10, y: 10 } }).catch(() => {})
        await page.waitForTimeout(600)
      }
      if (page.url() !== url) ailleurs = new URL(page.url()).pathname
      sale = true
    }
    for (const c of aRevoir)
      if (ailleurs) couverts.push({ sig: c.sig, nom: c.nom, par: 'feuille ouverte d’emblée (la fermer mène à ' + ailleurs + ')' })
      else await passe(c, true)

    mkdirSync(DOSSIER, { recursive: true })
    const nomFichier = (adresse.slice(1) || 'accueil').replace(/[^\w-]+/g, '_')
    writeFileSync(
      new URL(nomFichier + '.json', DOSSIER),
      JSON.stringify({ adresse, largeur: LARGEUR, theme: THEME, langue: LANG, total: liste.length, sansEffet, erreurs, mauvaises, dejaChoisis, inactifs, couverts, externes, absents, actifs }, null, 1),
    )
    const mauvaisExternes = externes.filter((x) => x.erreur)
    expect(mauvaises, 'liens vers une page inconnue').toEqual([])
    expect(erreurs, 'éléments impossibles à toucher').toEqual([])
    expect(mauvaisExternes, 'liens sortants mal formés').toEqual([])
    expect(
      sansEffet.map((x) => `${x.zone} · ${x.nom} ${x.href ? '→ ' + x.href : ''}`),
      'éléments sans effet',
    ).toEqual([])
  })
}
