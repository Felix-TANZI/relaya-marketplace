// « Ce lien ne mène à aucune page » (CCH-19, CFS-04, CNV-13) : adresse inconnue ou module dont
// l'interrupteur est fermé. Balisage de c14Closed du prototype : en-tête enfant « BelivaY », retour à
// l'accueil, état vide et un seul bouton plein. Les repères de revue du prototype (pastille de
// l'interrupteur, liste « Ce que l'interrupteur masque ») n'existent pas sur le site (CCH-18, CCH-19).
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ecran } from '../composants/coque'
import { useDes } from '../composants/ecran'
import { Icone } from '../composants/Icone'
import { Bouton, Vide } from '../composants/socle'
import { NAVIGATION, chemin, type Navigation } from '../config/pages'
import { usePreferences } from '../preferences'

// Navigation de c14Closed : en-tête enfant, panier à droite, barre du bas sans onglet allumé.
const NAVIGATION_INTROUVABLE: Navigation = {
  ...NAVIGATION['abonnements'],
  titre: 'BelivaY',
  sousTitre: null,
  retour: 'accueil',
  droite: 'panier',
  barre: true,
  onglet: null,
}

// Où aller ensuite (passage professionnel) : ce qu'un client cherchait le plus souvent par un vieux lien.
const SUITES = [
  { route: 'recherche', icone: 'search', titre: 'Chercher un produit' },
  { route: 'commandes', icone: 'package', titre: 'Mes commandes' },
  { route: 'aide', icone: 'life-buoy', titre: 'Aide' },
]

export function Introuvable() {
  const { t, tf } = usePreferences()
  const { pathname } = useLocation()
  // Dès la tablette, la barre de titre et le fil d'Ariane nomment la page (« Accueil › Page introuvable ») ; le
  // téléphone garde l'en-tête « BelivaY » du prototype.
  const site = useDes('tab')
  // Titre de l'onglet : la page n'existe pas (l'en-tête garde « BelivaY », comme le prototype).
  useEffect(() => {
    document.title = t('Page introuvable') + ' · BelivaY'
  }, [t])
  return (
    <Ecran route="introuvable" navigation={site ? { ...NAVIGATION_INTROUVABLE, titre: 'Page introuvable' } : NAVIGATION_INTROUVABLE} gabarit="centre">
      <Vide icone="link" titre={t('Ce lien ne mène à aucune page')} texte={t('Il est peut-être ancien. Tout le reste de l’application fonctionne normalement.')}>
        <p className="t13 c3" style={{ wordBreak: 'break-all' }}>
          {tf('Adresse demandée : {a}', { a: pathname })}
        </p>
        <div className="btns i404" style={{ justifyContent: 'center' }}>
          <Bouton vers={chemin('accueil')} icone="house">
            {t('Retour à l’accueil')}
          </Bouton>
        </div>
      </Vide>
      <div className="card tight">
        {SUITES.map((s) => (
          <Link key={s.route} to={chemin(s.route)} className="li" style={{ color: 'inherit' }}>
            <span className="ic">
              <Icone nom={s.icone} taille={20} />
            </span>
            <span className="grow">
              <span className="lt">{t(s.titre)}</span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </Ecran>
  )
}
