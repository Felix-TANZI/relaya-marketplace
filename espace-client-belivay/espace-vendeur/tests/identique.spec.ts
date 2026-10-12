// L'espace vendeur doit être identique au prototype vendeur du 1er octobre (DP-54 : le prototype est le squelette ;
// en-têtes à design intouchables). Chaque test ouvre la même adresse dans le prototype et dans l'application, à
// 390 × 844, et compare les images (pixelmatch, seuil 0,01) :
// - l'EN-TÊTE de toutes les routes ouvertes, en clair, en sombre et en anglais (la coque est intouchable) ;
// - l'ÉCRAN ENTIER, déroulé, de chaque état des pages provisoires (balisage du prototype tel quel). Un écran repris
//   en sort (DP-54 : le contenu s'enrichit, suit les données et les décisions du porteur) : seul son en-tête reste
//   comparé au pixel. Vague d'intégration du 6 oct. : les 69 routes ouvertes sont reprises.
// Le prototype dessine la barre d'état, l'île et la barre d'accueil du téléphone : masquées. La barre du bas est
// exclue des deux côtés (barre ovale en verre liquide du client, consigne du porteur du 5 oct. : elle ne suit plus le
// prototype ; ses onglets sont vérifiés par tests/squelette.spec.ts). Les montants que le moteur recalcule
// (CORRECTIONS) sont remplacés dans le prototype avant la comparaison, comme le client le fait (DP-47).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { calculerCommission } from '../src/calculs/commission'
import { PARAMETRES } from '../src/calculs/registre'
import { AJOUTEES, ETATS, OUVERTES, PROTOTYPE, PROVISOIRES, REPRISES, adresse, etatsDe, figerHorloge, type Rendu } from './commun'

