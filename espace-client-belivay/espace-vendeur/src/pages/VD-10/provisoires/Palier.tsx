// Page provisoire « Mon palier » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Palier() {
  const { t } = usePreferences()
  switch (useEtat("palier")) {
    default:
      return (
        <Ecran route="palier" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mon palier")}
            </h1>
            <p className="pg-s">
              {t("Le palier est votre niveau de vendeur. Le Trust Score, votre note de confiance sur 100.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/palier" className="on">
              {t("Mon palier")}
            </Link>
            <Link to="/score" className="">
              {t("Mon score")}
            </Link>
            <Link to="/paliers" className="">
              {t("Les paliers")}
            </Link>
          </div>
          <div className="hero night">
            <div className="row">
              <span className="medal bronze">
                <Icone nom="award" taille={22} />
              </span>
              <div className="grow">
                <div className="hk">
                  {t("Votre palier")}
                </div>
                <div className="b8" style={{ "fontSize": "24px", "lineHeight": "1.2" }}>
                  {t("Bronze")}
                </div>
              </div>
              <div className="right">
                <div className="big" style={{ "margin": "0", "fontSize": "38px" }}>
                  {t("63")}
                </div>
                <div className="t12" style={{ "color": "rgba(255,255,255,.75)" }}>
                  {t("Trust Score / 100")}
                </div>
              </div>
            </div>
            <div className="bar mt14">
              <i style={{ "width": "63%" }}></i>
            </div>
            <div className="t12 mt6 right" style={{ "color": "rgba(255,255,255,.75)" }}>
              {t("Argent à 65")}
            </div>
            <div className="hline"></div>
            <div className="b8" style={{ "fontSize": "18px", "lineHeight": "1.3", "letterSpacing": "-.01em" }}>
              {t("Plus que 3\u00A0commandes livrées sans incident pour passer Argent.")}
            </div>
            <div className="hs">
              {t("Vous garderez alors 324\u00A0F de plus par ITEL.")}
            </div>
            <div className="mt14">
              <Link to="/commandes" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("Voir mes commandes à préparer")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Pour passer Argent")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 4px" }}>
              {t("Trois conditions, à tenir 14\u00A0jours.")}
            </p>
            <div className="li" style={{ "minHeight": "0", "padding": "11px 0" }}>
              <span className="ic or" style={{ "width": "34px", "height": "34px", "borderRadius": "50%" }}>
                <Icone nom="arrow-up-right" taille={17} trait={2.4} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14px" }}>
                  {t("Trust Score 65 au moins")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous\u00A0: 63")}
                </span>
              </span>
              <span className="b8 t14 cor">
                {t("+ 2")}
              </span>
            </div>
            <div className="li" style={{ "minHeight": "0", "padding": "11px 0" }}>
              <span className="ic or" style={{ "width": "34px", "height": "34px", "borderRadius": "50%" }}>
                <Icone nom="arrow-up-right" taille={17} trait={2.4} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14px" }}>
                  {t("10\u00A0commandes livrées")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous\u00A0: 7")}
                </span>
              </span>
              <span className="b8 t14 cor">
                {t("+ 3")}
              </span>
            </div>
            <div className="li" style={{ "minHeight": "0", "padding": "11px 0" }}>
              <span className="ic green" style={{ "width": "34px", "height": "34px", "borderRadius": "50%" }}>
                <Icone nom="check" taille={17} trait={2.4} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14px" }}>
                  {t("Note moyenne 4,0 au moins")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous\u00A0: 4,0")}
                </span>
              </span>
              <span className="b8 t14 cg">
                {t("acquis")}
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi 3\u00A0commandes\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("3\u00A0commandes livrées sans incident de plus\u00A0: votre score monte vers 66 environ, et vous atteignez 10\u00A0commandes livrées.")}
                </p>
                <p>
                  {t("Vos 2 litiges en cours ne comptent qu’une fois tranchés. Gagnés, votre score serait de 64\u00A0; perdus, de 55.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Ce que vous gagnez avec Argent")}
            </h3>
            <div className="keep">
              <span className="kl">
                {t("Vous garderez par ITEL")}
              </span>
              <span className="kv2">
                {t("18\u00A0164\u00A0F")}
              </span>
            </div>
            <p className="t13 c3" style={{ "margin": "6px 2px 8px" }}>
              {t("Au lieu de 17\u00A0840\u00A0F aujourd’hui.")}
            </p>
            <div className="kv">
              <span className="k">
                {t("Sur un iPhone à 350\u00A0000\u00A0F")}
              </span>
              <span className="v ">
                {t("2\u00A0201\u00A0F de plus")}
              </span>
            </div>
            <div className="kv">
              <span className="k">
                {t("Support")}
              </span>
              <span className="v ">
                {t("Prioritaire, en 4\u00A0h")}
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
                  {t("Recalculé chaque nuit.")}
                </b>
                {t(" Votre score exact est 62,7\u00A0; il s’affiche arrondi.")}
              </p>
              <p>
                <b>
                  {t("On monte")}
                </b>
                {t(" quand les trois conditions sont tenues 14\u00A0jours.")}
              </p>
              <p>
                <b>
                  {t("On descend")}
                </b>
                {t(" si le score reste sous le seuil moins 5 pendant 14\u00A0jours. Un humain valide la descente, avec un motif. Vous pouvez contester une fois.")}
              </p>
              <p>
                <b>
                  {t("Offre de découverte.")}
                </b>
                {t(" Ces montants la comprennent\u00A0: 9\u00A0commandes sur 50, jusqu’au 27 nov. au plus tard.")}
              </p>
            </div>
          </details>
          <div className="card tight">
            <Link to="/sanctions" className="li">
              <span className="ic green">
                <Icone nom="shield-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Sanctions et contrôle")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Aucune sanction en cours")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}
