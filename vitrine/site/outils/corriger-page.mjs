// Corrections du porteur appliquées au DOM du prototype, partagées par la comparaison (outils/corrections.mjs)
// et la génération des écrans (outils/transcription.mjs) : ce qui est généré est exactement ce qui est comparé.
// - DP-13 : choix « Pidgin » retiré ; DP-44 : étiquettes « CURATED » et « SPONSO » retirées ;
// - DP-47 : montants recalculés (src/demo/recalculs.json : montant, passage exact, ou nœud entier, avec
//   « routes », « etats », « dans ») et structures recalculées (src/demo/structures.json : une remise par colis,
//   suppléments M et L retirés, grille de garde…) ;
// - en français seulement, si demandé : anglicismes (affichage, comme src/i18n/texte.ts).
import { existsSync, readFileSync } from 'node:fs'
import { cleEtat } from './adresses.mjs'
import { cle, echanger, paires, versAnglais } from './nombres.mjs'

const lire = (chemin) => JSON.parse(readFileSync(new URL(chemin, import.meta.url), 'utf-8'))
const RECALCULS = lire('../src/demo/recalculs.json')
const STRUCTURES = lire('../src/demo/structures.json')
const DICO = { ...lire('../src/genere/en.json'), ...lire('../src/genere/en-etats.json') }
// Traductions propres à une route (outils/anglais.mjs) : lues d'abord sur cette route, comme t() sur le site.
const EN_ROUTES = existsSync(new URL('../src/genere/en-routes.json', import.meta.url)) ? lire('../src/genere/en-routes.json') : {}
const ANGLICISMES = lire('../src/i18n/anglicismes.json')
const RENOMMAGES_EN = lire('../src/i18n/renommages-en.json')

