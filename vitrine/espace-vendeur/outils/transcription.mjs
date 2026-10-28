// Transcription d'un état du prototype vendeur en JSX (même méthode que site/outils/transcription.mjs) : ce que le
// prototype affiche, toutes couches de corrections du 1er octobre appliquées. Règles :
// - chaque nœud de texte devient {t('…')}, découpé exactement comme dans le prototype (applyLang traduit nœud par
//   nœud) ; dans .nofmt (codes), le texte reste tel quel ;
// - une icône Lucide devient <Icone nom taille trait style> ;
// - un dessin (produit, portrait, photo de preuve) devient <Dessin id="…" /> ; son SVG va dans src/genere/dessins.json
//   (clair, et sombre s'il diffère) ;
// - une image incluse (data:) est écrite dans src/assets/prototype/ et importée ;
// - un lien « #route?… » devient <Link to="/route?…"> ;
// - les boutons data-act (thème, langue, taille du texte) gardent leur attribut : la coque les fait marcher.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chemin } from './inventaire-commun.mjs'
import { PROTO } from './proto.mjs'

const DESSINS = new URL('../src/genere/dessins.json', import.meta.url)
const IMAGES = new URL('../src/assets/prototype/', import.meta.url)

// Lecture du DOM rendu, dans le navigateur : un arbre simple, icônes et dessins reconnus.
function lire() {
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const norme = (h) => {
    tmp.innerHTML = h
    return tmp.innerHTML.replace(/\s+/g, '')
  }
  const icones = new Map(Object.entries(ICONS).map(([k, v]) => [norme(v), k])) // eslint-disable-line no-undef
  const attrs = (e) => Object.fromEntries([...e.attributes].map((a) => [a.name, a.value]))
  const noeud = (n, nofmt) => {
    if (n.nodeType === 3) return n.nodeValue ? { texte: n.nodeValue, nofmt } : null
    if (n.nodeType !== 1) return null
    const tag = n.tagName.toLowerCase()
    if (tag === 'script') return null
    if (tag === 'style') return { style: n.textContent }
    if (tag === 'svg') {
      const nom = icones.get(norme(n.innerHTML))
      if (nom) return { icone: nom, attrs: attrs(n) }
      return { dessin: { attrs: attrs(n), interieur: n.innerHTML } }
    }
    const nf = nofmt || n.classList.contains('nofmt')
    return { tag, attrs: attrs(n), enfants: [...n.childNodes].map((c) => noeud(c, nf)).filter(Boolean) }
  }
  const app = document.getElementById('app')
  const main = app.querySelector(':scope > main')
  const avant = []
  const apres = []
  let vu = false
  for (const e of app.children) {
    if (e === main) vu = true
    // En-tête racine ou enfant : dessiné par la coque (Ecran) ; barre d'état, île et barre d'accueil : hors application.
    else if (!vu && !e.matches('.sb, .dyn, .dynb, .home-ind') && !(e.matches('header.hd') && e.querySelector('.hd-sub, .hd-row'))) avant.push(e)
    // Barre du bas et menu du profil (?pop=profil) : dessinés par la coque.
    else if (vu && !e.matches('nav.dock, .home-ind, .dyn, .dynb, i[data-fixed], .pm, .pm-veil')) apres.push(e)
  }
  return {
    adresse: location.hash,
    avant: avant.map((c) => noeud(c, false)).filter(Boolean),
    contenu: main ? [...main.childNodes].map((c) => noeud(c, false)).filter(Boolean) : [],
    fixes: apres.map((c) => noeud(c, false)).filter(Boolean),
  }
}

// Relève un état en clair et en sombre (les dessins peuvent changer avec le thème).
export async function releverEtat(page, adresse) {
  const releve = {}
  for (const theme of ['light', 'dark']) {
    await page.goto('about:blank')
    await page.goto(PROTO.href + `?theme=${theme}&lang=fr&text=normale&nosplash=1` + adresse)
    await page.waitForSelector('#app', { state: 'attached' })
    releve[theme] = await page.evaluate(lire)
  }
  if (decodeURIComponent(releve.light.adresse) !== decodeURIComponent(adresse)) throw new Error(`${adresse} : le prototype a redirigé vers ${releve.light.adresse}`)
  return releve
}

export class Transcripteur {
  constructor(prefixe = '../../../') {
    this.dessins = existsSync(DESSINS) ? JSON.parse(readFileSync(DESSINS, 'utf-8')) : {}
    this.imports = new Map()
    this.prefixe = prefixe
    mkdirSync(IMAGES, { recursive: true })
  }

  enregistrer() {
    writeFileSync(DESSINS, JSON.stringify(Object.fromEntries(Object.entries(this.dessins).sort()), null, 1) + '\n')
  }

  // { avant, contenu, fixes } en JSX (chaînes), indentés de `ind` niveaux.
  jsx(releve, ind) {
    const sombres = []
    const collecte = (liste) =>
      liste.forEach((n) => {
        if (n.dessin) sombres.push(n.dessin)
        if (n.enfants) collecte(n.enfants)
      })
    collecte([...releve.dark.avant, ...releve.dark.contenu, ...releve.dark.fixes])
    this.rang = 0
    this.sombres = sombres
    return {
      avant: releve.light.avant.map((n) => this.noeud(n, ind)).join('\n'),
      contenu: releve.light.contenu.map((n) => this.noeud(n, ind)).join('\n'),
      fixes: releve.light.fixes.map((n) => this.noeud(n, ind)).join('\n'),
    }
  }