const SEUIL = 0.01
// Montants du prototype que le moteur (src/calculs, = moteurs/) calcule autrement, tant que M05 et M06 sont « en
// attente » (Q-02) : l'iPhone 15 Pro Max à 350 000 F en découverte garde 335 324 F dans le prototype (référence M06),
// 339 640 F au barème seul. Écrits dans les deux langues.
const IPHONE = calculerCommission([{ famille: 'A', prixUnitaire: 350000 }], 'Bronze', true, PARAMETRES.commission).garde
const milliers = (n: number, sep: string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
const CORRECTIONS: [string, string][] = [
  [milliers(335324, ' '), milliers(IPHONE, ' ')],
  [milliers(335324, ','), milliers(IPHONE, ',')],
]

// En-têtes dont les pastilles et la cloche suivent les données (VD-04, INTEGRATION.md 2) : « Rien à faire » et
// « Premier jour » montrent les vraies notifications (le prototype écrit « — » et « 1 ») et le palier réel (le
// prototype dessine « Bronze · lancement » pour une boutique sans score). Le dessin de l'en-tête (logo, carte,
// boutons, place des pastilles) reste comparé ; le texte des pastilles et le nombre de la cloche sont masqués des
// deux côtés.
const ENTETE_DONNEES = new Set(['accueil_calme', 'premier_jour'])
const MASQUE_DONNEES = 'header.hd .hd-pills .pill,header.hd .bdg{visibility:hidden!important}'
// DP-58 : « Nouveau produit » tient sur une seule page (offre1) ; fiche, offre2 et offre4 y mènent. Le titre change
// (« Nouveau produit », comme l'interface réelle) : seul le texte du titre est masqué, le reste de l'en-tête est comparé.
const TITRE_DP58 = new Set(['offre1', 'fiche', 'offre2', 'offre4'])
const MASQUE_TITRE = 'header.hd h1{visibility:hidden!important}'
// Remise d'une commande : le titre porte la référence de la commande ouverte par défaut (la plus urgente du jeu
// d'essai, qui suit les données) ; seul le texte du titre est masqué. offre3 : « Nouveau produit » (DP-58), comme offre1.
const TITRE_DONNEES = new Set(['commande_prete', 'commande_remise', 'offre3'])

const RENDUS: Rendu[] = [
  { nom: 'clair', theme: 'light', lang: 'fr' },
  { nom: 'sombre', theme: 'dark', lang: 'fr' },
  { nom: 'anglais', theme: 'light', lang: 'en' },
]
const TELEPHONE = '.sb,.home-ind,.dyn,.dynb,.blv-bar,.blv-plan{visibility:hidden!important}'
// Défauts du prototype corrigés par l'application (src/styles/vendeur.css, RAPPORT.md du prototype) : la même
// correction est posée sur le prototype avant la comparaison (défaut 1 : pastille d'en-tête coupée en anglais ;
// défaut 2 : puce active du reçu illisible en sombre).
const DEFAUTS_CORRIGES = '.hd-pills{overflow-x:auto;scrollbar-width:none}.hd-pills::-webkit-scrollbar{display:none}html[data-theme=dark] .vx-chips a.on{color:#141415}'
// Corrections de la spécification (DP-44 ; Q-43 : mêmes règles que le client, comme site/tests/identique.spec.ts et
// site/outils/corrections.mjs), posées aussi sur le prototype : (2) braise #C9500E → #B0430A et texte orangé à 4,5 : 1
// (src/styles/ecarts.css, telle quelle) ; (3) aucun texte sous 12 px (outils/styles.mjs le fait dans la feuille de
// l'application) : le badge de la cloche et le libellé de l'en-tête racine changent donc de rendu des deux côtés.
const ECARTS_CSS = readFileSync(new URL('../src/styles/ecarts.css', import.meta.url), 'utf-8')
const douzePx = () => {
  const douze = (style: CSSStyleDeclaration) => {
    const v = style.getPropertyValue('font-size')
    if (/^\d+(\.\d+)?px$/.test(v) && parseFloat(v) < 12) style.setProperty('font-size', '12px', style.getPropertyPriority('font-size'))
    if (style.getPropertyValue('--fs-11').trim() === '11px') style.setProperty('--fs-11', '12px')
  }
  const parcourir = (regles: CSSRuleList) => {
    for (const r of regles) {
      if ('style' in r) douze((r as CSSStyleRule).style)
      if ('cssRules' in r) parcourir((r as CSSGroupingRule).cssRules)
    }
  }
  for (const f of document.styleSheets) parcourir(f.cssRules)
  document.querySelectorAll<HTMLElement>('[style]').forEach((e) => douze(e.style))
}
const BARRE = 'nav.dock{visibility:hidden!important}'
const COQUE_SEULE = '#app>*:not(header.hd){visibility:hidden!important}'
const DEROULE = '#app{height:auto!important;min-height:844px}main{position:relative!important;overflow:visible!important;height:auto!important}'

const animationsFinies = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5000 }).catch(() => undefined)

