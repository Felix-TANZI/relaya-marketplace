// Finitions (styles/finitions.css), communes à l'espace entreprise et à la console. Rien ne bouge sans html[data-mouv]
// (ni « Animations réduites », ni prefers-reduced-motion, ni navigateur piloté) ; aucune donnée n'est touchée.
// 1. Compteurs qui montent : les grands chiffres des tuiles d'action, des indicateurs et du chiffre clé de l'en-tête
//    comptent de 0 jusqu'à leur valeur à leur arrivée (0,6 s). Le texte de React n'est jamais remplacé : seul son
//    contenu change, et le compte s'arrête net si React l'a changé entre-temps.
// 2. Bouton : après un appui, un bouton qui se désactive (envoi en cours) montre un tourniquet ; quand il se réactive
//    sans message d'erreur à côté, une coche brève ; s'il disparaît (le geste a changé l'écran), rien.

const mouv = () => document.documentElement.hasAttribute('data-mouv')
// Même règle que html[data-mouv] (Animations du client), lue tout de suite : au premier affichage, data-mouv n'est
// posé qu'après le premier dessin, et le compte doit partir avant.
function libre(): boolean {
  if (mouv()) return true
  if (document.documentElement.dataset.anim === 'reduites') return false
  try {
    if (localStorage.getItem('blv_e_anim') === 'reduites' || localStorage.getItem('blv_a_anim') === 'reduites') return false
  } catch {
    /* stockage indisponible */
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (navigator.webdriver) {
    try {
      return localStorage.getItem('blv_mouv') === '1'
    } catch {
      return false
    }
  }
  return true
}

// ---------- 1. Compteurs ----------
const CHIFFRES = '.e-act-n>b,.a-act-n>b,.kpi .v,.fin-chiffre>b'
const vus = new WeakSet<Element>()

function compter(el: Element) {
  vus.add(el)
  const texte = el.firstChild
  if (!(texte instanceof Text) || el.childNodes.length !== 1) return
  const cible = texte.nodeValue ?? ''
  if (!/^\d{1,4}$/.test(cible)) return
  const n = Number(cible)
  if (n < 2) return
  const debut = performance.now()
  const duree = 600
  let ecrit = '0'
  texte.nodeValue = ecrit
  el.classList.add('fin-compte')
  const pas = (t: number) => {
    if (texte.nodeValue !== ecrit) return el.classList.remove('fin-compte') // React a changé le chiffre : on s'arrête.
    const k = Math.min(1, (t - debut) / duree)
    ecrit = k >= 1 ? cible : String(Math.round(n * (1 - Math.pow(1 - k, 3))))
    texte.nodeValue = ecrit
    if (k < 1) requestAnimationFrame(pas)
    else if (el.classList.length === 1) el.removeAttribute('class')
    else el.classList.remove('fin-compte')
  }
  requestAnimationFrame(pas)
}

let prevu = false
function parcourir() {
  prevu = false
  const anime = libre()
  for (const el of document.querySelectorAll(CHIFFRES)) if (!vus.has(el)) (anime ? compter(el) : vus.add(el))
}

// ---------- 2. Boutons : chargement puis coche ----------
function erreurPres(b: Element) {
  const zone = b.closest('form,.sheet,[role=dialog],.card,.panel,section') ?? document.body
  return !!zone.querySelector('[role=alert],.err,.erreur')
}

function suivreBouton(b: HTMLButtonElement) {
  if (b.classList.contains('fin-charge')) return
  b.classList.add('fin-charge')
  const debut = Date.now()
  let fini = false
  const fin = (ok: boolean) => {
    if (fini) return
    // Le tourniquet reste au moins 0,45 s : un envoi éclair se voit quand même.
    const reste = 450 - (Date.now() - debut)
    if (reste > 0 && b.isConnected) return void setTimeout(() => fin(ok && !occupe()), reste)
    fini = true
    obs.disconnect()
    clearInterval(veille)
    b.classList.remove('fin-charge')
    if (ok && b.isConnected && mouv() && !erreurPres(b)) {
      b.classList.add('fin-ok')
      setTimeout(() => b.classList.remove('fin-ok'), 1000)
    }
  }
  const occupe = () => b.disabled || b.getAttribute('aria-busy') === 'true'
  const obs = new MutationObserver(() => (!b.isConnected ? fin(false) : !occupe() && fin(true)))
  obs.observe(b, { attributes: true, attributeFilter: ['disabled', 'aria-busy'] })
  const veille = setInterval(() => (!b.isConnected || Date.now() - debut > 20_000 ? fin(false) : !occupe() && fin(true)), 250)
}

if (typeof document !== 'undefined') {
  // Avant le premier dessin du chiffre (l'observateur passe avant l'affichage) : jamais de « 9 » puis « 0 ».
  new MutationObserver(() => {
    if (prevu) return
    prevu = true
    queueMicrotask(parcourir)
  }).observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener(
    'click',
    (e) => {
      if (!mouv()) return
      const b = e.target instanceof Element ? (e.target.closest('button.btn') as HTMLButtonElement | null) : null
      if (!b || b.disabled) return
      // Le bouton se désactive juste après l'appui (envoi en cours) : on suit l'envoi, même très court.
      const guet = new MutationObserver(() => {
        if (!(b.disabled || b.getAttribute('aria-busy') === 'true')) return
        guet.disconnect()
        suivreBouton(b)
      })
      guet.observe(b, { attributes: true, attributeFilter: ['disabled', 'aria-busy'] })
      setTimeout(() => guet.disconnect(), 800)
    },
    true,
  )
}
export {}
