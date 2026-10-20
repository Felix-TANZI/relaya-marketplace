// Écran « Ouverture » (CL-03) : généré par outils/ecran.mjs depuis le prototype du 1er octobre, un rendu par
// état (1 adresses). En-tête, barre du bas et marges suivent l'état (Ecran parEtat).
// Les données sont encore écrites dans le rendu (démonstration) ; elles passeront par la source, sous la
// garde des tests au pixel (tests/identique.spec.ts).
import { Link } from 'react-router-dom'
import { chemin } from '../../config/pages'
import img_95a35f7565c5_jpg from '../../assets/prototype/95a35f7565c5.jpg'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { useEtat } from '../../config/etats'
import { usePreferences } from '../../preferences'

export function Ouverture() {
  const { t } = usePreferences()
  switch (useEtat("ouverture")) {
    case "ouverture":
    default:
      return (
        <Ecran route="ouverture" parEtat fixes={
          <>
            <Styles id="1c3d953197" />
            <div className="op-sc" style={{ "backgroundImage": `url(${img_95a35f7565c5_jpg})` }} role="img" aria-label="BelivaY">
              <p>
                {t("Tout près de toi · Yaoundé")}
              </p>
              <div className="btns">
                <Link to="/bienvenue" className="btn primary">
                  <Icone nom="arrow-right" taille={18} />
                  <span>
                    {t("Commencer")}
                  </span>
                </Link>
              </div>
              <div className="btns">
                <Link to="/connexion?lancement=1" className="btn secondary">
                  <span>
                    {t("J’ai déjà un compte")}
                  </span>
                </Link>
              </div>
              <Link to={chemin('inscription-diaspora')} className="op-dia">
                <Icone nom="globe" taille={15} />
                <span>{t("Tu vis à l’étranger ? Compte diaspora")}</span>
                <Icone nom="chevron-right" taille={14} />
              </Link>
            </div>
          </>
        }>
        <Styles id="1c3d953197" />
        <div style={{ "height": "600px" }}></div>
        </Ecran>
      )
  }
}
