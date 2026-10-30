// Page provisoire « Installer l’application » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import img_0718fddbf299_png from '../../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Installer() {
  const { t } = usePreferences()
  switch (useEtat("installer")) {
    default:
      return (
        <Ecran route="installer" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Installer l’application")}
            </h1>
            <p className="pg-s">
              {t("Une icône sur votre écran d’accueil\u00A0: l’espace vendeur s’ouvre d’un geste.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/installer" style={{ "height": "44px" }} className="on">
              {t("iPhone")}
            </Link>
            <Link to="/installer?os=and" style={{ "height": "44px" }} className="">
              {t("Android")}
            </Link>
          </div>
          <div className="hero night row" style={{ "padding": "14px 16px", "gap": "14px" }}>
            <div style={{ "width": "60px", "height": "60px", "borderRadius": "16px", "background": "#fff", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "boxShadow": "0 8px 18px -10px rgba(0,0,0,.6)" }}>
              <img src={img_0718fddbf299_png} alt="" style={{ "width": "40px" }} />
            </div>
            <div className="grow">
              <div className="b8 t17">
                {t("BelivaY Vendeur")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.75)" }}>
                {t("seller.belivay.com")}
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("En trois étapes")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("1")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Ouvrez seller.belivay.com dans Safari")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Connecté à votre compte vendeur")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="globe" taille={22} />
              </span>
            </div>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("2")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Touchez Partager")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("En bas de l’écran")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="share" taille={22} />
              </span>
            </div>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("3")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("«\u00A0Sur l’écran d’accueil\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Puis «\u00A0Ajouter\u00A0»")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="square-plus" taille={22} />
              </span>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Pourquoi\u00A0?")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="li">
                <span className="ic or">
                  <Icone nom="zap" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Plus rapide")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Elle s’ouvre directement sur votre accueil")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic or">
                  <Icone nom="wifi-off" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Marche hors connexion")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Commandes et code de remise lisibles sans réseau")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic or">
                  <Icone nom="bell" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Notifications")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Une commande à préparer ne vous échappe plus")}
                  </span>
                </span>
              </div>
            </div>
          </details>
        </Ecran>
      )
    case "installer?os=and":
      return (
        <Ecran route="installer" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Installer l’application")}
            </h1>
            <p className="pg-s">
              {t("Une icône sur votre écran d’accueil\u00A0: l’espace vendeur s’ouvre d’un geste.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/installer" style={{ "height": "44px" }} className="">
              {t("iPhone")}
            </Link>
            <Link to="/installer?os=and" style={{ "height": "44px" }} className="on">
              {t("Android")}
            </Link>
          </div>
          <div className="hero night row" style={{ "padding": "14px 16px", "gap": "14px" }}>
            <div style={{ "width": "60px", "height": "60px", "borderRadius": "16px", "background": "#fff", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "boxShadow": "0 8px 18px -10px rgba(0,0,0,.6)" }}>
              <img src={img_0718fddbf299_png} alt="" style={{ "width": "40px" }} />
            </div>
            <div className="grow">
              <div className="b8 t17">
                {t("BelivaY Vendeur")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.75)" }}>
                {t("seller.belivay.com")}
              </div>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="download" taille={18} />
              <span>
                {t("Installer l’application")}
              </span>
            </button>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Ce bouton apparaît seulement si Chrome le permet.")}
            </span>
          </div>
          <div className="divider-t">
            {t("Sinon, en trois étapes")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("1")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Ouvrez seller.belivay.com dans Chrome")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Connecté à votre compte vendeur")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="globe" taille={22} />
              </span>
            </div>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("2")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Touchez le menu ⋮")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("En haut à droite")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="ellipsis-vertical" taille={22} />
              </span>
            </div>
            <div className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b>
                  {t("3")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("«\u00A0Installer l’application\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Puis «\u00A0Installer\u00A0»")}
                </span>
              </span>
              <span style={{ "color": "var(--or-txt)" }}>
                <Icone nom="download" taille={22} />
              </span>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Pourquoi\u00A0?")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="li">
                <span className="ic or">
                  <Icone nom="zap" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Plus rapide")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Elle s’ouvre directement sur votre accueil")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic or">
                  <Icone nom="wifi-off" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Marche hors connexion")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Commandes et code de remise lisibles sans réseau")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic or">
                  <Icone nom="bell" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Notifications")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Une commande à préparer ne vous échappe plus")}
                  </span>
                </span>
              </div>
            </div>
          </details>
        </Ecran>
      )
  }
}
