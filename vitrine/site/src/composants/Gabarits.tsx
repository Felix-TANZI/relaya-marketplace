// Gabarits de page des grands écrans (DISPOSITION-ECRANS.md § 4) : une grille et ses zones nommées, mises en page
// par src/styles/larges.css. Les blocs d'un écran y sont rangés SANS être réécrits.
//
// MODE D'EMPLOI (lots d'écrans) :
//   <Ecran route="panier" gabarit="colonnes">
//     <Zone nom="haut">…titre, bandeau pleine largeur…</Zone>      (facultatif)
//     <Colonne>…blocs du contenu…</Colonne>
//     <Aside titre="Récapitulatif">…récapitulatif, bouton principal…</Aside>
//     <Zone nom="bas">…rail pleine largeur sous les colonnes…</Zone>  (facultatif)
//   </Ecran>
// Ecran pose le gabarit (prop « gabarit ») : la grille enveloppe ses enfants, et le conteneur de la page suit
// (catalogue : large ; compte, maître-détail, colonnes, web : moyen ; centre : étroit). Prop « largeur » pour un
// autre conteneur (« large », « moyen », « etroit », « lecture »).
// Gabarits et zones :
//   - catalogue (dès 1024) : colonne Catégories (posée par Ecran, ou « gauche » à la place), Zone « contenu »
//     (Colonne), colonne droite (« droite » d'Ecran, accueil, dès 1200) ;
//   - compte (dès 1024) : carte d'identité et menu du compte (posés par Ecran), Colonne ;
//   - maitre-detail (dès 1200 ; des="tab-l" pour dès 1024) : Zone « liste », Zone « detail » ;
//   - colonnes (dès 1024) : Colonne (8/12), Aside (4/12, collant) ; inverse : aside à gauche ; asideEnTete : en
//     tablette portrait, l'aside passe avant le contenu (montants à payer) ;
//   - centre (dès 768) : une colonne étroite ; <Actions> : boutons en fin de colonne (secondaire à gauche,
//     principal à droite dès 1024) ;
//   - arrivee (dès 768 : carte de 520 ; dès 1200 : écran partagé) : Zone « visuel », Colonne ;
//   - web (dès 1024) : Colonne (7/12), Aside (5/12, collant).
// Sous le palier du gabarit, rien n'est enveloppé : les zones rendent leurs enfants tels quels (flux du
// téléphone inchangé, au pixel). Les zones existent dès 768 px ; les colonnes, dès le palier du gabarit.
import { Children, Fragment, cloneElement, createContext, isValidElement, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { usePreferences } from '../preferences'
import { useDes, type Palier } from './ecran'

export type FormeGabarit = 'catalogue' | 'compte' | 'maitre-detail' | 'colonnes' | 'centre' | 'arrivee' | 'web'
export type Largeur = 'large' | 'moyen' | 'etroit' | 'lecture'
export type NomZone = 'haut' | 'contenu' | 'aside' | 'bas' | 'liste' | 'detail' | 'visuel' | 'gauche' | 'droite' | 'identite' | 'menu'

// Conteneur par défaut de chaque gabarit (§ 2.2).
export const LARGEUR_DE: Record<FormeGabarit, Largeur> = {
  catalogue: 'large',
  compte: 'moyen',
  'maitre-detail': 'moyen',
  colonnes: 'moyen',
  centre: 'etroit',
  arrivee: 'moyen',
  web: 'moyen',
}

const Actif = createContext(false)

// basDansGrille : la zone « bas » reste une case de la grille (Code de retrait : sous le contenu, à côté de l'aside).
// Sinon, dans les gabarits à aside collant (colonnes, web), elle est posée APRÈS la grille : l'aside collant est
// borné par sa grille et ne glisse plus par-dessus la zone pleine largeur du bas.
export function Gabarit(p: { forme: FormeGabarit; des?: Palier; inverse?: boolean; asideEnTete?: boolean; basDansGrille?: boolean; classe?: string; attributs?: Record<string, string>; children: ReactNode }) {
  const actif = useDes('tab')
  if (!actif) return <>{p.children}</>
  const classes = ['gab', 'g-' + p.forme, p.inverse ? 'inverse' : '', p.asideEnTete ? 'aside-tete' : '', p.classe ?? ''].filter(Boolean).join(' ')
  const [grille, bas] = (p.forme === 'colonnes' || p.forme === 'web') && !p.basDansGrille ? separerBas(p.children) : [p.children, []]
  return (
    <Actif.Provider value>
      <div className={classes} data-des={p.des} {...p.attributs}>
        {grille}
      </div>
      {bas}
    </Actif.Provider>
  )
}

// Sépare les zones « bas » (enfants directs, ou dans des fragments) du reste ; les clés suivent la place de chaque
// enfant, pour que React garde l'état des blocs d'un rendu à l'autre.
function separerBas(enfants: ReactNode): [ReactNode[], ReactNode[]] {
  const grille: ReactNode[] = []
  const bas: ReactNode[] = []
  const parcourir = (n: ReactNode, prefixe: string) =>
    Children.toArray(n).forEach((c) => {
      if (!isValidElement(c)) return void grille.push(c)
      const cle = prefixe + String(c.key)
      if (c.type === Fragment) return parcourir((c.props as { children?: ReactNode }).children, cle + '/')
      const estBas = c.type === Zone && (c.props as { nom?: string }).nom === 'bas'
      ;(estBas ? bas : grille).push(cloneElement(c, { key: cle }))
    })
  parcourir(enfants, '')
  return [grille, bas]
}

// Zone nommée de la grille. Hors gabarit actif (téléphone), ses enfants passent tels quels.
export function Zone({ nom, classe, etiquette, children }: { nom: NomZone; classe?: string; etiquette?: string; children: ReactNode }) {
  const actif = useContext(Actif)
  const { t } = usePreferences()
  if (!actif) return <>{children}</>
  const c = 'gab-' + nom + (classe ? ' ' + classe : '')
  if (nom === 'aside' || nom === 'gauche' || nom === 'droite' || nom === 'menu') return <AsideCollant classe={c} etiquette={etiquette ? t(etiquette) : undefined}>{children}</AsideCollant>
  return <div className={c}>{children}</div>
}

// Colonne de contenu (zone « contenu ») : porte la requête de conteneur des grilles de produits.
export const Colonne = ({ classe, children }: { classe?: string; children: ReactNode }) => (
  <Zone nom="contenu" classe={classe}>
    {children}
  </Zone>
)

// Aside collant (zone « aside ») : récapitulatif, argent, actions principales. « titre » nomme le repère.
export const Aside = ({ titre, classe, children }: { titre: string; classe?: string; children: ReactNode }) => (
  <Zone nom="aside" classe={classe} etiquette={titre}>
    {children}
  </Zone>
)

// Boutons en fin de colonne (gabarit centre, formulaires) : dès 1024 px, secondaire à gauche, principal à droite,
// 200 px au moins chacun. Sur téléphone, les boutons gardent leur pile d'origine (rien n'est enveloppé).
export function Actions({ children }: { children: ReactNode }) {
  const actif = useContext(Actif)
  if (!actif) return <>{children}</>
  return <div className="gab-actions">{children}</div>
}

// Un aside collant passe en position normale si son contenu dépasse la hauteur visible : on mesure, on ne coupe
// jamais (§ 2.1).
function AsideCollant({ classe, etiquette, children }: { classe: string; etiquette?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [long, setLong] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    const main = el?.closest('main')
    if (!el || !main || typeof ResizeObserver !== 'function') return
    const mesurer = () => {
      const haut = parseFloat(getComputedStyle(el).top) || 0
      setLong(el.offsetHeight > main.clientHeight - (parseFloat(getComputedStyle(main).paddingTop) || 0) - haut - 16)
    }
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    ro.observe(main)
    mesurer()
    return () => ro.disconnect()
  }, [])
  const Balise = etiquette ? 'aside' : 'div'
  return (
    <Balise ref={ref as never} className={classe + (long ? ' long' : '')} aria-label={etiquette}>
      {children}
    </Balise>
  )
}
