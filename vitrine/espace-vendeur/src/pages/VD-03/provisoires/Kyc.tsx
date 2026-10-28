// Page provisoire « Publier et être payé » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (4 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import img_32eb64e58d50_jpg from '../../../assets/prototype/32eb64e58d50.jpg'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Kyc() {
  const { t } = usePreferences()
  switch (useEtat("kyc")) {
    default:
      return (
        <Ecran route="kyc" parEtat>
          <div className="row" aria-label="Étape 2 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--green)" }}>
                <Icone nom="circle-check" taille={17} trait={2.2} />
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("2")}
                </span>
                <span className="t13 b8">
                  {t("Publier")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Mise en ligne")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
                  {t("3")}
                </span>
                <span className="t13 b8">
                  {t("Être payé")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Premier versement")}
              </div>
            </div>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Publier vos produits")}
          </h1>
          <p className="pg-s">
            {t("Envoyez trois éléments. Vos 12 produits en brouillon passent en ligne dès l’accord.")}
          </p>
          <div className="card tight">
            <div className="li">
              <span className="ic or">
                <Icone nom="id-card" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Pièce d’identité (CNI)")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Recto reçu à 09\u00A0h\u00A041. Pour le verso\u00A0: carte à plat, sans reflet.")}
                </span>
              </span>
              <span className="pill or">
                {t("À faire")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="scan-face" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Selfie vidéo avec votre pièce")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Votre CNI à la main\u00A0: tournez la tête quand on vous le demande.")}
                </span>
              </span>
              <span className="pill or">
                {t("À faire")}
              </span>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="circle-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("MTN\u00A0····\u00A04\u00A0217 · à votre nom · vérifié par code")}
                </span>
              </span>
              <span className="pill green">
                {t("Vérifié")}
              </span>
            </div>
          </div>
          <div className="card">
            <div className="vx-idp">
              <img src={img_32eb64e58d50_jpg} alt="Exemple : selfie avec la carte d’identité à la main" />
              <p className="t13 c2" style={{ "margin": "0", "lineHeight": "1.45" }}>
                {t("Comme sur la photo\u00A0: votre CNI à la main, le visage bien éclairé. Jamais montrée aux clients.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="camera" taille={18} />
              <span>
                {t("Prendre le verso de la CNI")}
              </span>
            </button>
          </div>
          <p className="scrim-note" style={{ "marginTop": "10px" }}>
            {t("Encore 2 éléments\u00A0: CNI verso et selfie.")}
          </p>
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
                {t("Vérification automatique en moins de 15 minutes.")}
              </p>
              <p>
                {t("En cas de doute, une personne relit votre dossier sous 48\u00A0h ouvrées.")}
              </p>
              <p>
                {t("Aucune caution. Aucun RCCM demandé à un particulier.")}
              </p>
            </div>
          </details>
          <p className="scrim-note" style={{ "marginTop": "8px" }}>
            {t("Pas maintenant\u00A0? ")}
            <Link to="/offre1" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Ajouter d’autres produits")}
            </Link>
          </p>
        </Ecran>
      )
    case "kyc?s=attente":
      return (
        <Ecran route="kyc" parEtat>
          <div className="row" aria-label="Étape 2 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--green)" }}>
                <Icone nom="circle-check" taille={17} trait={2.2} />
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("2")}
                </span>
                <span className="t13 b8">
                  {t("Publier")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Mise en ligne")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
                  {t("3")}
                </span>
                <span className="t13 b8">
                  {t("Être payé")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Premier versement")}
              </div>
            </div>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Vérification en cours")}
          </h1>
          <p className="pg-s">
            {t("En général, la réponse arrive en moins de 15 minutes.")}
          </p>
          <div className="hero night">
            <div className="hk row" style={{ "gap": "6px" }}>
              <Icone nom="hourglass" taille={14} />
              {t("Réponse au plus tard")}
            </div>
            <div className="b8 mt8" style={{ "fontSize": "24px", "letterSpacing": "-.02em" }}>
              {t("Jeudi 15 oct. à 18\u00A0h")}
            </div>
            <div className="hs">
              {t("Si une personne relit votre dossier\u00A0: 48\u00A0h ouvrées au plus. Vous êtes prévenu par SMS.")}
            </div>
          </div>
          <div className="card tight">
            <div className="li">
              <span className="ic green">
                <Icone nom="circle-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Tout est envoyé")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("CNI recto et verso · selfie avec la pièce · MTN\u00A0····\u00A04\u00A0217 vérifié")}
                </span>
              </span>
            </div>
          </div>
          <div className="card">
            <div className="row">
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="package" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("12 produits en brouillon")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Ils passent en ligne dès l’accord, sans autre geste.")}
                </div>
              </div>
            </div>
            <div className="mt14">
              <Link to="/offre1" className="btn primary">
                <Icone nom="plus" taille={18} />
                <span>
                  {t("Ajouter d’autres produits")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
    case "kyc?s=contrat":
      return (
        <Ecran route="kyc" parEtat>
          <div className="row" aria-label="Étape 3 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--green)" }}>
                <Icone nom="circle-check" taille={17} trait={2.2} />
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--green)" }}>
                <Icone nom="circle-check" taille={17} trait={2.2} />
                <span className="t13 b8">
                  {t("Publier")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Mise en ligne")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("3")}
                </span>
                <span className="t13 b8">
                  {t("Être payé")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Premier versement")}
              </div>
            </div>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Votre contrat en cinq lignes")}
          </h1>
          <p className="pg-s">
            {t("Pièces validées\u00A0: vos 12 produits sont en ligne.")}
          </p>
          <div className="hero night">
            <div className="hk">
              {t("Contrat vendeur BelivaY")}
            </div>
            <div className="mt10">
              <div className="row" style={{ "padding": "9px 0", "borderTop": "1px solid rgba(255,255,255,.1)", "alignItems": "flex-start" }}>
                <Icone nom="wallet" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
                <span className="t14" style={{ "lineHeight": "1.45" }}>
                  {t("Vous gardez de 76,5 à 98\u00A0% de chaque vente livrée, selon la catégorie, le prix et le palier\u00A0; minimum de 700\u00A0F par commande sur les petits prix.")}
                </span>
              </div>
              <div className="row" style={{ "padding": "9px 0", "borderTop": "1px solid rgba(255,255,255,.1)", "alignItems": "flex-start" }}>
                <Icone nom="banknote" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
                <span className="t14" style={{ "lineHeight": "1.45" }}>
                  {t("Versement chaque vendredi, sans frais.")}
                </span>
              </div>
              <div className="row" style={{ "padding": "9px 0", "borderTop": "1px solid rgba(255,255,255,.1)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
                <span className="t14" style={{ "lineHeight": "1.45" }}>
                  {t("Plafond de démarrage\u00A0: 500\u00A0000\u00A0F par commande, jusqu’à 10\u00A0commandes livrées sans incident.")}
                </span>
              </div>
              <div className="row" style={{ "padding": "9px 0", "borderTop": "1px solid rgba(255,255,255,.1)", "alignItems": "flex-start" }}>
                <Icone nom="calendar-x" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
                <span className="t14" style={{ "lineHeight": "1.45" }}>
                  {t("Résiliation avec 30\u00A0jours de préavis.")}
                </span>
              </div>
              <div className="row" style={{ "padding": "9px 0", "borderTop": "1px solid rgba(255,255,255,.1)", "alignItems": "flex-start" }}>
                <Icone nom="shield-check" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
                <span className="t14" style={{ "lineHeight": "1.45" }}>
                  {t("Aucune caution, aucun dépôt.")}
                </span>
              </div>
              <Link to="/documents" className="row" style={{ "minHeight": "44px", "borderTop": "1px solid rgba(255,255,255,.1)", "color": "#fff", "fontWeight": "800", "fontSize": "14px" }}>
                <Icone nom="file-text" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Lire le contrat complet")}
                </span>
                <Icone nom="chevron-right" taille={18} style={{ "opacity": ".7" }} />
              </Link>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Pourquoi ce montant\u00A0?")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Exemple\u00A0: un ITEL AC52 vendu 20\u00A0000\u00A0F, vous gardez ")}
                <b>
                  {t("17\u00A0840\u00A0F")}
                </b>
                {t(", offre de découverte comprise.")}
              </p>
              <p>
                {t("La part gardée dépend de la catégorie et de votre palier. Le palier est votre niveau\u00A0: Bronze, Argent, Or, Platine. Plus il est haut, plus vous gardez.")}
              </p>
              <p>
                {t("Les deux premiers mois, il suit vos produits en vente\u00A0: Argent dès 15, Or dès 40, Platine dès 80. Ensuite, votre Trust Score (note sur 100) décide.")}
              </p>
            </div>
          </details>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic green">
                  <Icone nom="gift" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Offre de découverte")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Vous gardez 3 points de plus sur chaque vente.")}
                </div>
                <div className="t13 c3" style={{ "lineHeight": "1.45" }}>
                  {t("Pendant 3\u00A0mois ou 50\u00A0commandes, dès la première commande payée.")}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="kv">
              <span className="k">
                {t("Numéro de versement")}
              </span>
              <span className="v ">
                {t("MTN\u00A0····\u00A04\u00A0217 · à votre nom")}
              </span>
            </div>
            <div className="hr"></div>
            <div className="row">
              <div className="grow">
                <div className="b8 t14">
                  {t("Je suis immatriculé")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Si oui, on vous demandera RCCM et NIU. Sinon, rien à faire.")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
            </div>
          </div>
          <div className="mt16">
            <Link to="/premier_jour" className="btn primary">
              <Icone nom="signature" taille={18} />
              <span>
                {t("Signer le contrat")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Signature électronique. Votre premier versement part le vendredi qui suit la libération de votre première vente.")}
          </p>
        </Ecran>
      )
    case "kyc?s=refusee":
      return (
        <Ecran route="kyc" parEtat>
          <div className="row" aria-label="Étape 2 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--green)" }}>
                <Icone nom="circle-check" taille={17} trait={2.2} />
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("2")}
                </span>
                <span className="t13 b8">
                  {t("Publier")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Mise en ligne")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
                  {t("3")}
                </span>
                <span className="t13 b8">
                  {t("Être payé")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Premier versement")}
              </div>
            </div>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Une photo à reprendre")}
          </h1>
          <p className="pg-s">
            {t("Tout le reste est bon. Reprenez seulement le recto de votre CNI.")}
          </p>
          <div className="note red">
            <Icone nom="circle-alert" taille={18} />
            <div>
              <b>
                {t("Recto de la CNI illisible")}
              </b>
              <div className="mt4">
                {t("Motif écrit\u00A0: un reflet cache le numéro de la carte.")}
              </div>
            </div>
          </div>
          <div className="card tight">
            <div className="li">
              <span className="ic" style={{ "background": "var(--red-soft)", "color": "var(--red)" }}>
                <Icone nom="id-card" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("CNI · recto")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Refusée aujourd’hui à 10\u00A0h\u00A002 · reflet sur le numéro")}
                </span>
              </span>
              <span className="pill red">
                {t("À reprendre")}
              </span>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="circle-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("CNI · verso")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Reçu à 09\u00A0h\u00A044")}
                </span>
              </span>
              <span className="pill green">
                {t("Reçu")}
              </span>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="circle-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Selfie vidéo avec votre pièce")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Reçu à 09\u00A0h\u00A046")}
                </span>
              </span>
              <span className="pill green">
                {t("Reçu")}
              </span>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="circle-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("MTN\u00A0····\u00A04\u00A0217 · à votre nom · vérifié par code")}
                </span>
              </span>
              <span className="pill green">
                {t("Vérifié")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/kyc?s=attente" className="btn primary">
              <Icone nom="camera" taille={18} />
              <span>
                {t("Reprendre la photo du recto")}
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="sun" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Carte posée à plat, sans reflet, à la lumière du jour.")}
            </span>
          </div>
          <div className="note green">
            <Icone nom="package" taille={18} />
            <div>
              <b>
                {t("Vos 12 produits restent en brouillon.")}
              </b>
              {t(" Rien n’est perdu\u00A0: ils passent en ligne dès l’accord.")}
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
              <p>
                {t("Le motif est toujours écrit\u00A0: vous savez quoi corriger.")}
              </p>
              <p>
                {t("La nouvelle photo est vérifiée en moins de 15 minutes en général. Si une personne relit votre dossier\u00A0: 48\u00A0h ouvrées au plus.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}
