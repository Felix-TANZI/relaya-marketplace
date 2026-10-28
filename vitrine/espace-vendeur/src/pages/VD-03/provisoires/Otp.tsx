// Page provisoire « Code de vérification » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Otp() {
  const { t } = usePreferences()
  switch (useEtat("otp")) {
    default:
      return (
        <Ecran route="otp" parEtat>
          <div className="row" aria-label="Étape 1 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("1")}
                </span>
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
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
          <div className="center" style={{ "paddingTop": "18px" }}>
            <div style={{ "width": "56px", "height": "56px", "borderRadius": "18px", "margin": "0 auto", "background": "var(--or-soft)", "color": "var(--or-txt)", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>
              <Icone nom="smartphone" taille={28} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "12px" }}>
              {t("Entrez le code reçu par SMS")}
            </h1>
            <p className="pg-s">
              {t("Envoyé au 677\u00A0••\u00A0••\u00A090.")}
            </p>
          </div>
          <div className="otp">
            <span className="f">
              {t("8")}
            </span>
            <span className="f">
              {t("2")}
            </span>
            <span className="f">
              {t("4")}
            </span>
            <span className="f">
              {t("6")}
            </span>
            <span className="f">
              {t("1")}
            </span>
            <span className="f">
              {t("3")}
            </span>
          </div>
          <div className="row" style={{ "justifyContent": "center", "gap": "14px", "marginTop": "4px" }}>
            <span className="t12 c3">
              {t("Renvoyer le code dans 0:42")}
            </span>
            <Link to="/ouvrir" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Changer de numéro")}
            </Link>
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
            <Link to="/faceid?nouveau=1&next=%23kyc" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Valider le code")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Deux comptes au plus par téléphone. Au-delà, la création est refusée.")}
          </p>
        </Ecran>
      )
  }
}
