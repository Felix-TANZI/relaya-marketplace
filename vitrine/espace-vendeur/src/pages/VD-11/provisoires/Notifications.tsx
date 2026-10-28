// Page provisoire « Notifications » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Notifications() {
  const { t } = usePreferences()
  switch (useEtat("notifications")) {
    default:
      return (
        <Ecran route="notifications" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Notifications")}
            </h1>
            <p className="pg-s">
              {t("Les plus récentes en haut. Touchez un message pour agir.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/notifications" className="on">
              {t("Tout ")}
              <span className="n">
                {t("8")}
              </span>
            </Link>
            <Link to="/notifications?f=urgent" className="">
              {t("Urgent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
            <Link to="/notifications?f=argent" className="">
              {t("Argent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
          </div>
          <div className="card tight">
            <Link to="/commande?ref=BLV-00009" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="package-check" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Préparer")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("09\u00A0h\u00A005")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00009 à préparer · payable au retrait")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prête avant 13\u00A0h\u00A005. Rien n’est encaissé\u00A0: un refus ne vous coûte rien.")}
                </span>
              </span>
            </Link>
            <Link to="/commande" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="package-check" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Préparer")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("08\u00A0h\u00A042")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00008 à préparer")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prête avant 12\u00A0h\u00A042 · vous gardez 17\u00A0840\u00A0F.")}
                </span>
              </span>
            </Link>
            <Link to="/offre3" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="trending-up" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Prix")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("08\u00A0h\u00A000")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("ITEL AC52\u00A0: un vendeur est passé à 19\u00A0000\u00A0F")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("À 18\u00A0900\u00A0F, les clients vous voient de nouveau en premier.")}
                </span>
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00006" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("06\u00A0h\u00A002")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00006 · «\u00A0Colis abîmé\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant jeu. 15 à 06\u00A0h\u00A002. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
            <Link to="/retours" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic amber">
                <Icone nom="undo-2" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag ca" style={{ "fontSize": "12px" }}>
                    {t("Retour")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("lun. 7\u00A0h\u00A010")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00004 revient\u00A0: défaut caché")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("17\u00A0840\u00A0F gelés jusqu’à l’inspection. Arrivée mer. 14 entre 14\u00A0h et 16\u00A0h.")}
                </span>
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00005" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("dim. 05\u00A0h\u00A030")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00005 · «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant mer. 14 à 05\u00A0h\u00A030. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
            <Link to="/palier" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="award" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Palier")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("sam. 18\u00A0h\u00A000")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("Votre score approche de 65\u00A0: plus que 3\u00A0commandes livrées pour passer Argent")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous garderez 324\u00A0F de plus par ITEL.")}
                </span>
              </span>
            </Link>
            <Link to="/versements" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic green">
                <Icone nom="banknote" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cg" style={{ "fontSize": "12px" }}>
                    {t("Versé")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("sam. 3\u00A0h\u00A040")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("Vendredi\u00A0: 17\u00A0840\u00A0F sur MTN\u00A0····\u00A04\u00A0217, sans frais")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Référence BLV-VS-3612 · couvre BLV-00002.")}
                </span>
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="message-square" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("SMS seulement pour une commande à préparer ou un litige. Le reste arrive en notification. Jamais de promotion par SMS.")}
            </span>
          </div>
          <div className="links">
            <Link to="/parametres" style={{ "display": "inline-flex", "alignItems": "center", "gap": "4px", "minHeight": "44px" }}>
              {t("Régler mes notifications")}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        </Ecran>
      )
    case "notifications?f=urgent":
      return (
        <Ecran route="notifications" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Notifications")}
            </h1>
            <p className="pg-s">
              {t("Les plus récentes en haut. Touchez un message pour agir.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/notifications" className="">
              {t("Tout ")}
              <span className="n">
                {t("8")}
              </span>
            </Link>
            <Link to="/notifications?f=urgent" className="on">
              {t("Urgent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
            <Link to="/notifications?f=argent" className="">
              {t("Argent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
          </div>
          <div className="card tight">
            <Link to="/commande?ref=BLV-00009" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="package-check" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Préparer")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("09\u00A0h\u00A005")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00009 à préparer · payable au retrait")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prête avant 13\u00A0h\u00A005. Rien n’est encaissé\u00A0: un refus ne vous coûte rien.")}
                </span>
              </span>
            </Link>
            <Link to="/commande" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic or">
                <Icone nom="package-check" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cor" style={{ "fontSize": "12px" }}>
                    {t("Préparer")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("08\u00A0h\u00A042")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00008 à préparer")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prête avant 12\u00A0h\u00A042 · vous gardez 17\u00A0840\u00A0F.")}
                </span>
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00006" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("06\u00A0h\u00A002")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00006 · «\u00A0Colis abîmé\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant jeu. 15 à 06\u00A0h\u00A002. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00005" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("dim. 05\u00A0h\u00A030")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00005 · «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant mer. 14 à 05\u00A0h\u00A030. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="message-square" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("SMS seulement pour une commande à préparer ou un litige. Le reste arrive en notification. Jamais de promotion par SMS.")}
            </span>
          </div>
          <div className="links">
            <Link to="/parametres" style={{ "display": "inline-flex", "alignItems": "center", "gap": "4px", "minHeight": "44px" }}>
              {t("Régler mes notifications")}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        </Ecran>
      )
    case "notifications?f=argent":
      return (
        <Ecran route="notifications" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Notifications")}
            </h1>
            <p className="pg-s">
              {t("Les plus récentes en haut. Touchez un message pour agir.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/notifications" className="">
              {t("Tout ")}
              <span className="n">
                {t("8")}
              </span>
            </Link>
            <Link to="/notifications?f=urgent" className="">
              {t("Urgent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
            <Link to="/notifications?f=argent" className="on">
              {t("Argent ")}
              <span className="n">
                {t("4")}
              </span>
            </Link>
          </div>
          <div className="card tight">
            <Link to="/litige?ref=BLV-00006" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("06\u00A0h\u00A002")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00006 · «\u00A0Colis abîmé\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant jeu. 15 à 06\u00A0h\u00A002. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
            <Link to="/retours" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic amber">
                <Icone nom="undo-2" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag ca" style={{ "fontSize": "12px" }}>
                    {t("Retour")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("lun. 7\u00A0h\u00A010")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00004 revient\u00A0: défaut caché")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("17\u00A0840\u00A0F gelés jusqu’à l’inspection. Arrivée mer. 14 entre 14\u00A0h et 16\u00A0h.")}
                </span>
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00005" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic red">
                <Icone nom="scale" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cr" style={{ "fontSize": "12px" }}>
                    {t("Litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· SMS")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("dim. 05\u00A0h\u00A030")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("BLV-00005 · «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Répondez avant mer. 14 à 05\u00A0h\u00A030. Sans réponse, décision en faveur du client.")}
                </span>
              </span>
            </Link>
            <Link to="/versements" className="li" style={{ "alignItems": "flex-start", "padding": "13px 0" }}>
              <span className="ic green">
                <Icone nom="banknote" taille={19} />
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px" }}>
                  <span className="qtag cg" style={{ "fontSize": "12px" }}>
                    {t("Versé")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("· Notification")}
                  </span>
                  <span className="grow"></span>
                  <span className="t12 c3 b7 nw">
                    {t("sam. 3\u00A0h\u00A040")}
                  </span>
                </span>
                <span className="lt" style={{ "display": "block", "marginTop": "3px" }}>
                  {t("Vendredi\u00A0: 17\u00A0840\u00A0F sur MTN\u00A0····\u00A04\u00A0217, sans frais")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Référence BLV-VS-3612 · couvre BLV-00002.")}
                </span>
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="message-square" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("SMS seulement pour une commande à préparer ou un litige. Le reste arrive en notification. Jamais de promotion par SMS.")}
            </span>
          </div>
          <div className="links">
            <Link to="/parametres" style={{ "display": "inline-flex", "alignItems": "center", "gap": "4px", "minHeight": "44px" }}>
              {t("Régler mes notifications")}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        </Ecran>
      )
  }
}
