// Page provisoire « Messagerie » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Messages() {
  const { t } = usePreferences()
  switch (useEtat("messages")) {
    default:
      return (
        <Ecran route="messages" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Messagerie")}
            </h1>
            <p className="pg-s">
              {t("Une conversation par commande, sans nom ni numéro.")}
            </p>
          </div>
          <div className="card tight">
            <Link to="/messages?fil=1" className="li">
              <span className="ic or">
                <Icone nom="shopping-bag" taille={20} />
              </span>
              <span className="grow">
                <span className="row">
                  <span className="grow lt">
                    {t("Client de BLV-00008")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("09\u00A0h\u00A031")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("«\u00A0Le livreur passe à quelle heure\u00A0?\u00A0»")}
                </span>
              </span>
              <span className="badge-num">
                {t("1")}
              </span>
            </Link>
            <Link to="/litige?ref=BLV-00005" className="li">
              <span className="ic red">
                <Icone nom="scale" taille={20} />
              </span>
              <span className="grow">
                <span className="row">
                  <span className="grow lt">
                    {t("Client de BLV-00005 · litige")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("dim.")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Conversation du litige · fermée à la fin du dossier")}
                </span>
              </span>
            </Link>
            <Link to="/aide" className="li">
              <span className="ic green">
                <Icone nom="headset" taille={20} />
              </span>
              <span className="grow">
                <span className="row">
                  <span className="grow lt">
                    {t("Support BelivaY")}
                  </span>
                  <span className="t12 c3 b7">
                    {t("ven.")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("«\u00A0Votre versement du 10 oct. est parti\u00A0: BLV-VS-3612\u00A0»")}
                </span>
              </span>
            </Link>
          </div>
          <details className="more">
            <summary>
              <Icone nom="shield-check" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                <b>
                  {t("Rattachée à une commande\u00A0:")}
                </b>
                {t(" pas de conversation libre. Elle se ferme à la fin du délai de litige.")}
              </p>
              <p>
                <b>
                  {t("Anonyme dans les deux sens\u00A0:")}
                </b>
                {t(" vous lisez «\u00A0Client de BLV-…\u00A0». Le client lit «\u00A0le vendeur\u00A0» et voit «\u00A0Vendeur certifié Bronze · Trust Score 63\u00A0».")}
              </p>
              <p>
                <b>
                  {t("Filtrée avant l’envoi\u00A0:")}
                </b>
                {t(" numéros, e-mails et réseaux sociaux sont retirés.")}
              </p>
              <p>
                <b>
                  {t("La conversation est une preuve.")}
                </b>
                {t(" Une capture WhatsApp n’en est pas une.")}
              </p>
              <p>
                <b>
                  {t("Le WhatsApp du support sert à l’aide\u00A0:")}
                </b>
                {t(" jamais pour une commande, jamais comme preuve.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "messages?fil=1":
      return (
        <Ecran route="messages" parEtat>
          <Link to="/commande" className="card" style={{ "display": "block", "marginTop": "14px", "padding": "12px 14px" }}>
            <div className="row">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="b8 t14">
                  {t("ITEL AC52 noir")}
                </div>
                <div className="t12 c3">
                  {t("BLV-00008 · à préparer aujourd’hui avant 12\u00A0h\u00A042")}
                </div>
              </div>
              <span className="chev c3">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </div>
          </Link>
          <div className="center t12 c3 mt14">
            {t("Aujourd’hui")}
          </div>
          <div style={{ "display": "flex", "justifyContent": "flex-start", "marginTop": "10px" }}>
            <div style={{ "maxWidth": "78%", "padding": "10px 13px", "borderRadius": "18px", "borderBottomLeftRadius": "6px", "background": "var(--card)", "boxShadow": "var(--shadow-card)", "fontSize": "14px", "lineHeight": "1.45" }}>
              {t("Bonjour, la couleur noire est bien celle de la photo\u00A0?")}
              <div style={{ "fontSize": "12px", "marginTop": "4px", "textAlign": "right", "color": "var(--ink-3)" }}>
                {t("09\u00A0h\u00A021")}
              </div>
            </div>
          </div>
          <div style={{ "display": "flex", "justifyContent": "flex-end", "marginTop": "10px" }}>
            <div style={{ "maxWidth": "78%", "padding": "10px 13px", "borderRadius": "18px", "borderBottomRightRadius": "6px", "background": "linear-gradient(180deg,var(--braise-1),var(--braise-2))", "color": "#fff", "fontSize": "14px", "lineHeight": "1.45" }}>
              {t("Oui, noir, neuf, avec chargeur et boîte d’origine.")}
              <div style={{ "fontSize": "12px", "marginTop": "4px", "textAlign": "right", "color": "rgba(255,255,255,.85)" }}>
                {t("09\u00A0h\u00A024")}
              </div>
            </div>
          </div>
          <div style={{ "display": "flex", "justifyContent": "flex-start", "marginTop": "10px" }}>
            <div style={{ "maxWidth": "78%", "padding": "10px 13px", "borderRadius": "18px", "borderBottomLeftRadius": "6px", "background": "var(--amber-soft)", "border": "1px dashed var(--amber-line)", "fontSize": "13px", "lineHeight": "1.45", "color": "var(--amber)" }}>
              <Icone nom="shield-alert" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Un numéro de téléphone a été retiré de ce message avant l’envoi.")}
              <div style={{ "fontSize": "12px", "marginTop": "4px" }}>
                {t("09\u00A0h\u00A030")}
              </div>
            </div>
          </div>
          <div style={{ "display": "flex", "justifyContent": "flex-start", "marginTop": "10px" }}>
            <div style={{ "maxWidth": "78%", "padding": "10px 13px", "borderRadius": "18px", "borderBottomLeftRadius": "6px", "background": "var(--card)", "boxShadow": "var(--shadow-card)", "fontSize": "14px", "lineHeight": "1.45" }}>
              {t("Le livreur passe à quelle heure\u00A0?")}
              <div style={{ "fontSize": "12px", "marginTop": "4px", "textAlign": "right", "color": "var(--ink-3)" }}>
                {t("09\u00A0h\u00A031")}
              </div>
            </div>
          </div>
          <div className="kick" style={{ "marginTop": "18px" }}>
            {t("Réponses rapides")}
          </div>
          <div className="chips" style={{ "marginTop": "8px" }}>
            <span className="chip">
              {t("C’est prêt")}
            </span>
            <span className="chip">
              {t("Le livreur passe aujourd’hui")}
            </span>
            <span className="chip">
              {t("Merci pour votre commande")}
            </span>
          </div>
          <div className="row mt12" style={{ "padding": "6px 6px 6px 14px", "borderRadius": "24px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
            <span className="grow t14 c3">
              {t("Votre message…")}
            </span>
            <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "background": "linear-gradient(180deg,var(--braise-1),var(--braise-2))", "color": "#fff", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="send" taille={18} />
            </span>
          </div>
          <p className="scrim-note">
            {t("Cette conversation sert de preuve. Numéros, e-mails et réseaux sociaux sont retirés avant l’envoi. Elle se ferme à la fin du délai de litige.")}
          </p>
        </Ecran>
      )
  }
}
