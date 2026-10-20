// Page provisoire « Nouvelle offre — photos » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Offre2() {
  const { t } = usePreferences()
  switch (useEtat("offre2")) {
    default:
      return (
        <Ecran route="offre2" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 2 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b7 c2">
              {t("Produit")}
            </span>
            <span className="grow t12 b8 cor">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Vos photos réelles")}
          </h1>
          <p className="pg-s">
            {t("Photographiez l’article que vous vendez\u00A0: 3 photos au moins, 8 au plus.")}
          </p>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "44px", "height": "44px", "borderRadius": "11px" }}>
                <Dessin id="8264389662ba" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15px" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="av">
                  {t("Déjà au catalogue · Téléphones")}
                </div>
              </div>
            </div>
            <div className="photos" style={{ "gridTemplateColumns": "repeat(4,1fr)" }}>
              <Link to="/camera?mode=photo" className="addph">
                <Icone nom="camera" taille={22} />
                <span>
                  {t("Prendre")}
                </span>
              </Link>
              <div className="photo">
                <Dessin id="31d53847e649" />
                <span className="ts" style={{ "fontSize": "12px", "textAlign": "center" }}>
                  {t("09\u00A0h\u00A041")}
                </span>
              </div>
              <div className="photo">
                <Dessin id="31d53847e649" />
                <span className="ts" style={{ "fontSize": "12px", "textAlign": "center" }}>
                  {t("09\u00A0h\u00A042")}
                </span>
              </div>
              <div className="photo">
                <Dessin id="97f264a1205c" />
                <span className="ts" style={{ "fontSize": "12px", "textAlign": "center" }}>
                  {t("09\u00A0h\u00A043")}
                </span>
              </div>
            </div>
            <div className="row mt12 t13 cg b7" style={{ "gap": "8px" }}>
              <Icone nom="circle-check" taille={17} style={{ "flexShrink": "0" }} />
              <span>
                {t("3 photos\u00A0: le minimum est atteint")}
              </span>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="smartphone" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Allégées avant l’envoi (6,3 Mo → 540 Ko)\u00A0: votre forfait ne fond pas.")}
            </span>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Une photo réelle montre l’article vendu, pas une image trouvée en ligne. BelivaY s’en sert pour vérifier l’offre.")}
              </p>
              <p>
                {t("800 × 800 px au moins. L’heure et le lieu de chaque prise sont conservés.")}
              </p>
              <p>
                {t("Hors connexion, l’offre est gardée et part au retour du réseau.")}
              </p>
            </div>
          </details>
          <div className="mt16">
            <Link to="/offre3" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Continuer")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}
