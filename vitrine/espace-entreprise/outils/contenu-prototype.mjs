// Reprend du prototype entreprise les styles du CONTENU des écrans (panneaux, indicateurs, tableaux, lignes, pastilles,
// encadrés, héros, composants propres entA-, entb-, ec7-, ec8-) pour que les écrans repris gardent le balisage et les
// classes du prototype (BRIEF-PROTOTYPE.md : structure exacte, contenu amélioré). Méthode du vendeur
// (espace-vendeur/outils/styles.mjs), adaptée à l'entreprise :
// - tout est rangé sous « .px » (racine du contenu d'un écran repris) : aucune fuite vers la coque ni les autres écrans ;
// - les couleurs sont celles des jetons de l'entreprise (src/styles/jetons.css, DP-64) : les variables du prototype
//   (--acc…, --n1…) sont des alias des jetons ; toute couleur écrite dans le prototype est remplacée par un jeton ;
//   la « nuit » du prototype devient la carte de tête claire au léger dégradé vert (carte-nuit, DP-64) ;
// - les boutons restent ceux de l'application (vert sapin ; l'orange est réservé aux alertes) ;
// - appareil du prototype → largeur d'écran (téléphone < 768 px, tablette 768-1023 px, ordinateur ≥ 1024 px) ;
// - tailles de police en rem (taille du texte libre), hauteurs des pastilles et puces en hauteur minimale.
// Écrit src/styles/contenu.css. Usage : node outils/contenu-prototype.mjs [--restes]
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { trouverPrototype } from './proto.mjs'

const fichier = trouverPrototype()
if (!fichier) throw new Error('prototype entreprise introuvable : poser PROTO_ENTREPRISE=<chemin du fichier HTML>')
const html = readFileSync(fichier, 'utf-8')
const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'))

// ---------- Découpage en règles (commentaires retirés ; @media gardés avec leurs règles) ----------
function regles(texte) {
  const out = []
  let i = 0
  const t = texte.replace(/\/\*[\s\S]*?\*\//g, '')
  while (i < t.length) {
    const o = t.indexOf('{', i)
    if (o < 0) break
    const tete = t.slice(i, o).trim()
    let prof = 1
    let j = o + 1
    for (; j < t.length && prof; j++) {
      if (t[j] === '{') prof++
      else if (t[j] === '}') prof--
    }
    const corps = t.slice(o + 1, j - 1)
    if (tete.startsWith('@media')) out.push({ media: tete, regles: regles(corps) })
    else if (!tete.startsWith('@')) out.push({ sel: tete, corps: corps.trim() })
    i = j
  }
  return out
}

// ---------- Sélecteurs ----------
// Coque, cadre du téléphone, outil de revue, boutons (ceux de l'application restent) : jamais repris.
const HORS = /(\.(cns|sd|sd-[\w-]+|tb|tb-[\w-]+|dk-main|dk-body|crumbs|plan|plan-[\w-]+|proto-bar|m-app|sb|home-ind|dock|tab|hd|hd-[\w-]+|glass|fab|bottom-cta|cam|cam-view|shutter|avatar|ibtn|toast|veil|sheet|grab|modal-veil|keypad|otp|code6|win|win-bar|lang|di|on-dark|entA-login|entA-art|entA-side|entA-top|entA-mlogo|entA-mtop|entA-mlabel|entA-feat|entA-artmap|entA-legal|adme-[\w-]+|liva-[\w-]+|livb-[\w-]+)(?![\w-]))|#frame|html\.cap|html\.embed|data-text|^body|^html$|^\*|:root|^button|^a$|^img|^svg|^h[1-6]/
const BOUTON = /^\.btn(?![\w-])/ // règle de base d'un bouton (couleurs) ; « .dk-head .btn » (mise en page) est gardé

const MEDIAS = {
  mobile: '(max-width:767.98px)',
  tablet: '(min-width:768px) and (max-width:1023.98px)',
  desktop: '(min-width:1024px)',
}

/** Un sélecteur du prototype → { media, sel } sous .px ; null s'il n'est pas repris. */
export function portee(s) {
  s = s.trim()
  if (HORS.test(s)) return null
  let media = null
  let sombre = false
  s = s.replace(/html\[data-app=\w+\]\s*/g, '')
  s = s.replace(/html\[data-theme=dark\]\s*/g, () => ((sombre = true), ''))
  s = s.replace(/html\[data-device=(\w+)\]\s*/g, (_, d) => ((media = MEDIAS[d]), ''))
  if (/^html/.test(s) || BOUTON.test(s)) return null
  // Pastilles bronze et or : couleurs écrites dans le prototype ; leurs jetons (clair et sombre) sont dans RETOUCHES.
  if (/\.pill\.(bronze|gold)(?![\w-])/.test(s)) return null
  s = s.replace(/^(main|\.dk-body)\s+/, '').trim()
  if (!s) return null
  // Titres : la coque pose le h1, les écrans repris titrent leurs blocs en h2 là où le prototype écrit h3.
  s = s.replace(/(^|[\s>+~])h3(?![\w-])/g, '$1:is(h2,h3)')
  // Onglets et segments : liens dans le prototype, liens ou boutons dans l'application.
  s = s.replace(/\.(tabs|seg) a(?![\w-])/g, '.$1 :is(a,button)')
  return { media, sel: (sombre ? 'html[data-theme=dark] ' : '') + '.px ' + s }
}

// ---------- Déclarations ----------
const FOND_PLEIN = /background[^;]*(var\(--acc\)|--acc-grad|var\(--acc-2\)|var\(--red\)|var\(--green\)|--braise|var\(--or\)|var\(--amber\)|--logo-grad|var\(--blue\))/
const PASTILLES = /\.(pill|chip|flt|slot|entb-cls|ec8-f|entA-zc|badge-num)(?![\w-])|\.seg a|\.tabs a|\.entA-chk span|\.dt-tools \.srch/
const restes = new Set()

function decoupe(v, sep) {
  const parts = []
  let prof = 0
  let cur = ''
  for (const c of v) {
    if (c === '(') prof++
    if (c === ')') prof--
    if (c === sep && !prof) {
      parts.push(cur)
      cur = ''
    } else cur += c
  }
  if (cur.trim() || sep === ',') parts.push(cur)
  return parts
}
const LITTERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\((?!var)[^)]*\)/
const ACC_RGB = /rgba\(var\(--acc-rgb\),\s*([\d.]+)\)/g
const melange = (_, a) => `color-mix(in srgb,var(--e) ${Math.round(a * 100)}%,transparent)`