// Les montants recalculés ne valent que pour les écrans repris (branchés sur la source) ; une page provisoire montre
// le balisage du prototype tel quel.
const repris = (a: string) => REPRISES.includes(a.replace(/^#/, '').split('?')[0])

async function prototype(page: Page, a: string, r: Rendu, deroule: boolean, plus = '') {
  await figerHorloge(page)
  await page.goto(`${PROTOTYPE}?theme=${r.theme}&lang=${r.lang}&text=normale&nosplash=1${a}`)
  await page.waitForSelector('#app', { state: 'attached' })
  await page.addStyleTag({ content: TELEPHONE + DEFAUTS_CORRIGES + BARRE + (deroule ? DEROULE : COQUE_SEULE) + plus })
  await page.addStyleTag({ content: ECARTS_CSS })
  await page.evaluate(douzePx)
  await page.evaluate((c) => {
    const w = document.createTreeWalker(document.querySelector('#app')!, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = w.nextNode())) for (const [de, vers] of c) if (n.nodeValue!.includes(de)) n.nodeValue = n.nodeValue!.split(de).join(vers)
  }, repris(a) ? CORRECTIONS : [])
  await page.evaluate(() => document.fonts.ready)
  await animationsFinies(page)
}

async function application(page: Page, a: string, r: Rendu, deroule: boolean, plus = '') {
  await figerHorloge(page)
  await page.addInitScript(
    ([t, l]) => {
      localStorage.setItem('blv_v_theme', t)
      localStorage.setItem('blv_v_lang', l)
      localStorage.setItem('blv_v_text', 'normale')
    },
    [r.theme, r.lang] as const,
  )
  await page.goto(adresse(a))
  await page.waitForSelector('#app main', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
  // Langue et thème ajoutés à la fin du Menu provisoire (Q-45) : absents du prototype, retirés de la comparaison.
  await page.addStyleTag({ content: '#app{--sb:50px!important}[data-preferences-menu]{display:none!important}' + BARRE + (deroule ? DEROULE : COQUE_SEULE) + plus })
  await page.evaluate(() => document.fonts.ready)
  await animationsFinies(page)
}

const png = async (page: Page, clip?: { x: number; y: number; width: number; height: number }) =>
  PNG.sync.read(await page.screenshot({ clip, fullPage: !clip, animations: 'disabled', caret: 'hide' }))
function ecart(a: PNG, b: PNG) {
  if (a.width !== b.width || a.height !== b.height) return { taille: `${a.width}×${a.height} ≠ ${b.width}×${b.height}`, pixels: -1 }
  const diff = new PNG({ width: a.width, height: a.height })
  return { taille: '', pixels: pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: SEUIL }), diff }
}
const boite = (page: Page, sel: string) =>
  page.$eval(sel, (e) => {
    const r = e.getBoundingClientRect()
    return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) }
  })

// ---------- En-tête (coque intouchable), toutes les routes ouvertes ----------
for (const r of RENDUS)
  test.describe(`en-tête identique au prototype, ${r.nom}`, () => {
    for (const route of OUVERTES.filter((x) => ETATS[x]?.entete !== 'aucun' && !AJOUTEES.includes(x)))
      test(route, async ({ browser }, info) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
        const [pp, pa] = [await ctx.newPage(), await ctx.newPage()]
        const plus = (ENTETE_DONNEES.has(route) ? MASQUE_DONNEES : '') + (TITRE_DP58.has(route) || TITRE_DONNEES.has(route) ? MASQUE_TITRE : '')
        await prototype(pp, '#' + route, r, false, plus)
        await application(pa, '#' + route, r, false, plus)
        const [bp, ba] = [await boite(pp, 'header.hd'), await boite(pa, 'header.hd')]
        expect(ba, 'position et taille de l’en-tête').toEqual(bp)
        const e = ecart(await png(pp, bp), await png(pa, ba))
        if (e.pixels) await info.attach('ecart.png', { body: PNG.sync.write(e.diff!), contentType: 'image/png' })
        expect(e.pixels, 'pixels différents').toBe(0)
        await ctx.close()
      })
  })

// ---------- Écran entier : chaque état des pages provisoires (clair), jamais un écran repris (DP-54) ----------
const ENTIERS: { a: string; r: Rendu }[] = PROVISOIRES.flatMap((route) => etatsDe(route).map((a) => ({ a, r: RENDUS[0] }))).filter(
  ({ a }) => !/^#(lancement|camera)\b/.test(a), // animation d'ouverture, viseur de la caméra : en mouvement
)

test.describe('écran entier identique au prototype', () => {
  for (const { a, r } of ENTIERS)
    test(`${a} · ${r.nom}`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
      const [pp, pa] = [await ctx.newPage(), await ctx.newPage()]
      await prototype(pp, a, r, true)
      await application(pa, a, r, true)
      const [x, y] = [await png(pp), await png(pa)]
      const e = ecart(x, y)
      if (e.pixels) {
        writeFileSync(info.outputPath('prototype.png'), PNG.sync.write(x))
        writeFileSync(info.outputPath('application.png'), PNG.sync.write(y))
        if (e.diff) writeFileSync(info.outputPath('ecart.png'), PNG.sync.write(e.diff))
      }
      expect(e.taille, 'taille de l’écran').toBe('')
      expect(e.pixels, 'pixels différents').toBe(0)
      await ctx.close()
    })
})
