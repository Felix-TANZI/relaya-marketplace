// Contenu saisi par quelqu'un (avis, message, description d'un produit, contenu publié par l'administration), avec un
// geste discret « Traduire / Voir l'original » quand sa langue n'est pas celle de l'interface (module commun des six
// applications ; traducteur : ./index.ts). Rien ne change quand le texte est déjà dans la langue de l'écran, ni quand
// sa langue ne se devine pas. La traduction est toujours signalée (« Traduit automatiquement ») et l'original reste à
// un geste ; une traduction indisponible le dit sans rien cacher. Les traductions statiques de la démonstration
// (t() sur le texte) passent avant : l'écran donne ici le texte tel qu'il l'affichait.
import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { usePreferences } from '../preferences'
import { detecterLangue, traducteur, type LangueTexte } from './index'
import './traduction.css'

type Etat = 'original' | 'attente' | 'traduit' | 'erreur'

/** Traduction à la demande d'un texte : état, texte affiché et geste. */
export function useTraduction(texte: string, langueTexte?: LangueTexte | null) {
  const { langue } = usePreferences()
  const vers: LangueTexte = langue === 'en' ? 'en' : 'fr'
  const de = langueTexte ?? detecterLangue(texte)
  const proposer = !!de && de !== vers && texte.trim().length > 1
  const [etat, setEtat] = useState<Etat>('original')
  const [traduit, setTraduit] = useState<string | null>(null)
  const enCours = useRef<AbortController | null>(null)
  useEffect(() => {
    enCours.current?.abort()
    setEtat('original')
    setTraduit(null)
  }, [texte, vers])
  useEffect(() => () => enCours.current?.abort(), [])
  const basculer = () => {
    if (!proposer || !de) return
    if (etat === 'traduit') return setEtat('original')
    if (traduit) return setEtat('traduit')
    const a = new AbortController()
    enCours.current = a
    setEtat('attente')
    traducteur.traduire(texte, de, vers, a.signal).then(
      (r) => !a.signal.aborted && (setTraduit(r.texte), setEtat('traduit')),
      () => !a.signal.aborted && setEtat('erreur'),
    )
  }
  // Langue du texte affiché (attribut lang : lecteurs d'écran, césure).
  const langueAffichee = etat === 'traduit' ? vers : proposer ? de : undefined
  return { proposer, etat, affiche: etat === 'traduit' && traduit ? traduit : texte, basculer, langueAffichee }
}

/** Le geste seul (sous un texte affiché par l'écran). */
export function GesteTraduction({ etat, basculer }: { etat: Etat; basculer(): void }) {
  const { t } = usePreferences()
  return (
    <span className="trd" data-etat={etat}>
      {etat === 'traduit' && <span className="trd-m">{t('Traduit automatiquement')}</span>}
      {etat === 'erreur' && (
        <span className="trd-m" role="status">
          {t('Traduction indisponible pour le moment')}
        </span>
      )}
      <button type="button" className="trd-b" onClick={basculer} disabled={etat === 'attente'} aria-busy={etat === 'attente'}>
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
        </svg>
        {t(etat === 'traduit' ? 'Voir l’original' : etat === 'attente' ? 'Traduction…' : etat === 'erreur' ? 'Réessayer' : 'Traduire')}
      </button>
    </span>
  )
}

/** Texte saisi par quelqu'un, traduisible. `comme` : la balise du texte (p, span, div) ; `classe` : ses classes. */
export function TexteTraduisible({ texte, langue, comme: Balise = 'span', classe, avant }: { texte: string; langue?: LangueTexte | null; comme?: ElementType; classe?: string; avant?: ReactNode }) {
  const tr = useTraduction(texte, langue)
  return (
    <>
      <Balise className={classe} lang={tr.langueAffichee ?? undefined}>
        {avant}
        {tr.affiche}
      </Balise>
      {tr.proposer && <GesteTraduction etat={tr.etat} basculer={tr.basculer} />}
    </>
  )
}