  image(dataUri) {
    const m = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml)(?:;charset=[\w-]+)?(;base64)?,(.*)$/s.exec(dataUri)
    if (!m) throw new Error('image incluse inconnue : ' + dataUri.slice(0, 40))
    const octets = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]))
    const ext = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif', 'svg+xml': 'svg' }[m[1]]
    const nom = empreinte(octets) + '.' + ext
    if (!existsSync(new URL(nom, IMAGES))) writeFileSync(new URL(nom, IMAGES), octets)
    const v = 'img_' + nom.replace('.', '_')
    this.imports.set(v, nom)
    return v
  }

  style(s) {
    const decl = []
    let prof = 0
    let cur = ''
    for (const c of s) {
      if (c === '(') prof++
      if (c === ')') prof--
      if (c === ';' && !prof) {
        decl.push(cur)
        cur = ''
      } else cur += c
    }
    decl.push(cur)
    const paires = decl
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(':')
        const k = d.slice(0, i).trim()
        const v = d.slice(i + 1).trim()
        let expr = lit(v)
        const u = /url\((["']?)(data:[^)"']+)\1\)/.exec(v)
        if (u) expr = '`' + v.replace(u[0], 'url(${' + this.image(u[2]) + '})').replace(/`/g, '\\`') + '`'
        return `${JSON.stringify(camel(k))}: ${expr}`
      })
    return paires.some((p) => p.startsWith('"--')) ? `{{ ${paires.join(', ')} } as CSSProperties}` : `{{ ${paires.join(', ')} }}`
  }

  attributs(tag, a, svg) {
    const out = []
    for (const [k0, v] of Object.entries(a)) {
      let k = RENOMME[k0] || (svg ? svgAttr(k0) : k0)
      if (k0 === 'style') {
        if (v.trim()) out.push(`style=${this.style(v)}`)
        continue
      }
      if (k0 === 'href' && tag === 'a') continue
      if (k0 === 'src' && v.startsWith('data:')) {
        out.push(`src={${this.image(v)}}`)
        continue
      }
      if ((tag === 'input' || tag === 'textarea') && k0 === 'value') k = 'defaultValue'
      if ((tag === 'input' || tag === 'textarea') && k0 === 'checked') k = 'defaultChecked'
      if ((tag === 'details') && k0 === 'open') {
        out.push('open')
        continue
      }
      if (BOOLEENS.has(k0)) out.push(k)
      else if (NUMERIQUES.has(k0) && /^-?\d+(\.\d+)?$/.test(v)) out.push(`${k}={${v}}`)
      else if (/[  ⁠​ ]/.test(v)) out.push(`${k}={${lit(v)}}`)
      else out.push(`${k}=${JSON.stringify(v)}`)
    }
    return out.length ? ' ' + out.join(' ') : ''
  }

  noeud(n, ind) {
    const pad = '  '.repeat(ind)
    if (n.texte !== undefined) {
      const l = lit(n.texte)
      return pad + (n.nofmt || !n.texte.trim() ? `{${l}}` : `{t(${l})}`)
    }
    if (n.style !== undefined) return pad + `<style>{${lit(n.style)}}</style>`
    if (n.icone) {
      const a = n.attrs
      const props = [`nom=${JSON.stringify(n.icone)}`, `taille={${Number(a.width)}}`]
      if (a['stroke-width'] && a['stroke-width'] !== '1.9') props.push(`trait={${Number(a['stroke-width'])}}`)
      if (a.style) props.push(`style=${this.style(a.style)}`)
      return pad + `<Icone ${props.join(' ')} />`
    }
    if (n.dessin) {
      const sombre = this.sombres[this.rang++]
      const id = empreinte(n.dessin.interieur + JSON.stringify(n.dessin.attrs))
      this.dessins[id] = {
        attrs: n.dessin.attrs,
        clair: n.dessin.interieur,
        ...(sombre && sombre.interieur !== n.dessin.interieur ? { sombre: sombre.interieur } : {}),
      }
      return pad + `<Dessin id=${JSON.stringify(id)} />`
    }
    let { tag } = n
    let ouverture
    if (tag === 'a' && n.attrs.href !== undefined) {
      const h = n.attrs.href
      if (h.startsWith('#') && h.length > 1) {
        ouverture = `<Link to=${JSON.stringify(chemin(h.replace(/ /g, '%20')))}${this.attributs('a', n.attrs)}`
        tag = 'Link'
      } else ouverture = `<a href=${JSON.stringify(h)}${this.attributs('a', n.attrs)}`
    } else ouverture = `<${tag}${this.attributs(tag, n.attrs)}`
    if (VIDES.has(n.tag)) return pad + ouverture + ' />'
    if (!n.enfants.length) return pad + ouverture + `></${tag}>`
    return pad + ouverture + '>\n' + n.enfants.map((c) => this.noeud(c, ind + 1)).join('\n') + '\n' + pad + `</${tag}>`
  }
}

// Caractères invisibles écrits en échappement (espace insécable, fine insécable, gluon, espaces fines).
const lit = (v) => JSON.stringify(v).replace(/[  ⁠​ ]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'))
const camel = (k) => (k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()))
const svgAttr = (k) => (k.startsWith('aria-') || k.startsWith('data-') || k === 'viewBox' ? k : camel(k))
const empreinte = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12)
const RENOMME = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', colspan: 'colSpan', rowspan: 'rowSpan', readonly: 'readOnly',
  maxlength: 'maxLength', autocomplete: 'autoComplete', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', srcset: 'srcSet',
  crossorigin: 'crossOrigin', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
}
const BOOLEENS = new Set(['hidden', 'checked', 'disabled', 'selected', 'required', 'readonly', 'multiple', 'autofocus'])
const NUMERIQUES = new Set(['tabindex', 'colspan', 'rowspan', 'maxlength', 'minlength', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-level', 'aria-posinset', 'aria-setsize'])
const VIDES = new Set(['br', 'hr', 'img', 'input', 'meta', 'source', 'wbr'])
