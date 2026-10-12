// Page provisoire « Connexion » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (9 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import img_acd794b2ecb9_jpg from '../../../assets/prototype/acd794b2ecb9.jpg'
import img_be926f70d2b8_png from '../../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Connexion() {
  const { t } = usePreferences()
  switch (useEtat("connexion")) {
    default:
      return (
        <Ecran route="connexion" parEtat>
          <div className="cx-hero" style={{ "backgroundImage": `url(${img_acd794b2ecb9_jpg})` }}>
            <div className="row" style={{ "gap": "8px" }}>
              <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "28px", "filter": "brightness(0) invert(1)" }} />
              <button type="button" data-act="lang" aria-label="Langue" style={{ "marginLeft": "auto", "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "40px", "padding": "0 12px", "borderRadius": "12px", "border": "1px solid rgba(255,255,255,.3)", "background": "rgba(0,0,0,.25)", "color": "#fff", "fontSize": "13px", "fontWeight": "800" }}>
                <Icone nom="languages" taille={16} />
                <span>
                  {t("Français")}
                </span>
                <Icone nom="chevron-down" taille={14} />
              </button>
            </div>
            <div className="t">
              {t("Espace vendeur")}
            </div>
            <div className="s">
              {t("Vous vendez. BelivaY encaisse pour vous.")}
            </div>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Connexion")}
          </h1>
          <div className="mt12">
            <Link to="/" className="btn secondary cx-g">
              <span className="gg">
                <Icone nom="gpay-g" taille={16} />
              </span>
              <span>
                {t("Continuer avec Google")}
              </span>
            </Link>
          </div>
          <div className="mt10">
            <Link to="/" className="btn cx-a">
              <Icone nom="apple" taille={19} />
              <span>
                {t("Continuer avec Apple")}
              </span>
            </Link>
          </div>
          <div className="cx-duo">
            <Link to="/connexion?s=email" className="btn secondary">
              <Icone nom="mail" taille={18} />
              <span>
                {t("E-mail")}
              </span>
            </Link>
            <Link to="/connexion?s=numero" className="btn secondary">
              <Icone nom="smartphone" taille={18} />
              <span>
                {t("Numéro de téléphone")}
              </span>
            </Link>
          </div>
          <div className="cx-row" style={{ "marginTop": "6px" }}>
            <span className="rmb on" role="checkbox" aria-checked="true" tabIndex={0}>
              <span className="bx">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              {t("Se souvenir de moi")}
            </span>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Nouveau téléphone\u00A0? Un code vous sera demandé.")}
            </span>
          </div>
          <div className="cx-trust">
            <div>
              <Icone nom="banknote" taille={22} />
              {t("Versé chaque vendredi, sans frais")}
            </div>
            <div>
              <Icone nom="shield-check" taille={22} />
              {t("Aucune caution, aucun frais d’entrée")}
            </div>
            <div>
              <Icone nom="eye-off" taille={22} />
              {t("Le client ne voit pas votre boutique")}
            </div>
          </div>
          <Link to="/ouvrir" className="card flat center" style={{ "display": "block", "marginTop": "18px", "padding": "14px" }}>
            <div className="t13 c2">
              {t("Pas encore vendeur\u00A0?")}
            </div>
            <div className="b8 cor t14 mt4">
              {t("Ouvrir ma boutique en deux minutes")}
            </div>
          </Link>
        </Ecran>
      )
    case "connexion?s=2fa":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <div className="center">
            <div style={{ "width": "56px", "height": "56px", "borderRadius": "18px", "margin": "0 auto", "background": "var(--or-soft)", "color": "var(--or-txt)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="shield-check" taille={28} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "12px" }}>
              {t("Entrez le code reçu par SMS")}
            </h1>
            <p className="pg-s">
              {t("Nouvel appareil\u00A0: par sécurité, un code est envoyé au 6••\u00A0••\u00A0••\u00A090.")}
            </p>
          </div>
          <div className="otp">
            <span className="f">
              {t("5")}
            </span>
            <span className="f">
              {t("0")}
            </span>
            <span className="f">
              {t("3")}
            </span>
            <span className="f">
              {t("9")}
            </span>
            <span className="f">
              {t("1")}
            </span>
            <span className="f">
              {t("7")}
            </span>
          </div>
          <div className="t12 c3 center mt10">
            {t("Renvoyer le code dans 0:48")}
          </div>
          <div className="keypad" style={{ "marginTop": "16px" }}>
            <span>
              {t("1")}
            </span>
            <span>
              {t("2")}
            </span>
            <span>
              {t("3")}
            </span>
            <span>
              {t("4")}
            </span>
            <span>
              {t("5")}
            </span>
            <span>
              {t("6")}
            </span>
            <span>
              {t("7")}
            </span>
            <span>
              {t("8")}
            </span>
            <span>
              {t("9")}
            </span>
            <span className="k0" style={{ "background": "transparent", "boxShadow": "none" }}></span>
            <span>
              {t("0")}
            </span>
            <span aria-label="Effacer">
              {t("⌫")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Valider le code")}
              </span>
            </Link>
          </div>
          <div className="card flat" style={{ "marginTop": "16px", "padding": "2px 14px 6px" }}>
            <div className="li">
              <span className="ic ">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("iPhone · Safari · Yaoundé")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Connexion demandée aujourd’hui à 09\u00A0h\u00A047")}
                </span>
              </span>
            </div>
            <div className="row" style={{ "gap": "6px", "borderTop": "1px solid var(--line)" }}>
              <span className="t13 c2">
                {t("Ce n’est pas vous\u00A0?")}
              </span>
              <Link to="/connexion?s=oubli" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
                {t("Changez votre mot de passe")}
              </Link>
            </div>
          </div>
        </Ecran>
      )
    case "connexion?s=oubli":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mot de passe oublié")}
            </h1>
            <p className="pg-s">
              {t("Recevez un lien pour en choisir un nouveau.")}
            </p>
          </div>
          <div className="fld">
            <label>
              {t("Identifiant, e-mail ou téléphone")}
            </label>
            <div className="inp focus">
              <Icone nom="user" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("@Penga12")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/connexion" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Recevoir le lien")}
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Le lien arrive par SMS et par e-mail. Il vaut 15 minutes.")}
            </span>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t("BelivaY ne vous demande jamais votre mot de passe ni votre code secret Mobile Money par message.")}
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
              <ol style={{ "margin": "0", "paddingLeft": "20px" }}>
                <li>
                  {t("Ouvrez le lien reçu par SMS sur votre téléphone personnel, ou par e-mail.")}
                </li>
                <li>
                  {t("Entrez le code reçu par SMS\u00A0: il confirme que c’est vous.")}
                </li>
                <li>
                  {t("Choisissez un nouveau mot de passe\u00A0: 8 caractères au moins, dont un chiffre.")}
                </li>
              </ol>
            </div>
          </details>
          <p className="scrim-note" style={{ "marginTop": "8px" }}>
            {t("Plus accès à votre numéro\u00A0? ")}
            <Link to="/aide" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Contacter le support")}
            </Link>
          </p>
        </Ecran>
      )
    case "connexion?s=email":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <h1 className="pg-t" style={{ "marginTop": "8px" }}>
            {t("Connexion par e-mail")}
          </h1>
          <p className="pg-s">
            {t("Votre identifiant ou votre e-mail, puis votre mot de passe.")}
          </p>
          <div className="fld">
            <label>
              {t("Identifiant ou e-mail")}
            </label>
            <div className="inp">
              <Icone nom="user" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("@Penga12")}
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Mot de passe")}
            </label>
            <div className="inp">
              <Icone nom="lock" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("••••••••••")}
              </span>
              <span className="suf">
                <span role="button" aria-label="Afficher le mot de passe" style={{ "display": "flex", "alignItems": "center", "justifyContent": "center", "width": "44px", "height": "44px", "marginRight": "-10px" }}>
                  <Icone nom="eye" taille={18} />
                </span>
              </span>
            </div>
          </div>
          <div className="cx-row">
            <span className="rmb on" role="checkbox" aria-checked="true" tabIndex={0}>
              <span className="bx">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              {t("Se souvenir de moi")}
            </span>
            <Link to="/connexion?s=oubli" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Mot de passe oublié\u00A0?")}
            </Link>
          </div>
          <div className="mt8">
            <Link to="/connexion?s=2fa" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Se connecter")}
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Nouveau téléphone\u00A0? Un code SMS vous sera demandé.")}
            </span>
          </div>
          <div className="cx-trust">
            <div>
              <Icone nom="banknote" taille={22} />
              {t("Versé chaque vendredi, sans frais")}
            </div>
            <div>
              <Icone nom="shield-check" taille={22} />
              {t("Aucune caution, aucun frais d’entrée")}
            </div>
            <div>
              <Icone nom="eye-off" taille={22} />
              {t("Le client ne voit pas votre boutique")}
            </div>
          </div>
        </Ecran>
      )
    case "connexion?s=numero":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <h1 className="pg-t" style={{ "marginTop": "8px" }}>
            {t("Votre numéro")}
          </h1>
          <p className="pg-s">
            {t("Le numéro de votre compte vendeur. Un code, et vous êtes connecté. Pas de mot de passe.")}
          </p>
          <div className="vx-ph">
            <span className="vx-cc">
              <Dessin id="81b1dee44510" />
              {t("+237")}
            </span>
            <span className="vx-num">
              {t("677 42 18 90")}
            </span>
            <span className="vx-op">
              <Icone nom="circle-check" taille={13} />
              {t("MTN")}
            </span>
          </div>
          <div className="vx-ch" role="radiogroup" aria-label="Recevoir le code par">
            <Link to="/connexion?s=numero" className="on" role="radio" aria-checked="true">
              <span className="i">
                <Icone nom="message-circle" taille={18} />
              </span>
              <span>
                <b>
                  {t("WhatsApp")}
                </b>
                <span>
                  {t("Arrive même avec peu de réseau")}
                </span>
              </span>
            </Link>
            <Link to="/connexion?s=numero&canal=sms" className="" role="radio" aria-checked="false">
              <span className="i">
                <Icone nom="message-square" taille={18} />
              </span>
              <span>
                <b>
                  {t("SMS")}
                </b>
                <span>
                  {t("Sans Internet")}
                </span>
              </span>
            </Link>
          </div>
          <div className="mt12">
            <Link to="/connexion?s=code" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Recevoir le code")}
              </span>
            </Link>
          </div>
          <div className="cx-row">
            <span className="rmb on" role="checkbox" aria-checked="true" tabIndex={0}>
              <span className="bx">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              {t("Se souvenir de moi")}
            </span>
          </div>
          <div className="vx-links">
            <Link to="/connexion?s=plusnum">
              <Icone nom="smartphone" taille={18} />
              <span className="g">
                {t("Ce n’est plus mon numéro")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
            <Link to="/connexion?s=email">
              <Icone nom="mail" taille={18} />
              <span className="g">
                {t("Me connecter par e-mail")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Un vendeur est payé sur Mobile Money au Cameroun\u00A0: numéro en +237 seulement.")}
            </span>
          </div>
        </Ecran>
      )
    case "connexion?canal=sms&s=numero":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <h1 className="pg-t" style={{ "marginTop": "8px" }}>
            {t("Votre numéro")}
          </h1>
          <p className="pg-s">
            {t("Le numéro de votre compte vendeur. Un code, et vous êtes connecté. Pas de mot de passe.")}
          </p>
          <div className="vx-ph">
            <span className="vx-cc">
              <Dessin id="81b1dee44510" />
              {t("+237")}
            </span>
            <span className="vx-num">
              {t("677 42 18 90")}
            </span>
            <span className="vx-op">
              <Icone nom="circle-check" taille={13} />
              {t("MTN")}
            </span>
          </div>
          <div className="vx-ch" role="radiogroup" aria-label="Recevoir le code par">
            <Link to="/connexion?s=numero" className="" role="radio" aria-checked="false">
              <span className="i">
                <Icone nom="message-circle" taille={18} />
              </span>
              <span>
                <b>
                  {t("WhatsApp")}
                </b>
                <span>
                  {t("Arrive même avec peu de réseau")}
                </span>
              </span>
            </Link>
            <Link to="/connexion?s=numero&canal=sms" className="on" role="radio" aria-checked="true">
              <span className="i">
                <Icone nom="message-square" taille={18} />
              </span>
              <span>
                <b>
                  {t("SMS")}
                </b>
                <span>
                  {t("Sans Internet")}
                </span>
              </span>
            </Link>
          </div>
          <div className="mt12">
            <Link to="/connexion?s=code&canal=sms" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Recevoir le code")}
              </span>
            </Link>
          </div>
          <div className="cx-row">
            <span className="rmb on" role="checkbox" aria-checked="true" tabIndex={0}>
              <span className="bx">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              {t("Se souvenir de moi")}
            </span>
          </div>
          <div className="vx-links">
            <Link to="/connexion?s=plusnum">
              <Icone nom="smartphone" taille={18} />
              <span className="g">
                {t("Ce n’est plus mon numéro")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
            <Link to="/connexion?s=email">
              <Icone nom="mail" taille={18} />
              <span className="g">
                {t("Me connecter par e-mail")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Un vendeur est payé sur Mobile Money au Cameroun\u00A0: numéro en +237 seulement.")}
            </span>
          </div>
        </Ecran>
      )
    case "connexion?s=code":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion?s=numero" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <div className="center">
            <div style={{ "width": "56px", "height": "56px", "borderRadius": "18px", "margin": "0 auto", "background": "var(--or-soft)", "color": "var(--or-txt)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="message-circle" taille={28} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "12px" }}>
              {t("Entrez le code")}
            </h1>
            <p className="pg-s">
              {t("Envoyé par WhatsApp au 677\u00A0••\u00A0••\u00A090.")}
            </p>
          </div>
          <div className="otp">
            <span className="f">
              {t("7")}
            </span>
            <span className="f">
              {t("3")}
            </span>
            <span className="f">
              {t("0")}
            </span>
            <span className="f">
              {t("2")}
            </span>
            <span className="f">
              {t("1")}
            </span>
            <span className="f">
              {t("8")}
            </span>
          </div>
          <div className="t12 c3 center mt10">
            {t("Le code se remplit tout seul quand le message arrive.")}
          </div>
          <div className="keypad" style={{ "marginTop": "16px" }}>
            <span>
              {t("1")}
            </span>
            <span>
              {t("2")}
            </span>
            <span>
              {t("3")}
            </span>
            <span>
              {t("4")}
            </span>
            <span>
              {t("5")}
            </span>
            <span>
              {t("6")}
            </span>
            <span>
              {t("7")}
            </span>
            <span>
              {t("8")}
            </span>
            <span>
              {t("9")}
            </span>
            <span className="k0" style={{ "background": "transparent", "boxShadow": "none" }}></span>
            <span>
              {t("0")}
            </span>
            <span aria-label="Effacer">
              {t("⌫")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Valider le code")}
              </span>
            </Link>
          </div>
          <div className="row" style={{ "justifyContent": "center", "gap": "14px", "marginTop": "4px" }}>
            <span className="t12 c3">
              {t("Renvoyer dans 0:42")}
            </span>
            <Link to="/connexion?s=code&canal=sms" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Recevoir par SMS")}
            </Link>
          </div>
          <div className="vx-links">
            <Link to="/connexion?s=plusnum">
              <Icone nom="smartphone" taille={18} />
              <span className="g">
                {t("Ce n’est plus mon numéro")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t("BelivaY ne vous demande jamais ce code, ni votre code secret Mobile Money.")}
            </div>
          </div>
        </Ecran>
      )
    case "connexion?s=plusnum":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion?s=numero" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <h1 className="pg-t" style={{ "marginTop": "8px" }}>
            {t("Ce n’est plus votre numéro\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Votre boutique, vos commandes et votre argent restent à vous.")}
          </p>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start", "gap": "12px", "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <span className="badge-num">
                {t("1")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Connectez-vous par e-mail")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Avec votre identifiant ou votre e-mail et votre mot de passe.")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "12px", "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <span className="badge-num">
                {t("2")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Changez de numéro dans Sécurité")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Le nouveau numéro est confirmé par un code, puis par Face ID ou votre empreinte.")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "12px", "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <span className="badge-num">
                {t("3")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Plus accès à l’e-mail non plus\u00A0?")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Le support vérifie votre identité avec votre pièce, puis vous rend l’accès.")}
                </div>
              </div>
            </div>
          </div>
          <div className="mt12">
            <Link to="/connexion?s=email" className="btn primary">
              <Icone nom="mail" taille={18} />
              <span>
                {t("Me connecter par e-mail")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/aide" className="btn secondary">
              <Icone nom="message-circle" taille={18} />
              <span>
                {t("Écrire au support")}
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Votre numéro de versement Mobile Money ne change pas ici\u00A0: il a sa propre vérification, avec 7\u00A0jours de revue.")}
            </span>
          </div>
        </Ecran>
      )
    case "connexion?canal=sms&s=code":
      return (
        <Ecran route="connexion" parEtat>
          <Link to="/connexion?s=numero&canal=sms" className="ibtn" style={{ "marginLeft": "-8px" }} aria-label="Retour">
            <Icone nom="chevron-left" taille={26} />
          </Link>
          <div className="center">
            <div style={{ "width": "56px", "height": "56px", "borderRadius": "18px", "margin": "0 auto", "background": "var(--or-soft)", "color": "var(--or-txt)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="message-square" taille={28} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "12px" }}>
              {t("Entrez le code")}
            </h1>
            <p className="pg-s">
              {t("Envoyé par SMS au 677\u00A0••\u00A0••\u00A090.")}
            </p>
          </div>
          <div className="otp">
            <span className="f">
              {t("7")}
            </span>
            <span className="f">
              {t("3")}
            </span>
            <span className="f">
              {t("0")}
            </span>
            <span className="f">
              {t("2")}
            </span>
            <span className="f">
              {t("1")}
            </span>
            <span className="f">
              {t("8")}
            </span>
          </div>
          <div className="t12 c3 center mt10">
            {t("Le code se remplit tout seul quand le message arrive.")}
          </div>
          <div className="keypad" style={{ "marginTop": "16px" }}>
            <span>
              {t("1")}
            </span>
            <span>
              {t("2")}
            </span>
            <span>
              {t("3")}
            </span>
            <span>
              {t("4")}
            </span>
            <span>
              {t("5")}
            </span>
            <span>
              {t("6")}
            </span>
            <span>
              {t("7")}
            </span>
            <span>
              {t("8")}
            </span>
            <span>
              {t("9")}
            </span>
            <span className="k0" style={{ "background": "transparent", "boxShadow": "none" }}></span>
            <span>
              {t("0")}
            </span>
            <span aria-label="Effacer">
              {t("⌫")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Valider le code")}
              </span>
            </Link>
          </div>
          <div className="row" style={{ "justifyContent": "center", "gap": "14px", "marginTop": "4px" }}>
            <span className="t12 c3">
              {t("Renvoyer dans 0:42")}
            </span>
            <Link to="/connexion?s=code" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Recevoir par WhatsApp")}
            </Link>
          </div>
          <div className="vx-links">
            <Link to="/connexion?s=plusnum">
              <Icone nom="smartphone" taille={18} />
              <span className="g">
                {t("Ce n’est plus mon numéro")}
              </span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t("BelivaY ne vous demande jamais ce code, ni votre code secret Mobile Money.")}
            </div>
          </div>
        </Ecran>
      )
  }
}
