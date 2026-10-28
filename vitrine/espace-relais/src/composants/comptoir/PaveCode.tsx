// Gros pavé numérique du comptoir (téléphone posé, mains occupées) : six cases lisibles de loin, touches de 64 px,
// vérification AUTOMATIQUE au dernier chiffre (aucun bouton « Valider »). Clavier physique accepté (tablette ou
// ordinateur du comptoir, douchette qui tape les chiffres). `masque` : PIN (des points au lieu des chiffres).
// `prefixe` / `separateur` : saisie d'une étiquette « BLV-00008-1 » en chiffres seulement.
import { useCallback, useEffect, useId, useRef } from 'react'
import { usePreferences } from '../../preferences'
import { signal } from '../signaux'
import { Icone } from '../Icone'
import './comptoir.css'

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PaveCode(p: {
  longueur: number
  valeur: string
  changer: (v: string) => void
  /** Appelé une fois, au dernier chiffre. */
  complet: (v: string) => void
  libelle: string
  masque?: boolean
  occupe?: boolean
  erreur?: boolean
  /** Ex. « BLV- » devant les cases, et un tiret avant les `apres` derniers chiffres. */
  prefixe?: string
  tiretAvant?: number
}) {
  const { t, tf } = usePreferences()
  const id = useId()
  const racine = useRef<HTMLDivElement>(null)
  const { longueur: n, valeur, changer, complet, occupe } = p
  const taper = useCallback(
    (k: string) => {
      if (!k || occupe) return
      signal('toucher')
      if (k === '⌫') return changer(valeur.slice(0, -1))
      if (valeur.length >= n) return
      const v = valeur + k
      changer(v)
      if (v.length === n) complet(v)
    },
    [valeur, n, changer, complet, occupe],
  )
  // Clavier physique : chiffres, effacement (sauf dans un champ de saisie ouvert ailleurs).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea,select')) return
      // Une feuille ouverte par-dessus garde le clavier pour elle.
      const feuille = document.querySelector('[data-feuille]')
      if (feuille && racine.current && !feuille.contains(racine.current)) return
      if (/^\d$/.test(e.key)) (e.preventDefault(), taper(e.key))
      else if (e.key === 'Backspace') (e.preventDefault(), taper('⌫'))
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [taper])
  const cases = Array.from({ length: n }, (_, i) => (
    <span key={i} className={'cpt-case' + (i === valeur.length && !occupe ? ' cpt-case-ici' : '') + (p.erreur ? ' cpt-case-faux' : '') + (valeur[i] ? ' cpt-case-pleine' : '')} aria-hidden="true">
      {valeur[i] ? (p.masque ? '•' : valeur[i]) : ''}
    </span>
  ))
  if (p.tiretAvant) cases.splice(n - p.tiretAvant, 0, <span key="tiret" className="cpt-sep" aria-hidden="true">-</span>)
  return (
    <div className="cpt-pave" role="group" aria-labelledby={id} ref={racine}>
      <div id={id} className="cpt-pave-l">
        {p.libelle}
      </div>
      <div className={'cpt-cases' + (occupe ? ' cpt-occupe' : '')} role="status" aria-label={p.masque ? tf('{n} chiffres sur {total}', { n: valeur.length, total: n }) : valeur ? tf('Saisi : {v}', { v: (p.prefixe ?? '') + valeur }) : tf('{n} chiffres sur {total}', { n: 0, total: n })}>
        {p.prefixe && (
          <span className="cpt-prefixe" aria-hidden="true">
            {p.prefixe}
          </span>
        )}
        {cases}
      </div>
      <div className="cpt-touches">
        {TOUCHES.map((k, i) =>
          k ? (
            <button key={i} type="button" className={'cpt-touche' + (k === '⌫' ? ' cpt-touche-eff' : '')} onClick={() => taper(k)} disabled={occupe || (k === '⌫' && !valeur)} aria-label={k === '⌫' ? t('Effacer') : k}>
              {k === '⌫' ? <Icone nom="delete" taille={24} /> : k}
            </button>
          ) : (
            <span key={i} aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  )
}
