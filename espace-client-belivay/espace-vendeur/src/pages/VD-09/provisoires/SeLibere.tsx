// Page provisoire « Se libère — quand » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function SeLibere() {
  const { t } = usePreferences()
  switch (useEtat("se_libere")) {
    default:
      return (
        <Ecran route="se_libere" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Se libère")}
            </h1>
            <p className="pg-s">
              {t("Le délai de sécurité après la confirmation du client.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/argent" style={{ "height": "44px" }} className="">
              {t("Résumé")}
            </Link>
            <Link to="/se_libere" style={{ "height": "44px" }} className="on">
              {t("Se libère")}
            </Link>
            <Link to="/gele" style={{ "height": "44px" }} className="">
              {t("Gelé")}
            </Link>
            <Link to="/gains" style={{ "height": "44px" }} className="">
              {t("Mes gains")}
            </Link>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("BLV-00007 · ITEL AC52")}
            </div>
            <div className="big">
              {t("8\u00A0h\u00A012")}
              <small>
                {t("restantes")}
              </small>
            </div>
            <div className="bar mt10">
              <i style={{ "width": "88.6%" }}></i>
            </div>
            <div className="row t12 mt6" style={{ "color": "rgba(255,255,255,.74)" }}>
              <span className="grow">
                {t("Confirmée ven. 18 sept., 18\u00A0h")}
              </span>
              <span>
                {t("Libérée aujourd’hui, 18\u00A0h")}
              </span>
            </div>
            <div className="hline"></div>
            <div className="row" style={{ "alignItems": "flex-end" }}>
              <div className="grow">
                <div className="t12 b8" style={{ "letterSpacing": ".06em", "textTransform": "uppercase", "color": "rgba(255,255,255,.74)" }}>
                  {t("Vous gardez")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.86)", "lineHeight": "1.4" }}>
                  {t("Versé vendredi 25 sept. sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
              </div>
              <div className="b8 nw" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
                {t("17\u00A0840\u00A0F")}
              </div>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="award" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Votre palier Bronze\u00A0: libéré 3\u00A0jours après la confirmation du client.")}
            </span>
          </div>
          <div className="sec">
            <h2>
              {t("En cours")}
            </h2>
          </div>
          <div className="card tight">
            <Link to="/commande?ref=BLV-00008" className="li">
              <span className="ic amber">
                <Icone nom="hourglass" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("BLV-00008 · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Pas encore retirée\u00A0: le délai n’a pas commencé.")}
                </span>
              </span>
              <span className="rv">
                {t("17\u00A0840\u00A0F")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="note red">
            <Icone nom="lock" taille={18} />
            <div>
              {t("Un litige ou un retour ouvert gèle la somme aussitôt, même pendant le délai.")}
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
              <div className="tl" style={{ "marginTop": "4px" }}>
                <div className="ti done">
                  <div className="tt">
                    {t("1 · Le client paie")}
                  </div>
                  <div className="td">
                    {t("BelivaY met l’argent de côté\u00A0: vous êtes couvert, même si le colis se perd.")}
                  </div>
                </div>
                <div className="ti done">
                  <div className="tt">
                    {t("2 · Le client retire")}
                  </div>
                  <div className="td">
                    {t("Au relais ou à domicile.")}
                  </div>
                </div>
                <div className="ti done">
                  <div className="tt">
                    {t("3 · Le droit de retour se ferme")}
                  </div>
                  <div className="td">
                    {t("Le client confirme «\u00A0Tout est en ordre\u00A0», ou 7\u00A0jours passent sans problème signalé.")}
                  </div>
                </div>
                <div className="ti cur">
                  <div className="tt">
                    {t("4 · L’argent se libère")}
                  </div>
                  <div className="td">
                    {t("3\u00A0jours pour Bronze et Argent, 1\u00A0jour pour Or et Platine, 14\u00A0jours pour un paiement par carte.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("5 · Versement")}
                  </div>
                  <div className="td">
                    {t("Le vendredi qui suit, avant 12\u00A0h, sur votre numéro de versement.")}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </Ecran>
      )
  }
}