const routeDe = (adresse) => adresse.replace(/^#/, '').split('?')[0]
const concerne = (r, adresse) => (!r.routes || r.routes.includes(routeDe(adresse))) && (!r.etats || r.etats.includes(cleEtat(adresse)))
const anglais = (fr) => (DICO[cle(fr)] !== undefined ? versAnglais(DICO[cle(fr)]) : null)

// Textes anglais des structures (les mêmes que src/i18n/en-structures.json, écrit par outils/structures.mjs).
export function textesStructure(s) {
  if (s.type === 'remisesParColis') {
    const en = anglais(s.libelle) ?? s.libelle
    return Array.from({ length: s.colis }, (_, i) => [`${s.libelle} · colis ${i + 1}`, `${en} · parcel ${i + 1}`])
  }
  if (s.type === 'nonOffert') return [[s.texte, s.en]]
  if (s.type === 'cellules') return s.cellules.flatMap((c, i) => [[c[0], s.en[i][0]], [c[1], s.en[i][1]]])
  return []
}

// Arguments de corrigerDom pour une adresse et une langue.
export function correctionsDe(adresse, lang, { anglicismes = false } = {}) {
  const ici = EN_ROUTES[routeDe(adresse)] ?? {}
  const traduction = (fr) => ici[cle(fr)] ?? DICO[cle(fr)]
  const anglais = (fr) => (traduction(fr) !== undefined ? versAnglais(traduction(fr)) : null)
  const montants = RECALCULS.filter((r) => !r.noeud && concerne(r, adresse)).map(({ prototype, site, texte }) => ({ prototype, site, texte: !!texte }))
  const noeuds = RECALCULS.filter((r) => r.noeud && concerne(r, adresse))
    .flatMap((r) => {
      if (lang === 'fr') return [[cle(r.prototype), r.site, r.dans ?? null]]
      const en = traduction(r.prototype)
      // Bloc en anglais : « dansEn » quand le texte français du bloc n'est pas une entrée entière du dictionnaire.
      const dans = r.dans ? (r.dansEn ?? (anglais(r.dans) ? cle(anglais(r.dans)) : r.dans)) : null
      // Sans traduction, le prototype garde le texte français aux conventions anglaises (applyLang, avant les
      // espaces insécables de fixTypo : « 54,27 € » devient « 54.27 € ») ; le site fait de même (t()).
      // Les deux écritures possibles du texte (espaces insécables gardées ou non : « 45 000 » → « 45,000 »).
      if (en === undefined)
        return [
          [cle(versAnglais(r.prototype)), versAnglais(r.en ?? r.site), dans],
          [cle(versAnglais(cle(r.prototype))), versAnglais(cle(r.en ?? r.site)), dans],
        ]
      if (r.en) return [[cle(versAnglais(en)), versAnglais(r.en), dans]]
      const p = paires(r.prototype, r.site)
      return p ? [[cle(versAnglais(en)), versAnglais(echanger(en, p)), dans]] : []
    })
  const structures = STRUCTURES.filter((s) => concerne(s, adresse)).map((s) => {
    if (lang === 'fr') return { ...s, en: undefined, libelleAffiche: s.libelle, libelles: textesStructure(s).map((x) => x[0]) }
    const t = (fr) => anglais(fr) ?? fr
    if (s.type === 'remisesParColis') return { ...s, libelleAffiche: t(s.libelle), libelles: textesStructure(s).map((x) => x[1]), valeur: s.valeur }
    if (s.type === 'supprimer' || s.type === 'supprimerLigne') return { ...s, texte: t(s.texte) }
    if (s.type === 'nonOffert') return { ...s, dans: s.dansEn ?? anglais(s.dans) ?? s.dans, texte: versAnglais(s.en), ancien: t('Retrait offert') }
    if (s.type === 'cellules') return { ...s, dans: t(s.dans), cellules: s.en.map(([a, b]) => [versAnglais(a), versAnglais(b)]) }
    return s
  })
  return { montants, noeuds, structures, anglicismes: !anglicismes ? [] : lang === 'fr' ? ANGLICISMES : RENOMMAGES_EN }
}

// Dans la page : applique les corrections au DOM de #app (fonction autonome, sérialisée par page.evaluate).
export function corrigerDom({ montants, noeuds, structures, anglicismes }) {
  const app = document.getElementById('app')
  const norme = (t) => t.replace(/[\s  ]+/g, ' ').trim()
  document.querySelectorAll('a[href*="langue=pcm"], a[href*="pcm=1"]').forEach((e) => e.remove())
  document.querySelectorAll('.tg2').forEach((e) => {
    if (/^(CURATED|SPONSO|SPONSORED)$/i.test(e.textContent.trim())) e.remove()
  })
  const textes = () => {
    const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT)
    const l = []
    let n
    while ((n = w.nextNode())) l.push(n)
    return l
  }
  const LIGNE = '.cl07-r, .cl15-r, .r, tr, .kv, .row'
  // Structures, d'abord (elles cherchent les textes du prototype).
  for (const s of structures) {
    if (s.type === 'remisesParColis') {
      for (const n of textes().filter((x) => norme(x.nodeValue) === norme(s.libelleAffiche))) {
        const ligne = n.parentElement.closest(LIGNE)
        if (!ligne || ligne.dataset.colis) continue
        n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), s.libelles[0])
        ligne.dataset.colis = '1'
        let avant = ligne
        for (let i = 1; i < s.colis; i++) {
          const c = ligne.cloneNode(true)
          delete c.dataset.colis
          const lab = [...c.querySelectorAll('*')].concat([c]).flatMap((e) => [...e.childNodes]).find((x) => x.nodeType === 3 && norme(x.nodeValue) === norme(s.libelles[0]))
          lab.nodeValue = lab.nodeValue.replace(lab.nodeValue.trim(), s.libelles[i])
          lab.parentElement.querySelectorAll('small').forEach((x) => x.remove())
          const valeur = c.lastElementChild
          valeur.replaceChildren(document.createTextNode(s.valeur))
          avant.after(c)
          avant = c
        }
        delete ligne.dataset.colis
      }
    } else if (s.type === 'supprimer') {
      for (const n of textes().filter((x) => norme(x.nodeValue) === norme(s.texte))) {
        const e = n.parentElement
        if (e && norme(e.textContent) === norme(s.texte)) e.remove()
      }
    } else if (s.type === 'supprimerLigne') {
      for (const n of textes().filter((x) => norme(x.nodeValue) === norme(s.texte))) n.parentElement.closest('.cl06-row, ' + LIGNE)?.remove()
    } else if (s.type === 'nonOffert') {
      for (const n of textes().filter((x) => norme(x.nodeValue).startsWith(norme(s.dans)))) {
        const carte = n.parentElement.closest('a, .pcard, li, .card')
        const tag = carte && [...carte.querySelectorAll('.dl.free')].find((e) => norme(e.textContent) === norme(s.ancien ?? 'Retrait offert'))
        if (!tag) continue
        tag.classList.remove('free')
        tag.replaceChildren(document.createTextNode(s.texte))
      }
    } else if (s.type === 'cellules') {
      const grille = [...app.querySelectorAll('div')].find((e) => [...e.children].some((c) => norme(c.firstChild?.nodeValue ?? '') === norme(s.dans)))
      if (!grille) continue
      const modele = grille.firstElementChild
      grille.replaceChildren(
        ...s.cellules.map(([a, b]) => {
          const c = modele.cloneNode(true)
          c.firstChild.nodeValue = a
          c.querySelector('b').textContent = b
          return c
        }),
      )
    }
  }
  // Textes : nœuds entiers, montants, pidgin, anglicismes.
  const regles = montants.map(({ prototype, site, texte }) => {
    // Passage exact : jamais au milieu d'un nombre (« 51,50 » ne touche pas « 151,50 »).
    if (texte) return [new RegExp('(?<![\\d,.])' + prototype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\d]|[,.]\\d)', 'g'), site]
    const g = prototype.split(/[\s  ]/)
    const re = new RegExp('(?<![\\d,.])' + g.join('([\\s  ,])') + '(?![\\d]|[,.]\\d)', 'g')
    const nv = site.split(/[\s  ]/)
    // Séparateurs du prototype repris ; un groupe de plus (900 → 1 100) reprend le dernier.
    return [
      re,
      (...m) => {
        const seps = m.slice(1, g.length)
        return nv.map((x, k) => (k ? (seps[Math.min(k, seps.length) - 1] ?? ' ') : '') + x).join('')
      },
    ]
  })
  for (const n of textes()) {
    if (n.parentElement.closest('style, script')) continue
    const bloc = n.parentElement.closest('tr, .cl10-hrow, p, .pcard, .li, .row, li, .card, a')
    const nd = noeuds.find(([de, , dans]) => de === norme(n.nodeValue) && (!dans || (bloc && bloc.textContent.includes(dans))))
    let v
    if (nd) v = /^\s*/.exec(n.nodeValue)[0] + nd[1].trim() + /\s*$/.exec(n.nodeValue)[0]
    else {
      v = n.nodeValue.replace(/, pidgin$/, '')
      for (const [re, par] of regles) v = v.replace(re, par)
    }
    // Anglicismes : sur tout texte affiché, recalculé ou non (le site les applique dans t()).
    for (const [re, par] of anglicismes) v = v.replace(new RegExp(re, 'g'), par)
    if (v !== n.nodeValue) n.nodeValue = v
  }
}
