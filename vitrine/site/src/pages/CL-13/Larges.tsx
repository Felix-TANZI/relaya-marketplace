// Mon compte et ses sous-pages sur grand écran (DISPOSITION-ECRANS.md § 5.11, lot 10) : outils communs.
// - useGabaritCompte() : gabarit « compte » (carte d'identité, menu du compte à gauche) pour un client connecté ;
//   pour un visiteur (aide, FAQ, légal, réglages…), le conteneur moyen sans menu latéral ;
// - <Bloc> : regroupe des blocs de l'écran dans une grille dès 1024 px (ou le palier donné). Sous ce palier, ses
//   enfants passent tels quels : le téléphone et la tablette portrait gardent leur flux, au pixel ;
// - <MaitreDetail> : liste et détail côte à côte (factures, messagerie, pages légales), dès 1200 px par défaut ;
// - useMaitreDetail() : vrai quand l'écran se range en maître-détail (la sélection remplace l'adresse, sans
//   nouvelle entrée d'historique).
// Les styles sont dans src/styles/larges.css (section « Lot 10 »).
import type { ComponentProps, ReactNode } from 'react'
import { Ecran } from '../../composants/coque'
import { useDes, type Palier } from '../../composants/ecran'
import type { FormeGabarit, Largeur } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

export function useGabaritCompte(): { gabarit?: FormeGabarit; largeur?: Largeur } {
  const s = useSession()
  return s.connecte && s.client ? { gabarit: 'compte' } : { largeur: 'moyen' }
}

// Ecran d'une page du compte : gabarit « compte » (ou conteneur moyen pour un visiteur), sauf gabarit donné.
// « colonne » : le contenu tient dans une colonne de 560 ou 640 px dès 1024 px (formulaires courts).
export function EcranCompte({ colonne, children, ...p }: ComponentProps<typeof Ecran> & { colonne?: 560 | 640 }) {
  const g = useGabaritCompte()
  return (
    <Ecran {...g} {...p}>
      {colonne ? <Bloc classe={'c13-col c13-col' + colonne}>{children}</Bloc> : children}
    </Ecran>
  )
}

export function Bloc({ classe, des = 'tab-l', children }: { classe: string; des?: Palier; children: ReactNode }) {
  const actif = useDes(des)
  if (!actif) return <>{children}</>
  return <div className={classe}>{children}</div>
}

export const useMaitreDetail = (des: Palier = 'pc') => useDes(des)

export function MaitreDetail({ liste, detail, etiquette, des = 'pc' }: { liste: ReactNode; detail: ReactNode; etiquette: string; des?: Palier }) {
  const { t } = usePreferences()
  return (
    <div className={'md13' + (des === 'tab-l' ? ' md13-tl' : '')}>
      <div className="md13-l">{liste}</div>
      <section className="md13-d" aria-label={t(etiquette)}>
        {detail}
      </section>
    </div>
  )
}

// Détail vide : « Choisis une conversation », « Choisis une facture »…
export function DetailVide({ icone, texte }: { icone: string; texte: string }) {
  const { t } = usePreferences()
  return (
    <div className="card md13-vide">
      <div className="empty">
        <div className="ei">
          <Icone nom={icone} taille={26} />
        </div>
        <p>{t(texte)}</p>
      </div>
    </div>
  )
}
