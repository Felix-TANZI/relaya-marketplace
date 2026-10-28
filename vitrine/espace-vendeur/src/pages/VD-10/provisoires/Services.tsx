// Page provisoire « Les services qui lèvent les freins » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Services() {
  const { t } = usePreferences()
  switch (useEtat("services")) {
    default:
      return (
        <Ecran route="services" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Des services qui lèvent les freins")}
            </h1>
            <p className="pg-s">
              {t("Un frein, c’est ce qui retient un client d’acheter.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--or-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="camera" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Photos par un agent BelivaY")}
                </div>
                <div className="b8 t13 cor mt4">
                  {t("3\u00A0000\u00A0F les 10 produits")}
                </div>
              </div>
            </div>
            <div className="note amber" style={{ "marginTop": "12px" }}>
              <Icone nom="lightbulb" taille={18} />
              <div>
                <b>
                  {t("Votre frein\u00A0: une seule photo sur l’ITEL.")}
                </b>
                {t(" La photo est le premier frein relevé par La demande.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/services?demande=1" className="btn primary">
                <Icone nom="calendar" taille={18} />
                <span>
                  {t("Demander un agent")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Autres services")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/fiche" className="li">
              <span className="ic or">
                <Icone nom="file-pen" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Fiche prioritaire · 1\u00A0000\u00A0F")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("BelivaY rédige la fiche de votre produit sous 24\u00A0h au lieu de 48\u00A0h. Proposée quand vous demandez une fiche.")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/saisie_assistee" className="li">
              <span className="ic or">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Saisie assistée")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Votre catalogue mis en ligne sans effort, fiches validées par vous. Gratuite pour les premières boutiques, puis 5\u00A0000\u00A0F la session.")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Chaque service vous est proposé au moment où le frein apparaît, jamais par un bandeau publicitaire.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "services?demande=1":
      return (
        <Ecran route="services" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <div className="row" style={{ "gap": "8px" }}>
              <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
                {t("Photos par un agent BelivaY")}
              </h3>
            </div>
            <div className="mt8">
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic or" style={{ "width": "36px", "height": "36px", "borderRadius": "50%" }}>
                  <Icone nom="camera" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Un agent de la zone Z4 vous appelle, puis photographie 10 produits dans votre boutique.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="smartphone" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Payé par Mobile Money (MTN\u00A0····\u00A04\u00A0217), confirmé sur votre téléphone.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="file-text" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("La facture arrive dans Documents.")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/services" className="btn primary">
                <Icone nom="smartphone" taille={18} />
                <span>
                  {t("Payer 3\u00A0000\u00A0F")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/services" className="btn ghost">
                <span>
                  {t("Annuler")}
                </span>
              </Link>
            </div>
          </div>
          </>
        }>
          <div className="pg">
            <h1 className="pg-t">
              {t("Des services qui lèvent les freins")}
            </h1>
            <p className="pg-s">
              {t("Un frein, c’est ce qui retient un client d’acheter.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--or-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="camera" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Photos par un agent BelivaY")}
                </div>
                <div className="b8 t13 cor mt4">
                  {t("3\u00A0000\u00A0F les 10 produits")}
                </div>
              </div>
            </div>
            <div className="note amber" style={{ "marginTop": "12px" }}>
              <Icone nom="lightbulb" taille={18} />
              <div>
                <b>
                  {t("Votre frein\u00A0: une seule photo sur l’ITEL.")}
                </b>
                {t(" La photo est le premier frein relevé par La demande.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/services?demande=1" className="btn primary">
                <Icone nom="calendar" taille={18} />
                <span>
                  {t("Demander un agent")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Autres services")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/fiche" className="li">
              <span className="ic or">
                <Icone nom="file-pen" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Fiche prioritaire · 1\u00A0000\u00A0F")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("BelivaY rédige la fiche de votre produit sous 24\u00A0h au lieu de 48\u00A0h. Proposée quand vous demandez une fiche.")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/saisie_assistee" className="li">
              <span className="ic or">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Saisie assistée")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Votre catalogue mis en ligne sans effort, fiches validées par vous. Gratuite pour les premières boutiques, puis 5\u00A0000\u00A0F la session.")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Chaque service vous est proposé au moment où le frein apparaît, jamais par un bandeau publicitaire.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}
