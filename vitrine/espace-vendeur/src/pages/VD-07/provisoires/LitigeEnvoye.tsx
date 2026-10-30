// Page provisoire « Décision et suites » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (7 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function LitigeEnvoye() {
  const { t } = usePreferences()
  switch (useEtat("litige_envoye")) {
    case "litige_envoye?ref=BLV-00005":
    default:
      return (
        <Ecran route="litige_envoye" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Décision et suites")}
            </h1>
            <p className="pg-s">
              {t("iPhone 15 Pro Max · «\u00A0Ce n’est pas le bon produit\u00A0»")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Réponse envoyée")}
              </span>
              <Icone nom="send" taille={18} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "21px", "lineHeight": "1.25" }}>
              {t("La médiation décide avant jeudi 15 oct. à 09\u00A0h\u00A048")}
            </div>
            <div className="hs">
              {t("Vous êtes prévenu par notification et par SMS.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span className="grow t14" style={{ "color": "rgba(255,255,255,.82)" }}>
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t17">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Où en est votre litige")}
            </h3>
            <div className="row" style={{ "gap": "0", "marginTop": "12px", "alignItems": "flex-start" }}>
              <div className="grow center" style={{ "position": "relative" }}>
                <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                  <Icone nom="check" taille={14} trait={3} />
                </span>
                <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                  {t("Litige reçu")}
                </div>
              </div>
              <div className="grow center" style={{ "position": "relative" }}>
                <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                  <Icone nom="check" taille={14} trait={3} />
                </span>
                <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                  {t("Votre réponse")}
                </div>
              </div>
              <div className="grow center" style={{ "position": "relative" }}>
                <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                  {t("3")}
                </span>
                <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
                  {t("Médiation")}
                </div>
              </div>
              <div className="grow center" style={{ "position": "relative" }}>
                <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--line-2)" }}></span>
                <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--sand-2)", "color": "var(--ink-3)", "border": "2px solid var(--line-2)" }}>
                  {t("4")}
                </span>
                <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                  {t("Décision")}
                </div>
              </div>
            </div>
            <div className="hr" style={{ "marginTop": "16px" }}></div>
            <div className="kick">
              {t("Ce qui peut arriver")}
            </div>
            <div className="mt4">
              <Link to="/litige_envoye?ref=BLV-00005&issue=gagne" className="li">
                <span className="ic green">
                  <Icone nom="badge-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Gagné\u00A0: vous gardez toute la vente")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Libérée aussitôt, versée le vendredi suivant. Aucun effet sur votre score.")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/litige_envoye?ref=BLV-00005&issue=perdu" className="li">
                <span className="ic red">
                  <Icone nom="circle-x" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Perdu\u00A0: le client est remboursé")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Aucun frais pour vous. Trust Score\u00A0: échec léger ou grave sur le critère Litiges.")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <div className="li">
                <span className="ic or">
                  <Icone nom="gavel" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Contestation, une fois")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Un médiateur senior décide sous 3\u00A0jours, puis le tribunal compétent.")}
                  </span>
                </span>
              </div>
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
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Client silencieux 5\u00A0jours")}
                  </span>
                  <span className="v ">
                    {t("Clos en votre faveur")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Remplacement accepté")}
                  </span>
                  <span className="v ">
                    {t("Sous 72\u00A0h ouvrées")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Vice caché")}
                  </span>
                  <span className="v ">
                    {t("Signalable jusqu’à 100\u00A0jours")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Litige en cours")}
                  </span>
                  <span className="v ">
                    {t("Aucun effet sur le score")}
                  </span>
                </div>
              </div>
            </div>
          </details>
          <div className="mt16">
            <Link to="/litiges" className="btn primary">
              <Icone nom="arrow-left" taille={18} />
              <span>
                {t("Retour aux litiges")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "litige_envoye?issue=gagne":
    case "litige_envoye?issue=gagne&ref=BLV-00005":
      return (
        <Ecran route="litige_envoye" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Décision et suites")}
            </h1>
            <p className="pg-s">
              {t("iPhone 15 Pro Max · «\u00A0Ce n’est pas le bon produit\u00A0»")}
            </p>
          </div>
          <div className="hero green">
            <div className="otop">
              <span className="hk" style={{ "color": "#9BF0C4" }}>
                {t("Litige gagné")}
              </span>
              <Icone nom="badge-check" taille={20} style={{ "color": "#9BF0C4" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "lineHeight": "1.25" }}>
              {t("Vous gardez toute la vente")}
            </div>
            <div className="big" style={{ "fontSize": "36px" }}>
              {t("335\u00A0324")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Libérés aujourd’hui, versés ")}
              <b>
                {t("samedi 17 octobre")}
              </b>
              {t(" vers MTN\u00A0····\u00A04\u00A0217.")}
            </div>
          </div>
          <div className="card">
            <div className="kick">
              {t("Motif écrit de la décision")}
            </div>
            <p className="t14 c2" style={{ "margin": "8px 0 0", "lineHeight": "1.55" }}>
              {t("Les deux photos du contrôle au ramassage montrent l’iPhone 15 Pro Max titane naturel 256 Go commandé, scellé devant le livreur. Le produit remis au client est conforme.")}
            </p>
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">
                  {t("Effet sur votre Trust Score")}
                </span>
                <span className="v ">
                  <span className="cg">
                    {t("Aucun")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Décidé par")}
                </span>
                <span className="v ">
                  {t("Médiation BelivaY · 14 oct. à 16\u00A0h\u00A040")}
                </span>
              </div>
            </div>
          </div>
          <div className="note ink">
            <Icone nom="gavel" taille={18} />
            <div>
              {t("Le client peut contester une fois\u00A0: un médiateur senior décide alors sous 3\u00A0jours. L’argent reste libéré pendant ce temps.")}
            </div>
          </div>
          <div className="mt16">
            <Link to="/litiges" className="btn primary">
              <Icone nom="arrow-left" taille={18} />
              <span>
                {t("Retour aux litiges")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "litige_envoye?issue=perdu":
    case "litige_envoye?issue=perdu&ref=BLV-00005":
      return (
        <Ecran route="litige_envoye" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Décision et suites")}
            </h1>
            <p className="pg-s">
              {t("iPhone 15 Pro Max · «\u00A0Ce n’est pas le bon produit\u00A0»")}
            </p>
          </div>
          <div className="hero red">
            <div className="otop">
              <span className="hk" style={{ "color": "#FFB4AC" }}>
                {t("Litige perdu")}
              </span>
              <Icone nom="circle-x" taille={20} style={{ "color": "#FFB4AC" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "lineHeight": "1.25" }}>
              {t("Le client est remboursé")}
            </div>
            <div className="hs">
              {t("Vous ne gardez rien sur cette vente et vous ne payez aucun frais.")}
              <br />
              {t("L’article vous revient par le relais.")}
            </div>
          </div>
          <div className="card">
            <div className="kick">
              {t("Motif écrit de la décision")}
            </div>
            <p className="t14 c2" style={{ "margin": "8px 0 0", "lineHeight": "1.55" }}>
              {t("La photo du client au relais montre un modèle 128 Go\u00A0; la commande portait sur un 256 Go. Les photos du ramassage ne montrent pas la capacité.")}
            </p>
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">
                  {t("Effet sur votre Trust Score")}
                </span>
                <span className="v ">
                  <span className="cr">
                    {t("Échec léger sur le critère Litiges")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Décidé par")}
                </span>
                <span className="v ">
                  {t("Médiation BelivaY · 14 oct. à 16\u00A0h\u00A040")}
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Vous n’êtes pas d’accord\u00A0?")}
            </h3>
            <div className="sub">
              {t("Vous pouvez contester une fois. Un médiateur senior décide sous 3\u00A0jours, avec un motif écrit.")}
            </div>
            <div className="mt12">
              <Link to="/contester" className="btn soft">
                <Icone nom="gavel" taille={18} />
                <span>
                  {t("Contester la décision")}
                </span>
              </Link>
            </div>
          </div>
          <div className="mt16">
            <Link to="/litiges" className="btn primary">
              <Icone nom="arrow-left" taille={18} />
              <span>
                {t("Retour aux litiges")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "litige_envoye?issue=accepte&ref=BLV-00005":
      return (
        <Ecran route="litige_envoye" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Décision et suites")}
            </h1>
            <p className="pg-s">
              {t("iPhone 15 Pro Max · «\u00A0Ce n’est pas le bon produit\u00A0»")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Litige clos")}
              </span>
              <Icone nom="circle-check" taille={20} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "lineHeight": "1.25" }}>
              {t("Vous avez accepté\u00A0: le client est remboursé")}
            </div>
            <div className="hs">
              {t("Vous ne gardez rien sur cette vente et vous ne payez aucun frais.")}
              <br />
              {t("L’article vous revient par le relais.")}
            </div>
          </div>
          <div className="mt16">
            <Link to="/litiges" className="btn primary">
              <Icone nom="arrow-left" taille={18} />
              <span>
                {t("Retour aux litiges")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}
