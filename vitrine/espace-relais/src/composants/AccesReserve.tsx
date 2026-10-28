// « Accès réservé au gérant » : une route que le membre connecté n'a pas le droit d'ouvrir (config/droits.ts ; PR-02
// Droits d'accès, ARL-06). La vraie coque de la route reste (en-tête, retour, barre) : l'employé repart d'un geste.
import { Link } from 'react-router-dom'
import { ACCUEIL, chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Ecran } from './coque'
import { Icone } from './Icone'

export function AccesReserve({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="r-vide" role="alert">
        <div className="r-vide-i">
          <Icone nom="r-cadenas" taille={28} />
        </div>
        <h2>{t('Accès réservé au gérant')}</h2>
        <p>{t('Cet écran touche l’argent ou la gestion du relais. Demandez au gérant : il peut aussi vous donner ce droit depuis Mon équipe, quand la règle le permet.')}</p>
      </div>
      <Link className="r-btn r-principal" to={chemin(ACCUEIL)}>
        <Icone nom="r-grille" taille={20} />
        <span>{t('Revenir au guichet')}</span>
      </Link>
    </Ecran>
  )
}
