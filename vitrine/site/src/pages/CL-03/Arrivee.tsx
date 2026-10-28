// Arrivée sur grand écran (DISPOSITION-ECRANS.md § 4.6 et 5.15, lot 14) : gabarit « arrivee » de l'écran.
// - téléphone : rien n'est enveloppé, les blocs gardent leur ordre (au pixel) ;
// - tablette (768 à 1199) : carte centrée de 520 px, le visuel en tête comme sur le téléphone ;
// - dès 1200 : écran partagé, le visuel de tête de l'écran à gauche (pleine hauteur), la colonne à droite.
// La barre du haut de l'écran (retour, « Passer ») reste avant le visuel jusqu'à 1199, puis passe en tête de la
// colonne : déplacée, jamais dupliquée.
import type { ReactNode } from 'react'
import photo from '../../assets/prototype/9de42ddd0501.jpg'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Colonne, Zone } from '../../composants/Gabarits'
import { useContenuAccueil } from '../../composants/contenus'
import { useDes } from '../../composants/ecran'
import { usePreferences } from '../../preferences'

export function Partage({ haut, visuel, sousVisuel, children }: { haut?: ReactNode; visuel?: ReactNode; sousVisuel?: ReactNode; children: ReactNode }) {
  const partage = useDes('pc')
  return (
    <>
      <Zone nom="visuel">
        {!partage && haut}
        {visuel}
        {partage && sousVisuel}
      </Zone>
      <Colonne>
        {partage && haut}
        {children}
      </Colonne>
    </>
  )
}

// La photo de la connexion, pour les écrans du parcours qui n'ont pas de visuel sur le téléphone (e-mail oublié,
// numéro, Face ID) : un seul visuel, cohérent dans le parcours. Montrée dès 1200 seulement. Même dessin que la
// photo d'accueil de la connexion (.cx-hero.ph), écrit dans larges.css (.arr-photo) pour ne pas charger sur ces
// écrans les blocs de styles de la connexion.
export function PhotoArrivee() {
  const { t } = usePreferences()
  const partage = useDes('pc')
  // Fond remplaçable (contenus de l'accueil, fondArrivee) ; la photo du prototype dessous, en repli si elle échoue.
  const fond = useContenuAccueil().fondArrivee
  if (!partage) return null
  return (
    <section className="arr-photo" style={{ backgroundImage: fond?.url ? `url(${JSON.stringify(fond.url)}), url(${photo})` : `url(${photo})` }} role="img" aria-label={t('Tout près de toi')}>
      <span className="lg">
        <img src={logo} alt="" />
      </span>
      <span className="tx">
        <b>{t('Tout près de toi')}</b>
      </span>
    </section>
  )
}
