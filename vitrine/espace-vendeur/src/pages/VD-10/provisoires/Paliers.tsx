// Page provisoire « Les paliers » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Paliers() {
  const { t } = usePreferences()
  switch (useEtat("paliers")) {
    default:
      return (
        <Ecran route="paliers" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Les paliers")}
            </h1>
            <p className="pg-s">
              {t("Plus votre palier est haut, plus vous gardez sur chaque vente.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/palier" className="">
              {t("Mon palier")}
            </Link>
            <Link to="/score" className="">
              {t("Mon score")}
            </Link>
            <Link to="/paliers" className="on">
              {t("Les paliers")}
            </Link>
          </div>
          <div className="card">
            <div className="row t12 c3 b7" style={{ "paddingBottom": "8px" }}>
              <span className="grow">
                {t("Pour un ITEL AC52 vendu 20\u00A0000\u00A0F")}
              </span>
              <span>
                {t("Vous gardez")}
              </span>
            </div>
            <div className="li" style={{ "alignItems": "flex-start", "padding": "14px 0" }}>
              <span className="medal bronze">
                <Icone nom="award" taille={22} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "8px" }}>
                  <span className="b8 t17">
                    {t("Bronze")}
                  </span>
                  <span className="pill or">
                    {t("Vous")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block", "fontSize": "13px" }}>
                  {t("Pièce d’identité et selfie validés")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "marginTop": "5px" }}>
                  {t("Argent libéré en 3\u00A0jours · support en 24\u00A0h ouvrées")}
                </span>
              </span>
              <span className="right" style={{ "flexShrink": "0" }}>
                <span className="b8 t15 cg nw" style={{ "display": "block" }}>
                  {t("17\u00A0840\u00A0F")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "alignItems": "flex-start", "padding": "14px 0" }}>
              <span className="medal argent">
                <Icone nom="award" taille={22} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "8px" }}>
                  <span className="b8 t17">
                    {t("Argent\u2060")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block", "fontSize": "13px" }}>
                  {t("Trust Score 65, 10\u00A0commandes livrées, note 4,0")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "marginTop": "5px" }}>
                  {t("Argent libéré en 3\u00A0jours · support prioritaire en 4\u00A0h")}
                </span>
                <Link to="/palier" className="t13 b8 cor" style={{ "display": "block", "padding": "8px 0 4px", "lineHeight": "1.4" }}>
                  {t("Il vous manque 2 points et 3\u00A0commandes livrées ")}
                  <Icone nom="chevron-right" taille={15} style={{ "verticalAlign": "-3px" }} />
                </Link>
              </span>
              <span className="right" style={{ "flexShrink": "0" }}>
                <span className="b8 t15 cg nw" style={{ "display": "block" }}>
                  {t("18\u00A0164\u00A0F")}
                </span>
                <span className="t12 b7 cg nw" style={{ "display": "block", "marginTop": "2px" }}>
                  {t("+324\u00A0F")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "alignItems": "flex-start", "padding": "14px 0" }}>
              <span className="medal or">
                <Icone nom="award" taille={22} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "8px" }}>
                  <span className="b8 t17">
                    {t("Or")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block", "fontSize": "13px" }}>
                  {t("Trust Score 80, 50\u00A0commandes, note 4,3, visite de la boutique")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "marginTop": "5px" }}>
                  {t("Argent libéré en 1\u00A0jour · support en 2\u00A0h")}
                </span>
              </span>
              <span className="right" style={{ "flexShrink": "0" }}>
                <span className="b8 t15 cg nw" style={{ "display": "block" }}>
                  {t("18\u00A0488\u00A0F")}
                </span>
                <span className="t12 b7 cg nw" style={{ "display": "block", "marginTop": "2px" }}>
                  {t("+648\u00A0F")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "alignItems": "flex-start", "padding": "14px 0" }}>
              <span className="medal platine">
                <Icone nom="award" taille={22} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "8px" }}>
                  <span className="b8 t17">
                    {t("Platine")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block", "fontSize": "13px" }}>
                  {t("Trust Score 90 tenu 6\u00A0mois, audit chaque trimestre")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "marginTop": "5px" }}>
                  {t("Argent libéré en 1\u00A0jour · un responsable de compte")}
                </span>
              </span>
              <span className="right" style={{ "flexShrink": "0" }}>
                <span className="b8 t15 cg nw" style={{ "display": "block" }}>
                  {t("18\u00A0704\u00A0F")}
                </span>
                <span className="t12 b7 cg nw" style={{ "display": "block", "marginTop": "2px" }}>
                  {t("+864\u00A0F")}
                </span>
              </span>
            </div>
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
                <b>
                  {t("On monte")}
                </b>
                {t(" quand le seuil est franchi et tenu 14\u00A0jours.")}
              </p>
              <p>
                <b>
                  {t("On descend")}
                </b>
                {t(" si le score reste sous le seuil moins 5 pendant 14\u00A0jours. Un humain valide, avec un motif. Vous pouvez contester une fois.")}
              </p>
              <p>
                <b>
                  {t("Vendeur de remplacement.")}
                </b>
                {t(" Quand un autre vendeur est en rupture, seuls ceux à 75 et plus reprennent sa commande.")}
              </p>
              <p>
                {t("Le palier fixe, avec la catégorie, ce que vous gardez et la vitesse de libération. Montants calculés par BelivaY, offre de découverte comprise.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}