function couleur(prop, v, corps, sel) {
  const blanc = /^#fff(fff)?$/i
  // Ombres : chaque ombre écrite en couleur littérale est retirée (l'ombre des cartes est un jeton).
  if (prop === 'box-shadow') {
    const garde = decoupe(v, ',')
      .map((x) => x.trim().replace(ACC_RGB, melange).replace(/rgba\(255,\s*255,\s*255,\s*[\d.]+\)/g, 'var(--e-line)'))
      .filter((x) => x && !LITTERAL.test(x))
    return garde.length ? garde.join(',') : 'none'
  }
  v = v.replace(ACC_RGB, melange)
  if (prop === 'color' || prop === 'fill' || prop === 'stroke') {
    if (blanc.test(v)) return FOND_PLEIN.test(corps) ? 'var(--sur-e)' : 'var(--ink)'
    if (/rgba\(255,\s*255,\s*255/.test(v)) return 'var(--ink-3)'
    if (/^#171310$/i.test(v)) return 'var(--ink)'
  }
  if (prop.startsWith('background')) {
    if (blanc.test(v)) return 'var(--card)'
    // Dégradés écrits en dur (orange du logo, vert, rouge) : la couleur de l'état, en aplat.
    if (/linear-gradient/.test(v) && /#[0-9a-fA-F]{3,8}/.test(v)) return /red|bad|danger/.test(sel) ? 'var(--red)' : /green|ok/.test(sel) ? 'var(--green)' : 'var(--or)'
    v = decoupe(v, ',').length > 1 && /radial-gradient/.test(v)
      ? decoupeCouches(v).filter((c) => !LITTERAL.test(c)).join(',')
      : v
    v = v.replace(/rgba\(255,\s*255,\s*255,\s*[\d.]+\)/g, 'color-mix(in srgb,var(--card) 70%,transparent)')
    v = v.replace(/rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/g, 'var(--voile)')
    if (!v.trim()) return 'var(--card)'
  }
  if (/^border/.test(prop) || prop === 'outline') {
    v = v.replace(/rgba\(255,\s*255,\s*255,\s*[\d.]+\)/g, 'var(--e-line)').replace(/#fff\b/gi, 'var(--card)').replace(/#171310/gi, 'var(--ink)')
  }
  if (LITTERAL.test(v)) {
    restes.add(`${sel} { ${prop}: ${v} }`)
    v = v.replace(/#[0-9a-fA-F]{3,8}\b/g, 'var(--ink-3)').replace(/rgba?\((?!var)[^)]*\)/g, 'var(--line-2)')
  }
  return v
}
/** Couches d'un fond (« radial-gradient(…), linear-gradient(…) ») : découpées aux virgules de premier niveau. */
function decoupeCouches(v) {
  return decoupe(v, ',').map((x) => x.trim())
}

function declarations(corps, sel) {
  return decoupe(corps, ';')
    .map((d) => {
      const k = d.indexOf(':')
      if (k < 0) return null
      const prop = d.slice(0, k).trim()
      let v = d.slice(k + 1).trim()
      if (prop === 'zoom' || prop === 'cursor' || !v) return null
      v = v.replace(/var\(--fs-(\d+)\)/g, (_, n) => `${+(n / 16).toFixed(4)}rem`)
      if (prop === 'font-size') v = v.replace(/([\d.]+)px/g, (_, n) => `${+(n / 16).toFixed(4)}rem`)
      if (prop === 'height' && PASTILLES.test(sel)) return `min-height:${v}`
      v = couleur(prop, v, corps, sel)
      return `${prop}:${v}`
    })
    .filter(Boolean)
    .join(';')
}

// ---------- Écriture ----------
const parMedia = new Map([[null, []]])
function ajouter(media, sel, corps) {
  if (!parMedia.has(media)) parMedia.set(media, [])
  parMedia.get(media).push(`${sel}{${corps}}`)
}
/** Média du prototype repris ici (largeur d'écran seulement) ; les autres restent à prototype.css (outils/styles.mjs). */
export const mediaRepris = (m) => /width/.test(m) && !/data-device|1100px|520px/.test(m)
function traiter(r, mediaParent) {
  if (r.media) {
    // Médias du prototype : seuls ceux de largeur sont gardés.
    const m = r.media.replace(/^@media\s*/, '')
    if (!mediaRepris(m)) return
    for (const x of r.regles) traiter(x, m)
    return
  }
  const groupes = new Map()
  for (const s of decoupe(r.sel, ',')) {
    if (!s.trim()) continue
    const p = portee(s)
    if (!p) continue
    const m = mediaParent && p.media ? `${mediaParent} and ${p.media}` : (mediaParent ?? p.media)
    if (!groupes.has(m)) groupes.set(m, [])
    groupes.get(m).push(p.sel)
  }
  for (const [m, sels] of groupes) {
    const corps = declarations(r.corps, sels.join(','))
    if (corps) ajouter(m, sels.join(','), corps)
  }
}
/** Début du contenu dans la feuille du prototype (avant : jetons, coque du téléphone, en-têtes et barre du bas). */
export const DEBUT_CONTENU = '/* ===== Pastilles'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) ecrire()

function ecrire() {
// Le contenu commence aux pastilles (avant : jetons, coque du téléphone, en-têtes et barre du bas).
const debut = css.indexOf(DEBUT_CONTENU)
for (const r of regles(css.slice(debut))) traiter(r, null)

// Variables du prototype → jetons de l'entreprise (aucune couleur écrite ici).
const ALIAS = `.px{--acc:var(--e);--acc-2:var(--e);--acc-deep:var(--e-fort);--acc-txt:var(--e-txt);--acc-soft:var(--e-soft);--acc-soft-2:var(--e-soft-2);--acc-line:var(--e-line);--acc-grad:var(--e-grad);
--n1:var(--e-soft);--n2:var(--card);--n3:var(--card);--n-k:var(--e-txt);--sand-4:var(--line-2);--or-deep:var(--or-txt);--or-soft-2:var(--or-soft);--gold:var(--or);
--violet:var(--blue);--violet-txt:var(--blue);--violet-soft:var(--blue-soft);--violet-line:var(--blue-line);
--bronze-bg:var(--or-soft);--argent-bg:var(--sand-3);--or-m-bg:var(--amber-soft);--platine-bg:var(--sand-2);
--shadow-card:var(--ombre-carte);--shadow-pop:var(--ombre-pop);--input-bg:var(--card);--input-line:var(--line-2);--thumb-bg:var(--sand-2);--thumb-bg-or:var(--or-soft);
--logo-grad:var(--e-grad);--page-halos:none;--r-xl:24px;--lh-t:1.14;--lh-m:1.36;--lh-b:1.5}`

// Retouches de l'application : la carte de tête claire (DP-64) à la place de la nuit ; cibles de 44 px ; titres h2.
const RETOUCHES = `.px .hero:is(*,.night,.acc,.orange,.green,.red,.amber){color:var(--ink);background:linear-gradient(135deg,var(--e-soft) 0%,var(--card) 70%);box-shadow:inset 0 0 0 1px var(--e-line)}
.px .hero .hk,.px .hero.night .hk,.px .hero.acc .hk,.px .hero.orange .hk{color:var(--e-txt)}
.px .hero .hs,.px .hero .ec7-sub,.px .hero .kv .k{color:var(--ink-3)}
.px .hero .hs b{color:var(--ink)}
.px .hero .hline{background:var(--e-line)}
.px .hero .ico-b{background:var(--card);color:var(--e-txt);box-shadow:inset 0 0 0 1px var(--e-line)}
.px .hero .bar{background:var(--sand-3)}
.px .hero .entb-ring b,.px .ec7-rw .ring b{color:var(--ink)}
.px .entb-m,.px .m4{background:var(--card);border-color:var(--e-line)}
.px .entb-m .k,.px .m4 .l{color:var(--ink-3)}
.px .entb-m .v{color:var(--ink)}
.px .entb-m .s,.px .m4 .s{color:var(--ink-3)}
.px .entb-prio{background:var(--or-soft);color:var(--or-txt)}
.px .kpi.night,.px .kpi.acc{background:linear-gradient(135deg,var(--e-soft) 0%,var(--card) 70%);color:var(--ink);box-shadow:inset 0 0 0 1px var(--e-line)}
.px .kpi.night .k,.px .kpi.acc .k{color:var(--e-txt)}
.px .kpi.night .s,.px .kpi.acc .s{color:var(--ink-3)}
.px .kpi.night .i,.px .kpi.acc .i{background:var(--card);color:var(--e-txt)}
.px .dk-banner.night{background:linear-gradient(135deg,var(--e-soft) 0%,var(--card) 70%);color:var(--ink);border-color:var(--e-line)}
.px .offline-banner{background:var(--amber-soft);color:var(--ink);box-shadow:inset 0 0 0 1px var(--amber-line)}
.px .offline-banner svg{color:var(--amber)}
.px .sec h2{margin:0}
.px h2.pg-t{margin:0}
.px .pg-k{color:var(--e-txt)}
.px :is(a,button).chip,.px :is(a,button).flt,.px .seg>:is(a,button),.px .tabs>:is(a,button),.px a.li,.px :is(a,button).entb-open{min-height:44px}
.px :is(a,button).entb-open{min-width:44px}
.px button.chip,.px button.flt,.px .seg>button,.px .tabs>button{font:inherit;font-weight:700;cursor:pointer}
.px .seg>button,.px .tabs>button{border:0;background:transparent}
.px .tg{cursor:pointer;min-width:50px;min-height:30px;box-sizing:content-box;border:7px solid transparent;background-clip:padding-box;margin:-7px}
/* Un seul interrupteur, même taille éteint et allumé : le dégradé reste dans la piste (la bordure transparente qui agrandit la cible à 44 px n'est jamais peinte) ; seuls la couleur et le curseur changent. */
.px .tg,.px .tg.on,.px .tg.lock{background-clip:padding-box;background-origin:padding-box}
.px table.ec8-mx .tg{transform:none}
.px .ec8-th .un{color:var(--sur-alerte)}
.px .chip{white-space:normal;max-width:100%;text-align:left}
.px .seg :is(a,button){white-space:normal;min-width:0;text-align:center;line-height:1.2}
.px :is(.tiles,.g,.split2,.split3)>*{min-width:0;overflow-wrap:anywhere}
.px :is(.ph .a,.sec .a){min-height:44px}
.px :is(td,.v,.entb-imeta,.t2,.ls,.lt,.entb-pq-main)>a:not(.btn):not(.pill):not(.chip){display:inline-flex;align-items:center;min-height:44px;min-width:44px;margin-block:-12px}
.px a.li,.px a.kpi,.px a.tile,.px a.panel{color:inherit;text-decoration:none}
.px .dk-head .acts .btn{width:auto}
.px .hint-l{text-align:left;justify-content:flex-start}
.px .glass{background:color-mix(in srgb,var(--card) 90%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:var(--ombre-carte)}
.px .photo .ts{background:color-mix(in srgb,var(--card) 88%,transparent);color:var(--ink)}
.px .pill.bronze{background:var(--or-soft);color:var(--or-txt);border-color:var(--or-line)}
.px .pill.gold{background:var(--amber-soft);color:var(--amber);border-color:var(--amber-line)}
.px .medal.argent,.px .medal.or,.px .medal.platine{color:var(--ink)}
.px .codeblk{background:var(--sand-2);color:var(--ink)}
.px :is(.sec .a,.panel .ph .a,.links,.entA-link){color:var(--e-txt)}
.px :is(.entb-pay .v,.entb-pl.tot .v){color:var(--e-txt)}
.px .li{min-height:56px}
.px .srch{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 6px 0 12px;border-radius:11px;border:1px solid var(--line-2);background:var(--input-bg);color:var(--ink-3);font-size:0.8125rem}
.px .srch input{flex:1;min-width:0;min-height:42px;border:0;background:transparent;outline:none;font:inherit;font-size:0.875rem;color:var(--ink)}
.px .srch input::placeholder{color:var(--ink-4)}
.px .srch:focus-within{border-color:var(--e);box-shadow:var(--focus)}
.px label.flt,.px .dt-tools label.flt{display:inline-flex;min-height:44px;padding:0 4px 0 12px;cursor:pointer;position:relative}
.px label.flt select{appearance:none;-webkit-appearance:none;min-height:42px;border:0;background:transparent;font:inherit;font-weight:700;color:inherit;outline:none;cursor:pointer;max-width:220px;padding:0 8px 0 0}
.px label.flt:focus-within{box-shadow:var(--focus)}
.px :is(.stepper .st.cur b,.stop.cur .sn,.entA-step.cur .n){background:var(--e-grad);color:var(--sur-e);box-shadow:0 0 0 4px var(--e-soft)}
.px .steps i.cur{background:var(--e)}
.px .tl .ti.cur::before{background:var(--e);box-shadow:0 0 0 3px var(--card),0 0 0 6px var(--e-soft-2)}
.px .entA-cal i.cur{box-shadow:0 0 0 2px var(--e)}
.px .pill.solid-or{background:var(--or);color:var(--sur-alerte)}
.px .dt-foot>a{display:inline-flex;align-items:center;min-height:44px;color:var(--e-txt);font-weight:700}
.px .kpi.or{background:var(--e-grad);color:var(--sur-e)}
.px .kpi.or :is(.k,.s,.i,.v){color:var(--sur-e)}
.px .fld-l,.px .fld-g{display:block}
.px .fld-g{border:0;padding:0;min-width:0}
.px .fld-t{display:block;font-size:0.8125rem;font-weight:700;margin-bottom:6px;color:var(--ink-2);padding:0}
.px .fld .aide{display:block;margin-top:6px}
.px .inp:has(:is(input,select,textarea)[aria-invalid=true]){border-color:var(--red)}
.px .inp:focus-within{border-color:var(--acc);box-shadow:0 0 0 4px color-mix(in srgb,var(--e) 14%,transparent)}
.px .inp:has(textarea){min-height:96px;align-items:stretch}
.px .av-seul{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;background:var(--e-soft);color:var(--e-txt);font-weight:800;box-shadow:inset 0 0 0 1.5px var(--e-line)}
.px .av-seul.gris{background:var(--sand-2);color:var(--ink-3);box-shadow:inset 0 0 0 1.5px var(--line-2)}
.px .av-seul.red{background:var(--red-soft);color:var(--red);box-shadow:inset 0 0 0 1.5px var(--red-line)}
.px .av-seul.amber{background:var(--amber-soft);color:var(--amber);box-shadow:inset 0 0 0 1.5px var(--amber-line)}`

let sortie = `/* ENGENDRÉ par outils/contenu-prototype.mjs depuis le prototype entreprise (paquet 5) : ne pas modifier à la main.
   Styles du CONTENU des écrans repris, sous .px ; couleurs : jetons seulement (DP-64). */\n${ALIAS}\n`
sortie += parMedia.get(null).join('\n') + '\n'
for (const [m, lignes] of parMedia) if (m !== null) sortie += `@media ${m}{\n${lignes.join('\n')}\n}\n`
sortie += RETOUCHES + '\n'
writeFileSync(new URL('../src/styles/contenu.css', import.meta.url), sortie)
console.log(`contenu.css : ${sortie.split('\n').length} lignes ; couleurs écrites remplacées d'office : ${restes.size}`)
if (process.argv.includes('--restes')) for (const r of restes) console.log('  ' + r)
}
