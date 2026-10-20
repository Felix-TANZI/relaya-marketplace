// Ligne qu'on glisse sur le côté (doigt, stylet ou souris) pour révéler une action, comme dans les applications de
// messagerie : vers la gauche, l'action de droite (« Supprimer ») ; vers la droite, celle de gauche (« Mettre en
// favori »). Passé le seuil (35 % de la largeur, ou un geste vif), la ligne part et l'action s'exécute ; en deçà,
// elle revient en place avec un rebond. Seuil franchi : petite vibration ; action : son et vibration (Sons.ts).
// Le défilement vertical reste natif (touch-action: pan-y) ; un geste vertical n'ouvre rien. Accessibilité : les
// boutons de la ligne restent (ce geste n'en est qu'un raccourci) ; animations réduites : pas de glissé animé.
import { useRef, useState, type ReactNode } from 'react'
import { mouvementLibre } from './Animations'
import { Icone } from './Icone'
import { jouer, type Son } from './Sons'

export interface ActionGlisser {
  libelle: string
  icone: string
  ton: 'rouge' | 'marque'
  son: Son
  agir: () => void
}

const SEUIL = 0.35
const MIN_PX = 72

export function Glisser({ gauche, droite, children, classe = '' }: { gauche?: ActionGlisser; droite?: ActionGlisser; children: ReactNode; classe?: string }) {
  // gauche : révélée en glissant vers la DROITE ; droite : révélée en glissant vers la GAUCHE.
  const [dx, setDx] = useState(0)
  const [etat, setEtat] = useState<'repos' | 'tire' | 'retour' | 'part'>('repos')
  const boite = useRef<HTMLDivElement>(null)
  const g = useRef<{ id: number; x: number; y: number; t: number; sens: 'h' | 'v' | null; arme: boolean; bouge: boolean } | null>(null)
  const avaler = useRef(0)

  const largeur = () => boite.current?.clientWidth || 320
  const seuil = () => Math.max(MIN_PX, largeur() * SEUIL)
  const action = (d: number) => (d < 0 ? droite : d > 0 ? gauche : undefined)

  const finir = (d: number, vitesse: number) => {
    const a = action(d)
    const assez = Math.abs(d) >= seuil() || (Math.abs(d) > 40 && Math.abs(vitesse) > 0.65 && Math.sign(vitesse) === Math.sign(d))
    if (!a || !assez) {
      setEtat('retour')
      setDx(0)
      return
    }
    jouer(a.son)
    if (!mouvementLibre()) {
      setEtat('repos')
      setDx(0)
      a.agir()
      return
    }
    setEtat('part')
    setDx(Math.sign(d) * (largeur() + 24))
    window.setTimeout(() => {
      a.agir()
      setEtat('repos')
      setDx(0)
    }, 200)
  }

  const bas = (e: React.PointerEvent) => {
    if (etat === 'part' || (e.pointerType === 'mouse' && e.button !== 0)) return
    if ((e.target as Element).closest('input, textarea, select, .pan-opt, .cl07-stp')) return
    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), sens: null, arme: false, bouge: false }
  }
  const bouge = (e: React.PointerEvent) => {
    const p = g.current
    if (!p || p.id !== e.pointerId) return
    let d = e.clientX - p.x
    const v = e.clientY - p.y
    if (!p.sens) {
      if (Math.abs(d) < 8 && Math.abs(v) < 8) return
      p.sens = Math.abs(d) > Math.abs(v) * 1.2 ? 'h' : 'v'
      if (p.sens === 'v') return
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      setEtat('tire')
    }
    if (p.sens !== 'h') return
    p.bouge = true
    if (!action(d)) d = d / 6 // aucun côté : résistance forte
    else if (Math.abs(d) > largeur() * 0.8) d = Math.sign(d) * (largeur() * 0.8 + (Math.abs(d) - largeur() * 0.8) / 4)
    const arme = !!action(d) && Math.abs(d) >= seuil()
    if (arme !== p.arme) {
      p.arme = arme
      if (arme) navigator.vibrate?.(8)
    }
    setDx(d)
  }
  const haut = (e: React.PointerEvent) => {
    const p = g.current
    if (!p || p.id !== e.pointerId) return
    g.current = null
    if (p.sens !== 'h') return
    avaler.current = performance.now()
    const dt = Math.max(1, performance.now() - p.t)
    finir(dx, (e.clientX - p.x) / dt)
  }
  const annule = () => {
    if (g.current?.sens === 'h') (setEtat('retour'), setDx(0))
    g.current = null
  }

  const cote = dx > 0 ? gauche : dx < 0 ? droite : undefined
  const arme = !!cote && Math.abs(dx) >= seuil()
  return (
    <div ref={boite} className={('gl ' + classe).trim() + (etat !== 'repos' ? ' gl-' + etat : '')}>
      {gauche && (
        <div className={'gl-fond gl-g ' + gauche.ton + (dx > 0 ? ' vu' : '') + (dx > 0 && arme ? ' arme' : '')} aria-hidden="true">
          <Icone nom={gauche.icone} taille={22} />
          <span>{gauche.libelle}</span>
        </div>
      )}
      {droite && (
        <div className={'gl-fond gl-d ' + droite.ton + (dx < 0 ? ' vu' : '') + (dx < 0 && arme ? ' arme' : '')} aria-hidden="true">
          <span>{droite.libelle}</span>
          <Icone nom={droite.icone} taille={22} />
        </div>
      )}
      <div
        className="gl-av"
        style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined }}
        onPointerDown={bas}
        onPointerMove={bouge}
        onPointerUp={haut}
        onPointerCancel={annule}
        onTransitionEnd={() => etat === 'retour' && setEtat('repos')}
        onClickCapture={(e) => {
          // Un glissé ne suit pas le lien ni le bouton sous le pointeur.
          if (performance.now() - avaler.current < 120) (e.preventDefault(), e.stopPropagation())
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  )
}
