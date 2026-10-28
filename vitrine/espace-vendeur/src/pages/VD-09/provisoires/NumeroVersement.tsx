// Page provisoire « Numéro de versement » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function NumeroVersement() {
  const { t } = usePreferences()
  switch (useEtat("numero_versement")) {
    default:
      return (
        <Ecran route="numero_versement" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Numéro de versement")}
            </h1>
            <p className="pg-s">
              {t("Le seul numéro où BelivaY vous paie. Toujours à votre nom.")}
            </p>
          </div>
          <div className="card">
            <div className="kick" style={{ "fontSize": "12px" }}>
              {t("Numéro actuel")}
            </div>
            <div className="row mt10">
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "12px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Au nom de Franck Penga · vérifié le 31 mai")}
                </div>
              </div>
              <span className="pill green">
                <Icone nom="circle-check" taille={13} />
                {t("Actif")}
              </span>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Changer de numéro")}
            </h2>
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="t12 b8 c3 mt8">
            {t("Étape 1 sur 3 · le nouveau numéro")}
          </div>
          <div className="note amber">
            <Icone nom="triangle-alert" taille={18} />
            <div>
              <b>
                {t("Avant de changer\u00A0:")}
              </b>
              {t(" vos versements s’arrêtent 7\u00A0jours, le temps qu’une personne vérifie. Rien n’est perdu. Le numéro doit être à votre nom.")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Opérateur")}
            </label>
          </div>
          <Link to="/numero_versement" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("MTN Mobile Money")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Numéros en 67, 68, ou 650 à 654")}
              </span>
            </span>
          </Link>
          <Link to="/numero_versement" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Orange Money")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Numéros en 69, ou 655 à 659")}
              </span>
            </span>
          </Link>
          <div className="fld">
            <label>
              {t("Nouveau numéro")}
            </label>
            <div className="inp ok">
              <span className="b8 c2 row" style={{ "gap": "6px", "paddingRight": "8px", "borderRight": "1px solid var(--line-2)" }}>
                <Dessin id="81b1dee44510" />
                {t("+237")}
              </span>
              <span className="grow">
                {t("655 31 20 48")}
              </span>
              <span className="suf">
                <span className="cg">
                  <Icone nom="circle-check" taille={18} />
                </span>
              </span>
            </div>
            <div className="hint">
              {t("655\u00A0: c’est bien Orange Money. Un préfixe qui ne correspond pas est refusé avant l’envoi.")}
            </div>
          </div>
          <div className="mt16">
            <Link to="/numero_versement?s=code" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Recevoir le code")}
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="message-square" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Vous recevrez deux codes par SMS\u00A0: un au nouveau numéro, un à votre téléphone personnel.")}
            </span>
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
                <div className="ti">
                  <div className="tt">
                    {t("1 · Le nouveau numéro")}
                  </div>
                  <div className="td">
                    {t("Le préfixe est contrôlé avant l’envoi du code.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("2 · Deux codes")}
                  </div>
                  <div className="td">
                    {t("Un par SMS au nouveau numéro\u00A0: il prouve qu’il est à vous. L’autre par SMS au 6•• •• •• 90, votre téléphone personnel\u00A0: c’est le second facteur.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("3 · La revue, 7\u00A0jours")}
                  </div>
                  <div className="td">
                    {t("Une personne vérifie. L’ancien numéro est désactivé\u00A0: un seul actif à la fois. Le versement suivant part le vendredi qui suit la revue.")}
                  </div>
                </div>
              </div>
              <p>
                {t("Un numéro au nom d’une autre personne est refusé, avec un motif écrit.")}
              </p>
            </div>
          </details>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t("BelivaY ne vous demande jamais votre code secret Mobile Money. Un message qui le demande est une fraude.")}
            </div>
          </div>
        </Ecran>
      )
    case "numero_versement?s=code":
      return (
        <Ecran route="numero_versement" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Vérifier le nouveau numéro")}
            </h1>
            <p className="pg-s">
              {t("Deux codes par SMS, pour être sûr que c’est bien vous.")}
            </p>
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className=""></i>
          </div>
          <div className="t12 b8 c3 mt8">
            {t("Étape 2 sur 3 · les codes")}
          </div>
          <div className="card">
            <div className="kick" style={{ "fontSize": "12px" }}>
              {t("1 · Code reçu par SMS au 655 •• •• 48")}
              <span style={{ "display": "block", "marginTop": "3px", "color": "var(--or-txt)" }}>
                {t("Votre nouveau numéro")}
              </span>
            </div>
            <div className="otp">
              <span className="f">
                {t("3")}
              </span>
              <span className="f">
                {t("9")}
              </span>
              <span className="f">
                {t("0")}
              </span>
              <span className="f">
                {t("4")}
              </span>
              <span className="cur"></span>
              <span></span>
            </div>
            <div className="t13 c3 center mt10">
              {t("Pas reçu\u00A0? Renvoyer dans 0:42")}
            </div>
            <div className="hint-l">
              <Icone nom="smartphone" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Il prouve que ce numéro est bien à vous.")}
              </span>
            </div>
          </div>
          <div className="card">
            <div className="kick" style={{ "fontSize": "12px" }}>
              {t("2 · Code reçu par SMS au 6•• •• •• 90")}
              <span style={{ "display": "block", "marginTop": "3px", "color": "var(--or-txt)" }}>
                {t("Votre second facteur")}
              </span>
            </div>
            <div className="otp">
              <span className="f">
                {t("7")}
              </span>
              <span className="f">
                {t("1")}
              </span>
              <span className="f">
                {t("2")}
              </span>
              <span className="f">
                {t("5")}
              </span>
              <span className="f">
                {t("8")}
              </span>
              <span className="f">
                {t("6")}
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Votre téléphone personnel\u00A0: une deuxième preuve que c’est bien vous.")}
              </span>
            </div>
          </div>
          <div className="keypad">
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
            <span className="k0" style={{ "boxShadow": "none" }}></span>
            <span>
              {t("0")}
            </span>
            <span>
              {t("⌫")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/numero_versement?s=ok" className="btn primary">
              <Icone nom="shield-check" taille={18} />
              <span>
                {t("Valider le numéro")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Sans les deux codes, rien ne change\u00A0: le numéro reste bloqué.")}
          </p>
        </Ecran>
      )
    case "numero_versement?s=ok":
      return (
        <Ecran route="numero_versement" parEtat>
          <div className="center" style={{ "paddingTop": "18px" }}>
            <div style={{ "width": "72px", "height": "72px", "borderRadius": "50%", "margin": "0 auto", "background": "var(--amber-soft)", "border": "1px solid var(--amber-line)", "color": "var(--amber)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="shield-check" taille={34} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "14px" }}>
              {t("Numéro enregistré, en revue")}
            </h1>
            <p className="pg-s">
              {t("Orange Money\u00A0····\u00A02\u00A0048 · au nom de Franck Penga")}
            </p>
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
          </div>
          <div className="t12 b8 c3 mt8">
            {t("Étape 3 sur 3 · la revue")}
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Versements suspendus 7\u00A0jours")}
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
              {t("Jusqu’au mardi 20 octobre")}
            </div>
            <div className="hs">
              {t("Une personne de BelivaY vérifie le changement. Cela protège votre argent si quelqu’un a pris votre téléphone.")}
            </div>
            <div className="hline"></div>
            <div className="t14" style={{ "lineHeight": "1.5" }}>
              {t("Votre versement du 17 oct. (35\u00A0680\u00A0F) ")}
              <b>
                {t("n’est pas perdu")}
              </b>
              {t(". Il part samedi 24 oct., après la revue.")}
            </div>
          </div>
          <div className="card tight">
            <div className="li">
              <span className="ic amber">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Orange\u00A0····\u00A02\u00A0048")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Nouveau numéro")}
                </span>
              </span>
              <span className="pill amber">
                {t("En revue")}
              </span>
            </div>
            <div className="li">
              <span className="ic ">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("MTN\u00A0····\u00A04\u00A0217")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Ancien numéro")}
                </span>
              </span>
              <span className="pill ink">
                {t("Désactivé")}
              </span>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Un seul numéro actif à la fois.")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/versements" className="btn primary">
              <Icone nom="arrow-left" taille={18} />
              <span>
                {t("Retour aux versements")}
              </span>
            </Link>
          </div>
          <Link to="/messages" className="row t14 b8 cor" style={{ "justifyContent": "center", "minHeight": "44px", "marginTop": "6px", "gap": "6px" }}>
            <Icone nom="shield-alert" taille={16} />
            {t("Ce n’est pas vous\u00A0? Écrire au support")}
          </Link>
        </Ecran>
      )
  }
}
