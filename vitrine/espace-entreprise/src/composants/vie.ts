// Relief 3D léger (styles/vie.css) : sur les blocs en relief, l'inclinaison suit le doigt ou la souris (3,5° au plus) et
// le reflet se place sous le pointeur. Un seul écouteur pour toute l'application ; rien ne bouge sans html[data-mouv]
// (animations permises : ni « Animations réduites », ni prefers-reduced-motion, ni navigateur piloté).
// Pages principales seulement (#app.p-pri, composants/rang.ts) : jamais de relief sur une page secondaire.
const BLOCS = '#app.p-pri :is(.vie-relief,.a-act-heros,.e-act-heros,[data-heros=score],[data-heros=vendredi])'
const MAX = 3.5
let actif: HTMLElement | null = null

function quitter() {
  if (!actif) return
  actif.classList.remove('vie-actif')
  for (const v of ['--vie-rx', '--vie-ry', '--vie-mx', '--vie-my']) actif.style.removeProperty(v)
  actif = null
}

function suivre(e: PointerEvent) {
  if (!document.documentElement.hasAttribute('data-mouv')) return quitter()
  const el = e.target instanceof Element ? (e.target.closest(BLOCS) as HTMLElement | null) : null
  if (el !== actif) quitter()
  if (!el) return
  actif = el
  const r = el.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  el.classList.add('vie-actif')
  el.style.setProperty('--vie-rx', `${((0.5 - y) * 2 * MAX).toFixed(2)}deg`)
  el.style.setProperty('--vie-ry', `${((x - 0.5) * 2 * MAX).toFixed(2)}deg`)
  el.style.setProperty('--vie-mx', `${(x * 100).toFixed(1)}%`)
  el.style.setProperty('--vie-my', `${(y * 100).toFixed(1)}%`)
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointermove', suivre, { passive: true })
  document.addEventListener('pointerdown', suivre, { passive: true })
  document.addEventListener('pointerleave', quitter, { passive: true })
  document.addEventListener('pointercancel', quitter, { passive: true })
  document.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && quitter(), { passive: true })
  window.addEventListener('scroll', quitter, { passive: true })
}
export {}
