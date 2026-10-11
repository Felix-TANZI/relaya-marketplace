// Page provisoire « La demande » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Demande() {
  const { t } = usePreferences()
  switch (useEtat("demande")) {
    default:
      return (
        <Ecran route="demande" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("La demande")}
            </h1>
            <p className="pg-s">
              {t("Ce que les clients cherchent près de chez vous, sans le trouver.")}
            </p>
          </div>
          <div className="hint-l">
            <Icone nom="eye-off" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Vous voyez les mots cherchés, jamais le nom du client.")}
            </span>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--or-line)" }}>
            <div className="kick" style={{ "fontSize": "12px" }}>
              {t("Le plus cherché · zone Z4")}
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
              {t("«\u00A0chargeur itel\u00A0»")}
            </div>
            <div className="t13 c3 mt4">
              {t("Cherché 14 fois près de votre boutique, sans résultat.")}
            </div>
            <div className="mt14">
              <Link to="/offre1?q=chargeur%20itel" className="btn primary">
                <Icone nom="plus" taille={18} />
                <span>
                  {t("Ajouter ce produit")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Autres recherches sans résultat")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/offre1?q=coque%20iphone%2015" className="li">
              <span className="ic or">
                <Icone nom="search" taille={18} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("«\u00A0coque iphone 15\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("11 recherches")}
                </span>
              </span>
              <span className="t13 b8 cor nw" style={{ "display": "inline-flex", "alignItems": "center", "gap": "4px" }}>
                <Icone nom="plus" taille={16} />
                {t("Ajouter")}
              </span>
            </Link>
            <Link to="/offre1?q=%C3%A9couteurs%20sans%20fil" className="li">
              <span className="ic or">
                <Icone nom="search" taille={18} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("«\u00A0écouteurs sans fil\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("8 recherches")}
                </span>
              </span>
              <span className="t13 b8 cor nw" style={{ "display": "inline-flex", "alignItems": "center", "gap": "4px" }}>
                <Icone nom="plus" taille={16} />
                {t("Ajouter")}
              </span>
            </Link>
            <div className="li">
              <span className="ic">
                <Icone nom="lock" taille={18} />
              </span>
              <span className="grow">
                <span className="lt c2" style={{ "display": "block" }}>
                  {t("«\u00A0batterie externe 20\u00A0000\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("6 recherches")}
                </span>
              </span>
              <span className="t12 b8 c3 nw">
                {t("Avec Boost")}
              </span>
            </div>
            <div className="li">
              <span className="ic">
                <Icone nom="lock" taille={18} />
              </span>
              <span className="grow">
                <span className="lt c2" style={{ "display": "block" }}>
                  {t("«\u00A0montre connectée\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("5 recherches")}
                </span>
              </span>
              <span className="t12 b8 c3 nw">
                {t("Avec Boost")}
              </span>
            </div>
            <Link to="/plans_liste" className="row" style={{ "minHeight": "48px", "borderTop": "1px solid var(--line)", "gap": "8px" }}>
              <span className="grow t13 c3">
                {t("Free montre les 3 premières recherches. Boost les montre toutes.")}
              </span>
              <span className="t13 b8 cor nw">
                {t("Voir Boost")}
              </span>
              <Icone nom="chevron-right" taille={16} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            </Link>
          </div>
          <div className="sec">
            <h2>
              {t("Ce qui freine vos ventes")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/services" className="li">
              <span className="ic amber">
                <Icone nom="camera" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Une seule photo sur l’ITEL")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Les offres avec des photos nettes et nombreuses reçoivent plus de commandes.")}
                  <span className="b8 cor" style={{ "display": "block", "marginTop": "4px" }}>
                    {t("Photos par un agent")}
                  </span>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/visibilite" className="li">
              <span className="ic amber">
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("L’iPhone n’est pas attribué aux clients de Bastos")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Pour eux, la livraison depuis votre boutique coûte 1\u00A0500\u00A0F.")}
                  <span className="b8 cor" style={{ "display": "block", "marginTop": "4px" }}>
                    {t("Vitrine de quartier ou prix ajusté")}
                  </span>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/avis" className="li">
              <span className="ic amber">
                <Icone nom="star" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("2 avis seulement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Le rappel automatique de notation est déjà actif après chaque retrait.")}
                  <span className="b8 cor" style={{ "display": "block", "marginTop": "4px" }}>
                    {t("Voir mes avis")}
                  </span>
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
