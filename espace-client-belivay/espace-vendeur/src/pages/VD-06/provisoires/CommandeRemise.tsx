// Page provisoire « Remis au livreur » (VD-06) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function CommandeRemise() {
  const { t } = usePreferences()
  switch (useEtat("commande_remise")) {
    case "commande_remise?ref=BLV-00008":
    default:
      return (
        <Ecran route="commande_remise" parEtat>
          <div className="center" style={{ "paddingTop": "22px" }}>
            <div style={{ "width": "76px", "height": "76px", "borderRadius": "50%", "margin": "0 auto", "background": "var(--green-soft)", "border": "1.5px solid var(--green-line)", "color": "var(--green)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="package-check" taille={38} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "14px" }}>
              {t("Remis au livreur")}
            </h1>
            <p className="pg-s">
              {t("Serge M. a pris l’article aujourd’hui à 14\u00A0h\u00A022.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic green">
                  <Icone nom="shield-check" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t17">
                  {t("Vous êtes couvert")}
                </div>
                <div className="t14 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("L’entreprise de livraison répond du colis\u00A0: perdu ou abîmé, il vous est payé.")}
                </div>
              </div>
            </div>
            <div className="keep">
              <span className="kl">
                {t("Vous gardez")}
              </span>
              <span className="kv2">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="wallet" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Versés sans frais le vendredi qui suit la libération")}
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="tl" style={{ "marginTop": "0" }}>
                  <div className="ti done">
                    <div className="tt">
                      {t("Remis au livreur")}
                    </div>
                    <div className="td">
                      {t("C’est fait")}
                    </div>
                  </div>
                  <div className="ti">
                    <div className="tt">
                      {t("Retiré par le client")}
                    </div>
                    <div className="td">
                      {t("Au relais ou à domicile\u00A0; vous n’avez rien à faire")}
                    </div>
                  </div>
                  <div className="ti">
                    <div className="tt">
                      {t("Confirmé par le client")}
                    </div>
                    <div className="td">
                      {t("«\u00A0Tout est en ordre\u00A0», ou 7\u00A0jours sans problème signalé")}
                    </div>
                  </div>
                  <div className="ti">
                    <div className="tt">
                      {t("Se libère 3\u00A0jours plus tard")}
                    </div>
                    <div className="td">
                      {t("Délai du palier Bronze, votre niveau actuel")}
                    </div>
                  </div>
                  <div className="ti">
                    <div className="tt">
                      {t("Versé le vendredi suivant")}
                    </div>
                    <div className="td">
                      {t("Vers MTN\u00A0····\u00A04\u00A0217")}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Deux photos au dossier")}
              </h3>
              <span className="pill green sm">
                <Icone nom="circle-check" taille={13} />
                {t("Horodatées")}
              </span>
            </div>
            <div className="split2 mt12">
              <div>
                <div className="photo" style={{ "aspectRatio": "4/3" }}>
                  <Dessin id="31d53847e649" />
                </div>
                <div className="t12 b7 c2 mt6">
                  {t("À découvert · 14\u00A0h\u00A021")}
                </div>
              </div>
              <div>
                <div className="photo" style={{ "aspectRatio": "4/3" }}>
                  <Dessin id="97f264a1205c" />
                </div>
                <div className="t12 b7 c2 mt6">
                  {t("Colis scellé · 14\u00A0h\u00A022")}
                </div>
              </div>
            </div>
            <p className="t12 c3" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Prises par le livreur à Mvog-Ada, versées au dossier de la commande.")}
            </p>
          </div>
          <div className="mt16">
            <Link to="/commandes" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Terminer")}
              </span>
            </Link>
          </div>
          <div className="links">
            <Link to="/recu?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="receipt" taille={17} />
              {t("Voir le reçu")}
            </Link>
          </div>
        </Ecran>
      )
  }
}
