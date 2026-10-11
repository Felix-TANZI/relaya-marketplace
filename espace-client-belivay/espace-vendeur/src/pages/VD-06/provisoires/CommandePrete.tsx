// Page provisoire « Remise au livreur » (VD-06) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (7 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function CommandePrete() {
  const { t } = usePreferences()
  switch (useEtat("commande_prete")) {
    case "commande_prete?ref=BLV-00008":
    case "commande_prete?ref=BLV-00008&role=prep":
    default:
      return (
        <Ecran route="commande_prete" parEtat>
          <div className="meta" style={{ "marginTop": "14px" }}>
            <span className="pill green">
              <Icone nom="circle-check" taille={13} />
              {t("Prête à 10\u00A0h\u00A005")}
            </span>
            <span className="pill ink">
              <Icone nom="package" taille={13} />
              {t("Colis S")}
            </span>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Livreur du créneau")}
            </div>
            <div className="row mt12" style={{ "gap": "14px" }}>
              <span style={{ "width": "64px", "height": "64px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0", "boxShadow": "0 0 0 3px rgba(255,255,255,.3)" }}>
                <Dessin id="d0b26c91c6a1" />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "23px", "letterSpacing": "-.02em", "lineHeight": "1.15" }}>
                  {t("Serge M.")}
                </div>
                <div className="t14 b7 mt4" style={{ "color": "rgba(255,255,255,.9)" }}>
                  {t("Wink Express")}
                </div>
                <div className="t13" style={{ "marginTop": "2px", "color": "rgba(255,255,255,.75)" }}>
                  {t("Aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="hline"></div>
            <div className="otop">
              <span className="hk" style={{ "color": "#fff", "opacity": ".85" }}>
                {t("Code de remise")}
              </span>
              <span className="pill dk sm">
                <Icone nom="eye-off" taille={13} />
                {t("masqué")}
              </span>
            </div>
            <div className="code6 mask" style={{ "gap": "6px" }}>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <i style={{ "width": "8px", "flexShrink": "0" }}></i>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
            </div>
            <div className="t14 b7 center mt14" style={{ "color": "#fff", "lineHeight": "1.4" }}>
              {t("Vérifiez son visage, puis affichez le code.")}
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00008&code=1" className="btn white">
                <Icone nom="eye" taille={18} />
                <span>
                  {t("Afficher le code")}
                </span>
              </Link>
            </div>
            <div className="t12 mt10 center" style={{ "color": "rgba(255,255,255,.72)", "lineHeight": "1.45" }}>
              {t("Marche sans réseau · masqué en quittant l’écran")}
            </div>
          </div>
          <div className="note red">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>
                {t("Ne donnez le code qu’à Serge M.")}
              </b>
              <div className="mt4">
                {t("Ce n’est pas lui\u00A0? Ne remettez rien.")}
              </div>
              <div className="mt4">
                {t("Trois codes faux bloquent la remise 24\u00A0h.")}
              </div>
              <Link to="/messages" className="b8" style={{ "display": "inline-flex", "alignItems": "center", "gap": "5px", "minHeight": "44px", "marginBottom": "-8px", "textDecoration": "underline", "textUnderlineOffset": "3px" }}>
                <Icone nom="message-circle" taille={16} />
                {t("Écrire au support")}
              </Link>
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
                {t("Ce que fait le livreur devant vous\u00A0:")}
              </p>
              <div className="tl">
                <div className="ti">
                  <div className="tt">
                    {t("Il contrôle l’article")}
                  </div>
                  <div className="td">
                    {t("Bon modèle, bonne couleur, état neuf")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il prend deux photos")}
                  </div>
                  <div className="td">
                    {t("L’article à découvert, puis le colis fermé et étiqueté")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il emballe et scelle")}
                  </div>
                  <div className="td">
                    {t("Emballage BelivaY, scellé, étiquette. Un volumineux garde son carton d’origine, filmé.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il saisit votre code")}
                  </div>
                  <div className="td">
                    {t("La remise est enregistrée\u00A0: la responsabilité passe à l’entreprise de livraison")}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </Ecran>
      )
    case "commande_prete?code=1":
    case "commande_prete?code=1&ref=BLV-00008":
      return (
        <Ecran route="commande_prete" parEtat>
          <div className="meta" style={{ "marginTop": "14px" }}>
            <span className="pill green">
              <Icone nom="circle-check" taille={13} />
              {t("Prête à 10\u00A0h\u00A005")}
            </span>
            <span className="pill ink">
              <Icone nom="package" taille={13} />
              {t("Colis S")}
            </span>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Livreur du créneau")}
            </div>
            <div className="row mt12" style={{ "gap": "14px" }}>
              <span style={{ "width": "64px", "height": "64px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0", "boxShadow": "0 0 0 3px rgba(255,255,255,.3)" }}>
                <Dessin id="d0b26c91c6a1" />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "23px", "letterSpacing": "-.02em", "lineHeight": "1.15" }}>
                  {t("Serge M.")}
                </div>
                <div className="t14 b7 mt4" style={{ "color": "rgba(255,255,255,.9)" }}>
                  {t("Wink Express")}
                </div>
                <div className="t13" style={{ "marginTop": "2px", "color": "rgba(255,255,255,.75)" }}>
                  {t("Aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="hline"></div>
            <div className="otop">
              <span className="hk" style={{ "color": "#fff", "opacity": ".85" }}>
                {t("Code de remise")}
              </span>
              <span className="pill dk sm">
                <Icone nom="eye" taille={13} />
                {t("affiché")}
              </span>
            </div>
            <div className="code6" style={{ "gap": "6px" }}>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("4")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("8")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("1")}
              </span>
              <i style={{ "width": "8px", "flexShrink": "0" }}></i>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("7")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("2")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "36px" }}>
                {t("9")}
              </span>
            </div>
            <div className="t14 b7 center mt14" style={{ "color": "#fff", "lineHeight": "1.4" }}>
              {t("Montrez-le à Serge M.\u00A0: il le saisit dans son application.")}
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00008" className="btn dark">
                <Icone nom="eye-off" taille={18} />
                <span>
                  {t("Masquer le code")}
                </span>
              </Link>
            </div>
            <div className="t12 mt10 center" style={{ "color": "rgba(255,255,255,.72)", "lineHeight": "1.45" }}>
              {t("Marche sans réseau · masqué en quittant l’écran")}
            </div>
          </div>
          <div className="card tight">
            <Link to="/commande_remise?ref=BLV-00008" className="li">
              <span className="ic or">
                <Icone nom="hourglass" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("En attente de la saisie du code")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Dès que Serge M. l’a saisi, l’écran «\u00A0Remis\u00A0» s’ouvre.")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="note red">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>
                {t("Ne donnez le code qu’à Serge M.")}
              </b>
              <div className="mt4">
                {t("Ce n’est pas lui\u00A0? Ne remettez rien.")}
              </div>
              <div className="mt4">
                {t("Trois codes faux bloquent la remise 24\u00A0h.")}
              </div>
              <Link to="/messages" className="b8" style={{ "display": "inline-flex", "alignItems": "center", "gap": "5px", "minHeight": "44px", "marginBottom": "-8px", "textDecoration": "underline", "textUnderlineOffset": "3px" }}>
                <Icone nom="message-circle" taille={16} />
                {t("Écrire au support")}
              </Link>
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
                {t("Ce que fait le livreur devant vous\u00A0:")}
              </p>
              <div className="tl">
                <div className="ti">
                  <div className="tt">
                    {t("Il contrôle l’article")}
                  </div>
                  <div className="td">
                    {t("Bon modèle, bonne couleur, état neuf")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il prend deux photos")}
                  </div>
                  <div className="td">
                    {t("L’article à découvert, puis le colis fermé et étiqueté")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il emballe et scelle")}
                  </div>
                  <div className="td">
                    {t("Emballage BelivaY, scellé, étiquette. Un volumineux garde son carton d’origine, filmé.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il saisit votre code")}
                  </div>
                  <div className="td">
                    {t("La remise est enregistrée\u00A0: la responsabilité passe à l’entreprise de livraison")}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </Ecran>
      )
    case "commande_prete?ref=BLV-00009":
    case "commande_prete?ref=BLV-00009&role=prep":
      return (
        <Ecran route="commande_prete" parEtat>
          <div className="meta" style={{ "marginTop": "14px" }}>
            <span className="pill green">
              <Icone nom="circle-check" taille={13} />
              {t("Prête à 10\u00A0h\u00A005")}
            </span>
            <span className="pill ink">
              <Icone nom="package" taille={13} />
              {t("Colis S")}
            </span>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Livreur du créneau")}
            </div>
            <div className="row mt12" style={{ "gap": "14px" }}>
              <span style={{ "width": "64px", "height": "64px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0", "boxShadow": "0 0 0 3px rgba(255,255,255,.3)" }}>
                <Dessin id="d0b26c91c6a1" />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "23px", "letterSpacing": "-.02em", "lineHeight": "1.15" }}>
                  {t("Serge M.")}
                </div>
                <div className="t14 b7 mt4" style={{ "color": "rgba(255,255,255,.9)" }}>
                  {t("Wink Express")}
                </div>
                <div className="t13" style={{ "marginTop": "2px", "color": "rgba(255,255,255,.75)" }}>
                  {t("Aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="hline"></div>
            <div className="otop">
              <span className="hk" style={{ "color": "#fff", "opacity": ".85" }}>
                {t("Code de remise")}
              </span>
              <span className="pill dk sm">
                <Icone nom="eye-off" taille={13} />
                {t("masqué")}
              </span>
            </div>
            <div className="code6 mask" style={{ "gap": "6px" }}>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <i style={{ "width": "8px", "flexShrink": "0" }}></i>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
              <span style={{ "width": "44px", "height": "64px", "fontSize": "28px" }}>
                {t("•")}
              </span>
            </div>
            <div className="t14 b7 center mt14" style={{ "color": "#fff", "lineHeight": "1.4" }}>
              {t("Vérifiez son visage, puis affichez le code.")}
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009&code=1" className="btn white">
                <Icone nom="eye" taille={18} />
                <span>
                  {t("Afficher le code")}
                </span>
              </Link>
            </div>
            <div className="t12 mt10 center" style={{ "color": "rgba(255,255,255,.72)", "lineHeight": "1.45" }}>
              {t("Marche sans réseau · masqué en quittant l’écran")}
            </div>
          </div>
          <div className="note red">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>
                {t("Ne donnez le code qu’à Serge M.")}
              </b>
              <div className="mt4">
                {t("Ce n’est pas lui\u00A0? Ne remettez rien.")}
              </div>
              <div className="mt4">
                {t("Trois codes faux bloquent la remise 24\u00A0h.")}
              </div>
              <Link to="/messages" className="b8" style={{ "display": "inline-flex", "alignItems": "center", "gap": "5px", "minHeight": "44px", "marginBottom": "-8px", "textDecoration": "underline", "textUnderlineOffset": "3px" }}>
                <Icone nom="message-circle" taille={16} />
                {t("Écrire au support")}
              </Link>
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
                {t("Ce que fait le livreur devant vous\u00A0:")}
              </p>
              <div className="tl">
                <div className="ti">
                  <div className="tt">
                    {t("Il contrôle l’article")}
                  </div>
                  <div className="td">
                    {t("Bon modèle, bonne couleur, état neuf")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il prend deux photos")}
                  </div>
                  <div className="td">
                    {t("L’article à découvert, puis le colis fermé et étiqueté")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il emballe et scelle")}
                  </div>
                  <div className="td">
                    {t("Emballage BelivaY, scellé, étiquette. Un volumineux garde son carton d’origine, filmé.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Il saisit votre code")}
                  </div>
                  <div className="td">
                    {t("La remise est enregistrée\u00A0: la responsabilité passe à l’entreprise de livraison")}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </Ecran>
      )
  }
}
