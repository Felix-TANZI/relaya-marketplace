// Page provisoire « Mes chiffres » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Chiffres() {
  const { t } = usePreferences()
  switch (useEtat("chiffres")) {
    default:
      return (
        <Ecran route="chiffres" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mes chiffres")}
            </h1>
            <p className="pg-s">
              {t("Ce qui se vend, et comment vendre plus.")}
            </p>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Vos ventes · 30 derniers jours")}
            </div>
            <div className="big">
              {t("820\u00A0000")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("9\u00A0commandes · 8 encaissées. ")}
              <b>
                {t("Mardi et mercredi portent vos deux ventes d’iPhone.")}
              </b>
            </div>
          </div>
          <div className="card tight">
            <div className="li">
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Panier moyen")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Par commande encaissée")}
                </span>
              </span>
              <span className="b8 nw" style={{ "fontSize": "19px", "letterSpacing": "-.02em" }}>
                {t("102\u00A0500\u00A0F")}
              </span>
            </div>
            <div className="li">
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Retours")}
                </span>
              </span>
              <span className="b8 nw" style={{ "fontSize": "19px", "letterSpacing": "-.02em" }}>
                {t("14\u00A0%")}
              </span>
            </div>
            <div className="li">
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vues de vos offres")}
                </span>
              </span>
              <span className="b8 nw" style={{ "fontSize": "19px", "letterSpacing": "-.02em" }}>
                {t("340")}
              </span>
            </div>
            <div className="li">
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Conversion")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Part des vues qui finissent en achat")}
                </span>
              </span>
              <span className="b8 nw" style={{ "fontSize": "19px", "letterSpacing": "-.02em" }}>
                {t("2,4\u00A0%")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Vos ventes par jour")}
            </h3>
            <div className="spark">
              <i className="" style={{ "height": "20%" }}></i>
              <i className="on" style={{ "height": "100%" }}></i>
              <i className="on" style={{ "height": "100%" }}></i>
              <i className="" style={{ "height": "20%" }}></i>
              <i className="" style={{ "height": "40%" }}></i>
              <i className="" style={{ "height": "20%" }}></i>
              <i className="" style={{ "height": "4%" }}></i>
            </div>
            <div className="spark-l">
              <span style={{ "fontSize": "12px" }}>
                {t("Lun")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Mar")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Mer")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Jeu")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Ven")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Sam")}
              </span>
              <span style={{ "fontSize": "12px" }}>
                {t("Dim")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui se vend")}
            </h3>
            <div className="hbar mt8">
              <span className="hl">
                {t("iPhone 15 Pro Max")}
              </span>
              <span className="hb">
                <i style={{ "width": "85%" }}></i>
              </span>
              <span className="hv">
                {t("85\u00A0%")}
              </span>
            </div>
            <div className="hbar">
              <span className="hl">
                {t("ITEL AC52")}
              </span>
              <span className="hb">
                <i style={{ "width": "15%" }}></i>
              </span>
              <span className="hv">
                {t("15\u00A0%")}
              </span>
            </div>
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>
                <b>
                  {t("Dépendance à un produit\u00A0:")}
                </b>
                {t(" l’iPhone fait 85\u00A0% de vos ventes. Voyez ce que les clients cherchent d’autre près de chez vous.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/demande" className="btn primary">
                <Icone nom="search" taille={18} />
                <span>
                  {t("Voir la demande")}
                </span>
              </Link>
            </div>
          </div>
          <Link to="/plans_liste" className="card flat" style={{ "display": "block" }}>
            <div className="row">
              <Icone nom="lock" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <div className="grow t13 c2">
                {t("Historique 3 et 12\u00A0mois avec Boost · par offre et par quartier avec Pro")}
              </div>
              <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
            </div>
          </Link>
        </Ecran>
      )
  }
}
